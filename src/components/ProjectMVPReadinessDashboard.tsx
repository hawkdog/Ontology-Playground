import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FileWarning,
  Gauge,
  GitBranch,
  Layers3,
  Rocket,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  dispositionColors,
  dispositionLabels,
  fileStatusColors,
  fileStatusLabels,
  mvpCutSafetyLabels,
  mvpDecisionLabels,
  mvpSignoffLabels,
  qaStatusColors,
  qaStatusLabels,
  type MVPCutSafety,
  type MVPDecision,
  type MVPSignoffStatus,
  type FileReferenceStatus,
  type ProductFeature,
  type ProjectProgressEntry,
  type ProjectAnalysisModel,
  type QAItem,
  type QAItemStatus,
} from '../data/projectAnalysis';

type ReadinessState = 'ready' | 'blocked' | 'needs-qa' | 'needs-retest' | 'needs-mapping' | 'future';

interface ProjectMVPReadinessDashboardProps {
  model: ProjectAnalysisModel;
  features: ProductFeature[];
  onSelectFeature?: (featureId: string) => void;
  onUpdateFeature?: (featureId: string, updates: Partial<ProductFeature>) => void;
}

interface FeatureFileReference {
  path: string;
  status: FileReferenceStatus;
}

interface ReadinessFeature {
  feature: ProductFeature;
  state: ReadinessState;
  label: string;
  nextAction: string;
  qaItems: QAItem[];
  fileRefs: FeatureFileReference[];
  blockerCount: number;
  evidenceCount: number;
  score: number;
  dependsOnCount: number;
  supportsCount: number;
}

interface ReadinessDecisionDraft {
  mvpDecision: MVPDecision;
  mvpNextAction: string;
  mvpOwner: string;
  mvpStatus: string;
  mvpSignoff: MVPSignoffStatus;
  mvpCutSafety: MVPCutSafety;
  note: string;
}

const stateLabels: Record<ReadinessState, string> = {
  ready: 'Ready',
  blocked: 'Blocked',
  'needs-qa': 'Needs QA',
  'needs-retest': 'Needs retest',
  'needs-mapping': 'Needs mapping',
  future: 'Future',
};

const stateColors: Record<ReadinessState, string> = {
  ready: '#107C10',
  blocked: '#D13438',
  'needs-qa': '#C19C00',
  'needs-retest': '#D83B01',
  'needs-mapping': '#8764B8',
  future: '#605E5C',
};

const blockingQAStatuses = new Set<QAItemStatus>(['blocked', 'failed']);
const activeQAStatuses = new Set<QAItemStatus>(['not-started', 'ready', 'in-progress', 'partial', 'needs-retest']);
const mvpDispositions = new Set(['keep', 'simplify', 'hide', 'gate', 'consolidate', 'new']);

function scoreFeature(feature: ProductFeature): number {
  return feature.value * 2 - feature.effort - feature.risk;
}

function featureFiles(feature: ProductFeature): FeatureFileReference[] {
  return [
    ...(feature.appFiles ?? []),
    ...(feature.pluginFiles ?? []),
    ...(feature.playgroundFiles ?? []),
    ...(feature.privateDataFiles ?? []),
    ...(feature.qaEvidenceFiles ?? []),
  ].map((path) => ({ path, status: feature.fileStatuses?.[path] ?? 'mapped' }));
}

function evidenceCount(item: QAItem): number {
  const attachments = item.attachments?.length ?? 0;
  const progressImages = (item.progressLog ?? []).reduce((count, entry) => count + (entry.images?.length ?? 0), 0);
  return attachments + progressImages;
}

