import {
  type AgentUseLevel,
  type MarkdownDocument,
  type ProjectAnalysisModel,
  type ProjectWorkItemStatus,
  type QAItemStatus,
} from '../../src/data/projectAnalysis.ts';
import { localDevAccessContext, type McpAccessContext } from './access.ts';
import { documentAllowedBySensitivity, loadProjectContext, projectContextConfig } from './projectContext.ts';

type JsonObject = Record<string, unknown>;

export interface McpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonObject;
  annotations?: JsonObject;
}

export interface ToolCallResult {
  resultType: 'complete';
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: JsonObject;
  isError: boolean;
}

interface ContextFilters {
  featureId?: string;
  repositoryId?: string;
  alignmentTarget?: string;
  tag?: string;
  agentUseLevel?: AgentUseLevel;
  includePrivate?: boolean;
  limit?: number;
}

const emptySchema = {
  type: 'object',
  additionalProperties: false,
};

const contextFilterSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    featureId: { type: 'string', description: 'Only include records linked to this feature id.' },
    repositoryId: { type: 'string', description: 'Only include records linked to this repository id.' },
    alignmentTarget: { type: 'string', description: 'Only include markdown docs aligned to this target.' },
    tag: { type: 'string', description: 'Only include docs or resources carrying this context tag.' },
    agentUseLevel: { type: 'string', enum: ['required', 'recommended', 'reference'] },
    includePrivate: { type: 'boolean', description: 'Set false to exclude private markdown documents even when the server allows them.' },
    limit: { type: 'number', minimum: 1, maximum: 100 },
  },
};

const readOnlyClosedWorldAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const projectContextTools: McpToolDefinition[] = [
  {
    name: 'project.summary',
    title: 'Project Summary',
    description: 'Return a read-only summary of the current Project Analyzer map and available context counts.',
    inputSchema: emptySchema,
    annotations: readOnlyClosedWorldAnnotations,
  },
  {
    name: 'project.markdown_context_pack',
    title: 'Markdown Context Pack',
    description: 'Return filtered markdown project memory, required checks, and attached resources for agent work.',
    inputSchema: contextFilterSchema,
    annotations: readOnlyClosedWorldAnnotations,
  },
  {
    name: 'project.resources.list',
    title: 'Resource Library Records',
    description: 'Return attached resource-library links from filtered markdown documents.',
    inputSchema: contextFilterSchema,
    annotations: readOnlyClosedWorldAnnotations,
  },
  {
    name: 'project.work_queue.list',
    title: 'Work Queue Items',
    description: 'Return read-only work queue items with optional status, type, source, owner, and tag filters.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string' },
        type: { type: 'string' },
        source: { type: 'string' },
        owner: { type: 'string' },
        tag: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
    },
    annotations: readOnlyClosedWorldAnnotations,
  },
  {
    name: 'project.qa_status',
    title: 'QA Status',
    description: 'Return QA status counts and open QA items from the current project map.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string' },
        featureId: { type: 'string' },
        repositoryId: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
    },
    annotations: readOnlyClosedWorldAnnotations,
  },
  {
    name: 'project.roadmap_signals',
    title: 'Roadmap Signals',
    description: 'Return roadmap sources, roadmap items, and feature-level roadmap signals.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string' },
        featureId: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
    },
    annotations: readOnlyClosedWorldAnnotations,
  },
];

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function stringArg(args: JsonObject, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function boolArg(args: JsonObject, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === 'boolean' ? value : undefined;
}

function limitArg(args: JsonObject): number {
  const value = args.limit;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 25;
  return Math.min(100, Math.max(1, Math.trunc(value)));
}

function sourceMeta(source: string, sourceLabel: string, access: McpAccessContext): JsonObject {
  const config = projectContextConfig();
  return {
    source,
    sourceLabel,
    readOnly: true,
    includePrivateContext: config.includePrivateContext && access.allowedPrivateContext,
    mapId: config.mapId,
    tenantId: access.tenantId,
    clientId: access.clientId,
    licensePlan: access.licensePlan,
  };
}

function modelCounts(model: ProjectAnalysisModel): JsonObject {
  return {
    repositories: model.repositories.length,
    capabilities: model.capabilities.length,
    features: model.features.length,
    files: model.features.reduce((count, feature) => (
      count
      + (feature.appFiles?.length ?? 0)
      + (feature.pluginFiles?.length ?? 0)
      + (feature.playgroundFiles?.length ?? 0)
      + (feature.privateDataFiles?.length ?? 0)
      + (feature.qaEvidenceFiles?.length ?? 0)
    ), 0),
    markdownDocuments: model.markdownDocuments?.length ?? 0,
    resources: (model.markdownDocuments ?? []).reduce((count, doc) => count + (doc.resources?.length ?? 0), 0),
    workItems: model.workItems?.length ?? 0,
    qaItems: model.qaItems?.length ?? 0,
    roadmapItems: model.roadmapItems?.length ?? 0,
  };
}

function docMatches(doc: MarkdownDocument, filters: ContextFilters, includePrivateContext: boolean): boolean {
  if (!documentAllowedBySensitivity(doc, includePrivateContext, filters.includePrivate)) return false;
  if (filters.featureId && !(doc.featureIds ?? []).includes(filters.featureId)) return false;
  if (filters.repositoryId && !(doc.repositoryIds ?? []).includes(filters.repositoryId)) return false;
  if (filters.alignmentTarget && !(doc.alignmentTargets ?? []).includes(filters.alignmentTarget)) return false;
  if (filters.agentUseLevel && (doc.agentUseLevel ?? 'reference') !== filters.agentUseLevel) return false;
  if (filters.tag) {
    const tags = [
      ...(doc.tags ?? []),
      ...(doc.appliesTo ?? []),
      ...(doc.resources ?? []).flatMap((resource) => resource.tags ?? []),
    ];
    if (!tags.some((tag) => tag.toLowerCase() === filters.tag?.toLowerCase())) return false;
  }
  return true;
}

function contextFilters(args: JsonObject): ContextFilters {
  const agentUseLevel = stringArg(args, 'agentUseLevel');
  return {
    featureId: stringArg(args, 'featureId'),
    repositoryId: stringArg(args, 'repositoryId'),
    alignmentTarget: stringArg(args, 'alignmentTarget'),
    tag: stringArg(args, 'tag'),
    agentUseLevel: agentUseLevel === 'required' || agentUseLevel === 'recommended' || agentUseLevel === 'reference' ? agentUseLevel : undefined,
    includePrivate: boolArg(args, 'includePrivate'),
    limit: limitArg(args),
  };
}

function markdownContextPack(model: ProjectAnalysisModel, args: JsonObject, access: McpAccessContext): JsonObject {
  const filters = contextFilters(args);
  const config = projectContextConfig();
  const includePrivateContext = config.includePrivateContext && access.allowedPrivateContext;
  const docs = (model.markdownDocuments ?? []).filter((doc) => docMatches(doc, filters, includePrivateContext)).slice(0, filters.limit);
  return {
    filters,
    documents: docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      path: doc.path,
      purpose: doc.purpose,
      status: doc.status,
      sensitivity: doc.sensitivity,
      summary: doc.summary,
      repositoryIds: doc.repositoryIds ?? [],
      featureIds: doc.featureIds ?? [],
      tags: doc.tags ?? [],
      alignmentTargets: doc.alignmentTargets ?? [],
      appliesTo: doc.appliesTo ?? [],
      requiredChecks: doc.requiredChecks ?? [],
      agentUseLevel: doc.agentUseLevel ?? 'reference',
      resources: doc.resources ?? [],
      auditFindings: doc.auditFindings ?? [],
    })),
    summary: {
      documentCount: docs.length,
      requiredDocuments: docs.filter((doc) => doc.agentUseLevel === 'required').length,
      resourceCount: docs.reduce((count, doc) => count + (doc.resources?.length ?? 0), 0),
      requiredCheckCount: docs.reduce((count, doc) => count + (doc.requiredChecks?.length ?? 0), 0),
    },
  };
}

function resourceRecords(model: ProjectAnalysisModel, args: JsonObject, access: McpAccessContext): JsonObject {
  const pack = markdownContextPack(model, args, access);
  const documents = Array.isArray(pack.documents) ? pack.documents : [];
  return {
    filters: pack.filters,
    resources: documents.flatMap((doc) => {
      const document = asObject(doc);
      const resources = Array.isArray(document.resources) ? document.resources : [];
      return resources.map((resource) => ({
        ...asObject(resource),
        documentId: document.id,
        documentTitle: document.title,
        documentPath: document.path,
        agentUseLevel: document.agentUseLevel,
      }));
    }),
  };
}

