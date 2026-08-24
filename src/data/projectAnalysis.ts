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
export type MarkdownDocumentStatus = 'draft' | 'active' | 'needs-review' | 'aligned' | 'stale' | 'archived';
export type MarkdownDocumentPurpose = 'architecture' | 'setup' | 'roadmap' | 'audit' | 'qa' | 'security' | 'runbook' | 'decision' | 'reference' | 'other';
export type MarkdownDocumentSensitivity = 'public' | 'internal' | 'private' | 'secret-free-summary';
export type MarkdownResourceType = 'official-docs' | 'standard' | 'design-guide' | 'repo' | 'api-reference' | 'internal-doc' | 'tooling' | 'other';
export type AgentUseLevel = 'required' | 'recommended' | 'reference';
export type ProjectWorkItemStatus = 'todo' | 'ready' | 'in-progress' | 'blocked' | 'review' | 'done' | 'deferred';
export type ProjectWorkItemType = 'mcp' | 'audit' | 'schema' | 'security' | 'qa' | 'doc' | 'roadmap' | 'feature' | 'integration' | 'task';
export type ProjectWorkItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectQueueViewStage = 'blocked' | 'qa' | 'mapping' | 'signoff' | 'ready' | 'slimming' | 'backlog';
export type ProjectQueueViewType = ProjectWorkItemType | 'feature-derived';
export type ProjectBatchTemplateSource = 'markdown-documents' | 'qa-items' | 'roadmap-items' | 'roadmap-sources' | 'features';
export type MVPDecision = 'keep' | 'simplify' | 'defer' | 'cut' | 'needs-review';
export type MVPSignoffStatus = 'not-started' | 'in-review' | 'approved' | 'rejected';
export type MVPCutSafety = 'safe-to-cut' | 'do-not-cut-yet' | 'needs-review';
export type TestingRuntimeStatus = 'available' | 'missing' | 'needs-confirmation' | 'error';
export type TestingToolCategory = 'runtime' | 'package-manager' | 'browser' | 'unit-test' | 'e2e-test' | 'wordpress' | 'docker' | 'quality' | 'database' | 'other';

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
  mvpDecision?: MVPDecision;
  mvpNextAction?: string;
  mvpOwner?: string;
  mvpStatus?: string;
  mvpSignoff?: MVPSignoffStatus;
  mvpCutSafety?: MVPCutSafety;
  mvpProgressLog?: ProjectProgressEntry[];
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

export interface MarkdownDocument {
  id: string;
  title: string;
  path: string;
  purpose: MarkdownDocumentPurpose;
  status: MarkdownDocumentStatus;
  summary: string;
  repositoryIds?: string[];
  featureIds?: string[];
  sourceSection?: string;
  owner?: string;
  sensitivity?: MarkdownDocumentSensitivity;
  lastReviewedAt?: string;
  updatedAt?: string;
  tags?: string[];
  alignmentTargets?: string[];
  auditFindings?: string[];
  appliesTo?: string[];
  requiredChecks?: string[];
  agentUseLevel?: AgentUseLevel;
  resources?: MarkdownDocumentResource[];
  bodyDraft?: string;
}

export interface MarkdownDocumentResource {
  id: string;
  title: string;
  url: string;
  type: MarkdownResourceType;
  tags?: string[];
  notes?: string;
}

export interface ProjectWorkItem {
  id: string;
  title: string;
  type: ProjectWorkItemType;
  status: ProjectWorkItemStatus;
  priority: ProjectWorkItemPriority;
  summary: string;
  nextAction?: string;
  owner?: string;
  due?: string;
  source?: string;
  sourceId?: string;
  sourcePath?: string;
  featureIds?: string[];
  repositoryIds?: string[];
  markdownDocumentIds?: string[];
  qaItemIds?: string[];
  roadmapItemIds?: string[];
  tags?: string[];
  acceptanceCriteria?: string[];
  createdAt?: string;
  updatedAt?: string;
  progressLog?: ProjectProgressEntry[];
}

export interface ProjectQueueViewFilters {
  stage?: ProjectQueueViewStage | 'all';
  type?: ProjectQueueViewType | 'all';
  owner?: string;
  priority?: ProjectWorkItemPriority | 'all';
  source?: string;
  search?: string;
}

