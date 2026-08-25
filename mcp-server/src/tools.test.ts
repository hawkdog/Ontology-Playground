import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleProjectAnalysis } from '../../src/data/projectAnalysis.ts';
import { callProjectTool, projectContextTools } from './tools.ts';

describe('project context MCP tools', () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.stubEnv('PROJECT_ANALYSIS_SOURCE_FILE', '');
    vi.stubEnv('PROJECT_ANALYSIS_API_URL', '');
    vi.stubEnv('VITE_PROJECT_ANALYSIS_API_URL', '');
    vi.stubEnv('PROJECT_ANALYSIS_ALLOW_SAMPLE', 'true');
    vi.stubEnv('MCP_INCLUDE_PRIVATE_CONTEXT', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    return Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('lists deterministic read-only tool definitions', () => {
    expect(projectContextTools.map((tool) => tool.name)).toEqual([
      'project.summary',
      'project.markdown_context_pack',
      'project.resources.list',
      'project.work_queue.list',
      'project.qa_status',
      'project.roadmap_signals',
    ]);
    expect(projectContextTools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
    expect(projectContextTools.every((tool) => tool.annotations?.destructiveHint === false)).toBe(true);
    expect(projectContextTools.every((tool) => tool.annotations?.idempotentHint === true)).toBe(true);
    expect(projectContextTools.every((tool) => tool.annotations?.openWorldHint === false)).toBe(true);
  });

  it('returns a summary from the fictional sample context by default', async () => {
    const result = await callProjectTool('project.summary');

    expect(result.isError).toBe(false);
    expect(result.structuredContent.project).toMatchObject({
      projectName: 'Atlas Launch Platform',
    });
    expect(result.structuredContent.counts).toMatchObject({
      features: 5,
      markdownDocuments: 2,
      workItems: 2,
    });
  });

  it('builds filtered markdown context packs with resources and required checks', async () => {
    const result = await callProjectTool('project.markdown_context_pack', {
      tag: 'setup',
      agentUseLevel: 'required',
    });

    expect(result.structuredContent.summary).toMatchObject({
      documentCount: 1,
      requiredDocuments: 1,
      resourceCount: 1,
      requiredCheckCount: 1,
    });
    expect(result.content[0]?.text).toContain('Launch environment runbook');
    expect(result.content[0]?.text).toContain('Confirm environment variables before launch checks.');
  });

  it('respects the server private-context guard', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'mcp-context-'));
    tempDirs.push(tempDir);
    const sourceFile = path.join(tempDir, 'private-map.json');
    await writeFile(sourceFile, JSON.stringify({
      ...sampleProjectAnalysis,
      markdownDocuments: (sampleProjectAnalysis.markdownDocuments ?? []).map((doc) => ({
        ...doc,
        sensitivity: 'private',
      })),
    }), 'utf8');

    vi.stubEnv('PROJECT_ANALYSIS_SOURCE_FILE', sourceFile);
    vi.stubEnv('MCP_INCLUDE_PRIVATE_CONTEXT', 'false');

    const result = await callProjectTool('project.markdown_context_pack', {
      tag: 'setup',
    });

    expect(result.structuredContent.summary).toMatchObject({
      documentCount: 0,
      resourceCount: 0,
    });
  });

  it('returns read-only queue items for MCP work', async () => {
    const result = await callProjectTool('project.work_queue.list', {
      type: 'mcp',
      source: 'Sample planning item',
    });

    expect(result.structuredContent.items).toEqual([
      expect.objectContaining({
        title: 'Define MCP context pack contract',
        type: 'mcp',
      }),
    ]);
  });
});
