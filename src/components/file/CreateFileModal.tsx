import { useState } from 'react';

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (filePath: string) => void;
}

export const CreateFileModal = ({ isOpen, onClose, onCreateFile }: CreateFileModalProps) => {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fileName.trim()) {
      setError('ファイル名を入力してください');
      return;
    }

    // Auto-append .md extension if not present
    let filePath = fileName.trim();
    if (!filePath.endsWith('.md') && !filePath.endsWith('.markdown')) {
      filePath += '.md';
    }

    // Validate path format
    if (filePath.includes('//') || filePath.startsWith('/')) {
      setError('ファイルパスが不正です');
      return;
    }

    onCreateFile(filePath);
    setFileName('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setFileName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">新規ファイル作成</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">
              ファイル名
            </label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value);
                setError('');
              }}
              placeholder="例: chapter-01.md または notes/memo.md"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              フォルダを含む場合: <code className="bg-gray-100 px-1 py-0.5 rounded">folder/file.md</code>
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
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
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
