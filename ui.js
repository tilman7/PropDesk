// Basisbausteine. Raster, Haarlinien, tabellarische Zahlen. Radien klein (6px).
import React from 'react';
import { T, SANS, NUM, display, cap } from './theme.js';

export const h = React.createElement;

export const inputS = () => ({
  width: '100%', boxSizing: 'border-box',
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 6, color: T.text, padding: '11px 12px',
  fontSize: 14, fontFamily: SANS, outline: 'none',
});
export const numS = () => ({ ...inputS(), ...NUM });

export function Label({ children, style }) {
  return h('div', { style: { ...cap(T.faint), marginBottom: 7, ...style } }, children);
}

export function Field({ label, children, style }) {
  return h('div', { style: { marginBottom: 16, ...style } }, h(Label, null, label), children);
}

export function Bar({ pct, color, height = 3 }) {
  return h('div', { style: { background: T.barTrack, height, overflow: 'hidden' } },
    h('div', { style: {
      width: `${Math.round((pct || 0) * 100)}%`, background: color, height: '100%',
      transition: 'width .5s cubic-bezier(.2,.8,.2,1)',
    } })
  );
}

export function Chip({ children, color, bg }) {
  return h('span', { style: {
    fontFamily: SANS, fontSize: 11, fontWeight: 500, color, background: bg,
    padding: '4px 9px', borderRadius: 4, whiteSpace: 'nowrap', ...NUM,
  } }, children);
}

export function PhaseTag({ phase }) {
  const map = {
    eval: { label: 'Evaluation', c: T.amber },
    pa: { label: 'Funded', c: T.accent },
    live: { label: 'Live', c: T.green },
  };
  const p = map[phase] || map.eval;
  return h('span', { style: { fontSize: 12, fontWeight: 500, color: p.c } }, p.label);
}

// Haarlinien-Zeile: Beschriftung links, Wert rechts.
export function DataRow({ label, value, color }) {
  return h('div', { style: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '13px 0', borderBottom: `1px solid ${T.borderSoft}`, gap: 16,
  } },
    h('span', { style: { fontSize: 13, color: T.muted, lineHeight: 1.45 } }, label),
    h('span', { style: { fontSize: 14, fontWeight: 500, color: color || T.text, textAlign: 'right', whiteSpace: 'nowrap', ...NUM } }, value)
  );
}

export function MetricRow({ label, value, hint, color }) {
  return h('div', { style: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 16, padding: '14px 0', borderBottom: `1px solid ${T.borderSoft}`,
  } },
    h('div', { style: { minWidth: 0 } },
      h('div', { style: { fontSize: 13, color: T.text } }, label),
      hint && h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 4 } }, hint)
    ),
    h('div', { style: { fontSize: 14.5, fontWeight: 500, color: color || T.text, whiteSpace: 'nowrap', ...NUM } }, value)
  );
}

export function Panel({ children, style }) {
  return h('div', { style: { background: T.card, border: `1px solid ${T.border}`, ...style } }, children);
}

export function SectionLabel({ children, style }) {
  return h('div', { style: { ...cap(T.faint), ...style } }, children);
}

// Kennzahlenraster: Zellen durch Haarlinien getrennt, kein Kartenteppich.
export function Grid({ children, min = 150, style }) {
  return h('div', { style: {
    display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 1, background: T.border, border: `1px solid ${T.border}`, ...style,
  } }, children);
}

export function Cell({ label, value, sub, color, bg }) {
  return h('div', { style: { background: bg || T.bg, padding: '15px 17px 17px', minWidth: 0 } },
    h(SectionLabel, null, label),
    h('div', { style: { ...display(20, color || T.text), marginTop: 9 } }, value),
    sub && h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sub)
  );
}