export interface ProjectQueueView {
  id: string;
  name: string;
  summary: string;
  filters: ProjectQueueViewFilters;
  owner?: string;
  cadence?: string;
  outcome?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectBatchTemplateFilters {
  documentPurpose?: MarkdownDocumentPurpose | 'all';
  documentStatus?: MarkdownDocumentStatus | 'all';
  alignmentTarget?: string;
  qaStatus?: QAItemStatus | 'all';
  qaPriority?: QAItemPriority | 'all';
  roadmapStatus?: string;
  featureReleaseId?: string;
  featureDisposition?: FeatureDisposition | 'all';
  tag?: string;
  sourceIncludes?: string;
}

export interface ProjectBatchTemplateRun {
  id: string;
  ranAt: string;
  sourceCount: number;
  createdWorkItemCount: number;
  createdWorkItemIds: string[];
  sourceTitles: string[];
  summary: string;
  outcomeScore?: number;
  outcomeNotes?: string;
  reviewedAt?: string;
}

export interface ProjectBatchTemplate {
  id: string;
  name: string;
  summary: string;
  sourceType: ProjectBatchTemplateSource;
  workItemType: ProjectWorkItemType;
  priority: ProjectWorkItemPriority;
  titlePrefix: string;
  nextAction: string;
  owner?: string;
  source?: string;
  tags?: string[];
  filters?: ProjectBatchTemplateFilters;
  cadence?: string;
  outcome?: string;
  archivedAt?: string;
  lastRunAt?: string;
  lastRunItemCount?: number;
  lastRunSourceCount?: number;
  lastRunWorkItemIds?: string[];
  runHistory?: ProjectBatchTemplateRun[];
  createdAt?: string;
  updatedAt?: string;
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

export interface TestingToolSignal {
  id: string;
  label: string;
  category: TestingToolCategory;
  status: TestingRuntimeStatus;
  summary: string;
  version?: string;
  command?: string;
  path?: string;
}

export interface TestingRuntimeEndpoint {
  id: string;
  label: string;
  url: string;
  status: TestingRuntimeStatus;
  summary: string;
  statusCode?: number;
}

export interface TestingRuntimeRepository {
  repositoryId: string;
  name: string;
  path: string;
  packageManager?: string;
  scripts?: string[];
  tools?: string[];
}

export interface ProjectTestingRuntimeScan {
  schemaVersion: 'project-analysis.testing-runtime.v1';
  scannerVersion: string;
  scannedAt: string;
  workspaceRoot?: string;
  mapId?: string;
  tools: TestingToolSignal[];
  endpoints: TestingRuntimeEndpoint[];
  repositories: TestingRuntimeRepository[];
  notes: string[];
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
  markdownDocuments?: MarkdownDocument[];
  workItems?: ProjectWorkItem[];
  queueViews?: ProjectQueueView[];
  batchTemplates?: ProjectBatchTemplate[];
  doNotCutBeforeChecks?: string[];
  openQuestions?: string[];
  firstSlimmingCandidates?: { featureId: string; suggestedAction: string; why: string }[];
  testingRuntime?: ProjectTestingRuntimeScan;
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

export const markdownDocumentStatusLabels: Record<MarkdownDocumentStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  'needs-review': 'Needs review',
  aligned: 'Aligned',
  stale: 'Stale',
  archived: 'Archived',
};

export const markdownDocumentStatusColors: Record<MarkdownDocumentStatus, string> = {
  draft: '#605E5C',
  active: '#0078D4',
  'needs-review': '#C19C00',
  aligned: '#107C10',
  stale: '#D83B01',
  archived: '#8764B8',
};

export const markdownDocumentPurposeLabels: Record<MarkdownDocumentPurpose, string> = {
  architecture: 'Architecture',
  setup: 'Setup',
  roadmap: 'Roadmap',
  audit: 'Audit',
  qa: 'QA',
  security: 'Security',
  runbook: 'Runbook',
  decision: 'Decision',
  reference: 'Reference',
  other: 'Other',
};

export const markdownDocumentSensitivityLabels: Record<MarkdownDocumentSensitivity, string> = {
  public: 'Public',
  internal: 'Internal',
  private: 'Private',
  'secret-free-summary': 'Secret-free summary',
};

export const markdownResourceTypeLabels: Record<MarkdownResourceType, string> = {
  'official-docs': 'Official docs',
  standard: 'Standard',
  'design-guide': 'Design guide',
  repo: 'Repository',
  'api-reference': 'API reference',
  'internal-doc': 'Internal doc',
  tooling: 'Tooling',
  other: 'Other',
};

export const agentUseLevelLabels: Record<AgentUseLevel, string> = {
  required: 'Required',
  recommended: 'Recommended',
  reference: 'Reference',
};

export const projectWorkItemStatusLabels: Record<ProjectWorkItemStatus, string> = {
  todo: 'To do',
  ready: 'Ready',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
  deferred: 'Deferred',
};

export const projectWorkItemStatusColors: Record<ProjectWorkItemStatus, string> = {
  todo: '#605E5C',
  ready: '#008272',
  'in-progress': '#0078D4',
  blocked: '#D13438',
  review: '#8764B8',
  done: '#107C10',
  deferred: '#C19C00',
};

export const projectWorkItemTypeLabels: Record<ProjectWorkItemType, string> = {
  mcp: 'MCP',
  audit: 'Audit',
  schema: 'Schema/API',
  security: 'Security',
  qa: 'QA',
  doc: 'Docs',
  roadmap: 'Roadmap',
  feature: 'Feature',
  integration: 'Integration',
  task: 'Task',
};

export const projectWorkItemPriorityLabels: Record<ProjectWorkItemPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const projectBatchTemplateSourceLabels: Record<ProjectBatchTemplateSource, string> = {
  'markdown-documents': 'MD Docs',
  'qa-items': 'QA Items',
  'roadmap-items': 'Roadmap Items',
  'roadmap-sources': 'Roadmap Sources',
  features: 'Features',
};

export const mvpDecisionLabels: Record<MVPDecision, string> = {
  keep: 'Keep',
  simplify: 'Simplify',
  defer: 'Defer',
  cut: 'Cut',
  'needs-review': 'Needs review',
};

export const mvpSignoffLabels: Record<MVPSignoffStatus, string> = {
  'not-started': 'Not started',
  'in-review': 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const mvpCutSafetyLabels: Record<MVPCutSafety, string> = {
  'safe-to-cut': 'Safe to cut',
  'do-not-cut-yet': 'Do not cut yet',
  'needs-review': 'Needs review',
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

function normalizeMarkdownDocumentStatus(value: unknown): MarkdownDocumentStatus {
  const raw = stringValue(value, 'draft').trim().toLowerCase();
  if (raw === 'review' || raw === 'needs review') return 'needs-review';
  if (raw === 'current' || raw === 'in-use') return 'active';
  if (raw === 'done' || raw === 'complete' || raw === 'approved') return 'aligned';
  if (raw in markdownDocumentStatusLabels) return raw as MarkdownDocumentStatus;
  return 'draft';
}

function normalizeMarkdownDocumentPurpose(value: unknown): MarkdownDocumentPurpose {
  const raw = stringValue(value, 'reference').trim().toLowerCase();
  if (raw === 'security-audit' || raw === 'review') return 'audit';
  if (raw === 'testing' || raw === 'test') return 'qa';
  if (['architecture', 'setup', 'roadmap', 'audit', 'qa', 'security', 'runbook', 'decision', 'reference', 'other'].includes(raw)) {
    return raw as MarkdownDocumentPurpose;
  }
  return 'reference';
}

function normalizeMarkdownDocumentSensitivity(value: unknown): MarkdownDocumentSensitivity | undefined {
  const raw = stringValue(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'sanitized' || raw === 'redacted' || raw === 'secret-free') return 'secret-free-summary';
  if (['public', 'internal', 'private', 'secret-free-summary'].includes(raw)) return raw as MarkdownDocumentSensitivity;
  return undefined;
}

function normalizeMarkdownResourceType(value: unknown): MarkdownResourceType {
  const raw = stringValue(value, 'other').trim().toLowerCase();
  if (raw === 'docs' || raw === 'documentation' || raw === 'official') return 'official-docs';
  if (raw === 'api' || raw === 'reference-api') return 'api-reference';
  if (raw === 'design' || raw === 'ui' || raw === 'ux') return 'design-guide';
  if (raw === 'repository' || raw === 'github') return 'repo';
  if (raw === 'internal') return 'internal-doc';
  if (['official-docs', 'standard', 'design-guide', 'repo', 'api-reference', 'internal-doc', 'tooling', 'other'].includes(raw)) return raw as MarkdownResourceType;
  return 'other';
}

function normalizeAgentUseLevel(value: unknown): AgentUseLevel | undefined {
  const raw = stringValue(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'must-use' || raw === 'must use' || raw === 'required-context') return 'required';
  if (raw === 'recommended-context' || raw === 'suggested') return 'recommended';
  if (['required', 'recommended', 'reference'].includes(raw)) return raw as AgentUseLevel;
  return undefined;
}

function normalizeProjectWorkItemStatus(value: unknown): ProjectWorkItemStatus {
  const raw = stringValue(value, 'todo').trim().toLowerCase();
  if (raw === 'not-started' || raw === 'backlog') return 'todo';
  if (raw === 'active' || raw === 'started' || raw === 'current') return 'in-progress';
  if (raw === 'in progress') return 'in-progress';
  if (raw === 'needs-review' || raw === 'in-review' || raw === 'signoff') return 'review';
  if (raw === 'complete' || raw === 'completed' || raw === 'passed') return 'done';
  if (raw in projectWorkItemStatusLabels) return raw as ProjectWorkItemStatus;
  return 'todo';
}

function normalizeProjectWorkItemType(value: unknown): ProjectWorkItemType {
  const raw = stringValue(value, 'task').trim().toLowerCase();
  if (raw === 'api' || raw === 'database') return 'schema';
  if (raw === 'docs' || raw === 'document') return 'doc';
  if (raw === 'wordpress' || raw === 'plugin') return 'integration';
  if (['mcp', 'audit', 'schema', 'security', 'qa', 'doc', 'roadmap', 'feature', 'integration', 'task'].includes(raw)) {
    return raw as ProjectWorkItemType;
  }
  return 'task';
}

function normalizeProjectWorkItemPriority(value: unknown): ProjectWorkItemPriority {
  const raw = stringValue(value, 'medium').trim().toLowerCase();
  if (raw === 'p0' || raw === 'blocker') return 'critical';
  if (raw === 'p1') return 'high';
  if (raw === 'p2') return 'medium';
  if (raw === 'p3') return 'low';
  if (raw in projectWorkItemPriorityLabels) return raw as ProjectWorkItemPriority;
  return 'medium';
}

function normalizeProjectQueueViewStage(value: unknown): ProjectQueueViewStage | 'all' {
  const raw = stringValue(value, 'all').trim().toLowerCase();
  if (raw === 'test' || raw === 'test/retest' || raw === 'retest') return 'qa';
  if (raw === 'review') return 'signoff';
  if (raw === 'scope' || raw === 'scope-decision') return 'slimming';
  if (['blocked', 'qa', 'mapping', 'signoff', 'ready', 'slimming', 'backlog'].includes(raw)) {
    return raw as ProjectQueueViewStage;
  }
  return 'all';
}

function normalizeProjectQueueViewType(value: unknown): ProjectQueueViewType | 'all' {
  const raw = stringValue(value, 'all').trim().toLowerCase();
  if (raw === 'feature-map' || raw === 'feature queue') return 'feature-derived';
  if (raw === 'api' || raw === 'database') return 'schema';
  if (raw === 'docs' || raw === 'document') return 'doc';
  if (raw === 'wordpress' || raw === 'plugin') return 'integration';
  if (['mcp', 'audit', 'schema', 'security', 'qa', 'doc', 'roadmap', 'feature', 'feature-derived', 'integration', 'task'].includes(raw)) {
    return raw as ProjectQueueViewType;
  }
  return 'all';
}

function normalizeProjectBatchTemplateSource(value: unknown): ProjectBatchTemplateSource {
  const raw = stringValue(value, 'markdown-documents').trim().toLowerCase();
  if (raw === 'docs' || raw === 'documents' || raw === 'markdown' || raw === 'md-docs') return 'markdown-documents';
  if (raw === 'qa' || raw === 'tests' || raw === 'test') return 'qa-items';
  if (raw === 'roadmap' || raw === 'roadmap-item') return 'roadmap-items';
  if (raw === 'roadmap-source' || raw === 'roadmap-sources') return 'roadmap-sources';
  if (raw === 'feature' || raw === 'features') return 'features';
  if (raw in projectBatchTemplateSourceLabels) return raw as ProjectBatchTemplateSource;
  return 'markdown-documents';
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

function normalizeMVPDecision(value: unknown): MVPDecision | undefined {
  const raw = stringValue(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'remove' || raw === 'removed') return 'cut';
  if (raw === 'review' || raw === 'needs review') return 'needs-review';
  if (raw in mvpDecisionLabels) return raw as MVPDecision;
  return undefined;
}

function normalizeMVPSignoff(value: unknown): MVPSignoffStatus | undefined {
  const raw = stringValue(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'review' || raw === 'in review') return 'in-review';
  if (raw === 'approve' || raw === 'signed-off' || raw === 'signed off') return 'approved';
  if (raw === 'reject') return 'rejected';
  if (raw in mvpSignoffLabels) return raw as MVPSignoffStatus;
  return undefined;
}

function normalizeMVPCutSafety(value: unknown): MVPCutSafety | undefined {
  if (typeof value === 'boolean') return value ? 'safe-to-cut' : 'needs-review';
  const raw = stringValue(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'safe' || raw === 'safe to cut') return 'safe-to-cut';
  if (raw === 'do not cut' || raw === 'do-not-cut' || raw === 'do not cut yet') return 'do-not-cut-yet';
  if (raw === 'review' || raw === 'needs review') return 'needs-review';
  if (raw in mvpCutSafetyLabels) return raw as MVPCutSafety;
  return undefined;
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

function mapMarkdownDocuments(value: unknown): MarkdownDocument[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((doc, index) => {
    const title = stringValue(doc.title, stringValue(doc.name, `Markdown document ${index + 1}`));
    const path = stringValue(doc.path, stringValue(doc.file, stringValue(doc.fileRef)));
    return {
      id: stringValue(doc.id, `md-doc-${index + 1}`),
      title,
      path,
      purpose: normalizeMarkdownDocumentPurpose(doc.purpose ?? doc.type),
      status: normalizeMarkdownDocumentStatus(doc.status),
      summary: stringValue(doc.summary, stringValue(doc.description, Array.isArray(doc.notes) ? '' : stringValue(doc.notes))),
      repositoryIds: stringArray(doc.repositoryIds ?? doc.repositories),
      featureIds: stringArray(doc.featureIds ?? doc.features ?? doc.linkedFeatureIds),
      sourceSection: flexibleValue(doc, ['sourceSection', 'section', 'heading']),
      owner: stringValue(doc.owner),
      sensitivity: normalizeMarkdownDocumentSensitivity(doc.sensitivity ?? doc.visibility),
      lastReviewedAt: flexibleValue(doc, ['lastReviewedAt', 'reviewedAt', 'lastReviewed']),
      updatedAt: flexibleValue(doc, ['updatedAt', 'modifiedAt', 'date']),
      tags: stringArray(doc.tags),
      alignmentTargets: stringArray(doc.alignmentTargets ?? doc.alignsTo ?? doc.targets),
      auditFindings: stringArray(doc.auditFindings ?? doc.findings),
      appliesTo: stringArray(doc.appliesTo ?? doc.areas ?? doc.contextAreas),
      requiredChecks: stringArray(doc.requiredChecks ?? doc.checks ?? doc.gates),
      agentUseLevel: normalizeAgentUseLevel(doc.agentUseLevel ?? doc.useLevel ?? doc.agentUse),
      resources: mapMarkdownDocumentResources(doc.resources ?? doc.resourceLinks ?? doc.links),
      bodyDraft: stringValue(doc.bodyDraft, stringValue(doc.body, stringValue(doc.content))),
    };
  }).filter((doc) => doc.title && doc.path);
}

function mapMarkdownDocumentResources(value: unknown): MarkdownDocumentResource[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index): MarkdownDocumentResource | undefined => {
    if (typeof item === 'string') {
      return {
        id: `resource-${index + 1}`,
        title: item,
        url: item,
        type: 'other' as MarkdownResourceType,
      };
    }
    if (!isRecord(item)) return undefined;
    const url = flexibleValue(item, ['url', 'href', 'link']);
    const title = stringValue(item.title, stringValue(item.name, url || `Resource ${index + 1}`));
    if (!url && !title) return undefined;
    return {
      id: stringValue(item.id, `resource-${index + 1}`),
      title,
      url,
      type: normalizeMarkdownResourceType(item.type ?? item.kind),
      tags: stringArray(item.tags),
      notes: stringValue(item.notes, stringValue(item.description)),
    };
  }).filter((item): item is MarkdownDocumentResource => Boolean(item?.title || item?.url));
}

function mapProjectWorkItems(value: unknown): ProjectWorkItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => {
    const title = stringValue(item.title, stringValue(item.name, `Work item ${index + 1}`));
    return {
      id: stringValue(item.id, `work-${index + 1}`),
      title,
      type: normalizeProjectWorkItemType(item.type),
      status: normalizeProjectWorkItemStatus(item.status),
      priority: normalizeProjectWorkItemPriority(item.priority),
      summary: stringValue(item.summary, stringValue(item.description, stringValue(item.notes))),
      nextAction: flexibleValue(item, ['nextAction', 'Next Action']),
      owner: stringValue(item.owner),
      due: stringValue(item.due),
      source: stringValue(item.source),
      sourceId: stringValue(item.sourceId),
      sourcePath: stringValue(item.sourcePath, stringValue(item.path)),
      featureIds: stringArray(item.featureIds ?? item.features ?? item.linkedFeatureIds),
      repositoryIds: stringArray(item.repositoryIds ?? item.repositories),
      markdownDocumentIds: stringArray(item.markdownDocumentIds ?? item.documentIds ?? item.docs),
      qaItemIds: stringArray(item.qaItemIds ?? item.qaIds),
      roadmapItemIds: stringArray(item.roadmapItemIds ?? item.roadmapIds),
      tags: stringArray(item.tags),
      acceptanceCriteria: stringArray(item.acceptanceCriteria ?? item.criteria),
      createdAt: stringValue(item.createdAt, stringValue(item.date)),
      updatedAt: stringValue(item.updatedAt),
      progressLog: mapProgressLog(item.progressLog ?? item.history),
    };
  }).filter((item) => item.title && item.summary);
}

function mapProjectQueueViews(value: unknown): ProjectQueueView[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((view, index) => {
    const filters = isRecord(view.filters) ? view.filters : view;
    const priority: ProjectWorkItemPriority | 'all' = filters.priority ? normalizeProjectWorkItemPriority(filters.priority) : 'all';
    const name = stringValue(view.name, stringValue(view.title, `Queue view ${index + 1}`));
    return {
      id: stringValue(view.id, `queue-view-${index + 1}`),
      name,
      summary: stringValue(view.summary, stringValue(view.description, 'Reusable queue filter view.')),
      filters: {
        stage: normalizeProjectQueueViewStage(filters.stage),
        type: normalizeProjectQueueViewType(filters.type),
        owner: stringValue(filters.owner),
        priority,
        source: stringValue(filters.source),
        search: stringValue(filters.search),
      },
      owner: stringValue(view.owner),
      cadence: stringValue(view.cadence),
      outcome: stringValue(view.outcome),
      source: stringValue(view.source),
      createdAt: stringValue(view.createdAt, stringValue(view.date)),
      updatedAt: stringValue(view.updatedAt),
    };
  }).filter((view) => view.name && view.summary);
}

function mapProjectBatchTemplateRuns(value: unknown): ProjectBatchTemplateRun[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((run, index) => {
    const createdWorkItemIds = stringArray(run.createdWorkItemIds ?? run.workItemIds);
    const sourceTitles = stringArray(run.sourceTitles ?? run.sources);
    return {
      id: stringValue(run.id, `batch-template-run-${index + 1}`),
      ranAt: stringValue(run.ranAt, stringValue(run.createdAt, stringValue(run.date))),
      sourceCount: numberValue(run.sourceCount, sourceTitles.length),
      createdWorkItemCount: numberValue(run.createdWorkItemCount, createdWorkItemIds.length),
      createdWorkItemIds,
      sourceTitles,
      summary: stringValue(run.summary, 'Batch template run.'),
      outcomeScore: numberValue(run.outcomeScore, 0) || undefined,
      outcomeNotes: stringValue(run.outcomeNotes, stringValue(run.notes)),
      reviewedAt: stringValue(run.reviewedAt),
    };
  }).filter((run) => run.ranAt && run.summary);
}

function mapProjectBatchTemplates(value: unknown): ProjectBatchTemplate[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((template, index) => {
    const filters = isRecord(template.filters) ? template.filters : {};
    const documentPurpose: MarkdownDocumentPurpose | 'all' = filters.documentPurpose ? normalizeMarkdownDocumentPurpose(filters.documentPurpose) : 'all';
    const documentStatus: MarkdownDocumentStatus | 'all' = filters.documentStatus ? normalizeMarkdownDocumentStatus(filters.documentStatus) : 'all';
    const qaStatus: QAItemStatus | 'all' = filters.qaStatus ? normalizeQAStatus(filters.qaStatus) : 'all';
    const qaPriority: QAItemPriority | 'all' = filters.qaPriority ? normalizeQAPriority(filters.qaPriority) : 'all';
    const featureDisposition: FeatureDisposition | 'all' = filters.featureDisposition ? normalizeDisposition(filters.featureDisposition) : 'all';
    const name = stringValue(template.name, stringValue(template.title, `Batch template ${index + 1}`));
    return {
      id: stringValue(template.id, `batch-template-${index + 1}`),
      name,
      summary: stringValue(template.summary, stringValue(template.description, 'Reusable batch work-item template.')),
      sourceType: normalizeProjectBatchTemplateSource(template.sourceType ?? template.sourceKind ?? template.source),
      workItemType: normalizeProjectWorkItemType(template.workItemType ?? template.type),
      priority: normalizeProjectWorkItemPriority(template.priority),
      titlePrefix: stringValue(template.titlePrefix, stringValue(template.prefix, name)),
      nextAction: flexibleValue(template, ['nextAction', 'Next Action'], 'Review the source record and complete the prepared work item.'),
      owner: stringValue(template.owner),
      source: stringValue(template.source),
      tags: stringArray(template.tags),
      filters: {
        documentPurpose,
        documentStatus,
        alignmentTarget: stringValue(filters.alignmentTarget),
        qaStatus,
        qaPriority,
        roadmapStatus: stringValue(filters.roadmapStatus),
        featureReleaseId: stringValue(filters.featureReleaseId, stringValue(filters.releaseId)),
        featureDisposition,
        tag: stringValue(filters.tag),
        sourceIncludes: stringValue(filters.sourceIncludes),
      },
      cadence: stringValue(template.cadence),
      outcome: stringValue(template.outcome),
      archivedAt: stringValue(template.archivedAt),
      lastRunAt: stringValue(template.lastRunAt),
      lastRunItemCount: numberValue(template.lastRunItemCount, 0),
      lastRunSourceCount: numberValue(template.lastRunSourceCount, 0),
      lastRunWorkItemIds: stringArray(template.lastRunWorkItemIds),
      runHistory: mapProjectBatchTemplateRuns(template.runHistory),
      createdAt: stringValue(template.createdAt, stringValue(template.date)),
      updatedAt: stringValue(template.updatedAt),
    };
  }).filter((template) => template.name && template.summary);
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
      mvpDecision: normalizeMVPDecision(feature.mvpDecision ?? feature.finalMvpDecision),
      mvpNextAction: flexibleValue(feature, ['mvpNextAction', 'nextAction', 'Next Action']),
      mvpOwner: flexibleValue(feature, ['mvpOwner', 'owner', 'Owner']),
      mvpStatus: flexibleValue(feature, ['mvpStatus', 'status', 'Status']),
      mvpSignoff: normalizeMVPSignoff(feature.mvpSignoff ?? feature.signoff ?? feature.signOff),
      mvpCutSafety: booleanValue(feature.doNotCut)
        ? 'do-not-cut-yet'
        : normalizeMVPCutSafety(feature.mvpCutSafety ?? feature.safeToCut),
      mvpProgressLog: mapProgressLog(feature.mvpProgressLog ?? feature.progressLog ?? feature.history),
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

function normalizeTestingRuntimeStatus(value: unknown): TestingRuntimeStatus {
  const raw = stringValue(value, 'needs-confirmation').trim().toLowerCase();
  if (['available', 'missing', 'needs-confirmation', 'error'].includes(raw)) return raw as TestingRuntimeStatus;
  if (raw === 'ready' || raw === 'ok' || raw === 'present') return 'available';
  if (raw === 'unknown' || raw === 'confirm') return 'needs-confirmation';
  return 'needs-confirmation';
}

function normalizeTestingToolCategory(value: unknown): TestingToolCategory {
  const raw = stringValue(value, 'other').trim().toLowerCase();
  if (['runtime', 'package-manager', 'browser', 'unit-test', 'e2e-test', 'wordpress', 'docker', 'quality', 'database', 'other'].includes(raw)) {
    return raw as TestingToolCategory;
  }
  return 'other';
}

function mapTestingRuntimeScan(value: unknown): ProjectTestingRuntimeScan | undefined {
  if (!isRecord(value)) return undefined;
  return {
    schemaVersion: 'project-analysis.testing-runtime.v1',
    scannerVersion: stringValue(value.scannerVersion, 'unknown'),
    scannedAt: stringValue(value.scannedAt),
    workspaceRoot: stringValue(value.workspaceRoot),
    mapId: stringValue(value.mapId),
    tools: Array.isArray(value.tools)
      ? value.tools.filter(isRecord).map((tool, index) => ({
        id: stringValue(tool.id, `tool-${index + 1}`),
        label: stringValue(tool.label, stringValue(tool.name, `Tool ${index + 1}`)),
        category: normalizeTestingToolCategory(tool.category),
        status: normalizeTestingRuntimeStatus(tool.status),
        summary: stringValue(tool.summary, stringValue(tool.description)),
        version: stringValue(tool.version),
        command: stringValue(tool.command),
        path: stringValue(tool.path),
      }))
      : [],
    endpoints: Array.isArray(value.endpoints)
      ? value.endpoints.filter(isRecord).map((endpoint, index) => ({
        id: stringValue(endpoint.id, `endpoint-${index + 1}`),
        label: stringValue(endpoint.label, stringValue(endpoint.name, `Endpoint ${index + 1}`)),
        url: stringValue(endpoint.url),
        status: normalizeTestingRuntimeStatus(endpoint.status),
        summary: stringValue(endpoint.summary, stringValue(endpoint.description)),
        statusCode: numberValue(endpoint.statusCode, 0) || undefined,
      })).filter((endpoint) => endpoint.url)
      : [],
    repositories: Array.isArray(value.repositories)
      ? value.repositories.filter(isRecord).map((repo, index) => ({
        repositoryId: stringValue(repo.repositoryId, stringValue(repo.id, `repo-${index + 1}`)),
        name: stringValue(repo.name, stringValue(repo.repositoryId, `Repository ${index + 1}`)),
        path: stringValue(repo.path),
        packageManager: stringValue(repo.packageManager),
        scripts: stringArray(repo.scripts),
        tools: stringArray(repo.tools),
      })).filter((repo) => repo.repositoryId)
      : [],
    notes: stringArray(value.notes),
  };
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
      markdownDocuments: mapMarkdownDocuments(value.markdownDocuments ?? value.markdownDocs ?? value.documents ?? value.docs),
      workItems: mapProjectWorkItems(value.workItems ?? value.executionItems ?? value.tasks),
      queueViews: mapProjectQueueViews(value.queueViews ?? value.executionViews ?? value.savedQueueViews),
      batchTemplates: mapProjectBatchTemplates(value.batchTemplates ?? value.workRunTemplates ?? value.executionTemplates),
      doNotCutBeforeChecks: stringArray(value.doNotCutBeforeChecks),
      openQuestions: stringArray(value.openQuestionsForReview),
      firstSlimmingCandidates: mapSlimmingCandidates(value.firstSlimmingCandidates),
      testingRuntime: mapTestingRuntimeScan(value.testingRuntime),
    };
    if (model.features.length === 0) throw new Error('The feature-file map has no features.');
    return model;
  }

