import http from 'node:http';
import {
  accessConfig,
  authenticateRequest,
  publicAccessStatus,
  validateStartupSecurity,
  writeAuditEvent,
} from './access.ts';
import { handleJsonRpc, serverMetadata } from './jsonRpc.ts';
import { loadProjectContext, projectContextConfig } from './projectContext.ts';

const host = process.env.MCP_HTTP_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.MCP_HTTP_PORT || '3333', 10);
const maxBodyBytes = Number.parseInt(process.env.MCP_MAX_BODY_BYTES || '1048576', 10);
const mcpAccessConfig = await accessConfig();
validateStartupSecurity(mcpAccessConfig, host);

function sendJson(response: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function authChallengeHeader(request: http.IncomingMessage): string {
  const hostHeader = request.headers.host || `${host}:${port}`;
  const baseUrl = `http://${hostHeader}`;
  const resourceMetadata = process.env.MCP_AUTH_RESOURCE_METADATA_URL || `${baseUrl}/.well-known/oauth-protected-resource`;
  const scope = 'project:read markdown:read resources:read work_queue:read qa:read roadmap:read';
  return `Bearer resource_metadata="${resourceMetadata}", scope="${scope}"`;
}

function readBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxBodyBytes) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function healthPayload(request: http.IncomingMessage) {
  const config = projectContextConfig();
  const metadata = {
    ...serverMetadata(),
    security: publicAccessStatus(mcpAccessConfig),
  };
  let canShowContext = !mcpAccessConfig.authRequired;
  try {
    authenticateRequest(request, mcpAccessConfig);
    canShowContext = true;
  } catch {
    canShowContext = false;
  }

  if (!canShowContext) {
    return {
      ok: true,
      ...metadata,
      context: {
        available: 'requires-authentication',
      },
    };
  }

  try {
    const context = await loadProjectContext(config);
    return {
      ok: true,
      ...metadata,
      context: {
        source: context.source,
        sourceLabel: context.sourceLabel,
        projectName: context.model.projectName,
        includePrivateContext: config.includePrivateContext,
      },
    };
  } catch (error) {
    return {
      ok: false,
      ...metadata,
      error: error instanceof Error ? error.message : 'Project context unavailable.',
    };
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, await healthPayload(request));
      return;
    }

    if (request.method !== 'POST' || url.pathname !== '/mcp') {
      sendJson(response, 404, { error: 'Use POST /mcp for MCP JSON-RPC requests or GET /health for readiness.' });
      return;
    }

    let access;
    try {
      access = authenticateRequest(request, mcpAccessConfig);
    } catch (error) {
      await writeAuditEvent(mcpAccessConfig, {
        method: 'authenticate',
        status: 'denied',
        reason: error instanceof Error ? error.message : 'Authentication failed.',
        remoteAddress: request.socket.remoteAddress,
      });
      sendJson(response, 401, {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: error instanceof Error ? error.message : 'Authentication failed.',
        },
      }, {
        'WWW-Authenticate': authChallengeHeader(request),
      });
      return;
    }

    const rawBody = await readBody(request);
    const payload = rawBody.trim() ? JSON.parse(rawBody) : null;
    const result = await handleJsonRpc(payload, access, mcpAccessConfig);

    if (result === null) {
      response.writeHead(204);
      response.end();
      return;
    }

    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: error instanceof Error ? error.message : 'Unable to process MCP request.',
      },
    });
  }
});

server.listen(port, host, () => {
  console.log(`Project context MCP server listening on http://${host}:${port}/mcp`);
});
