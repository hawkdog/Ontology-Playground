import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  MarkdownDocument,
  MarkdownDocumentPurpose,
  MarkdownDocumentSensitivity,
  ProjectAnalysisModel,
  ProjectTestingRuntimeScan,
  TestingRuntimeEndpoint,
  TestingRuntimeRepository,
  TestingRuntimeStatus,
  TestingToolCategory,
  TestingToolSignal,
} from '../src/data/projectAnalysis';

type UnknownRecord = Record<string, unknown>;

interface ProjectMapRow {
  id: string;
  project_name: string;
  source_label?: string;
  payload: unknown;
}

interface RepoCandidate {
  repositoryId: string;
  name: string;
  path: string;
}

interface CliOptions {
  root?: string;
  api?: string;
  mapId?: string;
  writeDb: boolean;
  output?: string;
}

const scannerVersion = '1.1.0';
const defaultApiBase = 'http://localhost:3008';
const defaultProjectMapId = 'project-analysis-local';
const excludedDirs = new Set(['.git', '.next', '.turbo', 'build', 'dist', 'node_modules', 'coverage']);
const markdownExcludedDirs = new Set([...excludedDirs, '.expo', '.vite', '.vercel', 'vendor']);
const maxMarkdownFileBytes = 512 * 1024;
const maxMarkdownDocuments = 300;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { writeDb: true };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--no-db') {
      options.writeDb = false;
    } else if (arg === '--root' && next) {
      options.root = next;
      index += 1;
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length);
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
    } else if (arg === '--output' && next) {
      options.output = next;
      index += 1;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
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

function commandVersion(command: string, args: string[]): string | undefined {
  const commands = process.platform === 'win32' && !/\.(cmd|exe)$/i.test(command)
    ? [command, `${command}.cmd`, `${command}.exe`]
    : [command];

  for (const candidate of commands) {
    try {
      return execFileSync(candidate, args, { encoding: 'utf8', timeout: 5_000, windowsHide: true }).trim().split(/\r?\n/)[0];
    } catch {
      // Try the next platform-specific command name.
    }
  }

  return undefined;
}

function tool(id: string, label: string, category: TestingToolCategory, status: TestingRuntimeStatus, summary: string, extra: Partial<TestingToolSignal> = {}): TestingToolSignal {
  return { id, label, category, status, summary, ...extra };
}

async function readJson(filePath: string): Promise<UnknownRecord | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function hasProjectFile(dir: string): Promise<boolean> {
  return existsSync(path.join(dir, 'package.json'))
    || existsSync(path.join(dir, 'composer.json'))
    || existsSync(path.join(dir, '.wp-env.json'));
}

async function discoverRepositoryDirs(root: string, payload?: unknown): Promise<RepoCandidate[]> {
  const candidates: RepoCandidate[] = [];

  if (isRecord(payload) && Array.isArray(payload.repositories)) {
    for (const repo of payload.repositories.filter(isRecord)) {
      const repositoryId = stringValue(repo.id);
      const name = stringValue(repo.name, repositoryId || 'Repository');
      const rawPath = stringValue(repo.path);
      if (!repositoryId && !rawPath) continue;

      const resolvedPath = rawPath
        ? path.resolve(root, rawPath)
        : path.resolve(root, repositoryId);
      if (existsSync(resolvedPath)) {
        candidates.push({ repositoryId: repositoryId || path.basename(resolvedPath), name, path: resolvedPath });
      }
    }
  }

  if (await hasProjectFile(root)) {
    candidates.push({ repositoryId: path.basename(root), name: path.basename(root), path: root });
  }

  try {
    for (const entry of await readdir(root)) {
      if (excludedDirs.has(entry)) continue;
      const child = path.join(root, entry);
      const details = await stat(child);
      if (details.isDirectory() && await hasProjectFile(child)) {
        candidates.push({ repositoryId: entry, name: entry, path: child });
      }
    }
  } catch {
    // Keep any candidates discovered from the ontology payload.
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = path.normalize(candidate.path).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function projectPath(root: string, filePath: string): string {
  const relative = path.relative(root, filePath);
  return (relative && !relative.startsWith('..')) ? relative.split(path.sep).join('/') : filePath.split(path.sep).join('/');
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'markdown-doc';
}

function markdownDocumentId(relativePath: string): string {
  return `md-doc-${slug(relativePath)}`;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

function stripFrontMatter(text: string): { body: string; frontMatter: string } {
  if (!text.startsWith('---')) return { body: text, frontMatter: '' };
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { body: text, frontMatter: '' };
  return { body: text.slice(match[0].length), frontMatter: match[1] };
}

function frontMatterValue(frontMatter: string, keys: string[]): string {
  if (!frontMatter) return '';
  for (const key of keys) {
    const pattern = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'im');
    const match = frontMatter.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/^['"]|['"]$/g, '');
  }
  return '';
}

function withoutMarkdownNoise(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.replace(/^\[|\]\([^)]*\)$/g, ''))
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function redactSecretLikeLines(text: string): string {
  const secretPattern = /(api[_-]?key|secret|token|password|passwd|service[_-]?role|private[_-]?key|client[_-]?secret|authorization)\s*[:=]/i;
  return text
    .split(/\r?\n/)
    .filter((line) => !secretPattern.test(line))
    .join('\n');
}

function compact(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function markdownTitle(filePath: string, body: string, frontMatter: string): string {
  const frontMatterTitle = frontMatterValue(frontMatter, ['title', 'name']);
  if (frontMatterTitle) return compact(frontMatterTitle, 96);
  const heading = body.match(/^#\s+(.+)$/m)?.[1];
  if (heading) return compact(heading.replace(/#+\s*$/, ''), 96);
  return path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, ' ');
}

function markdownSummary(body: string, frontMatter: string): string {
  const frontMatterSummary = frontMatterValue(frontMatter, ['summary', 'description']);
  if (frontMatterSummary) return compact(frontMatterSummary, 260);

  const clean = redactSecretLikeLines(withoutMarkdownNoise(body));
  const lines = clean.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const paragraph = lines.find((line) => (
    !line.startsWith('#')
    && !line.startsWith('|')
    && !line.startsWith('---')
    && !/^[-*]\s+\[[ x]]/i.test(line)
    && line.replace(/^[-*]\s+/, '').length > 50
  ));

  if (paragraph) return compact(paragraph.replace(/^[-*]\s+/, ''), 260);

  const headings = lines
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, '').trim())
    .slice(0, 4);
  return headings.length > 0 ? compact(`Covers ${headings.join(', ')}.`, 260) : 'Markdown project note discovered by the local Project Analyzer scanner.';
}

function markdownSourceSection(body: string): string {
  return body.match(/^#{2,3}\s+(.+)$/m)?.[1]?.replace(/#+\s*$/, '').trim() ?? '';
}

function inferMarkdownPurpose(relativePath: string, title: string, body: string): MarkdownDocumentPurpose {
  const value = `${relativePath} ${title} ${body.slice(0, 2000)}`.toLowerCase();
  if (/(security|rls|auth|owasp|secret|threat|permission)/.test(value)) return 'security';
  if (/(audit|review|checklist|standard|quality)/.test(value)) return 'audit';
  if (/(setup|install|environment|supabase|docker|local dev|configuration)/.test(value)) return 'setup';
  if (/(roadmap|mvp|backlog|todo|milestone|plan)/.test(value)) return 'roadmap';
  if (/(qa|test|testing|evidence|smoke|retest)/.test(value)) return 'qa';
  if (/(runbook|operation|deploy|release|incident)/.test(value)) return 'runbook';
  if (/(architecture|design|schema|api|adr|decision record)/.test(value)) return 'architecture';
  if (/(decision|decisions)/.test(value)) return 'decision';
  return 'reference';
}

function mcpAlignmentTargets(relativePath: string, title: string, body: string, purpose: MarkdownDocumentPurpose): string[] {
  const value = `${relativePath} ${title} ${body.slice(0, 4000)}`.toLowerCase();
  const targets: string[] = [];
  if (/(mcp|model context protocol|platform api|api boundary|server)/.test(value)) targets.push('MCP platform MVP');
  if (/(supabase|postgres|rls|row level security|migration|schema|sql|edge function)/.test(value)) targets.push('Schema/API audit');
  if (/(security|owasp|nist|auth|permission|license|entitlement|secret|token|key)/.test(value)) targets.push('Security baseline');
  if (/(wordpress|plugin|php|wp-admin|wp-cron|sync)/.test(value)) targets.push('WordPress/plugin integration');
  if (/(brand|icp|research|citation|link|campaign|brief|content context|context pack)/.test(value)) targets.push('Content intelligence resources');
  if (/(qa|test|evidence|smoke|retest|acceptance)/.test(value) || purpose === 'qa') targets.push('QA/release evidence');
  if (/(roadmap|mvp|execution|work queue|backlog|todo)/.test(value) || purpose === 'roadmap') targets.push('Execution planning');
  return uniqueStrings(targets);
}

function mcpAuditFindings(relativePath: string, title: string, body: string, purpose: MarkdownDocumentPurpose): string[] {
  const value = `${relativePath} ${title} ${body.slice(0, 4000)}`.toLowerCase();
  const findings: string[] = [];
  if (/(mcp|platform api|server)/.test(value)) findings.push('Review this document while defining MCP tool contracts and API boundaries.');
  if (/(supabase|postgres|rls|schema|migration|sql)/.test(value)) findings.push('Check this document against current migrations, RLS policies, and API helpers.');
  if (purpose === 'security' || /(security|owasp|auth|permission|license|entitlement)/.test(value)) findings.push('Use this document as an input to the security and entitlement audit.');
  return uniqueStrings(findings).slice(0, 3);
}

function repositoryIdsForFile(filePath: string, candidates: RepoCandidate[]): string[] {
  return candidates
    .filter((candidate) => {
      const relative = path.relative(candidate.path, filePath);
      return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    })
    .map((candidate) => candidate.repositoryId);
}

function featureIdsForMarkdown(relativePath: string, title: string, body: string, payload?: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) return [];
  const value = `${relativePath} ${title} ${body.slice(0, 20_000)}`.toLowerCase();
  return payload.features.filter(isRecord).flatMap((feature) => {
    const id = stringValue(feature.id);
    const name = stringValue(feature.name);
    if (!id) return [];
    const aliases = uniqueStrings([id, name]).map((item) => item.toLowerCase());
    const fileRefs = [
      ...stringArray(feature.appFiles),
      ...stringArray(feature.pluginFiles),
      ...stringArray(feature.playgroundFiles),
      ...stringArray(feature.privateDataFiles),
      ...stringArray(feature.qaEvidenceFiles),
    ].map((file) => file.toLowerCase());
    const matchesAlias = aliases.some((alias) => alias.length > 3 && value.includes(alias));
    const matchesFile = fileRefs.some((file) => file && (relativePath.toLowerCase().includes(file) || file.includes(relativePath.toLowerCase())));
    return matchesAlias || matchesFile ? [id] : [];
  }).slice(0, 8);
}

function tagsForMarkdown(relativePath: string, purpose: MarkdownDocumentPurpose, repositoryIds: string[]): string[] {
  const parts = relativePath.toLowerCase().split('/');
  const docFolder = parts.includes('docs') ? parts[parts.indexOf('docs') + 1] : undefined;
  const value = relativePath.toLowerCase();
  const mcpTags = [
    /mcp|model-context-protocol/.test(value) ? 'mcp-platform-mvp' : undefined,
    /supabase|postgres|rls|sql|migration/.test(value) ? 'schema-api-audit' : undefined,
    /security|owasp|auth|permission|license|entitlement/.test(value) ? 'security-baseline' : undefined,
    /wordpress|plugin|php/.test(value) ? 'wordpress-plugin' : undefined,
    /research|brand|icp|campaign|brief|context/.test(value) ? 'content-intelligence' : undefined,
  ];
  return uniqueStrings([purpose, docFolder, ...mcpTags, ...repositoryIds]).slice(0, 10);
}

function markdownPriority(filePath: string, root: string): number {
  const relativePath = projectPath(root, filePath).toLowerCase();
  let score = 0;
  if (/(mcp|model-context-protocol|platform-api|content-intelligence)/.test(relativePath)) score -= 200;
  if (/(supabase|postgres|rls|schema|migration|sql|edge-function)/.test(relativePath)) score -= 160;
  if (/(security|owasp|nist|auth|permission|license|entitlement)/.test(relativePath)) score -= 140;
  if (/(roadmap|mvp|execution|work-queue|audit|checklist|runbook)/.test(relativePath)) score -= 100;
  if (relativePath.includes('v2-ai-content-creator-app-358/')) score -= 40;
  if (relativePath.includes('content-plugin/')) score -= 30;
  if (relativePath.includes('/docs/')) score -= 25;
  if (relativePath.includes('/.github/agents/')) score += 80;
  if (relativePath.includes('/node_modules/') || relativePath.includes('/vendor/')) score += 500;
  return score;
}

function mergeMarkdownDocuments(existing: MarkdownDocument[], discovered: MarkdownDocument[]): MarkdownDocument[] {
  const discoveredByPath = new Map(discovered.map((doc) => [doc.path.toLowerCase(), doc]));
  const merged: MarkdownDocument[] = existing.map((doc) => {
    const found = discoveredByPath.get(doc.path.toLowerCase());
    if (!found) return doc;
    discoveredByPath.delete(doc.path.toLowerCase());
    return {
      ...found,
      ...doc,
      summary: found.summary || doc.summary,
      purpose: doc.purpose === 'reference' ? found.purpose : doc.purpose,
      repositoryIds: uniqueStrings([...(found.repositoryIds ?? []), ...(doc.repositoryIds ?? [])]),
      featureIds: uniqueStrings([...(found.featureIds ?? []), ...(doc.featureIds ?? [])]),
      tags: uniqueStrings([...(found.tags ?? []), ...(doc.tags ?? [])]),
      alignmentTargets: uniqueStrings([...(doc.alignmentTargets ?? []), ...(found.alignmentTargets ?? [])]),
      auditFindings: uniqueStrings([...(doc.auditFindings ?? []), ...(found.auditFindings ?? [])]),
      updatedAt: found.updatedAt || doc.updatedAt,
    };
  });

  return [...merged, ...Array.from(discoveredByPath.values())].sort((left, right) => left.path.localeCompare(right.path));
}

async function walkMarkdownFiles(dir: string, files: string[] = []): Promise<string[]> {
  if (files.length >= maxMarkdownDocuments) return files;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (files.length >= maxMarkdownDocuments) break;
    if (markdownExcludedDirs.has(entry)) continue;
    const child = path.join(dir, entry);
    let details;
    try {
      details = await stat(child);
    } catch {
      continue;
    }
    if (details.isDirectory()) {
      await walkMarkdownFiles(child, files);
    } else if (details.isFile() && /\.mdx?$/i.test(entry) && details.size <= maxMarkdownFileBytes) {
      files.push(child);
    }
  }

  return files;
}

async function discoverMarkdownDocuments(root: string, candidates: RepoCandidate[], payload?: unknown): Promise<{ documents: MarkdownDocument[]; notes: string[] }> {
  const notes: string[] = [];
  const scanRoots = candidates.length > 0 ? candidates.map((candidate) => candidate.path) : [root];
  const markdownFiles = uniqueStrings((await Promise.all(scanRoots.map((scanRoot) => walkMarkdownFiles(scanRoot)))).flat())
    .sort((left, right) => markdownPriority(left, root) - markdownPriority(right, root) || projectPath(root, left).localeCompare(projectPath(root, right)));

  if (markdownFiles.length >= maxMarkdownDocuments) {
    notes.push(`Markdown discovery stopped at ${maxMarkdownDocuments} documents. Narrow PROJECT_ANALYSIS_WORKSPACE_ROOT if the map needs a smaller scope.`);
  }

  const documents: MarkdownDocument[] = [];
  for (const filePath of markdownFiles.slice(0, maxMarkdownDocuments)) {
    const relativePath = projectPath(root, filePath);
    let text = '';
    let details;
    try {
      text = await readFile(filePath, 'utf8');
      details = await stat(filePath);
    } catch {
      continue;
    }

    const { body, frontMatter } = stripFrontMatter(text);
    const title = markdownTitle(filePath, body, frontMatter);
    const purpose = inferMarkdownPurpose(relativePath, title, body);
    const repositoryIds = repositoryIdsForFile(filePath, candidates);
    const alignmentTargets = mcpAlignmentTargets(relativePath, title, body, purpose);
    documents.push({
      id: markdownDocumentId(relativePath),
      title,
      path: relativePath,
      purpose,
      status: 'active',
      summary: markdownSummary(body, frontMatter),
      repositoryIds,
      featureIds: featureIdsForMarkdown(relativePath, title, body, payload),
      sourceSection: markdownSourceSection(body),
      sensitivity: 'private' satisfies MarkdownDocumentSensitivity,
      updatedAt: dateOnly(details.mtime),
      tags: tagsForMarkdown(relativePath, purpose, repositoryIds),
      alignmentTargets,
      auditFindings: mcpAuditFindings(relativePath, title, body, purpose),
    });
  }

  return { documents, notes };
}

function dependencyCategory(name: string): TestingToolCategory {
  if (['@playwright/test', 'playwright', 'cypress'].includes(name)) return 'e2e-test';
  if (['vitest', 'jest', 'phpunit/phpunit'].includes(name)) return 'unit-test';
  if (name.includes('testing-library')) return 'browser';
  if (['@wordpress/env', 'wp-env'].includes(name)) return 'wordpress';
  if (['eslint', 'typescript'].includes(name)) return 'quality';
  return 'other';
}

function dependencyLabel(name: string): string {
  const labels: Record<string, string> = {
    '@playwright/test': 'Playwright',
    playwright: 'Playwright',
    cypress: 'Cypress',
    vitest: 'Vitest',
    jest: 'Jest',
    '@testing-library/react': 'Testing Library',
    '@wordpress/env': 'wp-env',
    eslint: 'ESLint',
    typescript: 'TypeScript',
    'phpunit/phpunit': 'PHPUnit',
  };
  return labels[name] ?? name;
}

async function scanRepository(candidate: RepoCandidate, tools: TestingToolSignal[]): Promise<TestingRuntimeRepository> {
  const scripts = new Set<string>();
  const repoTools = new Set<string>();
  let packageManager = '';

  const packageJson = await readJson(path.join(candidate.path, 'package.json'));
  if (packageJson) {
    packageManager = existsSync(path.join(candidate.path, 'package-lock.json')) ? 'npm' : packageManager || 'node';
    const scriptMap = isRecord(packageJson.scripts) ? packageJson.scripts : {};
    for (const scriptName of Object.keys(scriptMap).sort()) {
      scripts.add(scriptName);
      if (/^(dev|start|test|typecheck|lint|build|env:)/.test(scriptName)) {
        tools.push(tool(
          `${candidate.repositoryId}:npm-script:${scriptName}`,
          `npm run ${scriptName}`,
          scriptName.startsWith('env:') ? 'wordpress' : scriptName.includes('test') ? 'unit-test' : 'runtime',
          'available',
          `Script is defined in ${candidate.name}.`,
          { command: `npm run ${scriptName}`, path: candidate.path },
        ));
      }
    }

    const deps = {
      ...(isRecord(packageJson.dependencies) ? packageJson.dependencies : {}),
      ...(isRecord(packageJson.devDependencies) ? packageJson.devDependencies : {}),
    };
    for (const [name, version] of Object.entries(deps)) {
      const category = dependencyCategory(name);
      if (category === 'other') continue;
      repoTools.add(name);
      tools.push(tool(
        `${candidate.repositoryId}:dependency:${name}`,
        dependencyLabel(name),
        category,
        'available',
        `Package is installed or declared in ${candidate.name}.`,
        { version: stringValue(version), path: path.join(candidate.path, 'package.json') },
      ));
    }
  }

  const composerJson = await readJson(path.join(candidate.path, 'composer.json'));
  if (composerJson) {
    packageManager = packageManager || 'composer';
    const deps = {
      ...(isRecord(composerJson.require) ? composerJson.require : {}),
      ...(isRecord(composerJson['require-dev']) ? composerJson['require-dev'] : {}),
    };
    for (const [name, version] of Object.entries(deps)) {
      if (name !== 'phpunit/phpunit') continue;
      repoTools.add(name);
      tools.push(tool(
        `${candidate.repositoryId}:composer:${name}`,
        dependencyLabel(name),
        dependencyCategory(name),
        'available',
        `Composer package is declared in ${candidate.name}.`,
        { version: stringValue(version), path: path.join(candidate.path, 'composer.json') },
      ));
    }
  }

  if (existsSync(path.join(candidate.path, '.wp-env.json'))) {
    repoTools.add('wp-env-config');
    tools.push(tool(
      `${candidate.repositoryId}:wp-env-config`,
      'wp-env config',
      'wordpress',
      'available',
      `WordPress local environment config exists in ${candidate.name}.`,
      { path: path.join(candidate.path, '.wp-env.json') },
    ));
  }

  return {
    repositoryId: candidate.repositoryId,
    name: candidate.name,
    path: candidate.path,
    packageManager,
    scripts: Array.from(scripts),
    tools: Array.from(repoTools),
  };
}

function endpointId(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'endpoint';
}

async function checkEndpoint(url: string): Promise<TestingRuntimeEndpoint> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const status: TestingRuntimeStatus = response.ok || (response.status >= 300 && response.status < 400) ? 'available' : 'error';
    return {
      id: endpointId(url),
      label: url,
      url,
      status,
      statusCode: response.status,
      summary: status === 'available' ? `Responded with HTTP ${response.status}.` : `Returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      id: endpointId(url),
      label: url,
      url,
      status: 'missing',
      summary: error instanceof Error ? error.message : 'Endpoint did not respond.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadProjectMap(apiBase: string, mapId: string): Promise<ProjectMapRow | null> {
  const response = await fetch(`${apiBase}/project_maps?id=eq.${encodeURIComponent(mapId)}&select=*`);
  if (!response.ok) throw new Error(`Project map API returned HTTP ${response.status}.`);
  const rows = await response.json() as ProjectMapRow[];
  return rows[0] ?? null;
}

async function saveProjectMap(
  apiBase: string,
  mapId: string,
  row: ProjectMapRow,
  scan: ProjectTestingRuntimeScan,
  markdownDocuments: MarkdownDocument[],
): Promise<void> {
  const existingPayload = isRecord(row.payload) ? row.payload as Partial<ProjectAnalysisModel> : {};
  const existingMarkdownDocuments = Array.isArray(existingPayload.markdownDocuments) ? existingPayload.markdownDocuments : [];
  const payload: Partial<ProjectAnalysisModel> = {
    ...existingPayload,
    testingRuntime: scan,
    markdownDocuments: mergeMarkdownDocuments(existingMarkdownDocuments, markdownDocuments),
  };
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

function configuredUrls(envFile: Record<string, string>, apiBase: string): string[] {
  const urls = new Set<string>([apiBase]);
  const commaList = envValue('PROJECT_ANALYSIS_SCAN_URLS', envFile);
  for (const value of commaList.split(',')) {
    if (/^https?:\/\//i.test(value.trim())) urls.add(normalizeUrl(value));
  }

  for (const key of ['VITE_PROJECT_ANALYSIS_APP_URL', 'VITE_PROJECT_ANALYSIS_WORDPRESS_URL', 'VITE_PROJECT_ANALYSIS_TEST_WORDPRESS_URL']) {
    const value = envValue(key, envFile);
    if (/^https?:\/\//i.test(value.trim())) urls.add(normalizeUrl(value));
  }

  return Array.from(urls);
}

async function buildScan(
  root: string,
  mapId: string,
  apiBase: string,
  envFile: Record<string, string>,
  payload?: unknown,
  candidates = [] as RepoCandidate[],
): Promise<ProjectTestingRuntimeScan> {
  const notes: string[] = [];
  const tools: TestingToolSignal[] = [];
  const nodeVersion = commandVersion('node', ['--version']);
  const npmVersion = commandVersion('npm', ['--version']);
  const dockerVersion = commandVersion('docker', ['--version']);
  const dockerComposeVersion = commandVersion('docker', ['compose', 'version']);

  tools.push(tool('node', 'Node.js', 'runtime', nodeVersion ? 'available' : 'missing', nodeVersion ? 'Node runtime is available.' : 'Node runtime was not found on PATH.', { version: nodeVersion, command: 'node --version' }));
  tools.push(tool('npm', 'npm', 'package-manager', npmVersion ? 'available' : 'missing', npmVersion ? 'npm is available.' : 'npm was not found on PATH.', { version: npmVersion, command: 'npm --version' }));
  tools.push(tool('docker', 'Docker', 'docker', dockerVersion ? 'available' : 'missing', dockerVersion ? 'Docker CLI is available.' : 'Docker CLI was not found or Docker is not running.', { version: dockerVersion, command: 'docker --version' }));
  tools.push(tool('docker-compose', 'Docker Compose', 'docker', dockerComposeVersion ? 'available' : 'needs-confirmation', dockerComposeVersion ? 'Docker Compose is available.' : 'Docker Compose could not be confirmed.', { version: dockerComposeVersion, command: 'docker compose version' }));

  if (candidates.length === 0) {
    notes.push('No repository package files were discovered under the configured workspace root.');
  }

  const repositories: TestingRuntimeRepository[] = [];
  for (const candidate of candidates) {
    repositories.push(await scanRepository(candidate, tools));
  }

  const endpoints = await Promise.all(configuredUrls(envFile, apiBase).map(checkEndpoint));
  if (endpoints.length === 1) {
    notes.push('Only the ontology API URL was checked. Add PROJECT_ANALYSIS_SCAN_URLS to include app, WordPress, or other local test URLs.');
  }

  return {
    schemaVersion: 'project-analysis.testing-runtime.v1',
    scannerVersion,
    scannedAt: new Date().toISOString(),
    workspaceRoot: root,
    mapId,
    tools,
    endpoints,
    repositories,
    notes,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFile = await loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  const root = path.resolve(options.root || envValue('PROJECT_ANALYSIS_WORKSPACE_ROOT', envFile, path.resolve(process.cwd(), '..')));
  const apiBase = normalizeUrl(options.api || envValue('VITE_PROJECT_ANALYSIS_API_URL', envFile, defaultApiBase));
  const mapId = options.mapId || envValue('VITE_PROJECT_ANALYSIS_MAP_ID', envFile, defaultProjectMapId);

  let row: ProjectMapRow | null = null;
  if (options.writeDb) {
    row = await loadProjectMap(apiBase, mapId);
    if (!row) throw new Error(`No project map exists for "${mapId}". Load or save the map before scanning.`);
  }

  const candidates = await discoverRepositoryDirs(root, row?.payload);
  const markdownDiscovery = await discoverMarkdownDocuments(root, candidates, row?.payload);
  const scan = await buildScan(root, mapId, apiBase, envFile, row?.payload, candidates);
  scan.notes.push(...markdownDiscovery.notes);
  scan.notes.push(`Markdown discovery found ${markdownDiscovery.documents.length} documents and generated compact redacted summaries for the private project map.`);
  if (options.output) {
    await writeFile(path.resolve(options.output), `${JSON.stringify(scan, null, 2)}\n`, 'utf8');
  }
  if (options.writeDb && row) {
    await saveProjectMap(apiBase, mapId, row, scan, markdownDiscovery.documents);
  }

  const available = scan.tools.filter((item) => item.status === 'available').length;
  const missing = scan.tools.filter((item) => item.status === 'missing' || item.status === 'error').length;
  const endpoints = scan.endpoints.filter((item) => item.status === 'available').length;
  console.log(`Runtime scan complete: ${available} tools available, ${missing} missing/error, ${endpoints}/${scan.endpoints.length} endpoints reachable.`);
  console.log(`Markdown discovery complete: ${markdownDiscovery.documents.length} documents summarized.`);
  if (options.writeDb) console.log(`Saved scanner snapshot to project map "${mapId}".`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
