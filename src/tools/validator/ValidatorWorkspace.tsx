import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '@prismui/react';
import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';
import { getResourceTypeNames, getProfile } from '../../runtime/profiles';
import { validateResource } from '../../runtime/adapter';
import type { AdapterValidationResult } from '../../runtime/adapter';
import type { ExampleEntry } from '../../data/example-library';
import { getExamplesForType } from '../../data/example-library';
import { PackageSelector } from './PackageSelector';
import { ResourceList } from './ResourceList';
import { SchemaViewer } from './SchemaViewer';
import { ValidationResult } from './ValidationResult';
import { ExampleLoader } from './ExampleLoader';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export function ValidatorWorkspace() {
  const { show } = useNotification();

  // ── State ──────────────────────────────────
  const [currentPackage, setCurrentPackage] = useState('fhir-r4');
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [selectedElementPath, setSelectedElementPath] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [validationResult, setValidationResult] = useState<AdapterValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);

  // ── Load resource types on mount ───────────
  useEffect(() => {
    setProfilesLoading(true);
    getResourceTypeNames().then((types) => {
      setResourceTypes(types);
      setProfilesLoading(false);
    });
  }, []);

  // ── Load profile when resource type changes ─
  useEffect(() => {
    if (!selectedType) {
      setProfile(null);
      return;
    }
    getProfile(selectedType).then((p) => {
      setProfile(p ?? null);
      setSelectedElementPath(null);
    });
  }, [selectedType]);

  // ── Auto-detect resource type from JSON ────
  const detectResourceType = useCallback((json: string): string | null => {
    try {
      const parsed = JSON.parse(json);
      return parsed?.resourceType ?? null;
    } catch {
      return null;
    }
  }, []);

  // ── Check mismatch between JSON resourceType and selected resource ─
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

  // ── Handlers ───────────────────────────────
  const handleResourceSelect = useCallback((type: string) => {
    setSelectedType(type);
    setValidationResult(null);
    // Auto-load first example for the resource type
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
    setSelectedElementPath(el.path);
  }, []);

  const handleValidate = useCallback(async () => {
    if (!input.trim()) {
      show({ type: 'warning', message: 'Please enter a FHIR resource JSON.' });
      return;
    }

    setLoading(true);
    setValidationResult(null);

    try {
      // Auto-select resource type from JSON if not already selected
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

  const handleLoadExample = useCallback((example: ExampleEntry) => {
    setInput(example.json);
    setValidationResult(null);
    setMismatchWarning(null);
    // Auto-select resource type
    if (example.resourceType !== selectedType) {
      setSelectedType(example.resourceType);
    }
    if (example.category === 'error') {
      show({ type: 'warning', message: `Loaded error example: ${example.title}. This example contains intentional validation errors.` });
    }
  }, [selectedType, show]);

  const handleIssuePath = useCallback((path: string) => {
    setSelectedElementPath(path);
  }, []);

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
        {/* Layer 1: FHIR Schema Explorer */}
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
              onElementSelect={handleElementSelect}
              selectedPath={selectedElementPath}
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
                <JsonEditorInner value={input} onChange={handleInputChange} />
              </div>
            </div>
          </div>
          <div className="validator-workspace__result">
            <ValidationResult
              result={validationResult}
              loading={loading}
              onIssuePath={handleIssuePath}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline Monaco wrapper ────────────────────
function JsonEditorInner({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
  }, []);

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
