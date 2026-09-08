import { useEffect, useRef, useState } from 'react';
import type * as MonacoNamespace from 'monaco-editor';
import type { ExecutionDiagnostic, Language } from '../lib/challenge-api';

// monaco-editor is large; import only the editor API type, not the full bundle.
// The actual monaco instance is loaded lazily via dynamic import so it is only
// fetched when the player first opens a challenge.

type IEditor = MonacoNamespace.editor.IStandaloneCodeEditor;

const LANGUAGE_MAP: Record<Language, string> = {
  PYTHON: 'python',
  JAVA: 'java',
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  CPP: 'cpp',
  GO: 'go',
  RUST: 'rust',
};

let loader: Promise<typeof MonacoNamespace> | undefined;

function loadMonaco(): Promise<typeof MonacoNamespace> {
  if (!loader) {
    loader = import('monaco-editor').catch((err: unknown) => {
      loader = undefined; // allow retry
      throw err;
    });
  }
  return loader;
}

export function MonacoCodeEditor({
  value,
  language,
  readOnly,
  fontSize,
  onChange,
  diagnostics = [],
  revealDiagnostic,
}: {
  value: string;
  language: Language;
  readOnly?: boolean;
  fontSize: number;
  onChange: (value: string) => void;
  diagnostics?: ExecutionDiagnostic[];
  revealDiagnostic?: ExecutionDiagnostic;
}) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<IEditor | null>(null);
  const [fallback, setFallback] = useState(false);

  // Editor is intentionally created once on mount. Language changes are
  // handled via setModelLanguage in the second effect rather than remounting.
  useEffect(() => {
    let active = true;

    if (!host.current) return;

    void loadMonaco()
      .then((monaco) => {
        if (!active || !host.current) return;
        monaco.editor.setTheme('vs-dark');
        const instance = monaco.editor.create(host.current, {
          value,
          language: LANGUAGE_MAP[language],
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize,
          readOnly,
          tabSize: 2,
        });
        instance.onDidChangeModelContent(() => {
          onChange(instance.getValue());
        });
        editor.current = instance;
      })
      .catch(() => {
        setFallback(true);
      });

    return () => {
      active = false;
      editor.current?.dispose();
      editor.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- editor created once; props handled by second effect

  useEffect(() => {
    editor.current?.updateOptions({ fontSize, readOnly });
    if (editor.current && editor.current.getValue() !== value) {
      editor.current.setValue(value);
    }
    if (editor.current) {
      void loadMonaco().then((monaco) => {
        const model = editor.current?.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, LANGUAGE_MAP[language]);
        }
      });
    }
  }, [fontSize, readOnly, value, language]);

  useEffect(() => {
    if (!editor.current) return;
    void loadMonaco().then((monaco) => {
      const model = editor.current?.getModel();
      if (!model) return;
      monaco.editor.setModelMarkers(
        model,
        'execution',
        diagnostics
          .filter((diagnostic) => diagnostic.line !== undefined)
          .map((diagnostic) => ({
            severity: monaco.MarkerSeverity.Error,
            message: diagnostic.message,
            startLineNumber: diagnostic.line ?? 1,
            startColumn: diagnostic.column ?? 1,
            endLineNumber: diagnostic.endLine ?? diagnostic.line ?? 1,
            endColumn: diagnostic.endColumn ?? (diagnostic.column ? diagnostic.column + 1 : 1),
          })),
      );
      if (revealDiagnostic?.line) {
        const position = {
          lineNumber: revealDiagnostic.line,
          column: revealDiagnostic.column ?? 1,
        };
        editor.current?.setPosition(position);
        editor.current?.revealPositionInCenter(position);
        editor.current?.focus();
      }
    });
  }, [diagnostics, revealDiagnostic]);

  if (fallback) {
    return (
      <textarea
        aria-label="Code editor"
        className="h-full w-full resize-none bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none"
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    );
  }

  return <div ref={host} className="h-full w-full" />;
}
