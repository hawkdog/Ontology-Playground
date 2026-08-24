import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Globe2,
  HelpCircle,
  MonitorPlay,
  MousePointerClick,
  Search,
  Server,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  qaPriorityLabels,
  qaStatusColors,
  qaStatusLabels,
  qaTypeLabels,
  type ProductFeature,
  type ProjectAnalysisModel,
  type ProjectTestingRuntimeScan,
  type ProjectRepository,
  type QAItem,
  type TestingRuntimeStatus,
  type TestingToolSignal,
} from '../data/projectAnalysis';

type TestabilityLevel = 'manual-only' | 'ai-assisted' | 'automation-ready' | 'needs-triage';
type DependencyStatus = 'available' | 'missing' | 'needs-confirmation';
type DependencyKind = 'browser' | 'wordpress' | 'app-runtime' | 'credentials' | 'fixtures' | 'screenshots' | 'automation' | 'database';

interface DependencySignal {
  kind: DependencyKind;
  label: string;
  status: DependencyStatus;
  reason: string;
}

interface TestabilityItem {
  item: QAItem;
  level: TestabilityLevel;
  reason: string;
  instructions: string[];
  dependencies: DependencySignal[];
}

interface ProjectQATestabilityReportProps {
  model: ProjectAnalysisModel;
  qaItems: QAItem[];
  featureById: Map<string, ProductFeature>;
  repoById: Map<string, ProjectRepository>;
  onOpenItem?: (item: QAItem) => void;
}

const all = 'all';
const levelLabels: Record<TestabilityLevel, string> = {
  'manual-only': 'Manual only',
  'ai-assisted': 'AI-assisted',
  'automation-ready': 'Automation-ready',
  'needs-triage': 'Needs triage',
};

const levelColors: Record<TestabilityLevel, string> = {
  'manual-only': '#C19C00',
  'ai-assisted': '#0078D4',
  'automation-ready': '#107C10',
  'needs-triage': '#8764B8',
};

const dependencyLabels: Record<DependencyKind, string> = {
  browser: 'Browser / UI runner',
  wordpress: 'Local WordPress site',
  'app-runtime': 'Local app runtime',
  credentials: 'Credentials or session',
  fixtures: 'Test data / fixtures',
  screenshots: 'Screenshot evidence',
  automation: 'Automation harness',
  database: 'Local project map DB',
};

const statusLabels: Record<DependencyStatus, string> = {
  available: 'Available',
  missing: 'Missing',
  'needs-confirmation': 'Confirm',
};

function toolMatches(tool: TestingToolSignal, patterns: RegExp[]): boolean {
  const haystack = `${tool.id} ${tool.label} ${tool.category} ${tool.command ?? ''} ${tool.summary ?? ''}`.toLowerCase();
  return patterns.some((pattern) => pattern.test(haystack));
}

function runtimeToolStatus(scan: ProjectTestingRuntimeScan | undefined, patterns: RegExp[], fallback: DependencyStatus): DependencyStatus {
  if (!scan) return fallback;
  const matches = scan.tools.filter((tool) => toolMatches(tool, patterns));
  if (matches.some((tool) => tool.status === 'available')) return 'available';
  if (matches.some((tool) => tool.status === 'missing' || tool.status === 'error')) return 'missing';
  if (matches.length > 0) return 'needs-confirmation';
  return fallback;
}

function endpointMatches(endpoint: { id: string; label: string; url: string; summary: string }, patterns: RegExp[]): boolean {
  const haystack = `${endpoint.id} ${endpoint.label} ${endpoint.url} ${endpoint.summary}`.toLowerCase();
  return patterns.some((pattern) => pattern.test(haystack));
}

