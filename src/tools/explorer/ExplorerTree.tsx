import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CanonicalProfile } from 'fhir-runtime';
import type { SlicedElementInfo } from '../composer/slice-engine';
import { buildInstanceTree, type InstanceNode } from './instance-tree-builder';

// ── Props ────────────────────────────────────

interface ExplorerTreeProps {
  profile: CanonicalProfile | null;
  resource: Record<string, unknown> | null;
  slicingMap?: Map<string, SlicedElementInfo>;
  selectedPath: string | null;
  onSelect: (node: InstanceNode) => void;
}

// ── Value Preview ────────────────────────────

function formatPreview(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value.length > 40 ? value.slice(0, 40) + '…' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `{${keys.length}}`;
  }
  return null;
}

// ── Tree Node ────────────────────────────────

function TreeNode({
  node,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelect,
}: {
  node: InstanceNode;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (node: InstanceNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.instancePath);
  const isSelected = selectedPath === node.instancePath;
  const preview = !hasChildren ? formatPreview(node.value) : null;

  return (
    <div className="explorer-tree-node">
      <div
        className={`explorer-tree-node__row ${isSelected ? 'explorer-tree-node__row--selected' : ''} ${hasChildren ? 'explorer-tree-node__row--expandable' : ''}`}
        style={{ paddingLeft: node.depth * 16 + 8 }}
        onClick={() => {
          onSelect(node);
          if (hasChildren) onToggle(node.instancePath);
        }}
      >
        <span className="explorer-tree-node__arrow">
          {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
        </span>
        <span className={`explorer-tree-node__name ${node.isRequired ? 'explorer-tree-node__name--required' : ''}`}>
          {node.label}
        </span>
        {node.isRequired && <span className="explorer-tree-node__required-star">★</span>}

        {/* Badges */}
        {node.choiceType && (
          <span className="explorer-tree-node__badge explorer-tree-node__badge--choice">
            [x] {node.choiceType}
          </span>
        )}
        {node.sliceName && !node.isExtensionSlice && (
          <span className="explorer-tree-node__badge explorer-tree-node__badge--slice">
            🧩
          </span>
        )}
        {node.isExtensionSlice && (
          <span className="explorer-tree-node__badge explorer-tree-node__badge--ext">
            🔗 ext
          </span>
        )}
        {node.isBackbone && node.kind === 'element' && node.children.length > 0 && (
          <span className="explorer-tree-node__badge explorer-tree-node__badge--backbone">
            ⧉ {node.children.length}
          </span>
        )}
        {node.referenceTargets && node.referenceTargets.length > 0 && (
          <span className="explorer-tree-node__badge explorer-tree-node__badge--ref">
            → {node.referenceTargets.join(' | ')}
          </span>
        )}

        {/* Value preview */}
        {preview && (
          <span className="explorer-tree-node__preview" title={String(node.value)}>
            {preview}
          </span>
        )}

        {/* Cardinality */}
        {node.element && (
          <span className="explorer-tree-node__meta">
            <span className="explorer-tree-node__cardinality">
              {node.element.min}..{node.element.max === 'unbounded' ? '*' : node.element.max}
            </span>
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="explorer-tree-node__children">
          {node.children.map((child) => (
            <TreeNode
              key={child.instancePath}
              node={child}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Explorer Tree ────────────────────────────

export function ExplorerTree({ profile, resource, slicingMap, selectedPath, onSelect }: ExplorerTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    if (!profile || !resource) return [];
    return buildInstanceTree(resource, profile, slicingMap);
  }, [profile, resource, slicingMap]);

  // Auto-expand top-level nodes on first build
  useEffect(() => {
    if (tree.length > 0) {
      const initial = new Set<string>();
      for (const node of tree) {
        if (node.children.length > 0) initial.add(node.instancePath);
      }
      setExpandedPaths(initial);
    }
  }, [tree]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (!profile || !resource) {
    return (
      <div className="explorer-tree explorer-tree--empty">
        <div className="placeholder">
          <div className="placeholder__icon">◈</div>
          <div className="placeholder__title">Instance Tree</div>
          <div className="placeholder__desc">Load a resource to inspect its structure.</div>
        </div>
      </div>
    );
  }

  const resourceType = (resource.resourceType as string) ?? profile.type;
  const nodeCount = tree.reduce((acc, n) => acc + countNodes(n), 0);

  return (
    <div className="explorer-tree">
      <div className="explorer-tree__header">
        <span className="explorer-tree__title">{resourceType}</span>
        <span className="explorer-tree__count">{nodeCount} nodes</span>
      </div>
      <div className="explorer-tree__body">
        {tree.map((node) => (
          <TreeNode
            key={node.instancePath}
            node={node}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onToggle={handleToggle}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function countNodes(node: InstanceNode): number {
  return 1 + node.children.reduce((acc, c) => acc + countNodes(c), 0);
}
