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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/repositories')}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ← リポジトリ一覧
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {repository.name}
              </h1>
              {currentFile && (
                <p className="text-sm text-gray-500">{currentFile.path}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isSaving && (
              <span className="text-sm text-gray-500">保存中...</span>
            )}
            {currentFile?.isDirty && !isSaving && (
              <span className="text-sm text-orange-600">未保存の変更</span>
            )}

            {/* Push Button */}
            {dirtyFiles.length > 0 && (
              <button
                onClick={() => setShowPushPanel(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                <span>変更をプッシュ</span>
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-blue-600 rounded-full">
                  {dirtyFiles.length}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2">
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <div className="w-64 flex-shrink-0">
          <FileTree
            files={files || []}
            currentFilePath={currentFile?.path || null}
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* Editor */}
        <div className="flex-1 bg-white">
          {currentFile ? (
            <MarkdownEditor
              value={editorContent}
              onChange={handleEditorChange}
              onSave={handleSave}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">ファイルを選択してください</p>
                <p className="text-sm">
                  左側のファイルツリーからファイルを選択すると、編集できます
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
