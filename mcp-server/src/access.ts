import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export type McpLicensePlan = 'mcp-basic' | 'mcp-pro' | 'mcp-platform' | 'internal';

export interface McpClientPolicy {
  clientId: string;
  tenantId: string;
  token?: string;
  tokenHash?: string;
  licensePlan: McpLicensePlan;
  scopes: string[];
  allowedPrivateContext?: boolean;
  rateLimitPerMinute?: number;
}

export interface McpAccessContext {
  clientId: string;
  tenantId: string;
  licensePlan: McpLicensePlan;
  scopes: string[];
  allowedPrivateContext: boolean;
  rateLimitPerMinute: number;
}

export interface McpAccessConfig {
  authRequired: boolean;
  clients: McpClientPolicy[];
  auditLogPath?: string;
  defaultRateLimitPerMinute: number;
  localOnlyBypass: boolean;
}

interface ToolAccessRule {
  scope: string;
  plans: McpLicensePlan[];
}

export const localDevAccessContext: McpAccessContext = {
  clientId: 'local-dev',
  tenantId: 'local',
  licensePlan: 'internal',
  scopes: ['project:read', 'markdown:read', 'resources:read', 'work_queue:read', 'qa:read', 'roadmap:read'],
  allowedPrivateContext: true,
  rateLimitPerMinute: 120,
};

const toolAccessRules: Record<string, ToolAccessRule> = {
  'project.summary': { scope: 'project:read', plans: ['mcp-basic', 'mcp-pro', 'mcp-platform', 'internal'] },
  'project.markdown_context_pack': { scope: 'markdown:read', plans: ['mcp-basic', 'mcp-pro', 'mcp-platform', 'internal'] },
  'project.resources.list': { scope: 'resources:read', plans: ['mcp-basic', 'mcp-pro', 'mcp-platform', 'internal'] },
  'project.work_queue.list': { scope: 'work_queue:read', plans: ['mcp-pro', 'mcp-platform', 'internal'] },
  'project.qa_status': { scope: 'qa:read', plans: ['mcp-pro', 'mcp-platform', 'internal'] },
  'project.roadmap_signals': { scope: 'roadmap:read', plans: ['mcp-pro', 'mcp-platform', 'internal'] },
};

const rateLimitWindows = new Map<string, { startedAt: number; count: number }>();

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseClients(value: string | undefined): McpClientPolicy[] {
  if (!value?.trim()) return [];
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('MCP_CLIENTS_JSON must be a JSON array.');
  }
  return parsed.map((client, index) => normalizeClient(client, index));
}

function normalizeClient(value: unknown, index: number): McpClientPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`MCP client policy at index ${index} must be an object.`);
  }
  const raw = value as Record<string, unknown>;
  const clientId = typeof raw.clientId === 'string' ? raw.clientId.trim() : '';
  const tenantId = typeof raw.tenantId === 'string' ? raw.tenantId.trim() : '';
  const licensePlan = typeof raw.licensePlan === 'string' ? raw.licensePlan.trim() as McpLicensePlan : 'mcp-basic';
  const scopes = Array.isArray(raw.scopes) ? raw.scopes.filter((scope): scope is string => typeof scope === 'string' && Boolean(scope.trim())) : [];
  const token = typeof raw.token === 'string' && raw.token.trim() ? raw.token : undefined;
  const tokenHash = typeof raw.tokenHash === 'string' && raw.tokenHash.trim() ? raw.tokenHash.trim() : undefined;
  if (!clientId || !tenantId || (!token && !tokenHash) || scopes.length === 0) {
    throw new Error(`MCP client policy at index ${index} is missing clientId, tenantId, token/tokenHash, or scopes.`);
  }
  if (!['mcp-basic', 'mcp-pro', 'mcp-platform', 'internal'].includes(licensePlan)) {
    throw new Error(`MCP client policy "${clientId}" has unsupported licensePlan "${licensePlan}".`);
  }
  return {
    clientId,
    tenantId,
    token,
    tokenHash,
    licensePlan,
    scopes,
    allowedPrivateContext: raw.allowedPrivateContext === true,
    rateLimitPerMinute: typeof raw.rateLimitPerMinute === 'number' && Number.isFinite(raw.rateLimitPerMinute)
      ? Math.max(1, Math.trunc(raw.rateLimitPerMinute))
      : undefined,
  };
}

