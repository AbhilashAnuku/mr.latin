import type { LanguageCode } from "../types";
import { nativeLanguageName } from "../intl/format";

/**
 * Schematic, hand-drawn flag tiles — rendered as inline SVG strings.
 *
 * Every flag is an original, simplified line-drawing built from a tiny set of
 * reusable primitives (stripes, crosses, cantons) plus a handful of bespoke
 * emblems. They are deliberately NOT pixel-accurate national flags: no
 * copyrighted assets, no Unicode emoji-flag reliance (which renders as letter
 * pairs on Windows). Each tile is a 60×40 rectangle so the picker reads as a
 * neat grid of little flags regardless of platform.
 *
 * Region awareness: a few language tags map to a region-specific flag — English
 * defaults to the Union Jack, but `en-US` shows the US tile and `pt-BR` Brazil.
 *
 * Unknown languages still render: they fall back to a neutral accent-coloured
 * tile stamped with the uppercased two-letter code, so EVERY language the host
 * offers gets a visible flag.
 */

const VIEWBOX = "0 0 60 40";

/** A single SVG `<rect>` covering the whole tile. */
function bg(color: string): string {
  return `<rect width="60" height="40" fill="${color}"/>`;
}

/** Horizontal bands, top to bottom, splitting the 40px height evenly. */
function horizontal(colors: string[]): string {
  const h = 40 / colors.length;
  return colors
    .map(
      (c, i) =>
        `<rect x="0" y="${round(i * h)}" width="60" height="${round(h)}" fill="${c}"/>`,
    )
    .join("");
}

/** Vertical bands, left to right, splitting the 60px width evenly. */
function vertical(colors: string[]): string {
  const w = 60 / colors.length;
  return colors
    .map(
      (c, i) =>
        `<rect x="${round(i * w)}" y="0" width="${round(w)}" height="40" fill="${c}"/>`,
    )
    .join("");
}

/**
 * A Nordic-style off-centre cross over a solid field.
 * `cross` is the bar colour, optional `fimbria` is a thin outline stripe.
 */
function nordicCross(field: string, cross: string, fimbria?: string): string {
  const vx = 22; // vertical bar left edge
  const vw = 8; // bar width
  const hy = 16; // horizontal bar top edge
  const parts = [bg(field)];
  if (fimbria) {
    parts.push(
      `<rect x="${vx - 2}" y="0" width="${vw + 4}" height="40" fill="${fimbria}"/>`,
      `<rect x="0" y="${hy - 2}" width="60" height="${vw + 4}" fill="${fimbria}"/>`,
    );
  }
  parts.push(
    `<rect x="${vx}" y="0" width="${vw}" height="40" fill="${cross}"/>`,
    `<rect x="0" y="${hy}" width="60" height="${vw}" fill="${cross}"/>`,
  );
  return parts.join("");
}

/** A small filled five-pointed star centred at (cx, cy) with radius r. */
function star(cx: number, cy: number, r: number, color: string): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outer = (Math.PI / 180) * (i * 72 - 90);
    const inner = (Math.PI / 180) * (i * 72 - 90 + 36);
    pts.push(`${round(cx + r * Math.cos(outer))},${round(cy + r * Math.sin(outer))}`);
    pts.push(
      `${round(cx + r * 0.4 * Math.cos(inner))},${round(cy + r * 0.4 * Math.sin(inner))}`,
    );
  }
  return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A neutral tile stamped with the uppercased code — the universal fallback. */
function neutralTile(code: string): string {
  const label = code.slice(0, 2).toUpperCase() || "?";
  return [
    `<rect width="60" height="40" fill="var(--ml-accent, #2563eb)"/>`,
    `<rect x="1" y="1" width="58" height="38" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`,
    `<text x="30" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#ffffff">${escapeText(label)}</text>`,
  ].join("");
}

