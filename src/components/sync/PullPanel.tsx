import { useState } from 'react';
import type { StoredFile } from '../../db/schema';
import type { Repository } from '../../types';
import { useSyncStore } from '../../stores/syncStore';
import { useAuthStore } from '../../stores/authStore';

interface PullPanelProps {
  repository: Repository;
  dirtyFiles: StoredFile[];
  allFiles: StoredFile[];
  onClose: () => void;
  onPullComplete: () => void;
}

export const PullPanel = ({
  repository,
  dirtyFiles,
  allFiles,
  onClose,
  onPullComplete,
}: PullPanelProps) => {
  const [conflicts, setConflicts] = useState<StoredFile[]>([]);
  const [pullResult, setPullResult] = useState<{ updated: number } | null>(null);
  const { githubToken } = useAuthStore();
  const { isPulling, pullProgress, pullTotal, error, pullChanges, clearError } = useSyncStore();

  const handlePull = async () => {
    if (!githubToken) {
      return;
    }

    try {
      const result = await pullChanges(githubToken, repository, allFiles);

      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
      } else {
        setPullResult({ updated: result.updated });
        setTimeout(() => {
          onPullComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('Pull failed:', error);
    }
  };

  const hasDirtyFiles = dirtyFiles.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:max-w-2xl sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">GitHubから取得</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{repository.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isPulling}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 ml-4 p-2"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Warning for dirty files */}
          {hasDirtyFiles && !isPulling && !pullResult && conflicts.length === 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-yellow-600 text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">未プッシュの変更があります</p>
                  <p className="text-xs text-yellow-700 mb-2">
                    {dirtyFiles.length}個のファイルに未プッシュの変更があります。
                    プルを実行すると、これらの変更が上書きされる可能性があります。
                  </p>
                  <div className="max-h-32 overflow-y-auto border border-yellow-300 rounded p-2 bg-white">
                    {dirtyFiles.map((file) => (
                      <div key={file.id} className="text-xs text-gray-700 py-1 font-mono">
                        {file.path}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conflicts detected */}
          {conflicts.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-600 text-xl flex-shrink-0">🚨</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">コンフリクトが検出されました</p>
                  <p className="text-xs text-red-700 mb-2">
                    以下のファイルは、ローカルとリモートの両方で変更されています。
                    先にローカルの変更をプッシュするか、ローカルの変更を破棄してください。
                  </p>
                  <div className="max-h-32 overflow-y-auto border border-red-300 rounded p-2 bg-white">
                    {conflicts.map((file) => (
                      <div key={file.id} className="text-xs text-gray-700 py-1 font-mono">
                        {file.path}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {pullResult && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl flex-shrink-0">✓</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 mb-1">プル完了</p>
                  <p className="text-xs text-green-700">
                    {pullResult.updated}個のファイルが更新されました。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          {!isPulling && !pullResult && conflicts.length === 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                GitHubリポジトリから最新の変更を取得します。
              </p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>リモートで更新されたファイルがローカルに反映されます</li>
                <li>ローカルで未編集のファイルのみが更新されます</li>
                <li>編集中のファイルとリモートが異なる場合、コンフリクトとして検出されます</li>
              </ul>
            </div>
          )}

          {/* Progress */}
          {isPulling && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>プル中...</span>
                <span>
                  {pullProgress} / {pullTotal}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${pullTotal > 0 ? (pullProgress / pullTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isPulling}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pullResult ? '閉じる' : 'キャンセル'}
          </button>
          {!pullResult && conflicts.length === 0 && (
            <button
              onClick={handlePull}
              disabled={isPulling}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPulling ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>プル中...</span>
                </>
              ) : (
                <>GitHubから取得</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
