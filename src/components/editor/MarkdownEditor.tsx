import { useEffect, useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { marked } from 'marked';
import type { EditorView } from '@codemirror/view';
import { useEditorSettingsStore, FONT_CONFIG, BACKGROUND_CONFIG } from '../../stores/editorSettingsStore';
import { SettingsPanel } from './SettingsPanel';
import { MobileToolbar } from './MobileToolbar';
import { FloatingToolbar } from './FloatingToolbar';
import { renderRubyAndBouten } from '../../utils/markdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export const MarkdownEditor = ({ value, onChange, onSave }: MarkdownEditorProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const editorRef = useRef<any>(null);

  const {
    fontFamily,
    fontSize,
    lineHeight,
    writingMode,
    backgroundColor,
    maxWidth,
    setWritingMode,
  } = useEditorSettingsStore();

  useEffect(() => {
    if (showPreview) {
      let html = marked.parse(value || '') as string;
      // Apply ruby and bouten rendering
      html = renderRubyAndBouten(html);
      setPreviewHtml(html);
    }
  }, [value, showPreview]);

  // Track editor selection for floating toolbar
  useEffect(() => {
    if (!editorView || showPreview) {
      setHasSelection(false);
      return;
    }

    const updateSelection = () => {
      const selection = editorView.state.selection.main;
      setHasSelection(selection.from !== selection.to);
    };

    // Initial check
    updateSelection();

    // Listen to selection changes
    const handleUpdate = () => updateSelection();
    editorView.dom.addEventListener('mouseup', handleUpdate);
    editorView.dom.addEventListener('keyup', handleUpdate);

    return () => {
      editorView.dom.removeEventListener('mouseup', handleUpdate);
      editorView.dom.removeEventListener('keyup', handleUpdate);
    };
  }, [editorView, showPreview]);

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

  // Calculate character count (excluding spaces)
  const charCount = value.length;
  const charCountWithoutSpaces = value.replace(/\s/g, '').length;
  const manuscriptPages = Math.ceil(charCountWithoutSpaces / 400); // 400 chars per page

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

          {/* Writing Mode Toggle (only in preview) */}
          {showPreview && (
            <>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                onClick={() => setWritingMode('horizontal')}
                className={`px-3 py-1 text-sm font-medium rounded transition ${
                  writingMode === 'horizontal'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="横書き"
              >
                横
              </button>
              <button
                onClick={() => setWritingMode('vertical')}
                className={`px-3 py-1 text-sm font-medium rounded transition ${
                  writingMode === 'vertical'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="縦書き"
              >
                縦
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">
            {charCount.toLocaleString()} 文字
            {charCountWithoutSpaces !== charCount && (
              <span className="ml-2">
                ({charCountWithoutSpaces.toLocaleString()}字)
              </span>
            )}
            {manuscriptPages > 0 && (
              <span className="ml-2">
                原稿用紙 {manuscriptPages}枚
              </span>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-600 hover:text-gray-900 transition p-1"
            title="設定"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ backgroundColor: BACKGROUND_CONFIG[backgroundColor].color }}
      >
        {!showPreview ? (
          <>
            <CodeMirror
              ref={editorRef}
              value={value}
              height="100%"
              extensions={[markdown()]}
              onChange={onChange}
              onCreateEditor={(view) => setEditorView(view)}
              className="h-full"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: FONT_CONFIG[fontFamily].family,
              }}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
                foldGutter: true,
              }}
            />
            {/* Floating Toolbar */}
            <FloatingToolbar editorView={editorView} hasSelection={hasSelection} />
          </>
        ) : (
          <div
            className={`h-full ${writingMode === 'vertical' ? 'overflow-x-auto' : 'overflow-y-auto'}`}
          >
            <div
              className="prose prose-slate p-8 mx-auto"
              style={{
                fontFamily: FONT_CONFIG[fontFamily].family,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                writingMode: writingMode === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                maxWidth: writingMode === 'horizontal' ? `${maxWidth}ch` : 'none',
                height: writingMode === 'vertical' ? 'calc(100vh - 200px)' : 'auto',
                minWidth: writingMode === 'vertical' ? 'max-content' : 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>

      {/* Mobile Toolbar - only show in edit mode */}
      {!showPreview && <MobileToolbar editorView={editorView} />}

      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
