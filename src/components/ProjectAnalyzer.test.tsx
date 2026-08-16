import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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
  dependencyGraph: [],
  doNotCutBeforeChecks: ['briefs'],
  firstSlimmingCandidates: [],
  openQuestionsForReview: ['Which import fields should become required?'],
};

describe('ProjectAnalyzer', () => {
  it('starts with a local map import screen', () => {
    render(<ProjectAnalyzer />);

    expect(screen.getByRole('heading', { name: 'Load a feature-file map' })).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
    expect(screen.getByText('Load sample')).toBeInTheDocument();
  });

  it('loads the fictional sample model on request', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));

    expect(screen.getByRole('heading', { name: 'Atlas Launch Platform' })).toBeInTheDocument();
    expect(screen.getByText('Brief Builder')).toBeInTheDocument();
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
    await user.click(screen.getAllByRole('button', { name: 'Show details' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Brief Builder' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Decision')).toBeInTheDocument();
    expect(within(dialog).getByText('Core planning surface with a direct path to user value.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close details' }));

    expect(screen.queryByRole('dialog', { name: 'Brief Builder' })).not.toBeInTheDocument();
  });

  it('filters sample features by release', async () => {
    const user = userEvent.setup();
    render(<ProjectAnalyzer />);

    await user.click(screen.getByRole('button', { name: 'Load sample' }));
    await user.selectOptions(screen.getByLabelText('Release'), 'mvp');

    expect(screen.getByText('Brief Builder')).toBeInTheDocument();
    expect(screen.queryByText('Publishing Scheduler')).not.toBeInTheDocument();
  });
});
