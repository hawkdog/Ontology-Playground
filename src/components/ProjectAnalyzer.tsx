import { useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  FileJson,
  FolderTree,
  GitBranch,
  Layers3,
  ListFilter,
  Milestone,
  Network,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  dispositionColors,
  dispositionLabels,
  projectAnalysisFromJson,
  sampleProjectAnalysis,
  type FeatureDisposition,
  type ProductFeature,
  type ProjectAnalysisModel,
} from '../data/projectAnalysis';

type AnalyzerView = 'features' | 'files' | 'dependencies' | 'roadmap';

interface ProjectAnalyzerProps {
  model?: ProjectAnalysisModel;
}

const all = 'all';

function scoreFeature(value: number, effort: number, risk: number): number {
  return value * 2 - effort - risk;
}

function featureFileCount(feature: ProductFeature): number {
  return [
    feature.appFiles,
    feature.pluginFiles,
    feature.playgroundFiles,
    feature.privateDataFiles,
    feature.qaEvidenceFiles,
  ].reduce((count, files) => count + (files?.length ?? 0), 0);
}

function allFeatureFiles(feature: ProductFeature): { label: string; files: string[] }[] {
  return [
    { label: 'App', files: feature.appFiles ?? [] },
    { label: 'Plugin', files: feature.pluginFiles ?? [] },
    { label: 'Playground', files: feature.playgroundFiles ?? [] },
    { label: 'Private data', files: feature.privateDataFiles ?? [] },
    { label: 'QA evidence', files: feature.qaEvidenceFiles ?? [] },
  ].filter((group) => group.files.length > 0);
}

function emptyModelCopy(model: ProjectAnalysisModel): ProjectAnalysisModel {
  return {
    ...model,
    repositories: [...model.repositories],
    capabilities: [...model.capabilities],
    releases: [...model.releases],
    features: [...model.features],
    components: [...model.components],
    dependencies: [...model.dependencies],
  };
}

function readLocalJsonFile(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Unable to read that JSON file.'));
    reader.readAsText(file);
  });
}