export async function accessConfig(env: NodeJS.ProcessEnv = process.env): Promise<McpAccessConfig> {
  const clients = [
    ...parseClients(env.MCP_CLIENTS_JSON),
    ...(
      env.MCP_CLIENTS_FILE?.trim()
        ? parseClients(await readFile(path.resolve(env.MCP_CLIENTS_FILE.trim()), 'utf8'))
        : []
    ),
  ];
  const host = env.MCP_HTTP_HOST || '127.0.0.1';
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
  const authRequired = envFlag(env.MCP_AUTH_REQUIRED, !isLoopback);
  const defaultRateLimitPerMinute = Number.parseInt(env.MCP_RATE_LIMIT_PER_MINUTE || '60', 10);
  return {
    authRequired,
    clients,
    auditLogPath: env.MCP_AUDIT_LOG_PATH?.trim() || 'data/mcp-audit.jsonl',
    defaultRateLimitPerMinute: Number.isFinite(defaultRateLimitPerMinute) && defaultRateLimitPerMinute > 0 ? defaultRateLimitPerMinute : 60,
    localOnlyBypass: !authRequired && isLoopback,
  };
}

export function validateStartupSecurity(config: McpAccessConfig, host: string): void {
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!isLoopback && !config.authRequired) {
    throw new Error('Refusing to bind a non-loopback MCP server with MCP_AUTH_REQUIRED=false.');
  }
  if (config.authRequired && config.clients.length === 0) {
    throw new Error('MCP auth is required but no clients are configured. Set MCP_CLIENTS_JSON or MCP_CLIENTS_FILE.');
  }
}

function bearerToken(request: IncomingMessage): string | undefined {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

function clientMatchesToken(client: McpClientPolicy, token: string): boolean {
  const incomingHash = sha256(token);
  if (client.tokenHash) return safeEqual(client.tokenHash, incomingHash);
  return client.token ? safeEqual(client.token, token) : false;
}

export function authenticateRequest(request: IncomingMessage, config: McpAccessConfig): McpAccessContext {
  if (config.localOnlyBypass) return localDevAccessContext;

  const token = bearerToken(request);
  if (!token) {
    throw new Error('Missing bearer token.');
  }

  const requestedClientId = typeof request.headers['mcp-client-id'] === 'string' ? request.headers['mcp-client-id'].trim() : '';
  const client = config.clients.find((candidate) => (
    clientMatchesToken(candidate, token)
    && (!requestedClientId || candidate.clientId === requestedClientId)
  ));

  if (!client) {
    throw new Error('Invalid MCP client credentials.');
  }

  return {
    clientId: client.clientId,
    tenantId: client.tenantId,
    licensePlan: client.licensePlan,
    scopes: client.scopes,
    allowedPrivateContext: client.allowedPrivateContext === true,
    rateLimitPerMinute: client.rateLimitPerMinute ?? config.defaultRateLimitPerMinute,
  };
}

export function authorizeTool(access: McpAccessContext, toolName: string): void {
  const rule = toolAccessRules[toolName];
  if (!rule) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  if (!rule.plans.includes(access.licensePlan)) {
    throw new Error(`License plan "${access.licensePlan}" cannot access "${toolName}".`);
  }
  if (!access.scopes.includes(rule.scope)) {
    throw new Error(`Client "${access.clientId}" is missing required scope "${rule.scope}".`);
  }
}

export function canAccessTool(access: McpAccessContext, toolName: string): boolean {
  try {
    authorizeTool(access, toolName);
    return true;
  } catch {
    return false;
  }
}

export function enforceRateLimit(access: McpAccessContext, method: string, toolName?: string): void {
  const key = `${access.tenantId}:${access.clientId}:${toolName || method}`;
  const now = Date.now();
  const window = rateLimitWindows.get(key);
  if (!window || now - window.startedAt >= 60000) {
    rateLimitWindows.set(key, { startedAt: now, count: 1 });
    return;
  }
  window.count += 1;
  if (window.count > access.rateLimitPerMinute) {
    throw new Error(`Rate limit exceeded for "${toolName || method}".`);
  }
}

export async function writeAuditEvent(config: McpAccessConfig, event: Record<string, unknown>): Promise<void> {
  if (!config.auditLogPath) return;
  const auditPath = path.resolve(config.auditLogPath);
  await mkdir(path.dirname(auditPath), { recursive: true });
  const entry = {
    ts: new Date().toISOString(),
    ...event,
  };
  await appendFile(auditPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

export function publicAccessStatus(config: McpAccessConfig): Record<string, unknown> {
  return {
    authRequired: config.authRequired,
    configuredClients: config.clients.length,
    auditEnabled: Boolean(config.auditLogPath),
    defaultRateLimitPerMinute: config.defaultRateLimitPerMinute,
  };
}
