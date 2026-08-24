import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  ListChecks,
  Play,
  Plus,
  RotateCcw,
  Rocket,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  dispositionColors,
  dispositionLabels,
  fileStatusColors,
  fileStatusLabels,
  markdownDocumentPurposeLabels,
  markdownDocumentStatusLabels,
  mvpDecisionLabels,
  mvpSignoffLabels,
  projectBatchTemplateSourceLabels,
  projectWorkItemPriorityLabels,
  projectWorkItemStatusColors,
  projectWorkItemStatusLabels,
  projectWorkItemTypeLabels,
  qaPriorityLabels,
  qaStatusColors,
  qaStatusLabels,
  type FileReferenceStatus,
  type FeatureDisposition,
  type MVPDecision,
  type MarkdownDocument,
  type MarkdownDocumentPurpose,
  type MarkdownDocumentStatus,
  type ProductFeature,
  type ProjectBatchTemplate,
  type ProjectBatchTemplateRun,
  type ProjectBatchTemplateSource,
  type ProjectAnalysisModel,
  type ProjectProgressEntry,
  type ProjectQueueView,
  type ProjectQueueViewStage,
  type ProjectQueueViewType,
  type ProjectWorkItem,
  type ProjectWorkItemPriority,
  type ProjectWorkItemStatus,
  type ProjectWorkItemType,
  type QAItemPriority,
  type QAItem,
  type QAItemStatus,
  type RoadmapItem,
  type RoadmapSignal,
} from '../data/projectAnalysis';

type ExecutionStage = ProjectQueueViewStage;

interface ProjectMVPExecutionQueueProps {
  model: ProjectAnalysisModel;
  features: ProductFeature[];
  onSelectFeature?: (featureId: string) => void;
  onUpdateFeature?: (featureId: string, updates: Partial<ProductFeature>) => void;
  onAddWorkItem?: (item: ProjectWorkItem) => void;
  onUpdateWorkItem?: (itemId: string, updates: Partial<ProjectWorkItem>) => void;
  onAddQueueView?: (view: ProjectQueueView) => void;
  onAddBatchTemplate?: (template: ProjectBatchTemplate) => void;
  onUpdateBatchTemplate?: (templateId: string, updates: Partial<ProjectBatchTemplate>) => void;
  onDeleteBatchTemplate?: (templateId: string) => void;
}

interface FeatureFileReference {
  path: string;
  status: FileReferenceStatus;
}

interface ExecutionItem {
  kind: 'feature';
  feature: ProductFeature;
  stage: ExecutionStage;
  action: string;
  reason: string;
  qaItems: QAItem[];
  fileRefs: FeatureFileReference[];
  blockingCount: number;
  openQACount: number;
  mappingGapCount: number;
  dependsOnCount: number;
  supportsCount: number;
  priority: number;
}

interface DedicatedWorkQueueItem {
  kind: 'work-item';
  workItem: ProjectWorkItem;
  stage: ExecutionStage;
  action: string;
  reason: string;
  priority: number;
}

type WorkQueueItem = ExecutionItem | DedicatedWorkQueueItem;
type QueueItemTypeFilter = ProjectQueueViewType;
type BatchTemplateRecommendationLabel = 'Run Template' | 'Score Latest Run' | 'Reuse' | 'Watch' | 'No New Work' | 'Revise' | 'Review' | 'Archived';
type BatchTemplateRecommendationTone = 'ready' | 'review' | 'watch' | 'revise' | 'archived';

interface BatchTemplateRecommendation {
  label: BatchTemplateRecommendationLabel;
  summary: string;
  metric: string;
  tone: BatchTemplateRecommendationTone;
}

interface BatchTemplateRunComparison {
  latestRun: ProjectBatchTemplateRun;
  previousRun: ProjectBatchTemplateRun;
  createdDelta: number;
  sourceDelta: number;
  scoreDelta: number;
}

interface BatchTemplateSourceRecord {
  sourceType: ProjectBatchTemplateSource;
  id: string;
  title: string;
  summary: string;
  path?: string;
  featureIds?: string[];
  repositoryIds?: string[];
  markdownDocumentIds?: string[];
  qaItemIds?: string[];
  roadmapItemIds?: string[];
  tags?: string[];
}

const all = 'all';
const featureDerivedType = 'feature-derived';
const workItemStatusOrder: ProjectWorkItemStatus[] = ['blocked', 'in-progress', 'review', 'ready', 'todo', 'deferred', 'done'];
const workItemTypeOrder: ProjectWorkItemType[] = ['mcp', 'audit', 'schema', 'security', 'qa', 'doc', 'roadmap', 'feature', 'integration', 'task'];
const queueItemTypeOrder: QueueItemTypeFilter[] = [featureDerivedType, ...workItemTypeOrder];
const workItemPriorityOrder: ProjectWorkItemPriority[] = ['critical', 'high', 'medium', 'low'];
const batchTemplateSourceOrder: ProjectBatchTemplateSource[] = ['markdown-documents', 'qa-items', 'roadmap-items', 'roadmap-sources', 'features'];
const batchTemplateRecommendationOrder: BatchTemplateRecommendationLabel[] = ['Score Latest Run', 'Reuse', 'Watch', 'No New Work', 'Revise', 'Review', 'Run Template', 'Archived'];
const markdownDocumentPurposeOrder: MarkdownDocumentPurpose[] = ['setup', 'architecture', 'security', 'audit', 'roadmap', 'qa', 'runbook', 'decision', 'reference', 'other'];
const markdownDocumentStatusOrder: MarkdownDocumentStatus[] = ['draft', 'active', 'needs-review', 'aligned', 'stale', 'archived'];
const qaPriorityOrder: QAItemPriority[] = ['critical', 'high', 'medium', 'low', 'support', 'conditional', 'future'];
const featureDispositionOrder: FeatureDisposition[] = ['keep', 'simplify', 'hide', 'gate', 'consolidate', 'defer', 'remove', 'remove-later', 'new'];
const blockingQAStatuses = new Set<QAItemStatus>(['blocked', 'failed']);
const openQAStatuses = new Set<QAItemStatus>(['not-started', 'ready', 'in-progress', 'partial', 'needs-retest']);
const mvpDispositions = new Set(['keep', 'simplify', 'hide', 'gate', 'consolidate', 'new']);
const stageOrder: Record<ExecutionStage, number> = {
  blocked: 0,
  qa: 1,
  mapping: 2,
  signoff: 3,
  ready: 4,
  slimming: 5,
  backlog: 6,
};

const stageLabels: Record<ExecutionStage, string> = {
  blocked: 'Blocked',
  qa: 'Test / retest',
  mapping: 'Map files',
  signoff: 'Review',
  ready: 'Ready',
  slimming: 'Scope decision',
  backlog: 'Backlog',
};

const stageColors: Record<ExecutionStage, string> = {
  blocked: '#D13438',
  qa: '#D83B01',
  mapping: '#8764B8',
  signoff: '#0078D4',
  ready: '#107C10',
  slimming: '#C19C00',
  backlog: '#605E5C',
};

function featureFiles(feature: ProductFeature): FeatureFileReference[] {
  return [
    ...(feature.appFiles ?? []),
    ...(feature.pluginFiles ?? []),
    ...(feature.playgroundFiles ?? []),
    ...(feature.privateDataFiles ?? []),
    ...(feature.qaEvidenceFiles ?? []),
  ].map((path) => ({ path, status: feature.fileStatuses?.[path] ?? 'mapped' }));
}

function decisionForFeature(feature: ProductFeature): MVPDecision {
  if (feature.mvpDecision) return feature.mvpDecision;
  if (feature.disposition === 'keep' || feature.disposition === 'new') return 'keep';
  if (['simplify', 'hide', 'gate', 'consolidate'].includes(feature.disposition)) return 'simplify';
  if (feature.disposition === 'remove' || feature.disposition === 'remove-later') return 'cut';
  return 'defer';
}

function makeProgressEntry(body: string, status: string): ProjectProgressEntry {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `work-queue-${crypto.randomUUID().slice(0, 8)}`
    : `work-queue-${Date.now().toString(36)}`;

  return {
    id,
    createdAt: new Date().toISOString(),
    body,
    status,
    author: 'Project Work Queue',
  };
}

function executionItemForFeature(model: ProjectAnalysisModel, feature: ProductFeature): ExecutionItem {
  const qaItems = (model.qaItems ?? []).filter((item) => item.featureIds.includes(feature.id));
  const fileRefs = featureFiles(feature);
  const blockingCount = qaItems.filter((item) => blockingQAStatuses.has(item.status)).length;
  const openQACount = qaItems.filter((item) => openQAStatuses.has(item.status)).length;
  const mappingGaps = fileRefs.filter((file) => ['needs-review', 'planned', 'orphan'].includes(file.status));
  const dependsOnCount = model.dependencies.filter((dependency) => dependency.fromFeatureId === feature.id).length;
  const supportsCount = model.dependencies.filter((dependency) => dependency.toFeatureId === feature.id).length;
  const isMvpCandidate = feature.releaseId === 'mvp' && mvpDispositions.has(feature.disposition);
  const decision = decisionForFeature(feature);
  const doNotCut = new Set(model.doNotCutBeforeChecks ?? []).has(feature.id);
  const valueScore = feature.value * 2 - feature.effort - feature.risk + supportsCount - dependsOnCount;

  let stage: ExecutionStage = 'ready';
  let action = 'No active work remains. Keep this ready for launch review.';
  let reason = 'All mapped QA and file signals look ready.';

  if (decision === 'cut' || feature.disposition === 'remove' || feature.disposition === 'remove-later') {
    stage = doNotCut ? 'blocked' : 'slimming';
    action = doNotCut ? 'Resolve do-not-cut dependency before removing this from MVP.' : 'Confirm this can stay out of the MVP branch.';
    reason = doNotCut ? 'This item is marked do not cut yet.' : 'The current MVP decision or disposition points away from launch scope.';
  } else if (!isMvpCandidate || decision === 'defer') {
    stage = decision === 'defer' ? 'slimming' : 'backlog';
    action = decision === 'defer' ? 'Keep deferred unless it unblocks a launch feature.' : 'Leave in roadmap/backlog until the MVP queue is clear.';
    reason = decision === 'defer' ? 'The feature is explicitly deferred.' : 'The feature is not currently mapped as an MVP candidate.';
  } else if (blockingCount > 0) {
    stage = 'blocked';
    action = 'Resolve failed or blocked QA before branch slimming continues.';
    reason = `${blockingCount} blocking QA item${blockingCount === 1 ? '' : 's'} linked to this feature.`;
  } else if (qaItems.length === 0) {
    stage = 'qa';
    action = 'Create at least one manual or automated release-readiness QA item.';
    reason = 'No QA item is mapped to this feature yet.';
  } else if (openQACount > 0) {
    stage = 'qa';
    action = 'Run or retest open QA, then attach evidence and update status.';
    reason = `${openQACount} open QA item${openQACount === 1 ? '' : 's'} still need attention.`;
  } else if (mappingGaps.length > 0 || fileRefs.length === 0) {
    stage = 'mapping';
    action = 'Confirm mapped files and resolve planned, orphaned, or needs-review references.';
    reason = fileRefs.length === 0 ? 'No file references are mapped yet.' : `${mappingGaps.length} mapped file reference${mappingGaps.length === 1 ? '' : 's'} need review.`;
  } else if (feature.mvpSignoff !== 'approved') {
    stage = 'signoff';
    action = 'Review launch value, confirm scope, and approve or revise the MVP decision.';
    reason = 'QA and mapping are present, but MVP sign-off is not approved yet.';
  }

  return {
    kind: 'feature',
    feature,
    stage,
    action: feature.mvpNextAction || action,
    reason,
    qaItems,
    fileRefs,
    blockingCount,
    openQACount,
    mappingGapCount: mappingGaps.length + (fileRefs.length === 0 ? 1 : 0),
    dependsOnCount,
    supportsCount,
    priority: stageOrder[stage] * 100 - valueScore,
  };
}

