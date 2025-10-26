import type { EditorView } from '@codemirror/view';

/**
 * Text operations for novel writing
 * Supports ruby (furigana) and bouten (emphasis dots)
 */

export interface TextOperation {
  from: number;
  to: number;
  insert: string;
  cursorPos?: number;
}

/**
 * Insert ruby notation (furigana)
 * Example: "漢字" -> "漢字《》" with cursor inside 《》
 */
export function createRubyOperation(
  selectedText: string,
  from: number,
  to: number
): TextOperation {
  const newText = `${selectedText}《》`;
  const cursorPos = from + selectedText.length + 1; // Position cursor inside 《》

  return {
    from,
    to,
    insert: newText,
    cursorPos,
  };
}

/**
 * Insert bouten (emphasis dots)
 * Example: "重要" (2 chars) -> "重要《・・》"
 * Automatically generates dots matching the character count
 */
export function createBoutenOperation(
  selectedText: string,
  from: number,
  to: number
): TextOperation {
  // Count characters (supports surrogate pairs)
  const charCount = [...selectedText].length;
  const dots = '・'.repeat(charCount);
  const newText = `${selectedText}《${dots}》`;

  return {
    from,
    to,
    insert: newText,
  };
}

/**
 * Insert symbol at cursor position
 */
export function createSymbolOperation(
  symbol: string,
  cursorPos: number
): TextOperation {
  return {
    from: cursorPos,
    to: cursorPos,
    insert: symbol,
    cursorPos: cursorPos + symbol.length,
  };
}

/**
 * Insert scene break marker
 * Inserts: \n＊\n
 */
export function createSceneBreakOperation(cursorPos: number): TextOperation {
  const sceneBreak = '\n＊\n';
  return {
    from: cursorPos,
    to: cursorPos,
    insert: sceneBreak,
    cursorPos: cursorPos + sceneBreak.length,
  };
}

/**
 * Apply text operation to CodeMirror editor
 */
export function applyTextOperation(
  editor: EditorView,
  operation: TextOperation
): void {
  const transaction: any = {
    changes: {
      from: operation.from,
      to: operation.to,
      insert: operation.insert,
    },
  };

  // Set cursor position if specified
  if (operation.cursorPos !== undefined) {
    transaction.selection = {
      anchor: operation.cursorPos,
    };
  }

  editor.dispatch(transaction);
  editor.focus();
}

/**
 * Get current selection or cursor position
 */
export function getEditorSelection(editor: EditorView): {
  text: string;
  from: number;
  to: number;
  hasSelection: boolean;
} {
  const state = editor.state;
  const selection = state.selection.main;
  const text = state.sliceDoc(selection.from, selection.to);

  return {
    text,
    from: selection.from,
    to: selection.to,
    hasSelection: selection.from !== selection.to,
  };
}

/**
 * Insert ruby (furigana) into editor
 */
export function insertRuby(editor: EditorView): void {
  const selection = getEditorSelection(editor);

  if (!selection.hasSelection) {
    // No selection, just insert placeholder
    const operation = createSymbolOperation('《》', selection.from);
    operation.cursorPos = selection.from + 1; // Position cursor inside 《》
    applyTextOperation(editor, operation);
    return;
  }

  const operation = createRubyOperation(
    selection.text,
    selection.from,
    selection.to
  );
  applyTextOperation(editor, operation);
}

/**
 * Insert bouten (emphasis dots) into editor
 */
export function insertBouten(editor: EditorView): void {
  const selection = getEditorSelection(editor);

  if (!selection.hasSelection) {
    // No selection, cannot add bouten
    return;
  }

  const operation = createBoutenOperation(
    selection.text,
    selection.from,
    selection.to
  );
  applyTextOperation(editor, operation);
}

/**
 * Insert symbol into editor
 */
export function insertSymbol(editor: EditorView, symbol: string): void {
  const selection = getEditorSelection(editor);
  const operation = createSymbolOperation(symbol, selection.from);
  applyTextOperation(editor, operation);
}

/**
 * Insert scene break marker
 */
export function insertSceneBreak(editor: EditorView): void {
  const selection = getEditorSelection(editor);
  const operation = createSceneBreakOperation(selection.from);
  applyTextOperation(editor, operation);
}

/**
 * Common symbols for novel writing
 */
export const SYMBOLS = {
  DASH: '――',
  ELLIPSIS: '……',
  FULL_WIDTH_SPACE: '　',
  SCENE_BREAK: '＊',
} as const;
