import { useState, useMemo, useCallback } from 'react';
import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';

// ── Types ────────────────────────────────────

interface ElementNode {
  element: CanonicalElement;
  depth: number;
  children: ElementNode[];
  isBackbone: boolean;
}

interface SchemaViewerProps {
  profile: CanonicalProfile | null;
  onElementSelect?: (element: CanonicalElement) => void;
  selectedPath?: string | null;
}

// ── Helpers ──────────────────────────────────

function buildElementTree(profile: CanonicalProfile): ElementNode[] {
  const elements = Array.from(profile.elements.values());
  // Skip the root element (e.g., "Patient")
  const children = elements.filter((el) => {
    const parts = el.path.split('.');
    return parts.length === 2;
  });

  return children.map((el) => buildNode(el, elements, 0));
}

function buildNode(element: CanonicalElement, allElements: CanonicalElement[], depth: number): ElementNode {
  const prefix = element.path + '.';
  const directChildren = allElements.filter((el) => {
    if (!el.path.startsWith(prefix)) return false;
    const rest = el.path.slice(prefix.length);
    return !rest.includes('.');
  });

  const isBackbone = element.types.length === 0 || element.types.some((t) => t.code === 'BackboneElement');

  return {
    element,
    depth,
    isBackbone,
    children: directChildren.map((child) => buildNode(child, allElements, depth + 1)),
  };
}

function formatCardinality(min: number, max: number | 'unbounded'): string {
  return `${min}..${max === 'unbounded' ? '*' : max}`;
}

function formatTypes(el: CanonicalElement): string {
  if (el.types.length === 0) return 'BackboneElement';
  return el.types.map((t) => t.code).join(' | ');
}

function getElementName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1];
}

// ── Element Detail Panel ─────────────────────

function ElementDetail({ element }: { element: CanonicalElement }) {
  return (
    <div className="element-detail">
      <div className="element-detail__header">Element Details</div>
      <div className="element-detail__rows">
        <div className="element-detail__row">
          <span className="element-detail__label">Path</span>
          <span className="element-detail__value element-detail__value--mono">{element.path}</span>
        </div>
        <div className="element-detail__row">
          <span className="element-detail__label">Type</span>
          <span className="element-detail__value">
            {element.types.length > 0
              ? element.types.map((t, i) => (
                <span key={i} className="element-detail__type-badge">{t.code}</span>
              ))
              : <span className="element-detail__type-badge element-detail__type-badge--backbone">BackboneElement</span>
            }
          </span>
        </div>
        <div className="element-detail__row">
          <span className="element-detail__label">Cardinality</span>
          <span className="element-detail__value">
            <span className={`element-detail__cardinality ${element.min > 0 ? 'element-detail__cardinality--required' : ''}`}>
              {formatCardinality(element.min, element.max)}
            </span>
            {element.min > 0 && <span className="element-detail__required-badge">Required</span>}
          </span>
        </div>
        {element.binding && (
          <div className="element-detail__row">
            <span className="element-detail__label">Binding</span>
            <span className="element-detail__value">
              <span className={`element-detail__binding-badge element-detail__binding-badge--${element.binding.strength}`}>
                {element.binding.strength}
              </span>
              {element.binding.valueSetUrl && (
                <span className="element-detail__binding-vs">{element.binding.valueSetUrl}</span>
              )}
            </span>
          </div>
        )}
        {element.constraints.length > 0 && (
          <div className="element-detail__row element-detail__row--block">
            <span className="element-detail__label">Constraints</span>
            <div className="element-detail__constraints">
              {element.constraints.map((c) => (
                <div key={c.key} className="element-detail__constraint">
                  <span className={`element-detail__constraint-key element-detail__constraint-key--${c.severity}`}>
                    {c.key}
                  </span>
                  <span className="element-detail__constraint-text">{c.human}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tree Node ────────────────────────────────

function TreeNode({
  node,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelect,
}: {
  node: ElementNode;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (el: CanonicalElement) => void;
}) {
  const name = getElementName(node.element.path);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.element.path);
  const isSelected = selectedPath === node.element.path;
  const isRequired = node.element.min > 0;

  return (
    <div className="schema-tree-node">
      <div
        className={`schema-tree-node__row ${isSelected ? 'schema-tree-node__row--selected' : ''} ${hasChildren ? 'schema-tree-node__row--expandable' : ''}`}
        style={{ paddingLeft: node.depth * 16 + 8 }}
        onClick={() => {
          onSelect(node.element);
          if (hasChildren) onToggle(node.element.path);
        }}
      >
        <span className="schema-tree-node__arrow">
          {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
        </span>
        <span className={`schema-tree-node__name ${isRequired ? 'schema-tree-node__name--required' : ''}`}>
          {name}
        </span>
        <span className="schema-tree-node__meta">
          <span className="schema-tree-node__cardinality">
            {formatCardinality(node.element.min, node.element.max)}
          </span>
          <span className="schema-tree-node__type">
            {formatTypes(node.element)}
          </span>
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div className="schema-tree-node__children">
          {node.children.map((child) => (
            <TreeNode
              key={child.element.path}
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

// ── Schema Viewer ────────────────────────────

export function SchemaViewer({ profile, onElementSelect, selectedPath }: SchemaViewerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedElement, setSelectedElement] = useState<CanonicalElement | null>(null);
  const [internalSelectedPath, setInternalSelectedPath] = useState<string | null>(null);

  const activePath = selectedPath ?? internalSelectedPath;

  const tree = useMemo(() => {
    if (!profile) return [];
    return buildElementTree(profile);
  }, [profile]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((el: CanonicalElement) => {
    setSelectedElement(el);
    setInternalSelectedPath(el.path);
    onElementSelect?.(el);
  }, [onElementSelect]);

  if (!profile) {
    return (
      <div className="schema-viewer schema-viewer--empty">
        <div className="placeholder">
          <div className="placeholder__icon">◈</div>
          <div className="placeholder__title">Select a Resource</div>
          <div className="placeholder__desc">Choose a resource type from the list to view its schema.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="schema-viewer">
      <div className="schema-viewer__tree-panel">
        <div className="schema-viewer__tree-header">
          <span className="schema-viewer__tree-title">{profile.type}</span>
          <span className="schema-viewer__tree-count">{profile.elements.size} elements</span>
        </div>
        <div className="schema-viewer__tree-body">
          {tree.map((node) => (
            <TreeNode
              key={node.element.path}
              node={node}
              selectedPath={activePath}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
      {selectedElement && (
        <div className="schema-viewer__detail-panel">
          <ElementDetail element={selectedElement} />
        </div>
      )}
    </div>
  );
}