function runtimeEndpointStatus(scan: ProjectTestingRuntimeScan | undefined, patterns: RegExp[], fallback: DependencyStatus): DependencyStatus {
  if (!scan) return fallback;
  const matches = scan.endpoints.filter((endpoint) => endpointMatches(endpoint, patterns));
  if (matches.some((endpoint) => endpoint.status === 'available')) return 'available';
  if (matches.some((endpoint) => endpoint.status === 'missing' || endpoint.status === 'error')) return 'missing';
  if (matches.length > 0) return 'needs-confirmation';
  return fallback;
}

function runtimeEndpointCount(scan: ProjectTestingRuntimeScan | undefined, patterns: RegExp[]): number {
  return scan?.endpoints.filter((endpoint) => endpointMatches(endpoint, patterns)).length ?? 0;
}

function formatScanDate(value?: string): string {
  if (!value) return 'Not scanned yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function runtimeStatusText(status: DependencyStatus): string {
  if (status === 'available') return 'Ready';
  if (status === 'missing') return 'Unavailable';
  return 'Confirm';
}

function runtimeStatusTone(status: DependencyStatus): string {
  if (status === 'available') return '#107C10';
  if (status === 'missing') return '#D13438';
  return '#C19C00';
}

function runtimeStatusDetail(status: DependencyStatus, availableText: string, missingText: string, confirmText: string): string {
  if (status === 'available') return availableText;
  if (status === 'missing') return missingText;
  return confirmText;
}

function lowerValues(values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ').toLowerCase();
}

function itemText(item: QAItem, features: ProductFeature[], repos: ProjectRepository[]): string {
  return lowerValues([
    item.title,
    item.summary,
    item.nextAction,
    item.result,
    item.actualResult,
    item.automationCoverage,
    item.modeTier,
    item.area,
    item.track,
    item.sourceDoc,
    ...features.map((feature) => feature.name),
    ...repos.map((repo) => `${repo.name} ${repo.type}`),
    ...(item.fileRefs ?? []),
  ]);
}

function hasUsefulInstruction(item: QAItem): boolean {
  return Boolean(
    item.summary?.trim()
    || item.nextAction?.trim()
    || item.actualResult?.trim()
    || item.acceptanceCriteria?.length
    || item.notes?.length
  );
}

function hasImageEvidence(item: QAItem): boolean {
  const direct = item.attachments?.some((attachment) => ['image', 'screenshot'].includes(attachment.type)) ?? false;
  const progress = item.progressLog?.some((entry) => (entry.images?.length ?? 0) > 0) ?? false;
  return direct || progress;
}

function itemFeatureNames(item: QAItem, featureById: Map<string, ProductFeature>): string[] {
  return item.featureIds.map((featureId) => featureById.get(featureId)?.name ?? featureId);
}

function dependency(kind: DependencyKind, status: DependencyStatus, reason: string): DependencySignal {
  return { kind, label: dependencyLabels[kind], status, reason };
}

