/**
 * Display-only helpers: hide internal research tags / jargon from UI.
 * Does not change spin weighting or seed JSON on disk.
 */

const INTERNAL_ASCII_TAG = /^[A-Za-z0-9_.\-]+$/;

/** False for ASCII-only alphanumeric/_/./- tags (fehd_*, google_*, EatSmart, QTS, …). Chinese / mixed stay. */
export function isUserFacingTag(tag: string): boolean {
  const t = tag.trim();
  if (!t) return false;
  return !INTERNAL_ASCII_TAG.test(t);
}

/** Filter + dedupe user-facing tags (order preserved). */
export function userFacingTags(tags?: string[] | null): string[] {
  if (!tags?.length) return [];
  const out: string[] = [];
  for (const raw of tags) {
    const t = (raw ?? '').trim();
    if (!t || !isUserFacingTag(t)) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/**
 * Strip research jargon from lunch notes while keeping useful hours text
 * (e.g. 「Google 地圖平日營業…」). Empty after sanitize → ''.
 */
export function sanitizeLunchNotes(notes?: string | null): string {
  if (notes == null) return '';
  let s = String(notes);

  // FEHD / 食物環境衞生署 licence clauses (through 。； or end of line/string)
  s = s.replace(/FEHD[^。；\n]*[。；]?/gi, '');
  s = s.replace(/食物環境衞生署[^。；\n]*[。；]?/g, '');
  s = s.replace(/食物環境衛生署[^。；\n]*[。；]?/g, '');

  // Google 類別：… clauses (keep 「Google 地圖…」 hours)
  s = s.replace(/Google\s*類別[：:][^。；\n]*[。；]?/gi, '');

  // Collapse leftover separators / whitespace
  s = s.replace(/[；;]{2,}/g, '；');
  s = s.replace(/[。]{2,}/g, '。');
  s = s.replace(/^[；;。\s]+/, '');
  s = s.replace(/[；;\s]+$/, ''); // drop trailing ；/spaces; keep 。
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/[；;]\s*[；;]/g, '；');
  s = s.replace(/[；;]\s*([。])/g, '$1');
  s = s.replace(/([。])\s*[；;]/g, '$1');
  s = s.trim();

  return s;
}
