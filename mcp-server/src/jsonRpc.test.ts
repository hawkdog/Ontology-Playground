import { describe, expect, it } from 'vitest';
import type { McpAccessConfig, McpAccessContext } from './access.ts';
import { handleJsonRpc } from './jsonRpc.ts';

const config: McpAccessConfig = {
  authRequired: true,
  clients: [],
  auditLogPath: undefined,
  defaultRateLimitPerMinute: 60,
  localOnlyBypass: false,
};

function access(overrides: Partial<McpAccessContext> = {}): McpAccessContext {
  return {
    clientId: `agent-${Math.random().toString(36).slice(2)}`,
    tenantId: 'tenant-a',
    licensePlan: 'mcp-basic',
    scopes: ['project:read', 'markdown:read', 'resources:read'],
    allowedPrivateContext: false,
    rateLimitPerMinute: 60,
    ...overrides,
  };
}

describe('MCP JSON-RPC guardrails', () => {
  it('filters tool discovery by license plan and scopes', async () => {
    const response = await handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }, access(), config);

    expect(response).toMatchObject({
      result: {
        tools: [
          expect.objectContaining({ name: 'project.summary' }),
          expect.objectContaining({ name: 'project.markdown_context_pack' }),
          expect.objectContaining({ name: 'project.resources.list' }),
        ],
      },
    });
    expect(JSON.stringify(response)).not.toContain('project.qa_status');
  });

  it('denies tool calls outside the current license and scope', async () => {
    const response = await handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'project.qa_status',
        arguments: {},
      },
    }, access(), config);

    expect(response).toMatchObject({
      error: {
        message: expect.stringMatching(/cannot access/i),
      },
    });
  });
});
