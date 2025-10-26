import type { EditorView } from '@codemirror/view';
import {
  insertRuby,
  insertBouten,
  insertSymbol,
  insertSceneBreak,
  SYMBOLS,
} from '../../utils/textOperations';

interface MobileToolbarProps {
  editorView: EditorView | null;
}

export const MobileToolbar = ({ editorView }: MobileToolbarProps) => {
  if (!editorView) return null;

  const handleRuby = () => insertRuby(editorView);
  const handleBouten = () => insertBouten(editorView);
  const handleDash = () => insertSymbol(editorView, SYMBOLS.DASH);
  const handleEllipsis = () => insertSymbol(editorView, SYMBOLS.ELLIPSIS);
  const handleSpace = () => insertSymbol(editorView, SYMBOLS.FULL_WIDTH_SPACE);
  const handleSceneBreak = () => insertSceneBreak(editorView);

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
        <ToolbarButton onClick={handleRuby} label="ルビ" />
        <ToolbarButton onClick={handleBouten} label="傍点" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={handleDash} label="――" />
        <ToolbarButton onClick={handleEllipsis} label="……" />
        <ToolbarButton onClick={handleSpace} label="□" title="全角スペース" />
        <ToolbarButton onClick={handleSceneBreak} label="＊" title="場面転換" />
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  title?: string;
}

const ToolbarButton = ({ onClick, label, title }: ToolbarButtonProps) => {
  return (
    <button
      onClick={onClick}
      title={title || label}
      className="
        flex items-center justify-center
        min-w-[44px] h-[44px]
        px-3
        text-sm font-medium
        text-gray-700
        bg-gray-50
        hover:bg-gray-100
        active:bg-gray-200
        rounded
        transition-colors
        whitespace-nowrap
        select-none
      "
    >
      {label}
    </button>
  );
};
