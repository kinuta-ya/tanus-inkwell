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
  const previewRef = useRef<HTMLDivElement>(null);

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

  // Reset scroll position when switching to preview or changing writing mode
  useEffect(() => {
    if (showPreview && previewRef.current) {
      // For vertical writing, scroll to the rightmost position (start of text)
      if (writingMode === 'vertical') {
        // Use requestAnimationFrame and setTimeout to ensure the content is fully rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (previewRef.current) {
              // Scroll to the far right (start of vertical text)
              const maxScroll = previewRef.current.scrollWidth - previewRef.current.clientWidth;
              console.log('[Preview] Vertical scroll - scrollWidth:', previewRef.current.scrollWidth, 'clientWidth:', previewRef.current.clientWidth, 'maxScroll:', maxScroll);
              previewRef.current.scrollLeft = maxScroll;
            }
          }, 150);
        });
      } else {
        // For horizontal writing, scroll to top
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (previewRef.current) {
              previewRef.current.scrollTop = 0;
            }
          }, 50);
        });
      }
    }
  }, [showPreview, writingMode, previewHtml]);

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
    <div className="h-full flex flex-col w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 md:px-4 py-2 bg-gray-100 border-b border-gray-200 gap-2 w-full min-w-0">
        <div className="flex items-center gap-1 md:gap-2 flex-shrink min-w-0">
          <button
            onClick={() => setShowPreview(false)}
            className={`p-1.5 sm:p-2 rounded transition flex-shrink-0 ${
              !showPreview
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="編集"
            aria-label="編集"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`p-1.5 sm:p-2 rounded transition flex-shrink-0 ${
              showPreview
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="プレビュー"
            aria-label="プレビュー"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          {/* Writing Mode Toggle (only in preview) */}
          {showPreview && (
            <>
              <div className="hidden sm:block w-px h-4 bg-gray-300 mx-1" />
              <button
                onClick={() => setWritingMode('horizontal')}
                className={`p-1.5 sm:p-2 md:px-3 md:py-1 text-sm font-medium rounded transition flex-shrink-0 ${
                  writingMode === 'horizontal'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="横書き"
                aria-label="横書き"
              >
                <span className="hidden md:inline">横</span>
                <span className="md:hidden text-xs">━</span>
              </button>
              <button
                onClick={() => setWritingMode('vertical')}
                className={`p-1.5 sm:p-2 md:px-3 md:py-1 text-sm font-medium rounded transition flex-shrink-0 ${
                  writingMode === 'vertical'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="縦書き"
                aria-label="縦書き"
              >
                <span className="hidden md:inline">縦</span>
                <span className="md:hidden text-xs">｜</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
          <div className="hidden xl:block text-xs text-gray-500 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
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
            className="text-gray-600 hover:text-gray-900 transition p-1.5 sm:p-2 flex-shrink-0"
            title="設定"
            aria-label="設定"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            ref={previewRef}
            className={`preview-container ${
              writingMode === 'vertical'
                ? 'h-full overflow-x-auto overflow-y-hidden'
                : 'h-full overflow-y-auto overflow-x-hidden'
            }`}
          >
            {writingMode === 'vertical' ? (
              <div
                className="prose prose-slate"
                style={{
                  fontFamily: FONT_CONFIG[fontFamily].family,
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  writingMode: 'vertical-rl',
                  padding: '2rem',
                  height: '100%',
                  width: 'max-content',
                  boxSizing: 'border-box',
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div
                className="prose prose-slate"
                style={{
                  fontFamily: FONT_CONFIG[fontFamily].family,
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  writingMode: 'horizontal-tb',
                  padding: '2rem',
                  maxWidth: `${maxWidth}ch`,
                  margin: '0 auto',
                  minHeight: '100%',
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
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