export function Modal({ children, onClose, max = 560, z = 50, center = false }) {
  return h('div', {
    onClick: onClose,
    style: {
      position: 'fixed', inset: 0, background: T.overlay, backdropFilter: 'blur(4px)',
      zIndex: z, display: 'flex', justifyContent: 'center',
      alignItems: center ? 'center' : 'flex-start', overflowY: 'auto',
      padding: center ? 16 : '40px 16px',
    },
  },
    h('div', {
      onClick: (e) => e.stopPropagation(),
      style: {
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
        width: '100%', maxWidth: max, padding: 28, boxShadow: T.menuShadow,
      },
    }, children)
  );
}

export function ModalHead({ title, subtitle, onClose }) {
  return h('div', { style: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: subtitle ? 18 : 22, gap: 16,
  } },
    h('div', null,
      h('div', { style: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' } }, title),
      subtitle && h('div', { style: { fontSize: 12.5, color: T.faint, marginTop: 7, lineHeight: 1.5 } }, subtitle)
    ),
    h('button', {
      onClick: onClose, 'aria-label': 'Schliessen',
      style: {
        background: 'none', border: 'none', color: T.muted, fontSize: 20,
        cursor: 'pointer', lineHeight: 1, padding: '2px 0 0', fontFamily: SANS,
      },
    }, '×')
  );
}

export function Btn({ children, onClick, disabled, style }) {
  return h('button', {
    onClick, disabled,
    style: {
      background: T.ink, border: `1px solid ${T.ink}`, color: T.onInk, borderRadius: 6,
      padding: '12px 18px', fontWeight: 500, fontSize: 13.5, cursor: disabled ? 'default' : 'pointer',
      fontFamily: SANS, opacity: disabled ? 0.4 : 1, ...style,
    },
  }, children);
}

export function Ghost({ children, onClick, style, title }) {
  return h('button', {
    onClick, title,
    style: {
      background: 'transparent', border: `1px solid ${T.border}`, color: T.text, borderRadius: 6,
      padding: '12px 16px', fontSize: 13, cursor: 'pointer', fontFamily: SANS, ...style,
    },
  }, children);
}

export function Danger({ children, armed, onClick, onBlur, style }) {
  return h('button', {
    onClick, onBlur,
    style: {
      background: armed ? T.red : 'transparent', border: `1px solid ${armed ? T.red : T.border}`,
      color: armed ? '#fff' : T.red, borderRadius: 6, padding: '12px 15px', fontSize: 13,
      cursor: 'pointer', fontWeight: armed ? 600 : 400, fontFamily: SANS,
      transition: 'background .15s', ...style,
    },
  }, children);
}

export function IconBtn({ children, onClick, title }) {
  return h('button', {
    onClick, title, 'aria-label': title,
    style: {
      background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6,
      width: 32, height: 32, fontSize: 13, cursor: 'pointer', fontFamily: SANS,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
  }, children);
}

export function Empty({ title, hint, action }) {
  return h('div', { style: { padding: '80px 0 0', maxWidth: 420 } },
    h('div', { style: { ...display(30, T.text), marginBottom: 14 } }, title),
    h('div', { style: { fontSize: 14, lineHeight: 1.7, color: T.muted, marginBottom: 26, textWrap: 'pretty' } }, hint),
    action
  );
}

// Bildmarke: Ring als Skala, Bogen als gefüllter Puffer.
export function Mark({ size = 20, color, track }) {
  return h('svg', {
    width: size, height: size, viewBox: '0 0 40 40', fill: 'none',
    'aria-hidden': 'true', style: { display: 'block', flexShrink: 0 },
  },
    h('circle', { cx: 20, cy: 20, r: 15, stroke: track || T.border, strokeWidth: 4 }),
    h('path', { d: 'M20 5A15 15 0 0 1 30.61 30.61', stroke: color || T.text, strokeWidth: 4, strokeLinecap: 'round' })
  );
}

// Spaltenkopf der Account-Tabelle.
export function ColHead({ children, align }) {
  return h('div', { style: { ...cap(T.faint), textAlign: align || 'left' } }, children);
}
