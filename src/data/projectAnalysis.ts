export type RepositoryVisibility = 'public' | 'private' | 'internal';
export type RepositoryType = 'web-app' | 'service' | 'plugin' | 'package' | 'docs';
export type FeatureDisposition = 'keep' | 'simplify' | 'hide' | 'gate' | 'consolidate' | 'defer' | 'remove' | 'remove-later' | 'new';
export type ComponentKind = 'screen' | 'api' | 'service' | 'job' | 'schema' | 'integration' | 'document';
export type DependencyType = 'requires' | 'feeds' | 'blocks' | 'duplicates' | 'replaces';
export type FileReferenceStatus = 'mapped' | 'existing' | 'planned' | 'orphan' | 'needs-review';
export type RoadmapSignalStatus = 'idea' | 'concept' | 'planned' | 'mvp' | 'active' | 'in-progress' | 'built' | 'shipped' | 'needs-review' | 'deferred' | 'cut';
export type RoadmapItemType = 'roadmap-item' | 'feature-candidate' | 'release' | 'research' | 'integration' | 'technical-debt' | 'qa';
export type QAItemStatus = 'not-started' | 'ready' | 'in-progress' | 'partial' | 'needs-retest' | 'blocked' | 'failed' | 'passed' | 'deferred' | 'future';
export type QAItemPriority = 'low' | 'medium' | 'high' | 'critical' | 'support' | 'conditional' | 'future';
export type QAItemType = 'task' | 'manual-test' | 'automated-test' | 'bug' | 'note' | 'decision' | 'evidence';
export type QAAttachmentType = 'image' | 'screenshot' | 'document' | 'log' | 'link';

export interface ProjectRepository {
  id: string;
  name: string;
  type: RepositoryType;
  visibility: RepositoryVisibility;
  description: string;
  path?: string;
  branchAtMapping?: string;
  role?: string;
}

export interface ProductCapability {
  id: string;
  name: string;
  description: string;
  businessValue: number;
  mvpImportance?: string;
}

export interface ReleaseTarget {
  id: string;
  name: string;
  horizon: string;
}

export interface ProductFeature {
  id: string;
  name: string;
  capabilityId: string;
  repositoryIds: string[];
  disposition: FeatureDisposition;
  releaseId: string;
  value: number;
  effort: number;
  risk: number;
  rationale: string;
  confidence?: string;
  appFiles?: string[];
  pluginFiles?: string[];
  playgroundFiles?: string[];
  privateDataFiles?: string[];
  qaEvidenceFiles?: string[];
  fileStatuses?: Record<string, FileReferenceStatus>;
  roadmapSignals?: RoadmapSignal[];
  mvpNotes?: string[];
  dependencyIds?: string[];
}

export interface RoadmapSignal {
  source: string;
  status: RoadmapSignalStatus | string;
  summary: string;
  phase?: string;
  target?: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  type: RoadmapItemType;
  status: RoadmapSignalStatus | string;
  summary: string;
  source: string;
  sourceSection?: string;
  phase?: string;
  target?: string;
  targetReleaseId?: string;
  priority?: string;
  capabilityId?: string;
  disposition?: FeatureDisposition;
  repositoryIds?: string[];
  featureIds?: string[];
  fileRefs?: string[];
  owner?: string;
  promotedFeatureId?: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string[];
  progressLog?: ProjectProgressEntry[];
}

export interface QANote {
  id: string;
  body: string;
  author?: string;
  createdAt?: string;
}

export interface QAAttachment {
  id: string;
  label: string;
  type: QAAttachmentType;
  path?: string;
  url?: string;
  description?: string;
}

export interface ProjectProgressEntry {
  id: string;
  createdAt: string;
  body: string;
  status?: string;
  author?: string;
  images?: QAAttachment[];
}

export interface QAItem {
  id: string;
  testId?: string;
  title: string;
  type: QAItemType;
  status: QAItemStatus;
  rawStatus?: string;
  priority: QAItemPriority;
  rawPriority?: string;
  summary: string;
  featureIds: string[];
  repositoryIds?: string[];
  fileRefs?: string[];
  track?: string;
  area?: string;
  modeTier?: string;
  result?: string;
  owner?: string;
  lastTested?: string;
  nextAction?: string;
  blocking?: string;
  mvpBlocker?: string;
  stripeBlocker?: string;
  automationCoverage?: string;
  issueLink?: string;
  actualResult?: string;
  sourceDoc?: string;
  sourceSection?: string;
  createdAt?: string;
  updatedAt?: string;
  due?: string;
  acceptanceCriteria?: string[];
  notes?: QANote[];
  attachments?: QAAttachment[];
  progressLog?: ProjectProgressEntry[];
  isCurrent?: boolean;
}

export interface CodeComponentReference {
  id: string;
  name: string;
  repositoryId: string;
  kind: ComponentKind;
  featureIds: string[];
  description: string;
}

