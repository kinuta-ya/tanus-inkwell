import { useState, useEffect } from 'react';

interface RenameFileModalProps {
  isOpen: boolean;
  currentPath: string;
  onClose: () => void;
  onRenameFile: (newPath: string) => void;
}

export const RenameFileModal = ({ isOpen, currentPath, onClose, onRenameFile }: RenameFileModalProps) => {
  const [newFileName, setNewFileName] = useState('');
  const [error, setError] = useState('');

  // Initialize with current file name when modal opens
  useEffect(() => {
    if (isOpen && currentPath) {
      setNewFileName(currentPath);
    }
  }, [isOpen, currentPath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newFileName.trim()) {
      setError('ファイル名を入力してください');
      return;
    }

    const trimmedPath = newFileName.trim();

    // Check if the name actually changed
    if (trimmedPath === currentPath) {
      setError('ファイル名が変更されていません');
      return;
    }

    // Validate path format
    if (trimmedPath.includes('//') || trimmedPath.startsWith('/')) {
      setError('ファイルパスが不正です');
      return;
    }

    onRenameFile(trimmedPath);
    setError('');
    onClose();
  };

  const handleClose = () => {
    setNewFileName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">ファイル名変更</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="newFileName" className="block text-sm font-medium text-gray-700 mb-2">
              新しいファイル名
            </label>
            <input
              type="text"
              id="newFileName"
              value={newFileName}
              onChange={(e) => {
                setNewFileName(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              現在: <code className="bg-gray-100 px-1 py-0.5 rounded">{currentPath}</code>
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-xs text-yellow-800">
              ⚠️ ファイル名変更はGitHub上で新しいファイルの作成と古いファイルの削除として処理されます。
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              名前変更
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