function inferTestability(
  item: QAItem,
  featureById: Map<string, ProductFeature>,
  repoById: Map<string, ProjectRepository>,
  testingRuntime?: ProjectTestingRuntimeScan,
): TestabilityItem {
  const features = item.featureIds.map((featureId) => featureById.get(featureId)).filter((feature): feature is ProductFeature => Boolean(feature));
  const repoIds = new Set([
    ...(item.repositoryIds ?? []),
    ...features.flatMap((feature) => feature.repositoryIds),
  ]);
  const repos = Array.from(repoIds).map((repoId) => repoById.get(repoId)).filter((repo): repo is ProjectRepository => Boolean(repo));
  const text = itemText(item, features, repos);
  const fileRefs = item.fileRefs ?? [];
  const hasInstructions = hasUsefulInstruction(item);
  const hasMappedFiles = fileRefs.length > 0 || features.some((feature) => (
    (feature.appFiles?.length ?? 0) + (feature.pluginFiles?.length ?? 0) + (feature.playgroundFiles?.length ?? 0) > 0
  ));
  const needsWordPress = repos.some((repo) => repo.type === 'plugin') || /\b(wordpress|wp-|wp_|plugin|admin\.php|\.php)\b/i.test(text);
  const needsApp = repos.some((repo) => ['web-app', 'service'].includes(repo.type)) || /\.(tsx?|jsx?)\b/i.test(text);
  const needsCredentials = /\b(login|license|credential|account|session|admin|relay|token|api key|subscription)\b/i.test(text);
  const needsFixtures = /\b(import|campaign|content|brief|post|queue|sync|research|image|settings|profile)\b/i.test(text);
  const automationCoverage = (item.automationCoverage ?? '').toLowerCase();
  const hasAutomationSignal = item.type === 'automated-test'
    || /\b(automated|automation|playwright|unit|e2e|vitest|phpunit|smoke)\b/i.test(automationCoverage)
    || fileRefs.some((file) => /\.(test|spec)\./i.test(file));
  const saysManualOnly = /\bmanual only|manual-only|manual\b/i.test(automationCoverage) && !hasAutomationSignal;
  const browserStatus = runtimeToolStatus(testingRuntime, [/playwright/, /cypress/, /testing-library/, /browser/], needsApp || needsWordPress ? 'available' : 'needs-confirmation');
  const automationStatus = hasAutomationSignal
    ? runtimeToolStatus(testingRuntime, [/playwright/, /cypress/, /vitest/, /jest/, /phpunit/, /test/], 'available')
    : saysManualOnly
      ? 'missing'
      : runtimeToolStatus(testingRuntime, [/playwright/, /cypress/, /vitest/, /jest/, /phpunit/], 'needs-confirmation');
  const databaseStatus = testingRuntime
    ? runtimeEndpointStatus(testingRuntime, [/localhost-3008/, /postgrest/, /project map/, /3008/], 'available')
    : 'available';

  const dependencies: DependencySignal[] = [
    dependency('browser', browserStatus, testingRuntime ? 'Scanner checked browser/test-runner signals for this workspace.' : needsApp || needsWordPress ? 'UI-oriented item can be inspected with a browser session.' : 'No clear UI/browser surface is mapped yet.'),
    dependency('screenshots', hasImageEvidence(item) ? 'available' : 'missing', hasImageEvidence(item) ? 'Image evidence is already attached.' : 'No screenshot evidence is attached yet.'),
    dependency('automation', automationStatus, hasAutomationSignal ? 'Automation coverage or test/spec files are mapped; scanner checks whether local tooling exists.' : saysManualOnly ? 'The item is currently marked manual only.' : 'No automation harness is mapped to this QA item yet.'),
  ];

  if (needsWordPress) {
    const wordpressStatus = runtimeEndpointStatus(testingRuntime, [/wordpress/, /wp-/, /8888/, /8889/], runtimeToolStatus(testingRuntime, [/wp-env/, /wordpress/, /docker/], 'needs-confirmation'));
    dependencies.push(dependency('wordpress', wordpressStatus, testingRuntime ? 'Scanner checked WordPress/wp-env/Docker signals for this item.' : 'WordPress/plugin signals are present; confirm the local WP container and plugin are running.'));
  }
  if (needsApp) {
    const appStatus = runtimeEndpointStatus(testingRuntime, [/5173/, /3000/, /app/, /dev/], 'needs-confirmation');
    dependencies.push(dependency('app-runtime', appStatus, testingRuntime ? 'Scanner checked configured app/runtime URLs.' : 'App/runtime signals are present; confirm the local app server is running.'));
  }
  if (needsCredentials) {
    dependencies.push(dependency('credentials', 'needs-confirmation', 'This test appears to need a signed-in user, license, or stored test account.'));
  }
  if (needsFixtures) {
    dependencies.push(dependency('fixtures', hasInstructions ? 'needs-confirmation' : 'missing', hasInstructions ? 'The item has instructions, but data setup should be confirmed.' : 'The item likely needs test data, but setup instructions are thin.'));
  }
  dependencies.push(dependency('database', databaseStatus, testingRuntime ? 'Scanner snapshot is stored in the local project map DB.' : 'The QA item is stored in the local project map and can be saved back to the private DB.'));

  let level: TestabilityLevel = 'needs-triage';
  let reason = 'Needs clearer test instructions or mapped runtime dependencies before choosing manual, AI-assisted, or automated execution.';

  if (hasAutomationSignal && hasInstructions && hasMappedFiles && automationStatus !== 'missing') {
    level = 'automation-ready';
    reason = 'Automation coverage and mapped files are present, so this can be run or extended as an automated check.';
  } else if (!saysManualOnly && hasInstructions && hasMappedFiles && (needsApp || needsWordPress)) {
    level = 'ai-assisted';
    reason = 'The item has instructions and a mapped UI/runtime surface, so AI can help execute or record the test once local dependencies are running.';
  } else if (saysManualOnly || item.type === 'manual-test') {
    level = 'manual-only';
    reason = 'This is currently represented as a manual check; AI can still help record evidence, but a human should validate the result.';
  }

  const instructions = [
    hasInstructions ? 'Use the summary, next action, notes, or acceptance criteria as the test script.' : 'Add clearer test steps before execution.',
    needsApp ? 'Confirm the local app route or screen is reachable before testing.' : '',
    needsWordPress ? 'Confirm the local WordPress site and plugin are running before testing.' : '',
    needsCredentials ? 'Confirm test credentials/session are available before execution.' : '',
    !hasImageEvidence(item) ? 'Capture screenshot evidence and add it to the progress log.' : 'Review existing screenshot evidence before retesting.',
  ].filter(Boolean);

  return { item, level, reason, instructions, dependencies };
}

