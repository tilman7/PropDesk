// RiskDesk v9 — Farbtokens.
// Richtung "Raster": neutrales Grau, eine einzige Akzentfarbe, Semantik nur für
// gut / warnend / kritisch. Keine Gradienten, keine Leuchtfarben.

export const dark = {
  bg: '#0D0D0D',
  surface: '#161616',
  card: '#161616',
  border: '#2A2A2A',
  borderSoft: '#1F1F1F',
  accent: '#7A9BFF',
  accentSoft: 'rgba(122,155,255,0.13)',
  green: '#5FBF92',
  greenSoft: 'rgba(95,191,146,0.13)',
  red: '#F0705A',
  redSoft: 'rgba(240,112,90,0.13)',
  amber: '#DFAE4B',
  amberSoft: 'rgba(223,174,75,0.13)',
  text: '#F2F2F0',
  muted: '#A0A09C',
  faint: '#6E6E6A',
  ink: '#F2F2F0',
  onInk: '#0D0D0D',
  cardHover: '#1B1B1B',
  chipBg: 'rgba(255,255,255,0.05)',
  barTrack: 'rgba(255,255,255,0.09)',
  overlay: 'rgba(0,0,0,0.66)',
  headerBg: 'rgba(13,13,13,0.92)',
  menuShadow: '0 20px 60px rgba(0,0,0,0.6)',
  scheme: 'dark',
};

export const light = {
  bg: '#F2F2F0',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#D8D8D4',
  borderSoft: '#E8E8E5',
  accent: '#1F4FD8',
  accentSoft: 'rgba(31,79,216,0.09)',
  green: '#1C6B4B',
  greenSoft: 'rgba(28,107,75,0.10)',
  red: '#B2301F',
  redSoft: 'rgba(178,48,31,0.09)',
  amber: '#8A6408',
  amberSoft: 'rgba(138,100,8,0.11)',
  text: '#141414',
  muted: '#5E5E5C',
  faint: '#93938F',
  ink: '#141414',
  onInk: '#FFFFFF',
  cardHover: '#FAFAF9',
  chipBg: 'rgba(20,20,20,0.05)',
  barTrack: 'rgba(20,20,20,0.10)',
  overlay: 'rgba(20,20,20,0.32)',
  headerBg: 'rgba(242,242,240,0.92)',
  menuShadow: '0 20px 60px rgba(0,0,0,0.14)',
  scheme: 'light',
};

// Mutables Token-Objekt: Komponenten lesen immer den aktuellen Stand.
export const T = { ...dark };

export function applyTheme(mode) {
  Object.assign(T, mode === 'light' ? light : dark);
  try {
    document.body.style.background = T.bg;
    document.documentElement.style.colorScheme = T.scheme;
  } catch {}
}

// Systemschrift, keine Web-Fonts: die Seite bleibt offline vollständig lauffähig.
export const SANS = "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', system-ui, sans-serif";

// Tabellenziffern für alles Zahlenhafte.
export const NUM = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' };

// Grosse Zahl: eng gesetzt, mittlere Strichstärke.
export const display = (size, color) => ({
  fontSize: size,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: size >= 40 ? '-0.045em' : '-0.03em',
  color,
  ...NUM,
});

// Kleines Grossbuchstaben-Label über jedem Wert.
export const cap = (color) => ({
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color,
});
