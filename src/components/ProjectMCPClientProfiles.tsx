import { useMemo, useState } from 'react';
import { KeyRound, Network, Plus, ShieldCheck, SlidersHorizontal, TestTube2 } from 'lucide-react';
import {
  mcpClientLicensePlanLabels,
  mcpClientProfileStatusColors,
  mcpClientProfileStatusLabels,
  mcpClientSmokeStatusColors,
  mcpClientSmokeStatusLabels,
  mcpClientTokenPostureLabels,
  type MCPClientLicensePlan,
  type MCPClientProfile,
  type MCPClientProfileStatus,
  type MCPClientSmokeStatus,
  type MCPClientTokenPosture,
  type ProjectAnalysisModel,
} from '../data/projectAnalysis';

type QueueProfileWorkKind = 'integration' | 'security' | 'smoke';

interface ProjectMCPClientProfilesProps {
  model: ProjectAnalysisModel;
  onAddProfile: (profile: MCPClientProfile) => void;
  onUpdateProfile: (profileId: string, updates: Partial<MCPClientProfile>) => void;
  onQueueProfileWork: (profile: MCPClientProfile, kind: QueueProfileWorkKind) => void;
}

interface McpScopeDefinition {
  scope: string;
  label: string;
  tools: string[];
}

const licensePlanOrder: MCPClientLicensePlan[] = ['mcp-basic', 'mcp-pro', 'mcp-platform', 'internal'];
const profileStatusOrder: MCPClientProfileStatus[] = ['draft', 'ready', 'active', 'paused', 'blocked', 'retired'];
const smokeStatusOrder: MCPClientSmokeStatus[] = ['not-run', 'passed', 'failed', 'blocked', 'needs-review'];
const tokenPostureOrder: MCPClientTokenPosture[] = ['not-configured', 'token-hash', 'external-secret'];

const mcpScopeDefinitions: McpScopeDefinition[] = [
  { scope: 'project:read', label: 'Project summary', tools: ['project.summary'] },
  { scope: 'markdown:read', label: 'Markdown context', tools: ['project.markdown_context_pack'] },
  { scope: 'resources:read', label: 'Resource library', tools: ['project.resources.list'] },
  { scope: 'work_queue:read', label: 'Work queue', tools: ['project.work_queue.list'] },
  { scope: 'qa:read', label: 'QA status', tools: ['project.qa_status'] },
  { scope: 'roadmap:read', label: 'Roadmap signals', tools: ['project.roadmap_signals'] },
];

const planToolLimits: Record<MCPClientLicensePlan, string[]> = {
  'mcp-basic': ['project.summary', 'project.markdown_context_pack', 'project.resources.list'],
  'mcp-pro': ['project.summary', 'project.markdown_context_pack', 'project.resources.list', 'project.work_queue.list', 'project.qa_status', 'project.roadmap_signals'],
  'mcp-platform': ['project.summary', 'project.markdown_context_pack', 'project.resources.list', 'project.work_queue.list', 'project.qa_status', 'project.roadmap_signals'],
  internal: ['project.summary', 'project.markdown_context_pack', 'project.resources.list', 'project.work_queue.list', 'project.qa_status', 'project.roadmap_signals'],
};

const defaultReadinessChecks = [
  'Token is configured as a hash or external secret reference.',
  'Client has only the scopes needed for its first use case.',
  'Smoke test has passed with this client id and token.',
  'Audit log path is known and secret-free.',
  'Private context is disabled until tenant isolation is verified.',
];

function makeProfileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `mcp-client-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `mcp-client-${Date.now().toString(36)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function splitList(value: string): string[] {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function profileTools(profile: MCPClientProfile): string[] {
  const planTools = new Set(planToolLimits[profile.licensePlan]);
  const scopedTools = mcpScopeDefinitions
    .filter((definition) => profile.scopes.includes(definition.scope))
    .flatMap((definition) => definition.tools);
  return Array.from(new Set(scopedTools.filter((tool) => planTools.has(tool))));
}

function readinessScore(profile: MCPClientProfile): { complete: number; total: number; blockers: string[] } {
  const blockers: string[] = [];
  if (profile.tokenPosture === 'not-configured') blockers.push('Token posture');
  if (profile.scopes.length === 0) blockers.push('Scopes');
  if (!['ready', 'active'].includes(profile.status)) blockers.push('Profile status');
  if (profile.smokeStatus !== 'passed') blockers.push('Smoke test');
  if (profile.allowedPrivateContext) blockers.push('Private context review');
  if (profile.smokeStatus === 'passed' && !profile.lastAuditLogPath) blockers.push('Audit log path');

  const total = 6;
  return { complete: total - blockers.length, total, blockers };
}

export function ProjectMCPClientProfiles({
  model,
  onAddProfile,
  onUpdateProfile,
  onQueueProfileWork,
}: ProjectMCPClientProfilesProps) {
  const profiles = useMemo(() => model.mcpClientProfiles ?? [], [model.mcpClientProfiles]);
  const [statusFilter, setStatusFilter] = useState<MCPClientProfileStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<MCPClientLicensePlan | 'all'>('all');
  const [draft, setDraft] = useState({
    displayName: '',
    clientId: '',
    tenantId: '',
    companyName: '',
    owner: '',
    agentHost: '',
    endpoint: 'http://127.0.0.1:3333/mcp',
    status: 'draft' as MCPClientProfileStatus,
    licensePlan: 'mcp-basic' as MCPClientLicensePlan,
    scopes: ['project:read', 'markdown:read', 'resources:read'],
    allowedPrivateContext: false,
    rateLimitPerMinute: '60',
    tokenPosture: 'not-configured' as MCPClientTokenPosture,
    tokenReference: '',
    smokeStatus: 'not-run' as MCPClientSmokeStatus,
    lastSmokeTestAt: '',
    lastAuditLogPath: '',
    readinessChecks: defaultReadinessChecks.join('\n'),
    risks: 'Do not store plaintext bearer tokens in the project map.',
    notes: '',
  });

  const filteredProfiles = useMemo(() => profiles.filter((profile) => {
    if (statusFilter !== 'all' && profile.status !== statusFilter) return false;
    if (planFilter !== 'all' && profile.licensePlan !== planFilter) return false;
    return true;
  }), [planFilter, profiles, statusFilter]);

  const summary = useMemo(() => {
    const readyCount = profiles.filter((profile) => ['ready', 'active'].includes(profile.status)).length;
    const smokePassedCount = profiles.filter((profile) => profile.smokeStatus === 'passed').length;
    const blockedCount = profiles.filter((profile) => readinessScore(profile).blockers.length > 0).length;
    const externalReadyCount = profiles.filter((profile) => profile.status === 'ready' && profile.smokeStatus !== 'passed').length;
    return { readyCount, smokePassedCount, blockedCount, externalReadyCount };
  }, [profiles]);

  const addProfile = () => {
    const now = today();
    onAddProfile({
      id: makeProfileId(),
      displayName: draft.displayName.trim(),
      clientId: draft.clientId.trim(),
      tenantId: draft.tenantId.trim(),
      companyName: draft.companyName.trim(),
      owner: draft.owner.trim(),
      agentHost: draft.agentHost.trim(),
      endpoint: draft.endpoint.trim(),
      status: draft.status,
      licensePlan: draft.licensePlan,
      scopes: draft.scopes,
      allowedPrivateContext: draft.allowedPrivateContext,
      rateLimitPerMinute: Number.parseInt(draft.rateLimitPerMinute, 10) || undefined,
      tokenPosture: draft.tokenPosture,
      tokenReference: draft.tokenReference.trim(),
      smokeStatus: draft.smokeStatus,
      lastSmokeTestAt: draft.lastSmokeTestAt,
      lastAuditLogPath: draft.lastAuditLogPath.trim(),
      toolAccess: [],
      readinessChecks: splitList(draft.readinessChecks),
      risks: splitList(draft.risks),
      notes: splitList(draft.notes),
      repositoryIds: ['playground'],
      createdAt: now,
      updatedAt: now,
    });
    setDraft({
      ...draft,
      displayName: '',
      clientId: '',
      tenantId: '',
      companyName: '',
      agentHost: '',
      tokenReference: '',
      smokeStatus: 'not-run',
      lastSmokeTestAt: '',
      lastAuditLogPath: '',
      notes: '',
    });
  };

  return (
    <main className="analysis-mcp-clients" aria-label="MCP client profiles">
      <section className="analysis-resource-context analysis-mcp-overview" aria-label="MCP client readiness summary">
        <div>
          <span className="analysis-kicker">MCP Access Layer</span>
          <h2>Client Profiles</h2>
          <p>Manage agent connection policy, scope posture, smoke evidence, and follow-up work without storing plaintext tokens.</p>
        </div>
        <dl>
          <div>
            <dt>Profiles</dt>
            <dd>{profiles.length}</dd>
          </div>
          <div>
            <dt>Ready</dt>
            <dd>{summary.readyCount}</dd>
          </div>
          <div>
            <dt>Smoke passed</dt>
            <dd>{summary.smokePassedCount}</dd>
          </div>
          <div>
            <dt>Needs action</dt>
            <dd>{summary.blockedCount}</dd>
          </div>
        </dl>
        {summary.externalReadyCount > 0 && (
          <div className="analysis-chip-row">
            <span className="analysis-chip">First real agent candidate ready for smoke setup</span>
          </div>
        )}
      </section>

      <section className="analysis-qa-filters" aria-label="MCP client filters">
        <select aria-label="MCP client status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MCPClientProfileStatus | 'all')}>
          <option value="all">All statuses</option>
          {profileStatusOrder.map((status) => <option key={status} value={status}>{mcpClientProfileStatusLabels[status]}</option>)}
        </select>
        <select aria-label="MCP client plan" value={planFilter} onChange={(event) => setPlanFilter(event.target.value as MCPClientLicensePlan | 'all')}>
          <option value="all">All plans</option>
          {licensePlanOrder.map((plan) => <option key={plan} value={plan}>{mcpClientLicensePlanLabels[plan]}</option>)}
        </select>
      </section>

      <section className="analysis-mcp-client-grid">
        <section className="analysis-mcp-client-list" aria-label="Managed MCP clients">
          {filteredProfiles.length === 0 ? (
            <div className="analysis-empty-state">No MCP client profiles match the current filters.</div>
          ) : filteredProfiles.map((profile) => {
            const tools = profile.toolAccess && profile.toolAccess.length > 0 ? profile.toolAccess : profileTools(profile);
            const score = readinessScore(profile);
            const policyPreview = {
              clientId: profile.clientId,
              tenantId: profile.tenantId,
              tokenHash: '<sha256-token-hash>',
              licensePlan: profile.licensePlan,
              scopes: profile.scopes,
              allowedPrivateContext: profile.allowedPrivateContext === true,
              rateLimitPerMinute: profile.rateLimitPerMinute,
            };
            return (
              <article className="analysis-qa-card analysis-mcp-client-card" key={profile.id}>
                <header>
                  <div>
                    <span
                      className="analysis-roadmap-status"
                      style={{ borderColor: mcpClientProfileStatusColors[profile.status], color: mcpClientProfileStatusColors[profile.status] }}
                    >
                      {mcpClientProfileStatusLabels[profile.status]}
                    </span>
                    <span className="analysis-qa-type">{mcpClientLicensePlanLabels[profile.licensePlan]}</span>
                  </div>
                  {profile.updatedAt || profile.createdAt ? <time>{profile.updatedAt || profile.createdAt}</time> : null}
                </header>
                <h2>{profile.displayName}</h2>
                <div className="analysis-mcp-client-meta">
                  <span><Network size={14} /> {profile.endpoint || 'No endpoint recorded'}</span>
                  <span><KeyRound size={14} /> {mcpClientTokenPostureLabels[profile.tokenPosture]}</span>
                  <span><ShieldCheck size={14} /> {profile.allowedPrivateContext ? 'Private context allowed' : 'Private context off'}</span>
                  <span><SlidersHorizontal size={14} /> {profile.rateLimitPerMinute ?? 60}/min</span>
                </div>
                <p>{profile.companyName || profile.agentHost || profile.owner || 'No company or agent host recorded yet.'}</p>
                <dl className="analysis-mcp-readiness-meter">
                  <div>
                    <dt>Readiness</dt>
                    <dd>{score.complete}/{score.total}</dd>
                  </div>
                  <div>
                    <dt>Smoke</dt>
                    <dd style={{ color: mcpClientSmokeStatusColors[profile.smokeStatus] }}>{mcpClientSmokeStatusLabels[profile.smokeStatus]}</dd>
                  </div>
                  <div>
                    <dt>Scopes</dt>
                    <dd>{profile.scopes.length}</dd>
                  </div>
                  <div>
                    <dt>Tools</dt>
                    <dd>{tools.length}</dd>
                  </div>
                </dl>
                <div className="analysis-qa-composer-grid">
                  <label>
                    <span>Status</span>
                    <select value={profile.status} onChange={(event) => onUpdateProfile(profile.id, { status: event.target.value as MCPClientProfileStatus, updatedAt: today() })}>
                      {profileStatusOrder.map((status) => <option key={status} value={status}>{mcpClientProfileStatusLabels[status]}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Smoke status</span>
                    <select value={profile.smokeStatus} onChange={(event) => onUpdateProfile(profile.id, { smokeStatus: event.target.value as MCPClientSmokeStatus, updatedAt: today() })}>
                      {smokeStatusOrder.map((status) => <option key={status} value={status}>{mcpClientSmokeStatusLabels[status]}</option>)}
                    </select>
                  </label>
                </div>
                <div className="analysis-md-note-block">
                  <strong>Allowed tools</strong>
                  <ul>{tools.map((tool) => <li key={tool}><code>{tool}</code></li>)}</ul>
                </div>
                <div className="analysis-md-note-block">
                  <strong>Readiness checks</strong>
                  <ul>{(profile.readinessChecks ?? defaultReadinessChecks).map((check) => <li key={check}>{check}</li>)}</ul>
                </div>
                {score.blockers.length > 0 && (
                  <div className="analysis-md-note-block">
                    <strong>Needs action</strong>
                    <ul>{score.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
                  </div>
                )}
                {profile.risks && profile.risks.length > 0 && (
                  <div className="analysis-md-note-block">
                    <strong>Risk notes</strong>
                    <ul>{profile.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
                  </div>
                )}
                <pre className="analysis-md-draft">{JSON.stringify(policyPreview, null, 2)}</pre>
                <div className="analysis-mcp-card-actions">
                  <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={() => onQueueProfileWork(profile, 'smoke')}>
                    <TestTube2 size={15} />
                    Queue Smoke
                  </button>
                  <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={() => onQueueProfileWork(profile, 'integration')}>
                    <Network size={15} />
                    Queue Integration
                  </button>
                  <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={() => onQueueProfileWork(profile, 'security')}>
                    <ShieldCheck size={15} />
                    Queue Security
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="analysis-qa-composer analysis-mcp-client-composer">
          <h2>Add Client Profile</h2>
          <label>
            <span>Profile name</span>
            <input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
          </label>
          <label>
            <span>Client id</span>
            <input value={draft.clientId} onChange={(event) => setDraft({ ...draft, clientId: event.target.value })} />
          </label>
          <label>
            <span>Tenant id</span>
            <input value={draft.tenantId} onChange={(event) => setDraft({ ...draft, tenantId: event.target.value })} />
          </label>
          <label>
            <span>Company</span>
            <input value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
          </label>
          <label>
            <span>Agent host</span>
            <input value={draft.agentHost} onChange={(event) => setDraft({ ...draft, agentHost: event.target.value })} />
          </label>
          <label>
            <span>Endpoint</span>
            <input value={draft.endpoint} onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })} />
          </label>
          <div className="analysis-qa-composer-grid">
            <label>
              <span>Plan</span>
              <select value={draft.licensePlan} onChange={(event) => setDraft({ ...draft, licensePlan: event.target.value as MCPClientLicensePlan })}>
                {licensePlanOrder.map((plan) => <option key={plan} value={plan}>{mcpClientLicensePlanLabels[plan]}</option>)}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as MCPClientProfileStatus })}>
                {profileStatusOrder.map((status) => <option key={status} value={status}>{mcpClientProfileStatusLabels[status]}</option>)}
              </select>
            </label>
          </div>
          <div className="analysis-qa-composer-grid">
            <label>
              <span>Token posture</span>
              <select value={draft.tokenPosture} onChange={(event) => setDraft({ ...draft, tokenPosture: event.target.value as MCPClientTokenPosture })}>
                {tokenPostureOrder.map((posture) => <option key={posture} value={posture}>{mcpClientTokenPostureLabels[posture]}</option>)}
              </select>
            </label>
            <label>
              <span>Rate limit</span>
              <input value={draft.rateLimitPerMinute} onChange={(event) => setDraft({ ...draft, rateLimitPerMinute: event.target.value })} />
            </label>
          </div>
          <label>
            <span>Token reference</span>
            <input value={draft.tokenReference} onChange={(event) => setDraft({ ...draft, tokenReference: event.target.value })} placeholder="Secret manager or tokenHash location" />
          </label>
          <label className="analysis-mcp-toggle">
            <input type="checkbox" checked={draft.allowedPrivateContext} onChange={(event) => setDraft({ ...draft, allowedPrivateContext: event.target.checked })} />
            <span>Allow private context</span>
          </label>
          <fieldset className="analysis-mcp-scope-fieldset">
            <legend>Scopes</legend>
            {mcpScopeDefinitions.map((definition) => (
              <label key={definition.scope}>
                <input
                  type="checkbox"
                  checked={draft.scopes.includes(definition.scope)}
                  onChange={(event) => {
                    const scopes = event.target.checked
                      ? [...draft.scopes, definition.scope]
                      : draft.scopes.filter((scope) => scope !== definition.scope);
                    setDraft({ ...draft, scopes });
                  }}
                />
                <span>{definition.label}</span>
              </label>
            ))}
          </fieldset>
          <label>
            <span>Readiness checks</span>
            <textarea rows={5} value={draft.readinessChecks} onChange={(event) => setDraft({ ...draft, readinessChecks: event.target.value })} />
          </label>
          <label>
            <span>Risk notes</span>
            <textarea rows={3} value={draft.risks} onChange={(event) => setDraft({ ...draft, risks: event.target.value })} />
          </label>
          <label>
            <span>Notes</span>
            <textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <button className="analysis-card-toggle" type="button" onClick={addProfile} disabled={!draft.displayName.trim() || !draft.clientId.trim() || !draft.tenantId.trim()}>
            <Plus size={15} />
            Add profile
          </button>
          <p className="analysis-mcp-secret-note">
            Plaintext bearer tokens stay outside the map. Store only a token hash reference or an external secret pointer.
          </p>
        </aside>
      </section>
    </main>
  );
}