export interface FeatureDependency {
  id: string;
  fromFeatureId: string;
  toFeatureId: string;
  type: DependencyType | string;
  description: string;
}

export interface ProjectAnalysisModel {
  schemaVersion?: string;
  projectName: string;
  description: string;
  repositories: ProjectRepository[];
  capabilities: ProductCapability[];
  releases: ReleaseTarget[];
  features: ProductFeature[];
  components: CodeComponentReference[];
  dependencies: FeatureDependency[];
  sourceLabel?: string;
  scopePurpose?: string;
  privacyBoundary?: string;
  roadmapSources?: RoadmapSignal[];
  roadmapItems?: RoadmapItem[];
  qaItems?: QAItem[];
  doNotCutBeforeChecks?: string[];
  openQuestions?: string[];
  firstSlimmingCandidates?: { featureId: string; suggestedAction: string; why: string }[];
}

export const dispositionLabels: Record<FeatureDisposition, string> = {
  keep: 'Keep',
  simplify: 'Simplify',
  hide: 'Hide',
  gate: 'Gate',
  consolidate: 'Consolidate',
  defer: 'Defer',
  remove: 'Remove',
  'remove-later': 'Remove later',
  new: 'New',
};

export const dispositionColors: Record<FeatureDisposition, string> = {
  keep: '#107C10',
  simplify: '#0078D4',
  hide: '#C19C00',
  gate: '#8764B8',
  consolidate: '#8764B8',
  defer: '#C19C00',
  remove: '#D13438',
  'remove-later': '#D13438',
  new: '#008272',
};

export const fileStatusLabels: Record<FileReferenceStatus, string> = {
  mapped: 'Mapped',
  existing: 'Existing',
  planned: 'Planned',
  orphan: 'Orphan',
  'needs-review': 'Needs review',
};

export const fileStatusColors: Record<FileReferenceStatus, string> = {
  mapped: '#0078D4',
  existing: '#107C10',
  planned: '#8764B8',
  orphan: '#D83B01',
  'needs-review': '#C19C00',
};

export const roadmapStatusLabels: Record<RoadmapSignalStatus, string> = {
  idea: 'Idea',
  concept: 'Concept',
  planned: 'Planned',
  mvp: 'MVP',
  active: 'Active',
  'in-progress': 'In progress',
  built: 'Built',
  shipped: 'Shipped',
  'needs-review': 'Needs review',
  deferred: 'Deferred',
  cut: 'Cut',
};

export const roadmapStatusColors: Record<RoadmapSignalStatus, string> = {
  idea: '#008272',
  concept: '#008272',
  planned: '#8764B8',
  mvp: '#107C10',
  active: '#0078D4',
  'in-progress': '#0078D4',
  built: '#107C10',
  shipped: '#107C10',
  'needs-review': '#C19C00',
  deferred: '#8764B8',
  cut: '#D13438',
};

export const qaStatusLabels: Record<QAItemStatus, string> = {
  'not-started': 'Not started',
  ready: 'Ready',
  'in-progress': 'In progress',
  partial: 'Partial',
  'needs-retest': 'Needs retest',
  blocked: 'Blocked',
  failed: 'Failed',
  passed: 'Passed',
  deferred: 'Deferred',
  future: 'Future',
};

export const qaStatusColors: Record<QAItemStatus, string> = {
  'not-started': '#605E5C',
  ready: '#008272',
  'in-progress': '#0078D4',
  partial: '#C19C00',
  'needs-retest': '#C19C00',
  blocked: '#D83B01',
  failed: '#D13438',
  passed: '#107C10',
  deferred: '#8764B8',
  future: '#8764B8',
};

export const qaPriorityLabels: Record<QAItemPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
  support: 'Support',
  conditional: 'Conditional',
  future: 'Future',
};

export const qaTypeLabels: Record<QAItemType, string> = {
  task: 'Task',
  'manual-test': 'Manual test',
  'automated-test': 'Automated test',
  bug: 'Bug',
  note: 'Note',
  decision: 'Decision',
  evidence: 'Evidence',
};

export function roadmapStatusLabel(status: string): string {
  if (status in roadmapStatusLabels) return roadmapStatusLabels[status as RoadmapSignalStatus];
  return status;
}