/** Escape the few characters that are unsafe inside SVG markup. */
function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inner SVG markup (no `<svg>` wrapper) for each supported flag. */
const FLAG_BUILDERS: Record<string, () => string> = {
  // Germany — black/red/gold horizontal.
  DE: () => horizontal(["#000000", "#dd0000", "#ffce00"]),
  // United Kingdom — schematic Union Jack.
  GB: () =>
    [
      bg("#012169"),
      `<path d="M0 0 L60 40 M60 0 L0 40" stroke="#ffffff" stroke-width="8"/>`,
      `<path d="M0 0 L60 40 M60 0 L0 40" stroke="#c8102e" stroke-width="3"/>`,
      `<rect x="25" y="0" width="10" height="40" fill="#ffffff"/>`,
      `<rect x="0" y="15" width="60" height="10" fill="#ffffff"/>`,
      `<rect x="27" y="0" width="6" height="40" fill="#c8102e"/>`,
      `<rect x="0" y="17" width="60" height="6" fill="#c8102e"/>`,
    ].join(""),
  // United States — schematic stars and stripes.
  US: () =>
    [
      horizontal(["#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234"]),
      `<rect x="0" y="0" width="26" height="22" fill="#3c3b6e"/>`,
      ...starGrid(),
    ].join(""),
  // Spain — red/gold/red with a wide centre band.
  ES: () =>
    [
      bg("#aa151b"),
      `<rect x="0" y="10" width="60" height="20" fill="#f1bf00"/>`,
    ].join(""),
  // France — blue/white/red vertical.
  FR: () => vertical(["#0055a4", "#ffffff", "#ef4135"]),
  // Italy — green/white/red vertical.
  IT: () => vertical(["#008c45", "#ffffff", "#cd212a"]),
  // Portugal — green/red with a gold roundel.
  PT: () =>
    [
      `<rect x="0" y="0" width="24" height="40" fill="#006600"/>`,
      `<rect x="24" y="0" width="36" height="40" fill="#ff0000"/>`,
      `<circle cx="24" cy="20" r="8" fill="#ffd700" stroke="#ffffff" stroke-width="1"/>`,
      `<circle cx="24" cy="20" r="4" fill="#003399"/>`,
    ].join(""),
  // Brazil — green field, yellow diamond, blue disc.
  BR: () =>
    [
      bg("#009b3a"),
      `<polygon points="30,5 55,20 30,35 5,20" fill="#ffdf00"/>`,
      `<circle cx="30" cy="20" r="8" fill="#002776"/>`,
      `<path d="M22 18 Q30 23 38 18" stroke="#ffffff" stroke-width="1.5" fill="none"/>`,
    ].join(""),
  // Netherlands — red/white/blue horizontal.
  NL: () => horizontal(["#ae1c28", "#ffffff", "#21468b"]),
  // Sweden — blue field with a gold Nordic cross.
  SE: () => nordicCross("#006aa7", "#fecc00"),
  // Poland — white over red.
  PL: () => horizontal(["#ffffff", "#dc143c"]),
  // Turkey — red field with crescent and star.
  TR: () =>
    [
      bg("#e30a17"),
      `<circle cx="26" cy="20" r="9" fill="#ffffff"/>`,
      `<circle cx="29" cy="20" r="7.2" fill="#e30a17"/>`,
      star(40, 20, 4.5, "#ffffff"),
    ].join(""),
  // Russia — white/blue/red horizontal.
  RU: () => horizontal(["#ffffff", "#0039a6", "#d52b1e"]),
  // Ukraine — blue over yellow.
  UA: () => horizontal(["#0057b7", "#ffd700"]),
  // Saudi-style green field standing in for Arabic, with a schematic script bar.
  AR: () =>
    [
      bg("#006c35"),
      `<path d="M10 16 Q20 12 30 16 T50 16" stroke="#ffffff" stroke-width="2" fill="none"/>`,
      `<rect x="14" y="24" width="32" height="3" rx="1.5" fill="#ffffff"/>`,
    ].join(""),
  // Iran — green/white/red with a central emblem mark.
  FA: () =>
    [
      horizontal(["#239f40", "#ffffff", "#da0000"]),
      `<path d="M27 17 L33 17 L30 23 Z" fill="#da0000"/>`,
      `<rect x="29" y="13" width="2" height="6" fill="#da0000"/>`,
    ].join(""),
  // Israel — white field, two blue bars, Star of David.
  HE: () =>
    [
      bg("#ffffff"),
      `<rect x="0" y="6" width="60" height="4" fill="#0038b8"/>`,
      `<rect x="0" y="30" width="60" height="4" fill="#0038b8"/>`,
      `<polygon points="30,12 35,21 25,21" fill="none" stroke="#0038b8" stroke-width="1.8"/>`,
      `<polygon points="30,28 25,19 35,19" fill="none" stroke="#0038b8" stroke-width="1.8"/>`,
    ].join(""),
  // India — saffron/white/green with a navy wheel.
  IN: () =>
    [
      horizontal(["#ff9933", "#ffffff", "#138808"]),
      `<circle cx="30" cy="20" r="6" fill="none" stroke="#000080" stroke-width="1.2"/>`,
      ...spokes(30, 20, 6, "#000080"),
    ].join(""),
  // Telugu — Indian field with a regional accent dot (no official flag).
  TE: () =>
    [
      horizontal(["#ff9933", "#ffffff", "#138808"]),
      `<circle cx="30" cy="20" r="4" fill="#000080"/>`,
    ].join(""),
  // Tamil — red/yellow regional tile (no official flag).
  TA: () =>
    [
      bg("#d50000"),
      `<rect x="0" y="16" width="60" height="8" fill="#ffd600"/>`,
      star(30, 20, 4, "#d50000"),
    ].join(""),
  // Bengali — green field with a red disc.
  BN: () =>
    [
      bg("#006a4e"),
      `<circle cx="27" cy="20" r="9" fill="#f42a41"/>`,
    ].join(""),
  // China — red field with one large and four small gold stars.
  ZH: () =>
    [
      bg("#de2910"),
      star(13, 12, 6, "#ffde00"),
      star(25, 6, 2.2, "#ffde00"),
      star(29, 11, 2.2, "#ffde00"),
      star(29, 17, 2.2, "#ffde00"),
      star(25, 22, 2.2, "#ffde00"),
    ].join(""),
  // Japan — white field with a red disc.
  JA: () =>
    [
      bg("#ffffff"),
      `<circle cx="30" cy="20" r="11" fill="#bc002d"/>`,
    ].join(""),
  // South Korea — white field, blue/red taegeuk, schematic trigrams.
  KO: () =>
    [
      bg("#ffffff"),
      `<path d="M30 11 A9 9 0 0 1 30 29 A4.5 4.5 0 0 0 30 20 A4.5 4.5 0 0 1 30 11 Z" fill="#cd2e3a"/>`,
      `<path d="M30 29 A9 9 0 0 1 30 11 A4.5 4.5 0 0 1 30 20 A4.5 4.5 0 0 0 30 29 Z" fill="#0047a0"/>`,
      `<g stroke="#000000" stroke-width="1.2">`,
      `<line x1="10" y1="8" x2="16" y2="12"/>`,
      `<line x1="44" y1="12" x2="50" y2="8"/>`,
      `<line x1="10" y1="32" x2="16" y2="28"/>`,
      `<line x1="44" y1="28" x2="50" y2="32"/>`,
      `</g>`,
    ].join(""),
};

