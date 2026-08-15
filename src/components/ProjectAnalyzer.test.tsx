import { render, screen } from '@testing-library/react';
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
