import { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'log' | 'error';
}

// Override console.log and console.error
const originalLog = console.log;
const originalError = console.error;

const logs: LogEntry[] = [];

console.log = (...args: any[]) => {
  originalLog(...args);
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  if (message.includes('[Auth]') || message.includes('[AuthStore]') || message.includes('[Sync]') || message.includes('[Editor]')) {
    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      message,
      type: 'log',
    });
    window.dispatchEvent(new CustomEvent('debug-log'));
  }
};

console.error = (...args: any[]) => {
  originalError(...args);
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  logs.push({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type: 'error',
  });
  window.dispatchEvent(new CustomEvent('debug-log'));
};

export const DebugPanel = () => {
  // Hidden for production - uncomment to enable debug panel
  return null;

  const [isOpen, setIsOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    const handleLog = () => {
      setLogEntries([...logs].slice(-50)); // Keep last 50 logs
    };

    window.addEventListener('debug-log', handleLog);
    return () => window.removeEventListener('debug-log', handleLog);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-medium"
      >
        🐛 デバッグ
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-96 h-96 bg-black bg-opacity-95 text-white z-50 flex flex-col">
      <div className="flex justify-between items-center p-3 border-b border-gray-700">
        <h3 className="font-bold text-sm">デバッグログ</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              logs.length = 0;
              setLogEntries([]);
            }}
            className="text-xs bg-gray-700 px-2 py-1 rounded"
          >
            クリア
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs bg-gray-700 px-2 py-1 rounded"
          >
            閉じる
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {logEntries.length === 0 ? (
          <div className="text-gray-500">ログがありません</div>
        ) : (
          logEntries.map((entry, index) => (
            <div
              key={index}
              className={`mb-2 ${
                entry.type === 'error' ? 'text-red-400' : 'text-green-400'
              }`}
            >
              <span className="text-gray-500">{entry.timestamp}</span>{' '}
              <span className="whitespace-pre-wrap break-all">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
