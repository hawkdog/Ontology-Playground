import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  Database,
  Download,
  FileJson,
  FolderTree,
  GitBranch,
  ListFilter,
  Map as MapIcon,
  Milestone,
  Network,
  Plus,
  Rocket,
  Save,
  Upload,
} from 'lucide-react';
import {
  dispositionLabels,
  projectAnalysisFromJson,
  roadmapStatusColor,
  roadmapStatusLabel,
  sampleProjectAnalysis,
  type FeatureDisposition,
  type ProductFeature,
  type ProjectAnalysisModel,
  type RoadmapItem,
  type RoadmapItemType,
  type RoadmapSignalStatus,
} from '../data/projectAnalysis';
import { navigate } from '../lib/router';
import { loadProjectAnalysisFromApi, saveProjectAnalysisToApi } from '../lib/projectAnalysisApi';

interface ProjectRoadmapDashboardProps {
  model?: ProjectAnalysisModel;
  autoLoad?: boolean;
}

type DashboardRoadmapItem = RoadmapItem & {
  derivedFrom?: 'roadmap-item' | 'feature-signal' | 'source';
};

const all = 'all';
const roadmapStatusOrder: RoadmapSignalStatus[] = ['needs-review', 'idea', 'concept', 'planned', 'mvp', 'active', 'in-progress', 'built', 'shipped', 'deferred', 'cut'];
const roadmapTypeOrder: RoadmapItemType[] = ['roadmap-item', 'feature-candidate', 'release', 'research', 'integration', 'technical-debt', 'qa'];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || 'roadmap-item';
}

function readLocalJsonFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Unable to read that JSON file.'));
    reader.readAsText(file);
  });
}

function downloadProjectAnalysis(model: ProjectAnalysisModel): void {
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(model.projectName)}-roadmap-map.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function statusKey(status: string): RoadmapSignalStatus {
  const normalized = status.toLowerCase();
  if (roadmapStatusOrder.includes(normalized as RoadmapSignalStatus)) return normalized as RoadmapSignalStatus;
  if (normalized === 'in progress') return 'in-progress';
  if (normalized === 'future') return 'deferred';
  return 'needs-review';
}

function sourceTitle(source: string): string {
  return source.split(/[\\/]/).pop()?.replace(/\.md$/i, '').replace(/[-_]+/g, ' ') || source;
}

function collectRoadmapItems(model: ProjectAnalysisModel): DashboardRoadmapItem[] {
  const explicit = (model.roadmapItems ?? []).map((item) => ({ ...item, derivedFrom: 'roadmap-item' as const }));
  const fromFeatures = model.features.flatMap((feature) => (
    (feature.roadmapSignals ?? []).map((signal, index): DashboardRoadmapItem => ({
      id: `feature-signal-${feature.id}-${index}`,
      title: feature.name,
      type: 'feature-candidate',
      status: signal.status,
      summary: signal.summary,
      source: signal.source,
      sourceSection: signal.phase,
      phase: signal.phase,
      target: signal.target,
      targetReleaseId: feature.releaseId,
      capabilityId: feature.capabilityId,
      disposition: feature.disposition,
      repositoryIds: feature.repositoryIds,
      featureIds: [feature.id],
      fileRefs: [
        ...(feature.appFiles ?? []),
        ...(feature.pluginFiles ?? []),
        ...(feature.playgroundFiles ?? []),
        ...(feature.privateDataFiles ?? []),
      ],
      promotedFeatureId: feature.id,
      derivedFrom: 'feature-signal',
    }))
  ));
  const fromSources = (model.roadmapSources ?? []).map((signal, index): DashboardRoadmapItem => ({
    id: `roadmap-source-${index}`,
    title: sourceTitle(signal.source),
    type: 'roadmap-item',
    status: signal.status,
    summary: signal.summary,
    source: signal.source,
    sourceSection: signal.phase,
    phase: signal.phase,
    target: signal.target,
    derivedFrom: 'source',
  }));

  return [...explicit, ...fromFeatures, ...fromSources];
}

