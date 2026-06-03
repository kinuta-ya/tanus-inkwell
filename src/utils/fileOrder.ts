import type { StoredFile } from '../db/schema';

interface OrderNode {
  name: string;
  type: 'file' | 'directory';
  file?: StoredFile;
  children?: OrderNode[];
}

/**
 * Flatten files into the same top-to-bottom order the FileTree shows them:
 * directories first, then files, each sorted alphabetically, walked depth-first.
 * Used to step to the previous/next file (e.g. reading the next chapter in the
 * preview) so navigation matches what the user sees in the left pane.
 */
export const getFilesInTreeOrder = (files: StoredFile[]): StoredFile[] => {
  const root: OrderNode = { name: '/', type: 'directory', children: [] };

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current = root;
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      if (!current.children) current.children = [];
      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          type: isLast ? 'file' : 'directory',
          file: isLast ? file : undefined,
          children: isLast ? undefined : [],
        };
        current.children.push(child);
      }
      current = child;
    });
  });

  const ordered: StoredFile[] = [];
  const walk = (node: OrderNode) => {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
    for (const child of node.children) {
      if (child.type === 'file' && child.file) {
        ordered.push(child.file);
      } else {
        walk(child);
      }
    }
  };
  walk(root);

  return ordered;
};