function workQueue(model: ProjectAnalysisModel, args: JsonObject): JsonObject {
  const status = stringArg(args, 'status') as ProjectWorkItemStatus | undefined;
  const type = stringArg(args, 'type');
  const source = stringArg(args, 'source');
  const owner = stringArg(args, 'owner');
  const tag = stringArg(args, 'tag');
  const limit = limitArg(args);
  const items = (model.workItems ?? []).filter((item) => {
    if (status && item.status !== status) return false;
    if (type && item.type !== type) return false;
    if (source && item.source !== source) return false;
    if (owner && item.owner !== owner) return false;
    if (tag && !(item.tags ?? []).includes(tag)) return false;
    return true;
  }).slice(0, limit);

  return {
    filters: { status, type, source, owner, tag, limit },
    items,
    counts: items.reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {}),
  };
}

function qaStatus(model: ProjectAnalysisModel, args: JsonObject): JsonObject {
  const status = stringArg(args, 'status') as QAItemStatus | undefined;
  const featureId = stringArg(args, 'featureId');
  const repositoryId = stringArg(args, 'repositoryId');
  const limit = limitArg(args);
  const items = (model.qaItems ?? []).filter((item) => {
    if (status && item.status !== status) return false;
    if (featureId && !item.featureIds.includes(featureId)) return false;
    if (repositoryId && !(item.repositoryIds ?? []).includes(repositoryId)) return false;
    return true;
  });

  return {
    filters: { status, featureId, repositoryId, limit },
    counts: items.reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {}),
    openItems: items.filter((item) => !['passed', 'deferred'].includes(item.status)).slice(0, limit),
  };
}

function roadmapSignals(model: ProjectAnalysisModel, args: JsonObject): JsonObject {
  const status = stringArg(args, 'status');
  const featureId = stringArg(args, 'featureId');
  const limit = limitArg(args);
  const featureSignals = model.features.flatMap((feature) => (
    (feature.roadmapSignals ?? []).map((signal) => ({
      ...signal,
      featureId: feature.id,
      featureName: feature.name,
    }))
  )).filter((signal) => {
    if (featureId && signal.featureId !== featureId) return false;
    if (status && signal.status !== status) return false;
    return true;
  });

  return {
    filters: { status, featureId, limit },
    roadmapSources: (model.roadmapSources ?? []).filter((source) => !status || source.status === status).slice(0, limit),
    roadmapItems: (model.roadmapItems ?? []).filter((item) => !status || item.status === status).slice(0, limit),
    featureSignals: featureSignals.slice(0, limit),
  };
}

function textResult(payload: JsonObject): ToolCallResult {
  return {
    resultType: 'complete',
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: false,
  };
}

export async function callProjectTool(name: string, args: unknown = {}, access: McpAccessContext = localDevAccessContext): Promise<ToolCallResult> {
  const requestArgs = asObject(args);
  const context = await loadProjectContext();
  const basePayload = {
    project: {
      schemaVersion: context.model.schemaVersion,
      projectName: context.model.projectName,
      sourceLabel: context.model.sourceLabel,
    },
    access: sourceMeta(context.source, context.sourceLabel, access),
  };

  switch (name) {
    case 'project.summary':
      return textResult({
        ...basePayload,
        counts: modelCounts(context.model),
        scope: {
          purpose: context.model.scopePurpose,
          privacyBoundary: context.model.privacyBoundary,
        },
        openQuestions: context.model.openQuestions ?? [],
      });
    case 'project.markdown_context_pack':
      return textResult({ ...basePayload, ...markdownContextPack(context.model, requestArgs, access) });
    case 'project.resources.list':
      return textResult({ ...basePayload, ...resourceRecords(context.model, requestArgs, access) });
    case 'project.work_queue.list':
      return textResult({ ...basePayload, ...workQueue(context.model, requestArgs) });
    case 'project.qa_status':
      return textResult({ ...basePayload, ...qaStatus(context.model, requestArgs) });
    case 'project.roadmap_signals':
      return textResult({ ...basePayload, ...roadmapSignals(context.model, requestArgs) });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
