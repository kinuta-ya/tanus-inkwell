import type { Repository } from '../../types';

interface RepositoryCardProps {
  repository: Repository;
  onSelect: (repo: Repository) => void;
  onSync: (repo: Repository) => void;
  isSyncing?: boolean;
}

export const RepositoryCard = ({
  repository,
  onSelect,
  onSync,
  isSyncing = false,
}: RepositoryCardProps) => {
  const lastSyncDate = repository.lastSync
    ? new Date(repository.lastSync).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '未同期';

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {repository.name}
          </h3>
          <p className="text-sm text-gray-500 font-mono">
            {repository.fullName}
          </p>
        </div>
        {repository.private && (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
            Private
          </span>
        )}
      </div>

      {repository.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {repository.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          <div>最終同期: {lastSyncDate}</div>
          {repository.fileCount > 0 && (
            <div className="mt-1">ファイル数: {repository.fileCount}</div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSync(repository)}
            disabled={isSyncing}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isSyncing && (
              <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            )}
            {isSyncing ? '同期中...' : repository.lastSync ? '再同期' : '同期'}
          </button>
          <button
            onClick={() => onSelect(repository)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            開く
          </button>
        </div>
      </div>
    </div>
  );
};
