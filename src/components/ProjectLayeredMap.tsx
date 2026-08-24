import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  ClipboardCheck,
  Code2,
  FileCode2,
  Layers3,
  Map as MapIcon,
  Milestone,
  Network,
  Search,
  X,
} from 'lucide-react';
import {
  dispositionColors,
  dispositionLabels,
  fileStatusColors,
  fileStatusLabels,
  qaStatusColors,
  qaStatusLabels,
  roadmapStatusColor,
  roadmapStatusLabel,
  type FileReferenceStatus,
  type ProductFeature,
  type ProjectAnalysisModel,
  type QAItem,
  type QAAttachment,
  type RoadmapItem,
} from '../data/projectAnalysis';

type ProjectMapLayer = 'capability' | 'feature' | 'component' | 'file' | 'qa' | 'roadmap';
type ProjectMapNodeKind = ProjectMapLayer | 'dependency';

interface ProjectLayeredMapProps {
  model: ProjectAnalysisModel;
  features: ProductFeature[];
  selectedFeatureId?: string | null;
  onSelectFeature?: (featureId: string) => void;
}

interface ProjectMapNode {
  id: string;
  layer: ProjectMapLayer;
  kind: ProjectMapNodeKind;
  refId: string;
  label: string;
  subtitle?: string;
  tone?: string;
  metric?: string;
  path?: string;
}

interface ProjectMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'owns' | 'maps' | 'tests' | 'plans' | 'depends';
}

interface FileMapRecord {
  path: string;
  status: FileReferenceStatus;
  featureIds: string[];
  qaIds: string[];
  roadmapIds: string[];
}

const layerLabels: Record<ProjectMapLayer, string> = {
  capability: 'Capabilities',
  feature: 'Features',
  component: 'Components',
  file: 'Files',
  qa: 'QA',
  roadmap: 'Roadmap',
};

const layerIcons: Record<ProjectMapLayer, typeof Boxes> = {
  capability: Boxes,
  feature: Layers3,
  component: Code2,
  file: FileCode2,
  qa: ClipboardCheck,
  roadmap: Milestone,
};

const defaultLayers: Record<ProjectMapLayer, boolean> = {
  capability: true,
  feature: true,
  component: true,
  file: true,
  qa: true,
  roadmap: true,
};

function featureFiles(feature: ProductFeature): FileMapRecord[] {
  const paths = [
    ...(feature.appFiles ?? []),
    ...(feature.pluginFiles ?? []),
    ...(feature.playgroundFiles ?? []),
    ...(feature.privateDataFiles ?? []),
    ...(feature.qaEvidenceFiles ?? []),
  ];

  return paths.map((path) => ({
    path,
    status: feature.fileStatuses?.[path] ?? 'mapped',
    featureIds: [feature.id],
    qaIds: [],
    roadmapIds: [],
  }));
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function mergeFileRecord(records: Map<string, FileMapRecord>, incoming: FileMapRecord) {
  const current = records.get(incoming.path);
  if (!current) {
    records.set(incoming.path, { ...incoming });
    return;
  }

  current.featureIds = Array.from(new Set([...current.featureIds, ...incoming.featureIds]));
  current.qaIds = Array.from(new Set([...current.qaIds, ...incoming.qaIds]));
  current.roadmapIds = Array.from(new Set([...current.roadmapIds, ...incoming.roadmapIds]));
  if (current.status === 'mapped' && incoming.status !== 'mapped') current.status = incoming.status;
}

function uniqueEdges(edges: ProjectMapEdge[], nodeIds: Set<string>): ProjectMapEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || seen.has(edge.id)) return false;
    seen.add(edge.id);
    return true;
  });
}

function relatedQAItems(model: ProjectAnalysisModel, visibleFeatureIds: Set<string>): QAItem[] {
  return (model.qaItems ?? []).filter((item) => item.featureIds.some((featureId) => visibleFeatureIds.has(featureId)));
}

