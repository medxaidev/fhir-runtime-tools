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
import {
  isSlicedElement,
  isExtensionSlicing,
  getSlices,
  countSliceInstances,
  matchSlice,
} from './slice-engine';
import type { SlicedElementInfo, SliceDefinition } from './slice-engine';

interface ComposerTreeProps {
  profile: CanonicalProfile | null;
  resource: Record<string, unknown>;
  selectedPath: string | null;
  slicingMap?: Map<string, SlicedElementInfo>;
  onSelect: (element: CanonicalElement) => void;
  onSelectInstance?: (element: CanonicalElement, arrayIndex: number) => void;
  onAdd: (element: CanonicalElement) => void;
  onRemove: (elementPath: string) => void;
  onChoiceSwitch?: (element: CanonicalElement, typeCode: string) => void;
  onAddArrayItem?: (element: CanonicalElement) => void;
  onRemoveArrayItem?: (element: CanonicalElement, index: number) => void;
  onAddSliceItem?: (element: CanonicalElement, slice: SliceDefinition) => void;
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

// ── Slice Children ──────────────────────────
function SliceChildren({
  element,
  resource,
  depth,
  selectedPath,
  slicingMap,
  onSelectInstance,
  onAddSliceItem,
  onRemoveArrayItem,
}: {
  element: CanonicalElement;
  resource: Record<string, unknown>;
  depth: number;
  selectedPath: string | null;
  slicingMap: Map<string, SlicedElementInfo>;
  onSelectInstance?: (el: CanonicalElement, index: number) => void;
  onAddSliceItem?: (el: CanonicalElement, slice: SliceDefinition) => void;
  onRemoveArrayItem?: (el: CanonicalElement, index: number) => void;
}) {
  const jsonKey = getElementName(element.path);
  const slicedInfo = slicingMap.get(element.path);
  if (!slicedInfo) return null;

  const slices = getSlices(element.path, slicingMap);
  const instanceCounts = countSliceInstances(resource, slicedInfo);
  const arr = resource[jsonKey];
  const items = Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];