function stageForWorkItem(status: ProjectWorkItemStatus): ExecutionStage {
  if (status === 'blocked') return 'blocked';
  if (status === 'in-progress') return 'qa';
  if (status === 'review') return 'signoff';
  if (status === 'ready' || status === 'todo') return 'backlog';
  if (status === 'deferred') return 'slimming';
  return 'ready';
}

function workItemPriorityScore(priority: ProjectWorkItemPriority): number {
  if (priority === 'critical') return -40;
  if (priority === 'high') return -25;
  if (priority === 'medium') return -10;
  return 0;
}

function queueItemTitle(item: WorkQueueItem): string {
  return item.kind === 'feature' ? item.feature.name : item.workItem.title;
}

function queueItemType(item: WorkQueueItem): QueueItemTypeFilter {
  return item.kind === 'feature' ? featureDerivedType : item.workItem.type;
}

function queueItemTypeLabel(type: QueueItemTypeFilter): string {
  return type === featureDerivedType ? 'Feature queue' : projectWorkItemTypeLabels[type];
}

function queueItemOwner(item: WorkQueueItem): string {
  const owner = item.kind === 'feature' ? item.feature.mvpOwner : item.workItem.owner;
  return owner?.trim() || 'Unassigned';
}

function queueItemPriority(item: WorkQueueItem): ProjectWorkItemPriority {
  if (item.kind === 'work-item') return item.workItem.priority;
  if (item.stage === 'blocked') return 'critical';
  if (item.stage === 'qa' || item.stage === 'mapping' || item.stage === 'signoff') return 'high';
  if (item.stage === 'slimming') return 'medium';
  return 'low';
}

function queueItemSource(item: WorkQueueItem): string {
  if (item.kind === 'work-item') return item.workItem.source?.trim() || item.workItem.sourcePath?.trim() || 'Work Queue';
  return 'Feature map';
}

function uniqueSortedValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function textMatches(value: string, query?: string): boolean {
  if (!query?.trim()) return true;
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function tagsInclude(tags: string[] | undefined, tag?: string): boolean {
  if (!tag?.trim()) return true;
  return (tags ?? []).some((candidate) => candidate.toLowerCase() === tag.trim().toLowerCase());
}

function templateSourceKey(template: ProjectBatchTemplate, source: BatchTemplateSourceRecord): string {
  return `${template.id}:${source.sourceType}:${source.id}`;
}

function batchTemplateRunComparison(runHistory: ProjectBatchTemplateRun[]): BatchTemplateRunComparison | undefined {
  if (runHistory.length < 2) return undefined;
  const [latestRun, previousRun] = runHistory;
  const latestScore = latestRun.outcomeScore ?? 0;
  const previousScore = previousRun.outcomeScore ?? 0;
  return {
    latestRun,
    previousRun,
    createdDelta: latestRun.createdWorkItemCount - previousRun.createdWorkItemCount,
    sourceDelta: latestRun.sourceCount - previousRun.sourceCount,
    scoreDelta: latestScore - previousScore,
  };
}

function batchTemplateRecommendation(
  template: ProjectBatchTemplate,
  runHistory: ProjectBatchTemplateRun[],
  comparison?: BatchTemplateRunComparison,
): BatchTemplateRecommendation {
  if (template.archivedAt) {
    return {
      label: 'Archived',
      summary: 'Restore or duplicate this template before reusing it for new work.',
      metric: 'Archived templates stay available for history only.',
      tone: 'archived',
    };
  }

  if (runHistory.length === 0) {
    return {
      label: 'Run Template',
      summary: 'Run this template once to collect recommendation signals.',
      metric: 'No scored runs yet.',
      tone: 'review',
    };
  }

  const [latestRun] = runHistory;
  const scoredRuns = runHistory.filter((run) => typeof run.outcomeScore === 'number' && run.outcomeScore > 0);
  const latestScoredRun = scoredRuns[0];
  const averageScore = scoredRuns.length > 0
    ? scoredRuns.reduce((sum, run) => sum + (run.outcomeScore ?? 0), 0) / scoredRuns.length
    : 0;
  const metric = scoredRuns.length > 0
    ? `Average score ${averageScore.toFixed(1)}/5 across ${scoredRuns.length} scored run${scoredRuns.length === 1 ? '' : 's'}.`
    : 'No scored runs yet.';

  if (!latestRun.outcomeScore) {
    return {
      label: 'Score Latest Run',
      summary: 'Score the latest run to improve reuse guidance before scaling this template.',
      metric,
      tone: 'review',
    };
  }

  if ((latestScoredRun?.outcomeScore ?? 0) <= 2 || averageScore <= 2.5) {
    return {
      label: 'Revise',
      summary: 'Recent scoring suggests this template needs tuning before reuse.',
      metric,
      tone: 'revise',
    };
  }

  if (comparison && comparison.scoreDelta < 0) {
    return {
      label: 'Watch',
      summary: 'The latest score dropped versus the previous run; compare source fit before reusing.',
      metric,
      tone: 'watch',
    };
  }

  if (comparison && latestRun.createdWorkItemCount === 0 && comparison.createdDelta < 0) {
    return {
      label: 'No New Work',
      summary: 'The latest rerun found no new work; useful for freshness checks before generating more.',
      metric,
      tone: 'watch',
    };
  }

  if ((latestScoredRun?.outcomeScore ?? 0) >= 4 && averageScore >= 4) {
    return {
      label: 'Reuse',
      summary: 'Recent scored runs are strong; this template is ready to reuse for similar sources.',
      metric,
      tone: 'ready',
    };
  }

  return {
    label: 'Review',
    summary: 'Run history is useful but mixed; review the latest result before scaling this template.',
    metric,
    tone: 'review',
  };
}

function templateDraftFromTemplate(template?: ProjectBatchTemplate) {
  return {
    name: template?.name ?? '',
    summary: template?.summary ?? '',
    titlePrefix: template?.titlePrefix ?? '',
    nextAction: template?.nextAction ?? '',
    owner: template?.owner ?? '',
    source: template?.source ?? '',
    tags: (template?.tags ?? []).join(', '),
    cadence: template?.cadence ?? '',
    outcome: template?.outcome ?? '',
    sourceType: template?.sourceType ?? 'markdown-documents' as ProjectBatchTemplateSource,
    workItemType: template?.workItemType ?? 'task' as ProjectWorkItemType,
    priority: template?.priority ?? 'medium' as ProjectWorkItemPriority,
    documentPurpose: template?.filters?.documentPurpose ?? all,
    documentStatus: template?.filters?.documentStatus ?? all,
    alignmentTarget: template?.filters?.alignmentTarget ?? '',
    qaStatus: template?.filters?.qaStatus ?? all,
    qaPriority: template?.filters?.qaPriority ?? all,
    roadmapStatus: template?.filters?.roadmapStatus ?? '',
    featureReleaseId: template?.filters?.featureReleaseId ?? '',
    featureDisposition: template?.filters?.featureDisposition ?? all,
    tag: template?.filters?.tag ?? '',
    sourceIncludes: template?.filters?.sourceIncludes ?? '',
  };
}

function templateFromDraft(template: ProjectBatchTemplate, draft: ReturnType<typeof templateDraftFromTemplate>): ProjectBatchTemplate {
  return {
    ...template,
    name: draft.name.trim() || template.name,
    summary: draft.summary.trim() || template.summary,
    titlePrefix: draft.titlePrefix.trim() || template.titlePrefix,
    nextAction: draft.nextAction.trim() || template.nextAction,
    owner: draft.owner.trim(),
    source: draft.source.trim(),
    tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    cadence: draft.cadence.trim(),
    outcome: draft.outcome.trim(),
    sourceType: draft.sourceType,
    workItemType: draft.workItemType,
    priority: draft.priority,
    filters: {
      documentPurpose: draft.documentPurpose,
      documentStatus: draft.documentStatus,
      alignmentTarget: draft.alignmentTarget.trim(),
      qaStatus: draft.qaStatus,
      qaPriority: draft.qaPriority,
      roadmapStatus: draft.roadmapStatus.trim(),
      featureReleaseId: draft.featureReleaseId.trim(),
      featureDisposition: draft.featureDisposition,
      tag: draft.tag.trim(),
      sourceIncludes: draft.sourceIncludes.trim(),
    },
  };
}

function documentMatchesTemplate(template: ProjectBatchTemplate, doc: MarkdownDocument): boolean {
  const filters = template.filters;
  if (filters?.documentPurpose && filters.documentPurpose !== all && doc.purpose !== filters.documentPurpose) return false;
  if (filters?.documentStatus && filters.documentStatus !== all && doc.status !== filters.documentStatus) return false;
  if (filters?.alignmentTarget && !(doc.alignmentTargets ?? []).includes(filters.alignmentTarget)) return false;
  if (!tagsInclude(doc.tags, filters?.tag)) return false;
  return textMatches([doc.title, doc.summary, doc.path, ...(doc.alignmentTargets ?? [])].join(' '), filters?.sourceIncludes);
}

function qaMatchesTemplate(template: ProjectBatchTemplate, item: QAItem): boolean {
  const filters = template.filters;
  if (filters?.qaStatus && filters.qaStatus !== all && item.status !== filters.qaStatus) return false;
  if (filters?.qaPriority && filters.qaPriority !== all && item.priority !== filters.qaPriority) return false;
  if (!tagsInclude([item.status, item.priority, item.type, item.track ?? '', item.area ?? ''], filters?.tag)) return false;
  return textMatches([item.title, item.summary, item.nextAction ?? '', item.sourceDoc ?? '', ...(item.fileRefs ?? [])].join(' '), filters?.sourceIncludes);
}

function roadmapItemMatchesTemplate(template: ProjectBatchTemplate, item: RoadmapItem): boolean {
  const filters = template.filters;
  if (filters?.roadmapStatus && item.status !== filters.roadmapStatus) return false;
  if (!tagsInclude([item.status, item.type, item.phase ?? '', item.target ?? '', item.priority ?? ''], filters?.tag)) return false;
  return textMatches([item.title, item.summary, item.source, item.sourceSection ?? '', ...(item.notes ?? [])].join(' '), filters?.sourceIncludes);
}

function roadmapSignalMatchesTemplate(template: ProjectBatchTemplate, signal: RoadmapSignal): boolean {
  const filters = template.filters;
  if (filters?.roadmapStatus && signal.status !== filters.roadmapStatus) return false;
  if (!tagsInclude([signal.status, signal.phase ?? '', signal.target ?? ''], filters?.tag)) return false;
  return textMatches([signal.source, signal.summary, signal.phase ?? '', signal.target ?? ''].join(' '), filters?.sourceIncludes);
}

function featureMatchesTemplate(template: ProjectBatchTemplate, feature: ProductFeature): boolean {
  const filters = template.filters;
  if (filters?.featureReleaseId && feature.releaseId !== filters.featureReleaseId) return false;
  if (filters?.featureDisposition && filters.featureDisposition !== all && feature.disposition !== filters.featureDisposition) return false;
  if (!tagsInclude([feature.disposition, feature.releaseId, feature.confidence ?? '', feature.mvpStatus ?? ''], filters?.tag)) return false;
  return textMatches([feature.name, feature.rationale, feature.mvpNextAction ?? '', ...(feature.mvpNotes ?? [])].join(' '), filters?.sourceIncludes);
}

function templateSourceRecords(model: ProjectAnalysisModel, features: ProductFeature[], template: ProjectBatchTemplate): BatchTemplateSourceRecord[] {
  if (template.sourceType === 'markdown-documents') {
    return (model.markdownDocuments ?? []).filter((doc) => documentMatchesTemplate(template, doc)).map((doc) => ({
      sourceType: template.sourceType,
      id: doc.id,
      title: doc.title,
      summary: doc.summary,
      path: doc.path,
      featureIds: doc.featureIds ?? [],
      repositoryIds: doc.repositoryIds ?? [],
      markdownDocumentIds: [doc.id],
      tags: ['from-md-doc', doc.purpose, doc.status, ...(doc.tags ?? []), ...(doc.alignmentTargets ?? [])],
    }));
  }

  if (template.sourceType === 'qa-items') {
    return (model.qaItems ?? []).filter((item) => qaMatchesTemplate(template, item)).map((item) => ({
      sourceType: template.sourceType,
      id: item.id,
      title: item.title,
      summary: item.nextAction || item.summary,
      path: item.sourceDoc || item.fileRefs?.[0],
      featureIds: item.featureIds,
      repositoryIds: item.repositoryIds ?? [],
      qaItemIds: [item.id],
      tags: ['from-qa', item.status, item.priority, item.type],
    }));
  }

  if (template.sourceType === 'roadmap-items') {
    return (model.roadmapItems ?? []).filter((item) => roadmapItemMatchesTemplate(template, item)).map((item) => ({
      sourceType: template.sourceType,
      id: item.id,
      title: item.title,
      summary: item.summary,
      path: item.source,
      featureIds: item.featureIds ?? [],
      repositoryIds: item.repositoryIds ?? [],
      roadmapItemIds: [item.id],
      tags: ['from-roadmap', item.status, item.type, item.phase ?? '', item.target ?? ''].filter(Boolean),
    }));
  }

  if (template.sourceType === 'roadmap-sources') {
    return (model.roadmapSources ?? []).filter((signal) => roadmapSignalMatchesTemplate(template, signal)).map((signal, index) => ({
      sourceType: template.sourceType,
      id: `${signal.source}:${index}`,
      title: signal.source,
      summary: signal.summary,
      path: signal.source,
      tags: ['from-roadmap-source', signal.status, signal.phase ?? '', signal.target ?? ''].filter(Boolean),
    }));
  }

  return features.filter((feature) => featureMatchesTemplate(template, feature)).map((feature) => ({
    sourceType: template.sourceType,
    id: feature.id,
    title: feature.name,
    summary: feature.mvpNextAction || feature.rationale,
    featureIds: [feature.id],
    repositoryIds: feature.repositoryIds,
    tags: ['from-feature', feature.disposition, feature.releaseId],
  }));
}

function makeWorkItemId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `work-${crypto.randomUUID().slice(0, 8)}`;
  return `work-${Date.now().toString(36)}`;
}