export function roadmapStatusColor(status: string): string {
  if (status in roadmapStatusColors) return roadmapStatusColors[status as RoadmapSignalStatus];
  return '#0078D4';
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function flexibleValue(record: UnknownRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const direct = record[key];
    if (typeof direct === 'string' && direct.trim()) return direct;
    const normalizedKey = Object.keys(record).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (normalizedKey) {
      const value = record[normalizedKey];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }

  return fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y', 'current', 'active'].includes(value.trim().toLowerCase());
  return false;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeDisposition(value: unknown): FeatureDisposition {
  const raw = stringValue(value, 'defer');
  if (raw in dispositionLabels) return raw as FeatureDisposition;
  return 'defer';
}

function normalizeRepositoryType(value: unknown): RepositoryType {
  const raw = stringValue(value, 'package');
  if (['web-app', 'service', 'plugin', 'package', 'docs'].includes(raw)) return raw as RepositoryType;
  return 'package';
}

function normalizeVisibility(value: unknown): RepositoryVisibility {
  const raw = stringValue(value, 'private');
  if (['public', 'private', 'internal'].includes(raw)) return raw as RepositoryVisibility;
  return 'private';
}

function normalizeFileStatus(value: unknown): FileReferenceStatus {
  const raw = stringValue(value, 'mapped');
  if (raw === 'future') return 'planned';
  if (raw in fileStatusLabels) return raw as FileReferenceStatus;
  return 'mapped';
}

function normalizeQAStatus(value: unknown): QAItemStatus {
  const raw = stringValue(value, 'not-started').trim().toLowerCase();
  if (raw === 'todo' || raw === 'pending' || raw === 'not started') return 'not-started';
  if (raw === 'retest' || raw === 'needs retest' || raw === 'needs-retest') return 'needs-retest';
  if (raw === 'in progress' || raw === 'active') return 'in-progress';
  if (raw === 'pass' || raw.startsWith('passed')) return 'passed';
  if (raw === 'fail' || raw.startsWith('failed')) return 'failed';
  if (raw === 'ready' || raw === 'ready to test') return 'ready';
  if (raw === 'partial' || raw === 'partially passed') return 'partial';
  if (raw === 'future' || raw === 'roadmap') return 'future';
  if (raw in qaStatusLabels) return raw as QAItemStatus;
  return 'not-started';
}

function normalizeQAPriority(value: unknown): QAItemPriority {
  const raw = stringValue(value, 'medium').trim().toLowerCase();
  if (raw === 'p0' || raw === 'blocker') return 'critical';
  if (raw === 'p1') return 'high';
  if (raw === 'p2') return 'medium';
  if (raw === 'p3') return 'low';
  if (raw in qaPriorityLabels) return raw as QAItemPriority;
  return 'medium';
}

function normalizeQAType(value: unknown): QAItemType {
  const raw = stringValue(value, 'task');
  if (raw === 'test') return 'manual-test';
  if (raw === 'screenshot') return 'evidence';
  if (raw in qaTypeLabels) return raw as QAItemType;
  return 'task';
}

function normalizeRoadmapStatus(value: unknown): RoadmapSignalStatus {
  const raw = stringValue(value, 'needs-review').trim().toLowerCase();
  if (raw === 'todo' || raw === 'backlog') return 'planned';
  if (raw === 'now' || raw === 'mvp') return 'mvp';
  if (raw === 'current' || raw === 'active') return 'active';
  if (raw === 'in progress' || raw === 'in-progress') return 'in-progress';
  if (raw === 'done' || raw === 'complete' || raw === 'completed') return 'built';
  if (raw === 'later' || raw === 'future' || raw === 'defer') return 'deferred';
  if (raw === 'removed' || raw === 'remove') return 'cut';
  if (raw in roadmapStatusLabels) return raw as RoadmapSignalStatus;
  return 'needs-review';
}

function normalizeRoadmapItemType(value: unknown): RoadmapItemType {
  const raw = stringValue(value, 'roadmap-item').trim().toLowerCase();
  if (raw === 'feature' || raw === 'feature candidate') return 'feature-candidate';
  if (raw === 'tech-debt' || raw === 'debt') return 'technical-debt';
  if (['roadmap-item', 'feature-candidate', 'release', 'research', 'integration', 'technical-debt', 'qa'].includes(raw)) {
    return raw as RoadmapItemType;
  }
  return 'roadmap-item';
}

function mapFileStatuses(featureStatuses: unknown, globalStatuses: UnknownRecord): Record<string, FileReferenceStatus> | undefined {
  const merged: Record<string, FileReferenceStatus> = {};

  for (const [path, status] of Object.entries(globalStatuses)) {
    merged[path] = normalizeFileStatus(status);
  }

  if (isRecord(featureStatuses)) {
    for (const [path, status] of Object.entries(featureStatuses)) {
      merged[path] = normalizeFileStatus(status);
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mapRoadmapSignals(value: unknown): RoadmapSignal[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((signal) => ({
    source: stringValue(signal.source),
    status: normalizeRoadmapStatus(signal.status),
    summary: stringValue(signal.summary),
    phase: stringValue(signal.phase),
    target: stringValue(signal.target),
  })).filter((signal) => signal.source && signal.summary);
}

function mapRoadmapItems(value: unknown): RoadmapItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => {
    const title = stringValue(item.title, stringValue(item.name, `Roadmap item ${index + 1}`));
    return {
      id: stringValue(item.id, `roadmap-${index + 1}`),
      title,
      type: normalizeRoadmapItemType(item.type),
      status: normalizeRoadmapStatus(item.status),
      summary: stringValue(item.summary, stringValue(item.description, stringValue(item.notes))),
      source: flexibleValue(item, ['source', 'sourceDoc', 'Source Doc'], 'Roadmap'),
      sourceSection: flexibleValue(item, ['sourceSection', 'section', 'Source Section']),
      phase: stringValue(item.phase),
      target: stringValue(item.target),
      targetReleaseId: stringValue(item.targetReleaseId, stringValue(item.releaseId)),
      priority: stringValue(item.priority),
      capabilityId: stringValue(item.capabilityId),
      disposition: item.disposition || item.mvpAction ? normalizeDisposition(item.disposition ?? item.mvpAction) : undefined,
      repositoryIds: stringArray(item.repositoryIds ?? item.repositories),
      featureIds: stringArray(item.featureIds ?? item.features ?? item.linkedFeatureIds),
      fileRefs: stringArray(item.fileRefs ?? item.files ?? item.linkedFiles),
      owner: stringValue(item.owner),
      promotedFeatureId: stringValue(item.promotedFeatureId),
      createdAt: stringValue(item.createdAt, stringValue(item.date)),
      updatedAt: stringValue(item.updatedAt),
      notes: stringArray(item.notesList ?? item.noteEntries ?? item.roadmapNotes),
      progressLog: mapProgressLog(item.progressLog ?? item.history ?? item.testLog),
    };
  }).filter((item) => item.title && item.summary);
}

function mapQANotes(value: unknown): QANote[] {
  if (!Array.isArray(value)) return [];
  return value.map((note, index): QANote | null => {
    if (typeof note === 'string') {
      return { id: `note-${index + 1}`, body: note };
    }

    if (!isRecord(note)) return null;
    const body = stringValue(note.body, stringValue(note.text, stringValue(note.note)));
    if (!body) return null;
    return {
      id: stringValue(note.id, `note-${index + 1}`),
      body,
      author: stringValue(note.author),
      createdAt: stringValue(note.createdAt, stringValue(note.date)),
    };
  }).filter((note): note is QANote => Boolean(note));
}

function mapQAAttachments(value: unknown): QAAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.map((attachment, index): QAAttachment | null => {
    if (typeof attachment === 'string') {
      const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment);
      return {
        id: `attachment-${index + 1}`,
        label: attachment.split(/[\\/]/).pop() || attachment,
        type: isImage ? 'image' : 'document',
        path: attachment,
      } satisfies QAAttachment;
    }

    if (!isRecord(attachment)) return null;
    const path = stringValue(attachment.path);
    const url = stringValue(attachment.url);
    if (!path && !url) return null;
    return {
      id: stringValue(attachment.id, `attachment-${index + 1}`),
      label: stringValue(attachment.label, stringValue(attachment.name, path || url)),
      type: ((): QAAttachmentType => {
        const raw = stringValue(attachment.type, 'document');
        if (['image', 'screenshot', 'document', 'log', 'link'].includes(raw)) return raw as QAAttachmentType;
        return 'document';
      })(),
      path,
      url,
      description: stringValue(attachment.description),
    };
  }).filter((attachment): attachment is QAAttachment => Boolean(attachment));
}

function mapProgressLog(value: unknown): ProjectProgressEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index): ProjectProgressEntry | null => {
    if (typeof entry === 'string') {
      return { id: `progress-${index + 1}`, createdAt: '', body: entry };
    }

    if (!isRecord(entry)) return null;
    const body = stringValue(entry.body, stringValue(entry.note, stringValue(entry.notes)));
    if (!body) return null;
    return {
      id: stringValue(entry.id, `progress-${index + 1}`),
      createdAt: stringValue(entry.createdAt, stringValue(entry.date, stringValue(entry.testedAt))),
      body,
      status: stringValue(entry.status),
      author: stringValue(entry.author),
      images: mapQAAttachments(entry.images ?? entry.attachments ?? entry.evidence),
    };
  }).filter((entry): entry is ProjectProgressEntry => Boolean(entry));
}

