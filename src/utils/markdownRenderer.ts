/**
 * Markdown renderer for novel writing
 * Converts Aozora Bunko notation to HTML
 */

/**
 * Convert ruby notation to HTML ruby tags
 * Example: 漢字《かんじ》 -> <ruby>漢字<rt>かんじ</rt></ruby>
 */
function convertRubyToHtml(text: string): string {
  // Match pattern: 漢字《かんじ》
  // Captures base text and ruby text
  const rubyPattern = /([一-龠々〆ヵヶぁ-んァ-ヶー]+)《([^》]+)》/g;

  return text.replace(rubyPattern, (_match, baseText, rubyText) => {
    // Check if it's bouten (all dots)
    if (/^[・]+$/.test(rubyText)) {
      // This is bouten (emphasis dots), handle separately
      return _match; // Don't process as ruby
    }

    return `<ruby>${baseText}<rt>${rubyText}</rt></ruby>`;
  });
}

/**
 * Convert bouten notation to HTML with emphasis
 * Example: 重要《・・》 -> <em class="bouten" data-dots="2">重要</em>
 */
function convertBoutenToHtml(text: string): string {
  // Match pattern: text《・・・...》
  // Captures base text and counts dots
  const boutenPattern = /([一-龠々〆ヵヶぁ-んァ-ヶーa-zA-Z0-9]+)《(・+)》/g;

  return text.replace(boutenPattern, (_match, baseText, dots) => {
    const dotCount = dots.length;
    return `<em class="bouten" data-dots="${dotCount}">${baseText}</em>`;
  });
}

/**
 * Render ruby and bouten in HTML
 * Processes both ruby (furigana) and bouten (emphasis dots)
 */
export function renderRubyAndBouten(html: string): string {
  // First, convert bouten (must be before ruby to avoid conflicts)
  let processed = convertBoutenToHtml(html);

  // Then, convert ruby
  processed = convertRubyToHtml(processed);

  return processed;
}

/**
 * Strip ruby and bouten notation for plain text
 * Useful for character counting without markup
 */
export function stripRubyAndBouten(text: string): string {
  // Remove ruby: 漢字《かんじ》 -> 漢字
  let stripped = text.replace(/([一-龠々〆ヵヶぁ-んァ-ヶー]+)《[^》]+》/g, '$1');

  return stripped;
}

/**
 * Count characters excluding ruby/bouten notation
 * Returns actual displayed character count
 */
export function countDisplayedCharacters(text: string): number {
  const stripped = stripRubyAndBouten(text);
  return [...stripped].length; // Support surrogate pairs
}