function makeQueueViewId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `queue-view-${crypto.randomUUID().slice(0, 8)}`;
  return `queue-view-${Date.now().toString(36)}`;
}

function makeBatchTemplateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `batch-template-${crypto.randomUUID().slice(0, 8)}`;
  return `batch-template-${Date.now().toString(36)}`;
}

function makeBatchTemplateRunId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `batch-template-run-${crypto.randomUUID().slice(0, 8)}`;
  return `batch-template-run-${Date.now().toString(36)}`;
}

function makeBlankBatchTemplate(): ProjectBatchTemplate {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: makeBatchTemplateId(),
    name: 'New Batch Template',
    summary: 'Reusable project work run template.',
    sourceType: 'markdown-documents',
    workItemType: 'task',
    priority: 'medium',
    titlePrefix: 'Project work',
    nextAction: 'Review the selected source and define the next project action.',
    owner: '',
    source: 'Work Queue',
    tags: [],
    filters: {
      documentPurpose: all,
      documentStatus: all,
      qaStatus: all,
      qaPriority: all,
      featureDisposition: all,
    },
    cadence: '',
    outcome: '',
    runHistory: [],
    createdAt: today,
    updatedAt: today,
  };
}

function dedicatedQueueItem(workItem: ProjectWorkItem): DedicatedWorkQueueItem {
  const stage = stageForWorkItem(workItem.status);
  return {
    kind: 'work-item',
    workItem,
    stage,
    action: workItem.nextAction || workItem.summary,
    reason: `${projectWorkItemTypeLabels[workItem.type]} work item · ${projectWorkItemPriorityLabels[workItem.priority]} priority`,
    priority: stageOrder[stage] * 100 + workItemPriorityScore(workItem.priority),
  };
}

