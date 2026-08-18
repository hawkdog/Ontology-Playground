import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProjectRoadmapDashboard } from './ProjectRoadmapDashboard';
import type { ProjectAnalysisModel } from '../data/projectAnalysis';

const roadmapProject: ProjectAnalysisModel = {
  schemaVersion: 'project-analysis.feature-file-map.v1',
  projectName: 'Private Map',
  description: 'Private roadmap map.',
  sourceLabel: 'test fixture',
  scopePurpose: 'Review roadmap docs as intake before making implementation features.',
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
  releases: [
    { id: 'mvp', name: 'MVP', horizon: 'Now' },
    { id: 'later', name: 'Later', horizon: 'Future' },
  ],
  roadmapSources: [
    {
      source: 'v2-ai-content-creator-app-358/docs/roadmap/PRODUCT-ROADMAP.md',
      status: 'planned',
      phase: 'Phase 1',
      summary: 'Campaign planning remains part of the active product direction.',
    },
  ],
  roadmapItems: [
    {
      id: 'roadmap-research-import',
      title: 'Research Import',
      type: 'feature-candidate',
      status: 'mvp',
      summary: 'Bring source material into the workflow without full automated research.',
      source: 'v2-ai-content-creator-app-358/docs/roadmap/PRODUCT-ROADMAP.md',
      sourceSection: 'MVP Scope',
      phase: 'MVP',
      target: 'Launch',
      targetReleaseId: 'mvp',
      priority: 'High',
      capabilityId: 'planning',
      repositoryIds: ['app'],
      fileRefs: ['app/research/import.tsx'],
    },
  ],
  features: [],
  components: [],
  dependencies: [],
};

describe('ProjectRoadmapDashboard', () => {
  it('shows roadmap intake items, source docs, and mapped files', () => {
    render(<ProjectRoadmapDashboard model={roadmapProject} autoLoad={false} />);

    expect(screen.getByRole('heading', { name: 'Private Map' })).toBeInTheDocument();
    expect(screen.getByText('Research Import')).toBeInTheDocument();
    expect(screen.getByText('Bring source material into the workflow without full automated research.')).toBeInTheDocument();
    expect(screen.getAllByText('v2-ai-content-creator-app-358/docs/roadmap/PRODUCT-ROADMAP.md').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('app/research/import.tsx')).toBeInTheDocument();
    expect(screen.getByText('MVP Scope')).toBeInTheDocument();
  });

  it('promotes an intake item into a linked active feature', async () => {
    const user = userEvent.setup();
    render(<ProjectRoadmapDashboard model={roadmapProject} autoLoad={false} />);

    const item = screen.getByRole('heading', { name: 'Research Import' }).closest('article');
    expect(item).not.toBeNull();
    await user.click(within(item as HTMLElement).getByRole('button', { name: 'Promote to Feature' }));

    expect(within(item as HTMLElement).getByText('Feature linked')).toBeInTheDocument();
    expect(within(item as HTMLElement).getByRole('button', { name: 'Mark Active' })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Research Import' }).length).toBeGreaterThanOrEqual(1);
  });

  it('adds a manual roadmap item', async () => {
    const user = userEvent.setup();
    render(<ProjectRoadmapDashboard model={roadmapProject} autoLoad={false} />);

    await user.type(screen.getByLabelText('Title'), 'Agency White Label');
    await user.type(screen.getByLabelText('Summary'), 'Defer agency branding until the launch path is proven.');
    await user.type(screen.getByLabelText('Source doc'), 'content-plugin/docs/roadmap/PRODUCT-ROADMAP.md');
    await user.click(screen.getByRole('button', { name: 'Add roadmap item' }));

    expect(screen.getByText('Agency White Label')).toBeInTheDocument();
    expect(screen.getByText('Defer agency branding until the launch path is proven.')).toBeInTheDocument();
  });
});
