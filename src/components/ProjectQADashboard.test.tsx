import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProjectQADashboard } from './ProjectQADashboard';
import type { ProjectAnalysisModel } from '../data/projectAnalysis';

const privateQAProject: ProjectAnalysisModel = {
  schemaVersion: 'project-analysis.feature-file-map.v1',
  projectName: 'Private Map',
  description: 'Private local feature-file map.',
  sourceLabel: 'test fixture',
  scopePurpose: 'Track MVP testing and roadmap coverage without publishing private code.',
  privacyBoundary: 'Local only; private app and plugin files stay outside the public repository.',
  repositories: [
    {
      id: 'app',
      name: 'App',
      visibility: 'private',
      type: 'web-app',
      description: 'Private app repository',
    },
  ],
  capabilities: [
    {
      id: 'planning',
      name: 'Planning',
      description: 'Plan the core content workflow.',
      businessValue: 5,
    },
  ],
  releases: [{ id: 'mvp', name: 'MVP', horizon: 'Now' }],
  roadmapSources: [
    {
      source: 'v2-ai-content-creator-app-358/docs/roadmap/PRODUCT-ROADMAP.md',
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
      repositoryIds: ['app'],
      disposition: 'keep',
      releaseId: 'mvp',
      value: 5,
      effort: 3,
      risk: 2,
      rationale: 'Core content planning value.',
      appFiles: ['app/campaigns/[id]/brief.tsx'],
      qaEvidenceFiles: ['docs/testing/QA_Testing_Execution_Tracker.xlsx'],
      roadmapSignals: [
        {
          source: 'v2-ai-content-creator-app-358/docs/roadmap/PRODUCT-ROADMAP.md',
          status: 'in-progress',
          phase: 'Phase 1',
          summary: 'Campaign planning remains part of the active product direction.',
        },
      ],
    },
  ],
  components: [],
  dependencies: [],
  qaItems: [
    {
      id: 'qa-brief-create',
      testId: 'APP-MVP-001',
      title: 'Brief create smoke test',
      type: 'manual-test',
      status: 'needs-retest',
      rawStatus: 'Needs Retest',
      priority: 'critical',
      summary: 'Create a brief, save it, reload, and confirm persisted fields.',
      featureIds: ['briefs'],
      repositoryIds: ['app'],
      fileRefs: ['app/campaigns/[id]/brief.tsx'],
      track: 'App MVP Tests',
      area: 'Campaigns',
      modeTier: 'Relay Licensed',
      result: 'Partial',
      nextAction: 'Retest after MVP navigation changes land.',
      mvpBlocker: 'Yes',
      automationCoverage: 'Manual only',
      sourceDoc: 'docs/testing/QA_Testing_Execution_Tracker.xlsx',
      sourceSection: 'App MVP Tests',
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
};

describe('ProjectQADashboard', () => {
  it('shows QA tracker fields, roadmap sources, evidence, and mapped files', () => {
    render(<ProjectQADashboard model={privateQAProject} autoLoad={false} />);

    expect(screen.getByRole('heading', { name: 'Private Map' })).toBeInTheDocument();
    expect(screen.getByText('Brief create smoke test')).toBeInTheDocument();
    expect(screen.getByText('APP-MVP-001')).toBeInTheDocument();
    expect(screen.getAllByText('App MVP Tests').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Campaigns')).toBeInTheDocument();
    expect(screen.getAllByText('Retest after MVP navigation changes land.').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('app/campaigns/[id]/brief.tsx')).toBeInTheDocument();
    expect(screen.getByText('Brief form screenshot')).toBeInTheDocument();
    expect(screen.getAllByText('v2-ai-content-creator-app-358/docs/roadmap/PRODUCT-ROADMAP.md').length).toBeGreaterThanOrEqual(1);
  });

  it('adds a QA item mapped to a feature and file', async () => {
    const user = userEvent.setup();
    render(<ProjectQADashboard model={privateQAProject} autoLoad={false} />);

    await user.selectOptions(screen.getByLabelText('Feature'), 'briefs');
    await user.type(screen.getByLabelText('Test ID'), 'APP-MVP-002');
    await user.type(screen.getByLabelText('Title'), 'Confirm slimmed MVP copy');
    await user.type(screen.getByLabelText('Mapped file'), 'docs/MASTER-TESTING-CHECKLIST.md');
    await user.type(screen.getByLabelText('Note'), 'Use the private QA notes as source of truth.');
    await user.click(screen.getByRole('button', { name: 'Add to QA map' }));

    expect(screen.getByText('Confirm slimmed MVP copy')).toBeInTheDocument();
    expect(screen.getByText('APP-MVP-002')).toBeInTheDocument();
    expect(screen.getByText('docs/MASTER-TESTING-CHECKLIST.md')).toBeInTheDocument();
    expect(screen.getByText('Use the private QA notes as source of truth.')).toBeInTheDocument();
  });
});