export function ProjectMVPExecutionQueue({
  model,
  features,
  onSelectFeature,
  onUpdateFeature,
  onAddWorkItem,
  onUpdateWorkItem,
  onAddQueueView,
  onAddBatchTemplate,
  onUpdateBatchTemplate,
  onDeleteBatchTemplate,
}: ProjectMVPExecutionQueueProps) {
  const initialTemplate = model.batchTemplates?.find((template) => !template.archivedAt) ?? model.batchTemplates?.[0];
  const [stageFilter, setStageFilter] = useState<typeof all | ExecutionStage>(all);
  const [typeFilter, setTypeFilter] = useState<typeof all | QueueItemTypeFilter>(all);
  const [ownerFilter, setOwnerFilter] = useState(all);
  const [priorityFilter, setPriorityFilter] = useState<typeof all | ProjectWorkItemPriority>(all);
  const [sourceFilter, setSourceFilter] = useState(all);
  const [search, setSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplate?.id ?? '');
  const [selectedTemplateRunId, setSelectedTemplateRunId] = useState('');
  const [showArchivedTemplates, setShowArchivedTemplates] = useState(false);
  const [templateRecommendationFilter, setTemplateRecommendationFilter] = useState<typeof all | BatchTemplateRecommendationLabel>(all);
  const [templateDraft, setTemplateDraft] = useState(() => templateDraftFromTemplate(initialTemplate));
  const [selectedTemplateSourceKeys, setSelectedTemplateSourceKeys] = useState<string[]>([]);
  const [templateRunMessage, setTemplateRunMessage] = useState('');
  const [runOutcomeDraft, setRunOutcomeDraft] = useState({ outcomeScore: '0', outcomeNotes: '' });
  const [viewDraft, setViewDraft] = useState({
    name: '',
    summary: '',
    owner: '',
    cadence: '',
    outcome: '',
  });
  const [workDraft, setWorkDraft] = useState({
    title: '',
    summary: '',
    nextAction: '',
    owner: '',
    sourcePath: '',
    tags: '',
    featureId: '',
    type: 'mcp' as ProjectWorkItemType,
    status: 'todo' as ProjectWorkItemStatus,
    priority: 'high' as ProjectWorkItemPriority,
  });
  const items = useMemo<WorkQueueItem[]>(() => (
    [
      ...(model.workItems ?? []).map(dedicatedQueueItem),
      ...features.map((feature) => executionItemForFeature(model, feature)),
    ].sort((a, b) => a.priority - b.priority || queueItemTitle(a).localeCompare(queueItemTitle(b)))
  ), [features, model]);
  const typeOptions = useMemo(() => {
    const values = new Set(items.map(queueItemType));
    return queueItemTypeOrder.filter((type) => values.has(type));
  }, [items]);
  const ownerOptions = useMemo(() => uniqueSortedValues(items.map(queueItemOwner)), [items]);
  const sourceOptions = useMemo(() => uniqueSortedValues(items.map(queueItemSource)), [items]);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = items.filter((item) => {
    if (stageFilter !== all && item.stage !== stageFilter) return false;
    if (typeFilter !== all && queueItemType(item) !== typeFilter) return false;
    if (ownerFilter !== all && queueItemOwner(item) !== ownerFilter) return false;
    if (priorityFilter !== all && queueItemPriority(item) !== priorityFilter) return false;
    if (sourceFilter !== all && queueItemSource(item) !== sourceFilter) return false;
    if (!normalizedSearch) return true;
    const values = item.kind === 'feature'
      ? [
        item.feature.name,
        item.action,
        item.reason,
        item.feature.rationale,
        queueItemTypeLabel(queueItemType(item)),
        queueItemOwner(item),
        projectWorkItemPriorityLabels[queueItemPriority(item)],
        queueItemSource(item),
        ...item.fileRefs.map((file) => file.path),
        ...item.qaItems.map((qa) => qa.title),
      ]
      : [
        item.workItem.title,
        item.workItem.summary,
        item.workItem.nextAction ?? '',
        queueItemTypeLabel(queueItemType(item)),
        queueItemOwner(item),
        projectWorkItemPriorityLabels[queueItemPriority(item)],
        queueItemSource(item),
        item.workItem.sourcePath ?? '',
        ...(item.workItem.tags ?? []),
      ];
    return values.some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const counts = items.reduce<Record<ExecutionStage, number>>((acc, item) => {
    acc[item.stage] += 1;
    return acc;
  }, { blocked: 0, qa: 0, mapping: 0, signoff: 0, ready: 0, slimming: 0, backlog: 0 });
  const activeCount = counts.blocked + counts.qa + counts.mapping + counts.signoff + counts.slimming + counts.backlog;
  const savedViews = model.queueViews ?? [];
  const batchableItems = visibleItems.filter((item) => item.stage !== 'ready');
  const batchableWorkItemCount = batchableItems.filter((item) => item.kind === 'work-item').length;
  const batchableFeatureCount = batchableItems.filter((item) => item.kind === 'feature').length;
  const canBatchVisible = batchableItems.some((item) => (item.kind === 'work-item' ? Boolean(onUpdateWorkItem) : Boolean(onUpdateFeature)));
  const batchTemplates = useMemo(() => model.batchTemplates ?? [], [model.batchTemplates]);
  const activeBatchTemplates = batchTemplates.filter((template) => !template.archivedAt);
  const archivedBatchTemplates = batchTemplates.filter((template) => template.archivedAt);
  const selectableBatchTemplates = showArchivedTemplates ? batchTemplates : activeBatchTemplates;
  const selectedTemplate = selectableBatchTemplates.find((template) => template.id === selectedTemplateId) ?? selectableBatchTemplates[0];
  const previousSelectedTemplateId = useRef(selectedTemplate?.id ?? '');
  const templateRollups = useMemo(() => (
    batchTemplates.map((template) => {
      const runHistory = template.runHistory ?? [];
      const comparison = batchTemplateRunComparison(runHistory);
      const recommendation = batchTemplateRecommendation(template, runHistory, comparison);
      const generatedCount = (model.workItems ?? []).filter((item) => item.sourceId?.startsWith(`${template.id}:`)).length;
      const scoredRunCount = runHistory.filter((run) => typeof run.outcomeScore === 'number' && run.outcomeScore > 0).length;
      return {
        template,
        recommendation,
        comparison,
        generatedCount,
        runCount: runHistory.length,
        scoredRunCount,
        latestRunAt: runHistory[0]?.ranAt ?? template.lastRunAt,
      };
    })
  ), [batchTemplates, model.workItems]);
  const templateRecommendationCounts = useMemo(() => {
    const countsByLabel = batchTemplateRecommendationOrder.reduce<Record<BatchTemplateRecommendationLabel, number>>((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {
      'Run Template': 0,
      'Score Latest Run': 0,
      Reuse: 0,
      Watch: 0,
      'No New Work': 0,
      Revise: 0,
      Review: 0,
      Archived: 0,
    });
    for (const rollup of templateRollups) countsByLabel[rollup.recommendation.label] += 1;
    return countsByLabel;
  }, [templateRollups]);
  const visibleTemplateRollups = useMemo(() => (
    templateRollups.filter((rollup) => templateRecommendationFilter === all || rollup.recommendation.label === templateRecommendationFilter)
  ), [templateRecommendationFilter, templateRollups]);
  const editableTemplate = useMemo(() => (
    selectedTemplate ? templateFromDraft(selectedTemplate, templateDraft) : undefined
  ), [selectedTemplate, templateDraft]);
  const selectedTemplateGeneratedCount = useMemo(() => (
    selectedTemplate
      ? (model.workItems ?? []).filter((item) => item.sourceId?.startsWith(`${selectedTemplate.id}:`)).length
      : 0
  ), [model.workItems, selectedTemplate]);
  const selectedTemplateArchived = Boolean(selectedTemplate?.archivedAt);
  const templateRunHistory = useMemo(() => editableTemplate?.runHistory ?? [], [editableTemplate?.runHistory]);
  const selectedTemplateRun = useMemo(() => (
    templateRunHistory.find((run) => run.id === selectedTemplateRunId) ?? templateRunHistory[0]
  ), [selectedTemplateRunId, templateRunHistory]);
  const selectedRunWorkItems = useMemo(() => {
    if (!selectedTemplateRun) return [];
    const workItemsById = new Map((model.workItems ?? []).map((item) => [item.id, item]));
    return selectedTemplateRun.createdWorkItemIds.map((itemId) => workItemsById.get(itemId)).filter((item): item is ProjectWorkItem => Boolean(item));
  }, [model.workItems, selectedTemplateRun]);
  const templateRunComparison = useMemo(() => batchTemplateRunComparison(templateRunHistory), [templateRunHistory]);
  const templateRecommendation = useMemo(() => (
    editableTemplate ? batchTemplateRecommendation(editableTemplate, templateRunHistory, templateRunComparison) : undefined
  ), [editableTemplate, templateRunComparison, templateRunHistory]);
  const missingRunWorkItemIds = useMemo(() => (
    selectedTemplateRun
      ? selectedTemplateRun.createdWorkItemIds.filter((itemId) => !selectedRunWorkItems.some((item) => item.id === itemId))
      : []
  ), [selectedRunWorkItems, selectedTemplateRun]);
  const selectedTemplateSources = useMemo(() => (
    editableTemplate ? templateSourceRecords(model, features, editableTemplate) : []
  ), [editableTemplate, features, model]);
  const existingTemplateSourceIds = useMemo(() => (
    new Set((model.workItems ?? []).map((item) => item.sourceId).filter(Boolean))
  ), [model.workItems]);
  const newTemplateSources = useMemo(() => (
    editableTemplate
      ? selectedTemplateSources.filter((source) => !existingTemplateSourceIds.has(templateSourceKey(editableTemplate, source)))
      : []
  ), [editableTemplate, existingTemplateSourceIds, selectedTemplateSources]);
  const selectedNewTemplateSources = useMemo(() => (
    editableTemplate
      ? newTemplateSources.filter((source) => selectedTemplateSourceKeys.includes(templateSourceKey(editableTemplate, source)))
      : []
  ), [editableTemplate, newTemplateSources, selectedTemplateSourceKeys]);
  const newTemplateSourceKeySignature = editableTemplate
    ? newTemplateSources.map((source) => templateSourceKey(editableTemplate, source)).join('|')
    : '';

  useEffect(() => {
    const nextTemplateId = selectedTemplate?.id ?? '';
    if (previousSelectedTemplateId.current === nextTemplateId) return;
    previousSelectedTemplateId.current = nextTemplateId;
    setTemplateDraft(templateDraftFromTemplate(selectedTemplate));
    setSelectedTemplateRunId('');
  }, [selectedTemplate]);

  useEffect(() => {
    if (!editableTemplate) {
      setSelectedTemplateSourceKeys([]);
      return;
    }
    setSelectedTemplateSourceKeys(newTemplateSources.map((source) => templateSourceKey(editableTemplate, source)));
  }, [editableTemplate, newTemplateSourceKeySignature, newTemplateSources]);

  useEffect(() => {
    setRunOutcomeDraft({
      outcomeScore: selectedTemplateRun?.outcomeScore ? String(selectedTemplateRun.outcomeScore) : '0',
      outcomeNotes: selectedTemplateRun?.outcomeNotes ?? '',
    });
  }, [selectedTemplateRun]);

  const applyUpdate = (item: ExecutionItem, body: string, updates: Partial<ProductFeature>) => {
    if (!onUpdateFeature) return;
    const status = updates.mvpStatus || stageLabels[item.stage];
    onUpdateFeature(item.feature.id, {
      ...updates,
      mvpProgressLog: [
        makeProgressEntry(body, status),
        ...(item.feature.mvpProgressLog ?? []),
      ],
    });
  };

  const applyWorkItemUpdate = (item: DedicatedWorkQueueItem, status: ProjectWorkItemStatus, body: string) => {
    if (!onUpdateWorkItem) return;
    onUpdateWorkItem(item.workItem.id, {
      status,
      progressLog: [
        makeProgressEntry(body, projectWorkItemStatusLabels[status]),
        ...(item.workItem.progressLog ?? []),
      ],
    });
  };

  const addDedicatedWorkItem = () => {
    if (!workDraft.title.trim() || !workDraft.summary.trim() || !onAddWorkItem) return;
    const today = new Date().toISOString().slice(0, 10);
    onAddWorkItem({
      id: makeWorkItemId(),
      title: workDraft.title.trim(),
      type: workDraft.type,
      status: workDraft.status,
      priority: workDraft.priority,
      summary: workDraft.summary.trim(),
      nextAction: workDraft.nextAction.trim(),
      owner: workDraft.owner.trim(),
      sourcePath: workDraft.sourcePath.trim(),
      featureIds: workDraft.featureId ? [workDraft.featureId] : [],
      tags: workDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      source: 'Work Queue',
      createdAt: today,
      updatedAt: today,
    });
    setWorkDraft({
      title: '',
      summary: '',
      nextAction: '',
      owner: workDraft.owner,
      sourcePath: '',
      tags: '',
      featureId: workDraft.featureId,
      type: workDraft.type,
      status: 'todo',
      priority: workDraft.priority,
    });
  };

  const createWorkItemFromTemplate = (template: ProjectBatchTemplate, source: BatchTemplateSourceRecord): ProjectWorkItem => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: makeWorkItemId(),
      title: `${template.titlePrefix}: ${source.title}`,
      type: template.workItemType,
      status: 'todo',
      priority: template.priority,
      summary: `${template.summary} Source: ${source.summary}`,
      nextAction: template.nextAction,
      owner: template.owner,
      source: template.source || `Batch template: ${template.name}`,
      sourceId: `${template.id}:${source.sourceType}:${source.id}`,
      sourcePath: source.path,
      featureIds: source.featureIds ?? [],
      repositoryIds: source.repositoryIds ?? [],
      markdownDocumentIds: source.markdownDocumentIds ?? [],
      qaItemIds: source.qaItemIds ?? [],
      roadmapItemIds: source.roadmapItemIds ?? [],
      tags: ['from-batch-template', template.id, ...(template.tags ?? []), ...(source.tags ?? [])].filter(Boolean),
      createdAt: today,
      updatedAt: today,
    };
  };

  const recordTemplateRun = (createdItems: ProjectWorkItem[], sources: BatchTemplateSourceRecord[], summary: string): ProjectBatchTemplateRun | undefined => {
    if (!selectedTemplate || !editableTemplate || !onUpdateBatchTemplate) return undefined;
    const ranAt = new Date().toISOString();
    const run: ProjectBatchTemplateRun = {
      id: makeBatchTemplateRunId(),
      ranAt,
      sourceCount: sources.length,
      createdWorkItemCount: createdItems.length,
      createdWorkItemIds: createdItems.map((item) => item.id),
      sourceTitles: sources.map((source) => source.title),
      summary,
    };
    onUpdateBatchTemplate(selectedTemplate.id, {
      ...editableTemplate,
      lastRunAt: ranAt,
      lastRunItemCount: createdItems.length,
      lastRunSourceCount: sources.length,
      lastRunWorkItemIds: createdItems.map((item) => item.id),
      runHistory: [run, ...(editableTemplate.runHistory ?? [])].slice(0, 8),
    });
    setSelectedTemplateRunId(run.id);
    return run;
  };

  const runSelectedTemplate = () => {
    if (!editableTemplate || !onAddWorkItem) return;
    const newItems = selectedNewTemplateSources.map((source) => createWorkItemFromTemplate(editableTemplate, source));
    for (const item of newItems) onAddWorkItem(item);
    if (newItems.length > 0) {
      recordTemplateRun(
        newItems,
        selectedNewTemplateSources,
        `Created ${newItems.length} work item${newItems.length === 1 ? '' : 's'} from ${selectedNewTemplateSources.length} source${selectedNewTemplateSources.length === 1 ? '' : 's'}.`,
      );
    }
    setTemplateRunMessage(
      newItems.length === 0
        ? `No new work items created for ${editableTemplate.name}.`
        : `Created ${newItems.length} work item${newItems.length === 1 ? '' : 's'} from ${editableTemplate.name}.`,
    );
  };

  const recordSelectedTemplateRerun = () => {
    if (!editableTemplate || selectedTemplateSources.length === 0) return;
    recordTemplateRun(
      [],
      selectedTemplateSources,
      `Rerun check found ${selectedTemplateSources.length} matching source${selectedTemplateSources.length === 1 ? '' : 's'} and created 0 new work items.`,
    );
    setTemplateRunMessage(`Recorded rerun check for ${editableTemplate.name}.`);
  };

  const saveSelectedTemplate = () => {
    if (!selectedTemplate || !editableTemplate || !onUpdateBatchTemplate) return;
    onUpdateBatchTemplate(selectedTemplate.id, editableTemplate);
    setTemplateRunMessage(`Saved template: ${editableTemplate.name}.`);
  };

  const archiveSelectedTemplate = () => {
    if (!selectedTemplate || !onUpdateBatchTemplate) return;
    const today = new Date().toISOString().slice(0, 10);
    onUpdateBatchTemplate(selectedTemplate.id, { archivedAt: today });
    if (!showArchivedTemplates) {
      const nextActiveTemplate = activeBatchTemplates.find((template) => template.id !== selectedTemplate.id);
      setSelectedTemplateId(nextActiveTemplate?.id ?? '');
    }
    setTemplateRunMessage(`Archived template: ${selectedTemplate.name}. Existing queue work remains linked.`);
  };

  const restoreSelectedTemplate = () => {
    if (!selectedTemplate || !onUpdateBatchTemplate) return;
    onUpdateBatchTemplate(selectedTemplate.id, { archivedAt: undefined });
    setTemplateRunMessage(`Restored template: ${selectedTemplate.name}.`);
  };

  const deleteSelectedTemplate = () => {
    if (!selectedTemplate || !onDeleteBatchTemplate) return;
    if (selectedTemplateGeneratedCount > 0) {
      setTemplateRunMessage(`Cannot delete ${selectedTemplate.name}; archive it because ${selectedTemplateGeneratedCount} generated work item${selectedTemplateGeneratedCount === 1 ? '' : 's'} still reference it.`);
      return;
    }
    onDeleteBatchTemplate(selectedTemplate.id);
    const nextTemplate = selectableBatchTemplates.find((template) => template.id !== selectedTemplate.id);
    setSelectedTemplateId(nextTemplate?.id ?? '');
    setTemplateRunMessage(`Deleted template: ${selectedTemplate.name}.`);
  };

  const selectNewTemplate = (template: ProjectBatchTemplate, message: string) => {
    onAddBatchTemplate?.(template);
    setSelectedTemplateId(template.id);
    setTemplateDraft(templateDraftFromTemplate(template));
    setTemplateRunMessage(message);
  };

  const createBatchTemplate = () => {
    if (!onAddBatchTemplate) return;
    const template = makeBlankBatchTemplate();
    selectNewTemplate(template, `Created template: ${template.name}.`);
  };

  const duplicateSelectedTemplate = () => {
    if (!editableTemplate || !onAddBatchTemplate) return;
    const today = new Date().toISOString().slice(0, 10);
    const template: ProjectBatchTemplate = {
      ...editableTemplate,
      id: makeBatchTemplateId(),
      name: `${editableTemplate.name} Copy`,
      archivedAt: undefined,
      lastRunAt: undefined,
      lastRunItemCount: undefined,
      lastRunSourceCount: undefined,
      lastRunWorkItemIds: [],
      runHistory: [],
      createdAt: today,
      updatedAt: today,
    };
    selectNewTemplate(template, `Duplicated template: ${template.name}.`);
  };

  const toggleTemplateSource = (sourceKey: string) => {
    setSelectedTemplateSourceKeys((current) => (
      current.includes(sourceKey)
        ? current.filter((key) => key !== sourceKey)
        : [...current, sourceKey]
    ));
  };

  const focusRunWorkItem = (item: ProjectWorkItem) => {
    setStageFilter(all);
    setTypeFilter(all);
    setOwnerFilter(all);
    setPriorityFilter(all);
    setSourceFilter(all);
    setSearch(item.title);
    setTemplateRunMessage(`Focused queue on run work item: ${item.title}.`);
  };

  const saveSelectedRunOutcome = () => {
    if (!selectedTemplate || !editableTemplate || !selectedTemplateRun || !onUpdateBatchTemplate) return;
    const score = Number(runOutcomeDraft.outcomeScore);
    const updatedRun: ProjectBatchTemplateRun = {
      ...selectedTemplateRun,
      outcomeScore: score > 0 ? score : undefined,
      outcomeNotes: runOutcomeDraft.outcomeNotes.trim(),
      reviewedAt: new Date().toISOString(),
    };
    onUpdateBatchTemplate(selectedTemplate.id, {
      ...editableTemplate,
      runHistory: (editableTemplate.runHistory ?? []).map((run) => (
        run.id === selectedTemplateRun.id ? updatedRun : run
      )),
    });
    setTemplateRunMessage(`Saved run outcome for ${editableTemplate.name}.`);
  };

  const applyQueueView = (queueView: ProjectQueueView) => {
    setStageFilter(queueView.filters.stage ?? all);
    setTypeFilter(queueView.filters.type ?? all);
    setOwnerFilter(queueView.filters.owner || all);
    setPriorityFilter(queueView.filters.priority ?? all);
    setSourceFilter(queueView.filters.source || all);
    setSearch(queueView.filters.search ?? '');
  };

  const saveCurrentQueueView = () => {
    if (!viewDraft.name.trim() || !onAddQueueView) return;
    const today = new Date().toISOString().slice(0, 10);
    onAddQueueView({
      id: makeQueueViewId(),
      name: viewDraft.name.trim(),
      summary: viewDraft.summary.trim() || 'Saved Work Queue filter view.',
      filters: {
        stage: stageFilter,
        type: typeFilter,
        owner: ownerFilter === all ? '' : ownerFilter,
        priority: priorityFilter,
        source: sourceFilter === all ? '' : sourceFilter,
        search: search.trim(),
      },
      owner: viewDraft.owner.trim(),
      cadence: viewDraft.cadence.trim(),
      outcome: viewDraft.outcome.trim(),
      source: 'Work Queue',
      createdAt: today,
      updatedAt: today,
    });
    setViewDraft({
      name: '',
      summary: '',
      owner: viewDraft.owner,
      cadence: viewDraft.cadence,
      outcome: '',
    });
  };

  const applyBatchUpdate = (
    workItemStatus: ProjectWorkItemStatus,
    featureBody: string,
    featureUpdates: (item: ExecutionItem) => Partial<ProductFeature>,
  ) => {
    for (const item of batchableItems) {
      if (item.kind === 'work-item') {
        applyWorkItemUpdate(item, workItemStatus, `${projectWorkItemStatusLabels[workItemStatus]} from saved-view batch: ${item.workItem.title}`);
      } else {
        applyUpdate(item, `${featureBody}: ${item.feature.name}`, featureUpdates(item));
      }
    }
  };

  return (
    <main className="analysis-execution" aria-label="Project work queue">
      <section className="analysis-execution-hero">
        <div>
          <span className="analysis-kicker">Project Execution</span>
          <h2>Work Queue</h2>
          <p>Prioritize blockers, testing, mapping, review, and scope decisions across the active project, not only MVP slimming work.</p>
        </div>
        <div className="analysis-execution-score">
          <ListChecks size={22} />
          <strong>{activeCount}</strong>
          <span>active actions</span>
        </div>
      </section>

      <section className="analysis-readiness-summary" aria-label="Project work summary">
        <ExecutionSummary icon={<AlertTriangle size={18} />} label="Blocked" value={counts.blocked} tone={stageColors.blocked} />
        <ExecutionSummary icon={<ClipboardCheck size={18} />} label="Test / retest" value={counts.qa} tone={stageColors.qa} />
        <ExecutionSummary icon={<FileWarning size={18} />} label="Map files" value={counts.mapping} tone={stageColors.mapping} />
        <ExecutionSummary icon={<ShieldCheck size={18} />} label="Review" value={counts.signoff} tone={stageColors.signoff} />
        <ExecutionSummary icon={<CheckCircle2 size={18} />} label="Ready" value={counts.ready} tone={stageColors.ready} />
        <ExecutionSummary icon={<Rocket size={18} />} label="Scope decision" value={counts.slimming} tone={stageColors.slimming} />
      </section>

      <section className="analysis-execution-views" aria-label="Saved queue views">
        <div>
          <span className="analysis-kicker">Saved Views</span>
          <h3>Reusable Work Lanes</h3>
          <p>Apply repeatable filters for MCP platform work, audits, security checks, docs, and feature-scope planning.</p>
        </div>
        <div className="analysis-execution-view-list">
          {savedViews.length === 0 ? (
            <span className="analysis-empty-pill">No saved queue views yet</span>
          ) : savedViews.map((queueView) => (
            <button className="analysis-execution-view-button" type="button" key={queueView.id} onClick={() => applyQueueView(queueView)}>
              <strong>{queueView.name}</strong>
              <span>{queueView.summary}</span>
              <em>{queueView.cadence || 'On demand'} · {queueView.outcome || 'Reusable planning lane'}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="analysis-execution-toolbar" aria-label="Execution queue filters">
        <label className="analysis-execution-search">
          <Search size={15} />
          <span className="sr-only">Search execution queue</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search queue, files, or QA" />
        </label>
        <select aria-label="Execution stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as typeof all | ExecutionStage)}>
          <option value={all}>All stages</option>
          {Object.entries(stageLabels).map(([stage, label]) => (
            <option key={stage} value={stage}>{label}</option>
          ))}
        </select>
        <select aria-label="Work item type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof all | QueueItemTypeFilter)}>
          <option value={all}>All types</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>{queueItemTypeLabel(type)}</option>
          ))}
        </select>
        <select aria-label="Work item owner" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
          <option value={all}>All owners</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>
        <select aria-label="Work item priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof all | ProjectWorkItemPriority)}>
          <option value={all}>All priorities</option>
          {workItemPriorityOrder.map((priority) => (
            <option key={priority} value={priority}>{projectWorkItemPriorityLabels[priority]}</option>
          ))}
        </select>
        <select aria-label="Work item source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
          <option value={all}>All sources</option>
          {sourceOptions.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </section>

      <section className="analysis-execution-layout">
        <section className="analysis-execution-list" aria-label="Execution work items">
          {visibleItems.length === 0 ? (
            <div className="analysis-empty-state">No execution items match the current filters.</div>
          ) : visibleItems.map((item, index) => (
            item.kind === 'work-item' ? (
              <article className="analysis-execution-card" key={item.workItem.id}>
                <header>
                  <div>
                    <span className="analysis-execution-rank">#{index + 1}</span>
                    <span className="analysis-readiness-state" style={{ borderColor: projectWorkItemStatusColors[item.workItem.status], color: projectWorkItemStatusColors[item.workItem.status] }}>
                      {projectWorkItemStatusLabels[item.workItem.status]}
                    </span>
                    <span className="analysis-disposition" style={{ borderColor: stageColors[item.stage], color: stageColors[item.stage] }}>
                      {projectWorkItemTypeLabels[item.workItem.type]}
                    </span>
                    <span className="analysis-readiness-decision">{projectWorkItemPriorityLabels[item.workItem.priority]} priority</span>
                  </div>
                </header>

                <h3>{item.workItem.title}</h3>
                <p>{item.action}</p>
                <div className="analysis-execution-reason">{item.reason}</div>

                <dl className="analysis-readiness-metrics">
                  <div><dt>Owner</dt><dd>{item.workItem.owner || 'Unassigned'}</dd></div>
                  <div><dt>Source</dt><dd>{item.workItem.source || 'Work Queue'}</dd></div>
                  <div><dt>Feature links</dt><dd>{item.workItem.featureIds?.length ?? 0}</dd></div>
                  <div><dt>Docs</dt><dd>{item.workItem.markdownDocumentIds?.length ?? 0}</dd></div>
                  <div><dt>QA</dt><dd>{item.workItem.qaItemIds?.length ?? 0}</dd></div>
                  <div><dt>Due</dt><dd>{item.workItem.due || 'Unassigned'}</dd></div>
                </dl>

                <div className="analysis-readiness-evidence">
                  {(item.workItem.tags ?? []).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}
                  {item.workItem.sourcePath && <span>{item.workItem.sourcePath}</span>}
                </div>

                <div className="analysis-execution-actions">
                  <button
                    className="analysis-card-toggle"
                    type="button"
                    onClick={() => applyWorkItemUpdate(item, 'in-progress', `Started work item: ${item.workItem.title}`)}
                    disabled={!onUpdateWorkItem}
                  >
                    <Play size={14} />
                    Start work
                  </button>
                  <button
                    className="analysis-card-toggle analysis-card-toggle--secondary"
                    type="button"
                    onClick={() => applyWorkItemUpdate(item, 'review', `Moved work item to review: ${item.workItem.title}`)}
                    disabled={!onUpdateWorkItem}
                  >
                    Review
                  </button>
                  <button
                    className="analysis-card-toggle analysis-card-toggle--secondary"
                    type="button"
                    onClick={() => applyWorkItemUpdate(item, 'done', `Completed work item: ${item.workItem.title}`)}
                    disabled={!onUpdateWorkItem}
                  >
                    Complete
                  </button>
                  <button
                    className="analysis-chip-button"
                    type="button"
                    onClick={() => applyWorkItemUpdate(item, 'deferred', `Deferred work item: ${item.workItem.title}`)}
                    disabled={!onUpdateWorkItem}
                  >
                    Defer
                  </button>
                </div>
              </article>
            ) : (
            <article className="analysis-execution-card" key={item.feature.id}>
              <header>
                <div>
                  <span className="analysis-execution-rank">#{index + 1}</span>
                  <span className="analysis-readiness-state" style={{ borderColor: stageColors[item.stage], color: stageColors[item.stage] }}>
                    {stageLabels[item.stage]}
                  </span>
                  <span className="analysis-disposition" style={{ borderColor: dispositionColors[item.feature.disposition], color: dispositionColors[item.feature.disposition] }}>
                    {dispositionLabels[item.feature.disposition]}
                  </span>
                  {item.feature.mvpDecision && <span className="analysis-readiness-decision">Decision: {mvpDecisionLabels[item.feature.mvpDecision]}</span>}
                </div>
                <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={() => onSelectFeature?.(item.feature.id)}>
                  Details
                </button>
              </header>

              <h3>{item.feature.name}</h3>
              <p>{item.action}</p>
              <div className="analysis-execution-reason">{item.reason}</div>

              <dl className="analysis-readiness-metrics">
                <div><dt>QA</dt><dd>{item.qaItems.length}</dd></div>
                <div><dt>Open QA</dt><dd>{item.openQACount}</dd></div>
                <div><dt>Files</dt><dd>{item.fileRefs.length}</dd></div>
                <div><dt>Mapping gaps</dt><dd>{item.mappingGapCount}</dd></div>
                <div><dt>Depends</dt><dd>{item.dependsOnCount}</dd></div>
                <div><dt>Supports</dt><dd>{item.supportsCount}</dd></div>
                <div><dt>Owner</dt><dd>{item.feature.mvpOwner || 'Unassigned'}</dd></div>
                <div><dt>Status</dt><dd>{item.feature.mvpStatus || stageLabels[item.stage]}</dd></div>
                <div><dt>Sign-off</dt><dd>{item.feature.mvpSignoff ? mvpSignoffLabels[item.feature.mvpSignoff] : 'Not started'}</dd></div>
              </dl>

              <div className="analysis-readiness-evidence">
                {item.qaItems.slice(0, 3).map((qa) => (
                  <span key={qa.id} style={{ borderColor: qaStatusColors[qa.status], color: qaStatusColors[qa.status] }}>
                    {qaStatusLabels[qa.status]} · {qa.title}
                  </span>
                ))}
                {item.fileRefs.filter((file) => file.status !== 'existing' && file.status !== 'mapped').slice(0, 3).map((file) => (
                  <span key={file.path} style={{ borderColor: fileStatusColors[file.status], color: fileStatusColors[file.status] }}>
                    {fileStatusLabels[file.status]} · {file.path}
                  </span>
                ))}
              </div>

              <div className="analysis-execution-actions">
                <button
                  className="analysis-card-toggle"
                  type="button"
                  onClick={() => applyUpdate(item, `Started project work: ${item.action}`, {
                    mvpStatus: 'Current work item',
                    mvpNextAction: item.action,
                  })}
                  disabled={!onUpdateFeature}
                >
                  <Play size={14} />
                  Start work
                </button>
                <button
                  className="analysis-card-toggle analysis-card-toggle--secondary"
                  type="button"
                  onClick={() => applyUpdate(item, 'Moved feature into scope review.', {
                    mvpStatus: 'Ready for sign-off',
                    mvpSignoff: 'in-review',
                  })}
                  disabled={!onUpdateFeature}
                >
                  Review
                </button>
                <button
                  className="analysis-card-toggle analysis-card-toggle--secondary"
                  type="button"
                  onClick={() => applyUpdate(item, 'Approved feature for active project scope.', {
                    mvpDecision: item.feature.mvpDecision || 'keep',
                    mvpStatus: 'Approved for active scope',
                    mvpSignoff: 'approved',
                    mvpCutSafety: 'do-not-cut-yet',
                  })}
                  disabled={!onUpdateFeature}
                >
                  Approve scope
                </button>
                <button
                  className="analysis-chip-button"
                  type="button"
                  onClick={() => applyUpdate(item, 'Deferred feature from the active project queue.', {
                    mvpDecision: 'defer',
                    mvpStatus: 'Deferred from active scope',
                    mvpSignoff: 'not-started',
                    mvpCutSafety: 'safe-to-cut',
                  })}
                  disabled={!onUpdateFeature}
                >
                  Defer
                </button>
              </div>
            </article>
            )
          ))}
        </section>

        <aside className="analysis-execution-guide">
          <h2>Batch Templates</h2>
          <div className="analysis-execution-actions">
            <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={createBatchTemplate} disabled={!onAddBatchTemplate}>
              <Plus size={14} />
              New template
            </button>
            <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={duplicateSelectedTemplate} disabled={!editableTemplate || !onAddBatchTemplate}>
              <ClipboardCheck size={14} />
              Duplicate template
            </button>
          </div>
          <label className="analysis-inline-check">
            <input
              type="checkbox"
              checked={showArchivedTemplates}
              onChange={(event) => {
                setShowArchivedTemplates(event.target.checked);
                setTemplateRunMessage('');
              }}
            />
            <span>Show archived templates ({archivedBatchTemplates.length})</span>
          </label>
          {batchTemplates.length === 0 && <p>No batch templates are saved in this project map yet. Create one to start defining reusable work runs.</p>}
          {batchTemplates.length > 0 && activeBatchTemplates.length === 0 && !showArchivedTemplates && (
            <p>All saved batch templates are archived. Turn on archived templates to review or restore them.</p>
          )}
          {batchTemplates.length > 0 && (
            <section className="analysis-template-rollup" aria-label="Batch template recommendation rollup">
              <strong>Template Signals</strong>
              <span>{visibleTemplateRollups.length} of {batchTemplates.length} template{batchTemplates.length === 1 ? '' : 's'} shown by recommendation state.</span>
              <div className="analysis-template-signal-filters" role="group" aria-label="Template recommendation filters">
                <button
                  type="button"
                  className="analysis-chip-button"
                  aria-pressed={templateRecommendationFilter === all}
                  onClick={() => setTemplateRecommendationFilter(all)}
                >
                  All {batchTemplates.length}
                </button>
                {batchTemplateRecommendationOrder.filter((label) => templateRecommendationCounts[label] > 0).map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="analysis-chip-button"
                    aria-pressed={templateRecommendationFilter === label}
                    onClick={() => setTemplateRecommendationFilter(label)}
                  >
                    {label} {templateRecommendationCounts[label]}
                  </button>
                ))}
              </div>
              <div className="analysis-template-rollup-list">
                {visibleTemplateRollups.slice(0, 5).map((rollup) => (
                  <button
                    key={rollup.template.id}
                    type="button"
                    className={`analysis-template-rollup-item analysis-template-rollup-item--${rollup.recommendation.tone}`}
                    onClick={() => {
                      if (rollup.template.archivedAt) setShowArchivedTemplates(true);
                      setSelectedTemplateId(rollup.template.id);
                      setSelectedTemplateRunId('');
                      setTemplateRunMessage(`Selected template: ${rollup.template.name}.`);
                    }}
                    aria-pressed={selectedTemplate?.id === rollup.template.id}
                  >
                    <span>
                      <strong>{rollup.recommendation.label}</strong>
                      <em>{rollup.template.name}</em>
                    </span>
                    <small>
                      {rollup.runCount} run{rollup.runCount === 1 ? '' : 's'}
                      {' · '}{rollup.scoredRunCount} scored
                      {' · '}{rollup.generatedCount} generated
                      {rollup.latestRunAt ? ` · latest ${rollup.latestRunAt}` : ' · no runs yet'}
                    </small>
                  </button>
                ))}
              </div>
              {visibleTemplateRollups.length === 0 && <span>No templates match this signal filter.</span>}
            </section>
          )}
          {editableTemplate && (
            <>
              <label>
                <span>Batch template</span>
                <select
                  aria-label="Batch template"
                  value={selectedTemplate?.id ?? ''}
                  onChange={(event) => {
                    setSelectedTemplateId(event.target.value);
                    setTemplateRunMessage('');
                  }}
                >
                  {selectableBatchTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}{template.archivedAt ? ' (archived)' : ''}</option>
                  ))}
                </select>
              </label>
              {editableTemplate && (
                <div className="analysis-execution-template-card">
                  <strong>{projectBatchTemplateSourceLabels[editableTemplate.sourceType]}</strong>
                  <span>{editableTemplate.summary}</span>
                  <em>
                    {selectedTemplateArchived ? `Archived ${selectedTemplate?.archivedAt}` : 'Active template'}
                    {' · '}{selectedTemplateGeneratedCount} generated work item{selectedTemplateGeneratedCount === 1 ? '' : 's'}
                    {' · '}{selectedTemplateSources.length} matching source{selectedTemplateSources.length === 1 ? '' : 's'}
                    {' · '}{newTemplateSources.length} new
                    {' · '}{selectedNewTemplateSources.length} selected
                  </em>
                </div>
              )}
              <section className="analysis-execution-template-card" aria-label="Batch template run history">
                <strong>Run History</strong>
                {editableTemplate.lastRunAt ? (
                  <span>
                    Last run {editableTemplate.lastRunAt}: created {editableTemplate.lastRunItemCount ?? 0} work item{(editableTemplate.lastRunItemCount ?? 0) === 1 ? '' : 's'} from {editableTemplate.lastRunSourceCount ?? 0} source{(editableTemplate.lastRunSourceCount ?? 0) === 1 ? '' : 's'}.
                  </span>
                ) : (
                  <span>No recorded template runs yet.</span>
                )}
                {templateRecommendation && (
                  <div
                    className={`analysis-template-recommendation analysis-template-recommendation--${templateRecommendation.tone}`}
                    role="status"
                  >
                    <strong>{templateRecommendation.label}</strong>
                    <span>{templateRecommendation.summary}</span>
                    <em>{templateRecommendation.metric}</em>
                  </div>
                )}
                {editableTemplate.runHistory && editableTemplate.runHistory.length > 0 && (
                  <ol>
                    {editableTemplate.runHistory.slice(0, 3).map((run) => (
                      <li key={run.id}>
                        <button
                          className="analysis-run-history-button"
                          type="button"
                          onClick={() => setSelectedTemplateRunId(run.id)}
                          aria-pressed={selectedTemplateRun?.id === run.id}
                        >
                          {run.ranAt}
                        </button>
                        <span>{run.summary}</span>
                        {run.sourceTitles.length > 0 && <em>{run.sourceTitles.slice(0, 3).join(', ')}</em>}
                      </li>
                    ))}
                  </ol>
                )}
                {selectedTemplateRun && (
                  <div className="analysis-run-detail" role="region" aria-label="Selected batch template run">
                    <strong>Generated Work</strong>
                    <span>{selectedTemplateRun.summary}</span>
                    {selectedRunWorkItems.length > 0 ? (
                      <ul>
                        {selectedRunWorkItems.map((item) => (
                          <li key={item.id}>
                            <button type="button" onClick={() => focusRunWorkItem(item)}>
                              {item.title}
                            </button>
                            <small>{projectWorkItemStatusLabels[item.status]} · {projectWorkItemTypeLabels[item.type]} · {item.source || 'Work Queue'}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>No generated work items from this run are currently in the queue.</span>
                    )}
                    {missingRunWorkItemIds.length > 0 && <em>{missingRunWorkItemIds.length} generated item reference{missingRunWorkItemIds.length === 1 ? '' : 's'} no longer resolve in the queue.</em>}
                    {selectedTemplateRun.outcomeScore && <em>Outcome score: {selectedTemplateRun.outcomeScore}/5</em>}
                    {selectedTemplateRun.outcomeNotes && <span>{selectedTemplateRun.outcomeNotes}</span>}
                    {selectedTemplateRun.reviewedAt && <small>Reviewed {selectedTemplateRun.reviewedAt}</small>}
                    <div className="analysis-run-outcome-grid">
                      <label>
                        <span>Outcome score</span>
                        <select
                          aria-label="Run outcome score"
                          value={runOutcomeDraft.outcomeScore}
                          onChange={(event) => setRunOutcomeDraft({ ...runOutcomeDraft, outcomeScore: event.target.value })}
                        >
                          <option value="0">Not scored</option>
                          <option value="1">1 - Needs rework</option>
                          <option value="2">2 - Partial</option>
                          <option value="3">3 - Useful</option>
                          <option value="4">4 - Strong</option>
                          <option value="5">5 - Ready to reuse</option>
                        </select>
                      </label>
                      <label>
                        <span>Run notes</span>
                        <textarea
                          aria-label="Run outcome notes"
                          rows={3}
                          value={runOutcomeDraft.outcomeNotes}
                          onChange={(event) => setRunOutcomeDraft({ ...runOutcomeDraft, outcomeNotes: event.target.value })}
                        />
                      </label>
                    </div>
                    <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={saveSelectedRunOutcome} disabled={!onUpdateBatchTemplate}>
                      <ClipboardCheck size={14} />
                      Save run outcome
                    </button>
                  </div>
                )}
                {templateRunComparison && (
                  <div className="analysis-run-comparison" role="region" aria-label="Batch template run comparison">
                    <strong>Run Comparison</strong>
                    <span>Latest run compared with previous run.</span>
                    <dl>
                      <div>
                        <dt>Created work</dt>
                        <dd>{templateRunComparison.latestRun.createdWorkItemCount} ({templateRunComparison.createdDelta >= 0 ? '+' : ''}{templateRunComparison.createdDelta})</dd>
                      </div>
                      <div>
                        <dt>Sources</dt>
                        <dd>{templateRunComparison.latestRun.sourceCount} ({templateRunComparison.sourceDelta >= 0 ? '+' : ''}{templateRunComparison.sourceDelta})</dd>
                      </div>
                      <div>
                        <dt>Score</dt>
                        <dd>{templateRunComparison.latestRun.outcomeScore ?? 'Unscored'} ({templateRunComparison.scoreDelta >= 0 ? '+' : ''}{templateRunComparison.scoreDelta})</dd>
                      </div>
                    </dl>
                    <em>Previous: {templateRunComparison.previousRun.summary}</em>
                  </div>
                )}
              </section>
              <label>
                <span>Template name</span>
                <input value={templateDraft.name} onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })} />
              </label>
              <label>
                <span>Template summary</span>
                <textarea rows={2} value={templateDraft.summary} onChange={(event) => setTemplateDraft({ ...templateDraft, summary: event.target.value })} />
              </label>
              <div className="analysis-qa-composer-grid">
                <label>
                  <span>Source type</span>
                  <select value={templateDraft.sourceType} onChange={(event) => setTemplateDraft({ ...templateDraft, sourceType: event.target.value as ProjectBatchTemplateSource })}>
                    {batchTemplateSourceOrder.map((sourceType) => (
                      <option key={sourceType} value={sourceType}>{projectBatchTemplateSourceLabels[sourceType]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Work type</span>
                  <select value={templateDraft.workItemType} onChange={(event) => setTemplateDraft({ ...templateDraft, workItemType: event.target.value as ProjectWorkItemType })}>
                    {workItemTypeOrder.map((type) => <option key={type} value={type}>{projectWorkItemTypeLabels[type]}</option>)}
                  </select>
                </label>
              </div>
              <div className="analysis-qa-composer-grid">
                <label>
                  <span>Template priority</span>
                  <select value={templateDraft.priority} onChange={(event) => setTemplateDraft({ ...templateDraft, priority: event.target.value as ProjectWorkItemPriority })}>
                    {workItemPriorityOrder.map((priority) => <option key={priority} value={priority}>{projectWorkItemPriorityLabels[priority]}</option>)}
                  </select>
                </label>
                <label>
                  <span>Template owner</span>
                  <input value={templateDraft.owner} onChange={(event) => setTemplateDraft({ ...templateDraft, owner: event.target.value })} />
                </label>
              </div>
              <label>
                <span>Title prefix</span>
                <input value={templateDraft.titlePrefix} onChange={(event) => setTemplateDraft({ ...templateDraft, titlePrefix: event.target.value })} />
              </label>
              <label>
                <span>Template next action</span>
                <textarea rows={2} value={templateDraft.nextAction} onChange={(event) => setTemplateDraft({ ...templateDraft, nextAction: event.target.value })} />
              </label>
              <div className="analysis-qa-composer-grid">
                <label>
                  <span>Doc purpose</span>
                  <select value={templateDraft.documentPurpose} onChange={(event) => setTemplateDraft({ ...templateDraft, documentPurpose: event.target.value as typeof all | MarkdownDocumentPurpose })}>
                    <option value={all}>All purposes</option>
                    {markdownDocumentPurposeOrder.map((purpose) => <option key={purpose} value={purpose}>{markdownDocumentPurposeLabels[purpose]}</option>)}
                  </select>
                </label>
                <label>
                  <span>Doc status</span>
                  <select value={templateDraft.documentStatus} onChange={(event) => setTemplateDraft({ ...templateDraft, documentStatus: event.target.value as typeof all | MarkdownDocumentStatus })}>
                    <option value={all}>All doc statuses</option>
                    {markdownDocumentStatusOrder.map((status) => <option key={status} value={status}>{markdownDocumentStatusLabels[status]}</option>)}
                  </select>
                </label>
              </div>
              <div className="analysis-qa-composer-grid">
                <label>
                  <span>QA status</span>
                  <select value={templateDraft.qaStatus} onChange={(event) => setTemplateDraft({ ...templateDraft, qaStatus: event.target.value as typeof all | QAItemStatus })}>
                    <option value={all}>All QA statuses</option>
                    {Object.entries(qaStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>QA priority</span>
                  <select value={templateDraft.qaPriority} onChange={(event) => setTemplateDraft({ ...templateDraft, qaPriority: event.target.value as typeof all | QAItemPriority })}>
                    <option value={all}>All QA priorities</option>
                    {qaPriorityOrder.map((priority) => <option key={priority} value={priority}>{qaPriorityLabels[priority]}</option>)}
                  </select>
                </label>
              </div>
              <div className="analysis-qa-composer-grid">
                <label>
                  <span>Feature release</span>
                  <select value={templateDraft.featureReleaseId} onChange={(event) => setTemplateDraft({ ...templateDraft, featureReleaseId: event.target.value })}>
                    <option value="">All releases</option>
                    {model.releases.map((release) => <option key={release.id} value={release.id}>{release.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Feature disposition</span>
                  <select value={templateDraft.featureDisposition} onChange={(event) => setTemplateDraft({ ...templateDraft, featureDisposition: event.target.value as typeof all | FeatureDisposition })}>
                    <option value={all}>All dispositions</option>
                    {featureDispositionOrder.map((disposition) => <option key={disposition} value={disposition}>{dispositionLabels[disposition]}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <span>Alignment target</span>
                <input value={templateDraft.alignmentTarget} onChange={(event) => setTemplateDraft({ ...templateDraft, alignmentTarget: event.target.value })} />
              </label>
              <label>
                <span>Roadmap status</span>
                <input value={templateDraft.roadmapStatus} onChange={(event) => setTemplateDraft({ ...templateDraft, roadmapStatus: event.target.value })} />
              </label>
              <div className="analysis-qa-composer-grid">
                <label>
                  <span>Tag filter</span>
                  <input value={templateDraft.tag} onChange={(event) => setTemplateDraft({ ...templateDraft, tag: event.target.value })} />
                </label>
                <label>
                  <span>Source text filter</span>
                  <input value={templateDraft.sourceIncludes} onChange={(event) => setTemplateDraft({ ...templateDraft, sourceIncludes: event.target.value })} />
                </label>
              </div>
              <div className="analysis-qa-composer-grid">
                <label>
                  <span>Template source label</span>
                  <input value={templateDraft.source} onChange={(event) => setTemplateDraft({ ...templateDraft, source: event.target.value })} />
                </label>
                <label>
                  <span>Template tags</span>
                  <input value={templateDraft.tags} onChange={(event) => setTemplateDraft({ ...templateDraft, tags: event.target.value })} />
                </label>
              </div>
              <div className="analysis-execution-actions">
                <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={saveSelectedTemplate} disabled={!selectedTemplate || selectedTemplateArchived || !onUpdateBatchTemplate}>
                  <ClipboardCheck size={14} />
                  Save template edits
                </button>
                {selectedTemplateArchived ? (
                  <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={restoreSelectedTemplate} disabled={!selectedTemplate || !onUpdateBatchTemplate}>
                    <RotateCcw size={14} />
                    Restore template
                  </button>
                ) : (
                  <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={archiveSelectedTemplate} disabled={!selectedTemplate || !onUpdateBatchTemplate}>
                    <Archive size={14} />
                    Archive template
                  </button>
                )}
                <button className="analysis-chip-button" type="button" onClick={deleteSelectedTemplate} disabled={!selectedTemplate || !onDeleteBatchTemplate || selectedTemplateGeneratedCount > 0}>
                  <Trash2 size={14} />
                  Delete template
                </button>
              </div>
              {selectedTemplateGeneratedCount > 0 && (
                <p>Delete is unavailable because generated queue work still references this template. Archive it to hide it without losing work history.</p>
              )}
              {selectedTemplateArchived && <p>Archived templates are read-only for new work runs. Restore or duplicate this template before running it again.</p>}

              <h2>Source Preview</h2>
              {editableTemplate && selectedTemplateSources.length > 0 ? (
                <div className="analysis-template-source-list">
                  {selectedTemplateSources.slice(0, 8).map((source) => {
                    const sourceKey = templateSourceKey(editableTemplate, source);
                    const isNew = !existingTemplateSourceIds.has(sourceKey);
                    return (
                      <label className="analysis-template-source-row" key={sourceKey}>
                        <input
                          type="checkbox"
                          checked={isNew && selectedTemplateSourceKeys.includes(sourceKey)}
                          disabled={!isNew}
                          onChange={() => toggleTemplateSource(sourceKey)}
                        />
                        <span>
                          <strong>{source.title}</strong>
                          <em>{isNew ? 'New work item' : 'Already queued'}</em>
                          <small>{source.summary}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p>No sources match the current template filters.</p>
              )}
              <button className="analysis-card-toggle" type="button" onClick={runSelectedTemplate} disabled={!editableTemplate || selectedTemplateArchived || !onAddWorkItem || selectedNewTemplateSources.length === 0}>
                <Plus size={14} />
                Create batch work items
              </button>
              <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={recordSelectedTemplateRerun} disabled={!editableTemplate || selectedTemplateArchived || !onUpdateBatchTemplate || selectedTemplateSources.length === 0}>
                <ClipboardCheck size={14} />
                Record rerun check
              </button>
            </>
          )}
          {templateRunMessage && <p>{templateRunMessage}</p>}

          <h2>Batch Planning</h2>
          <p>
            {batchableItems.length} visible active item{batchableItems.length === 1 ? '' : 's'}:
            {' '}{batchableWorkItemCount} work item{batchableWorkItemCount === 1 ? '' : 's'} and {batchableFeatureCount} feature item{batchableFeatureCount === 1 ? '' : 's'}.
          </p>
          <div className="analysis-execution-actions">
            <button
              className="analysis-card-toggle"
              type="button"
              onClick={() => applyBatchUpdate('in-progress', 'Started visible queue batch', (item) => ({
                mvpStatus: 'Current work item',
                mvpNextAction: item.action,
              }))}
              disabled={!canBatchVisible}
            >
              <Play size={14} />
              Start visible work
            </button>
            <button
              className="analysis-card-toggle analysis-card-toggle--secondary"
              type="button"
              onClick={() => applyBatchUpdate('review', 'Moved visible queue batch to review', () => ({
                mvpStatus: 'Ready for sign-off',
                mvpSignoff: 'in-review',
              }))}
              disabled={!canBatchVisible}
            >
              Review visible work
            </button>
            <button
              className="analysis-chip-button"
              type="button"
              onClick={() => applyBatchUpdate('deferred', 'Deferred visible queue batch', () => ({
                mvpDecision: 'defer',
                mvpStatus: 'Deferred from active scope',
                mvpSignoff: 'not-started',
                mvpCutSafety: 'safe-to-cut',
              }))}
              disabled={!canBatchVisible}
            >
              Defer visible work
            </button>
          </div>

          <h2>Save Queue View</h2>
          <label>
            <span>View name</span>
            <input value={viewDraft.name} onChange={(event) => setViewDraft({ ...viewDraft, name: event.target.value })} />
          </label>
          <label>
            <span>View summary</span>
            <textarea rows={2} value={viewDraft.summary} onChange={(event) => setViewDraft({ ...viewDraft, summary: event.target.value })} />
          </label>
          <div className="analysis-qa-composer-grid">
            <label>
              <span>Owner</span>
              <input value={viewDraft.owner} onChange={(event) => setViewDraft({ ...viewDraft, owner: event.target.value })} />
            </label>
            <label>
              <span>Cadence</span>
              <input value={viewDraft.cadence} onChange={(event) => setViewDraft({ ...viewDraft, cadence: event.target.value })} />
            </label>
          </div>
          <label>
            <span>Outcome</span>
            <textarea rows={2} value={viewDraft.outcome} onChange={(event) => setViewDraft({ ...viewDraft, outcome: event.target.value })} />
          </label>
          <button className="analysis-card-toggle" type="button" onClick={saveCurrentQueueView} disabled={!viewDraft.name.trim() || !onAddQueueView}>
            <Plus size={14} />
            Save current view
          </button>

          <h2>Add Work Item</h2>
          <label>
            <span>Title</span>
            <input value={workDraft.title} onChange={(event) => setWorkDraft({ ...workDraft, title: event.target.value })} />
          </label>
          <label>
            <span>Summary</span>
            <textarea rows={3} value={workDraft.summary} onChange={(event) => setWorkDraft({ ...workDraft, summary: event.target.value })} />
          </label>
          <label>
            <span>Next action</span>
            <textarea rows={2} value={workDraft.nextAction} onChange={(event) => setWorkDraft({ ...workDraft, nextAction: event.target.value })} />
          </label>
          <div className="analysis-qa-composer-grid">
            <label>
              <span>Type</span>
              <select value={workDraft.type} onChange={(event) => setWorkDraft({ ...workDraft, type: event.target.value as ProjectWorkItemType })}>
                {workItemTypeOrder.map((type) => <option key={type} value={type}>{projectWorkItemTypeLabels[type]}</option>)}
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select value={workDraft.priority} onChange={(event) => setWorkDraft({ ...workDraft, priority: event.target.value as ProjectWorkItemPriority })}>
                {workItemPriorityOrder.map((priority) => <option key={priority} value={priority}>{projectWorkItemPriorityLabels[priority]}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span>Status</span>
            <select value={workDraft.status} onChange={(event) => setWorkDraft({ ...workDraft, status: event.target.value as ProjectWorkItemStatus })}>
              {workItemStatusOrder.map((status) => <option key={status} value={status}>{projectWorkItemStatusLabels[status]}</option>)}
            </select>
          </label>
          <label>
            <span>Feature</span>
            <select value={workDraft.featureId} onChange={(event) => setWorkDraft({ ...workDraft, featureId: event.target.value })}>
              <option value="">No feature link</option>
              {model.features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
            </select>
          </label>
          <label>
            <span>Owner</span>
            <input value={workDraft.owner} onChange={(event) => setWorkDraft({ ...workDraft, owner: event.target.value })} />
          </label>
          <label>
            <span>Source path</span>
            <input value={workDraft.sourcePath} onChange={(event) => setWorkDraft({ ...workDraft, sourcePath: event.target.value })} />
          </label>
          <label>
            <span>Tags</span>
            <input value={workDraft.tags} onChange={(event) => setWorkDraft({ ...workDraft, tags: event.target.value })} />
          </label>
          <button className="analysis-card-toggle" type="button" onClick={addDedicatedWorkItem} disabled={!workDraft.title.trim() || !workDraft.summary.trim() || !onAddWorkItem}>
            <Plus size={14} />
            Add work item
          </button>

          <h2>How To Use This Queue</h2>
          <ol>
            <li><strong>Blocked:</strong><span>Fix failed QA and hard dependencies before assigning more work.</span></li>
            <li><strong>Test / retest:</strong><span>Run manual or automated checks and attach evidence.</span></li>
            <li><strong>Map files:</strong><span>Confirm the exact app/plugin/server files before building or changing scope.</span></li>
            <li><strong>Review:</strong><span>Approve the feature, simplify it, or defer it with a progress note.</span></li>
          </ol>
          <h2>Next Queue Upgrade</h2>
          <p>
            The next useful layer is batch templates that can create a prepared run of work items from
            selected docs, QA items, roadmap records, and MCP platform milestones.
          </p>
        </aside>
      </section>
    </main>
  );
}

function ExecutionSummary({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="analysis-readiness-summary-card" style={{ borderColor: tone }}>
      <span style={{ color: tone }}>{icon}</span>
      <strong>{value}</strong>
      <em>{label}</em>
    </div>
  );
}