function readinessForFeature(model: ProjectAnalysisModel, feature: ProductFeature): ReadinessFeature {
  const qaItems = (model.qaItems ?? []).filter((item) => item.featureIds.includes(feature.id));
  const fileRefs = featureFiles(feature);
  const blockerCount = qaItems.filter((item) => blockingQAStatuses.has(item.status)).length;
  const activeQaCount = qaItems.filter((item) => activeQAStatuses.has(item.status)).length;
  const evidence = qaItems.reduce((count, item) => count + evidenceCount(item), 0);
  const needsMapping = fileRefs.length === 0 || fileRefs.some((file) => ['needs-review', 'planned', 'orphan'].includes(file.status));
  const isMvpCandidate = feature.releaseId === 'mvp' && mvpDispositions.has(feature.disposition);
  const dependsOnCount = model.dependencies.filter((dependency) => dependency.fromFeatureId === feature.id).length;
  const supportsCount = model.dependencies.filter((dependency) => dependency.toFeatureId === feature.id).length;

  if (!isMvpCandidate) {
    return {
      feature,
      state: 'future',
      label: stateLabels.future,
      nextAction: 'Keep in roadmap unless needed to unblock an MVP feature.',
      qaItems,
      fileRefs,
      blockerCount,
      evidenceCount: evidence,
      score: scoreFeature(feature),
      dependsOnCount,
      supportsCount,
    };
  }

  if (blockerCount > 0) {
    return {
      feature,
      state: 'blocked',
      label: stateLabels.blocked,
      nextAction: 'Resolve failed or blocked QA before this stays in MVP scope.',
      qaItems,
      fileRefs,
      blockerCount,
      evidenceCount: evidence,
      score: scoreFeature(feature),
      dependsOnCount,
      supportsCount,
    };
  }

  if (qaItems.length === 0) {
    return {
      feature,
      state: 'needs-qa',
      label: stateLabels['needs-qa'],
      nextAction: 'Add at least one release-readiness QA item mapped to this feature.',
      qaItems,
      fileRefs,
      blockerCount,
      evidenceCount: evidence,
      score: scoreFeature(feature),
      dependsOnCount,
      supportsCount,
    };
  }

  if (activeQaCount > 0) {
    return {
      feature,
      state: 'needs-retest',
      label: stateLabels['needs-retest'],
      nextAction: 'Finish or retest open QA and attach evidence for sign-off.',
      qaItems,
      fileRefs,
      blockerCount,
      evidenceCount: evidence,
      score: scoreFeature(feature),
      dependsOnCount,
      supportsCount,
    };
  }

  if (needsMapping) {
    return {
      feature,
      state: 'needs-mapping',
      label: stateLabels['needs-mapping'],
      nextAction: 'Confirm mapped files and resolve planned, orphaned, or needs-review references.',
      qaItems,
      fileRefs,
      blockerCount,
      evidenceCount: evidence,
      score: scoreFeature(feature),
      dependsOnCount,
      supportsCount,
    };
  }

  return {
    feature,
    state: 'ready',
    label: stateLabels.ready,
    nextAction: 'Ready for MVP sign-off unless manual product review finds a gap.',
    qaItems,
    fileRefs,
    blockerCount,
    evidenceCount: evidence,
    score: scoreFeature(feature),
    dependsOnCount,
    supportsCount,
  };
}

function confidenceLabel(item: ReadinessFeature): string {
  if (item.state === 'ready') return 'High';
  if (item.state === 'blocked') return 'Blocked';
  if (item.state === 'future') return 'Deferred';
  if (item.qaItems.length === 0 || item.fileRefs.length === 0) return 'Low';
  return 'Medium';
}

function decisionFromFeature(feature: ProductFeature): MVPDecision {
  if (feature.mvpDecision) return feature.mvpDecision;
  if (feature.disposition === 'keep' || feature.disposition === 'new') return 'keep';
  if (feature.disposition === 'simplify' || feature.disposition === 'hide' || feature.disposition === 'gate' || feature.disposition === 'consolidate') {
    return 'simplify';
  }
  if (feature.disposition === 'remove' || feature.disposition === 'remove-later') return 'cut';
  return 'defer';
}

function cutSafetyFromFeature(feature: ProductFeature, doNotCutIds: Set<string>): MVPCutSafety {
  if (feature.mvpCutSafety) return feature.mvpCutSafety;
  if (doNotCutIds.has(feature.id)) return 'do-not-cut-yet';
  if (feature.releaseId === 'mvp') return 'needs-review';
  return 'safe-to-cut';
}