  return (
    <div className="composer-tree-node__children">
      {slices.map((slice) => {
        const count = instanceCounts.get(slice.sliceName) ?? 0;
        const isSliceRequired = slice.min > 0;
        return (
          <div key={slice.sliceName} className="composer-tree-node">
            <div
              className="composer-tree-node__row composer-tree-node__row--slice"
              style={{ paddingLeft: (depth + 1) * 16 + 8 }}
            >
              <span className="composer-tree-node__arrow" />
              <span className="composer-tree-node__slice-icon">{slice.extensionUrl ? '🔗' : '🧩'}</span>
              <span className={`composer-tree-node__name ${isSliceRequired ? 'composer-tree-node__name--required' : ''}`}>
                :{slice.sliceName}
              </span>
              {slice.extensionUrl && (
                <span className="composer-tree-node__ext-url" title={slice.extensionUrl}>
                  {slice.extensionUrl.split('/').pop()}
                </span>
              )}
              {isSliceRequired && <span className="composer-tree-node__star">★</span>}
              <span className="composer-tree-node__slice-count">{count > 0 ? `[${count}]` : ''}</span>
              <span className="composer-tree-node__meta">
                <span className="composer-tree-node__cardinality">
                  {slice.min}..{slice.max}
                </span>
              </span>
              <span className="composer-tree-node__actions">
                <button
                  className="composer-tree-node__btn composer-tree-node__btn--add"
                  onClick={(e) => { e.stopPropagation(); onAddSliceItem?.(element, slice); }}
                  title={`Add ${slice.sliceName}`}
                >+</button>
              </span>
            </div>
            {/* Show instances that match this slice */}
            {items.map((item, idx) => {
              // Simple check: see if this item's index maps to this slice
              const matched = slicedInfo
                ? matchSlice(item, slicedInfo) === slice.sliceName
                : false;
              if (!matched) return null;
              const instancePath = `${element.path}:${slice.sliceName}[${idx}]`;
              const isInstanceSelected = selectedPath === instancePath;
              const childCount = typeof item === 'object' && item !== null ? Object.keys(item).length : 0;
              return (
                <div key={`${slice.sliceName}-${idx}`} className="composer-tree-node">
                  <div
                    className={`composer-tree-node__row composer-tree-node__row--instance ${isInstanceSelected ? 'composer-tree-node__row--selected' : ''}`}
                    style={{ paddingLeft: (depth + 2) * 16 + 8 }}
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
          </div>
        );
      })}
      {/* Unmatched items (open slicing allows extra items) */}
      {slicedInfo.rules === 'open' && items.length > 0 && (() => {
        const unmatchedIndices: number[] = [];
        for (let i = 0; i < items.length; i++) {
          if (!matchSlice(items[i] as Record<string, unknown>, slicedInfo)) {
            unmatchedIndices.push(i);
          }
        }
        if (unmatchedIndices.length === 0) return null;
        return unmatchedIndices.map((idx) => {
          const instancePath = `${element.path}[${idx}]`;
          const isInstanceSelected = selectedPath === instancePath;
          const item = items[idx];
          const childCount = typeof item === 'object' && item !== null ? Object.keys(item).length : 0;
          return (
            <div key={`unmatched-${idx}`} className="composer-tree-node">
              <div
                className={`composer-tree-node__row composer-tree-node__row--instance ${isInstanceSelected ? 'composer-tree-node__row--selected' : ''}`}
                style={{ paddingLeft: (depth + 1) * 16 + 8 }}
                onClick={() => onSelectInstance?.(element, idx)}
              >
                <span className="composer-tree-node__arrow" />
                <span className="composer-tree-node__instance-icon">⧉</span>
                <span className="composer-tree-node__name">{jsonKey}[{idx}]</span>
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
        });
      })()}
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
  slicingMap,
  onToggle,
  onSelect,
  onSelectInstance,
  onAdd,
  onRemove,
  onChoiceSwitch,
  onAddArrayItem,
  onRemoveArrayItem,
  onAddSliceItem,
}: {
  node: ElementNode;
  profile: CanonicalProfile | null;
  resource: Record<string, unknown>;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  slicingMap?: Map<string, SlicedElementInfo>;
  onToggle: (path: string) => void;
  onSelect: (el: CanonicalElement) => void;
  onSelectInstance?: (el: CanonicalElement, index: number) => void;
  onAdd: (el: CanonicalElement) => void;
  onRemove: (path: string) => void;
  onChoiceSwitch?: (el: CanonicalElement, typeCode: string) => void;
  onAddArrayItem?: (el: CanonicalElement) => void;
  onRemoveArrayItem?: (el: CanonicalElement, index: number) => void;
  onAddSliceItem?: (el: CanonicalElement, slice: SliceDefinition) => void;
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
  const isSliced = slicingMap ? isSlicedElement(node.element.path, slicingMap) : false;
  const isExtSliced = isSliced ? isExtensionSlicing(node.element.path, slicingMap!) : false;
  const isPresent = hasValueInResource(resource, node.element);
  const preview = (isBackboneArray || isSliced) ? null : getPreviewValue(resource, node.element);
  const hasExpandable = hasChildren || isChoice || isBackboneArray || isSliced;

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
        {isBackboneArray && !isSliced && <span className="composer-tree-node__backbone-badge">⧉ {arrayCount}</span>}
        {isSliced && (
          <span className={isExtSliced ? 'composer-tree-node__ext-badge' : 'composer-tree-node__slice-badge'}>
            {isExtSliced ? '🔗 ext' : '🧩 sliced'}
          </span>
        )}
        {isPresent && preview && (
          <span className="composer-tree-node__preview">{preview}</span>
        )}
        <span className="composer-tree-node__meta">
          <span className="composer-tree-node__cardinality">
            {formatCardinality(node.element.min, node.element.max)}
          </span>
        </span>
        <span className="composer-tree-node__actions">
          {!isPresent && !isChoice && !isBackboneArray && !isSliced && (
            <button
              className="composer-tree-node__btn composer-tree-node__btn--add"
              onClick={(e) => { e.stopPropagation(); onAdd(node.element); }}
              title="Add element"
            >+</button>
          )}
          {isPresent && !isRequired && !isBackboneArray && !isSliced && (
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
      {isBackboneArray && !isSliced && isExpanded && (
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
      {isSliced && isExpanded && slicingMap && (
        <SliceChildren
          element={node.element}
          resource={resource}
          depth={node.depth}
          selectedPath={selectedPath}
          slicingMap={slicingMap}
          onSelectInstance={onSelectInstance}
          onAddSliceItem={onAddSliceItem}
          onRemoveArrayItem={onRemoveArrayItem}
        />
      )}
      {hasChildren && !isBackboneArray && !isSliced && isExpanded && (
        <div className="composer-tree-node__children">
          {node.children.map((child) => (
            <TreeNode
              key={child.element.path}
              node={child}
              profile={profile}
              resource={resource}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              slicingMap={slicingMap}
              onToggle={onToggle}
              onSelect={onSelect}
              onSelectInstance={onSelectInstance}
              onAdd={onAdd}
              onRemove={onRemove}
              onChoiceSwitch={onChoiceSwitch}
              onAddArrayItem={onAddArrayItem}
              onRemoveArrayItem={onRemoveArrayItem}
              onAddSliceItem={onAddSliceItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composer Tree ────────────────────────────
export function ComposerTree({ profile, resource, selectedPath, slicingMap, onSelect, onSelectInstance, onAdd, onRemove, onChoiceSwitch, onAddArrayItem, onRemoveArrayItem, onAddSliceItem }: ComposerTreeProps) {
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
            slicingMap={slicingMap}
            onToggle={handleToggle}
            onSelect={onSelect}
            onSelectInstance={onSelectInstance}
            onAdd={onAdd}
            onRemove={onRemove}
            onChoiceSwitch={onChoiceSwitch}
            onAddArrayItem={onAddArrayItem}
            onRemoveArrayItem={onRemoveArrayItem}
            onAddSliceItem={onAddSliceItem}
          />
        ))}
      </div>
    </div>
  );
}
