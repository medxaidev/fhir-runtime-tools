import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotification } from '@prismui/react';
import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';
import { getResourceTypeNames, getProfile, getUSCoreProfileNames, getUSCoreProfile } from '../../runtime/profiles';
import { PackageSelector } from '../validator/PackageSelector';
import { validateResource } from '../../runtime/adapter';
import type { AdapterValidationResult } from '../../runtime/adapter';
import { getExamplesForType } from '../../data/example-library';
import { generateElementDefault } from '../validator/SchemaViewer';
import { ComposerTree } from './ComposerTree';
import { DynamicForm } from './DynamicForm';
import { ComposerJsonEditor } from './ComposerJsonEditor';
import { Breadcrumb } from './Breadcrumb';
import {
  isChoiceType,
  switchChoiceType,
  resolveChoiceType,
  resolveChoiceFromJsonKey,
} from './choice-type-engine';
import {
  isBackboneElement,
  isArrayElement,
  addArrayItem,
  removeArrayItem,
  getDeepValue,
  setDeepValue,
} from './instance-tree-engine';
import type { JsonPathSegment } from './instance-tree-engine';
import { getSlicingMap, generateSliceSkeleton } from './slice-engine';
import type { SlicedElementInfo } from './slice-engine';
import type { editor } from 'monaco-editor';

// ── Path utilities ───────────────────────────
function elementPathToJsonPath(elementPath: string): string[] {
  // "Observation.valueQuantity.value" → ["valueQuantity", "value"]
  const parts = elementPath.split('.');
  return parts.slice(1); // drop resource type prefix
}

function getValueAtPath(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setValueAtPath(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj));
  let current: Record<string, unknown> = clone;
  for (let i = 0; i < path.length - 1; i++) {
    if (!(path[i] in current) || typeof current[path[i]] !== 'object' || current[path[i]] === null) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
  return clone;
}

function deleteValueAtPath(obj: Record<string, unknown>, path: string[]): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj));
  let current: Record<string, unknown> = clone;
  for (let i = 0; i < path.length - 1; i++) {
    if (!(path[i] in current) || typeof current[path[i]] !== 'object') return clone;
    current = current[path[i]] as Record<string, unknown>;
  }
  delete current[path[path.length - 1]];
  return clone;
}

// ── Skeleton Generator ──────────────────────
function generateSkeleton(profile: CanonicalProfile): Record<string, unknown> {
  const obj: Record<string, unknown> = { resourceType: profile.type };
  const elements = Array.from(profile.elements.values());
  for (const el of elements) {
    const parts = el.path.split('.');
    if (parts.length !== 2) continue;
    if (el.min <= 0) continue;
    const key = parts[1];
    const defaultVal = generateElementDefault(el);
    if (el.max === 'unbounded' || (typeof el.max === 'number' && el.max > 1)) {
      obj[key] = [defaultVal];
    } else {
      obj[key] = defaultVal;
    }
  }
  return obj;
}

