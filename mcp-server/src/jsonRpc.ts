import {
  authorizeTool,
  canAccessTool,
  enforceRateLimit,
  type McpAccessConfig,
  type McpAccessContext,
  writeAuditEvent,
} from './access.ts';
import { callProjectTool, projectContextTools } from './tools.ts';

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const serverInfo = {
  name: 'ontology-playground-project-context',
  version: '0.1.0',
};

const capabilities = {
  tools: {
    listChanged: false,
  },
};

function isRequest(value: unknown): value is JsonRpcRequest {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as { jsonrpc?: unknown }).jsonrpc === '2.0'
    && typeof (value as { method?: unknown }).method === 'string',
  );
}

function requestId(request: JsonRpcRequest): JsonRpcId {
  return request.id ?? null;
}

function paramsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function fail(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function discoverResult() {
  return {
    resultType: 'complete',
    supportedVersions: ['2026-07-28'],
    capabilities,
    instructions: 'Use these read-only tools to retrieve project map context, markdown context packs, resource-library records, work queue items, QA status, and roadmap signals. Every request is tenant-scoped, licensed, rate-limited, and audit logged. Do not treat the returned context as approval to change files or publish private data.',
    _meta: {
      'io.modelcontextprotocol/serverInfo': serverInfo,
    },
    ttlMs: 300000,
    cacheScope: 'public',
  };
}

function initializeResult(request: JsonRpcRequest) {
  const params = paramsObject(request.params);
  return {
    protocolVersion: typeof params.protocolVersion === 'string' ? params.protocolVersion : '2025-06-18',
    capabilities,
    serverInfo,
    instructions: 'Read-only Project Analyzer context server. Prefer server/discover for the 2026-07-28 protocol revision.',
  };
}

async function audit(config: McpAccessConfig, access: McpAccessContext, event: Record<string, unknown>): Promise<void> {
  await writeAuditEvent(config, {
    clientId: access.clientId,
    tenantId: access.tenantId,
    licensePlan: access.licensePlan,
    ...event,
  });
}

async function handleOne(request: unknown, access: McpAccessContext, config: McpAccessConfig): Promise<JsonRpcResponse | null> {
  if (!isRequest(request)) {
    return fail(null, -32600, 'Invalid JSON-RPC request.');
  }

  if (request.id === undefined) {
    return null;
  }

  try {
    const params = paramsObject(request.params);
    const requestedTool = request.method === 'tools/call' && typeof params.name === 'string' ? params.name.trim() : undefined;
    enforceRateLimit(access, request.method, requestedTool);

    switch (request.method) {
      case 'server/discover':
        await audit(config, access, { method: request.method, status: 'ok' });
        return ok(requestId(request), discoverResult());
      case 'initialize':
        await audit(config, access, { method: request.method, status: 'ok' });
        return ok(requestId(request), initializeResult(request));
      case 'tools/list':
        await audit(config, access, { method: request.method, status: 'ok' });
        return ok(requestId(request), {
          resultType: 'complete',
          tools: projectContextTools.filter((tool) => canAccessTool(access, tool.name)),
          ttlMs: 300000,
          cacheScope: 'public',
        });
      case 'tools/call': {
        const name = params.name;
        if (typeof name !== 'string' || !name.trim()) {
          await audit(config, access, { method: request.method, status: 'denied', reason: 'missing-tool-name' });
          return fail(requestId(request), -32602, 'tools/call requires a tool name.');
        }
        authorizeTool(access, name);
        const result = await callProjectTool(name, params.arguments, access);
        await audit(config, access, { method: request.method, toolName: name, status: 'ok' });
        return ok(requestId(request), result);
      }
      default:
        await audit(config, access, { method: request.method, status: 'denied', reason: 'unknown-method' });
        return fail(requestId(request), -32601, `Method not found: ${request.method}`);
    }
  } catch (error) {
    await audit(config, access, {
      method: request.method,
      status: 'error',
      error: error instanceof Error ? error.message : 'Tool call failed.',
    });
    return fail(
      requestId(request),
      -32000,
      error instanceof Error ? error.message : 'Tool call failed.',
    );
  }
}

export async function handleJsonRpc(payload: unknown, access: McpAccessContext, config: McpAccessConfig): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    const responses = (await Promise.all(payload.map((item) => handleOne(item, access, config)))).filter((item): item is JsonRpcResponse => Boolean(item));
    return responses.length > 0 ? responses : null;
  }

  return handleOne(payload, access, config);
}

export function serverMetadata() {
  return {
    serverInfo,
    capabilities,
    tools: projectContextTools.map((tool) => tool.name),
  };
}
