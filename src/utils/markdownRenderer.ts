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
 * Convert the editor's ruby/bouten notation to 小説家になろう (Narou) format,
 * for pasting an episode body into Narou.
 *
 * - Ruby:   親文字《ふりがな》 -> ｜親文字《ふりがな》  (explicit full-width pipe so
 *           kana-containing base text isn't mis-detected on Narou)
 * - Bouten: 親文字《・・》     -> 《《親文字》》          (Narou emphasis-dots)
 *
 * Bouten is handled before ruby (mirroring renderRubyAndBouten) so the dot
 * marker 《・・》 isn't mistaken for a ruby reading.
 */
export function toNarouFormat(text: string): string {
  // Bouten: base text followed by 《・...》 -> 《《base》》
  let out = text.replace(
    /([一-龠々〆ヵヶぁ-んァ-ヶーa-zA-Z0-9]+)《(・+)》/g,
    (_match, baseText) => `《《${baseText}》》`
  );

  // Ruby: base text + 《reading》 -> ｜base《reading》. The lookbehind keeps the
  // match starting at the head of a run, so an already-piped ｜base《》 is left
  // alone and the pipe isn't inserted mid-run.
  out = out.replace(
    /(?<![｜一-龠々〆ヵヶぁ-んァ-ヶー])([一-龠々〆ヵヶぁ-んァ-ヶー]+)《([^》]+)》/g,
    (_match, baseText, rubyText) => `｜${baseText}《${rubyText}》`
  );

  return out;
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