function mapQAItems(value: unknown, defaultFeatureId?: string): QAItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => {
    const featureIds = stringArray(item.featureIds ?? item.features ?? item.linkedFeatureIds);
    const featureId = stringValue(item.featureId);
    if (featureId && !featureIds.includes(featureId)) featureIds.push(featureId);
    if (defaultFeatureId && !featureIds.includes(defaultFeatureId)) featureIds.push(defaultFeatureId);

    const fileRefs = stringArray(item.fileRefs ?? item.files ?? item.linkedFiles);
    const rawStatus = flexibleValue(item, ['rawStatus', 'Status']);
    const rawPriority = flexibleValue(item, ['rawPriority', 'Priority']);
    const title = stringValue(item.title, stringValue(item.name, `QA item ${index + 1}`));
    return {
      id: stringValue(item.id, `qa-${index + 1}`),
      testId: flexibleValue(item, ['testId', 'Test ID', 'Issue ID']),
      title,
      type: normalizeQAType(item.type),
      status: normalizeQAStatus(item.status ?? rawStatus),
      rawStatus,
      priority: normalizeQAPriority(item.priority ?? rawPriority),
      rawPriority,
      summary: stringValue(item.summary, stringValue(item.description, Array.isArray(item.notes) ? '' : stringValue(item.notes))),
      featureIds,
      repositoryIds: stringArray(item.repositoryIds ?? item.repositories),
      fileRefs,
      track: flexibleValue(item, ['track', 'Track']),
      area: flexibleValue(item, ['area', 'Area']),
      modeTier: flexibleValue(item, ['modeTier', 'Mode / Tier', 'Mode/Tier']),
      result: flexibleValue(item, ['result', 'Result']),
      owner: stringValue(item.owner),
      lastTested: flexibleValue(item, ['lastTested', 'Last Tested']),
      nextAction: flexibleValue(item, ['nextAction', 'Next Action']),
      blocking: flexibleValue(item, ['blocking', 'Blocking?']),
      mvpBlocker: flexibleValue(item, ['mvpBlocker', 'MVP Blocker?']),
      stripeBlocker: flexibleValue(item, ['stripeBlocker', 'Stripe Blocker?']),
      automationCoverage: flexibleValue(item, ['automationCoverage', 'Automation Coverage']),
      issueLink: flexibleValue(item, ['issueLink', 'Issue Link']),
      actualResult: flexibleValue(item, ['actualResult', 'Actual Result']),
      sourceDoc: flexibleValue(item, ['sourceDoc', 'Source Doc']),
      sourceSection: flexibleValue(item, ['sourceSection', 'Source Section']),
      createdAt: stringValue(item.createdAt, stringValue(item.date)),
      updatedAt: stringValue(item.updatedAt),
      due: stringValue(item.due),
      acceptanceCriteria: stringArray(item.acceptanceCriteria ?? item.criteria),
      notes: mapQANotes(item.notesList ?? item.noteEntries ?? item.qaNotes ?? item.notes),
      attachments: mapQAAttachments(item.attachments ?? item.evidence ?? item.images),
      progressLog: mapProgressLog(item.progressLog ?? item.history ?? item.testLog),
      isCurrent: booleanValue(item.isCurrent ?? item.current),
    };
  }).filter((item) => item.title && item.featureIds.length > 0);
}

