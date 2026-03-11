import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotification } from '@prismui/react';
import type { CanonicalProfile } from 'fhir-runtime';
import {
  getResourceTypeNames, getProfile, getRawStructureDefinition,
  getUSCoreProfileNames, getUSCoreProfile, getRawUSCoreSD,
} from '../../runtime/profiles';
import { validateResource } from '../../runtime/adapter';
import type { AdapterValidationResult } from '../../runtime/adapter';
import { getExamplesForType } from '../../data/example-library';
import { extractSlicing } from '../composer/slice-engine';
import type { SlicedElementInfo } from '../composer/slice-engine';
import { PackageSelector } from '../validator/PackageSelector';
import { ExplorerTree } from './ExplorerTree';
import { ExplorerInspector } from './ExplorerInspector';
import type { InstanceNode } from './instance-tree-builder';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// ── JSON key finder (for tree→JSON sync) ─────
function findJsonKeyLine(json: string, key: string): number | null {
  const lines = json.split('\n');
  const regex = new RegExp(`^\\s*"${key}"\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i + 1;
  }
  return null;
}

export function ExplorerWorkspace() {
  const { show } = useNotification();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // ── State ──────────────────────────────────
  const [currentPackage, setCurrentPackage] = useState('fhir-r4');
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [slicingMap, setSlicingMap] = useState<Map<string, SlicedElementInfo>>(new Map());
  const [jsonText, setJsonText] = useState('');
  const [resource, setResource] = useState<Record<string, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<InstanceNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<AdapterValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load resource types when package changes ─
  useEffect(() => {
    setLoading(true);
    setProfile(null);
    setSlicingMap(new Map());
    setSelectedNode(null);
    setSelectedPath(null);
    setValidationResult(null);
    const loadFn = currentPackage === 'us-core' ? getUSCoreProfileNames : getResourceTypeNames;
    loadFn().then((types) => {
      setResourceTypes(types);
      setLoading(false);
      // Re-detect type from existing resource (preserves JSON on package switch)
      if (resource && typeof resource.resourceType === 'string') {
        setSelectedType(resource.resourceType);
      } else {
        setSelectedType(null);
      }
    });
  }, [currentPackage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load profile when type changes ──────────
  useEffect(() => {
    if (!selectedType) {
      setProfile(null);
      setSlicingMap(new Map());
      return;
    }
    const loadProfileFn = currentPackage === 'us-core' ? getUSCoreProfile : getProfile;
    const loadRawFn = currentPackage === 'us-core' ? getRawUSCoreSD : getRawStructureDefinition;
    Promise.all([loadProfileFn(selectedType), loadRawFn(selectedType)]).then(([p, rawSD]) => {
      if (p) setProfile(p);
      else setProfile(null);
      if (rawSD) setSlicingMap(extractSlicing(rawSD));
      else setSlicingMap(new Map());
    });
  }, [selectedType, currentPackage]);

  // ── Parse JSON ──────────────────────────────
  const handleJsonChange = useCallback((val: string | undefined) => {
    const text = val ?? '';
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        setResource(parsed);
        // Auto-detect resourceType
        const rt = parsed.resourceType;
        if (rt) {
          setSelectedType((prev) => prev === rt ? prev : rt);
        }
        // Auto-detect meta.profile → switch package
        const profiles = parsed.meta?.profile as string[] | undefined;
        if (Array.isArray(profiles) && profiles.length > 0) {
          const hasUSCore = profiles.some((url: string) =>
            typeof url === 'string' && url.includes('hl7.org/fhir/us/core')
          );
          if (hasUSCore) {
            setCurrentPackage((prev) => prev === 'us-core' ? prev : 'us-core');
          }
        }
      } else {
        setResource(null);
      }
    } catch {
      // Don't clear resource on parse error during editing
    }
  }, []);

  // ── Load example ────────────────────────────
  const examples = useMemo(() => {
    return selectedType ? getExamplesForType(selectedType) : [];
  }, [selectedType]);

  const handleLoadExample = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const exId = e.target.value;
    if (!exId) return;
    const ex = examples.find((x) => x.id === exId);
    if (ex) {
      setJsonText(ex.json);
      try {
        const parsed = JSON.parse(ex.json);
        setResource(parsed);
        setValidationResult(null);
        const rt = parsed.resourceType;
        if (rt) {
          setSelectedType((prev) => prev === rt ? prev : rt);
        }
      } catch { /* skip */ }
    }
  }, [examples]);

  // ── Paste from clipboard ────────────────────
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        show({ type: 'warning', message: 'Clipboard is empty.' });
        return;
      }
      setJsonText(text);
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null) {
          setResource(parsed);
          // Auto-detect meta.profile → switch package
          const profiles = parsed.meta?.profile as string[] | undefined;
          if (Array.isArray(profiles) && profiles.some((u: string) => typeof u === 'string' && u.includes('hl7.org/fhir/us/core'))) {
            setCurrentPackage((prev) => prev === 'us-core' ? prev : 'us-core');
          }
          const rt = parsed.resourceType;
          if (rt) {
            setSelectedType(rt);
            show({ type: 'success', message: `Loaded ${rt} from clipboard.` });
          }
        }
      } catch {
        show({ type: 'error', message: 'Clipboard content is not valid JSON.' });
      }
    } catch {
      show({ type: 'error', message: 'Cannot read clipboard.' });
    }
  }, [show]);

  // ── Format JSON ─────────────────────────────
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
    } catch {
      show({ type: 'error', message: 'Cannot format: invalid JSON.' });
    }
  }, [jsonText, show]);

  // ── Validate ────────────────────────────────
  const handleValidate = useCallback(async () => {
    if (!jsonText.trim()) {
      show({ type: 'warning', message: 'Enter a resource JSON first.' });
      return;
    }
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

  // ── Tree node select ────────────────────────
  const handleNodeSelect = useCallback((node: InstanceNode) => {
    setSelectedNode(node);
    setSelectedPath(node.instancePath);
    // Sync JSON editor scroll
    if (editorRef.current) {
      const key = node.label.replace(/\[\d+\].*/, '');
      const line = findJsonKeyLine(jsonText, key);
      if (line !== null) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
      }
    }
  }, [jsonText]);

  // ── Monaco mount ────────────────────────────
  const handleEditorMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
  }, []);

  // ── Validation issue counts ─────────────────
  const errorCount = validationResult?.issues.filter((i) => i.severity === 'error').length ?? 0;
  const warnCount = validationResult?.issues.filter((i) => i.severity === 'warning').length ?? 0;

  // ── Render ──────────────────────────────────
  return (
    <div className="explorer-workspace">
      {/* Header */}
      <div className="explorer-workspace__header">
        <div className="explorer-workspace__title-row">
          <h2 className="explorer-workspace__title">FHIR Instance Explorer</h2>
          <p className="explorer-workspace__desc">Inspect, browse, and debug FHIR resources with schema awareness.</p>
        </div>
        <div className="explorer-workspace__controls">
          <PackageSelector currentPackage={currentPackage} onPackageChange={setCurrentPackage} />
          <label className="composer-control">
            <span className="composer-control__label">Resource Type</span>
            <select
              className="composer-control__select"
              value={selectedType ?? ''}
              onChange={(e) => setSelectedType(e.target.value || null)}
              disabled={loading}
            >
              <option value="">Auto-detect...</option>
              {resourceTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {examples.length > 0 && (
            <label className="composer-control">
              <span className="composer-control__label">Example</span>
              <select className="composer-control__select" onChange={handleLoadExample} defaultValue="">
                <option value="">Load example...</option>
                {examples.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.title}</option>
                ))}
              </select>
            </label>
          )}
          <button className="btn btn--small" onClick={handlePaste} title="Paste JSON from clipboard">
            📋 Paste
          </button>
        </div>
      </div>

      {/* Main 3-column body: JSON | Tree | Inspector */}
      <div className="explorer-workspace__body">
        {/* Column 1: JSON Editor */}
        <div className="explorer-workspace__json-col">
          <div className="explorer-workspace__json">
            <Editor
              height="100%"
              language="json"
              theme="vs-light"
              value={jsonText}
              onChange={handleJsonChange}
              onMount={handleEditorMount}
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
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          </div>
          {/* Validation issues panel */}
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

        {/* Column 2: Instance Tree */}
        <div className="explorer-workspace__tree">
          <ExplorerTree
            profile={profile}
            resource={resource}
            slicingMap={slicingMap}
            selectedPath={selectedPath}
            onSelect={handleNodeSelect}
          />
        </div>

        {/* Column 3: Element Inspector */}
        <div className="explorer-workspace__inspector">
          <ExplorerInspector node={selectedNode} />
        </div>
      </div>

      {/* Footer toolbar */}
      <div className="explorer-workspace__footer">
        <div className="explorer-workspace__footer-actions">
          <button className="btn btn--small btn--primary" onClick={handleValidate} disabled={validating}>
            {validating ? 'Validating...' : 'Validate'}
          </button>
          <button className="btn btn--small" onClick={handleFormat}>Format JSON</button>
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
