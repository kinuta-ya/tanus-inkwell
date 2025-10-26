import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRepositoryStore } from '../stores/repositoryStore';
import { RepositoryCard } from '../components/repository/RepositoryCard';
import type { Repository } from '../types';

export const RepositoriesPage = () => {
  const navigate = useNavigate();
  const { githubToken } = useAuthStore();
  const { repositories, isLoading, error, fetchRepositories, setCurrentRepository, syncRepository, clearError } =
    useRepositoryStore();
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (githubToken && repositories.length === 0) {
      fetchRepositories(githubToken);
    }
  }, [githubToken, repositories.length, fetchRepositories]);

  const handleSelectRepository = (repo: Repository) => {
    setCurrentRepository(repo);
    navigate(`/editor/${repo.id}`);
  };

  const handleSyncRepository = async (repo: Repository) => {
    if (!githubToken) return;

    // 再同期の場合は警告を表示
    if (repo.lastSync) {
      const confirmed = window.confirm(
        `「${repo.name}」のすべてのファイルを再取得します。\n\n` +
        `⚠️ 警告：編集中の変更が保存されていない場合、GitHubの内容で上書きされます。\n\n` +
        `続行しますか？`
      );
      if (!confirmed) {
        return;
      }
    }

    setSuccessMessage(null);
    setSyncingRepoId(repo.id);
    try {
      await syncRepository(githubToken, repo);
      setSuccessMessage(`${repo.name} の同期が完了しました`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncingRepoId(null);
    }
  };

  const handleRefresh = () => {
    if (githubToken) {
      fetchRepositories(githubToken);
    }
  };

  if (isLoading && repositories.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">リポジトリを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">リポジトリ一覧</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
              執筆に使用するリポジトリを選択してください
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed self-end sm:self-auto"
          >
            {isLoading ? '更新中...' : '更新'}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-green-800">✓ {successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {repositories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm sm:text-base text-gray-500">リポジトリが見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {repositories.map((repo) => (
              <RepositoryCard
                key={repo.id}
                repository={repo}
                onSelect={handleSelectRepository}
                onSync={handleSyncRepository}
                isSyncing={syncingRepoId === repo.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
