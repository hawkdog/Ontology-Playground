import { projectAnalysisFromJson, type ProjectAnalysisModel } from '../data/projectAnalysis';

const defaultApiBase = 'http://localhost:3008';
const defaultProjectMapId = 'project-analysis-local';

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_PROJECT_ANALYSIS_API_URL;
  return typeof configured === 'string' && configured.trim() ? configured.trim().replace(/\/$/, '') : defaultApiBase;
}

function projectMapId(id?: string): string {
  if (typeof id === 'string' && id.trim()) {
    return id.trim();
  }

  const configured = import.meta.env.VITE_PROJECT_ANALYSIS_MAP_ID;
  return typeof configured === 'string' && configured.trim() ? configured.trim() : defaultProjectMapId;
}

interface ProjectMapRow {
  id: string;
  project_name: string;
  source_label?: string;
  payload: unknown;
  updated_at?: string;
}

export async function loadProjectAnalysisFromApi(id?: string): Promise<ProjectAnalysisModel> {
  const mapId = projectMapId(id);
  const response = await fetch(`${apiBaseUrl()}/project_maps?id=eq.${encodeURIComponent(mapId)}&select=*`);

  if (!response.ok) {
    throw new Error(`Private ontology API returned ${response.status}.`);
  }

  const rows = await response.json() as ProjectMapRow[];
  const row = rows[0];
  if (!row) {
    throw new Error(`No private project map exists for "${mapId}". Import the JSON into the database first.`);
  }

  return projectAnalysisFromJson(row.payload, row.source_label || `${row.project_name} database`);
}

export async function saveProjectAnalysisToApi(model: ProjectAnalysisModel, id?: string): Promise<void> {
  const mapId = projectMapId(id);
  const response = await fetch(`${apiBaseUrl()}/project_maps?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: mapId,
      project_name: model.projectName,
      source_label: model.sourceLabel || 'Project Analyzer UI',
      payload: model,
    }),
  });

  if (!response.ok) {
    throw new Error(`Private ontology API save failed: ${response.status}.`);
  }
}