// ── Find JSON key line for sync ─────────────
function findJsonKeyLine(json: string, key: string): number | null {
  const lines = json.split('\n');
  const regex = new RegExp(`^\\s*"${key}"\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i + 1;
  }
  return null;
}

export function ComposerWorkspace() {
  const { show } = useNotification();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // ── State ──────────────────────────────────
  const [currentPackage, setCurrentPackage] = useState('fhir-r4');
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [resource, setResource] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<CanonicalElement | null>(null);
  const [selectedInstanceIndex, setSelectedInstanceIndex] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<AdapterValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slicingMap, setSlicingMap] = useState<Map<string, SlicedElementInfo>>(new Map());

  // Prevent sync loops
  const updatingFromJson = useRef(false);
  const updatingFromForm = useRef(false);

  // ── Load resource types when package changes ─
  useEffect(() => {
    setLoading(true);
    setSelectedType(null);
    setProfile(null);
    setSelectedElement(null);
    setSelectedPath(null);
    setValidationResult(null);
    setResource({});
    setJsonText('');
    const loadFn = currentPackage === 'us-core' ? getUSCoreProfileNames : getResourceTypeNames;
    loadFn().then((types) => {
      setResourceTypes(types);
      setLoading(false);
    });
  }, [currentPackage]);

  // ── Load profile when type changes ────────
  useEffect(() => {
    if (!selectedType) {
      setProfile(null);
      setSlicingMap(new Map());
      return;
    }
    const loadProfileFn = currentPackage === 'us-core' ? getUSCoreProfile : getProfile;
    loadProfileFn(selectedType).then((p) => {
      if (p) {
        setProfile(p);
        const skeleton = generateSkeleton(p);
        updateResourceObject(skeleton);
        setSlicingMap(getSlicingMap(p));
      } else {
        setProfile(null);
        setSlicingMap(new Map());
      }
    });
    setSelectedPath(null);
    setSelectedElement(null);
    setValidationResult(null);
  }, [selectedType, currentPackage]);

  // ── Core: update resource object → sync all views ─
  const updateResourceObject = useCallback((obj: Record<string, unknown>) => {
    setResource(obj);
    if (!updatingFromJson.current) {
      const text = JSON.stringify(obj, null, 2);
      setJsonText(text);
    }
  }, []);

  // ── JSON text changed (from Monaco) ───────
  const handleJsonChange = useCallback((text: string) => {
    setJsonText(text);
    try {
      updatingFromJson.current = true;
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        setResource(parsed);
        // Auto-detect resource type
        if (parsed.resourceType && parsed.resourceType !== selectedType) {
          setSelectedType(parsed.resourceType);
        }
      }
    } catch {
      // Invalid JSON, only update text, not resource object
    } finally {
      updatingFromJson.current = false;
    }
  }, [selectedType]);

  // ── Form field changed ────────────────────
  const handleFormChange = useCallback((elementPath: string, value: unknown) => {
    const jsonPath = elementPathToJsonPath(elementPath);
    updatingFromForm.current = true;
    const updated = setValueAtPath(resource, jsonPath, value);
    updateResourceObject(updated);
    updatingFromForm.current = false;
  }, [resource, updateResourceObject]);

  // ── Element tree click → select + sync ────
  const handleTreeSelect = useCallback((element: CanonicalElement) => {
    setSelectedElement(element);
    setSelectedPath(element.path);
    // Scroll Monaco to matching key
    if (editorRef.current) {
      const parts = element.path.split('.');
      const key = parts[parts.length - 1];
      const line = findJsonKeyLine(editorRef.current.getValue(), key);
      if (line !== null) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
      }
    }
  }, []);

  // ── Add element to resource ───────────────
  const handleAddElement = useCallback((element: CanonicalElement) => {
    const jsonPath = elementPathToJsonPath(element.path);
    const key = jsonPath[jsonPath.length - 1];
    if (key in resource) {
      show({ type: 'warning', message: `"${key}" already exists.` });
      return;
    }
    const defaultVal = generateElementDefault(element);
    const isArray = element.max === 'unbounded' || (typeof element.max === 'number' && element.max > 1);
    const updated = setValueAtPath(resource, jsonPath, isArray ? [defaultVal] : defaultVal);
    updateResourceObject(updated);
    setSelectedElement(element);
    setSelectedPath(element.path);
    show({ type: 'success', message: `Added "${key}".` });
  }, [resource, updateResourceObject, show]);

  // ── Remove element from resource ──────────
  const handleRemoveElement = useCallback((elementPath: string) => {
    // For choice types, the elementPath contains [x], so we need to find and remove the active variant
    const el = profile?.elements.get(elementPath);
    if (el && isChoiceType(el)) {
      const info = resolveChoiceType(el, resource);
      if (info.activeJsonKey) {
        const updated = deleteValueAtPath(resource, [info.activeJsonKey]);
        updateResourceObject(updated);
        show({ type: 'info', message: `Removed "${info.activeJsonKey}".` });
      }
      return;
    }
    const jsonPath = elementPathToJsonPath(elementPath);
    const key = jsonPath[jsonPath.length - 1];
    const updated = deleteValueAtPath(resource, jsonPath);
    updateResourceObject(updated);
    show({ type: 'info', message: `Removed "${key}".` });
  }, [resource, profile, updateResourceObject, show]);

  // ── Choice type switch ────────────────────
  const handleChoiceSwitch = useCallback((element: CanonicalElement, typeCode: string) => {
    const updated = switchChoiceType(resource, element, typeCode);
    updateResourceObject(updated);
    setSelectedElement(element);
    setSelectedPath(element.path);
    show({ type: 'success', message: `Switched to ${typeCode}.` });
  }, [resource, updateResourceObject, show]);

  // ── Backbone array: select instance ────────
  const handleSelectInstance = useCallback((element: CanonicalElement, index: number) => {
    setSelectedElement(element);
    const instancePath = `${element.path}[${index}]`;
    setSelectedPath(instancePath);
    setSelectedInstanceIndex(index);
    // Scroll Monaco to the array key
    if (editorRef.current) {
      const name = element.path.split('.').pop() ?? '';
      const line = findJsonKeyLine(editorRef.current.getValue(), name);
      if (line !== null) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
      }
    }
  }, []);

  // ── Backbone array: add item ──────────────
  const handleAddArrayItem = useCallback((element: CanonicalElement) => {
    const jsonKey = element.path.split('.').pop() ?? '';
    const updated = addArrayItem(resource, jsonKey);
    updateResourceObject(updated);
    show({ type: 'success', message: `Added new ${jsonKey} item.` });
  }, [resource, updateResourceObject, show]);

  // ── Backbone array: remove item ───────────
  const handleRemoveArrayItem = useCallback((element: CanonicalElement, index: number) => {
    const jsonKey = element.path.split('.').pop() ?? '';
    const updated = removeArrayItem(resource, jsonKey, index);
    updateResourceObject(updated);
    // If we were viewing this instance, clear selection
    if (selectedPath === `${element.path}[${index}]`) {
      setSelectedPath(element.path);
      setSelectedInstanceIndex(null);
    }
    show({ type: 'info', message: `Removed ${jsonKey}[${index}].` });
  }, [resource, selectedPath, updateResourceObject, show]);

  // ── Slice: add item with discriminator values ─
  const handleAddSliceItem = useCallback((element: CanonicalElement, slice: import('./slice-engine').SliceDefinition) => {
    const jsonKey = element.path.split('.').pop() ?? '';
    const skeleton = generateSliceSkeleton(slice);
    const clone = JSON.parse(JSON.stringify(resource));
    if (!Array.isArray(clone[jsonKey])) {
      clone[jsonKey] = [];
    }
    (clone[jsonKey] as unknown[]).push(skeleton);
    updateResourceObject(clone);
    show({ type: 'success', message: `Added ${jsonKey}:${slice.sliceName}.` });
  }, [resource, updateResourceObject, show]);

  // ── Backbone instance form change ─────────
  const handleInstanceFormChange = useCallback((elementPath: string, value: unknown) => {
    // elementPath is like "Patient.contact" and selectedInstanceIndex is the array index
    // The sub-field path comes as "Patient.contact.name" with the value being the whole sub-object
    if (selectedElement && selectedInstanceIndex !== null) {
      const parentKey = selectedElement.path.split('.').pop() ?? '';
      // Determine the sub-field key from elementPath relative to backbone parent
      const subKey = elementPath.split('.').slice(selectedElement.path.split('.').length).join('.');
      if (subKey) {
        // Setting a specific sub-field within the instance
        const jsonPath: JsonPathSegment[] = [parentKey, selectedInstanceIndex, ...subKey.split('.')];
        updatingFromForm.current = true;
        const updated = setDeepValue(resource, jsonPath, value);
        updateResourceObject(updated);
        updatingFromForm.current = false;
      } else {
        // Replacing the whole instance object
        const jsonPath: JsonPathSegment[] = [parentKey, selectedInstanceIndex];
        updatingFromForm.current = true;
        const updated = setDeepValue(resource, jsonPath, value);
        updateResourceObject(updated);
        updatingFromForm.current = false;
      }
    } else {
      // Fall back to normal form change
      handleFormChange(elementPath, value);
    }
  }, [selectedElement, selectedInstanceIndex, resource, updateResourceObject, handleFormChange]);

  // ── Monaco cursor → sync tree ─────────────
  const handleCursorKey = useCallback((key: string) => {
    if (!profile) return;
    // First try direct element match
    const fullPath = `${profile.type}.${key}`;
    const el = profile.elements.get(fullPath);
    if (el) {
      setSelectedElement(el);
      setSelectedPath(el.path);
      return;
    }
    // Try choice type resolution: "valueQuantity" → Observation.value[x]
    const choiceResult = resolveChoiceFromJsonKey(key, profile.elements);
    if (choiceResult) {
      setSelectedElement(choiceResult.element);
      setSelectedPath(choiceResult.element.path);
    }
  }, [profile]);

  // ── Resource type selector ────────────────
  const handleTypeChange = useCallback((type: string) => {
    setSelectedType(type);
  }, []);

  // ── Load example template ─────────────────
  const handleLoadExample = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const exId = e.target.value;
    if (!exId) return;
    const examples = selectedType ? getExamplesForType(selectedType) : [];
    const ex = examples.find((x) => x.id === exId);
    if (ex) {
      try {
        const parsed = JSON.parse(ex.json);
        updateResourceObject(parsed);
        setValidationResult(null);
      } catch { /* skip */ }
    }
  }, [selectedType, updateResourceObject]);

  // ── Validate ──────────────────────────────
  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      const res = await validateResource(jsonText);
      setValidationResult(res);
      if (res.valid) {
        show({ type: 'success', message: 'Resource is valid!' });
      } else {
        const errCount = res.issues.filter((i) => i.severity === 'error').length;
        show({ type: 'error', message: `${errCount} validation error(s).` });
      }
    } catch {
      show({ type: 'error', message: 'Validation failed.' });
    } finally {
      setValidating(false);
    }
  }, [jsonText, show]);

  // ── Format JSON ───────────────────────────
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setResource(parsed);
    } catch {
      show({ type: 'error', message: 'Cannot format: invalid JSON.' });
    }
  }, [jsonText, show]);

  // ── Reset ─────────────────────────────────
  const handleReset = useCallback(() => {
    if (profile) {
      const skeleton = generateSkeleton(profile);
      updateResourceObject(skeleton);
      setValidationResult(null);
      setSelectedPath(null);
      setSelectedElement(null);
      show({ type: 'info', message: 'Reset to skeleton.' });
    }
  }, [profile, updateResourceObject, show]);

  // ── Examples for selected type ────────────
  const examples = useMemo(() => {
    return selectedType ? getExamplesForType(selectedType) : [];
  }, [selectedType]);

  // ── Current value at selected path ────────
  const selectedValue = useMemo(() => {
    if (!selectedPath || !selectedElement) return undefined;
    // For backbone array instances: "Patient.contact[0]" → resource.contact[0]
    if (selectedInstanceIndex !== null && isBackboneElement(selectedElement) && isArrayElement(selectedElement)) {
      const jsonKey = selectedElement.path.split('.').pop() ?? '';
      return getDeepValue(resource, [jsonKey, selectedInstanceIndex]);
    }
    // For choice types, resolve the active concrete key
    if (isChoiceType(selectedElement)) {
      const info = resolveChoiceType(selectedElement, resource);
      if (info.activeJsonKey) {
        return (resource as Record<string, unknown>)[info.activeJsonKey];
      }
      return undefined;
    }
    const jsonPath = elementPathToJsonPath(selectedPath);
    return getValueAtPath(resource, jsonPath);
  }, [resource, selectedPath, selectedElement, selectedInstanceIndex]);

  // ── Validation issue count bar ────────────
  const errorCount = validationResult?.issues.filter((i) => i.severity === 'error').length ?? 0;
  const warnCount = validationResult?.issues.filter((i) => i.severity === 'warning').length ?? 0;

  // ── Render ─────────────────────────────────
  return (
    <div className="composer-workspace">
      {/* Header */}
      <div className="composer-workspace__header">
        <div className="composer-workspace__title-row">
          <h2 className="composer-workspace__title">Resource Composer</h2>
          <p className="composer-workspace__desc">Create and edit FHIR resources with live bidirectional sync.</p>
        </div>
        <div className="composer-workspace__controls">
          <PackageSelector currentPackage={currentPackage} onPackageChange={setCurrentPackage} />
          <label className="composer-control">
            <span className="composer-control__label">Resource Type</span>
            <select
              className="composer-control__select"
              value={selectedType ?? ''}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={loading}
            >
              <option value="">Select type...</option>
              {resourceTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {examples.length > 0 && (
            <label className="composer-control">
              <span className="composer-control__label">Example Template</span>
              <select className="composer-control__select" onChange={handleLoadExample} defaultValue="">
                <option value="">Load example...</option>
                {examples.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.title}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {selectedPath && (
        <div className="composer-workspace__breadcrumb">
          <Breadcrumb path={selectedPath} />
        </div>
      )}

      {/* Main 3-column body */}
      <div className="composer-workspace__body">
        {/* Column 1: Element Tree */}
        <div className="composer-workspace__tree">
          <ComposerTree
            profile={profile}
            resource={resource}
            selectedPath={selectedPath}
            slicingMap={slicingMap}
            onSelect={handleTreeSelect}
            onSelectInstance={handleSelectInstance}
            onAdd={handleAddElement}
            onRemove={handleRemoveElement}
            onChoiceSwitch={handleChoiceSwitch}
            onAddArrayItem={handleAddArrayItem}
            onRemoveArrayItem={handleRemoveArrayItem}
            onAddSliceItem={handleAddSliceItem}
          />
        </div>

        {/* Column 2: Dynamic Form */}
        <div className="composer-workspace__form">
          <DynamicForm
            element={selectedElement}
            profile={profile}
            value={selectedValue}
            resource={resource}
            instanceIndex={selectedInstanceIndex}
            slicingMap={slicingMap}
            onChange={selectedInstanceIndex !== null ? handleInstanceFormChange : handleFormChange}
            onChoiceSwitch={handleChoiceSwitch}
          />
        </div>

        {/* Column 3: JSON Editor + Issues Panel */}
        <div className="composer-workspace__editor-col">
          <div className="composer-workspace__editor">
            <ComposerJsonEditor
              value={jsonText}
              onChange={handleJsonChange}
              editorRef={editorRef}
              onCursorKey={handleCursorKey}
            />
          </div>
          {validationResult && !validationResult.valid && (
            <div className="composer-issues">
              <div className="composer-issues__header">
                <span className="composer-issues__title">
                  Problems ({errorCount + warnCount})
                </span>
              </div>
              <div className="composer-issues__body">
                {validationResult.issues.map((issue, idx) => (
                  <div key={idx} className={`composer-issues__item composer-issues__item--${issue.severity}`}>
                    <span className={`composer-issues__severity composer-issues__severity--${issue.severity}`}>
                      {issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <span className="composer-issues__message">{issue.message}</span>
                    {issue.path && (
                      <span className="composer-issues__path">{issue.path}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer toolbar */}
      <div className="composer-workspace__footer">
        <div className="composer-workspace__footer-actions">
          <button className="btn btn--small btn--primary" onClick={handleValidate} disabled={validating}>
            {validating ? 'Validating...' : 'Validate'}
          </button>
          <button className="btn btn--small" onClick={handleFormat}>Format JSON</button>
          <button className="btn btn--small btn--danger" onClick={handleReset}>Reset</button>
        </div>
        {validationResult && (
          <div className={`composer-workspace__validation-bar ${validationResult.valid ? 'composer-workspace__validation-bar--valid' : 'composer-workspace__validation-bar--invalid'}`}>
            {validationResult.valid ? (
              <span>✓ Valid</span>
            ) : (
              <span>✗ {errorCount} error(s), {warnCount} warning(s)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
