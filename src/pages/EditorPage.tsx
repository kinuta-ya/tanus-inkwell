import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRepositoryStore } from '../stores/repositoryStore';
import { FileTree } from '../components/file/FileTree';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { PushPanel } from '../components/sync/PushPanel';
import { db, type StoredFile } from '../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

export const EditorPage = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentRepository, repositories } = useRepositoryStore();
  const [currentFile, setCurrentFile] = useState<StoredFile | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPushPanel, setShowPushPanel] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  // Load files from IndexedDB
  const files = useLiveQuery(
    () => {
      if (!repoId) return [];
      console.log(`[Editor] Loading files for repoId: ${repoId}`);
      return db.files.where('repoId').equals(repoId).toArray();
    },
    [repoId]
  );

  // Find current repository
  const repository = currentRepository || repositories.find((r) => r.id === repoId);

  // Count dirty files
  const dirtyFiles = useMemo(() => {
    return files?.filter((f) => f.isDirty) || [];
  }, [files]);

  useEffect(() => {
    console.log(`[Editor] repoId: ${repoId}`);
    console.log(`[Editor] files loaded:`, files?.length || 0);
    console.log(`[Editor] dirty files:`, dirtyFiles.length);
    if (files && files.length > 0) {
      console.log('[Editor] File repoIds:', files.map(f => f.repoId));
    }
  }, [repoId, files, dirtyFiles]);

  useEffect(() => {
    if (!repository && repoId) {
      // Repository not found, redirect to repositories page
      navigate('/repositories');
    }
  }, [repository, repoId, navigate]);

  const handleFileSelect = useCallback((file: StoredFile) => {
    setCurrentFile(file);
    setEditorContent(file.content);
  }, []);

  const handleEditorChange = useCallback((value: string) => {
    setEditorContent(value);
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentFile) return;

    setIsSaving(true);
    try {
      // Update file in IndexedDB
      await db.files.update(currentFile.id, {
        content: editorContent,
        lastModified: new Date().toISOString(),
        isDirty: currentFile.content !== editorContent,
      });

      // Update current file state
      setCurrentFile({
        ...currentFile,
        content: editorContent,
        lastModified: new Date().toISOString(),
        isDirty: currentFile.content !== editorContent,
      });
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentFile, editorContent]);

  // Auto-save every 3 seconds
  useEffect(() => {
    if (!currentFile || editorContent === currentFile.content) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentFile, editorContent, handleSave]);

  if (!repository) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileDrawer(true)}
              className="md:hidden text-gray-600 hover:text-gray-900 p-2"
              aria-label="ファイル一覧を開く"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Back Button (desktop) */}
            <button
              onClick={() => navigate('/repositories')}
              className="hidden md:block text-gray-600 hover:text-gray-900 transition whitespace-nowrap"
            >
              ← リポジトリ一覧
            </button>

            {/* Title */}
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                {repository.name}
              </h1>
              {currentFile && (
                <p className="text-xs md:text-sm text-gray-500 truncate">{currentFile.path}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Status (desktop only) */}
            {isSaving && (
              <span className="hidden md:inline text-sm text-gray-500">保存中...</span>
            )}
            {currentFile?.isDirty && !isSaving && (
              <span className="hidden md:inline text-sm text-orange-600">未保存</span>
            )}

            {/* Push Button */}
            {dirtyFiles.length > 0 && (
              <button
                onClick={() => setShowPushPanel(true)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                <span className="hidden sm:inline">変更をプッシュ</span>
                <span className="sm:hidden">Push</span>
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-blue-600 rounded-full">
                  {dirtyFiles.length}
                </span>
              </button>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full"
                />
              )}
              <button
                onClick={logout}
                className="hidden md:block text-sm text-gray-600 hover:text-gray-900"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar - Desktop */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <FileTree
            files={files || []}
            currentFilePath={currentFile?.path || null}
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* File Tree Drawer - Mobile */}
        {showMobileDrawer && (
          <div className="md:hidden fixed inset-0 z-40">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setShowMobileDrawer(false)}
            />

            {/* Drawer */}
            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">ファイル一覧</h2>
                <button
                  onClick={() => setShowMobileDrawer(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                  aria-label="閉じる"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(100%-73px)] overflow-y-auto">
                <FileTree
                  files={files || []}
                  currentFilePath={currentFile?.path || null}
                  onFileSelect={(file) => {
                    handleFileSelect(file);
                    setShowMobileDrawer(false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 bg-white">
          {currentFile ? (
            <MarkdownEditor
              value={editorContent}
              onChange={handleEditorChange}
              onSave={handleSave}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 p-4">
              <div className="text-center">
                <p className="text-base md:text-lg mb-2">ファイルを選択してください</p>
                <p className="text-sm">
                  <span className="md:hidden">メニューボタンからファイルを選択すると、編集できます</span>
                  <span className="hidden md:inline">左側のファイルツリーからファイルを選択すると、編集できます</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Push Panel */}
      {showPushPanel && repository && (
        <PushPanel
          repository={repository}
          dirtyFiles={dirtyFiles}
          allFiles={files || []}
          onClose={() => setShowPushPanel(false)}
          onPushComplete={() => {
            setShowPushPanel(false);
            // Files will be automatically refreshed by useLiveQuery
            // No need to reload the page
          }}
        />
      )}
    </div>
  );
};