export function ProjectAnalyzer({ model }: ProjectAnalyzerProps) {
  const [activeModel, setActiveModel] = useState<ProjectAnalysisModel | null>(model ? emptyModelCopy(model) : null);
  const [view, setView] = useState<AnalyzerView>('features');
  const [repositoryFilter, setRepositoryFilter] = useState(all);
  const [dispositionFilter, setDispositionFilter] = useState<typeof all | FeatureDisposition>(all);
  const [releaseFilter, setReleaseFilter] = useState(all);
  const [importError, setImportError] = useState<string | null>(null);

  const workingModel = activeModel;

  const repositoryById = useMemo(
    () => new Map(workingModel?.repositories.map((repo) => [repo.id, repo]) ?? []),
    [workingModel],
  );
  const capabilityById = useMemo(
    () => new Map(workingModel?.capabilities.map((capability) => [capability.id, capability]) ?? []),
    [workingModel],
  );
  const releaseById = useMemo(
    () => new Map(workingModel?.releases.map((release) => [release.id, release]) ?? []),
    [workingModel],
  );
  const featureById = useMemo(
    () => new Map(workingModel?.features.map((feature) => [feature.id, feature]) ?? []),
    [workingModel],
  );

  const filteredFeatures = useMemo(() => {
    if (!workingModel) return [];
    return workingModel.features.filter((feature) => {
      if (repositoryFilter !== all && !feature.repositoryIds.includes(repositoryFilter)) return false;
      if (dispositionFilter !== all && feature.disposition !== dispositionFilter) return false;
      if (releaseFilter !== all && feature.releaseId !== releaseFilter) return false;
      return true;
    });
  }, [dispositionFilter, releaseFilter, repositoryFilter, workingModel]);

  const visibleFeatureIds = new Set(filteredFeatures.map((feature) => feature.id));
  const visibleDependencies = (workingModel?.dependencies ?? []).filter(
    (dependency) => visibleFeatureIds.has(dependency.fromFeatureId) || visibleFeatureIds.has(dependency.toFeatureId),
  );

  const totalFileReferences = (workingModel?.features ?? []).reduce((count, feature) => count + featureFileCount(feature), 0);
  const keptForMvp = (workingModel?.features ?? []).filter(
    (feature) => feature.releaseId === 'mvp' && !['remove', 'remove-later'].includes(feature.disposition),
  ).length;
  const privateRepoCount = (workingModel?.repositories ?? []).filter((repo) => repo.visibility !== 'public').length;

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = projectAnalysisFromJson(JSON.parse(await readLocalJsonFile(file)), file.name);
      setActiveModel(imported);
      setImportError(null);
      setView('features');
      setRepositoryFilter(all);
      setDispositionFilter(all);
      setReleaseFilter(all);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import that JSON file.');
    } finally {
      event.target.value = '';
    }
  };

  const loadSample = () => {
    setActiveModel(emptyModelCopy({ ...sampleProjectAnalysis, sourceLabel: 'Fictional sample' }));
    setImportError(null);
    setView('features');
  };

  const clearMap = () => {
    setActiveModel(null);
    setImportError(null);
    setRepositoryFilter(all);
    setDispositionFilter(all);
    setReleaseFilter(all);
  };

  if (!workingModel) {
    return (
      <div className="analysis-page analysis-page--empty">
        <section className="analysis-import-panel">
          <div className="analysis-import-icon"><FolderTree size={32} /></div>
          <span className="analysis-kicker">Project Analyzer</span>
          <h1>Load a feature-file map</h1>
          <p>
            Select a local project-analysis JSON file to inspect features, mapped files,
            MVP actions, dependencies, and roadmap phases in this browser session.
          </p>
          <div className="analysis-import-actions">
            <label className="analysis-import-button">
              <Upload size={18} />
              Import JSON
              <input aria-label="Import project-analysis JSON" type="file" accept="application/json,.json" onChange={handleImport} />
            </label>
            <button className="analysis-secondary-button" type="button" onClick={loadSample}>
              <FileJson size={18} />
              Load sample
            </button>
          </div>
          {importError && <p className="analysis-import-error">{importError}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <div>
          <span className="analysis-kicker">Project Analyzer</span>
          <h1>{workingModel.projectName}</h1>
          <p>{workingModel.description}</p>
          <div className="analysis-source-row">
            {workingModel.sourceLabel && <span>{workingModel.sourceLabel}</span>}
            {workingModel.privacyBoundary && <span>{workingModel.privacyBoundary}</span>}
          </div>
        </div>
        <div className="analysis-summary-grid" aria-label="Analysis summary">
          <div className="analysis-summary-card">
            <Boxes size={18} />
            <strong>{workingModel.features.length}</strong>
            <span>Features</span>
          </div>
          <div className="analysis-summary-card">
            <ShieldCheck size={18} />
            <strong>{keptForMvp}</strong>
            <span>MVP Items</span>
          </div>
          <div className="analysis-summary-card">
            <GitBranch size={18} />
            <strong>{privateRepoCount}</strong>
            <span>Private Repos</span>
          </div>
          <div className="analysis-summary-card">
            <Network size={18} />
            <strong>{workingModel.dependencies.length}</strong>
            <span>Dependencies</span>
          </div>
          <div className="analysis-summary-card">
            <FileJson size={18} />
            <strong>{totalFileReferences}</strong>
            <span>File refs</span>
          </div>
          <div className="analysis-summary-card">
            <AlertTriangle size={18} />
            <strong>{workingModel.doNotCutBeforeChecks?.length ?? 0}</strong>
            <span>Do not cut</span>
          </div>
        </div>
      </header>

      <section className="analysis-toolbar" aria-label="Project analysis filters">
        <div className="analysis-tabs" role="tablist" aria-label="Analysis views">
          {(['features', 'files', 'dependencies', 'roadmap'] as AnalyzerView[]).map((candidate) => (
            <button
              key={candidate}
              className={`analysis-tab ${view === candidate ? 'active' : ''}`}
              onClick={() => setView(candidate)}
              type="button"
              role="tab"
              aria-selected={view === candidate}
            >
              {candidate === 'features' && <Layers3 size={16} />}
              {candidate === 'files' && <FolderTree size={16} />}
              {candidate === 'dependencies' && <Network size={16} />}
              {candidate === 'roadmap' && <Milestone size={16} />}
              {candidate[0].toUpperCase() + candidate.slice(1)}
            </button>
          ))}
        </div>

        <div className="analysis-filters">
          <ListFilter size={16} />
          <select aria-label="Repository" value={repositoryFilter} onChange={(event) => setRepositoryFilter(event.target.value)}>
            <option value={all}>All repositories</option>
            {workingModel.repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>{repo.name}</option>
            ))}
          </select>
          <select
            aria-label="Disposition"
            value={dispositionFilter}
            onChange={(event) => setDispositionFilter(event.target.value as typeof all | FeatureDisposition)}
          >
            <option value={all}>All actions</option>
            {Object.entries(dispositionLabels).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <select aria-label="Release" value={releaseFilter} onChange={(event) => setReleaseFilter(event.target.value)}>
            <option value={all}>All releases</option>
            {workingModel.releases.map((release) => (
              <option key={release.id} value={release.id}>{release.name}</option>
            ))}
          </select>
          <label className="analysis-inline-import">
            <Upload size={16} />
            Import
            <input aria-label="Import project-analysis JSON" type="file" accept="application/json,.json" onChange={handleImport} />
          </label>
          <button className="analysis-clear-button" type="button" onClick={clearMap}>Clear</button>
        </div>
      </section>

      {importError && <p className="analysis-import-error">{importError}</p>}

      {view === 'features' && (
        <main className="analysis-grid" aria-label="Feature analysis">
          {filteredFeatures.map((feature) => {
            const capability = capabilityById.get(feature.capabilityId);
            const release = releaseById.get(feature.releaseId);
            const score = scoreFeature(feature.value, feature.effort, feature.risk);
            return (
              <article className="analysis-feature-card" key={feature.id}>
                <div className="analysis-feature-topline">
                  <span
                    className="analysis-disposition"
                    style={{ borderColor: dispositionColors[feature.disposition], color: dispositionColors[feature.disposition] }}
                  >
                    {dispositionLabels[feature.disposition]}
                  </span>
                  <span>{release?.name}</span>
                </div>
                <h2>{feature.name}</h2>
                <p>{feature.rationale}</p>
                <div className="analysis-chip-row">
                  {feature.repositoryIds.map((repoId) => (
                    <span className="analysis-chip" key={repoId}>{repositoryById.get(repoId)?.name ?? repoId}</span>
                  ))}
                  <span className="analysis-chip">{featureFileCount(feature)} files</span>
                </div>
                <dl className="analysis-metrics">
                  <div><dt>Value</dt><dd>{feature.value}</dd></div>
                  <div><dt>Effort</dt><dd>{feature.effort}</dd></div>
                  <div><dt>Risk</dt><dd>{feature.risk}</dd></div>
                  <div><dt>Score</dt><dd>{score}</dd></div>
                </dl>
                {capability && <span className="analysis-capability">{capability.name}</span>}
                {feature.mvpNotes && feature.mvpNotes.length > 0 && (
                  <ul className="analysis-note-list">
                    {feature.mvpNotes.slice(0, 3).map((note) => <li key={note}>{note}</li>)}
                  </ul>
                )}
              </article>
            );
          })}
        </main>
      )}

      {view === 'files' && (
        <main className="analysis-file-map" aria-label="Feature file map">
          {filteredFeatures.map((feature) => (
            <article className="analysis-file-card" key={feature.id}>
              <header>
                <span
                  className="analysis-disposition"
                  style={{ borderColor: dispositionColors[feature.disposition], color: dispositionColors[feature.disposition] }}
                >
                  {dispositionLabels[feature.disposition]}
                </span>
                <h2>{feature.name}</h2>
                <span>{featureFileCount(feature)} mapped references</span>
              </header>
              <div className="analysis-file-groups">
                {allFeatureFiles(feature).map((group) => (
                  <section className="analysis-file-group" key={group.label}>
                    <h3>{group.label}</h3>
                    <ul>
                      {group.files.map((file) => <li key={`${group.label}-${file}`}><code>{file}</code></li>)}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </main>
      )}

      {view === 'dependencies' && (
        <main className="analysis-dependency-layout" aria-label="Feature dependencies">
          <section className="analysis-dependency-list">
            {visibleDependencies.map((dependency) => {
              const from = featureById.get(dependency.fromFeatureId);
              const to = featureById.get(dependency.toFeatureId);
              return (
                <article className="analysis-dependency-card" key={dependency.id}>
                  <div className="analysis-dependency-flow">
                    <strong>{from?.name ?? dependency.fromFeatureId}</strong>
                    <span><ArrowRight size={16} /> {dependency.type}</span>
                    <strong>{to?.name ?? dependency.toFeatureId}</strong>
                  </div>
                  <p>{dependency.description}</p>
                </article>
              );
            })}
          </section>
          <aside className="analysis-decision-panel">
            <h2>Do Not Cut Before Checks</h2>
            <ul>
              {(workingModel.doNotCutBeforeChecks ?? []).map((featureId) => (
                <li key={featureId}>{featureById.get(featureId)?.name ?? featureId}</li>
              ))}
            </ul>
            <h2>First Slimming Candidates</h2>
            <ul>
              {(workingModel.firstSlimmingCandidates ?? []).map((candidate) => (
                <li key={`${candidate.featureId}-${candidate.suggestedAction}`}>
                  <strong>{featureById.get(candidate.featureId)?.name ?? candidate.featureId}</strong>
                  <span>{candidate.suggestedAction}</span>
                  <p>{candidate.why}</p>
                </li>
              ))}
            </ul>
          </aside>
        </main>
      )}

      {view === 'roadmap' && (
        <main className="analysis-roadmap-layout" aria-label="Release roadmap">
          <section className="analysis-roadmap">
            {workingModel.releases.map((release) => {
              const releaseFeatures = filteredFeatures.filter((feature) => feature.releaseId === release.id);
              return (
                <section className="analysis-release-column" key={release.id}>
                  <header>
                    <span>{release.horizon}</span>
                    <h2>{release.name}</h2>
                  </header>
                  {releaseFeatures.map((feature) => (
                    <div className="analysis-roadmap-item" key={feature.id}>
                      <span
                        className="analysis-roadmap-dot"
                        style={{ background: dispositionColors[feature.disposition] }}
                      />
                      <div>
                        <strong>{feature.name}</strong>
                        <span>{dispositionLabels[feature.disposition]} - {featureFileCount(feature)} files</span>
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </section>
          {workingModel.openQuestions && workingModel.openQuestions.length > 0 && (
            <aside className="analysis-decision-panel">
              <h2>Open Questions</h2>
              <ul>
                {workingModel.openQuestions.map((question) => <li key={question}>{question}</li>)}
              </ul>
            </aside>
          )}
        </main>
      )}
    </div>
  );
}