function statusIcon(status: DependencyStatus) {
  if (status === 'available') return <CheckCircle2 size={13} />;
  if (status === 'missing') return <XCircle size={13} />;
  return <HelpCircle size={13} />;
}

export function ProjectQATestabilityReport({ model, qaItems, featureById, repoById, onOpenItem }: ProjectQATestabilityReportProps) {
  const [levelFilter, setLevelFilter] = useState<typeof all | TestabilityLevel>(all);
  const [search, setSearch] = useState('');
  const testingRuntime = model.testingRuntime;
  const reports = useMemo(
    () => qaItems.map((item) => inferTestability(item, featureById, repoById, testingRuntime)),
    [featureById, qaItems, repoById, testingRuntime],
  );
  const counts = reports.reduce<Record<TestabilityLevel, number>>((acc, report) => {
    acc[report.level] += 1;
    return acc;
  }, { 'manual-only': 0, 'ai-assisted': 0, 'automation-ready': 0, 'needs-triage': 0 });
  const dependencyCounts = reports.flatMap((report) => report.dependencies).reduce<Record<DependencyStatus, number>>((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { available: 0, missing: 0, 'needs-confirmation': 0 });
  const normalizedSearch = search.trim().toLowerCase();
  const visibleReports = reports.filter((report) => {
    if (levelFilter !== all && report.level !== levelFilter) return false;
    if (!normalizedSearch) return true;
    return [
      report.item.title,
      report.reason,
      report.item.summary,
      report.item.nextAction,
      ...(report.item.fileRefs ?? []),
      ...report.dependencies.map((item) => `${item.label} ${item.reason}`),
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch));
  });
  const scannerToolCounts = testingRuntime?.tools.reduce<Record<TestingRuntimeStatus, number>>((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { available: 0, missing: 0, 'needs-confirmation': 0, error: 0 });
  const scannerEndpointCounts = testingRuntime?.endpoints.reduce<Record<TestingRuntimeStatus, number>>((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { available: 0, missing: 0, 'needs-confirmation': 0, error: 0 });
  const appRuntimeStatus = runtimeEndpointStatus(testingRuntime, [/5173/, /3000/, /app/, /dev/], testingRuntime ? 'missing' : 'needs-confirmation');
  const wordpressRuntimeStatus = runtimeEndpointStatus(testingRuntime, [/wordpress/, /wp-/, /8888/, /8889/], testingRuntime ? 'missing' : 'needs-confirmation');
  const dbRuntimeStatus = runtimeEndpointStatus(testingRuntime, [/localhost-3008/, /postgrest/, /project map/, /3008/], testingRuntime ? 'missing' : 'needs-confirmation');
  const browserRuntimeStatus = runtimeToolStatus(testingRuntime, [/playwright/, /cypress/, /testing-library/, /browser/], testingRuntime ? 'missing' : 'needs-confirmation');
  const unitRuntimeStatus = runtimeToolStatus(testingRuntime, [/vitest/, /jest/, /phpunit/, /unit-test/], testingRuntime ? 'missing' : 'needs-confirmation');
  const dockerRuntimeStatus = runtimeToolStatus(testingRuntime, [/docker/], testingRuntime ? 'missing' : 'needs-confirmation');
  const scannerNeedsAttention = [appRuntimeStatus, wordpressRuntimeStatus, dbRuntimeStatus, browserRuntimeStatus, unitRuntimeStatus, dockerRuntimeStatus]
    .filter((status) => status !== 'available').length;
  const appEndpointCount = runtimeEndpointCount(testingRuntime, [/5173/, /3000/, /app/, /dev/]);
  const wordpressEndpointCount = runtimeEndpointCount(testingRuntime, [/wordpress/, /wp-/, /8888/, /8889/]);

  return (
    <section className="analysis-testability" aria-label="QA testability report">
      <section className="analysis-testability-hero">
        <div>
          <span className="analysis-kicker">QA Testability</span>
          <h2>Testing Capability Report</h2>
          <p>Classify QA items by what can be tested manually, AI-assisted, or automated, then review the dependencies needed to run each check.</p>
        </div>
        <div className="analysis-testability-score">
          <Bot size={22} />
          <strong>{counts['ai-assisted'] + counts['automation-ready']}</strong>
          <span>AI-capable items</span>
        </div>
      </section>

      <section className="analysis-readiness-summary" aria-label="QA testability summary">
        <TestabilitySummary icon={<MousePointerClick size={18} />} label="Manual only" value={counts['manual-only']} tone={levelColors['manual-only']} />
        <TestabilitySummary icon={<Bot size={18} />} label="AI-assisted" value={counts['ai-assisted']} tone={levelColors['ai-assisted']} />
        <TestabilitySummary icon={<MonitorPlay size={18} />} label="Automation-ready" value={counts['automation-ready']} tone={levelColors['automation-ready']} />
        <TestabilitySummary icon={<HelpCircle size={18} />} label="Needs triage" value={counts['needs-triage']} tone={levelColors['needs-triage']} />
        <TestabilitySummary icon={<CheckCircle2 size={18} />} label="Deps available" value={dependencyCounts.available} tone="#107C10" />
        <TestabilitySummary icon={<Wrench size={18} />} label="Deps to confirm" value={dependencyCounts['needs-confirmation'] + dependencyCounts.missing} tone="#D83B01" />
      </section>

      <section className="analysis-runtime-panel" aria-label="QA runtime status">
        <header>
          <div>
            <span className="analysis-kicker">Runtime Status</span>
            <h2>QA Setup Readiness</h2>
            <p>{testingRuntime ? `Last scanner snapshot: ${formatScanDate(testingRuntime.scannedAt)}` : 'No scanner snapshot has been saved yet.'}</p>
          </div>
          <div className="analysis-runtime-command" aria-label="Scanner command">
            <Terminal size={16} />
            <code>npm run qa:scan</code>
          </div>
        </header>
        <div className="analysis-runtime-grid">
          <RuntimeStatusTile
            icon={<Database size={18} />}
            label="Project DB"
            status={dbRuntimeStatus}
            detail={runtimeStatusDetail(dbRuntimeStatus, 'Private map API responded in the latest scan.', 'Private map API was not reachable in the latest scan.', 'Run the scanner after the private map API is running.')}
          />
          <RuntimeStatusTile
            icon={<Globe2 size={18} />}
            label="Local app"
            status={appRuntimeStatus}
            detail={runtimeStatusDetail(appRuntimeStatus, `${appEndpointCount} app endpoint${appEndpointCount === 1 ? '' : 's'} reachable.`, 'Configured app endpoints were not reachable.', 'Add or start a local app URL before AI-assisted app tests.')}
          />
          <RuntimeStatusTile
            icon={<Globe2 size={18} />}
            label="WordPress"
            status={wordpressRuntimeStatus}
            detail={runtimeStatusDetail(wordpressRuntimeStatus, `${wordpressEndpointCount} WordPress endpoint${wordpressEndpointCount === 1 ? '' : 's'} reachable.`, 'Configured WordPress endpoints were not reachable.', 'Start wp-env and include the WordPress URLs in the scanner.')}
          />
          <RuntimeStatusTile
            icon={<MonitorPlay size={18} />}
            label="Browser tests"
            status={browserRuntimeStatus}
            detail={runtimeStatusDetail(browserRuntimeStatus, 'Browser automation tooling is installed or declared.', 'Browser automation tooling was not detected.', 'Install or map Playwright/Cypress/testing-library before browser automation.')}
          />
          <RuntimeStatusTile
            icon={<CheckCircle2 size={18} />}
            label="Unit tests"
            status={unitRuntimeStatus}
            detail={runtimeStatusDetail(unitRuntimeStatus, 'Unit-test tooling is installed or declared.', 'Unit-test tooling was not detected.', 'Map Vitest/Jest/PHPUnit before scripted unit checks.')}
          />
          <RuntimeStatusTile
            icon={<Server size={18} />}
            label="Docker"
            status={dockerRuntimeStatus}
            detail={runtimeStatusDetail(dockerRuntimeStatus, 'Docker tooling is available.', 'Docker tooling was not reachable.', 'Confirm Docker Desktop is running before container-backed checks.')}
          />
        </div>
        <div className="analysis-runtime-next">
          <strong>{scannerNeedsAttention === 0 ? 'Ready for automated QA capture' : `${scannerNeedsAttention} setup item${scannerNeedsAttention === 1 ? '' : 's'} need attention`}</strong>
          <span>{testingRuntime ? 'Run the scanner again after starting or stopping local services, then reload the private DB map.' : 'Start the private DB/API, run the scanner command, then reload the private DB map.'}</span>
        </div>
      </section>

      <section className="analysis-testability-toolbar" aria-label="QA testability filters">
        <label className="analysis-execution-search">
          <Search size={15} />
          <span className="sr-only">Search testability report</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search QA, dependency, or file" />
        </label>
        <select aria-label="Testability level" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as typeof all | TestabilityLevel)}>
          <option value={all}>All testability levels</option>
          {Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      <section className="analysis-testability-layout">
        <section className="analysis-testability-list" aria-label="Testability item list">
          {visibleReports.length === 0 ? (
            <div className="analysis-empty-state">No QA testability items match the current filters.</div>
          ) : visibleReports.map((report) => (
            <article className="analysis-testability-card" key={report.item.id}>
              <header>
                <div>
                  <span className="analysis-readiness-state" style={{ borderColor: levelColors[report.level], color: levelColors[report.level] }}>
                    {levelLabels[report.level]}
                  </span>
                  <span className="analysis-file-status" style={{ borderColor: qaStatusColors[report.item.status], color: qaStatusColors[report.item.status] }}>
                    {qaStatusLabels[report.item.status]}
                  </span>
                  <span className="analysis-qa-type">{qaTypeLabels[report.item.type]} · {qaPriorityLabels[report.item.priority]}</span>
                </div>
                <button className="analysis-card-toggle analysis-card-toggle--secondary" type="button" onClick={() => onOpenItem?.(report.item)}>
                  Open item
                </button>
              </header>
              <h3>{report.item.title}</h3>
              <p>{report.reason}</p>
              <div className="analysis-testability-columns">
                <section>
                  <h4>Execution Notes</h4>
                  <ul>
                    {report.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
                  </ul>
                </section>
                <section>
                  <h4>Dependencies</h4>
                  <div className="analysis-testability-deps">
                    {report.dependencies.map((dep) => (
                      <span key={`${report.item.id}-${dep.kind}`} className={`analysis-testability-dep analysis-testability-dep--${dep.status}`}>
                        {statusIcon(dep.status)}
                        <strong>{dep.label}</strong>
                        <em>{statusLabels[dep.status]}</em>
                        <small>{dep.reason}</small>
                      </span>
                    ))}
                  </div>
                </section>
              </div>
              <div className="analysis-attachment-row">
                {itemFeatureNames(report.item, featureById).map((name) => <span key={name}><ClipboardCheck size={13} /> {name}</span>)}
                {(report.item.fileRefs ?? []).slice(0, 3).map((file) => <span key={file}>{file}</span>)}
              </div>
            </article>
          ))}
        </section>

        <aside className="analysis-testability-guide">
          <h2>Scanner Snapshot</h2>
          {testingRuntime ? (
            <ul>
              <li><strong>Last scanned</strong><span>{formatScanDate(testingRuntime.scannedAt)}</span></li>
              <li><strong>Tools</strong><span>{scannerToolCounts?.available ?? 0} available · {(scannerToolCounts?.missing ?? 0) + (scannerToolCounts?.error ?? 0)} missing/error</span></li>
              <li><strong>Endpoints</strong><span>{scannerEndpointCounts?.available ?? 0} reachable · {(scannerEndpointCounts?.missing ?? 0) + (scannerEndpointCounts?.error ?? 0)} unavailable</span></li>
              <li><strong>Repositories</strong><span>{testingRuntime.repositories.length} scanned</span></li>
            </ul>
          ) : (
            <p>No runtime scanner snapshot is attached yet. Run the local scanner, then reload the private DB map.</p>
          )}
          <h2>Capability Inventory</h2>
          <ul>
            <li><strong>Browser / UI runner</strong><span>Available for guided UI checks when the local site or app is running.</span></li>
            <li><strong>Image evidence gallery</strong><span>Available for screenshots attached to QA progress logs.</span></li>
            <li><strong>Private project DB</strong><span>{model.sourceLabel ? `Current source: ${model.sourceLabel}` : 'Available when the local PostgREST API is running.'}</span></li>
            <li><strong>Automation harness</strong><span>Detected per QA item from automation coverage, test/spec files, or explicit automated-test type.</span></li>
          </ul>
          <h2>How To Decide</h2>
          <p>Manual-only means a human should judge the result. AI-assisted means AI can drive or observe the workflow once the runtime and credentials are ready. Automation-ready means a repeatable script or mapped automated check already exists or is clearly implied.</p>
        </aside>
      </section>
    </section>
  );
}

function TestabilitySummary({
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

function RuntimeStatusTile({
  icon,
  label,
  status,
  detail,
}: {
  icon: ReactNode;
  label: string;
  status: DependencyStatus;
  detail: string;
}) {
  const tone = runtimeStatusTone(status);
  return (
    <article className={`analysis-runtime-tile analysis-runtime-tile--${status}`} style={{ borderColor: tone }}>
      <span className="analysis-runtime-icon" style={{ color: tone }}>{icon}</span>
      <div>
        <strong>{label}</strong>
        <em>{runtimeStatusText(status)}</em>
      </div>
      <p>{detail}</p>
      {status === 'missing' && <AlertTriangle size={15} />}
    </article>
  );
}
