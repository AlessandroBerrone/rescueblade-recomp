import regularUrl from '../../assets/fonts/saira-extra-condensed-latin-400-normal.woff2?url';
import boldUrl from '../../assets/fonts/saira-extra-condensed-latin-700-normal.woff2?url';

/**
 * The texts were set in Agency FB (the movie embeds "Agency FB Bold" as a PFR font,
 * which browsers cannot read). Saira Extra Condensed (SIL OFL 1.1) is the closest free
 * match: narrow, square, technical. It is bundled so every machine draws the same text.
 */
export const AGENCY_SUBSTITUTE = 'RB Agency';

let loading: Promise<void> | null = null;

export function loadTextFonts(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    if (typeof FontFace === 'undefined' || typeof document === 'undefined') return;
    const faces = [
      new FontFace(AGENCY_SUBSTITUTE, `url(${regularUrl})`, { weight: '400' }),
      new FontFace(AGENCY_SUBSTITUTE, `url(${boldUrl})`, { weight: '700' }),
    ];
    await Promise.all(
      faces.map(async (f) => {
        try {
          document.fonts.add(await f.load());
        } catch {
          // Falls back to the next family in the CSS font list.
        }
      })
    );
  })();
  return loading;
}

/**
 * Agency FB is much narrower than the substitute. The briefings were laid out to fill
 * their boxes exactly (Mission 001: 40 + 20 + 11 lines x 16 px = 236 of 240 px, so
 * "Use the CURSOR KEYS ... Press P to pause." fits one 280 px line), which takes at most
 * 0.81, and the 48 px "RESCUE BLADE" ends at the stage edge, which takes about 0.76.
 */
const AGENCY_WIDTH = 0.76;

/** Horizontal scale to draw a Director font with. */
export function fontScaleX(fontName: string): number {
  return !fontName || fontName.toLowerCase().startsWith('agency') ? AGENCY_WIDTH : 1;
}

/** CSS font for a Director font name and size (px). */
export function cssFont(fontName: string, size: number): string {
  const name = fontName.toLowerCase();
  if (name.startsWith('agency')) {
    const weight = name.includes('bold') ? 700 : 400;
    return `${weight} ${size}px "${AGENCY_SUBSTITUTE}", "Agency FB", "Arial Narrow", sans-serif`;
  }
  if (name) return `${size}px "${fontName}", Arial, sans-serif`;
  return `700 ${size}px "${AGENCY_SUBSTITUTE}", "Arial Narrow", sans-serif`;
}