function relatedRoadmapItems(model: ProjectAnalysisModel, visibleFeatureIds: Set<string>): RoadmapItem[] {
  return (model.roadmapItems ?? []).filter((item) => {
    if ((item.featureIds ?? []).some((featureId) => visibleFeatureIds.has(featureId))) return true;
    if (item.promotedFeatureId && visibleFeatureIds.has(item.promotedFeatureId)) return true;
    return false;
  });
}

function buildLayeredMap(model: ProjectAnalysisModel, features: ProductFeature[]) {
  const visibleFeatureIds = new Set(features.map((feature) => feature.id));
  const components = model.components.filter((component) => component.featureIds.some((featureId) => visibleFeatureIds.has(featureId)));
  const qaItems = relatedQAItems(model, visibleFeatureIds);
  const roadmapItems = relatedRoadmapItems(model, visibleFeatureIds);
  const fileRecords = new Map<string, FileMapRecord>();

  for (const feature of features) {
    for (const file of featureFiles(feature)) mergeFileRecord(fileRecords, file);
  }

  for (const item of qaItems) {
    for (const path of item.fileRefs ?? []) {
      mergeFileRecord(fileRecords, {
        path,
        status: 'mapped',
        featureIds: item.featureIds.filter((featureId) => visibleFeatureIds.has(featureId)),
        qaIds: [item.id],
        roadmapIds: [],
      });
    }

    for (const attachment of item.attachments ?? []) {
      const path = attachment.path || attachment.url;
      if (!path) continue;
      mergeFileRecord(fileRecords, {
        path,
        status: 'needs-review',
        featureIds: item.featureIds.filter((featureId) => visibleFeatureIds.has(featureId)),
        qaIds: [item.id],
        roadmapIds: [],
      });
    }
  }

  for (const item of roadmapItems) {
    for (const path of item.fileRefs ?? []) {
      mergeFileRecord(fileRecords, {
        path,
        status: 'planned',
        featureIds: (item.featureIds ?? []).filter((featureId) => visibleFeatureIds.has(featureId)),
        qaIds: [],
        roadmapIds: [item.id],
      });
    }
  }

  const files = Array.from(fileRecords.values()).sort((a, b) => a.path.localeCompare(b.path));
  const nodes: ProjectMapNode[] = [
    ...model.capabilities
      .filter((capability) => features.some((feature) => feature.capabilityId === capability.id))
      .map((capability): ProjectMapNode => ({
        id: `capability:${capability.id}`,
        layer: 'capability',
        kind: 'capability',
        refId: capability.id,
        label: capability.name,
        subtitle: capability.description,
        metric: `Value ${capability.businessValue}`,
      })),
    ...features.map((feature): ProjectMapNode => ({
      id: `feature:${feature.id}`,
      layer: 'feature',
      kind: 'feature',
      refId: feature.id,
      label: feature.name,
      subtitle: dispositionLabels[feature.disposition],
      tone: dispositionColors[feature.disposition],
      metric: model.releases.find((release) => release.id === feature.releaseId)?.name ?? feature.releaseId,
    })),
    ...components.map((component): ProjectMapNode => ({
      id: `component:${component.id}`,
      layer: 'component',
      kind: 'component',
      refId: component.id,
      label: component.name,
      subtitle: component.kind,
      metric: model.repositories.find((repo) => repo.id === component.repositoryId)?.name ?? component.repositoryId,
    })),
    ...files.map((file): ProjectMapNode => ({
      id: `file:${file.path}`,
      layer: 'file',
      kind: 'file',
      refId: file.path,
      label: basename(file.path),
      subtitle: fileStatusLabels[file.status],
      tone: fileStatusColors[file.status],
      path: file.path,
    })),
    ...qaItems.map((item): ProjectMapNode => ({
      id: `qa:${item.id}`,
      layer: 'qa',
      kind: 'qa',
      refId: item.id,
      label: item.title,
      subtitle: qaStatusLabels[item.status],
      tone: qaStatusColors[item.status],
      metric: item.testId || item.type,
    })),
    ...roadmapItems.map((item): ProjectMapNode => ({
      id: `roadmap:${item.id}`,
      layer: 'roadmap',
      kind: 'roadmap',
      refId: item.id,
      label: item.title,
      subtitle: roadmapStatusLabel(item.status),
      tone: roadmapStatusColor(item.status),
      metric: item.phase || item.target || item.type,
    })),
  ];

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: ProjectMapEdge[] = [];

  for (const feature of features) {
    const featureNodeId = `feature:${feature.id}`;
    edges.push({
      id: `capability:${feature.capabilityId}->${featureNodeId}`,
      source: `capability:${feature.capabilityId}`,
      target: featureNodeId,
      label: 'owns',
      type: 'owns',
    });

    for (const file of featureFiles(feature)) {
      edges.push({
        id: `${featureNodeId}->file:${file.path}`,
        source: featureNodeId,
        target: `file:${file.path}`,
        label: 'implements',
        type: 'maps',
      });
    }
  }

  for (const component of components) {
    for (const featureId of component.featureIds) {
      if (!visibleFeatureIds.has(featureId)) continue;
      edges.push({
        id: `feature:${featureId}->component:${component.id}`,
        source: `feature:${featureId}`,
        target: `component:${component.id}`,
        label: component.kind,
        type: 'maps',
      });
    }
  }

  for (const file of files) {
    for (const qaId of file.qaIds) {
      edges.push({
        id: `file:${file.path}->qa:${qaId}`,
        source: `file:${file.path}`,
        target: `qa:${qaId}`,
        label: 'tested by',
        type: 'tests',
      });
    }
    for (const roadmapId of file.roadmapIds) {
      edges.push({
        id: `file:${file.path}->roadmap:${roadmapId}`,
        source: `file:${file.path}`,
        target: `roadmap:${roadmapId}`,
        label: 'planned by',
        type: 'plans',
      });
    }
  }

  for (const item of qaItems) {
    for (const featureId of item.featureIds) {
      if (!visibleFeatureIds.has(featureId)) continue;
      edges.push({
        id: `feature:${featureId}->qa:${item.id}`,
        source: `feature:${featureId}`,
        target: `qa:${item.id}`,
        label: 'covered by',
        type: 'tests',
      });
    }
  }

  for (const item of roadmapItems) {
    for (const featureId of item.featureIds ?? []) {
      if (!visibleFeatureIds.has(featureId)) continue;
      edges.push({
        id: `feature:${featureId}->roadmap:${item.id}`,
        source: `feature:${featureId}`,
        target: `roadmap:${item.id}`,
        label: 'planned by',
        type: 'plans',
      });
    }
  }

  for (const dependency of model.dependencies) {
    if (!visibleFeatureIds.has(dependency.fromFeatureId) || !visibleFeatureIds.has(dependency.toFeatureId)) continue;
    edges.push({
      id: `dependency:${dependency.id}`,
      source: `feature:${dependency.fromFeatureId}`,
      target: `feature:${dependency.toFeatureId}`,
      label: dependency.type,
      type: 'depends',
    });
  }

  return {
    nodes,
    edges: uniqueEdges(edges, nodeIds),
    files,
    qaItems,
    roadmapItems,
  };
}

