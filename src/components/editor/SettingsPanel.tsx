import { useState } from 'react';
import {
  useEditorSettingsStore,
  FONT_CONFIG,
  BACKGROUND_CONFIG,
  type FontFamily,
  type BackgroundColor,
} from '../../stores/editorSettingsStore';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel = ({ isOpen, onClose }: SettingsPanelProps) => {
  const {
    fontFamily,
    fontSize,
    lineHeight,
    backgroundColor,
    maxWidth,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setBackgroundColor,
    setMaxWidth,
    resetSettings,
  } = useEditorSettingsStore();

  const [activeTab, setActiveTab] = useState<'font' | 'display'>('font');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">エディタ設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('font')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'font'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            フォント
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'display'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            表示
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {activeTab === 'font' && (
            <div className="space-y-6">
              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  フォント
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(FONT_CONFIG) as FontFamily[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setFontFamily(key)}
                      className={`text-left px-4 py-3 rounded-lg border-2 transition ${
                        fontFamily === key
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={{ fontFamily: FONT_CONFIG[key].family }}
                    >
                      {FONT_CONFIG[key].name}
                      <span className="block text-sm text-gray-500 mt-1">
                        あのイーハトーヴォのすきとおった風
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  フォントサイズ: {fontSize}px
                </label>
                <input
                  type="range"
                  min="14"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>14px</span>
                  <span>24px</span>
                </div>
              </div>

              {/* Line Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  行間: {lineHeight}
                </label>
                <input
                  type="range"
                  min="1.4"
                  max="2.4"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>狭い (1.4)</span>
                  <span>広い (2.4)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-6">
              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  背景色
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(BACKGROUND_CONFIG) as BackgroundColor[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setBackgroundColor(key)}
                      className={`px-4 py-3 rounded-lg border-2 transition ${
                        backgroundColor === key
                          ? 'border-blue-600 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: BACKGROUND_CONFIG[key].color }}
                    >
                      <span className="block text-sm font-medium text-gray-900">
                        {BACKGROUND_CONFIG[key].name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1行の最大文字数: {maxWidth}文字
                </label>
                <input
                  type="range"
                  min="40"
                  max="80"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>40文字</span>
                  <span>80文字</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ※ プレビュー表示時に適用されます
                </p>
              </div>

              {/* Preview Example */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プレビュー
                </label>
                <div
                  className="p-4 rounded-lg border border-gray-200"
                  style={{
                    backgroundColor: BACKGROUND_CONFIG[backgroundColor].color,
                    fontFamily: FONT_CONFIG[fontFamily].family,
                    fontSize: `${fontSize}px`,
                    lineHeight: lineHeight,
                  }}
                >
                  <p>
                    吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetSettings}
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            設定をリセット
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
