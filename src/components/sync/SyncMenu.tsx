import { useState, useRef, useEffect } from 'react';

interface SyncMenuProps {
  dirtyFilesCount: number;
  onPull: () => void;
  onPush: () => void;
  disabled?: boolean;
}

export const SyncMenu = ({ dirtyFilesCount, onPull, onPush, disabled = false }: SyncMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePull = () => {
    setIsOpen(false);
    onPull();
  };

  const handlePush = () => {
    setIsOpen(false);
    onPush();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Sync Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        title="GitHubと同期"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="hidden sm:inline">同期</span>
        {dirtyFilesCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-orange-100 text-orange-600 rounded-full">
            {dirtyFilesCount}
          </span>
        )}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* Pull Option */}
          <button
            onClick={handlePull}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-start gap-3"
          >
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">GitHubから取得</div>
              <div className="text-xs text-gray-500 mt-0.5">
                リモートの変更をローカルに反映
              </div>
            </div>
          </button>

          <div className="border-t border-gray-100 my-1"></div>

          {/* Push Option */}
          <button
            onClick={handlePush}
            disabled={dirtyFilesCount === 0}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                GitHubへ送信
                {dirtyFilesCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-600 rounded-full">
                    {dirtyFilesCount}件
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {dirtyFilesCount > 0
                  ? 'ローカルの変更をGitHubにプッシュ'
                  : '変更がありません'}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
