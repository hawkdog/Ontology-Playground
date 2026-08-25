import { readFile } from 'node:fs/promises';
import path from 'node:path';

type JsonObject = Record<string, unknown>;

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface SmokeToolCall {
  name: string;
  arguments?: JsonObject;
  validate?: (content: JsonObject) => void;
}

const mcpUrl = process.env.MCP_TEST_URL || 'http://127.0.0.1:3333/mcp';
const healthUrl = process.env.MCP_TEST_HEALTH_URL || new URL('/health', mcpUrl).toString();
const token = process.env.MCP_TEST_TOKEN || 'mcp-smoke-token';
const clientId = process.env.MCP_TEST_CLIENT_ID || 'smoke-agent';
const auditLogPath = process.env.MCP_TEST_AUDIT_LOG_PATH;
const expectAuthRejection = process.env.MCP_TEST_EXPECT_AUTH_REJECTION !== 'false';

const expectedTools = [
  'project.summary',
  'project.markdown_context_pack',
  'project.resources.list',
  'project.work_queue.list',
  'project.qa_status',
  'project.roadmap_signals',
];

function asObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} was not an object.`);
  }
  return value as JsonObject;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} was not an array.`);
  }
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function toolNames(response: JsonRpcResponse): string[] {
  const result = asObject(response.result, 'tools/list result');
  return asArray(result.tools, 'tools/list tools').map((tool) => String(asObject(tool, 'tool').name));
}

async function requestJson(url: string, init?: RequestInit): Promise<{ status: number; body: unknown; text: string; headers: Headers }> {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) as unknown : null;
  return { status: response.status, body, text, headers: response.headers };
}

async function rpc(method: string, params?: JsonObject, authenticated = true, id = method): Promise<JsonRpcResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': '2026-07-28',
    'Mcp-Method': method,
  };
  if (authenticated) {
    headers.Authorization = `Bearer ${token}`;
    headers['Mcp-Client-Id'] = clientId;
  }
  if (method === 'tools/call' && typeof params?.name === 'string') {
    headers['Mcp-Name'] = params.name;
  }

  const response = await requestJson(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });

  return asObject(response.body, `${method} response`) as unknown as JsonRpcResponse;
}

function validateToolResult(toolName: string, response: JsonRpcResponse): JsonObject {
  assert(!response.error, `${toolName} returned JSON-RPC error: ${response.error?.message}`);
  const result = asObject(response.result, `${toolName} result`);
  assert(result.resultType === 'complete', `${toolName} did not return resultType=complete.`);
  assert(result.isError === false, `${toolName} returned isError=true.`);
  const structuredContent = asObject(result.structuredContent, `${toolName} structuredContent`);
  const access = asObject(structuredContent.access, `${toolName} access`);
  assert(access.clientId === clientId, `${toolName} did not echo the expected client id.`);
  assert(typeof access.tenantId === 'string' && access.tenantId.length > 0, `${toolName} did not include tenant metadata.`);
  return structuredContent;
}

const toolCalls: SmokeToolCall[] = [
  {
    name: 'project.summary',
    validate: (content) => {
      assert(asObject(content.project, 'project.summary project').projectName, 'project.summary did not include a project name.');
      assert(asObject(content.counts, 'project.summary counts').features !== undefined, 'project.summary did not include feature counts.');
    },
  },
  {
    name: 'project.markdown_context_pack',
    arguments: { tag: 'setup' },
    validate: (content) => {
      assert(asArray(content.documents, 'markdown context documents').length >= 0, 'markdown context documents missing.');
      assert(asObject(content.summary, 'markdown context summary').documentCount !== undefined, 'markdown context summary missing.');
    },
  },
  {
    name: 'project.resources.list',
    arguments: { tag: 'setup' },
    validate: (content) => {
      assert(Array.isArray(content.resources), 'resources.list did not include resources array.');
    },
  },
  {
    name: 'project.work_queue.list',
    arguments: { type: 'mcp' },
    validate: (content) => {
      assert(Array.isArray(content.items), 'work_queue.list did not include items array.');
    },
  },
  {
    name: 'project.qa_status',
    validate: (content) => {
      assert(content.counts && typeof content.counts === 'object', 'qa_status did not include counts.');
      assert(Array.isArray(content.openItems), 'qa_status did not include openItems array.');
    },
  },
  {
    name: 'project.roadmap_signals',
    validate: (content) => {
      assert(Array.isArray(content.roadmapSources), 'roadmap_signals did not include roadmapSources array.');
      assert(Array.isArray(content.featureSignals), 'roadmap_signals did not include featureSignals array.');
    },
  },
];

async function verifyAuditLog(): Promise<void> {
  if (!auditLogPath) return;
  const auditText = await readFile(path.resolve(auditLogPath), 'utf8');
  assert(auditText.includes(`"clientId":"${clientId}"`), 'Audit log did not include the smoke client id.');
  assert(auditText.includes('"method":"tools/call"'), 'Audit log did not include tool-call metadata.');
  assert(!auditText.includes(token), 'Audit log included the bearer token.');
  assert(!auditText.includes('structuredContent'), 'Audit log included returned tool content.');
}

async function main(): Promise<void> {
  console.log(`MCP smoke target: ${mcpUrl}`);

  const health = await requestJson(healthUrl);
  assert(health.status === 200, `Health returned HTTP ${health.status}.`);
  const healthBody = asObject(health.body, 'health response');
  assert(healthBody.ok === true, 'Health response was not ok.');
  console.log('ok health');

  if (expectAuthRejection) {
    const unauthenticated = await requestJson(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'unauthenticated', method: 'tools/list' }),
    });
    assert(unauthenticated.status === 401, `Unauthenticated /mcp returned HTTP ${unauthenticated.status}, expected 401.`);
    assert(unauthenticated.headers.get('www-authenticate')?.includes('scope='), 'Unauthenticated /mcp did not include WWW-Authenticate scope guidance.');
    console.log('ok auth rejection');
  }

  const discover = await rpc('server/discover');
  assert(!discover.error, `server/discover failed: ${discover.error?.message}`);
  assert(asObject(discover.result, 'server/discover result').serverInfo, 'server/discover did not include serverInfo.');
  console.log('ok server/discover');

  const toolsList = await rpc('tools/list');
  assert(!toolsList.error, `tools/list failed: ${toolsList.error?.message}`);
  const names = toolNames(toolsList);
  for (const tool of expectedTools) {
    assert(names.includes(tool), `tools/list did not include ${tool}.`);
  }
  for (const tool of asArray(asObject(toolsList.result, 'tools/list result').tools, 'tools/list tools')) {
    const annotations = asObject(asObject(tool, 'tool').annotations, 'tool annotations');
    assert(annotations.readOnlyHint === true, 'Tool did not include readOnlyHint=true.');
    assert(annotations.destructiveHint === false, 'Tool did not include destructiveHint=false.');
    assert(annotations.idempotentHint === true, 'Tool did not include idempotentHint=true.');
    assert(annotations.openWorldHint === false, 'Tool did not include openWorldHint=false.');
  }
  console.log(`ok tools/list (${names.length} tools)`);

  for (const call of toolCalls) {
    const response = await rpc('tools/call', { name: call.name, arguments: call.arguments ?? {} }, true, call.name);
    const structuredContent = validateToolResult(call.name, response);
    call.validate?.(structuredContent);
    console.log(`ok ${call.name}`);
  }

  await verifyAuditLog();
  if (auditLogPath) console.log('ok audit log');

  console.log('MCP smoke test passed');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
