import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotification } from '@prismui/react';
import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';
import { getResourceTypeNames, getProfile, getUSCoreProfileNames, getUSCoreProfile } from '../../runtime/profiles';
import { validateResource } from '../../runtime/adapter';
import type { AdapterValidationResult } from '../../runtime/adapter';
import type { ExampleEntry } from '../../data/example-library';
import { getExamplesForType } from '../../data/example-library';
import { PackageSelector } from './PackageSelector';
import { ResourceList } from './ResourceList';
import { SchemaViewer, ElementDetail, generateElementDefault } from './SchemaViewer';
import { ValidationResult } from './ValidationResult';
import { ExampleLoader } from './ExampleLoader';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// ── Skeleton Generator ──────────────────────
function generateSkeleton(profile: CanonicalProfile): string {
  const obj: Record<string, unknown> = { resourceType: profile.type };
  const elements = Array.from(profile.elements.values());
  // Only include top-level required elements
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
  return JSON.stringify(obj, null, 2);
}

// ── JSON key finder (for JSON↔Tree sync) ────
function findJsonKeyLine(json: string, elementPath: string): number | null {
  const parts = elementPath.split('.');
  const key = parts[parts.length - 1];
  const lines = json.split('\n');
  const regex = new RegExp(`^\\s*"${key}"\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i + 1;
  }
  return null;
}

// ── Resource Stats ──────────────────────────
interface ResourceStats {
  elementsUsed: number;
  totalElements: number;
  missingRequired: number;
  errors: number;
  warnings: number;
}

function computeResourceStats(
  json: string,
  profile: CanonicalProfile | null,
  result: AdapterValidationResult | null,
): ResourceStats | null {
  if (!profile) return null;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const keys = Object.keys(parsed);
    const elements = Array.from(profile.elements.values());
    const topLevel = elements.filter((el) => el.path.split('.').length === 2);
    const requiredTop = topLevel.filter((el) => el.min > 0);
    const usedElements = topLevel.filter((el) => {
      const key = el.path.split('.')[1];
      return keys.includes(key);
    });
    const missingRequired = requiredTop.filter((el) => {
      const key = el.path.split('.')[1];
      return !keys.includes(key);
    });
    return {
      elementsUsed: usedElements.length,
      totalElements: topLevel.length,
      missingRequired: missingRequired.length,
      errors: result?.issues.filter((i) => i.severity === 'error').length ?? 0,
      warnings: result?.issues.filter((i) => i.severity === 'warning').length ?? 0,
    };
  } catch {
    return null;
  }
}

export function ValidatorWorkspace() {
  const { show } = useNotification();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // ── State ──────────────────────────────────
  const [currentPackage, setCurrentPackage] = useState('fhir-r4');
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [selectedElement, setSelectedElement] = useState<CanonicalElement | null>(null);
  const [selectedElementPath, setSelectedElementPath] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [validationResult, setValidationResult] = useState<AdapterValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);

  // ── Load resource types when package changes ─
  useEffect(() => {
    setProfilesLoading(true);
    setSelectedType(null);
    setProfile(null);
    setSelectedElement(null);
    setSelectedElementPath(null);
    setValidationResult(null);
    const loadFn = currentPackage === 'us-core' ? getUSCoreProfileNames : getResourceTypeNames;
    loadFn().then((types) => {
      setResourceTypes(types);
      setProfilesLoading(false);
    });
  }, [currentPackage]);

  // ── Load profile when resource type changes ─
  useEffect(() => {
    if (!selectedType) {
      setProfile(null);
      return;
    }
    const loadFn = currentPackage === 'us-core' ? getUSCoreProfile : getProfile;
    loadFn(selectedType).then((p) => {
      setProfile(p ?? null);
      setSelectedElementPath(null);
      setSelectedElement(null);
    });
  }, [selectedType, currentPackage]);

  // ── Auto-detect resource type from JSON ────
  const detectResourceType = useCallback((json: string): string | null => {
    try {
      const parsed = JSON.parse(json);
      return parsed?.resourceType ?? null;
    } catch {
      return null;
    }
  }, []);

  // ── Check mismatch ────────────────────────
  const checkMismatch = useCallback((json: string, selected: string | null) => {
    if (!json.trim() || !selected) {
      setMismatchWarning(null);
      return;
    }
    const detected = detectResourceType(json);
    if (detected && detected !== selected) {
      setMismatchWarning(`JSON contains "${detected}" but schema shows "${selected}".`);
    } else {
      setMismatchWarning(null);
    }
  }, [detectResourceType]);

  // ── Parsed resource for data-aware tree ───
  const parsedResource = useMemo<Record<string, unknown> | null>(() => {
    if (!input.trim()) return null;
    try {
      const obj = JSON.parse(input);
      return typeof obj === 'object' && obj !== null ? obj : null;
    } catch {
      return null;
    }
  }, [input]);

  // ── Resource stats ────────────────────────
  const stats = useMemo(
    () => computeResourceStats(input, profile, validationResult),
    [input, profile, validationResult],
  );

  // ── Handlers ───────────────────────────────
  const handleResourceSelect = useCallback((type: string) => {
    setSelectedType(type);
    setValidationResult(null);
    const examples = getExamplesForType(type);
    const firstValid = examples.find((e) => e.category === 'valid');
    if (firstValid) {
      setInput(firstValid.json);
      setMismatchWarning(null);
    } else {
      checkMismatch(input, type);
    }
  }, [input, checkMismatch]);

  const handleElementSelect = useCallback((el: CanonicalElement) => {
    setSelectedElement(el);
    setSelectedElementPath(el.path);
    // JSON ↔ Tree sync: scroll editor to the element's key
    if (editorRef.current) {
      const line = findJsonKeyLine(editorRef.current.getValue(), el.path);
      if (line !== null) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
      }
    }
  }, []);

  const handleValidate = useCallback(async () => {
    if (!input.trim()) {
      show({ type: 'warning', message: 'Please enter a FHIR resource JSON.' });
      return;
    }

    setLoading(true);
    setValidationResult(null);

    try {
      const detectedType = detectResourceType(input);
      if (detectedType && detectedType !== selectedType) {
        setSelectedType(detectedType);
        setMismatchWarning(null);
      }

      const res = await validateResource(input);
      setValidationResult(res);

      if (res.valid) {
        show({ type: 'success', message: 'Resource passed structural validation.' });
      } else {
        const errorCount = res.issues.filter((i) => i.severity === 'error').length;
        show({ type: 'error', message: `Validation failed: ${errorCount} error(s) found.` });
      }
    } catch {
      show({ type: 'error', message: 'Unexpected error during validation.' });
    } finally {
      setLoading(false);
    }
  }, [input, selectedType, detectResourceType, show]);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
    } catch {
      show({ type: 'error', message: 'Cannot format: invalid JSON.' });
    }
  }, [input, show]);

  const handleClear = useCallback(() => {
    setInput('');
    setValidationResult(null);
    setMismatchWarning(null);
  }, []);

  const handleGenerateSkeleton = useCallback(() => {
    if (!profile) {
      show({ type: 'warning', message: 'Select a resource type first.' });
      return;
    }
    const skeleton = generateSkeleton(profile);
    setInput(skeleton);
    setValidationResult(null);
    setMismatchWarning(null);
    show({ type: 'success', message: `Generated ${profile.type} skeleton with required elements.` });
  }, [profile, show]);

  const handleLoadExample = useCallback((example: ExampleEntry) => {
    setInput(example.json);
    setValidationResult(null);
    setMismatchWarning(null);
    if (example.resourceType !== selectedType) {
      setSelectedType(example.resourceType);
    }
    if (example.category === 'error') {
      show({ type: 'warning', message: `Loaded error example: ${example.title}. This example contains intentional validation errors.` });
    }
  }, [selectedType, show]);

  // ── Add element from tree ─────────────────
  const handleAddElement = useCallback((el: CanonicalElement) => {
    try {
      const parsed = JSON.parse(input);
      const key = el.path.split('.').pop()!;
      if (key in parsed) return;
      const defaultVal = generateElementDefault(el);
      if (el.max === 'unbounded' || (typeof el.max === 'number' && el.max > 1)) {
        parsed[key] = [defaultVal];
      } else {
        parsed[key] = defaultVal;
      }
      setInput(JSON.stringify(parsed, null, 2));
    } catch { /* skip */ }
  }, [input]);

  // ── Remove element from tree ──────────────
  const handleRemoveElement = useCallback((elementPath: string) => {
    try {
      const parsed = JSON.parse(input);
      const key = elementPath.split('.').pop()!;
      delete parsed[key];
      setInput(JSON.stringify(parsed, null, 2));
    } catch { /* skip */ }
  }, [input]);

  const handleInsertElement = useCallback((el: CanonicalElement) => {
    try {
      const parsed = JSON.parse(input);
      const key = el.path.split('.').pop()!;
      if (key in parsed) {
        show({ type: 'warning', message: `"${key}" already exists in the JSON.` });
        return;
      }
      const defaultVal = generateElementDefault(el);
      if (el.max === 'unbounded' || (typeof el.max === 'number' && el.max > 1)) {
        parsed[key] = [defaultVal];
      } else {
        parsed[key] = defaultVal;
      }
      const newJson = JSON.stringify(parsed, null, 2);
      setInput(newJson);
      show({ type: 'success', message: `Inserted "${key}" into the JSON.` });
      // Scroll to inserted key
      setTimeout(() => {
        if (editorRef.current) {
          const line = findJsonKeyLine(newJson, el.path);
          if (line !== null) {
            editorRef.current.revealLineInCenter(line);
            editorRef.current.setPosition({ lineNumber: line, column: 1 });
          }
        }
      }, 50);
    } catch {
      show({ type: 'error', message: 'Cannot insert: JSON is not valid.' });
    }
  }, [input, show]);

  const handleIssuePath = useCallback((path: string) => {
    setSelectedElementPath(path);
    // Also try to find the element in the profile
    if (profile) {
      const el = profile.elements.get(path);
      if (el) setSelectedElement(el);
    }
    // Scroll editor to path
    if (editorRef.current) {
      const line = findJsonKeyLine(editorRef.current.getValue(), path);
      if (line !== null) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
      }
    }
  }, [profile]);

  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    checkMismatch(val, selectedType);
  }, [selectedType, checkMismatch]);

  // ── Render ─────────────────────────────────
  return (
    <div className="validator-workspace">
      <div className="validator-workspace__header">
        <div className="validator-workspace__title-row">
          <h2 className="validator-workspace__title">Resource Validator</h2>
          <p className="validator-workspace__desc">
            Validate FHIR R4 resources against base StructureDefinition profiles.
          </p>
        </div>
        <PackageSelector currentPackage={currentPackage} onPackageChange={setCurrentPackage} />
      </div>

      <div className="validator-workspace__body">
        {/* Layer 1: FHIR Schema Explorer — 3 columns */}
        <div className="validator-workspace__layer validator-workspace__layer--schema">
          <div className="validator-workspace__resource-list">
            <ResourceList
              resourceTypes={resourceTypes}
              selectedType={selectedType}
              onSelect={handleResourceSelect}
              loading={profilesLoading}
            />
          </div>
          <div className="validator-workspace__schema">
            <SchemaViewer
              profile={profile}
              resource={parsedResource}
              onElementSelect={handleElementSelect}
              selectedPath={selectedElementPath}
              onAddElement={handleAddElement}
              onRemoveElement={handleRemoveElement}
            />
          </div>
          <div className="validator-workspace__detail">
            <ElementDetail
              element={selectedElement}
              onInsertElement={handleInsertElement}
            />
          </div>
        </div>

        {/* Layer 2: Validation Workspace */}
        <div className="validator-workspace__layer validator-workspace__layer--validation">
          <div className="validator-workspace__editor">
            <div className="json-editor">
              <div className="json-editor__header">
                <span className="json-editor__title">Resource JSON Editor</span>
                <div className="json-editor__actions">
                  <ExampleLoader
                    selectedResourceType={selectedType}
                    onLoad={handleLoadExample}
                  />
                  <button className="btn btn--small btn--ghost" onClick={handleGenerateSkeleton} title="Generate minimal valid resource skeleton">
                    Skeleton
                  </button>
                  <button className="btn btn--small" onClick={handleFormat}>Format</button>
                  <button className="btn btn--small btn--danger" onClick={handleClear}>Clear</button>
                  <button className="btn btn--small btn--primary" onClick={handleValidate} disabled={loading}>
                    {loading ? 'Validating...' : 'Validate'}
                  </button>
                </div>
              </div>
              {mismatchWarning && (
                <div className="json-editor__mismatch">{mismatchWarning}</div>
              )}
              <div className="json-editor__body">
                <JsonEditorInner
                  value={input}
                  onChange={handleInputChange}
                  editorRef={editorRef}
                  onCursorKey={(key) => {
                    // JSON → Tree sync: highlight element when cursor lands on a JSON key
                    if (profile) {
                      const fullPath = `${profile.type}.${key}`;
                      const el = profile.elements.get(fullPath);
                      if (el) {
                        setSelectedElement(el);
                        setSelectedElementPath(el.path);
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="validator-workspace__result">
            <ValidationResult
              result={validationResult}
              loading={loading}
              onIssuePath={handleIssuePath}
              stats={stats}
              profile={profile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline Monaco wrapper ────────────────────
function JsonEditorInner({
  value,
  onChange,
  editorRef,
  onCursorKey,
}: {
  value: string;
  onChange: (val: string) => void;
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
  onCursorKey?: (key: string) => void;
}) {
  const handleMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
    // Listen for cursor position changes to sync JSON → Tree
    ed.onDidChangeCursorPosition((e) => {
      if (!onCursorKey) return;
      const model = ed.getModel();
      if (!model) return;
      const line = model.getLineContent(e.position.lineNumber);
      const match = line.match(/^\s*"([^"]+)"\s*:/);
      if (match) {
        onCursorKey(match[1]);
      }
    });
  }, [editorRef, onCursorKey]);

  const handleChange = useCallback((val: string | undefined) => {
    onChange(val ?? '');
  }, [onChange]);

  return (
    <Editor
      height="100%"
      language="json"
      theme="vs-light"
      value={value}
      onChange={handleChange}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        folding: true,
        renderLineHighlight: 'line',
        overviewRulerBorder: false,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
}
