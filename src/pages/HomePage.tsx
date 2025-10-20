import { useAuthStore } from '../stores/authStore';

export const HomePage = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Tanus Inkwell</h1>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4 mb-6">
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.name || user?.login}
              </h2>
              <p className="text-gray-600">@{user?.login}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ようこそ！
            </h3>
            <p className="text-gray-600 mb-4">
              認証が完了しました。次の機能を実装予定です：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>リポジトリ一覧表示</li>
              <li>ファイル管理</li>
              <li>Markdownエディタ</li>
              <li>GitHub同期機能</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};