function nodeIcon(kind: ProjectMapNodeKind) {
  if (kind === 'capability') return Boxes;
  if (kind === 'feature') return Layers3;
  if (kind === 'component') return Code2;
  if (kind === 'file') return FileCode2;
  if (kind === 'qa') return ClipboardCheck;
  if (kind === 'roadmap') return Milestone;
  return Network;
}

function evidenceCount(item: QAItem): number {
  const attachments = item.attachments?.length ?? 0;
  const progressImages = (item.progressLog ?? []).reduce((count, entry) => count + (entry.images?.length ?? 0), 0);
  return attachments + progressImages;
}

function edgeClass(type: ProjectMapEdge['type']): string {
  return `analysis-map-edge analysis-map-edge--${type}`;
}

function nodeSearchText(node: ProjectMapNode): string {
  return [node.label, node.subtitle, node.metric, node.path, node.refId, node.layer].filter(Boolean).join(' ').toLowerCase();
}

function selectedNetworkIds(focusedNode: ProjectMapNode | null, edges: ProjectMapEdge[]): Set<string> {
  const selected = new Set<string>();
  if (!focusedNode) return selected;

  selected.add(focusedNode.id);
  const directlyRelated = new Set<string>();
  for (const edge of edges) {
    if (edge.source === focusedNode.id) directlyRelated.add(edge.target);
    if (edge.target === focusedNode.id) directlyRelated.add(edge.source);
  }

  for (const nodeId of directlyRelated) selected.add(nodeId);

  for (const edge of edges) {
    if (directlyRelated.has(edge.source)) selected.add(edge.target);
    if (directlyRelated.has(edge.target)) selected.add(edge.source);
  }

  return selected;
}

