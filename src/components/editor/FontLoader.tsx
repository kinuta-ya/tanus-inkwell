import { useEffect } from 'react';
import { useEditorSettingsStore, FONT_CONFIG } from '../../stores/editorSettingsStore';

export const FontLoader = () => {
  const fontFamily = useEditorSettingsStore((state) => state.fontFamily);

  useEffect(() => {
    // Remove existing Google Fonts link if any
    const existingLink = document.getElementById('google-fonts-link');
    if (existingLink) {
      existingLink.remove();
    }

    // Don't load font if it's system font
    if (fontFamily === 'system') {
      return;
    }

    const fontConfig = FONT_CONFIG[fontFamily];
    if (!fontConfig.googleFont) {
      return;
    }

    // Create and append new Google Fonts link
    const link = document.createElement('link');
    link.id = 'google-fonts-link';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontConfig.googleFont}&display=swap`;
    document.head.appendChild(link);

    return () => {
      const linkToRemove = document.getElementById('google-fonts-link');
      if (linkToRemove) {
        linkToRemove.remove();
      }
    };
  }, [fontFamily]);

  return null;
};
