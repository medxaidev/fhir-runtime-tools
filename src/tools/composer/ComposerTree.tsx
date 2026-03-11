import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';
import { buildElementTree } from '../validator/SchemaViewer';
import type { ElementNode } from '../validator/SchemaViewer';
import {
  isChoiceType,
  getChoiceBaseName,
  buildChoiceJsonKey,
  resolveChoiceType,
} from './choice-type-engine';
import {
  isBackboneElement,
  isArrayElement,
  getArrayLength,
} from './instance-tree-engine';

interface ComposerTreeProps {
  profile: CanonicalProfile | null;
  resource: Record<string, unknown>;
  selectedPath: string | null;
  onSelect: (element: CanonicalElement) => void;
  onSelectInstance?: (element: CanonicalElement, arrayIndex: number) => void;
  onAdd: (element: CanonicalElement) => void;
  onRemove: (elementPath: string) => void;
  onChoiceSwitch?: (element: CanonicalElement, typeCode: string) => void;
  onAddArrayItem?: (element: CanonicalElement) => void;
  onRemoveArrayItem?: (element: CanonicalElement, index: number) => void;
}

function getElementName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1];
}

function formatCardinality(min: number, max: number | 'unbounded'): string {
  return `${min}..${max === 'unbounded' ? '*' : max}`;
}

function hasValueInResource(resource: Record<string, unknown>, element: CanonicalElement): boolean {
  const parts = element.path.split('.');
  const key = parts[1];
  if (!key) return false;
  if (isChoiceType(element)) {
    const baseName = getChoiceBaseName(element.path);
    return element.types.some((t) => buildChoiceJsonKey(baseName, t.code) in resource);
  }
  return key in resource;
}

function getPreviewValue(resource: Record<string, unknown>, element: CanonicalElement): string | null {
  const parts = element.path.split('.');
  let key = parts[1];
  if (!key) return null;
  if (isChoiceType(element)) {
    const info = resolveChoiceType(element, resource);
    if (!info.activeJsonKey) return null;
    key = info.activeJsonKey;
  }
  if (!(key in resource)) return null;

  const val = resource[key];
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') return val.length > 30 ? val.slice(0, 30) + '…' : val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return `[${val.length}]`;
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length <= 2) return `{${keys.join(', ')}}`;
    return `{${keys.length} keys}`;
  }
  return null;
}

