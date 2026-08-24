import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectAnalyzer } from './ProjectAnalyzer';

const privateFeatureFileMap = {
  schemaVersion: 'project-analysis.feature-file-map.v1',
  projectName: 'Private Map',
  scope: {
    purpose: 'Private local feature-file map.',
    privacyBoundary: 'Local only; not committed to the public app.',
  },
  repositories: [
    {
      id: 'app',
      name: 'App',
      visibility: 'private',
      type: 'web-app',
      role: 'Private application repository',
    },
  ],
  capabilities: [
    {
      id: 'planning',
      name: 'Planning',
      mvpImportance: 'critical',
      summary: 'Plan the core content workflow.',
    },
  ],
  releases: [{ id: 'mvp', name: 'MVP', horizon: 'Now' }],
  roadmapSources: [
    {
      source: 'docs/roadmap/PRODUCT-ROADMAP.md',
      status: 'in-progress',
      phase: 'Phase 1',
      summary: 'Campaign planning remains part of the active product direction.',
    },
  ],
  markdownDocuments: [
    {
      id: 'doc-supabase-setup',
      title: 'Supabase Setup Context',
      path: 'docs/setup/SUPABASE-SETUP.md',
      purpose: 'setup',
      status: 'active',
      summary: 'Documents local Supabase configuration and migration context for project audits.',
      repositoryIds: ['app'],
      featureIds: ['briefs'],
      sensitivity: 'private',
      tags: ['supabase', 'setup'],
      alignmentTargets: ['Schema/API audit', 'MCP server planning'],
      auditFindings: ['Confirm RLS notes stay aligned with the latest migration set.'],
      appliesTo: ['supabase', 'rls', 'schema-api-audit'],
      requiredChecks: ['Confirm RLS notes stay aligned before schema changes.'],
      agentUseLevel: 'required',
      resources: [
        {
          id: 'resource-supabase-rls',
          title: 'Supabase RLS Docs',
          url: 'https://supabase.com/docs/guides/database/postgres/row-level-security',
          type: 'official-docs',
          tags: ['supabase', 'rls'],
          notes: 'Required for schema/API audit context.',
        },
      ],
    },
  ],
  workItems: [
    {
      id: 'work-mcp-auth',
      title: 'Define MCP client registry',
      type: 'mcp',
      status: 'todo',
      priority: 'high',
      summary: 'Add the first work item for MCP client registration and access scopes.',
      nextAction: 'Draft client registry fields and scope checks.',
      owner: 'Platform',
      source: 'MCP platform MVP',
      featureIds: ['briefs'],
      tags: ['mcp-platform-mvp'],
    },
  ],
  queueViews: [
    {
      id: 'queue-view-mcp-platform',
      name: 'MCP Platform',
      summary: 'Focus the queue on MCP platform access and context layer tasks.',
      filters: {
        type: 'mcp',
        owner: 'Platform',
        priority: 'high',
        source: 'MCP platform MVP',
      },
      owner: 'Platform',
      cadence: 'Weekly',
      outcome: 'Keep platform access work grouped for review.',
    },
  ],
  batchTemplates: [
    {
      id: 'batch-template-schema-docs',
      name: 'Schema Doc Audit Run',
      summary: 'Create audit tasks from markdown documents aligned to the schema/API pass.',
      sourceType: 'markdown-documents',
      workItemType: 'audit',
      priority: 'high',
      titlePrefix: 'Schema audit pass',
      nextAction: 'Review the document against current schema, API, RLS, and Supabase notes.',
      owner: 'Platform',
      source: 'MCP platform MVP',
      tags: ['schema-api-audit'],
      filters: {
        documentPurpose: 'setup',
        documentStatus: 'active',
        alignmentTarget: 'Schema/API audit',
      },
      cadence: 'Per audit pass',
      outcome: 'Schema/API docs are converted into executable audit work.',
    },
  ],
  features: [
    {
      id: 'briefs',
      name: 'Briefs',
      capabilityId: 'planning',
      repositories: ['app'],
      mvpAction: 'keep',
      targetRelease: 'mvp',
      confidence: 'high',
      rationale: 'Core content planning value.',
      appFiles: ['app/campaigns/[id]/brief.tsx'],
      qaEvidenceFiles: ['docs/WORKING-TEST-SHEET.md'],
      fileStatuses: {
        'app/campaigns/[id]/brief.tsx': 'existing',
        'docs/WORKING-TEST-SHEET.md': 'needs-review',
      },
      roadmapSignals: [
        {
          source: 'docs/roadmap/PRODUCT-ROADMAP.md',
          status: 'in-progress',
          phase: 'Phase 1',
          summary: 'Campaign planning remains part of the active product direction.',
        },
      ],
      mvpNotes: ['Keep the app-led flow.'],
    },
  ],
  qaItems: [
    {
      id: 'qa-brief-create',
      title: 'Brief create smoke test',
      type: 'manual-test',
      status: 'needs-retest',
      priority: 'critical',
      summary: 'Create a brief, save it, reload, and confirm persisted fields.',
      featureIds: ['briefs'],
      repositoryIds: ['app'],
      fileRefs: ['app/campaigns/[id]/brief.tsx'],
      notes: [
        {
          id: 'qa-note-1',
          body: 'Retest after MVP navigation changes land.',
          createdAt: '2026-08-17',
        },
      ],
      attachments: [
        {
          id: 'brief-shot',
          label: 'Brief form screenshot',
          type: 'screenshot',
          path: 'qa/screenshots/brief-form.png',
        },
      ],
    },
  ],
  dependencyGraph: [],
  doNotCutBeforeChecks: ['briefs'],
  firstSlimmingCandidates: [],
  openQuestionsForReview: ['Which import fields should become required?'],
};

