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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'msp-guides',
        project_name: 'Private Map',
        source_label: 'private db',
        payload: privateFeatureFileMap,
      }],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ProjectAnalyzer />);

    expect(await screen.findByRole('heading', { name: 'Private Map' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3008/project_maps?id=eq.msp-guides&select=*');
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

    await user.click(screen.getByLabelText('Only selected network'));
    expect(screen.getByLabelText('Only selected network')).toBeChecked();

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