  const maybeModel = value as Partial<ProjectAnalysisModel>;
  if (Array.isArray(maybeModel.features) && Array.isArray(maybeModel.repositories)) {
    return {
      ...maybeModel,
      sourceLabel,
      markdownDocuments: mapMarkdownDocuments(
        value.markdownDocuments ?? value.markdownDocs ?? value.documents ?? value.docs ?? maybeModel.markdownDocuments,
      ),
      workItems: mapProjectWorkItems(value.workItems ?? value.executionItems ?? value.tasks ?? maybeModel.workItems),
      queueViews: mapProjectQueueViews(value.queueViews ?? value.executionViews ?? value.savedQueueViews ?? maybeModel.queueViews),
      batchTemplates: mapProjectBatchTemplates(value.batchTemplates ?? value.workRunTemplates ?? value.executionTemplates ?? maybeModel.batchTemplates),
    } as ProjectAnalysisModel;
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
  markdownDocuments: [
    {
      id: 'doc-launch-setup',
      title: 'Launch Setup Notes',
      path: 'docs/setup/LAUNCH-SETUP.md',
      purpose: 'setup',
      status: 'active',
      summary: 'Tracks environment setup, private database assumptions, and checks needed before launch work.',
      repositoryIds: ['customer-portal', 'automation-service'],
      featureIds: ['brief-builder', 'asset-review'],
      sensitivity: 'secret-free-summary',
      lastReviewedAt: '2026-08-20',
      tags: ['setup', 'database', 'release'],
      alignmentTargets: ['MVP readiness', 'QA smoke checks'],
      auditFindings: ['Confirm the private database setup notes match the current local environment before release.'],
      appliesTo: ['environment', 'database', 'release-readiness'],
      requiredChecks: ['Confirm environment variables before launch checks.'],
      agentUseLevel: 'required',
      resources: [
        {
          id: 'resource-launch-runbook',
          title: 'Launch environment runbook',
          url: 'docs/setup/LAUNCH-SETUP.md',
          type: 'internal-doc',
          tags: ['setup', 'release'],
          notes: 'Use this as required local context before changing launch setup assumptions.',
        },
      ],
    },
  ],
  workItems: [
    {
      id: 'work-mcp-context-pack',
      title: 'Define MCP context pack contract',
      type: 'mcp',
      status: 'ready',
      priority: 'high',
      summary: 'Draft the first read-only context pack contract before adding external agent access.',
      nextAction: 'List required brand, ICP, research, link, and citation fields for the first MCP tool response.',
      source: 'Sample planning item',
      featureIds: ['brief-builder'],
      repositoryIds: ['customer-portal', 'automation-service'],
      tags: ['mcp-platform-mvp', 'context-pack'],
      acceptanceCriteria: [
        'Request and response fields are named.',
        'Permission and entitlement checks are identified.',
      ],
      createdAt: '2026-08-20',
    },
  ],
  queueViews: [
    {
      id: 'queue-view-mcp-platform',
      name: 'MCP Platform',
      summary: 'Reusable view for platform work that shapes external agent access and context-pack contracts.',
      filters: {
        type: 'mcp',
        priority: 'high',
        source: 'Sample planning item',
      },
      owner: 'Platform',
      cadence: 'Weekly',
      outcome: 'Keep context-pack and permission work grouped before opening integrations.',
      source: 'Sample planning item',
      createdAt: '2026-08-20',
    },
  ],
  batchTemplates: [
    {
      id: 'batch-template-setup-doc-review',
      name: 'Setup Doc Review Run',
      summary: 'Create review tasks from setup documents that inform release readiness and environment assumptions.',
      sourceType: 'markdown-documents',
      workItemType: 'doc',
      priority: 'medium',
      titlePrefix: 'Review setup doc',
      nextAction: 'Confirm the setup document still matches the current working environment and note any updates.',
      owner: 'Platform',
      source: 'Sample batch template',
      tags: ['batch-template', 'setup-docs'],
      filters: {
        documentPurpose: 'setup',
        documentStatus: 'active',
        alignmentTarget: 'MVP readiness',
      },
      cadence: 'Before release checks',
      outcome: 'Setup assumptions are reviewed before launch decisions.',
      createdAt: '2026-08-20',
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
