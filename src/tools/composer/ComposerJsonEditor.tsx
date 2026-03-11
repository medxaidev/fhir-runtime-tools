import { useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface ComposerJsonEditorProps {
  value: string;
  onChange: (val: string) => void;
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
  onCursorKey?: (key: string) => void;
}

export function ComposerJsonEditor({ value, onChange, editorRef, onCursorKey }: ComposerJsonEditorProps) {
  const handleMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
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
    <div className="composer-json-editor">
      <div className="composer-json-editor__header">
        <span className="composer-json-editor__title">JSON Editor</span>
      </div>
      <div className="composer-json-editor__body">
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
      </div>
    </div>
  );
}
