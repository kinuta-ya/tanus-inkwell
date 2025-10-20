import { useState, useMemo } from 'react';
import type { StoredFile } from '../../db/schema';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  file?: StoredFile;
}

interface FileTreeProps {
  files: StoredFile[];
  currentFilePath: string | null;
  onFileSelect: (file: StoredFile) => void;
}

export const FileTree = ({ files, currentFilePath, onFileSelect }: FileTreeProps) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));

  // Build tree structure from flat file list
  const fileTree = useMemo(() => {
    const root: FileNode = {
      name: '/',
      path: '/',
      type: 'directory',
      children: [],
    };

    files.forEach((file) => {
      const parts = file.path.split('/');
      let currentNode = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');

        if (!currentNode.children) {
          currentNode.children = [];
        }

        let childNode = currentNode.children.find((child) => child.name === part);

        if (!childNode) {
          childNode = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'directory',
            children: isLast ? undefined : [],
            file: isLast ? file : undefined,
          };
          currentNode.children.push(childNode);
        }

        currentNode = childNode;
      });
    });

    // Sort children: directories first, then files
    const sortChildren = (node: FileNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'directory' ? -1 : 1;
        });
        node.children.forEach(sortChildren);
      }
    };
    sortChildren(root);

    return root;
  }, [files]);

  const toggleDirectory = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isCurrentFile = node.file && currentFilePath === node.file.path;

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleDirectory(node.path)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition"
            style={{ paddingLeft: `${level * 1 + 0.75}rem` }}
          >
            <span className="text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="text-gray-700 font-medium">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // File node
    return (
      <button
        key={node.path}
        onClick={() => node.file && onFileSelect(node.file)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition ${
          isCurrentFile ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
        }`}
        style={{ paddingLeft: `${level * 1 + 2}rem` }}
      >
        <span className="text-gray-400">📄</span>
        <span className={isCurrentFile ? 'font-medium' : ''}>
          {node.name}
        </span>
        {node.file?.isDirty && (
          <span className="ml-auto text-orange-500 text-xs">●</span>
        )}
      </button>
    );
  };

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        <div className="mb-2">📁</div>
        <div className="mb-2">ファイルがありません</div>
        <div className="text-xs mt-3 text-left bg-blue-50 p-3 rounded border border-blue-200">
          <div className="font-medium text-blue-900 mb-1">ヒント：</div>
          <div className="text-blue-700">
            リポジトリ一覧ページで<br />
            「同期」ボタンを押して<br />
            ファイルをダウンロードしてください
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-gray-200">
      <div className="py-2">
        {fileTree.children?.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
};
