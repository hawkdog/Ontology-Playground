# MCP MVP Server Tracking

## Current Layer

The first MCP MVP server layer exposes Project Analyzer context as read-only
tools over a local HTTP MCP endpoint:

- `server/discover`
- `tools/list`
- `tools/call`
- `GET /health`

This layer is intentionally limited to context retrieval. It does not generate
content, write work items, update markdown docs, modify QA records, or publish
private data.

Protocol direction is anchored to the MCP 2026-07-28 stateless HTTP shape:

- `server/discover` for optional capability discovery.
- Direct `serverInfo` in discovery responses.
- `Mcp-Method` and `Mcp-Name` headers for routable requests.
- `WWW-Authenticate` scope guidance for unauthorized HTTP requests.
- Cacheable list responses.
- Tool annotations for read-only, non-destructive, idempotent, closed-world
  behavior.
- Authorization hardening before remote/cloud exposure.

## Implemented Tools

- `project.summary`
- `project.markdown_context_pack`
- `project.resources.list`
- `project.work_queue.list`
- `project.qa_status`
- `project.roadmap_signals`

## Data Source Order

1. `PROJECT_ANALYSIS_SOURCE_FILE`
2. `PROJECT_ANALYSIS_API_URL` plus `PROJECT_ANALYSIS_MAP_ID`
3. Fictional sample data when `PROJECT_ANALYSIS_ALLOW_SAMPLE` is enabled

## Guardrails In Place

- Read-only tool annotations.
- Private-context environment switch: `MCP_INCLUDE_PRIVATE_CONTEXT=false`.
- Static bearer client policy for the local MVP through `MCP_CLIENTS_JSON` or
  `MCP_CLIENTS_FILE`.
- Tenant/client metadata on every authorized request.
- License-plan gates for basic, pro, platform, and internal clients.
- Scope checks per tool.
- In-memory per-client/per-tool rate limits.
- JSONL audit events for auth/tool metadata without request bodies, bearer
  tokens, or returned context.
- Startup refusal when binding a non-loopback server without auth or configured
  clients.
- Docker ignore rules for private local folders, private JSON/RDF files, local
  DB files, and generated artifacts.
- Local smoke client for authenticated agent-style protocol checks without an
  LLM dependency.
- Playground MCP Client Profiles for tenant/client metadata, license plan,
  allowed scopes, token posture, private-context posture, smoke status,
  audit-log path, readiness checks, and queue follow-up before external agent
  access.
- No server-side writes or queue mutations.
- No bundled private app/plugin code or private project maps.

## Next Items

- Replace static bearer policy with hosted OAuth/JWT validation and issuer
  checks.
- Move rate limits and audit logs to tenant-scoped persistent infrastructure.
- Connect license plans to real billing and entitlement records.
- Add response-size budgets per tenant/client/tool.
- Add a client connector guide for local agents and hosted agents.
- Wire MCP Client Profiles to generated local client-policy files or a hosted
  tenant admin API.
- Add cloud deployment shape after the local Docker path is stable.
