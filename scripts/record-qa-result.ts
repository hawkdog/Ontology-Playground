import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ProjectAnalysisModel, QAAttachment, QAItem, QAItemStatus } from '../src/data/projectAnalysis';

type UnknownRecord = Record<string, unknown>;

interface ProjectMapRow {
  id: string;
  project_name: string;
  source_label?: string;
  payload: ProjectAnalysisModel;
}

interface CliOptions {
  api?: string;
  mapId?: string;
  qaId?: string;
  testId?: string;
  status?: QAItemStatus;
  note?: string;
  result?: string;
  actualResult?: string;
  author?: string;
  imageRefs: string[];
  list: boolean;
}

const defaultApiBase = 'http://localhost:3008';
const defaultProjectMapId = 'project-analysis-local';
const allowedStatuses = new Set<QAItemStatus>([
  'not-started',
  'ready',
  'in-progress',
  'partial',
  'needs-retest',
  'blocked',
  'failed',
  'passed',
  'deferred',
  'future',
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStatus(value: string | undefined): QAItemStatus | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'needs retest') return 'needs-retest';
  if (normalized === 'in progress') return 'in-progress';
  if (allowedStatuses.has(normalized as QAItemStatus)) return normalized as QAItemStatus;
  throw new Error(`Unsupported QA status "${value}".`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { imageRefs: [], list: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--list') {
      options.list = true;
    } else if (arg === '--api' && next) {
      options.api = next;
      index += 1;
    } else if (arg.startsWith('--api=')) {
      options.api = arg.slice('--api='.length);
    } else if (arg === '--map-id' && next) {
      options.mapId = next;
      index += 1;
    } else if (arg.startsWith('--map-id=')) {
      options.mapId = arg.slice('--map-id='.length);
    } else if (arg === '--qa-id' && next) {
      options.qaId = next;
      index += 1;
    } else if (arg.startsWith('--qa-id=')) {
      options.qaId = arg.slice('--qa-id='.length);
    } else if (arg === '--test-id' && next) {
      options.testId = next;
      index += 1;
    } else if (arg.startsWith('--test-id=')) {
      options.testId = arg.slice('--test-id='.length);
    } else if (arg === '--status' && next) {
      options.status = parseStatus(next);
      index += 1;
    } else if (arg.startsWith('--status=')) {
      options.status = parseStatus(arg.slice('--status='.length));
    } else if (arg === '--note' && next) {
      options.note = next;
      index += 1;
    } else if (arg.startsWith('--note=')) {
      options.note = arg.slice('--note='.length);
    } else if (arg === '--result' && next) {
      options.result = next;
      index += 1;
    } else if (arg.startsWith('--result=')) {
      options.result = arg.slice('--result='.length);
    } else if (arg === '--actual-result' && next) {
      options.actualResult = next;
      index += 1;
    } else if (arg.startsWith('--actual-result=')) {
      options.actualResult = arg.slice('--actual-result='.length);
    } else if (arg === '--author' && next) {
      options.author = next;
      index += 1;
    } else if (arg.startsWith('--author=')) {
      options.author = arg.slice('--author='.length);
    } else if (arg === '--image' && next) {
      options.imageRefs.push(next);
      index += 1;
    } else if (arg.startsWith('--image=')) {
      options.imageRefs.push(arg.slice('--image='.length));
    }
  }

  return options;
}

async function loadEnvFile(filePath: string): Promise<Record<string, string>> {
  if (!existsSync(filePath)) return {};
  const text = await readFile(filePath, 'utf8');
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) env[key] = value;
  }
  return env;
}