describe('ProjectAnalyzer', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PROJECT_ANALYSIS_SHOW_SAMPLES', 'true');
    vi.stubEnv('VITE_PROJECT_ANALYSIS_AUTO_LOAD', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('starts with a local map import screen', () => {
    render(<ProjectAnalyzer />);

    expect(screen.getByRole('heading', { name: 'Load a feature-file map' })).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
    expect(screen.getByText('Load sample')).toBeInTheDocument();
  });

  it('hides the fictional sample loader when private workspace mode disables samples', () => {
    vi.stubEnv('VITE_PROJECT_ANALYSIS_SHOW_SAMPLES', 'false');

    render(<ProjectAnalyzer />);

    expect(screen.getByRole('heading', { name: 'Load a feature-file map' })).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load sample' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load private DB' })).toBeInTheDocument();
  });

  it('can auto-load the private database map when private workspace mode enables it', async () => {
    vi.stubEnv('VITE_PROJECT_ANALYSIS_AUTO_LOAD', 'true');
    vi.stubEnv('VITE_PROJECT_ANALYSIS_MAP_ID', 'private-project-map');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'private-project-map',
        project_name: 'Private Map',
        source_label: 'private db',
        payload: privateFeatureFileMap,
      }],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ProjectAnalyzer />);

    expect(await screen.findByRole('heading', { name: 'Private Map' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3008/project_maps?id=eq.private-project-map&select=*');
  });

  it('loads the fictional sample model on request', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));

    expect(screen.getByRole('heading', { name: 'Atlas Launch Platform' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Feature Interaction Map' })).toBeInTheDocument();
    expect(screen.getAllByText('Brief Builder').length).toBeGreaterThanOrEqual(1);
  });

  it('imports a private feature-file map from a local JSON file', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('heading', { name: 'Private Map' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Files/i }));

    expect(screen.getByText('Briefs')).toBeInTheDocument();
    expect(screen.getByText('app/campaigns/[id]/brief.tsx')).toBeInTheDocument();
    expect(screen.getByText('docs/WORKING-TEST-SHEET.md')).toBeInTheDocument();
    expect(screen.getAllByText('Existing')).toHaveLength(2);
    expect(screen.getAllByText('Needs review')).toHaveLength(2);
  });

  it('shows imported roadmap signals on the roadmap view', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /Roadmap/i }));

    expect(screen.getByText('Roadmap Sources')).toBeInTheDocument();
    expect(screen.getAllByText('In progress')).toHaveLength(2);
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('docs/roadmap/PRODUCT-ROADMAP.md')).toBeInTheDocument();
  });

  it('tracks imported markdown documents and creates a new document record', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /MD Docs/i }));

    expect(screen.getByRole('main', { name: 'Markdown document tracking' })).toBeInTheDocument();
    expect(screen.getByText('Supabase Setup Context')).toBeInTheDocument();
    expect(screen.getByText('docs/setup/SUPABASE-SETUP.md')).toBeInTheDocument();
    expect(screen.getAllByText('Schema/API audit').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('region', { name: 'Agent context pack summary' })).toBeInTheDocument();
    expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Supabase RLS Docs')).toBeInTheDocument();
    expect(screen.getByText('Confirm RLS notes stay aligned before schema changes.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Markdown document alignment'), 'Schema/API audit');
    expect(screen.getByText('Supabase Setup Context')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Markdown document alignment'), 'all');
    await user.selectOptions(screen.getByLabelText('Markdown document tag'), 'rls');
    expect(screen.getByText('Supabase Setup Context')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Markdown document tag'), 'all');

    await user.click(screen.getByLabelText('Title'));
    await user.paste('MCP Security Checklist');
    await user.click(screen.getByLabelText('Path'));
    await user.paste('docs/security/MCP-CHECKLIST.md');
    await user.selectOptions(screen.getByLabelText('Purpose'), 'security');
    await user.selectOptions(screen.getByLabelText('Agent use level'), 'required');
    await user.selectOptions(screen.getByLabelText('Feature'), 'briefs');
    await user.click(screen.getByLabelText('Summary'));
    await user.paste('Tracks platform security gates for shared agent access.');
    await user.click(screen.getByLabelText('Alignment targets'));
    await user.paste('Security audit');
    await user.click(screen.getByLabelText('Applies to'));
    await user.paste('mcp, security');
    await user.click(screen.getByLabelText('Required checks'));
    await user.paste('Check MCP auth before exposing tools.');
    await user.click(screen.getByLabelText('Resource title'));
    await user.paste('MCP Authorization');
    await user.click(screen.getByLabelText('Resource URL'));
    await user.paste('https://modelcontextprotocol.io');
    await user.selectOptions(screen.getByLabelText('Resource type'), 'official-docs');
    await user.click(screen.getByLabelText('Resource tags'));
    await user.paste('mcp, authorization');
    await user.click(screen.getByRole('button', { name: /Add to map/i }));

    expect(screen.getByText('MCP Security Checklist')).toBeInTheDocument();
    expect(screen.getByText('docs/security/MCP-CHECKLIST.md')).toBeInTheDocument();
    expect(screen.getAllByText('Security audit').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Check MCP auth before exposing tools.')).toBeInTheDocument();
    expect(screen.getByText('MCP Authorization')).toBeInTheDocument();
  });

  it('opens feature details in a dialog instead of expanding the card inline', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));
    await user.click(screen.getByRole('tab', { name: /Features/i }));
    await user.click(screen.getAllByRole('button', { name: 'Show details' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Brief Builder' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Decision')).toBeInTheDocument();
    expect(within(dialog).getByText('Core planning surface with a direct path to user value.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close details' }));

    expect(screen.queryByRole('dialog', { name: 'Brief Builder' })).not.toBeInTheDocument();
  });

  it('shows a layered feature-file interaction map with file impact details', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));

    expect(screen.getByRole('main', { name: 'Layered feature interaction map' })).toBeInTheDocument();
    expect(screen.getAllByText('Capabilities').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Features').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Files').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Review queue empty state needs screenshot review')).toBeInTheDocument();

    expect(screen.getByLabelText('Find map item')).toBeInTheDocument();

    const fileNode = screen.getByRole('button', { name: /BriefWorkspace\.tsx/i });
    await user.click(fileNode);

    expect(screen.getByText('File impact view: this path is linked to features, QA items, and roadmap work.')).toBeInTheDocument();
    expect(screen.getByText('src/screens/BriefWorkspace.tsx')).toBeInTheDocument();
    expect(screen.getAllByText('Brief Builder').length).toBeGreaterThanOrEqual(1);
    expect(fileNode).toHaveClass('active');
    expect(screen.getByText(/Focused on BriefWorkspace\.tsx/i)).toBeInTheDocument();
    expect(screen.getByText(/related item/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Only selected network')).toBeChecked();

    const sameLevelFileNode = screen.getByRole('button', { name: /brief-builder-smoke\.md/i });
    expect(sameLevelFileNode).toHaveClass('active');
    expect(screen.queryByRole('button', { name: /ReviewQueue\.tsx/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Clear focus/i }));
    expect(fileNode).not.toHaveClass('active');
  });

  it('shows MVP readiness gaps and next actions', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));
    await user.click(screen.getByRole('tab', { name: /MVP Readiness/i }));

    expect(screen.getByRole('main', { name: 'MVP readiness dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ship decision board' })).toBeInTheDocument();
    expect(screen.getByText('MVP features')).toBeInTheDocument();
    expect(screen.getByText('QA gaps')).toBeInTheDocument();
    expect(screen.getByText('Mapping gaps')).toBeInTheDocument();
    expect(screen.getAllByText('Brief Builder').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Asset Review Queue').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Needs mapping').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Needs retest').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { name: 'Next Actions' })).toBeInTheDocument();
  });

  it('shows a project work queue ordered by next work', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));
    await user.click(screen.getByRole('tab', { name: /Work Queue/i }));

    expect(screen.getByRole('main', { name: 'Project work queue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Work Queue' })).toBeInTheDocument();
    expect(screen.getByText('active actions')).toBeInTheDocument();
    expect(screen.getByLabelText('Execution stage')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search queue, files, or QA')).toBeInTheDocument();
    expect(screen.getByText('How To Use This Queue')).toBeInTheDocument();
    expect(screen.getByText('Next Queue Upgrade')).toBeInTheDocument();
    expect(screen.getAllByText('Brief Builder').length).toBeGreaterThanOrEqual(1);
  });

  it('updates execution status from the queue quick actions', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));
    await user.click(screen.getByRole('tab', { name: /Work Queue/i }));

    const briefCard = screen.getAllByRole('heading', { name: 'Brief Builder' })[0].closest('article');
    expect(briefCard).not.toBeNull();

    await user.click(within(briefCard as HTMLElement).getByRole('button', { name: 'Start work' }));
    expect(within(briefCard as HTMLElement).getByText('Current work item')).toBeInTheDocument();

    await user.click(within(briefCard as HTMLElement).getByRole('button', { name: 'Approve scope' }));
    expect(within(briefCard as HTMLElement).getByText('Approved')).toBeInTheDocument();
    expect(within(briefCard as HTMLElement).getByText('Approved for active scope')).toBeInTheDocument();
  });

  it('applies saved queue views and batch planning actions', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /Work Queue/i }));

    await user.click(screen.getByRole('button', { name: /MCP Platform/i }));

    expect(screen.getByLabelText('Work item type')).toHaveValue('mcp');
    expect(screen.getByLabelText('Work item owner')).toHaveValue('Platform');
    expect(screen.getByLabelText('Work item priority')).toHaveValue('high');
    expect(screen.getByLabelText('Work item source')).toHaveValue('MCP platform MVP');
    expect(screen.getByText('Define MCP client registry')).toBeInTheDocument();

    await user.type(screen.getByLabelText('View name'), 'Platform Review');
    await user.click(screen.getByRole('button', { name: /Save current view/i }));
    expect(screen.getByRole('button', { name: /Platform Review/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Start visible work/i }));
    expect(screen.getAllByText('In progress').length).toBeGreaterThanOrEqual(1);
  });

  it('creates prepared work items from batch templates', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /Work Queue/i }));

    expect(screen.getByLabelText('Batch template')).toHaveValue('batch-template-schema-docs');
    expect(screen.getByText(/1 matching source/i)).toBeInTheDocument();
    expect(screen.getByText(/No recorded template runs yet/i)).toBeInTheDocument();
    expect(screen.getAllByText('Run Template').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Run this template once to collect recommendation signals/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Batch template recommendation rollup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Template 1/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Supabase Setup Context/i })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /Supabase Setup Context/i }));
    expect(screen.getByRole('button', { name: /Create batch work items/i })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Supabase Setup Context/i }));

    await user.clear(screen.getByLabelText('Template name'));
    await user.click(screen.getByLabelText('Template name'));
    await user.paste('Schema Audit Weekly');
    await user.clear(screen.getByLabelText('Title prefix'));
    await user.click(screen.getByLabelText('Title prefix'));
    await user.paste('Schema weekly audit');
    await user.click(screen.getByRole('button', { name: /Save template edits/i }));
    expect(screen.getByText(/Saved template: Schema Audit Weekly/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create batch work items/i }));

    expect(screen.getAllByText('Schema weekly audit: Supabase Setup Context').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('schema-api-audit').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Created 1 work item from Schema Audit Weekly/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Created 1 work item from 1 source/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Supabase Setup Context/i).length).toBeGreaterThanOrEqual(2);
    const runDetails = screen.getByRole('region', { name: /Selected batch template run/i });
    expect(within(runDetails).getByText('Generated Work')).toBeInTheDocument();
    await user.selectOptions(within(runDetails).getByLabelText('Run outcome score'), '4');
    await user.click(within(runDetails).getByLabelText('Run outcome notes'));
    await user.paste('Useful audit batch for schema context.');
    await user.click(within(runDetails).getByRole('button', { name: /Save run outcome/i }));
    expect(screen.getByText(/Saved run outcome for Schema Audit Weekly/i)).toBeInTheDocument();
    expect(screen.getByText(/Outcome score: 4\/5/i)).toBeInTheDocument();
    expect(screen.getAllByText('Useful audit batch for schema context.').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reuse').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Recent scored runs are strong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reuse 1/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Reuse 1/i }));
    expect(screen.getByText(/1 of 1 template shown by recommendation state/i)).toBeInTheDocument();
    await user.click(within(runDetails).getByRole('button', { name: 'Schema weekly audit: Supabase Setup Context' }));
    expect(screen.getByPlaceholderText('Search queue, files, or QA')).toHaveValue('Schema weekly audit: Supabase Setup Context');
    expect(screen.getByText(/Focused queue on run work item: Schema weekly audit: Supabase Setup Context/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Record rerun check/i }));
    expect(screen.getByText(/Recorded rerun check for Schema Audit Weekly/i)).toBeInTheDocument();
    const runComparison = screen.getByRole('region', { name: /Batch template run comparison/i });
    expect(within(runComparison).getByText('Run Comparison')).toBeInTheDocument();
    expect(within(runComparison).getByText('0 (-1)')).toBeInTheDocument();
    expect(within(runComparison).getByText('1 (+0)')).toBeInTheDocument();
    expect(within(runComparison).getByText('Unscored (-4)')).toBeInTheDocument();
    expect(screen.getAllByText('Score Latest Run').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Score the latest run to improve reuse guidance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Score Latest Run 1/i })).toBeInTheDocument();
    expect(screen.getAllByText(/0 new/i).length).toBeGreaterThanOrEqual(1);
  });

  it('creates and duplicates reusable batch templates', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /Work Queue/i }));

    await user.click(screen.getByRole('button', { name: /Duplicate template/i }));
    expect(screen.getByText(/Duplicated template: Schema Doc Audit Run Copy/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Template name')).toHaveValue('Schema Doc Audit Run Copy');

    await user.click(screen.getByRole('button', { name: /New template/i }));
    expect(screen.getByText(/Created template: New Batch Template/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Template name')).toHaveValue('New Batch Template');
    expect(screen.getByText(/1 matching source/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Template name'));
    await user.type(screen.getByLabelText('Template name'), 'Ad Hoc Doc Run');
    await user.clear(screen.getByLabelText('Title prefix'));
    await user.type(screen.getByLabelText('Title prefix'), 'Ad hoc review');
    await user.click(screen.getByRole('button', { name: /Save template edits/i }));
    expect(screen.getByText(/Saved template: Ad Hoc Doc Run/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create batch work items/i }));
    expect(screen.getAllByText('Ad hoc review: Supabase Setup Context').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Created 1 work item from Ad Hoc Doc Run/i)).toBeInTheDocument();
  });

  it('guards batch template archive and delete actions', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /Work Queue/i }));

    await user.click(screen.getByRole('button', { name: /Create batch work items/i }));
    expect(screen.getByText(/1 generated work item/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete template/i })).toBeDisabled();
    expect(screen.getByText(/Delete is unavailable because generated queue work still references this template/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Archive template/i }));
    expect(screen.getByText(/Archived template: Schema Doc Audit Run/i)).toBeInTheDocument();
    expect(screen.getByText(/All saved batch templates are archived/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Show archived templates/i));
    expect(screen.getByRole('button', { name: /Restore template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create batch work items/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Restore template/i }));
    expect(screen.getByText(/Restored template: Schema Doc Audit Run/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Duplicate template/i }));
    expect(screen.getByText(/Duplicated template: Schema Doc Audit Run Copy/i)).toBeInTheDocument();
    expect(screen.getByText(/0 generated work items/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete template/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Delete template/i }));
    expect(screen.getByText(/Deleted template: Schema Doc Audit Run Copy/i)).toBeInTheDocument();
  });

  it('creates and updates dedicated project work items', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /Work Queue/i }));

    expect(screen.getByText('Define MCP client registry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /MCP Platform/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Work item type')).toBeInTheDocument();
    expect(screen.getByLabelText('Work item owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Work item priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Work item source')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Title'));
    await user.paste('Build MCP tool schema audit');
    await user.click(screen.getByLabelText('Summary'));
    await user.paste('Create work item for validating first MCP request and response schemas.');
    await user.click(screen.getByLabelText('Next action'));
    await user.paste('List read-only tool schemas.');
    await user.selectOptions(screen.getByLabelText('Type'), 'audit');
    await user.selectOptions(screen.getByLabelText('Feature'), 'briefs');
    await user.click(screen.getByLabelText('Tags'));
    await user.paste('mcp-platform-mvp, schema-api-audit');
    await user.click(screen.getByRole('button', { name: /Add work item/i }));

    const workCard = screen.getByRole('heading', { name: 'Build MCP tool schema audit' }).closest('article');
    expect(workCard).not.toBeNull();
    expect(within(workCard as HTMLElement).getByText('schema-api-audit')).toBeInTheDocument();

    await user.click(within(workCard as HTMLElement).getByRole('button', { name: 'Start work' }));
    expect(within(workCard as HTMLElement).getByText('In progress')).toBeInTheDocument();
  });

  it('queues work from markdown documents and QA items', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.upload(
      screen.getByLabelText('Import project-analysis JSON'),
      new File([JSON.stringify(privateFeatureFileMap)], 'private-map.json', { type: 'application/json' }),
    );
    await screen.findByRole('heading', { name: 'Private Map' });
    await user.click(screen.getByRole('tab', { name: /MD Docs/i }));

    const docCard = screen.getByRole('heading', { name: 'Supabase Setup Context' }).closest('article');
    expect(docCard).not.toBeNull();
    await user.click(within(docCard as HTMLElement).getByRole('button', { name: /Send to Work Queue/i }));

    expect(screen.getByRole('heading', { name: 'Work Queue' })).toBeInTheDocument();
    expect(screen.getByText('Review doc: Supabase Setup Context')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^QA$/i }));
    const qaCard = screen.getByRole('heading', { name: 'Brief create smoke test' }).closest('article');
    expect(qaCard).not.toBeNull();
    await user.click(within(qaCard as HTMLElement).getByRole('button', { name: /Send to Work Queue/i }));

    expect(screen.getByRole('heading', { name: 'Work Queue' })).toBeInTheDocument();
    expect(screen.getByText('Resolve QA: Brief create smoke test')).toBeInTheDocument();
  });

  it('saves MVP readiness decision fields on a feature', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));
    await user.click(screen.getByRole('tab', { name: /MVP Readiness/i }));
    await user.click(screen.getAllByRole('button', { name: /Edit decision/i })[0]);

    await user.selectOptions(screen.getByLabelText('Final MVP decision'), 'simplify');
    await user.selectOptions(screen.getByLabelText('Sign-off'), 'approved');
    await user.selectOptions(screen.getByLabelText('Cut safety'), 'do-not-cut-yet');
    await user.type(screen.getByLabelText('Owner'), 'Launch lead');
    await user.clear(screen.getByLabelText('Status'));
    await user.type(screen.getByLabelText('Status'), 'MVP sign-off');
    await user.clear(screen.getByLabelText('Next action'));
    await user.type(screen.getByLabelText('Next action'), 'Keep this in MVP and finish branch cleanup.');
    await user.type(screen.getByLabelText('Progress note'), 'Decision reviewed with QA evidence.');
    await user.click(screen.getByRole('button', { name: /Save decision/i }));

    expect(screen.getByText('Decision: Simplify')).toBeInTheDocument();
    expect(screen.getByText('Keep this in MVP and finish branch cleanup.')).toBeInTheDocument();
    expect(screen.getByText('Decision reviewed with QA evidence.')).toBeInTheDocument();
    expect(screen.getByText('Launch lead')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getAllByText('Do not cut yet').length).toBeGreaterThanOrEqual(1);
  });

  it('filters sample features by release', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));
    await user.selectOptions(screen.getByLabelText('Release'), 'mvp');

    expect(screen.getAllByText('Brief Builder').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Publishing Scheduler')).not.toBeInTheDocument();
  });
});
