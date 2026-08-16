export type RepositoryVisibility = 'public' | 'private' | 'internal';
export type RepositoryType = 'web-app' | 'service' | 'plugin' | 'package' | 'docs';
export type FeatureDisposition = 'keep' | 'simplify' | 'hide' | 'gate' | 'consolidate' | 'defer' | 'remove' | 'remove-later' | 'new';
export type ComponentKind = 'screen' | 'api' | 'service' | 'job' | 'schema' | 'integration' | 'document';
export type DependencyType = 'requires' | 'feeds' | 'blocks' | 'duplicates' | 'replaces';
export type FileReferenceStatus = 'mapped' | 'existing' | 'planned' | 'orphan' | 'needs-review';
export type RoadmapSignalStatus = 'shipped' | 'in-progress' | 'planned' | 'concept' | 'needs-review';

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
  shipped: 'Shipped',
  'in-progress': 'In progress',
  planned: 'Planned',
  concept: 'Concept',
  'needs-review': 'Needs review',
};

export const roadmapStatusColors: Record<RoadmapSignalStatus, string> = {
  shipped: '#107C10',
  'in-progress': '#0078D4',
  planned: '#8764B8',
  concept: '#008272',
  'needs-review': '#C19C00',
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

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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
    status: stringValue(signal.status, 'needs-review'),
    summary: stringValue(signal.summary),
    phase: stringValue(signal.phase),
    target: stringValue(signal.target),
  })).filter((signal) => signal.source && signal.summary);
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
};
