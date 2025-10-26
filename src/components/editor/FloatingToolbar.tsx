import { useEffect, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { insertRuby, insertBouten } from '../../utils/textOperations';

interface FloatingToolbarProps {
  editorView: EditorView | null;
  hasSelection: boolean;
}

export const FloatingToolbar = ({ editorView, hasSelection }: FloatingToolbarProps) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editorView || !hasSelection) {
      setPosition(null);
      return;
    }

    // Calculate floating toolbar position
    const calculatePosition = () => {
      try {
        const selection = editorView.state.selection.main;
        const coords = editorView.coordsAtPos(selection.from);

        if (!coords) {
          setPosition(null);
          return;
        }

        // Get editor container position
        const editorRect = editorView.dom.getBoundingClientRect();

        // Position toolbar above the selection
        const top = coords.top - editorRect.top - 50; // 50px above selection
        const left = coords.left - editorRect.left;

        setPosition({ top, left });
      } catch (error) {
        console.error('Error calculating floating toolbar position:', error);
        setPosition(null);
      }
    };

    calculatePosition();

    // Update position on scroll or editor changes
    const updatePosition = () => calculatePosition();
    editorView.dom.addEventListener('scroll', updatePosition);

    return () => {
      editorView.dom.removeEventListener('scroll', updatePosition);
    };
  }, [editorView, hasSelection]);

  if (!editorView || !hasSelection || !position) {
    return null;
  }

  const handleRuby = () => {
    insertRuby(editorView);
    setPosition(null);
  };

  const handleBouten = () => {
    insertBouten(editorView);
    setPosition(null);
  };

  return (
    <div
      className="absolute z-50 flex items-center gap-1 bg-gray-800 rounded-lg shadow-lg px-2 py-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <FloatingButton onClick={handleRuby} label="ルビ" />
      <FloatingButton onClick={handleBouten} label="傍点" />
    </div>
  );
};

interface FloatingButtonProps {
  onClick: () => void;
  label: string;
}

const FloatingButton = ({ onClick, label }: FloatingButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="
        px-3 py-2
        text-sm font-medium
        text-white
        hover:bg-gray-700
        active:bg-gray-600
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
