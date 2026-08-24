import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  accessConfig,
  authenticateRequest,
  authorizeTool,
  enforceRateLimit,
  validateStartupSecurity,
  writeAuditEvent,
  type McpAccessContext,
} from './access.ts';

const tempDirs: string[] = [];

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function request(headers: Record<string, string>) {
  return {
    headers,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

describe('MCP access guardrails', () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('requires configured clients for non-loopback startup', async () => {
    vi.stubEnv('MCP_HTTP_HOST', '0.0.0.0');
    vi.stubEnv('MCP_CLIENTS_JSON', '');

    const config = await accessConfig();

    expect(() => validateStartupSecurity(config, '0.0.0.0')).toThrow(/no clients are configured/i);
  });

  it('authenticates bearer tokens against hashed client policies', async () => {
    vi.stubEnv('MCP_AUTH_REQUIRED', 'true');
    vi.stubEnv('MCP_CLIENTS_JSON', JSON.stringify([{
      clientId: 'agent-one',
      tenantId: 'tenant-a',
      tokenHash: tokenHash('secret-token'),
      licensePlan: 'mcp-pro',
      scopes: ['project:read', 'qa:read'],
      allowedPrivateContext: true,
      rateLimitPerMinute: 5,
    }]));

    const config = await accessConfig();
    const access = authenticateRequest(request({
      authorization: 'Bearer secret-token',
      'mcp-client-id': 'agent-one',
    }) as never, config);

    expect(access).toMatchObject({
      clientId: 'agent-one',
      tenantId: 'tenant-a',
      licensePlan: 'mcp-pro',
      allowedPrivateContext: true,
      rateLimitPerMinute: 5,
    });
  });

  it('enforces tool license plans and scopes', () => {
    const access: McpAccessContext = {
      clientId: 'basic-agent',
      tenantId: 'tenant-a',
      licensePlan: 'mcp-basic',
      scopes: ['project:read'],
      allowedPrivateContext: false,
      rateLimitPerMinute: 60,
    };

    expect(() => authorizeTool(access, 'project.summary')).not.toThrow();
    expect(() => authorizeTool(access, 'project.qa_status')).toThrow(/cannot access/i);
  });

  it('rate limits per client and tool', () => {
    const access: McpAccessContext = {
      clientId: `limited-agent-${Date.now()}`,
      tenantId: 'tenant-a',
      licensePlan: 'mcp-pro',
      scopes: ['project:read'],
      allowedPrivateContext: false,
      rateLimitPerMinute: 1,
    };

    expect(() => enforceRateLimit(access, 'tools/call', 'project.summary')).not.toThrow();
    expect(() => enforceRateLimit(access, 'tools/call', 'project.summary')).toThrow(/rate limit/i);
  });

  it('writes audit events without request bodies or returned content', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'mcp-audit-'));
    tempDirs.push(tempDir);
    const auditLogPath = path.join(tempDir, 'audit.jsonl');

    await writeAuditEvent({
      authRequired: true,
      clients: [],
      auditLogPath,
      defaultRateLimitPerMinute: 60,
      localOnlyBypass: false,
    }, {
      clientId: 'agent-one',
      tenantId: 'tenant-a',
      method: 'tools/call',
      toolName: 'project.summary',
      status: 'ok',
    });

    const log = await readFile(auditLogPath, 'utf8');
    expect(log).toContain('"toolName":"project.summary"');
    expect(log).not.toContain('secret-token');
    expect(log).not.toContain('structuredContent');
  });
});
