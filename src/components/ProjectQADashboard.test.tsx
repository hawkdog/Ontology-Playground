import { render, screen, within } from '@testing-library/react';
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
      source: 'private-app/docs/roadmap/PRODUCT-ROADMAP.md',
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
          source: 'private-app/docs/roadmap/PRODUCT-ROADMAP.md',
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
    expect(screen.getAllByText('private-app/docs/roadmap/PRODUCT-ROADMAP.md').length).toBeGreaterThanOrEqual(1);
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

  it('edits a QA item, marks it current, and adds a dated progress entry', async () => {
    const user = userEvent.setup();
    render(<ProjectQADashboard model={privateQAProject} autoLoad={false} />);

    const item = screen.getByRole('heading', { name: 'Brief create smoke test' }).closest('article');
    expect(item).not.toBeNull();

    await user.click(within(item as HTMLElement).getByRole('button', { name: 'Edit item' }));
    const dialog = screen.getByRole('dialog', { name: 'Brief create smoke test' });

    await user.click(within(dialog).getByLabelText('Current work item'));
    await user.click(within(dialog).getByRole('button', { name: 'Save item changes' }));
    expect(within(item as HTMLElement).getByText('Current')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Notes'), 'Retested campaign navigation after menu cleanup.');
    await user.click(within(dialog).getByRole('button', { name: 'Add progress step' }));

    expect(within(dialog).getByText('Retested campaign navigation after menu cleanup.')).toBeInTheDocument();
    expect(screen.getByText(/Latest progress/i)).toBeInTheDocument();
  });

  it('shows automated QA results and screenshot evidence in the progress log', async () => {
    const user = userEvent.setup();
    const modelWithAutomatedProgress: ProjectAnalysisModel = {
      ...privateQAProject,
      qaItems: privateQAProject.qaItems?.map((item) => ({
        ...item,
        progressLog: [
          {
            id: 'progress-codex-smoke',
            createdAt: '2026-08-20T12:00:00.000Z',
            status: 'passed',
            author: 'Codex QA runner',
            body: 'Codex browser smoke passed.\n\nActual result: Dashboard loaded and no critical error was visible.',
            images: [
              {
                id: 'image-codex-smoke',
                label: 'brief-automated-smoke.png',
                type: 'screenshot',
                path: 'local-private-evidence/brief-automated-smoke.png',
                url: 'data:image/png;base64,iVBORw0KGgo=',
              },
            ],
          },
        ],
      })) ?? [],
    };

    render(<ProjectQADashboard model={modelWithAutomatedProgress} autoLoad={false} />);

    const item = screen.getByRole('heading', { name: 'Brief create smoke test' }).closest('article');
    expect(item).not.toBeNull();
    expect(within(item as HTMLElement).getByText(/Latest progress/i)).toBeInTheDocument();
    expect(within(item as HTMLElement).getByText(/Codex browser smoke passed/i)).toBeInTheDocument();

    await user.click(within(item as HTMLElement).getByRole('button', { name: 'Edit item' }));
    const dialog = screen.getByRole('dialog', { name: 'Brief create smoke test' });

    expect(within(dialog).getByText(/Actual result: Dashboard loaded/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'brief-automated-smoke.png' })).toBeInTheDocument();
    expect(within(dialog).getByText('local-private-evidence/brief-automated-smoke.png')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Open image brief-automated-smoke.png' }));
    const gallery = screen.getByRole('dialog', { name: 'brief-automated-smoke.png' });
    expect(within(gallery).getByRole('img', { name: 'brief-automated-smoke.png' })).toBeInTheDocument();

    await user.click(within(gallery).getByRole('button', { name: 'Close image gallery' }));
    expect(screen.queryByRole('dialog', { name: 'brief-automated-smoke.png' })).not.toBeInTheDocument();
  });

  it('classifies QA item testability and dependency readiness', async () => {
    const user = userEvent.setup();
    const modelWithAutomatedItem: ProjectAnalysisModel = {
      ...privateQAProject,
      testingRuntime: {
        schemaVersion: 'project-analysis.testing-runtime.v1',
        scannerVersion: '1.0.0',
        scannedAt: '2026-08-22T19:45:00.000Z',
        workspaceRoot: 'private-workspace',
        mapId: 'private-project-map',
        tools: [
          {
            id: 'app:dependency:@playwright/test',
            label: 'Playwright',
            category: 'e2e-test',
            status: 'available',
            summary: 'Package is declared in App.',
          },
          {
            id: 'docker',
            label: 'Docker',
            category: 'docker',
            status: 'available',
            summary: 'Docker CLI is available.',
          },
        ],
        endpoints: [
          {
            id: 'localhost-5173',
            label: 'Local app',
            url: 'http://localhost:5173',
            status: 'available',
            statusCode: 200,
            summary: 'Responded with HTTP 200.',
          },
        ],
        repositories: [
          {
            repositoryId: 'app',
            name: 'App',
            path: 'private-workspace/app',
            packageManager: 'npm',
            scripts: ['dev', 'test'],
            tools: ['@playwright/test'],
          },
        ],
        notes: [],
      },
      qaItems: [
        ...(privateQAProject.qaItems ?? []),
        {
          id: 'qa-brief-automated',
          testId: 'APP-AUTO-001',
          title: 'Automated brief route smoke',
          type: 'automated-test',
          status: 'ready',
          priority: 'high',
          summary: 'Run Playwright smoke against the brief route and capture a screenshot.',
          featureIds: ['briefs'],
          repositoryIds: ['app'],
          fileRefs: ['tests/brief-route.spec.ts'],
          automationCoverage: 'Playwright smoke',
          attachments: [
            {
              id: 'auto-shot',
              label: 'brief-route-smoke.png',
              type: 'screenshot',
              path: 'qa/screenshots/brief-route-smoke.png',
            },
          ],
        },
      ],
    };

    render(<ProjectQADashboard model={modelWithAutomatedItem} autoLoad={false} />);

    await user.click(screen.getByRole('tab', { name: 'Testability' }));

    expect(screen.getByRole('region', { name: 'QA testability report' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Testing Capability Report' })).toBeInTheDocument();
    expect(screen.getAllByText('Manual only').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Automation-ready').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Capability Inventory')).toBeInTheDocument();
    expect(screen.getByText('Scanner Snapshot')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'QA runtime status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'QA Setup Readiness' })).toBeInTheDocument();
    expect(screen.getByText('npm run qa:scan')).toBeInTheDocument();
    expect(screen.getByText('Project DB')).toBeInTheDocument();
    expect(screen.getByText('Local app')).toBeInTheDocument();
    expect(screen.getByText('WordPress')).toBeInTheDocument();
    expect(screen.getByText('Browser tests')).toBeInTheDocument();
    expect(screen.getByText('1 reachable · 0 unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('Browser / UI runner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Automated brief route smoke')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Testability level'), 'automation-ready');
    expect(screen.getByText('Automated brief route smoke')).toBeInTheDocument();
    expect(screen.queryByText('Brief create smoke test')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open item' }));
    expect(screen.getByRole('dialog', { name: 'Automated brief route smoke' })).toBeInTheDocument();
  });
});