function draftFromFeature(feature: ProductFeature, row: ReadinessFeature, doNotCutIds: Set<string>): ReadinessDecisionDraft {
  return {
    mvpDecision: decisionFromFeature(feature),
    mvpNextAction: feature.mvpNextAction || row.nextAction,
    mvpOwner: feature.mvpOwner || '',
    mvpStatus: feature.mvpStatus || row.label,
    mvpSignoff: feature.mvpSignoff || (row.state === 'ready' ? 'in-review' : 'not-started'),
    mvpCutSafety: cutSafetyFromFeature(feature, doNotCutIds),
    note: '',
  };
}

function makeProgressId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `mvp-progress-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `mvp-progress-${Date.now().toString(36)}`;
}

export function ProjectMVPReadinessDashboard({ model, features, onSelectFeature, onUpdateFeature }: ProjectMVPReadinessDashboardProps) {
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReadinessDecisionDraft | null>(null);
  const rows = features.map((feature) => readinessForFeature(model, feature));
  const mvpRows = rows.filter((row) => row.feature.releaseId === 'mvp' && row.state !== 'future');
  const readyCount = mvpRows.filter((row) => row.state === 'ready').length;
  const blockedCount = mvpRows.filter((row) => row.state === 'blocked').length;
  const qaGapCount = mvpRows.filter((row) => row.state === 'needs-qa' || row.state === 'needs-retest').length;
  const mappingGapCount = mvpRows.filter((row) => row.state === 'needs-mapping').length;
  const futureRows = rows.filter((row) => row.state === 'future');
  const doNotCutIds = new Set(model.doNotCutBeforeChecks ?? []);
  const firstActions = rows
    .filter((row) => row.state === 'blocked' || row.state === 'needs-qa' || row.state === 'needs-retest' || row.state === 'needs-mapping')
    .slice(0, 5);

  const startEditing = (row: ReadinessFeature) => {
    setEditingFeatureId(row.feature.id);
    setDraft(draftFromFeature(row.feature, row, doNotCutIds));
  };

  const cancelEditing = () => {
    setEditingFeatureId(null);
    setDraft(null);
  };

  const saveDecision = (feature: ProductFeature) => {
    if (!draft || !onUpdateFeature) return;
    const trimmedNote = draft.note.trim();
    const progressEntry: ProjectProgressEntry | null = trimmedNote
      ? {
          id: makeProgressId(),
          createdAt: new Date().toISOString(),
          body: trimmedNote,
          status: draft.mvpStatus || mvpSignoffLabels[draft.mvpSignoff],
          author: 'Project Analyzer',
        }
      : null;

    onUpdateFeature(feature.id, {
      mvpDecision: draft.mvpDecision,
      mvpNextAction: draft.mvpNextAction.trim(),
      mvpOwner: draft.mvpOwner.trim(),
      mvpStatus: draft.mvpStatus.trim(),
      mvpSignoff: draft.mvpSignoff,
      mvpCutSafety: draft.mvpCutSafety,
      mvpProgressLog: progressEntry ? [...(feature.mvpProgressLog ?? []), progressEntry] : feature.mvpProgressLog,
      mvpNotes: trimmedNote ? [...(feature.mvpNotes ?? []), trimmedNote] : feature.mvpNotes,
    });
    cancelEditing();
  };

  return (
    <main className="analysis-readiness" aria-label="MVP readiness dashboard">
      <section className="analysis-readiness-hero">
        <div>
          <span className="analysis-kicker">MVP Readiness</span>
          <h2>Ship decision board</h2>
          <p>Use this screen to decide what is ready, what needs QA, what needs mapping, and what should stay in a future release.</p>
        </div>
        <div className="analysis-readiness-score">
          <Gauge size={22} />
          <strong>{mvpRows.length ? Math.round((readyCount / mvpRows.length) * 100) : 0}%</strong>
          <span>MVP ready</span>
        </div>
      </section>

      <section className="analysis-readiness-summary" aria-label="MVP readiness summary">
        <ReadinessSummaryCard icon={<Rocket size={18} />} label="MVP features" value={mvpRows.length} />
        <ReadinessSummaryCard icon={<CheckCircle2 size={18} />} label="Ready" value={readyCount} tone={stateColors.ready} />
        <ReadinessSummaryCard icon={<AlertTriangle size={18} />} label="Blocked" value={blockedCount} tone={stateColors.blocked} />
        <ReadinessSummaryCard icon={<ClipboardCheck size={18} />} label="QA gaps" value={qaGapCount} tone={stateColors['needs-qa']} />
        <ReadinessSummaryCard icon={<FileWarning size={18} />} label="Mapping gaps" value={mappingGapCount} tone={stateColors['needs-mapping']} />
        <ReadinessSummaryCard icon={<GitBranch size={18} />} label="Future" value={futureRows.length} />
      </section>

      <section className="analysis-readiness-layout">
        <section className="analysis-readiness-list">
          {rows.map((row) => (
            <article className="analysis-readiness-card" key={row.feature.id}>
              <header>
                <div>
                  <span
                    className="analysis-readiness-state"
                    style={{ borderColor: stateColors[row.state], color: stateColors[row.state] }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="analysis-disposition"
                    style={{ borderColor: dispositionColors[row.feature.disposition], color: dispositionColors[row.feature.disposition] }}
                  >
                    {dispositionLabels[row.feature.disposition]}
                  </span>
                  {cutSafetyFromFeature(row.feature, doNotCutIds) === 'do-not-cut-yet' && <span className="analysis-readiness-lock">Do not cut yet</span>}
                  {row.feature.mvpDecision && <span className="analysis-readiness-decision">Decision: {mvpDecisionLabels[row.feature.mvpDecision]}</span>}
                </div>
                <div className="analysis-readiness-card-actions">
                  <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={() => onSelectFeature?.(row.feature.id)}>
                    <Layers3 size={14} />
                    Details
                  </button>
                  <button className="analysis-card-toggle" type="button" onClick={() => startEditing(row)}>
                    <Edit3 size={14} />
                    Edit decision
                  </button>
                </div>
              </header>

              <h3>{row.feature.name}</h3>
              <p>{row.nextAction}</p>

              <dl className="analysis-readiness-metrics">
                <div><dt>Score</dt><dd>{row.score}</dd></div>
                <div><dt>QA</dt><dd>{row.qaItems.length}</dd></div>
                <div><dt>Files</dt><dd>{row.fileRefs.length}</dd></div>
                <div><dt>Evidence</dt><dd>{row.evidenceCount}</dd></div>
                <div><dt>Depends</dt><dd>{row.dependsOnCount}</dd></div>
                <div><dt>Supports</dt><dd>{row.supportsCount}</dd></div>
                <div><dt>Confidence</dt><dd>{confidenceLabel(row)}</dd></div>
                <div><dt>Release</dt><dd>{model.releases.find((release) => release.id === row.feature.releaseId)?.name ?? row.feature.releaseId}</dd></div>
                <div><dt>Owner</dt><dd>{row.feature.mvpOwner || 'Unassigned'}</dd></div>
                <div><dt>Sign-off</dt><dd>{row.feature.mvpSignoff ? mvpSignoffLabels[row.feature.mvpSignoff] : 'Not started'}</dd></div>
                <div><dt>Cut safety</dt><dd>{mvpCutSafetyLabels[cutSafetyFromFeature(row.feature, doNotCutIds)]}</dd></div>
                <div><dt>Logs</dt><dd>{row.feature.mvpProgressLog?.length ?? 0}</dd></div>
              </dl>

              {row.feature.mvpNextAction && (
                <div className="analysis-readiness-next-action">
                  <strong>Saved next action</strong>
                  <p>{row.feature.mvpNextAction}</p>
                </div>
              )}

              <div className="analysis-readiness-evidence">
                {row.qaItems.slice(0, 3).map((item) => (
                  <span key={item.id} style={{ borderColor: qaStatusColors[item.status], color: qaStatusColors[item.status] }}>
                    {qaStatusLabels[item.status]} · {item.title}
                  </span>
                ))}
                {row.fileRefs.filter((file) => file.status !== 'existing' && file.status !== 'mapped').slice(0, 3).map((file) => (
                  <span key={file.path} style={{ borderColor: fileStatusColors[file.status], color: fileStatusColors[file.status] }}>
                    {fileStatusLabels[file.status]} · {file.path}
                  </span>
                ))}
              </div>

              {row.feature.mvpProgressLog && row.feature.mvpProgressLog.length > 0 && (
                <ol className="analysis-readiness-progress">
                  {row.feature.mvpProgressLog.slice(-2).map((entry) => (
                    <li key={entry.id}>
                      <time>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'No date'}</time>
                      <p>{entry.body}</p>
                    </li>
                  ))}
                </ol>
              )}

              {editingFeatureId === row.feature.id && draft && (
                <section className="analysis-readiness-editor" aria-label={`Edit MVP decision for ${row.feature.name}`}>
                  <div className="analysis-readiness-editor-grid">
                    <label>
                      <span>Final MVP decision</span>
                      <select value={draft.mvpDecision} onChange={(event) => setDraft({ ...draft, mvpDecision: event.target.value as MVPDecision })}>
                        {Object.entries(mvpDecisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Sign-off</span>
                      <select value={draft.mvpSignoff} onChange={(event) => setDraft({ ...draft, mvpSignoff: event.target.value as MVPSignoffStatus })}>
                        {Object.entries(mvpSignoffLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Cut safety</span>
                      <select value={draft.mvpCutSafety} onChange={(event) => setDraft({ ...draft, mvpCutSafety: event.target.value as MVPCutSafety })}>
                        {Object.entries(mvpCutSafetyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Owner</span>
                      <input value={draft.mvpOwner} onChange={(event) => setDraft({ ...draft, mvpOwner: event.target.value })} />
                    </label>
                    <label>
                      <span>Status</span>
                      <input value={draft.mvpStatus} onChange={(event) => setDraft({ ...draft, mvpStatus: event.target.value })} />
                    </label>
                  </div>
                  <label>
                    <span>Next action</span>
                    <textarea rows={2} value={draft.mvpNextAction} onChange={(event) => setDraft({ ...draft, mvpNextAction: event.target.value })} />
                  </label>
                  <label>
                    <span>Progress note</span>
                    <textarea rows={3} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Optional dated note added to this feature's MVP progress log." />
                  </label>
                  <div className="analysis-readiness-editor-actions">
                    <button className="analysis-card-toggle" type="button" onClick={() => saveDecision(row.feature)} disabled={!onUpdateFeature}>
                      <Check size={14} />
                      Save decision
                    </button>
                    <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={cancelEditing}>
                      Cancel
                    </button>
                  </div>
                </section>
              )}
            </article>
          ))}
        </section>

        <aside className="analysis-readiness-actions">
          <h2>Next Actions</h2>
          {firstActions.length === 0 ? (
            <p>No active MVP gaps match the current filters.</p>
          ) : (
            <ol>
              {firstActions.map((row) => (
                <li key={row.feature.id}>
                  <strong>{row.feature.name}</strong>
                  <span>{row.label}</span>
                  <p>{row.nextAction}</p>
                </li>
              ))}
            </ol>
          )}

          <h2>Slimming Signals</h2>
          <ul>
            {(model.firstSlimmingCandidates ?? []).slice(0, 5).map((candidate) => (
              <li key={`${candidate.featureId}-${candidate.suggestedAction}`}>
                <strong>{features.find((feature) => feature.id === candidate.featureId)?.name ?? candidate.featureId}</strong>
                <span>{candidate.suggestedAction}</span>
                <p>{candidate.why}</p>
              </li>
            ))}
            {(model.firstSlimmingCandidates ?? []).length === 0 && (
              <li>
                <strong>{futureRows.length} future item{futureRows.length === 1 ? '' : 's'}</strong>
                <span>Candidate backlog</span>
                <p>Use release and disposition filters to review what can stay out of the MVP branch.</p>
              </li>
            )}
          </ul>
        </aside>
      </section>
    </main>
  );
}

function ReadinessSummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="analysis-readiness-summary-card" style={tone ? { borderColor: tone } : undefined}>
      <span style={tone ? { color: tone } : undefined}>{icon}</span>
      <strong>{value}</strong>
      <em>{label}</em>
    </div>
  );
}