function mapFileMapRepositories(value: unknown): ProjectRepository[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((repo) => ({
    id: stringValue(repo.id),
    name: stringValue(repo.name, stringValue(repo.id, 'Repository')),
    type: normalizeRepositoryType(repo.type),
    visibility: normalizeVisibility(repo.visibility),
    description: stringValue(repo.role, stringValue(repo.description)),
    path: stringValue(repo.path),
    branchAtMapping: stringValue(repo.branchAtMapping),
    role: stringValue(repo.role),
  })).filter((repo) => repo.id);
}

function mapFileMapCapabilities(value: unknown): ProductCapability[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((capability) => ({
    id: stringValue(capability.id),
    name: stringValue(capability.name, stringValue(capability.id, 'Capability')),
    description: stringValue(capability.summary, stringValue(capability.description)),
    businessValue: numberValue(capability.businessValue, stringValue(capability.mvpImportance) === 'critical' ? 5 : 3),
    mvpImportance: stringValue(capability.mvpImportance),
  })).filter((capability) => capability.id);
}

function mapFileMapReleases(value: unknown): ReleaseTarget[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((release) => ({
    id: stringValue(release.id),
    name: stringValue(release.name, stringValue(release.id, 'Release')),
    horizon: stringValue(release.horizon, stringValue(release.name, '')),
  })).filter((release) => release.id);
}

