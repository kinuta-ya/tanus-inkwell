import { useState } from 'react';
import type { StoredFile } from '../../db/schema';
import type { Repository } from '../../types';
import { useSyncStore } from '../../stores/syncStore';
import { useAuthStore } from '../../stores/authStore';

interface PushPanelProps {
  repository: Repository;
  dirtyFiles: StoredFile[];
  allFiles: StoredFile[];
  onClose: () => void;
  onPushComplete: () => void;
}

export const PushPanel = ({
  repository,
  dirtyFiles,
  allFiles,
  onClose,
  onPushComplete,
}: PushPanelProps) => {
  const [commitMessage, setCommitMessage] = useState('');
  const { githubToken } = useAuthStore();
  const { isPushing, pushProgress, pushTotal, error, pushChanges, clearError } = useSyncStore();

  const handlePush = async () => {
    if (!githubToken || !commitMessage.trim()) {
      return;
    }

    try {
      await pushChanges(githubToken, repository, allFiles, commitMessage.trim());
      onPushComplete();
    } catch (error) {
      console.error('Push failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">変更をプッシュ</h2>
            <p className="text-sm text-gray-600 mt-1">{repository.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isPushing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* File List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              変更されたファイル ({dirtyFiles.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {dirtyFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 text-sm text-gray-700 py-1"
                >
                  <span className="text-orange-500">●</span>
                  <span className="font-mono">{file.path}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commit Message */}
          <div className="mb-4">
            <label
              htmlFor="commit-message"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              コミットメッセージ
            </label>
            <textarea
              id="commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="変更内容を簡潔に説明してください"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows={4}
              disabled={isPushing}
            />
          </div>

          {/* Progress */}
          {isPushing && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>プッシュ中...</span>
                <span>
                  {pushProgress} / {pushTotal}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${pushTotal > 0 ? (pushProgress / pushTotal) * 100 : 0}%`,
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
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isPushing}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            onClick={handlePush}
            disabled={isPushing || !commitMessage.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPushing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                プッシュ中...
              </>
            ) : (
              <>GitHubにプッシュ</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
