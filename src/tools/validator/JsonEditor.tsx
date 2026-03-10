import { useRef, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: () => void;
  onFormat: () => void;
  onClear: () => void;
  onLoadExample: (json: string) => void;
  examples: Array<{ label: string; json: string }>;
  loading?: boolean;
}

export function JsonEditor({
  value,
  onChange,
  onValidate,
  onFormat,
  onClear,
  onLoadExample,
  examples,
  loading,
}: JsonEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback((val: string | undefined) => {
    onChange(val ?? '');
  }, [onChange]);

  return (
    <div className="json-editor">
      <div className="json-editor__header">
        <span className="json-editor__title">Resource JSON Editor</span>
        <div className="json-editor__actions">
          <div className="json-editor__examples">
            {examples.map((ex) => (
              <button
                key={ex.label}
                className="btn btn--small"
                onClick={() => onLoadExample(ex.json)}
              >
                {ex.label}
              </button>
            ))}
          </div>
          <button className="btn btn--small" onClick={onFormat}>Format</button>
          <button className="btn btn--small btn--danger" onClick={onClear}>Clear</button>
          <button className="btn btn--small btn--primary" onClick={onValidate} disabled={loading}>
            {loading ? 'Validating...' : 'Validate'}
          </button>
        </div>
      </div>
      <div className="json-editor__body">
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
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}
