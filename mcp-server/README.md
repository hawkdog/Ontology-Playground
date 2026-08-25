# Project Context MCP Server

Local MCP MVP server for exposing the Project Analyzer map as read-only agent
context. This server does not write project data, mutate queue items, or publish
private records.

## Tools

- `project.summary` - project map counts, source metadata, and open questions.
- `project.markdown_context_pack` - filtered MD Docs, required checks, applies-to
  areas, audit notes, and attached resources.
- `project.resources.list` - resource-library records from filtered MD Docs.
- `project.work_queue.list` - filtered work queue items.
- `project.qa_status` - QA counts and open QA items.
- `project.roadmap_signals` - roadmap sources, roadmap items, and feature-level
  roadmap signals.

## Data Sources

The server loads one Project Analyzer map per request:

1. `PROJECT_ANALYSIS_SOURCE_FILE` - local project-analysis JSON file.
2. `PROJECT_ANALYSIS_API_URL` + `PROJECT_ANALYSIS_MAP_ID` - private Project
   Analyzer API row.
3. Fictional sample map when `PROJECT_ANALYSIS_ALLOW_SAMPLE` is not `false`.

Private markdown documents are available by default for local testing. Set
`MCP_INCLUDE_PRIVATE_CONTEXT=false` to exclude private MD Docs from tool results.

## Local Run

```bash
npm run mcp:dev
```

Loopback development defaults to a local-only bypass so you can smoke-test the
server without creating credentials. Binding to a non-loopback host requires
auth and at least one configured client.

Health check:

```bash
curl http://localhost:3333/health
```

Tool discovery:

```bash
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2026-07-28" \
  -H "Mcp-Method: tools/list" \
  -H "Authorization: Bearer <token>" \
  -H "Mcp-Client-Id: <client-id>" \
  --data "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"
```

Call a context tool:

```bash
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2026-07-28" \
  -H "Mcp-Method: tools/call" \
  -H "Mcp-Name: project.markdown_context_pack" \
  -H "Authorization: Bearer <token>" \
  -H "Mcp-Client-Id: <client-id>" \
  --data "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"project.markdown_context_pack\",\"arguments\":{\"tag\":\"setup\"}}}"
```

## Access Policy

Local MVP access uses static bearer clients configured by `MCP_CLIENTS_JSON` or
`MCP_CLIENTS_FILE`. Prefer `tokenHash` over plaintext `token`; hashes are SHA-256
hex digests of the bearer token.

Example policy:

```json
[
  {
    "clientId": "local-agent",
    "tenantId": "local-company",
    "tokenHash": "<sha256-token-hash>",
    "licensePlan": "mcp-pro",
    "scopes": [
      "project:read",
      "markdown:read",
      "resources:read",
      "work_queue:read",
      "qa:read",
      "roadmap:read"
    ],
    "allowedPrivateContext": true,
    "rateLimitPerMinute": 60
  }
]
```

License gates:

- `mcp-basic` can read project summaries, markdown context packs, and resources.
- `mcp-pro`, `mcp-platform`, and `internal` can also read work queue, QA, and
  roadmap signals when their scopes allow it.

Audit logs are written as JSONL records to `MCP_AUDIT_LOG_PATH`. Audit events
include tenant/client/tool/status metadata only; request bodies, bearer tokens,
and tool results are not written.

## Docker

```bash
docker compose -f mcp-server/compose.yaml up --build
```

Docker binds the server to `0.0.0.0`, so credentials are required. Provide
`MCP_CLIENTS_JSON` or `MCP_CLIENTS_FILE` before starting the container.

Then open:

```bash
http://localhost:3333/health
```

## Checks

```bash
npm run mcp:check
npm run mcp:test
```

## Local Smoke Client

The repo includes a small MCP test client that behaves like an authenticated
agent caller. It does not use an LLM. It validates health, auth rejection,
`server/discover`, `tools/list`, every read-only tool, tenant/client metadata,
and optional audit-log safety.
It also checks that `server/discover` includes direct `serverInfo`, that
unauthenticated `401` responses include `WWW-Authenticate` scope guidance, and
that every exposed tool declares read-only, non-destructive, idempotent,
closed-world annotations.

Run against the default local container:

```bash
$env:MCP_TEST_TOKEN="mcp-smoke-token"
$env:MCP_TEST_CLIENT_ID="smoke-agent"
$env:MCP_TEST_AUDIT_LOG_PATH="mcp-server/audit/mcp-audit-smoke.jsonl"
npm run mcp:smoke
```

Config:

- `MCP_TEST_URL` - defaults to `http://127.0.0.1:3333/mcp`.
- `MCP_TEST_HEALTH_URL` - defaults to `/health` beside `MCP_TEST_URL`.
- `MCP_TEST_TOKEN` - bearer token used by the smoke client.
- `MCP_TEST_CLIENT_ID` - client id sent as `Mcp-Client-Id`.
- `MCP_TEST_AUDIT_LOG_PATH` - optional host audit log path to verify.
- `MCP_TEST_EXPECT_AUTH_REJECTION` - set `false` when testing a loopback dev
  server with auth bypass enabled.

## Security Notes

- Tools are read-only and marked with `readOnlyHint`.
- `/mcp` requests are authenticated unless loopback local development explicitly
  bypasses auth.
- Tool discovery and calls are scoped by tenant client, license plan, and scopes.
- In-memory per-client/per-tool rate limits are enforced.
- Audit logging records metadata without tokens, request bodies, or returned
  context.
- The Docker build excludes ignored private folders such as `ontology-data`,
  `private-ontology-data`, `internal-docs`, private JSON/RDF files, local DB
  files, and build artifacts.
- This MVP does not yet implement OAuth/JWT validation, persistent distributed
  rate limits, managed billing records, or a hosted tenant administration UI.
  Those must be added before production cloud use.
