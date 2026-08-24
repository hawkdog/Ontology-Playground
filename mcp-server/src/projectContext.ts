import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  projectAnalysisFromJson,
  sampleProjectAnalysis,
  type MarkdownDocument,
  type ProjectAnalysisModel,
} from '../../src/data/projectAnalysis.ts';

const defaultProjectMapId = 'project-analysis-local';

interface ProjectMapRow {
  id: string;
  project_name: string;
  source_label?: string;
  payload: unknown;
  updated_at?: string;
}

export interface ProjectContextSource {
  model: ProjectAnalysisModel;
  source: 'file' | 'api' | 'sample';
  sourceLabel: string;
}

export interface ProjectContextConfig {
  sourceFile?: string;
  apiUrl?: string;
  mapId: string;
  allowSample: boolean;
  includePrivateContext: boolean;
}

export function projectContextConfig(env: NodeJS.ProcessEnv = process.env): ProjectContextConfig {
  const sourceFile = env.PROJECT_ANALYSIS_SOURCE_FILE?.trim();
  const apiUrl = (env.PROJECT_ANALYSIS_API_URL || env.VITE_PROJECT_ANALYSIS_API_URL || '').trim().replace(/\/$/, '');
  const mapId = (env.PROJECT_ANALYSIS_MAP_ID || env.VITE_PROJECT_ANALYSIS_MAP_ID || defaultProjectMapId).trim();
  return {
    sourceFile: sourceFile || undefined,
    apiUrl: apiUrl || undefined,
    mapId,
    allowSample: env.PROJECT_ANALYSIS_ALLOW_SAMPLE !== 'false',
    includePrivateContext: env.MCP_INCLUDE_PRIVATE_CONTEXT !== 'false',
  };
}

export async function loadProjectContext(config = projectContextConfig()): Promise<ProjectContextSource> {
  if (config.sourceFile) {
    const filePath = path.resolve(config.sourceFile);
    const raw = await readFile(filePath, 'utf8');
    return {
      model: projectAnalysisFromJson(JSON.parse(raw), `file:${path.basename(filePath)}`),
      source: 'file',
      sourceLabel: filePath,
    };
  }

  if (config.apiUrl) {
    const response = await fetch(`${config.apiUrl}/project_maps?id=eq.${encodeURIComponent(config.mapId)}&select=*`);
    if (!response.ok) {
      throw new Error(`Project Analyzer API returned ${response.status}.`);
    }
    const rows = await response.json() as ProjectMapRow[];
    const row = rows[0];
    if (!row) {
      throw new Error(`No project map exists for "${config.mapId}".`);
    }
    return {
      model: projectAnalysisFromJson(row.payload, row.source_label || `${row.project_name} database`),
      source: 'api',
      sourceLabel: `${config.apiUrl}/project_maps/${row.id}`,
    };
  }

  if (config.allowSample) {
    return {
      model: projectAnalysisFromJson(sampleProjectAnalysis, 'Fictional sample MCP context'),
      source: 'sample',
      sourceLabel: 'fictional sample',
    };
  }

  throw new Error('No project context source configured. Set PROJECT_ANALYSIS_SOURCE_FILE or PROJECT_ANALYSIS_API_URL.');
}

export function documentAllowedBySensitivity(
  doc: MarkdownDocument,
  includePrivateContext: boolean,
  requestIncludesPrivate: boolean | undefined,
): boolean {
  if (doc.sensitivity !== 'private') return true;
  return includePrivateContext && requestIncludesPrivate !== false;
}