/** A 5×4 grid of small stars for the US canton. */
function starGrid(): string[] {
  const out: string[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      out.push(star(4 + col * 5, 4 + row * 5, 1.6, "#ffffff"));
    }
  }
  return out;
}

/** Evenly spaced radial spokes for the Indian wheel. */
function spokes(cx: number, cy: number, r: number, color: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i;
    out.push(
      `<line x1="${cx}" y1="${cy}" x2="${round(cx + r * Math.cos(a))}" y2="${round(cy + r * Math.sin(a))}" stroke="${color}" stroke-width="0.6"/>`,
    );
  }
  return out;
}

/**
 * Language primary subtag → flag-builder key, for the cases where the ISO 639
 * language code differs from the tile we draw (e.g. Swedish `sv` → Sweden `SE`,
 * Ukrainian `uk` → Ukraine `UA`, Hindi `hi` → India `IN`).
 */
const LANG_ALIAS: Record<string, string> = {
  sv: "SE",
  uk: "UA",
  hi: "IN",
};

/**
 * Map a language tag to a flag key. Region subtags win when we have a
 * region-specific tile; otherwise we fall back to the primary language.
 */
function flagKey(code: LanguageCode): string | undefined {
  const lower = code.toLowerCase();
  const [primary, region] = lower.split(/[-_]/);
  const lang = primary ?? lower;

  // Region-specific overrides.
  if (lang === "en") {
    if (region === "us" || region === "ca") return "US";
    return "GB";
  }
  if (lang === "pt") {
    if (region === "br") return "BR";
    return "PT";
  }
  if (lang === "zh") return "ZH";

  const aliased = LANG_ALIAS[lang];
  if (aliased) return aliased;

  const key = lang.toUpperCase();
  return key in FLAG_BUILDERS ? key : undefined;
}

/** The flag keys this module can draw (excludes the neutral fallback). */
export const SUPPORTED_FLAGS: readonly string[] = Object.keys(FLAG_BUILDERS);

/**
 * The language codes Mr.Latin ships hand-drawn flags for. Region-only keys
 * (US/GB/BR) are reachable via `en`, `en-US` and `pt-BR`.
 */
export const FLAGS: readonly LanguageCode[] = [
  "de",
  "en",
  "en-US",
  "es",
  "fr",
  "it",
  "pt",
  "pt-BR",
  "nl",
  "sv",
  "pl",
  "tr",
  "ru",
  "uk",
  "ar",
  "fa",
  "he",
  "hi",
  "te",
  "ta",
  "bn",
  "zh",
  "ja",
  "ko",
];

/**
 * An inline SVG string for a language's flag tile.
 *
 * Always returns a valid 60×40 `<svg role="img">` with an `aria-label` set to
 * the language's native name. Unknown languages get a neutral accent tile
 * stamped with their code, so every offered language renders something.
 */
export function flagFor(code: LanguageCode): string {
  const lower = code.toLowerCase();
  const primary = lower.split(/[-_]/)[0] ?? lower;
  const key = flagKey(code);

  const body =
    key && FLAG_BUILDERS[key]
      ? FLAG_BUILDERS[key]!()
      : neutralTile(primary || code);

  const label = escapeText(nativeLanguageName(code));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" `,
    `role="img" aria-label="${label}" `,
    `width="60" height="40" preserveAspectRatio="xMidYMid meet">`,
    body,
    `</svg>`,
  ].join("");
}
