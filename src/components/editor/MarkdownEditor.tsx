import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { marked } from 'marked';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export const MarkdownEditor = ({ value, onChange, onSave }: MarkdownEditorProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    if (showPreview) {
      const html = marked.parse(value || '') as string;
      setPreviewHtml(html);
    }
  }, [value, showPreview]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(false)}
            className={`px-3 py-1 text-sm font-medium rounded transition ${
              !showPreview
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            編集
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`px-3 py-1 text-sm font-medium rounded transition ${
              showPreview
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            プレビュー
          </button>
        </div>

        <div className="text-xs text-gray-500">
          {value.length.toLocaleString()} 文字
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 overflow-hidden">
        {!showPreview ? (
          <CodeMirror
            value={value}
            height="100%"
            extensions={[markdown()]}
            onChange={onChange}
            className="h-full text-base"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightActiveLine: true,
              foldGutter: true,
            }}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <div
              className="prose prose-slate max-w-none p-8"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
