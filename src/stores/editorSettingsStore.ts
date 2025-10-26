import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontFamily = 'system' | 'noto-serif' | 'shippori-mincho' | 'noto-sans' | 'mplus-rounded' | 'zen-kaku';

export type WritingMode = 'horizontal' | 'vertical';

export type BackgroundColor = 'white' | 'off-white' | 'cream' | 'light-gray';

interface EditorSettings {
  // Font settings
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;

  // Writing mode
  writingMode: WritingMode;

  // Display settings
  backgroundColor: BackgroundColor;
  maxWidth: number; // in characters

  // Focus mode
  focusMode: boolean;

  // Actions
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setWritingMode: (mode: WritingMode) => void;
  setBackgroundColor: (color: BackgroundColor) => void;
  setMaxWidth: (width: number) => void;
  toggleFocusMode: () => void;
  resetSettings: () => void;
}

const defaultSettings = {
  fontFamily: 'system' as FontFamily,
  fontSize: 16,
  lineHeight: 1.8,
  writingMode: 'horizontal' as WritingMode,
  backgroundColor: 'white' as BackgroundColor,
  maxWidth: 55,
  focusMode: false,
};

export const useEditorSettingsStore = create<EditorSettings>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setWritingMode: (mode) => set({ writingMode: mode }),
      setBackgroundColor: (color) => set({ backgroundColor: color }),
      setMaxWidth: (width) => set({ maxWidth: width }),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'editor-settings',
    }
  )
);

// Font configuration
export const FONT_CONFIG = {
  system: {
    name: 'システムフォント',
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif',
  },
  'noto-serif': {
    name: 'Noto Serif JP（明朝体）',
    family: '"Noto Serif JP", serif',
    googleFont: 'Noto+Serif+JP:wght@400;500;600;700',
  },
  'shippori-mincho': {
    name: 'Shippori Mincho（明朝体）',
    family: '"Shippori Mincho", serif',
    googleFont: 'Shippori+Mincho:wght@400;500;600;700',
  },
  'noto-sans': {
    name: 'Noto Sans JP（ゴシック体）',
    family: '"Noto Sans JP", sans-serif',
    googleFont: 'Noto+Sans+JP:wght@400;500;600;700',
  },
  'mplus-rounded': {
    name: 'M PLUS Rounded 1c（ゴシック体）',
    family: '"M PLUS Rounded 1c", sans-serif',
    googleFont: 'M+PLUS+Rounded+1c:wght@400;500;700',
  },
  'zen-kaku': {
    name: 'Zen Kaku Gothic New（ゴシック体）',
    family: '"Zen Kaku Gothic New", sans-serif',
    googleFont: 'Zen+Kaku+Gothic+New:wght@400;500;700',
  },
} as const;

// Background color configuration
export const BACKGROUND_CONFIG = {
  white: {
    name: '白',
    color: '#ffffff',
  },
  'off-white': {
    name: 'オフホワイト',
    color: '#fafafa',
  },
  cream: {
    name: 'クリーム',
    color: '#fef9ec',
  },
  'light-gray': {
    name: 'ライトグレー',
    color: '#f5f5f5',
  },
} as const;