function mapFileMapFeatures(value: unknown, globalFileStatuses: UnknownRecord = {}): ProductFeature[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((feature) => {
    const disposition = normalizeDisposition(feature.mvpAction ?? feature.disposition);
    return {
      id: stringValue(feature.id),
      name: stringValue(feature.name, stringValue(feature.id, 'Feature')),
      capabilityId: stringValue(feature.capabilityId),
      repositoryIds: stringArray(feature.repositories ?? feature.repositoryIds),
      disposition,
      releaseId: stringValue(feature.targetRelease ?? feature.releaseId, 'later'),
      value: numberValue(feature.value, disposition === 'keep' ? 5 : disposition === 'defer' ? 2 : 3),
      effort: numberValue(feature.effort, 3),
      risk: numberValue(feature.risk, stringValue(feature.confidence) === 'high' ? 2 : 3),
      rationale: stringValue(feature.rationale, stringValue(feature.notes)),
      confidence: stringValue(feature.confidence),
      appFiles: stringArray(feature.appFiles),
      pluginFiles: stringArray(feature.pluginFiles),
      playgroundFiles: stringArray(feature.playgroundFiles),
      privateDataFiles: stringArray(feature.privateDataFiles),
      qaEvidenceFiles: stringArray(feature.qaEvidenceFiles),
      fileStatuses: mapFileStatuses(feature.fileStatuses, globalFileStatuses),
      roadmapSignals: mapRoadmapSignals(feature.roadmapSignals),
      mvpNotes: stringArray(feature.mvpNotes),
      dependencyIds: stringArray(feature.dependencies),
    };
  }).filter((feature) => feature.id);
}

function mapFeatureScopedQAItems(value: unknown): QAItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((feature) => {
    const featureId = stringValue(feature.id);
    return mapQAItems(feature.qaItems ?? feature.qaTasks ?? feature.qa, featureId);
  });
}

function mapFileMapDependencies(value: unknown): FeatureDependency[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((dependency, index) => ({
    id: `${stringValue(dependency.from, 'from')}-${stringValue(dependency.to, 'to')}-${index}`,
    fromFeatureId: stringValue(dependency.from),
    toFeatureId: stringValue(dependency.to),
    type: stringValue(dependency.type, 'relates-to'),
    description: stringValue(dependency.reason, stringValue(dependency.description)),
  })).filter((dependency) => dependency.fromFeatureId && dependency.toFeatureId);
}

function mapSlimmingCandidates(value: unknown): { featureId: string; suggestedAction: string; why: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((candidate) => ({
    featureId: stringValue(candidate.featureId),
    suggestedAction: stringValue(candidate.suggestedAction),
    why: stringValue(candidate.why),
  })).filter((candidate) => candidate.featureId);
}

export function projectAnalysisFromJson(value: unknown, sourceLabel = 'Imported map'): ProjectAnalysisModel {
  if (!isRecord(value)) {
    throw new Error('The selected file is not a project-analysis JSON object.');
  }

  if (value.schemaVersion === 'project-analysis.feature-file-map.v1') {
    const scope = isRecord(value.scope) ? value.scope : {};
    const globalFileStatuses = isRecord(value.fileStatuses) ? value.fileStatuses : {};
    const model: ProjectAnalysisModel = {
      schemaVersion: stringValue(value.schemaVersion),
      projectName: stringValue(value.projectName, 'Imported Project'),
      description: stringValue(scope.purpose, stringValue(value.description, 'Imported feature-file map.')),
      repositories: mapFileMapRepositories(value.repositories),
      capabilities: mapFileMapCapabilities(value.capabilities),
      releases: mapFileMapReleases(value.releases),
      features: mapFileMapFeatures(value.features, globalFileStatuses),
      components: [],
      dependencies: mapFileMapDependencies(value.dependencyGraph),
      sourceLabel,
      scopePurpose: stringValue(scope.purpose),
      privacyBoundary: stringValue(scope.privacyBoundary),
      roadmapSources: mapRoadmapSignals(value.roadmapSources),
      roadmapItems: mapRoadmapItems(value.roadmapItems ?? value.roadmap ?? value.roadmapEntries),
      qaItems: [
        ...mapQAItems(value.qaItems ?? value.qaTasks ?? value.qa),
        ...mapFeatureScopedQAItems(value.features),
      ],
      doNotCutBeforeChecks: stringArray(value.doNotCutBeforeChecks),
      openQuestions: stringArray(value.openQuestionsForReview),
      firstSlimmingCandidates: mapSlimmingCandidates(value.firstSlimmingCandidates),
    };
    if (model.features.length === 0) throw new Error('The feature-file map has no features.');
    return model;
  }

  const maybeModel = value as Partial<ProjectAnalysisModel>;
  if (Array.isArray(maybeModel.features) && Array.isArray(maybeModel.repositories)) {
    return { ...maybeModel, sourceLabel } as ProjectAnalysisModel;
  }

  throw new Error('Unsupported project-analysis JSON format.');
}