// ── Choice Type Children ─────────────────────
function ChoiceTypeChildren({
  element,
  resource,
  depth,
  onChoiceSwitch,
}: {
  element: CanonicalElement;
  resource: Record<string, unknown>;
  depth: number;
  onChoiceSwitch?: (el: CanonicalElement, typeCode: string) => void;
}) {
  const info = resolveChoiceType(element, resource);
  return (
    <div className="composer-tree-node__children">
      {info.availableTypes.map((typeCode) => {
        const jsonKey = buildChoiceJsonKey(info.baseName, typeCode);
        const isActive = info.activeType === typeCode;
        return (
          <div
            key={typeCode}
            className={`composer-tree-node__row composer-tree-node__row--choice-variant ${isActive ? 'composer-tree-node__row--choice-active' : 'composer-tree-node__row--choice-inactive'}`}
            style={{ paddingLeft: (depth + 1) * 16 + 8 }}
            onClick={() => onChoiceSwitch?.(element, typeCode)}
          >
            <span className="composer-tree-node__arrow" />
            <span className="composer-tree-node__choice-icon">{isActive ? '●' : '○'}</span>
            <span className={`composer-tree-node__name ${isActive ? '' : 'composer-tree-node__name--dimmed'}`}>
              {jsonKey}
            </span>
            <span className="composer-tree-node__meta">
              <span className="composer-tree-node__type-badge">{typeCode}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Backbone Instance Children ───────────────
function BackboneInstanceChildren({
  element,
  profile: _profile,
  resource,
  depth,
  selectedPath,
  onSelectInstance,
  onAddArrayItem,
  onRemoveArrayItem,
}: {
  element: CanonicalElement;
  profile: CanonicalProfile | null;
  resource: Record<string, unknown>;
  depth: number;
  selectedPath: string | null;
  onSelectInstance?: (el: CanonicalElement, index: number) => void;
  onAddArrayItem?: (el: CanonicalElement) => void;
  onRemoveArrayItem?: (el: CanonicalElement, index: number) => void;
}) {
  const jsonKey = getElementName(element.path);
  const count = getArrayLength(resource, jsonKey);
  // children available via getBackboneChildren(element.path, profile.elements) if needed

  return (
    <div className="composer-tree-node__children">
      {Array.from({ length: count }, (_, idx) => {
        const instancePath = `${element.path}[${idx}]`;
        const isInstanceSelected = selectedPath === instancePath;
        const instanceVal = Array.isArray(resource[jsonKey]) ? (resource[jsonKey] as unknown[])[idx] : undefined;
        const childCount = instanceVal && typeof instanceVal === 'object' ? Object.keys(instanceVal as object).length : 0;
        return (
          <div key={idx} className="composer-tree-node">
            <div
              className={`composer-tree-node__row composer-tree-node__row--instance ${isInstanceSelected ? 'composer-tree-node__row--selected' : ''}`}
              style={{ paddingLeft: (depth + 1) * 16 + 8 }}
              onClick={() => onSelectInstance?.(element, idx)}
            >
              <span className="composer-tree-node__arrow" />
              <span className="composer-tree-node__instance-icon">⧉</span>
              <span className="composer-tree-node__name">
                {jsonKey}[{idx}]
              </span>
              <span className="composer-tree-node__preview">{`{${childCount} fields}`}</span>
              <span className="composer-tree-node__actions">
                <button
                  className="composer-tree-node__btn composer-tree-node__btn--remove"
                  onClick={(e) => { e.stopPropagation(); onRemoveArrayItem?.(element, idx); }}
                  title={`Remove ${jsonKey}[${idx}]`}
                >×</button>
              </span>
            </div>
          </div>
        );
      })}
      <div
        className="composer-tree-node__row composer-tree-node__row--add-instance"
        style={{ paddingLeft: (depth + 1) * 16 + 8 }}
        onClick={() => onAddArrayItem?.(element)}
      >
        <span className="composer-tree-node__arrow" />
        <span className="composer-tree-node__add-text">+ Add {jsonKey}</span>
      </div>
    </div>
  );
}

// ── Tree Node ────────────────────────────────
function TreeNode({
  node,
  profile,
  resource,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelect,
  onSelectInstance,
  onAdd,
  onRemove,
  onChoiceSwitch,
  onAddArrayItem,
  onRemoveArrayItem,
}: {
  node: ElementNode;
  profile: CanonicalProfile | null;
  resource: Record<string, unknown>;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (el: CanonicalElement) => void;
  onSelectInstance?: (el: CanonicalElement, index: number) => void;
  onAdd: (el: CanonicalElement) => void;
  onRemove: (path: string) => void;
  onChoiceSwitch?: (el: CanonicalElement, typeCode: string) => void;
  onAddArrayItem?: (el: CanonicalElement) => void;
  onRemoveArrayItem?: (el: CanonicalElement, index: number) => void;
}) {
  const name = getElementName(node.element.path);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.element.path);
  const isSelected = selectedPath === node.element.path;
  const isRequired = node.element.min > 0;
  const isChoice = isChoiceType(node.element);
  const isBackbone = isBackboneElement(node.element);
  const isArray = isArrayElement(node.element);
  const isBackboneArray = isBackbone && isArray;
  const isPresent = hasValueInResource(resource, node.element);
  const preview = isBackboneArray ? null : getPreviewValue(resource, node.element);
  const hasExpandable = hasChildren || isChoice || isBackboneArray;

  // For backbone arrays, show instance count as preview
  const arrayCount = isBackboneArray ? getArrayLength(resource, name) : 0;

  return (
    <div className="composer-tree-node">
      <div
        className={`composer-tree-node__row ${isSelected ? 'composer-tree-node__row--selected' : ''} ${isPresent ? 'composer-tree-node__row--present' : 'composer-tree-node__row--absent'} ${isChoice ? 'composer-tree-node__row--choice' : ''} ${isBackbone ? 'composer-tree-node__row--backbone' : ''}`}
        style={{ paddingLeft: node.depth * 16 + 8 }}
        onClick={() => {
          onSelect(node.element);
          if (hasExpandable) onToggle(node.element.path);
        }}
      >
        <span className="composer-tree-node__arrow">
          {hasExpandable ? (isExpanded ? '▾' : '▸') : ''}
        </span>
        <span className={`composer-tree-node__name ${isRequired ? 'composer-tree-node__name--required' : ''}`}>
          {name}
        </span>
        {isRequired && <span className="composer-tree-node__star">★</span>}
        {isChoice && <span className="composer-tree-node__choice-badge">[x]</span>}
        {isBackboneArray && <span className="composer-tree-node__backbone-badge">⧉ {arrayCount}</span>}
        {isPresent && preview && (
          <span className="composer-tree-node__preview">{preview}</span>
        )}
        <span className="composer-tree-node__meta">
          <span className="composer-tree-node__cardinality">
            {formatCardinality(node.element.min, node.element.max)}
          </span>
        </span>
        <span className="composer-tree-node__actions">
          {!isPresent && !isChoice && !isBackboneArray && (
            <button
              className="composer-tree-node__btn composer-tree-node__btn--add"
              onClick={(e) => { e.stopPropagation(); onAdd(node.element); }}
              title="Add element"
            >+</button>
          )}
          {isPresent && !isRequired && !isBackboneArray && (
            <button
              className="composer-tree-node__btn composer-tree-node__btn--remove"
              onClick={(e) => { e.stopPropagation(); onRemove(node.element.path); }}
              title="Remove element"
            >×</button>
          )}
        </span>
      </div>
      {isChoice && isExpanded && (
        <ChoiceTypeChildren
          element={node.element}
          resource={resource}
          depth={node.depth}
          onChoiceSwitch={onChoiceSwitch}
        />
      )}
      {isBackboneArray && isExpanded && (
        <BackboneInstanceChildren
          element={node.element}
          profile={profile}
          resource={resource}
          depth={node.depth}
          selectedPath={selectedPath}
          onSelectInstance={onSelectInstance}
          onAddArrayItem={onAddArrayItem}
          onRemoveArrayItem={onRemoveArrayItem}
        />
      )}
      {hasChildren && !isBackboneArray && isExpanded && (
        <div className="composer-tree-node__children">
          {node.children.map((child) => (
            <TreeNode
              key={child.element.path}
              node={child}
              profile={profile}
              resource={resource}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
              onSelectInstance={onSelectInstance}
              onAdd={onAdd}
              onRemove={onRemove}
              onChoiceSwitch={onChoiceSwitch}
              onAddArrayItem={onAddArrayItem}
              onRemoveArrayItem={onRemoveArrayItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composer Tree ────────────────────────────
export function ComposerTree({ profile, resource, selectedPath, onSelect, onSelectInstance, onAdd, onRemove, onChoiceSwitch, onAddArrayItem, onRemoveArrayItem }: ComposerTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    if (!profile) return [];
    return buildElementTree(profile);
  }, [profile]);

  // Reset expanded paths when profile changes
  useEffect(() => {
    setExpandedPaths(new Set());
  }, [profile]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (!profile) {
    return (
      <div className="composer-tree composer-tree--empty">
        <div className="placeholder">
          <div className="placeholder__icon">◈</div>
          <div className="placeholder__title">Element Tree</div>
          <div className="placeholder__desc">Select a resource type to view its structure.</div>
        </div>
      </div>
    );
  }

  // Count present vs total
  const topElements = tree.length;
  const presentCount = tree.filter((n) => hasValueInResource(resource, n.element)).length;

  return (
    <div className="composer-tree">
      <div className="composer-tree__header">
        <span className="composer-tree__title">{profile.type}</span>
        <span className="composer-tree__count">{presentCount}/{topElements} elements</span>
      </div>
      <div className="composer-tree__body">
        {tree.map((node) => (
          <TreeNode
            key={node.element.path}
            node={node}
            profile={profile}
            resource={resource}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onToggle={handleToggle}
            onSelect={onSelect}
            onSelectInstance={onSelectInstance}
            onAdd={onAdd}
            onRemove={onRemove}
            onChoiceSwitch={onChoiceSwitch}
            onAddArrayItem={onAddArrayItem}
            onRemoveArrayItem={onRemoveArrayItem}
          />
        ))}
      </div>
    </div>
  );
}