function hasLinkedFeature(item: DashboardRoadmapItem, model: ProjectAnalysisModel): boolean {
  const linked = new Set([...(item.featureIds ?? []), item.promotedFeatureId].filter(Boolean));
  return model.features.some((feature) => linked.has(feature.id));
}

function fileBuckets(item: DashboardRoadmapItem, model: ProjectAnalysisModel) {
  const repoTypes = new Set((item.repositoryIds ?? []).map((repoId) => model.repositories.find((repo) => repo.id === repoId)?.type));
  if (repoTypes.has('plugin')) return { pluginFiles: item.fileRefs ?? [] };
  if (repoTypes.has('web-app') || repoTypes.has('service')) return { appFiles: item.fileRefs ?? [] };
  return { privateDataFiles: item.fileRefs ?? [] };
}

function featureFromRoadmapItem(item: DashboardRoadmapItem, model: ProjectAnalysisModel): ProductFeature {
  const idBase = slugify(item.title);
  const existingIds = new Set(model.features.map((feature) => feature.id));
  let id = idBase;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${idBase}-${suffix}`;
    suffix += 1;
  }

  const status = statusKey(item.status);
  const targetReleaseId = item.targetReleaseId || (status === 'mvp' || status === 'active' ? 'mvp' : model.releases.at(-1)?.id ?? 'later');
  return {
    id,
    name: item.title,
    capabilityId: item.capabilityId || model.capabilities[0]?.id || 'planning',
    repositoryIds: item.repositoryIds ?? [],
    disposition: item.disposition ?? (status === 'deferred' ? 'defer' : status === 'cut' ? 'remove-later' : 'new'),
    releaseId: targetReleaseId,
    value: status === 'mvp' || status === 'active' ? 4 : 3,
    effort: 3,
    risk: status === 'needs-review' ? 4 : 3,
    rationale: item.summary,
    roadmapSignals: [{
      source: item.source,
      status: 'active',
      summary: item.summary,
      phase: item.phase || item.sourceSection,
      target: item.target,
    }],
    fileStatuses: Object.fromEntries((item.fileRefs ?? []).map((file) => [file, 'planned'])),
    ...fileBuckets(item, model),
  };
}

export function ProjectRoadmapDashboard({ model, autoLoad = true }: ProjectRoadmapDashboardProps) {
  const [activeModel, setActiveModel] = useState<ProjectAnalysisModel | null>(model ?? null);
  const [apiBusy, setApiBusy] = useState(false);
  const [apiMessage, setApiMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [statusFilter, setStatusFilter] = useState<typeof all | RoadmapSignalStatus>(all);
  const [typeFilter, setTypeFilter] = useState<typeof all | RoadmapItemType>(all);
  const [repoFilter, setRepoFilter] = useState(all);
  const [featureFilter, setFeatureFilter] = useState(all);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({
    title: '',
    type: 'feature-candidate' as RoadmapItemType,
    status: 'needs-review' as RoadmapSignalStatus,
    summary: '',
    source: '',
    sourceSection: '',
    phase: '',
    target: '',
    targetReleaseId: '',
    priority: '',
    capabilityId: '',
    disposition: 'new' as FeatureDisposition,
    repositoryId: '',
    featureId: '',
    fileRef: '',
    note: '',
  });

  useEffect(() => {
    if (model) setActiveModel(model);
  }, [model]);

  useEffect(() => {
    if (!autoLoad || model || activeModel) return;
    let cancelled = false;
    setApiBusy(true);
    setApiMessage('Loading private roadmap map...');
    loadProjectAnalysisFromApi()
      .then((loaded) => {
        if (cancelled) return;
        setActiveModel(loaded);
        setApiMessage('Loaded private roadmap map from the local database.');
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Private database is not available yet.');
      })
      .finally(() => {
        if (!cancelled) setApiBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeModel, autoLoad, model]);

  const workingModel = activeModel;
  const roadmapItems = useMemo(() => (workingModel ? collectRoadmapItems(workingModel) : []), [workingModel]);
  const featureById = useMemo(() => new Map((workingModel?.features ?? []).map((feature) => [feature.id, feature])), [workingModel]);
  const repoById = useMemo(() => new Map((workingModel?.repositories ?? []).map((repo) => [repo.id, repo])), [workingModel]);

  const filteredItems = useMemo(() => {
    if (!workingModel) return [];
    return roadmapItems.filter((item) => {
      if (statusFilter !== all && statusKey(item.status) !== statusFilter) return false;
      if (typeFilter !== all && item.type !== typeFilter) return false;
      if (featureFilter !== all && !(item.featureIds ?? []).includes(featureFilter) && item.promotedFeatureId !== featureFilter) return false;
      if (repoFilter !== all && !(item.repositoryIds ?? []).includes(repoFilter)) return false;
      return true;
    });
  }, [featureFilter, repoFilter, roadmapItems, statusFilter, typeFilter, workingModel]);

  const statusCounts = roadmapItems.reduce<Record<RoadmapSignalStatus, number>>((counts, item) => {
    counts[statusKey(item.status)] += 1;
    return counts;
  }, { idea: 0, concept: 0, planned: 0, mvp: 0, active: 0, 'in-progress': 0, built: 0, shipped: 0, 'needs-review': 0, deferred: 0, cut: 0 });

  const linkedCount = workingModel ? roadmapItems.filter((item) => hasLinkedFeature(item, workingModel)).length : 0;
  const mappedFileCount = roadmapItems.reduce((count, item) => count + (item.fileRefs?.length ?? 0), 0);
  const sourceCount = new Set(roadmapItems.map((item) => item.source).filter(Boolean)).size;

  const handleLoadPrivateDb = async () => {
    setApiBusy(true);
    setApiMessage('Loading private roadmap map...');
    try {
      setActiveModel(await loadProjectAnalysisFromApi());
      setApiMessage('Loaded private roadmap map from the local database.');
      setImportError('');
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Unable to load from the local database.');
    } finally {
      setApiBusy(false);
    }
  };

  const handleSavePrivateDb = async () => {
    if (!workingModel) return;
    setApiBusy(true);
    setApiMessage('Saving private roadmap map...');
    try {
      await saveProjectAnalysisToApi(workingModel);
      setApiMessage('Saved private roadmap map to the local database.');
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Unable to save to the local database.');
    } finally {
      setApiBusy(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = projectAnalysisFromJson(JSON.parse(await readLocalJsonFile(file)), file.name);
      setActiveModel(imported);
      setImportError('');
      setApiMessage(`Imported ${file.name}.`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'That file could not be imported.');
    } finally {
      event.target.value = '';
    }
  };

  const addRoadmapItem = () => {
    if (!workingModel || !draft.title.trim() || !draft.summary.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    const item: RoadmapItem = {
      id: makeId('roadmap'),
      title: draft.title.trim(),
      type: draft.type,
      status: draft.status,
      summary: draft.summary.trim(),
      source: draft.source.trim() || 'Manual roadmap entry',
      sourceSection: draft.sourceSection.trim(),
      phase: draft.phase.trim(),
      target: draft.target.trim(),
      targetReleaseId: draft.targetReleaseId,
      priority: draft.priority.trim(),
      capabilityId: draft.capabilityId,
      disposition: draft.disposition,
      repositoryIds: draft.repositoryId ? [draft.repositoryId] : [],
      featureIds: draft.featureId ? [draft.featureId] : [],
      fileRefs: draft.fileRef.trim() ? [draft.fileRef.trim()] : [],
      createdAt: now,
      updatedAt: now,
      notes: draft.note.trim() ? [draft.note.trim()] : [],
    };
    setActiveModel({ ...workingModel, roadmapItems: [item, ...(workingModel.roadmapItems ?? [])] });
    setDraft({ ...draft, title: '', summary: '', sourceSection: '', fileRef: '', note: '' });
  };

  const promoteRoadmapItem = (item: DashboardRoadmapItem) => {
    if (!workingModel) return;
    const linkedFeatureId = item.promotedFeatureId || item.featureIds?.find((featureId) => featureById.has(featureId));
    const feature = linkedFeatureId ? featureById.get(linkedFeatureId) : featureFromRoadmapItem(item, workingModel);
    if (!feature) return;

    const nextFeatureIds = new Set([...(item.featureIds ?? []), feature.id]);
    const nextRoadmapItem: RoadmapItem = {
      ...item,
      id: item.derivedFrom === 'roadmap-item' ? item.id : makeId('roadmap'),
      status: 'active',
      featureIds: Array.from(nextFeatureIds),
      repositoryIds: item.repositoryIds ?? feature.repositoryIds,
      capabilityId: item.capabilityId || feature.capabilityId,
      targetReleaseId: item.targetReleaseId || feature.releaseId,
      promotedFeatureId: feature.id,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    const featureExists = workingModel.features.some((existing) => existing.id === feature.id);
    const nextFeatures = featureExists
      ? workingModel.features.map((existing) => existing.id === feature.id
        ? {
          ...existing,
          disposition: existing.disposition === 'defer' ? 'new' : existing.disposition,
          roadmapSignals: [
            ...(existing.roadmapSignals ?? []),
            { source: item.source, status: 'active', summary: item.summary, phase: item.phase || item.sourceSection, target: item.target },
          ],
        }
        : existing)
      : [feature, ...workingModel.features];

    const existingRoadmapIndex = (workingModel.roadmapItems ?? []).findIndex((existing) => existing.id === item.id);
    const nextRoadmapItems = existingRoadmapIndex >= 0
      ? (workingModel.roadmapItems ?? []).map((existing) => existing.id === item.id ? nextRoadmapItem : existing)
      : [nextRoadmapItem, ...(workingModel.roadmapItems ?? [])];

    setActiveModel({ ...workingModel, features: nextFeatures, roadmapItems: nextRoadmapItems });
  };

  if (!workingModel) {
    return (
      <div className="analysis-page analysis-page--empty">
        <section className="analysis-empty-loader">
          <MapIcon size={42} />
          <h1>Load the roadmap dashboard</h1>
          <p>Use the local private database or import a project-analysis JSON map. Roadmap docs stay local while the public app only provides the generic dashboard.</p>
          <div className="analysis-actions">
            <button className="analysis-card-toggle" type="button" onClick={handleLoadPrivateDb} disabled={apiBusy}>
              <Database size={16} />
              Load private DB
            </button>
            <button className="analysis-card-toggle" type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              Import JSON
            </button>
            <button className="analysis-card-toggle" type="button" onClick={() => setActiveModel(sampleProjectAnalysis)}>
              <FileJson size={16} />
              Load sample
            </button>
          </div>
          <input ref={fileInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} aria-label="Import roadmap project-analysis JSON" />
          {apiMessage && <p className="analysis-import-status">{apiMessage}</p>}
          {importError && <p className="analysis-import-error">{importError}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="analysis-page analysis-qa-dashboard">
      <header className="analysis-header">
        <div>
          <button className="analysis-back-link" type="button" onClick={() => navigate({ page: 'analysis' })}>
            <ArrowLeft size={15} />
            Project Analyzer
          </button>
          <span className="analysis-kicker">Roadmap Dashboard</span>
          <h1>{workingModel.projectName}</h1>
          <p>{workingModel.scopePurpose || 'Review roadmap docs as intake, promote the right items to active features, then map repositories, files, and QA.'}</p>
          {workingModel.privacyBoundary && <p className="analysis-privacy-note">{workingModel.privacyBoundary}</p>}
        </div>
        <div className="analysis-summary-grid">
          <div className="analysis-summary-card">
            <MapIcon size={18} />
            <strong>{roadmapItems.length}</strong>
            <span>Roadmap items</span>
          </div>
          <div className="analysis-summary-card">
            <Rocket size={18} />
            <strong>{statusCounts.mvp + statusCounts.active + statusCounts['in-progress']}</strong>
            <span>Near term</span>
          </div>
          <div className="analysis-summary-card">
            <Network size={18} />
            <strong>{linkedCount}</strong>
            <span>Linked features</span>
          </div>
          <div className="analysis-summary-card">
            <FolderTree size={18} />
            <strong>{mappedFileCount}</strong>
            <span>Mapped files</span>
          </div>
          <div className="analysis-summary-card">
            <FileJson size={18} />
            <strong>{sourceCount}</strong>
            <span>Sources</span>
          </div>
          <div className="analysis-summary-card">
            <Milestone size={18} />
            <strong>{statusCounts['needs-review']}</strong>
            <span>Needs review</span>
          </div>
        </div>
      </header>

      <section className="analysis-toolbar" aria-label="Roadmap dashboard controls">
        <div className="analysis-tabs" role="tablist" aria-label="Roadmap status filters">
          {roadmapStatusOrder.map((status) => (
            <button
              key={status}
              className={`analysis-tab ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? all : status)}
              type="button"
              role="tab"
              aria-selected={statusFilter === status}
            >
              <span className="analysis-dot" style={{ background: roadmapStatusColor(status) }} />
              {roadmapStatusLabel(status)}
            </button>
          ))}
        </div>
        <div className="analysis-actions">
          <button className="analysis-card-toggle" type="button" onClick={handleLoadPrivateDb} disabled={apiBusy}>
            <Database size={16} />
            Load DB
          </button>
          <button className="analysis-card-toggle" type="button" onClick={handleSavePrivateDb} disabled={apiBusy}>
            <Save size={16} />
            Save DB
          </button>
          <button className="analysis-card-toggle" type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            Import
          </button>
          <button className="analysis-card-toggle" type="button" onClick={() => downloadProjectAnalysis(workingModel)}>
            <Download size={16} />
            Export
          </button>
        </div>
      </section>

      <input ref={fileInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} aria-label="Import roadmap project-analysis JSON" />
      {(apiMessage || importError) && (
        <div className="analysis-inline-status">
          {apiMessage && <span>{apiMessage}</span>}
          {importError && <span className="analysis-import-error">{importError}</span>}
        </div>
      )}

      <main className="analysis-qa-layout analysis-qa-dashboard-layout" aria-label="Roadmap tracking dashboard">
        <section className="analysis-qa-main">
          <section className="analysis-qa-filters" aria-label="Roadmap filters">
            <ListFilter size={16} />
            <select aria-label="Roadmap type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof all | RoadmapItemType)}>
              <option value={all}>All roadmap types</option>
              {roadmapTypeOrder.map((type) => <option key={type} value={type}>{type.replace(/-/g, ' ')}</option>)}
            </select>
            <select aria-label="Roadmap repository" value={repoFilter} onChange={(event) => setRepoFilter(event.target.value)}>
              <option value={all}>All repositories</option>
              {workingModel.repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.name}</option>)}
            </select>
            <select aria-label="Roadmap feature" value={featureFilter} onChange={(event) => setFeatureFilter(event.target.value)}>
              <option value={all}>All features</option>
              {workingModel.features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
            </select>
          </section>

          <section className="analysis-qa-list analysis-qa-masonry" aria-label="Roadmap item list">
            {filteredItems.length === 0 ? (
              <div className="analysis-empty-state">No roadmap items match the current filters.</div>
            ) : filteredItems.map((item) => {
              const linked = hasLinkedFeature(item, workingModel);
              return (
                <article key={`${item.derivedFrom}-${item.id}`} className="analysis-qa-card">
                  <header>
                    <div>
                      <span className="analysis-file-status" style={{ borderColor: roadmapStatusColor(item.status), color: roadmapStatusColor(item.status) }}>
                        {roadmapStatusLabel(item.status)}
                      </span>
                      <span className="analysis-qa-type">{item.type.replace(/-/g, ' ')} · {item.priority || item.derivedFrom}</span>
                    </div>
                    {linked && <time>Feature linked</time>}
                  </header>
                  <h2>{item.title}</h2>
                  <p>{item.summary}</p>
                  <div className="analysis-qa-meta-grid">
                    {item.phase && <span><strong>Phase</strong>{item.phase}</span>}
                    {item.target && <span><strong>Target</strong>{item.target}</span>}
                    {item.targetReleaseId && <span><strong>Release</strong>{item.targetReleaseId}</span>}
                    {item.disposition && <span><strong>Action</strong>{dispositionLabels[item.disposition]}</span>}
                  </div>
                  <div className="analysis-attachment-row">
                    {(item.repositoryIds ?? []).map((repoId) => <span key={repoId}><GitBranch size={13} /> {repoById.get(repoId)?.name ?? repoId}</span>)}
                    {(item.featureIds ?? []).map((featureId) => <span key={featureId}><Network size={13} /> {featureById.get(featureId)?.name ?? featureId}</span>)}
                  </div>
                  {(item.fileRefs?.length ?? 0) > 0 && (
                    <div className="analysis-file-group">
                      <h3>Mapped files</h3>
                      <ul>
                        {item.fileRefs?.map((file) => (
                          <li key={file}>
                            <code>{file}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="analysis-qa-source-row">
                    <span><FileJson size={13} /> {item.source}</span>
                    {item.sourceSection && <span>{item.sourceSection}</span>}
                  </div>
                  {(item.notes?.length ?? 0) > 0 && (
                    <ul className="analysis-note-list">
                      {item.notes?.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  )}
                  <button className="analysis-card-toggle" type="button" onClick={() => promoteRoadmapItem(item)}>
                    <Rocket size={15} />
                    {linked ? 'Mark Active' : 'Promote to Feature'}
                  </button>
                </article>
              );
            })}
          </section>
        </section>

        <aside className="analysis-qa-sidebar">
          <section className="analysis-qa-composer">
            <h2>Add Roadmap Item</h2>
            <label>
              <span>Title</span>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Status</span>
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as RoadmapSignalStatus })}>
                  {roadmapStatusOrder.map((status) => <option key={status} value={status}>{roadmapStatusLabel(status)}</option>)}
                </select>
              </label>
              <label>
                <span>Type</span>
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as RoadmapItemType })}>
                  {roadmapTypeOrder.map((type) => <option key={type} value={type}>{type.replace(/-/g, ' ')}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>Summary</span>
              <textarea rows={3} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
            </label>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Source doc</span>
                <input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} />
              </label>
              <label>
                <span>Source section</span>
                <input value={draft.sourceSection} onChange={(event) => setDraft({ ...draft, sourceSection: event.target.value })} />
              </label>
            </div>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Phase</span>
                <input value={draft.phase} onChange={(event) => setDraft({ ...draft, phase: event.target.value })} />
              </label>
              <label>
                <span>Target</span>
                <input value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} />
              </label>
            </div>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Capability</span>
                <select value={draft.capabilityId} onChange={(event) => setDraft({ ...draft, capabilityId: event.target.value })}>
                  <option value="">Choose capability</option>
                  {workingModel.capabilities.map((capability) => <option key={capability.id} value={capability.id}>{capability.name}</option>)}
                </select>
              </label>
              <label>
                <span>Release</span>
                <select value={draft.targetReleaseId} onChange={(event) => setDraft({ ...draft, targetReleaseId: event.target.value })}>
                  <option value="">Choose release</option>
                  {workingModel.releases.map((release) => <option key={release.id} value={release.id}>{release.name}</option>)}
                </select>
              </label>
            </div>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Repository</span>
                <select value={draft.repositoryId} onChange={(event) => setDraft({ ...draft, repositoryId: event.target.value })}>
                  <option value="">Choose repository</option>
                  {workingModel.repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.name}</option>)}
                </select>
              </label>
              <label>
                <span>Feature</span>
                <select value={draft.featureId} onChange={(event) => setDraft({ ...draft, featureId: event.target.value })}>
                  <option value="">Optional linked feature</option>
                  {workingModel.features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>Mapped file</span>
              <input value={draft.fileRef} onChange={(event) => setDraft({ ...draft, fileRef: event.target.value })} />
            </label>
            <label>
              <span>Note</span>
              <textarea rows={3} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
            </label>
            <button className="analysis-card-toggle" type="button" onClick={addRoadmapItem} disabled={!draft.title.trim() || !draft.summary.trim()}>
              <Plus size={15} />
              Add roadmap item
            </button>
          </section>
        </aside>
      </main>
    </div>
  );
}