// Fictional sample data. Real product maps should be imported locally or kept
// in a private data repo outside this public application.
export const sampleProjectAnalysis: ProjectAnalysisModel = {
  projectName: 'Atlas Launch Platform',
  description: 'A fictional product team mapping what belongs in an MVP and what can return later.',
  repositories: [
    {
      id: 'customer-portal',
      name: 'Customer Portal',
      type: 'web-app',
      visibility: 'private',
      description: 'User-facing application for planning launch work.',
    },
    {
      id: 'automation-service',
      name: 'Automation Service',
      type: 'service',
      visibility: 'private',
      description: 'Background workflows, notifications, and integrations.',
    },
    {
      id: 'integration-plugin',
      name: 'CMS Integration Plugin',
      type: 'plugin',
      visibility: 'public',
      description: 'Optional publishing connector for customer-owned sites.',
    },
  ],
  capabilities: [
    {
      id: 'planning',
      name: 'Launch Planning',
      description: 'Turn goals into an actionable launch plan.',
      businessValue: 5,
    },
    {
      id: 'collaboration',
      name: 'Team Collaboration',
      description: 'Coordinate reviews, assignments, and approvals.',
      businessValue: 4,
    },
    {
      id: 'publishing',
      name: 'Publishing',
      description: 'Move approved launch assets to external channels.',
      businessValue: 3,
    },
  ],
  releases: [
    { id: 'mvp', name: 'MVP', horizon: 'Now' },
    { id: 'r1', name: '1.1', horizon: 'Next' },
    { id: 'later', name: 'Later', horizon: 'Future' },
  ],
  features: [
    {
      id: 'brief-builder',
      name: 'Brief Builder',
      capabilityId: 'planning',
      repositoryIds: ['customer-portal'],
      disposition: 'keep',
      releaseId: 'mvp',
      value: 5,
      effort: 3,
      risk: 2,
      rationale: 'Core planning surface with a direct path to user value.',
      appFiles: ['src/screens/BriefWorkspace.tsx'],
      qaEvidenceFiles: ['qa/manual/brief-builder-smoke.md'],
      fileStatuses: {
        'src/screens/BriefWorkspace.tsx': 'existing',
        'qa/manual/brief-builder-smoke.md': 'needs-review',
      },
    },
    {
      id: 'asset-review',
      name: 'Asset Review Queue',
      capabilityId: 'collaboration',
      repositoryIds: ['customer-portal', 'automation-service'],
      disposition: 'simplify',
      releaseId: 'mvp',
      value: 4,
      effort: 4,
      risk: 3,
      rationale: 'Needed for MVP, but advanced routing can wait.',
      appFiles: ['src/screens/ReviewQueue.tsx'],
      pluginFiles: ['cms-plugin/review-sync.ts'],
      qaEvidenceFiles: ['qa/screenshots/review-empty-state.png'],
      fileStatuses: {
        'src/screens/ReviewQueue.tsx': 'existing',
        'cms-plugin/review-sync.ts': 'mapped',
        'qa/screenshots/review-empty-state.png': 'needs-review',
      },
    },
    {
      id: 'publish-scheduler',
      name: 'Publishing Scheduler',
      capabilityId: 'publishing',
      repositoryIds: ['automation-service', 'integration-plugin'],
      disposition: 'defer',
      releaseId: 'r1',
      value: 3,
      effort: 5,
      risk: 4,
      rationale: 'Useful after the manual approval loop is proven.',
    },
    {
      id: 'legacy-export',
      name: 'Legacy Export Wizard',
      capabilityId: 'publishing',
      repositoryIds: ['customer-portal'],
      disposition: 'consolidate',
      releaseId: 'later',
      value: 2,
      effort: 3,
      risk: 2,
      rationale: 'Overlaps with publishing and should become one export flow.',
    },
    {
      id: 'workspace-insights',
      name: 'Workspace Insights',
      capabilityId: 'planning',
      repositoryIds: ['customer-portal', 'automation-service'],
      disposition: 'new',
      releaseId: 'r1',
      value: 4,
      effort: 3,
      risk: 3,
      rationale: 'Adds decision support once enough activity data exists.',
    },
  ],
  components: [
    {
      id: 'brief-screen',
      name: 'Brief Screen',
      repositoryId: 'customer-portal',
      kind: 'screen',
      featureIds: ['brief-builder'],
      description: 'Main planning workspace.',
    },
    {
      id: 'approval-api',
      name: 'Approval API',
      repositoryId: 'automation-service',
      kind: 'api',
      featureIds: ['asset-review'],
      description: 'Stores review state and decisions.',
    },
    {
      id: 'publish-job',
      name: 'Publish Job',
      repositoryId: 'automation-service',
      kind: 'job',
      featureIds: ['publish-scheduler'],
      description: 'Schedules external publishing work.',
    },
    {
      id: 'cms-connector',
      name: 'CMS Connector',
      repositoryId: 'integration-plugin',
      kind: 'integration',
      featureIds: ['publish-scheduler'],
      description: 'Receives approved content from the service.',
    },
  ],
  dependencies: [
    {
      id: 'asset-review-requires-brief',
      fromFeatureId: 'asset-review',
      toFeatureId: 'brief-builder',
      type: 'requires',
      description: 'Reviews need a completed brief to anchor decisions.',
    },
    {
      id: 'scheduler-requires-review',
      fromFeatureId: 'publish-scheduler',
      toFeatureId: 'asset-review',
      type: 'requires',
      description: 'Publishing should only run after approval.',
    },
    {
      id: 'legacy-duplicates-scheduler',
      fromFeatureId: 'legacy-export',
      toFeatureId: 'publish-scheduler',
      type: 'duplicates',
      description: 'Both move assets out of the product.',
    },
    {
      id: 'insights-feeds-planning',
      fromFeatureId: 'workspace-insights',
      toFeatureId: 'brief-builder',
      type: 'feeds',
      description: 'Insights can recommend planning improvements.',
    },
  ],
  roadmapItems: [
    {
      id: 'roadmap-research-import',
      title: 'Research Import',
      type: 'feature-candidate',
      status: 'mvp',
      summary: 'Bring source material into the workflow without full automated research.',
      source: 'docs/roadmap/PRODUCT-ROADMAP.md',
      sourceSection: 'MVP Scope',
      phase: 'MVP',
      target: 'Launch',
      targetReleaseId: 'mvp',
      priority: 'High',
      capabilityId: 'planning',
      repositoryIds: ['customer-portal'],
      featureIds: ['brief-builder'],
      fileRefs: ['src/screens/BriefWorkspace.tsx'],
      notes: ['Promote this kind of item when the intake flow needs actual files and QA.'],
    },
    {
      id: 'roadmap-agency-white-label',
      title: 'Agency White Label',
      type: 'feature-candidate',
      status: 'deferred',
      summary: 'Package team and client-facing customization after the core launch path is proven.',
      source: 'docs/roadmap/AGENCY-WHITE-LABEL.md',
      phase: 'Later',
      target: 'Post-MVP',
      priority: 'Future',
      capabilityId: 'collaboration',
    },
  ],
  qaItems: [
    {
      id: 'qa-brief-builder-smoke',
      title: 'Brief builder happy path smoke',
      type: 'manual-test',
      status: 'passed',
      priority: 'critical',
      summary: 'Create a brief, save it, reload, and confirm the planning fields persist.',
      featureIds: ['brief-builder'],
      repositoryIds: ['customer-portal'],
      fileRefs: ['src/screens/BriefWorkspace.tsx', 'qa/manual/brief-builder-smoke.md'],
      notes: [
        {
          id: 'note-brief-1',
          body: 'Use this as the primary release-readiness check for the planning surface.',
          createdAt: '2026-08-17',
        },
      ],
    },
    {
      id: 'qa-review-empty-state',
      title: 'Review queue empty state needs screenshot review',
      type: 'evidence',
      status: 'needs-retest',
      priority: 'high',
      summary: 'Confirm the simplified review queue communicates next action without advanced routing controls.',
      featureIds: ['asset-review'],
      repositoryIds: ['customer-portal'],
      fileRefs: ['src/screens/ReviewQueue.tsx', 'qa/screenshots/review-empty-state.png'],
      attachments: [
        {
          id: 'review-empty-shot',
          label: 'Review queue empty state',
          type: 'screenshot',
          path: 'qa/screenshots/review-empty-state.png',
        },
      ],
      progressLog: [
        {
          id: 'progress-review-empty-state-gallery',
          createdAt: '2026-08-20T12:00:00.000Z',
          status: 'needs-retest',
          body: 'Added screenshot evidence so the team can inspect the review queue state in the QA gallery.',
          images: [
            {
              id: 'review-empty-state-sample',
              label: 'review-empty-state-sample.svg',
              type: 'screenshot',
              path: 'qa/screenshots/review-empty-state.png',
              url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22380%22 viewBox=%220 0 640 380%22%3E%3Crect width=%22640%22 height=%22380%22 fill=%22%231f1f1f%22/%3E%3Crect x=%2236%22 y=%2234%22 width=%22568%22 height=%22312%22 rx=%2212%22 fill=%22%232b2b2b%22 stroke=%22%23454545%22/%3E%3Ctext x=%2264%22 y=%2284%22 fill=%22%23f3f3f3%22 font-family=%22Arial%22 font-size=%2227%22 font-weight=%22700%22%3EReview Queue%3C/text%3E%3Ctext x=%2264%22 y=%22124%22 fill=%22%23bdbdbd%22 font-family=%22Arial%22 font-size=%2216%22%3ENo assets need review right now.%3C/text%3E%3Crect x=%2264%22 y=%22160%22 width=%22512%22 height=%2284%22 rx=%228%22 fill=%22%23363636%22/%3E%3Ctext x=%2292%22 y=%22208%22 fill=%22%238fc8ff%22 font-family=%22Arial%22 font-size=%2218%22%3EEmpty state screenshot evidence%3C/text%3E%3C/svg%3E',
            },
          ],
        },
      ],
    },
  ],
};
