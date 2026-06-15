/**
 * Copy text to the clipboard, with a fallback for non-secure (http) contexts.
 *
 * The app is served over plain http on EC2, where `navigator.clipboard` is
 * unavailable (it requires a secure context). Fall back to a temporary
 * textarea + execCommand('copy'), which still works there.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy approach below.
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Keep it out of view and avoid scrolling/zoom jumps on mobile.
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