export function ProjectLayeredMap({ model, features, selectedFeatureId, onSelectFeature }: ProjectLayeredMapProps) {
  const [visibleLayers, setVisibleLayers] = useState(defaultLayers);
  const [mapQuery, setMapQuery] = useState('');
  const [showOnlyConnections, setShowOnlyConnections] = useState(true);
  const graph = useMemo(() => buildLayeredMap(model, features), [features, model]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(selectedFeatureId ? `feature:${selectedFeatureId}` : null);
  const activeLayers = (Object.keys(layerLabels) as ProjectMapLayer[]).filter((layer) => visibleLayers[layer]);
  const layerVisibleNodes = graph.nodes.filter((node) => visibleLayers[node.layer]);
  const layerVisibleNodeIds = new Set(layerVisibleNodes.map((node) => node.id));
  const layerVisibleEdges = graph.edges.filter((edge) => layerVisibleNodeIds.has(edge.source) && layerVisibleNodeIds.has(edge.target));
  const focusedNode = layerVisibleNodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedNode = focusedNode ?? layerVisibleNodes.find((node) => node.layer === 'feature') ?? layerVisibleNodes[0];
  const selectedConnectionIds = useMemo(() => {
    return selectedNetworkIds(focusedNode, layerVisibleEdges);
  }, [focusedNode, layerVisibleEdges]);
  const selectedEdgeIds = useMemo(() => {
    const connected = new Set<string>();
    if (!focusedNode) return connected;
    for (const edge of layerVisibleEdges) {
      if (selectedConnectionIds.has(edge.source) && selectedConnectionIds.has(edge.target)) connected.add(edge.id);
    }
    return connected;
  }, [focusedNode, layerVisibleEdges, selectedConnectionIds]);
  const normalizedQuery = mapQuery.trim().toLowerCase();
  const searchMatchIds = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();
    return new Set(layerVisibleNodes.filter((node) => nodeSearchText(node).includes(normalizedQuery)).map((node) => node.id));
  }, [layerVisibleNodes, normalizedQuery]);
  const visibleNodes = showOnlyConnections && focusedNode
    ? layerVisibleNodes.filter((node) => selectedConnectionIds.has(node.id))
    : layerVisibleNodes;
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = layerVisibleEdges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

  const layerNodes = new Map<ProjectMapLayer, ProjectMapNode[]>();
  for (const layer of activeLayers) layerNodes.set(layer, visibleNodes.filter((node) => node.layer === layer));
  const layoutLayers = focusedNode && showOnlyConnections
    ? activeLayers.filter((layer) => (layerNodes.get(layer)?.length ?? 0) > 0)
    : activeLayers;

  const columnWidth = 220;
  const rowHeight = 86;
  const nodeWidth = 168;
  const nodeHeight = 58;
  const leftPadding = 34;
  const topPadding = 72;
  const graphWidth = Math.max(760, Math.max(1, layoutLayers.length) * columnWidth + 60);
  const maxLayerCount = Math.max(1, ...layoutLayers.map((layer) => layerNodes.get(layer)?.length ?? 0));
  const graphHeight = Math.max(520, topPadding + maxLayerCount * rowHeight + 56);
  const positions = new Map<string, { x: number; y: number }>();

  layoutLayers.forEach((layer, layerIndex) => {
    (layerNodes.get(layer) ?? []).forEach((node, nodeIndex) => {
      positions.set(node.id, {
        x: leftPadding + layerIndex * columnWidth,
        y: topPadding + nodeIndex * rowHeight,
      });
    });
  });

  const selectNode = (node: ProjectMapNode) => {
    setSelectedNodeId(node.id);
    setShowOnlyConnections(true);
    if (node.kind === 'feature') onSelectFeature?.(node.refId);
  };

  useEffect(() => {
    if (selectedFeatureId) {
      setSelectedNodeId(`feature:${selectedFeatureId}`);
      setShowOnlyConnections(true);
    }
  }, [selectedFeatureId]);

  return (
    <main className="analysis-map-layout" aria-label="Layered feature interaction map">
      <section className="analysis-map-shell">
        <header className="analysis-map-header">
          <div>
            <span className="analysis-kicker">Layered Map</span>
            <h2>Feature Interaction Map</h2>
            {focusedNode && (
              <p>
                Focused on {focusedNode.label}. {Math.max(0, selectedConnectionIds.size - 1)} related item{selectedConnectionIds.size === 2 ? '' : 's'} selected and regrouped.
              </p>
            )}
          </div>
          <div className="analysis-map-control-stack">
            <div className="analysis-map-tools">
              <label className="analysis-map-search">
                <Search size={14} />
                <input
                  aria-label="Find map item"
                  value={mapQuery}
                  onChange={(event) => setMapQuery(event.target.value)}
                  placeholder="Find map item"
                />
              </label>
              <label className="analysis-map-toggle">
                <input
                  type="checkbox"
                  checked={showOnlyConnections}
                  onChange={(event) => setShowOnlyConnections(event.target.checked)}
                />
                <span>Only selected network</span>
              </label>
              {focusedNode && (
                <button className="analysis-map-clear" type="button" onClick={() => setSelectedNodeId(null)}>
                  <X size={14} />
                  Clear focus
                </button>
              )}
            </div>
            <div className="analysis-map-layer-controls" aria-label="Map layers">
              {(Object.keys(layerLabels) as ProjectMapLayer[]).map((layer) => {
                const Icon = layerIcons[layer];
                return (
                  <label key={layer}>
                    <input
                      type="checkbox"
                      checked={visibleLayers[layer]}
                      onChange={(event) => setVisibleLayers({ ...visibleLayers, [layer]: event.target.checked })}
                    />
                    <Icon size={14} />
                    <span>{layerLabels[layer]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </header>

        <div className="analysis-map-canvas" style={{ minWidth: graphWidth, height: graphHeight }}>
          <svg className="analysis-map-svg" viewBox={`0 0 ${graphWidth} ${graphHeight}`} aria-hidden="true">
            <defs>
              <marker id="analysis-map-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" />
              </marker>
            </defs>
            {visibleEdges.map((edge) => {
              const source = positions.get(edge.source);
              const target = positions.get(edge.target);
              if (!source || !target) return null;
              const startX = source.x + nodeWidth;
              const startY = source.y + nodeHeight / 2;
              const endX = target.x;
              const endY = target.y + nodeHeight / 2;
              const midX = startX + Math.max(26, (endX - startX) / 2);
              const path = edge.source === edge.target
                ? ''
                : `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX - 8} ${endY}`;
              if (!path) return null;
              const isSelectedEdge = selectedEdgeIds.has(edge.id);
              const isDimmed = Boolean(focusedNode && !isSelectedEdge);
              return (
                <g key={edge.id}>
                  <path
                    className={`${edgeClass(edge.type)} ${isSelectedEdge ? 'focused' : ''} ${isDimmed ? 'dimmed' : ''}`}
                    d={path}
                    markerEnd="url(#analysis-map-arrow)"
                  />
                  {edge.type === 'depends' && (
                    <text
                      className={`analysis-map-edge-label ${isDimmed ? 'dimmed' : ''}`}
                      x={(startX + endX) / 2}
                      y={(startY + endY) / 2 - 7}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {layoutLayers.map((layer, layerIndex) => (
            <div
              className="analysis-map-layer-label"
              key={layer}
              style={{ left: leftPadding + layerIndex * columnWidth, top: 22, width: nodeWidth }}
            >
              {layerLabels[layer]}
            </div>
          ))}

          {visibleNodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            const Icon = nodeIcon(node.kind);
            const isConnected = selectedConnectionIds.has(node.id);
            const isFocusRoot = focusedNode?.id === node.id;
            const isSearchMatch = searchMatchIds.has(node.id);
            const isDimmed = Boolean((focusedNode && !isConnected) || (normalizedQuery && !isSearchMatch));
            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={isConnected}
                className={`analysis-map-node ${isConnected ? 'active connected' : ''} ${isFocusRoot ? 'focus-root' : ''} ${isSearchMatch ? 'search-match' : ''} ${isDimmed ? 'dimmed' : ''}`}
                style={{ left: position.x, top: position.y, width: nodeWidth, minHeight: nodeHeight, borderColor: node.tone }}
                onClick={() => selectNode(node)}
                title={node.path ?? node.label}
              >
                <span className="analysis-map-node-icon" style={{ color: node.tone }}>
                  <Icon size={15} />
                </span>
                <strong>{node.label}</strong>
                {node.subtitle && <span>{node.subtitle}</span>}
                {node.metric && <em>{node.metric}</em>}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="analysis-map-detail" aria-label="Selected map item">
        {selectedNode ? (
          <SelectedMapNodeDetails
            model={model}
            node={selectedNode}
            fileRecords={graph.files}
            qaItems={graph.qaItems}
            roadmapItems={graph.roadmapItems}
          />
        ) : (
          <div className="analysis-empty-state">
            <MapIcon size={22} />
            Select a node to inspect its linked features, files, QA items, and roadmap entries.
          </div>
        )}
      </aside>
    </main>
  );
}

function SelectedMapNodeDetails({
  model,
  node,
  fileRecords,
  qaItems,
  roadmapItems,
}: {
  model: ProjectAnalysisModel;
  node: ProjectMapNode;
  fileRecords: FileMapRecord[];
  qaItems: QAItem[];
  roadmapItems: RoadmapItem[];
}) {
  const featureById = new Map(model.features.map((feature) => [feature.id, feature]));
  const componentById = new Map(model.components.map((component) => [component.id, component]));
  const capabilityById = new Map(model.capabilities.map((capability) => [capability.id, capability]));
  const repoById = new Map(model.repositories.map((repo) => [repo.id, repo]));
  const feature = node.kind === 'feature' ? featureById.get(node.refId) : undefined;
  const file = node.kind === 'file' ? fileRecords.find((record) => record.path === node.refId) : undefined;
  const qaItem = node.kind === 'qa' ? qaItems.find((item) => item.id === node.refId) : undefined;
  const roadmapItem = node.kind === 'roadmap' ? roadmapItems.find((item) => item.id === node.refId) : undefined;
  const component = node.kind === 'component' ? componentById.get(node.refId) : undefined;
  const capability = node.kind === 'capability' ? capabilityById.get(node.refId) : undefined;

  return (
    <div>
      <span className="analysis-kicker">{layerLabels[node.layer]}</span>
      <h2>{node.label}</h2>
      {node.path && <code className="analysis-inline-code">{node.path}</code>}

      {feature && (
        <>
          <p>{feature.rationale}</p>
          <dl className="analysis-map-detail-grid">
            <div><dt>Disposition</dt><dd>{dispositionLabels[feature.disposition]}</dd></div>
            <div><dt>Release</dt><dd>{model.releases.find((release) => release.id === feature.releaseId)?.name ?? feature.releaseId}</dd></div>
            <div><dt>Value</dt><dd>{feature.value}</dd></div>
            <div><dt>Effort</dt><dd>{feature.effort}</dd></div>
          </dl>
          <DetailList title="Repositories" items={feature.repositoryIds.map((repoId) => repoById.get(repoId)?.name ?? repoId)} />
          <DetailList title="Files" items={featureFiles(feature).map((item) => item.path)} />
          <DetailList title="QA coverage" items={qaItems.filter((item) => item.featureIds.includes(feature.id)).map((item) => `${qaStatusLabels[item.status]} - ${item.title}`)} />
          <DetailList title="Roadmap links" items={roadmapItems.filter((item) => item.featureIds?.includes(feature.id)).map((item) => item.title)} />
        </>
      )}

      {file && (
        <>
          <p>File impact view: this path is linked to features, QA items, and roadmap work.</p>
          <dl className="analysis-map-detail-grid">
            <div><dt>Status</dt><dd>{fileStatusLabels[file.status]}</dd></div>
            <div><dt>Features</dt><dd>{file.featureIds.length}</dd></div>
            <div><dt>QA</dt><dd>{file.qaIds.length}</dd></div>
            <div><dt>Roadmap</dt><dd>{file.roadmapIds.length}</dd></div>
          </dl>
          <DetailList title="Features" items={file.featureIds.map((featureId) => featureById.get(featureId)?.name ?? featureId)} />
          <DetailList title="QA coverage" items={file.qaIds.map((qaId) => qaItems.find((item) => item.id === qaId)?.title ?? qaId)} />
          <DetailList title="Roadmap links" items={file.roadmapIds.map((roadmapId) => roadmapItems.find((item) => item.id === roadmapId)?.title ?? roadmapId)} />
        </>
      )}

      {qaItem && (
        <>
          <p>{qaItem.summary}</p>
          <dl className="analysis-map-detail-grid">
            <div><dt>Status</dt><dd>{qaStatusLabels[qaItem.status]}</dd></div>
            <div><dt>Priority</dt><dd>{qaItem.priority}</dd></div>
            <div><dt>Evidence</dt><dd>{evidenceCount(qaItem)}</dd></div>
            <div><dt>Type</dt><dd>{qaItem.type}</dd></div>
          </dl>
          <DetailList title="Features" items={qaItem.featureIds.map((featureId) => featureById.get(featureId)?.name ?? featureId)} />
          <DetailList title="Mapped files" items={qaItem.fileRefs ?? []} />
          <DetailList title="Evidence" items={(qaItem.attachments ?? []).map((attachment: QAAttachment) => attachment.label)} />
        </>
      )}

      {roadmapItem && (
        <>
          <p>{roadmapItem.summary}</p>
          <dl className="analysis-map-detail-grid">
            <div><dt>Status</dt><dd>{roadmapStatusLabel(roadmapItem.status)}</dd></div>
            <div><dt>Phase</dt><dd>{roadmapItem.phase || 'Unassigned'}</dd></div>
            <div><dt>Target</dt><dd>{roadmapItem.target || 'Unassigned'}</dd></div>
            <div><dt>Priority</dt><dd>{roadmapItem.priority || 'Unassigned'}</dd></div>
          </dl>
          <DetailList title="Features" items={(roadmapItem.featureIds ?? []).map((featureId) => featureById.get(featureId)?.name ?? featureId)} />
          <DetailList title="Mapped files" items={roadmapItem.fileRefs ?? []} />
          <DetailList title="Source" items={[roadmapItem.source, roadmapItem.sourceSection].filter(Boolean) as string[]} />
        </>
      )}

      {component && (
        <>
          <p>{component.description}</p>
          <dl className="analysis-map-detail-grid">
            <div><dt>Kind</dt><dd>{component.kind}</dd></div>
            <div><dt>Repository</dt><dd>{repoById.get(component.repositoryId)?.name ?? component.repositoryId}</dd></div>
          </dl>
          <DetailList title="Features" items={component.featureIds.map((featureId) => featureById.get(featureId)?.name ?? featureId)} />
        </>
      )}

      {capability && (
        <>
          <p>{capability.description}</p>
          <dl className="analysis-map-detail-grid">
            <div><dt>Business value</dt><dd>{capability.businessValue}</dd></div>
            <div><dt>Features</dt><dd>{model.features.filter((featureItem) => featureItem.capabilityId === capability.id).length}</dd></div>
          </dl>
          <DetailList title="Features" items={model.features.filter((featureItem) => featureItem.capabilityId === capability.id).map((featureItem) => featureItem.name)} />
        </>
      )}
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3>{title}</h3>
      <ul className="analysis-map-detail-list">
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </section>
  );
}
