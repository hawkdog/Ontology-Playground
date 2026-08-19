import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  ClipboardCheck,
  Database,
  Download,
  FileImage,
  FileJson,
  FileText,
  ImagePlus,
  ListFilter,
  Network,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Star,
  Upload,
  X,
} from 'lucide-react';
import {
  projectAnalysisFromJson,
  qaPriorityLabels,
  qaStatusColors,
  qaStatusLabels,
  qaTypeLabels,
  sampleProjectAnalysis,
  type ProductFeature,
  type ProjectAnalysisModel,
  type QAItem,
  type QAItemPriority,
  type QAItemStatus,
  type QAItemType,
  type QAAttachment,
} from '../data/projectAnalysis';
import { navigate } from '../lib/router';
import { loadProjectAnalysisFromApi, saveProjectAnalysisToApi } from '../lib/projectAnalysisApi';

interface ProjectQADashboardProps {
  model?: ProjectAnalysisModel;
  autoLoad?: boolean;
}

type QueueView = 'active' | 'blockers' | 'mvp' | 'stripe' | 'future' | 'all';

const all = 'all';
const qaStatusOrder: QAItemStatus[] = ['failed', 'blocked', 'needs-retest', 'partial', 'in-progress', 'ready', 'not-started', 'passed', 'deferred', 'future'];
const qaTypeOrder: QAItemType[] = ['task', 'manual-test', 'automated-test', 'bug', 'note', 'decision', 'evidence'];
const qaPriorityOrder: QAItemPriority[] = ['critical', 'high', 'medium', 'low', 'support', 'conditional', 'future'];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function readLocalJsonFile(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

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
  link.download = `${model.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project'}-qa-map.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function yesFlag(value?: string): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'y', 'blocked', 'blocker'].includes(value.trim().toLowerCase());
}

function isOpenQA(item: QAItem): boolean {
  return !['passed', 'deferred', 'future'].includes(item.status);
}

function itemFeatureNames(item: QAItem, featureById: Map<string, ProductFeature>): string[] {
  return item.featureIds.map((featureId) => featureById.get(featureId)?.name ?? featureId);
}

function inferAttachmentType(path: string): 'screenshot' | 'document' | 'link' {
  if (/^https?:\/\//i.test(path)) return 'link';
  if (/\.(png|jpe?g|gif|webp)$/i.test(path)) return 'screenshot';
  return 'document';
}

function toDateTimeInputValue(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return toDateTimeInputValue();
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeInputValue(value: string): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatProgressDate(value?: string): string {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function readImageAsAttachment(file: File): Promise<QAAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: makeId('image'),
      label: file.name,
      type: 'screenshot',
      url: typeof reader.result === 'string' ? reader.result : undefined,
      description: 'Uploaded from the QA edit dialog.',
    });
    reader.onerror = () => reject(new Error('Unable to read that image file.'));
    reader.readAsDataURL(file);
  });
}

type QAEditDraft = {
  title: string;
  status: QAItemStatus;
  priority: QAItemPriority;
  type: QAItemType;
  summary: string;
  result: string;
  actualResult: string;
  nextAction: string;
  blocking: string;
  mvpBlocker: string;
  stripeBlocker: string;
  automationCoverage: string;
  isCurrent: boolean;
  progressDate: string;
  progressNote: string;
  imageRef: string;
  pendingImages: QAAttachment[];
};

function qaEditDraftFromItem(item: QAItem): QAEditDraft {
  return {
    title: item.title,
    status: item.status,
    priority: item.priority,
    type: item.type,
    summary: item.summary,
    result: item.result ?? '',
    actualResult: item.actualResult ?? '',
    nextAction: item.nextAction ?? '',
    blocking: item.blocking ?? '',
    mvpBlocker: item.mvpBlocker ?? '',
    stripeBlocker: item.stripeBlocker ?? '',
    automationCoverage: item.automationCoverage ?? '',
    isCurrent: Boolean(item.isCurrent),
    progressDate: toDateTimeInputValue(),
    progressNote: '',
    imageRef: '',
    pendingImages: [],
  };
}

export function ProjectQADashboard({ model, autoLoad = true }: ProjectQADashboardProps) {
  const [activeModel, setActiveModel] = useState<ProjectAnalysisModel | null>(model ?? null);
  const [apiBusy, setApiBusy] = useState(false);
  const [apiMessage, setApiMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [queueView, setQueueView] = useState<QueueView>('active');
  const [statusFilter, setStatusFilter] = useState<typeof all | QAItemStatus>(all);
  const [typeFilter, setTypeFilter] = useState<typeof all | QAItemType>(all);
  const [featureFilter, setFeatureFilter] = useState(all);
  const [repoFilter, setRepoFilter] = useState(all);
  const [selectedQAItemId, setSelectedQAItemId] = useState<string | null>(null);
  const [qaEditDraft, setQAEditDraft] = useState<QAEditDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressImageInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({
    featureId: '',
    title: '',
    testId: '',
    track: '',
    area: '',
    modeTier: '',
    status: 'not-started' as QAItemStatus,
    priority: 'medium' as QAItemPriority,
    type: 'task' as QAItemType,
    result: '',
    nextAction: '',
    fileRef: '',
    evidencePath: '',
    summary: '',
    note: '',
    blocking: '',
    mvpBlocker: '',
    stripeBlocker: '',
    automationCoverage: '',
    sourceDoc: '',
    sourceSection: '',
  });

  useEffect(() => {
    if (model) setActiveModel(model);
  }, [model]);

  useEffect(() => {
    if (!autoLoad || model || activeModel) return;

    let cancelled = false;
    setApiBusy(true);
    setApiMessage('Loading private QA map...');
    loadProjectAnalysisFromApi()
      .then((loaded) => {
        if (cancelled) return;
        setActiveModel(loaded);
        setApiMessage('Loaded private QA map from the local database.');
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

  const featureById = useMemo(() => new Map((workingModel?.features ?? []).map((feature) => [feature.id, feature])), [workingModel]);
  const repoById = useMemo(() => new Map((workingModel?.repositories ?? []).map((repo) => [repo.id, repo])), [workingModel]);
  const qaItems = useMemo(() => workingModel?.qaItems ?? [], [workingModel]);
  const selectedQAItem = selectedQAItemId ? qaItems.find((item) => item.id === selectedQAItemId) : undefined;

  const sourceDocs = useMemo(() => {
    const docs = new Set<string>();
    for (const source of workingModel?.roadmapSources ?? []) docs.add(source.source);
    for (const feature of workingModel?.features ?? []) {
      for (const signal of feature.roadmapSignals ?? []) docs.add(signal.source);
    }
    for (const item of qaItems) {
      if (item.sourceDoc) docs.add(item.sourceDoc);
    }
    return Array.from(docs).filter(Boolean).sort();
  }, [qaItems, workingModel]);

  const filteredQAItems = useMemo(() => {
    return qaItems.filter((item) => {
      const itemRepos = new Set([
        ...(item.repositoryIds ?? []),
        ...item.featureIds.flatMap((featureId) => featureById.get(featureId)?.repositoryIds ?? []),
      ]);

      if (statusFilter !== all && item.status !== statusFilter) return false;
      if (typeFilter !== all && item.type !== typeFilter) return false;
      if (featureFilter !== all && !item.featureIds.includes(featureFilter)) return false;
      if (repoFilter !== all && !itemRepos.has(repoFilter)) return false;

      if (queueView === 'active' && !isOpenQA(item)) return false;
      if (queueView === 'blockers' && item.status !== 'blocked' && item.status !== 'failed' && !yesFlag(item.blocking)) return false;
      if (queueView === 'mvp' && !yesFlag(item.mvpBlocker)) return false;
      if (queueView === 'stripe' && !yesFlag(item.stripeBlocker)) return false;
      if (queueView === 'future' && item.status !== 'future' && item.priority !== 'future' && item.track?.toLowerCase() !== 'future roadmap tests') return false;

      return true;
    });
  }, [featureById, featureFilter, qaItems, queueView, repoFilter, statusFilter, typeFilter]);

  const qaCounts = qaItems.reduce<Record<QAItemStatus, number>>((counts, item) => {
    counts[item.status] += 1;
    return counts;
  }, { 'not-started': 0, ready: 0, 'in-progress': 0, partial: 0, 'needs-retest': 0, blocked: 0, failed: 0, passed: 0, deferred: 0, future: 0 });

  const totalEvidence = qaItems.reduce((count, item) => count + (item.attachments?.length ?? 0), 0);
  const totalFileRefs = qaItems.reduce((count, item) => count + (item.fileRefs?.length ?? 0), 0);
  const blockerCount = qaItems.filter((item) => item.status === 'blocked' || item.status === 'failed' || yesFlag(item.blocking)).length;
  const mvpBlockerCount = qaItems.filter((item) => yesFlag(item.mvpBlocker)).length;
  const stripeBlockerCount = qaItems.filter((item) => yesFlag(item.stripeBlocker)).length;
  const automatedCount = qaItems.filter((item) => item.automationCoverage && !['none', 'no'].includes(item.automationCoverage.toLowerCase())).length;
  const currentItemCount = qaItems.filter((item) => item.isCurrent).length;

  const updateQAItems = (updater: (items: QAItem[]) => QAItem[]) => {
    if (!workingModel) return;
    setActiveModel({ ...workingModel, qaItems: updater(workingModel.qaItems ?? []) });
  };

  const openQAEditor = (item: QAItem) => {
    setSelectedQAItemId(item.id);
    setQAEditDraft(qaEditDraftFromItem(item));
  };

  const closeQAEditor = () => {
    setSelectedQAItemId(null);
    setQAEditDraft(null);
  };

  const saveQAEditor = () => {
    if (!selectedQAItem || !qaEditDraft) return;
    const now = new Date().toISOString();
    updateQAItems((items) => items.map((item) => {
      if (item.id !== selectedQAItem.id) {
        return qaEditDraft.isCurrent ? { ...item, isCurrent: false } : item;
      }

      return {
        ...item,
        title: qaEditDraft.title.trim() || item.title,
        status: qaEditDraft.status,
        priority: qaEditDraft.priority,
        type: qaEditDraft.type,
        summary: qaEditDraft.summary.trim(),
        result: qaEditDraft.result.trim(),
        actualResult: qaEditDraft.actualResult.trim(),
        nextAction: qaEditDraft.nextAction.trim(),
        blocking: qaEditDraft.blocking.trim(),
        mvpBlocker: qaEditDraft.mvpBlocker.trim(),
        stripeBlocker: qaEditDraft.stripeBlocker.trim(),
        automationCoverage: qaEditDraft.automationCoverage.trim(),
        isCurrent: qaEditDraft.isCurrent,
        updatedAt: now,
        lastTested: now,
      };
    }));
    setApiMessage('Updated QA item in the local map. Use Save DB to persist it.');
  };

  const setCurrentQAItem = (itemId: string, current: boolean) => {
    updateQAItems((items) => items.map((item) => ({ ...item, isCurrent: current ? item.id === itemId : item.id === itemId ? false : item.isCurrent })));
    if (selectedQAItemId === itemId && qaEditDraft) {
      setQAEditDraft({ ...qaEditDraft, isCurrent: current });
    }
  };

  const addProgressImageRef = () => {
    if (!qaEditDraft || !qaEditDraft.imageRef.trim()) return;
    const ref = qaEditDraft.imageRef.trim();
    setQAEditDraft({
      ...qaEditDraft,
      imageRef: '',
      pendingImages: [
        ...qaEditDraft.pendingImages,
        {
          id: makeId('image'),
          label: ref.split(/[\\/]/).pop() || ref,
          type: inferAttachmentType(ref) === 'link' ? 'link' : 'screenshot',
          path: /^https?:\/\//i.test(ref) ? undefined : ref,
          url: /^https?:\/\//i.test(ref) ? ref : undefined,
        },
      ],
    });
  };

  const handleProgressImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !qaEditDraft) return;

    try {
      const attachment = await readImageAsAttachment(file);
      setQAEditDraft({ ...qaEditDraft, pendingImages: [...qaEditDraft.pendingImages, attachment] });
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Unable to attach that image.');
    } finally {
      event.target.value = '';
    }
  };

  const addQAProgressEntry = () => {
    if (!selectedQAItem || !qaEditDraft) return;
    const body = qaEditDraft.progressNote.trim();
    if (!body && qaEditDraft.pendingImages.length === 0) return;
    const createdAt = fromDateTimeInputValue(qaEditDraft.progressDate);
    const entry = {
      id: makeId('progress'),
      createdAt,
      body: body || 'Image evidence added.',
      status: qaEditDraft.status,
      images: qaEditDraft.pendingImages,
    };
    updateQAItems((items) => items.map((item) => item.id === selectedQAItem.id
      ? {
        ...item,
        status: qaEditDraft.status,
        updatedAt: createdAt,
        lastTested: createdAt,
        progressLog: [entry, ...(item.progressLog ?? [])],
        attachments: [...(qaEditDraft.pendingImages.length > 0 ? qaEditDraft.pendingImages : []), ...(item.attachments ?? [])],
      }
      : item));
    setQAEditDraft({
      ...qaEditDraft,
      progressDate: toDateTimeInputValue(),
      progressNote: '',
      imageRef: '',
      pendingImages: [],
    });
    setApiMessage('Added QA progress entry. Use Save DB to persist it.');
  };

  const handleLoadPrivateDb = async () => {
    setApiBusy(true);
    setApiMessage('Loading private QA map...');
    try {
      setActiveModel(await loadProjectAnalysisFromApi());
      setApiMessage('Loaded private QA map from the local database.');
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
    setApiMessage('Saving private QA map...');
    try {
      await saveProjectAnalysisToApi(workingModel);
      setApiMessage('Saved private QA map to the local database.');
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

  const addQAItem = () => {
    if (!workingModel || !draft.title.trim()) return;
    const feature = featureById.get(draft.featureId);
    const fileRefs = draft.fileRef.trim() ? [draft.fileRef.trim()] : [];
    const evidencePath = draft.evidencePath.trim();
    const noteBody = draft.note.trim();
    const now = new Date().toISOString().slice(0, 10);

    const newItem: QAItem = {
      id: makeId('qa'),
      testId: draft.testId.trim(),
      title: draft.title.trim(),
      type: draft.type,
      status: draft.status,
      priority: draft.priority,
      summary: draft.summary.trim() || draft.nextAction.trim() || draft.result.trim(),
      featureIds: draft.featureId ? [draft.featureId] : [],
      repositoryIds: feature?.repositoryIds ?? [],
      fileRefs,
      track: draft.track.trim(),
      area: draft.area.trim(),
      modeTier: draft.modeTier.trim(),
      result: draft.result.trim(),
      nextAction: draft.nextAction.trim(),
      blocking: draft.blocking.trim(),
      mvpBlocker: draft.mvpBlocker.trim(),
      stripeBlocker: draft.stripeBlocker.trim(),
      automationCoverage: draft.automationCoverage.trim(),
      sourceDoc: draft.sourceDoc.trim(),
      sourceSection: draft.sourceSection.trim(),
      createdAt: now,
      updatedAt: now,
      notes: noteBody ? [{ id: makeId('note'), body: noteBody, createdAt: now }] : [],
      attachments: evidencePath
        ? [{
          id: makeId('evidence'),
          label: evidencePath.split(/[\\/]/).pop() || evidencePath,
          type: inferAttachmentType(evidencePath),
          path: /^https?:\/\//i.test(evidencePath) ? undefined : evidencePath,
          url: /^https?:\/\//i.test(evidencePath) ? evidencePath : undefined,
        }]
        : [],
    };

    setActiveModel({
      ...workingModel,
      qaItems: [newItem, ...(workingModel.qaItems ?? [])],
    });
    setDraft({
      ...draft,
      title: '',
      testId: '',
      result: '',
      nextAction: '',
      fileRef: '',
      evidencePath: '',
      summary: '',
      note: '',
      blocking: '',
      mvpBlocker: '',
      stripeBlocker: '',
    });
  };

  if (!workingModel) {
    return (
      <div className="analysis-page analysis-page--empty">
        <section className="analysis-empty-loader">
          <ClipboardCheck size={42} />
          <h1>Load the QA dashboard</h1>
          <p>Use the local private database or import a project-analysis JSON map. The public app stays generic; private app and plugin details stay in your local data.</p>
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
            <button className="analysis-card-toggle" type="button" onClick={() => navigate({ page: 'analysis' })}>
              <Network size={16} />
              Project Analyzer
            </button>
          </div>
          <input ref={fileInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} aria-label="Import QA project-analysis JSON" />
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
          <span className="analysis-kicker">QA Dashboard</span>
          <h1>{workingModel.projectName}</h1>
          <p>{workingModel.scopePurpose || 'Track QA tasks, testing notes, screenshots, roadmap coverage, features, and mapped files in one local project map.'}</p>
          {workingModel.privacyBoundary && <p className="analysis-privacy-note">{workingModel.privacyBoundary}</p>}
        </div>
        <div className="analysis-summary-grid">
          <div className="analysis-summary-card">
            <ClipboardCheck size={18} />
            <strong>{qaItems.length}</strong>
            <span>QA items</span>
          </div>
          <div className="analysis-summary-card">
            <Bug size={18} />
            <strong>{qaItems.filter(isOpenQA).length}</strong>
            <span>Open</span>
          </div>
          <div className="analysis-summary-card">
            <Star size={18} />
            <strong>{currentItemCount}</strong>
            <span>Current</span>
          </div>
          <div className="analysis-summary-card">
            <ShieldAlert size={18} />
            <strong>{blockerCount}</strong>
            <span>Blockers</span>
          </div>
          <div className="analysis-summary-card">
            <AlertTriangle size={18} />
            <strong>{mvpBlockerCount}</strong>
            <span>MVP blockers</span>
          </div>
          <div className="analysis-summary-card">
            <ShieldAlert size={18} />
            <strong>{stripeBlockerCount}</strong>
            <span>Stripe blockers</span>
          </div>
          <div className="analysis-summary-card">
            <Database size={18} />
            <strong>{automatedCount}</strong>
            <span>Automated</span>
          </div>
          <div className="analysis-summary-card">
            <FileImage size={18} />
            <strong>{totalEvidence}</strong>
            <span>Evidence</span>
          </div>
        </div>
      </header>

      <section className="analysis-toolbar" aria-label="QA dashboard controls">
        <div className="analysis-tabs" role="tablist" aria-label="QA views">
          {([
            ['active', 'Active'],
            ['blockers', 'Blockers'],
            ['mvp', 'MVP'],
            ['stripe', 'Stripe'],
            ['future', 'Future'],
            ['all', 'All'],
          ] as const).map(([candidate, label]) => (
            <button
              key={candidate}
              className={`analysis-tab ${queueView === candidate ? 'active' : ''}`}
              onClick={() => setQueueView(candidate)}
              type="button"
              role="tab"
              aria-selected={queueView === candidate}
            >
              {candidate === 'blockers' ? <ShieldAlert size={16} /> : <ClipboardCheck size={16} />}
              {label}
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

      <input ref={fileInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} aria-label="Import QA project-analysis JSON" />
      {(apiMessage || importError) && (
        <div className="analysis-inline-status">
          {apiMessage && <span>{apiMessage}</span>}
          {importError && <span className="analysis-import-error">{importError}</span>}
        </div>
      )}

      <main className="analysis-qa-layout analysis-qa-dashboard-layout" aria-label="QA tracking dashboard">
        <section className="analysis-qa-main">
          <section className="analysis-status-strip" aria-label="QA status counts">
            {qaStatusOrder.map((status) => (
              <button
                key={status}
                type="button"
                className={statusFilter === status ? 'active' : ''}
                style={{ borderColor: qaStatusColors[status] }}
                onClick={() => setStatusFilter(statusFilter === status ? all : status)}
              >
                <strong>{qaCounts[status]}</strong>
                {qaStatusLabels[status]}
              </button>
            ))}
            <span><strong>{totalFileRefs}</strong> mapped files</span>
          </section>

          <section className="analysis-qa-filters" aria-label="QA filters">
            <ListFilter size={16} />
            <select aria-label="QA status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof all | QAItemStatus)}>
              <option value={all}>All statuses</option>
              {qaStatusOrder.map((status) => <option key={status} value={status}>{qaStatusLabels[status]}</option>)}
            </select>
            <select aria-label="QA type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof all | QAItemType)}>
              <option value={all}>All QA types</option>
              {qaTypeOrder.map((type) => <option key={type} value={type}>{qaTypeLabels[type]}</option>)}
            </select>
            <select aria-label="QA repository" value={repoFilter} onChange={(event) => setRepoFilter(event.target.value)}>
              <option value={all}>All repositories</option>
              {workingModel.repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.name}</option>)}
            </select>
            <select aria-label="QA feature" value={featureFilter} onChange={(event) => setFeatureFilter(event.target.value)}>
              <option value={all}>All features</option>
              {workingModel.features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
            </select>
          </section>

          <section className="analysis-qa-list analysis-qa-masonry" aria-label="QA item list">
            {filteredQAItems.length === 0 ? (
              <div className="analysis-empty-state">No QA items match the current filters.</div>
            ) : filteredQAItems.map((item) => (
              <article key={item.id} className={`analysis-qa-card ${item.isCurrent ? 'analysis-qa-card--current' : ''}`}>
                <header>
                  <div>
                    {item.isCurrent && <span className="analysis-current-pill"><Star size={12} /> Current</span>}
                    <span className="analysis-file-status" style={{ borderColor: qaStatusColors[item.status], color: qaStatusColors[item.status] }}>
                      {item.rawStatus || qaStatusLabels[item.status]}
                    </span>
                    <span className="analysis-qa-type">{qaTypeLabels[item.type]} · {item.rawPriority || qaPriorityLabels[item.priority]}</span>
                  </div>
                  {(item.testId || item.lastTested) && <time>{item.testId || item.lastTested}</time>}
                </header>
                <h2>{item.title}</h2>
                {item.summary && <p>{item.summary}</p>}
                {(item.track || item.area || item.modeTier || item.result) && (
                  <div className="analysis-qa-meta-grid">
                    {item.track && <span><strong>Track</strong>{item.track}</span>}
                    {item.area && <span><strong>Area</strong>{item.area}</span>}
                    {item.modeTier && <span><strong>Mode / Tier</strong>{item.modeTier}</span>}
                    {item.result && <span><strong>Result</strong>{item.result}</span>}
                  </div>
                )}
                {item.nextAction && (
                  <div className="analysis-qa-next-action">
                    <strong>Next action</strong>
                    <span>{item.nextAction}</span>
                  </div>
                )}
                {(yesFlag(item.blocking) || yesFlag(item.mvpBlocker) || yesFlag(item.stripeBlocker) || item.automationCoverage) && (
                  <div className="analysis-attachment-row">
                    {yesFlag(item.blocking) && <span><ShieldAlert size={13} /> Blocking</span>}
                    {yesFlag(item.mvpBlocker) && <span><AlertTriangle size={13} /> MVP blocker</span>}
                    {yesFlag(item.stripeBlocker) && <span><AlertTriangle size={13} /> Stripe blocker</span>}
                    {item.automationCoverage && <span><Database size={13} /> {item.automationCoverage}</span>}
                  </div>
                )}
                {item.actualResult && (
                  <div className="analysis-qa-next-action">
                    <strong>Actual result</strong>
                    <span>{item.actualResult}</span>
                  </div>
                )}
                <div className="analysis-attachment-row">
                  {itemFeatureNames(item, featureById).map((name) => <span key={name}><Network size={13} /> {name}</span>)}
                  {(item.repositoryIds ?? []).map((repoId) => <span key={repoId}>{repoById.get(repoId)?.name ?? repoId}</span>)}
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
                {(item.attachments?.length ?? 0) > 0 && (
                  <div className="analysis-attachment-row">
                    {item.attachments?.map((attachment) => (
                      <span key={attachment.id}><FileImage size={13} /> {attachment.label}</span>
                    ))}
                  </div>
                )}
                {(item.progressLog?.length ?? 0) > 0 && (
                  <div className="analysis-qa-next-action">
                    <strong>Latest progress</strong>
                    <span>{formatProgressDate(item.progressLog?.[0]?.createdAt)} · {item.progressLog?.[0]?.body}</span>
                  </div>
                )}
                {(item.sourceDoc || item.sourceSection || item.issueLink) && (
                  <div className="analysis-qa-source-row">
                    {item.sourceDoc && <span><FileText size={13} /> {item.sourceDoc}</span>}
                    {item.sourceSection && <span>{item.sourceSection}</span>}
                    {item.issueLink && <span>{item.issueLink}</span>}
                  </div>
                )}
                {(item.notes?.length ?? 0) > 0 && (
                  <ul className="analysis-note-list">
                    {item.notes?.map((note) => <li key={note.id}>{note.body}</li>)}
                  </ul>
                )}
                <div className="analysis-card-actions">
                  <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={() => openQAEditor(item)} aria-haspopup="dialog">
                    <Pencil size={15} />
                    Edit item
                  </button>
                  <button className="analysis-chip-button" type="button" onClick={() => setCurrentQAItem(item.id, !item.isCurrent)}>
                    <Star size={13} />
                    {item.isCurrent ? 'Clear current' : 'Mark current'}
                  </button>
                </div>
              </article>
            ))}
          </section>
        </section>

        <aside className="analysis-qa-sidebar">
          <section className="analysis-qa-composer">
            <h2>Add QA Item</h2>
            <label>
              <span>Feature</span>
              <select value={draft.featureId} onChange={(event) => setDraft({ ...draft, featureId: event.target.value })}>
                <option value="">Choose feature</option>
                {workingModel.features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
              </select>
            </label>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Test ID</span>
                <input value={draft.testId} onChange={(event) => setDraft({ ...draft, testId: event.target.value })} />
              </label>
              <label>
                <span>Track</span>
                <input value={draft.track} onChange={(event) => setDraft({ ...draft, track: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Title</span>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Status</span>
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as QAItemStatus })}>
                  {qaStatusOrder.map((status) => <option key={status} value={status}>{qaStatusLabels[status]}</option>)}
                </select>
              </label>
              <label>
                <span>Priority</span>
                <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as QAItemPriority })}>
                  {qaPriorityOrder.map((priority) => <option key={priority} value={priority}>{qaPriorityLabels[priority]}</option>)}
                </select>
              </label>
            </div>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Type</span>
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as QAItemType })}>
                  {qaTypeOrder.map((type) => <option key={type} value={type}>{qaTypeLabels[type]}</option>)}
                </select>
              </label>
              <label>
                <span>Mode / Tier</span>
                <input value={draft.modeTier} onChange={(event) => setDraft({ ...draft, modeTier: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Area</span>
              <input value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })} />
            </label>
            <label>
              <span>Result</span>
              <input value={draft.result} onChange={(event) => setDraft({ ...draft, result: event.target.value })} />
            </label>
            <label>
              <span>Next action</span>
              <input value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value })} />
            </label>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>MVP blocker</span>
                <input value={draft.mvpBlocker} onChange={(event) => setDraft({ ...draft, mvpBlocker: event.target.value })} />
              </label>
              <label>
                <span>Stripe blocker</span>
                <input value={draft.stripeBlocker} onChange={(event) => setDraft({ ...draft, stripeBlocker: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Mapped file</span>
              <input value={draft.fileRef} onChange={(event) => setDraft({ ...draft, fileRef: event.target.value })} />
            </label>
            <label>
              <span>Evidence</span>
              <input value={draft.evidencePath} onChange={(event) => setDraft({ ...draft, evidencePath: event.target.value })} />
            </label>
            <label>
              <span>Automation coverage</span>
              <input value={draft.automationCoverage} onChange={(event) => setDraft({ ...draft, automationCoverage: event.target.value })} />
            </label>
            <div className="analysis-qa-composer-grid">
              <label>
                <span>Source doc</span>
                <input value={draft.sourceDoc} onChange={(event) => setDraft({ ...draft, sourceDoc: event.target.value })} />
              </label>
              <label>
                <span>Source section</span>
                <input value={draft.sourceSection} onChange={(event) => setDraft({ ...draft, sourceSection: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Summary</span>
              <textarea rows={3} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
            </label>
            <label>
              <span>Note</span>
              <textarea rows={4} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
            </label>
            <button className="analysis-card-toggle" type="button" onClick={addQAItem} disabled={!draft.title.trim()}>
              <Plus size={15} />
              Add to QA map
            </button>
          </section>

          <section className="analysis-qa-composer analysis-roadmap-context">
            <h2>Roadmap Sources</h2>
            {sourceDocs.length === 0 ? (
              <p>No roadmap sources are linked yet.</p>
            ) : (
              <ul className="analysis-note-list">
                {sourceDocs.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </main>

      {selectedQAItem && qaEditDraft && (
        <div className="analysis-modal-backdrop" role="presentation" onClick={closeQAEditor}>
          <section
            className="analysis-detail-modal analysis-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qa-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="analysis-kicker">QA Item Editor</span>
                <h2 id="qa-edit-title">{selectedQAItem.title}</h2>
                <p>{selectedQAItem.testId || selectedQAItem.id}</p>
              </div>
              <button className="analysis-modal-close" type="button" aria-label="Close QA editor" onClick={closeQAEditor}>
                <X size={18} />
              </button>
            </header>
            <div className="analysis-detail-body analysis-edit-body">
              <section className="analysis-edit-section">
                <h3>Item Details</h3>
                <div className="analysis-edit-grid">
                  <label>
                    <span>Title</span>
                    <input value={qaEditDraft.title} onChange={(event) => setQAEditDraft({ ...qaEditDraft, title: event.target.value })} />
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={qaEditDraft.status} onChange={(event) => setQAEditDraft({ ...qaEditDraft, status: event.target.value as QAItemStatus })}>
                      {qaStatusOrder.map((status) => <option key={status} value={status}>{qaStatusLabels[status]}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Priority</span>
                    <select value={qaEditDraft.priority} onChange={(event) => setQAEditDraft({ ...qaEditDraft, priority: event.target.value as QAItemPriority })}>
                      {qaPriorityOrder.map((priority) => <option key={priority} value={priority}>{qaPriorityLabels[priority]}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Type</span>
                    <select value={qaEditDraft.type} onChange={(event) => setQAEditDraft({ ...qaEditDraft, type: event.target.value as QAItemType })}>
                      {qaTypeOrder.map((type) => <option key={type} value={type}>{qaTypeLabels[type]}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  <span>Summary</span>
                  <textarea rows={3} value={qaEditDraft.summary} onChange={(event) => setQAEditDraft({ ...qaEditDraft, summary: event.target.value })} />
                </label>
                <label>
                  <span>Next action</span>
                  <textarea rows={3} value={qaEditDraft.nextAction} onChange={(event) => setQAEditDraft({ ...qaEditDraft, nextAction: event.target.value })} />
                </label>
                <div className="analysis-edit-grid">
                  <label>
                    <span>Result</span>
                    <input value={qaEditDraft.result} onChange={(event) => setQAEditDraft({ ...qaEditDraft, result: event.target.value })} />
                  </label>
                  <label>
                    <span>Actual result</span>
                    <input value={qaEditDraft.actualResult} onChange={(event) => setQAEditDraft({ ...qaEditDraft, actualResult: event.target.value })} />
                  </label>
                  <label>
                    <span>MVP blocker</span>
                    <input value={qaEditDraft.mvpBlocker} onChange={(event) => setQAEditDraft({ ...qaEditDraft, mvpBlocker: event.target.value })} />
                  </label>
                  <label>
                    <span>Stripe blocker</span>
                    <input value={qaEditDraft.stripeBlocker} onChange={(event) => setQAEditDraft({ ...qaEditDraft, stripeBlocker: event.target.value })} />
                  </label>
                </div>
                <label className="analysis-current-toggle">
                  <input type="checkbox" checked={qaEditDraft.isCurrent} onChange={(event) => setQAEditDraft({ ...qaEditDraft, isCurrent: event.target.checked })} />
                  <span>Current work item</span>
                </label>
                <div className="analysis-card-actions">
                  <button className="analysis-card-toggle" type="button" onClick={saveQAEditor}>
                    <Save size={15} />
                    Save item changes
                  </button>
                  <button className="analysis-chip-button" type="button" onClick={() => setCurrentQAItem(selectedQAItem.id, !selectedQAItem.isCurrent)}>
                    <Star size={13} />
                    {selectedQAItem.isCurrent ? 'Clear current' : 'Mark current'}
                  </button>
                </div>
              </section>

              <section className="analysis-edit-section">
                <h3>Add Progress Step</h3>
                <div className="analysis-edit-grid">
                  <label>
                    <span>Date</span>
                    <input type="datetime-local" value={qaEditDraft.progressDate} onChange={(event) => setQAEditDraft({ ...qaEditDraft, progressDate: event.target.value })} />
                  </label>
                  <label>
                    <span>Image path or URL</span>
                    <input value={qaEditDraft.imageRef} onChange={(event) => setQAEditDraft({ ...qaEditDraft, imageRef: event.target.value })} />
                  </label>
                </div>
                <label>
                  <span>Notes</span>
                  <textarea rows={4} value={qaEditDraft.progressNote} onChange={(event) => setQAEditDraft({ ...qaEditDraft, progressNote: event.target.value })} />
                </label>
                <div className="analysis-card-actions">
                  <button className="analysis-chip-button" type="button" onClick={addProgressImageRef} disabled={!qaEditDraft.imageRef.trim()}>
                    <ImagePlus size={14} />
                    Add image reference
                  </button>
                  <button className="analysis-chip-button" type="button" onClick={() => progressImageInputRef.current?.click()}>
                    <Upload size={14} />
                    Pick image
                  </button>
                  <button className="analysis-card-toggle" type="button" onClick={addQAProgressEntry} disabled={!qaEditDraft.progressNote.trim() && qaEditDraft.pendingImages.length === 0}>
                    <Plus size={15} />
                    Add progress step
                  </button>
                </div>
                <input ref={progressImageInputRef} className="sr-only" type="file" accept="image/*" onChange={handleProgressImageUpload} aria-label="Upload QA progress image" />
                {qaEditDraft.pendingImages.length > 0 && (
                  <div className="analysis-image-strip">
                    {qaEditDraft.pendingImages.map((image) => (
                      <figure key={image.id}>
                        {image.url && <img src={image.url} alt={image.label} />}
                        <figcaption>{image.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </section>

              <section className="analysis-edit-section">
                <h3>Progress Log</h3>
                {(selectedQAItem.progressLog?.length ?? 0) === 0 ? (
                  <p>No progress entries have been added yet.</p>
                ) : (
                  <ol className="analysis-progress-log">
                    {selectedQAItem.progressLog?.map((entry) => (
                      <li key={entry.id}>
                        <time>{formatProgressDate(entry.createdAt)}</time>
                        {entry.status && <span>{entry.status}</span>}
                        <p>{entry.body}</p>
                        {(entry.images?.length ?? 0) > 0 && (
                          <div className="analysis-image-strip">
                            {entry.images?.map((image) => (
                              <figure key={image.id}>
                                {image.url && <img src={image.url} alt={image.label} />}
                                <figcaption>{image.label}</figcaption>
                              </figure>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
