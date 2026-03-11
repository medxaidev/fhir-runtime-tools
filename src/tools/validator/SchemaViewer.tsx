import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';

// ── Types ────────────────────────────────────

export interface ElementNode {
  element: CanonicalElement;
  depth: number;
  children: ElementNode[];
  isBackbone: boolean;
}

interface SchemaViewerProps {
  profile: CanonicalProfile | null;
  resource?: Record<string, unknown> | null;
  onElementSelect?: (element: CanonicalElement) => void;
  selectedPath?: string | null;
  onInsertElement?: (element: CanonicalElement) => void;
  onAddElement?: (element: CanonicalElement) => void;
  onRemoveElement?: (elementPath: string) => void;
}

export interface ElementDetailProps {
  element: CanonicalElement | null;
  onInsertElement?: (element: CanonicalElement) => void;
}

// ── Helpers ──────────────────────────────────

export function buildElementTree(profile: CanonicalProfile): ElementNode[] {
  const elements = Array.from(profile.elements.values());
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

function getElementName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1];
}

/** Generate a default value snippet for a given element type */
export function generateElementDefault(element: CanonicalElement): unknown {
  if (element.types.length === 0) return {};
  const code = element.types[0].code;
  switch (code) {
    case 'string': case 'uri': case 'url': case 'canonical': case 'id': case 'code':
    case 'markdown': case 'oid': case 'uuid': case 'base64Binary': case 'xhtml':
      return '';
    case 'boolean': return false;
    case 'integer': case 'positiveInt': case 'unsignedInt': return 0;
    case 'decimal': return 0.0;
    case 'instant': case 'dateTime': case 'date': case 'time': return '';
    case 'CodeableConcept': return { text: '' };
    case 'Coding': return { system: '', code: '' };
    case 'Reference': return { reference: '' };
    case 'Identifier': return { system: '', value: '' };
    case 'HumanName': return { family: '', given: [''] };
    case 'Address': return { line: [''], city: '', state: '', postalCode: '' };
    case 'ContactPoint': return { system: 'phone', value: '' };
    case 'Quantity': return { value: 0, unit: '' };
    case 'Period': return { start: '', end: '' };
    case 'Attachment': return { contentType: '' };
    case 'Narrative': return { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml"></div>' };
    case 'Meta': return {};
    default: return {};
  }
}

// ── Element Detail Panel (exported) ──────────

export function ElementDetail({ element, onInsertElement }: ElementDetailProps) {
  if (!element) {
    return (
      <div className="element-detail element-detail--empty">
        <div className="placeholder" style={{ padding: '40px 16px' }}>
          <div className="placeholder__icon">&#x25C8;</div>
          <div className="placeholder__title">Element Details</div>
          <div className="placeholder__desc">Click an element in the schema tree to view its details.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="element-detail">
      <div className="element-detail__header">
        <span>Element Details</span>
        {onInsertElement && (
          <button
            className="btn btn--small btn--ghost"
            onClick={() => onInsertElement(element)}
            title="Insert this element into the JSON editor"
          >
            + Insert
          </button>
        )}
      </div>
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

// ── Data-aware helpers ──────────────────────

function hasValueInResource(resource: Record<string, unknown> | null | undefined, el: CanonicalElement): boolean {
  if (!resource) return false;
  const name = getElementName(el.path);
  // Choice type: check for any concrete key
  if (el.path.endsWith('[x]')) {
    const baseName = name.replace('[x]', '');
    return Object.keys(resource).some((k) => k.startsWith(baseName) && k !== baseName);
  }
  return resource[name] !== undefined;
}

function getPreviewValue(resource: Record<string, unknown> | null | undefined, el: CanonicalElement): string | null {
  if (!resource) return null;
  const name = getElementName(el.path);
  let val: unknown;
  if (el.path.endsWith('[x]')) {
    const baseName = name.replace('[x]', '');
    const key = Object.keys(resource).find((k) => k.startsWith(baseName) && k !== baseName);
    if (key) val = resource[key];
  } else {
    val = resource[name];
  }
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val.length > 30 ? val.slice(0, 30) + '…' : val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return `[${val.length}]`;
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>);
    return `{${keys.length}}`;
  }
  return null;
}

function isChoiceElement(el: CanonicalElement): boolean {
  return el.path.endsWith('[x]');
}

function isBackboneArray(el: CanonicalElement): boolean {
  const isBackbone = el.types.length === 0 || el.types.some(t => t.code === 'BackboneElement');
  const isArray = el.max === 'unbounded' || (typeof el.max === 'number' && el.max > 1);
  return isBackbone && isArray;
}

function TreeNode({
  node,
  selectedPath,
  expandedPaths,
  resource,
  onToggle,
  onSelect,
  onAddElement,
  onRemoveElement,
}: {
  node: ElementNode;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  resource?: Record<string, unknown> | null;
  onToggle: (path: string) => void;
  onSelect: (el: CanonicalElement) => void;
  onAddElement?: (el: CanonicalElement) => void;
  onRemoveElement?: (path: string) => void;
}) {
  const name = getElementName(node.element.path);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.element.path);
  const isSelected = selectedPath === node.element.path;
  const isRequired = node.element.min > 0;
  const isChoice = isChoiceElement(node.element);
  const isBbArray = isBackboneArray(node.element);
  const isPresent = resource ? hasValueInResource(resource, node.element) : false;
  const preview = resource && !isBbArray ? getPreviewValue(resource, node.element) : null;
  const arrayCount = isBbArray && resource ? (() => {
    const arr = resource[name];
    return Array.isArray(arr) ? arr.length : 0;
  })() : 0;

  return (
    <div className="schema-tree-node">
      <div
        className={`schema-tree-node__row ${isSelected ? 'schema-tree-node__row--selected' : ''} ${hasChildren ? 'schema-tree-node__row--expandable' : ''} ${resource && !isPresent ? 'schema-tree-node__row--absent' : ''}`}
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
        {isRequired && <span className="schema-tree-node__required-star">★</span>}
        {isChoice && <span className="schema-tree-node__badge schema-tree-node__badge--choice">[x]</span>}
        {isBbArray && <span className="schema-tree-node__badge schema-tree-node__badge--backbone">⧉ {arrayCount}</span>}
        {resource && isPresent && preview && (
          <span className="schema-tree-node__preview">{preview}</span>
        )}
        <span className="schema-tree-node__meta">
          <span className="schema-tree-node__cardinality">
            {formatCardinality(node.element.min, node.element.max)}
          </span>
        </span>
        {resource && (
          <span className="schema-tree-node__actions">
            {!isPresent && !isChoice && !isBbArray && onAddElement && (
              <button
                className="schema-tree-node__btn schema-tree-node__btn--add"
                onClick={(e) => { e.stopPropagation(); onAddElement(node.element); }}
                title="Add element"
              >+</button>
            )}
            {isPresent && !isRequired && onRemoveElement && (
              <button
                className="schema-tree-node__btn schema-tree-node__btn--remove"
                onClick={(e) => { e.stopPropagation(); onRemoveElement(node.element.path); }}
                title="Remove element"
              >×</button>
            )}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="schema-tree-node__children">
          {node.children.map((child) => (
            <TreeNode
              key={child.element.path}
              node={child}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              resource={resource}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddElement={onAddElement}
              onRemoveElement={onRemoveElement}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Schema Viewer ────────────────────────────

export function SchemaViewer({ profile, resource, onElementSelect, selectedPath, onAddElement, onRemoveElement }: SchemaViewerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [internalSelectedPath, setInternalSelectedPath] = useState<string | null>(null);

  const activePath = selectedPath ?? internalSelectedPath;

  const tree = useMemo(() => {
    if (!profile) return [];
    return buildElementTree(profile);
  }, [profile]);

  // Reset expanded paths when profile changes
  useEffect(() => {
    setExpandedPaths(new Set());
    setInternalSelectedPath(null);
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
    setInternalSelectedPath(el.path);
    onElementSelect?.(el);
  }, [onElementSelect]);

  if (!profile) {
    return (
      <div className="schema-viewer schema-viewer--empty">
        <div className="placeholder">
          <div className="placeholder__icon">&#x25C8;</div>
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
              resource={resource}
              onToggle={handleToggle}
              onSelect={handleSelect}
              onAddElement={onAddElement}
              onRemoveElement={onRemoveElement}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