function envValue(key: string, envFile: Record<string, string>, fallback = ''): string {
  return process.env[key] || envFile[key] || fallback;
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

async function loadProjectMap(apiBase: string, mapId: string): Promise<ProjectMapRow> {
  const response = await fetch(`${apiBase}/project_maps?id=eq.${encodeURIComponent(mapId)}&select=*`);
  if (!response.ok) throw new Error(`Project map API returned HTTP ${response.status}.`);
  const rows = await response.json() as unknown;
  if (!Array.isArray(rows) || !isRecord(rows[0])) throw new Error(`No project map exists for "${mapId}".`);
  const row = rows[0];
  if (!isRecord(row.payload)) throw new Error(`Project map "${mapId}" does not contain a JSON payload.`);
  return row as unknown as ProjectMapRow;
}

async function saveProjectMap(apiBase: string, mapId: string, row: ProjectMapRow, payload: ProjectAnalysisModel): Promise<void> {
  const response = await fetch(`${apiBase}/project_maps?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: mapId,
      project_name: row.project_name,
      source_label: row.source_label || 'Project Analyzer UI',
      payload,
    }),
  });

  if (!response.ok) throw new Error(`Project map API save returned HTTP ${response.status}.`);
}

function attachmentFromRef(ref: string, index: number): QAAttachment {
  const isUrl = /^https?:\/\//i.test(ref);
  const label = isUrl ? ref : path.basename(ref);
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(ref);
  return {
    id: `qa-result-image-${Date.now().toString(36)}-${index + 1}`,
    label: label || `Evidence ${index + 1}`,
    type: isImage ? 'screenshot' : isUrl ? 'link' : 'document',
    path: isUrl ? undefined : ref,
    url: isUrl ? ref : undefined,
    description: 'Added by the local QA result recorder.',
  };
}

function findQAItem(items: QAItem[], options: CliOptions): QAItem | undefined {
  if (options.qaId) return items.find((item) => item.id === options.qaId);
  if (options.testId) return items.find((item) => item.testId === options.testId);
  return undefined;
}

function listQAItems(model: ProjectAnalysisModel): void {
  const rows = (model.qaItems ?? []).map((item) => ({
    id: item.id,
    testId: item.testId || '',
    status: item.status,
    title: item.title,
  }));
  console.log(JSON.stringify(rows, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFile = await loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  const apiBase = normalizeUrl(options.api || envValue('VITE_PROJECT_ANALYSIS_API_URL', envFile, defaultApiBase));
  const mapId = options.mapId || envValue('VITE_PROJECT_ANALYSIS_MAP_ID', envFile, defaultProjectMapId);
  const row = await loadProjectMap(apiBase, mapId);
  const model = row.payload;

  if (options.list) {
    listQAItems(model);
    return;
  }

  if (!options.qaId && !options.testId) {
    throw new Error('Provide --qa-id or --test-id, or use --list to inspect available QA items.');
  }

  const qaItems = model.qaItems ?? [];
  const selected = findQAItem(qaItems, options);
  if (!selected) {
    throw new Error(`No QA item matched ${options.qaId ? `id "${options.qaId}"` : `test id "${options.testId}"`}.`);
  }

  const now = new Date().toISOString();
  const images = options.imageRefs.map(attachmentFromRef);
  const body = options.note?.trim() || options.actualResult?.trim() || options.result?.trim() || 'QA result recorded.';
  const updatedItems = qaItems.map((item) => {
    if (item.id !== selected.id) return item;
    return {
      ...item,
      status: options.status ?? item.status,
      result: options.result ?? item.result,
      actualResult: options.actualResult ?? item.actualResult,
      updatedAt: now,
      lastTested: now,
      progressLog: [
        {
          id: `qa-progress-${Date.now().toString(36)}`,
          createdAt: now,
          body,
          status: options.status ?? item.status,
          author: options.author || 'Local QA recorder',
          images,
        },
        ...(item.progressLog ?? []),
      ],
      attachments: images.length > 0 ? [...images, ...(item.attachments ?? [])] : item.attachments,
    };
  });

  await saveProjectMap(apiBase, mapId, row, { ...model, qaItems: updatedItems });
  console.log(JSON.stringify({
    recorded: selected.id,
    title: selected.title,
    status: options.status ?? selected.status,
    images: images.length,
    mapId,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
