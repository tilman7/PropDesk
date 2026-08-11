// Accounts: Tabellenzeile, Detailseite, Formular, Quick-Balance, Archiv.
import React, { useState } from 'react';
import { T, SANS, NUM, display, cap } from './theme.js';
import { h, useNarrow, inputS, numS, Label, Field, Bar, Chip, PhaseTag, DataRow, Modal, ModalHead, Btn, Ghost, Danger, SectionLabel, ColHead, Panel } from './ui.js';
import { calcAccount, fmt, fmtUsd, PRESETS, riskDefault, uid } from './lib.js';

const bufferColor = (pct) => (pct > 0.5 ? T.green : pct > 0.25 ? T.amber : T.red);
export const COLS = '1.6fr 0.8fr 0.9fr 1.5fr 0.7fr 1.1fr';

export function TableHead() {
  return h('div', { style: {
    display: 'grid', gridTemplateColumns: COLS, gap: 20,
    padding: '0 0 11px', borderBottom: `1px solid ${T.border}`,
  } },
    h(ColHead, null, 'Account'),
    h(ColHead, null, 'Phase'),
    h(ColHead, { align: 'right' }, 'Risiko / Trade'),
    h(ColHead, null, 'Puffer bis Drawdown'),
    h(ColHead, { align: 'right' }, 'Trades'),
    h(ColHead, { align: 'right' }, 'Status')
  );
}

export function AccountRow({ a, onOpen, onQuickBalance }) {
  const c = calcAccount(a);
  const bc = bufferColor(c.bufferPct);
  const narrow = useNarrow();
  const status = c.breached
    ? { text: 'Drawdown verletzt', color: T.red }
    : c.dayUnclosed
    ? { text: 'Tag offen', color: T.amber }
    : c.expiryDays !== null && c.expiryDays <= 7
      ? { text: c.expiryDays <= 0 ? 'abgelaufen' : `läuft ab in ${c.expiryDays}d`, color: T.red }
      : a.phase === 'eval' && c.passed
        ? { text: 'Target erreicht', color: T.green }
        : a.phase === 'eval' && a.activationFee && !a.activationPaid
          ? { text: `Activation ${fmtUsd(a.activationFee)}`, color: T.muted }
          : a.phase === 'eval'
            ? { text: `Target ${Math.round(c.targetProgress * 100)}%`, color: T.muted }
            : c.toSafetyNet === 0
              ? { text: 'Safety Net erreicht', color: T.green }
              : { text: `Safety Net ${fmtUsd(c.toSafetyNet)}`, color: T.muted };

  if (narrow) {
    return h('div', {
      onClick: () => onOpen(a.id),
      style: { padding: '18px 0', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer' },
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 } },
        h('div', { style: { minWidth: 0 } },
          h('div', { style: { fontSize: 15, fontWeight: 500, letterSpacing: '-0.012em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a.name),
          h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 4, ...NUM } },
            h(PhaseTag, { phase: a.phase }), ` · ${a.firm} · ${fmtUsd(a.size)}`)
        ),
        h('div', { style: { textAlign: 'right', flexShrink: 0 } },
          h('div', { style: { ...display(21) } }, fmtUsd(c.risk)),
          h('div', { style: { fontSize: 10.5, color: T.faint, marginTop: 4 } }, 'Risiko / Trade')
        )
      ),
      h('div', { style: { marginTop: 14 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, ...NUM } },
          h('span', { style: { color: bc, fontWeight: 500 } }, fmtUsd(c.buffer)),
          h('span', { style: { color: T.faint } }, `${c.lossesLeft !== null ? c.lossesLeft + ' Trades · ' : ''}von ${fmtUsd(c.trail)}`)
        ),
        h(Bar, { pct: c.bufferPct, color: bc })
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12 } },
        h('span', { style: { fontSize: 12, color: status.color, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, status.text),
        h('button', {
          onClick: (e) => { e.stopPropagation(); onQuickBalance(a.id); },
          style: {
            background: 'transparent', border: `1px solid ${T.border}`, color: T.muted,
            borderRadius: 6, fontSize: 12, padding: '6px 12px', cursor: 'pointer',
            fontFamily: SANS, flexShrink: 0,
          },
        }, 'Balance')
      )
    );
  }

  return h('div', {
    onClick: () => onOpen(a.id),
    style: {
      display: 'grid', gridTemplateColumns: COLS, gap: 20, alignItems: 'center',
      padding: '20px 0', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer',
      transition: 'background .12s',
    },
    onMouseEnter: (e) => { e.currentTarget.style.background = T.cardHover; },
    onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent'; },
  },
    h('div', { style: { minWidth: 0 } },
      h('div', { style: { fontSize: 15, fontWeight: 500, letterSpacing: '-0.012em' } }, a.name),
      h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 5, ...NUM } }, `${a.firm} · ${fmtUsd(a.size)}`)
    ),
    h('div', null, h(PhaseTag, { phase: a.phase })),
    h('div', { style: { textAlign: 'right', ...display(20) } }, fmtUsd(c.risk)),
    h('div', null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7, ...NUM } },
        h('span', { style: { color: bc, fontWeight: 500 } }, fmtUsd(c.buffer)),
        h('span', { style: { color: T.faint } }, `von ${fmtUsd(c.trail)}`)
      ),
      h(Bar, { pct: c.bufferPct, color: bc })
    ),
    h('div', { style: { textAlign: 'right', ...display(20, c.lossesLeft !== null && c.lossesLeft <= 3 ? T.red : T.text) } },
      c.lossesLeft === null ? '–' : c.lossesLeft),
    h('div', { style: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 } },
      h('span', { style: { fontSize: 12, color: status.color } }, status.text),
      h('button', {
        onClick: (e) => { e.stopPropagation(); onQuickBalance(a.id); },
        style: {
          background: 'transparent', border: `1px solid ${T.border}`, color: T.muted,
          borderRadius: 4, fontSize: 11.5, padding: '5px 10px', cursor: 'pointer', fontFamily: SANS,
        },
      }, 'Balance')
    )
  );
}

// Vollflächige Detailseite statt Dialog.
export function AccountDetail({ a, onBack, onSave, onDelete, onEdit, onDuplicate, onMoveFunded, onArchiveBlown, onCloseDay, chfRate, ledgerForAccount }) {
  const c = calcAccount(a);
  const [notes, setNotes] = useState(a.notes || '');
  const [balance, setBalance] = useState(String(a.balance));
  const [highWater, setHighWater] = useState(String(a.highWater || a.startBalance));
  const [bestDay, setBestDay] = useState(String(a.bestDayProfit || 0));
  const [paid, setPaid] = useState(!!a.activationPaid);
  const [armed, setArmed] = useState(false);
  const bc = bufferColor(c.bufferPct);

  const save = () => onSave({
    ...a,
    balance: parseFloat(balance) || 0,
    highWater: parseFloat(highWater) || 0,
    bestDayProfit: parseFloat(bestDay) || 0,
    notes,
    activationPaid: paid,
  });

  const liveField = (label, value, setter, hint) => h('div', null,
    h(Label, null, label),
    h('input', { value, onChange: (e) => setter(e.target.value), inputMode: 'decimal', style: numS() }),
    hint ? h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 7, ...NUM } }, hint) : null
  );

  return h('div', null,
    h('button', {
      onClick: onBack,
      style: {
        background: 'none', border: 'none', color: T.muted, fontSize: 13,
        cursor: 'pointer', padding: 0, fontFamily: SANS, marginBottom: 26,
      },
    }, '← Alle Accounts'),

    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' } },
      h('div', null,
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 } },
          h(PhaseTag, { phase: a.phase }),
          h('span', { style: { fontSize: 12, color: T.faint, ...NUM } }, `${a.firm} · ${fmtUsd(a.size)}`),
          c.expiryDays !== null && h(Chip, {
            color: c.expiryDays <= 3 ? T.red : c.expiryDays <= 7 ? T.amber : T.muted,
            bg: c.expiryDays <= 3 ? T.redSoft : c.expiryDays <= 7 ? T.amberSoft : T.chipBg,
          }, c.expiryDays <= 0 ? 'abgelaufen' : `${c.expiryDays}d bis Ablauf`),
          a.activationFee && !paid ? h(Chip, { color: T.muted, bg: T.chipBg }, `Activation ${fmtUsd(a.activationFee)} offen`) : null
        ),
        h('div', { style: { fontSize: 34, fontWeight: 500, letterSpacing: '-0.03em' } }, a.name)
      ),
      h('div', { style: { display: 'flex', gap: 9, flexWrap: 'wrap' } },
        h(Ghost, { onClick: () => onEdit(a.id) }, 'Bearbeiten'),
        h(Ghost, { onClick: () => onDuplicate(a.id) }, 'Duplizieren'),
        h(Danger, { armed, onClick: () => (armed ? onDelete(a.id) : setArmed(true)), onBlur: () => setArmed(false) },
          armed ? 'Wirklich löschen?' : 'Löschen')
      )
    ),

    // Kopfzahlen
    h('div', { style: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 1, background: T.border, border: `1px solid ${T.border}`, marginTop: 32,
    } },
      h('div', { style: { background: T.bg, padding: '20px 22px 22px' } },
        h(SectionLabel, null, 'Max. Risiko / Trade'),
        h('div', { style: { ...display(40), marginTop: 12 } }, fmtUsd(c.risk))
      ),
      h('div', { style: { background: T.bg, padding: '20px 22px 22px' } },
        h(SectionLabel, null, 'Puffer bis Drawdown'),
        h('div', { style: { ...display(40, bc), marginTop: 12 } }, fmtUsd(c.buffer)),
        h('div', { style: { marginTop: 14 } }, h(Bar, { pct: c.bufferPct, color: bc }))
      ),
      h('div', { style: { background: T.bg, padding: '20px 22px 22px' } },
        h(SectionLabel, null, 'Verlust-Trades bis Breach'),
        h('div', { style: { ...display(40, c.lossesLeft !== null && c.lossesLeft <= 3 ? T.red : T.text), marginTop: 12 } },
          c.lossesLeft === null ? '–' : c.lossesLeft)
      ),
      h('div', { style: { background: T.bg, padding: '20px 22px 22px' } },
        h(SectionLabel, null, 'P&L seit Start'),
        h('div', { style: { ...display(40, c.profit >= 0 ? T.green : T.red), marginTop: 12 } },
          (c.profit >= 0 ? '+' : '−') + fmtUsd(Math.abs(c.profit)))
      )
    ),

    c.dayUnclosed && h('div', { style: {
      background: T.amberSoft, border: `1px solid ${T.amber}44`, borderRadius: 6,
      padding: '16px 18px', marginTop: 20, display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', gap: 20, flexWrap: 'wrap',
    } },
      h('div', { style: { maxWidth: 620 } },
        h('div', { style: { fontSize: 13.5, color: T.amber, fontWeight: 600, marginBottom: 6 } }, 'Tag noch nicht abgeschlossen'),
        h('div', { style: { fontSize: 12.5, color: T.muted, lineHeight: 1.6, textWrap: 'pretty' } },
          `Die Balance liegt über dem höchsten EOD-Stand. Der Drawdown trailt erst beim Tagesabschluss nach — danach steht das Level bei ${fmtUsd(c.pendingDdLevel)} und der Puffer bei ${fmtUsd(c.bufferAfterClose)}.`)
      ),
      h('button', {
        onClick: () => onCloseDay(a.id, parseFloat(balance) || 0),
        style: {
          background: 'transparent', border: `1px solid ${T.amber}77`, color: T.amber, borderRadius: 6,
          padding: '11px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          fontFamily: SANS, whiteSpace: 'nowrap',
        },
      }, `Tag mit ${fmtUsd(parseFloat(balance) || 0)} abschliessen`)
    ),

    c.breached && h('div', { style: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
      background: T.redSoft, border: `1px solid ${T.red}55`, borderRadius: 6,
      padding: '16px 18px', marginTop: 20, flexWrap: 'wrap',
    } },
      h('div', { style: { minWidth: 0 } },
        h('div', { style: { fontSize: 13.5, color: T.red, fontWeight: 600 } }, 'Drawdown-Limit verletzt'),
        h('div', { style: { fontSize: 12.5, color: T.muted, marginTop: 5, lineHeight: 1.5 } },
          `Balance ${fmtUsd(c.balance)} liegt auf oder unter dem Drawdown-Level ${fmtUsd(c.ddLevel)}. Der Account ist blown.`)
      ),
      h(Btn, { onClick: () => onArchiveBlown(a.id), style: { background: T.red, borderColor: T.red, color: '#fff' } },
        'Als Blown archivieren')
    ),

    a.phase === 'eval' && c.passed && !c.breached && h('div', { style: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
      background: T.greenSoft, border: `1px solid ${T.green}44`, borderRadius: 6,
      padding: '16px 18px', marginTop: 20, flexWrap: 'wrap',
    } },
      h('div', { style: { fontSize: 13.5, color: T.green, fontWeight: 600 } }, 'Profit-Target erreicht'),
      h(Btn, { onClick: () => onMoveFunded(a.id), style: { background: T.green, borderColor: T.green, color: '#fff' } },
        'In Funded überführen')
    ),

    // Zwei Spalten: Werte links, Eingabe/Notizen rechts
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 44, marginTop: 44 } },
      h('div', null,
        h(SectionLabel, { style: { marginBottom: 6 } }, 'Regelwerk'),
        h(DataRow, { label: `Drawdown-Level ${c.ddLocked ? '(gelockt)' : '(EOD trailing)'}`, value: fmtUsd(c.ddLevel) }),
        h(DataRow, { label: 'Höchster EOD-Stand', value: fmtUsd(c.highWater) }),
        h(DataRow, { label: 'Trailing Drawdown', value: fmtUsd(c.trail) }),
        a.dll ? h(DataRow, { label: 'Daily Loss Limit', value: fmtUsd(a.dll) }) : null,
        a.phase === 'eval' && h(DataRow, { label: 'Profit-Target', value: `${fmtUsd(c.profit)} / ${fmtUsd(c.target)}` }),
        a.phase === 'eval' && h(DataRow, { label: 'Bis Profit-Target', value: fmtUsd(c.toTarget) }),
        a.phase !== 'eval' && h(React.Fragment, null,
          h(DataRow, {
            label: `Safety Net (Payout ab ${fmtUsd(c.safetyNet)})`,
            value: c.toSafetyNet === 0 ? 'erreicht' : `noch ${fmtUsd(c.toSafetyNet)}`,
            color: c.toSafetyNet === 0 ? T.green : T.text,
          }),
          h(DataRow, {
            label: `Konsistenz (max. ${a.consistencyPct || 50}% / Tag)`,
            value: c.consistencyKnown ? (c.consistencyOk ? 'OK' : 'verletzt') : 'kein Wert erfasst',
            color: c.consistencyKnown ? (c.consistencyOk ? T.green : T.red) : T.amber,
          }),
          h(DataRow, { label: 'Max. erlaubter Tagesprofit aktuell', value: fmtUsd(c.maxAllowedDay) }),
          c.consistencyKnown && !c.consistencyOk && h(DataRow, {
            label: 'Gesamtprofit nötig f. Konsistenz', value: fmtUsd(c.neededProfitForConsistency), color: T.amber,
          })
        ),
        a.activationFee ? h(DataRow, {
          label: 'Activation Fee', value: `${fmtUsd(a.activationFee)} · ${paid ? 'bezahlt' : 'offen'}`,
          color: paid ? T.green : T.amber,
        }) : null,
        a.expiryDate ? h(DataRow, {
          label: 'Account läuft ab am', value: a.expiryDate,
          color: c.expiryDays !== null && c.expiryDays <= 7 ? T.amber : T.text,
        }) : null,
        a.maxContracts ? h(DataRow, { label: 'Max. Kontrakte', value: a.maxContracts }) : null,

        ledgerForAccount && (ledgerForAccount.spent > 0 || ledgerForAccount.received > 0) && h('div', { style: { marginTop: 36 } },
          h(SectionLabel, { style: { marginBottom: 6 } }, 'Zahlungen zu diesem Account'),
          h(DataRow, { label: 'Kosten', value: fmt(ledgerForAccount.spent), color: T.red }),
          h(DataRow, { label: 'Payouts', value: fmt(ledgerForAccount.received), color: T.green }),
          h(DataRow, {
            label: 'Netto',
            value: (ledgerForAccount.received - ledgerForAccount.spent >= 0 ? '+' : '−') +
              fmt(Math.abs(ledgerForAccount.received - ledgerForAccount.spent)),
            color: ledgerForAccount.received - ledgerForAccount.spent >= 0 ? T.green : T.red,
          })
        )
      ),

      h('div', null,
        h(SectionLabel, { style: { marginBottom: 14 } }, 'Laufende Werte'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 } },
          liveField('Balance live (USD)', balance, setBalance),
          liveField('Höchster EOD-Stand (USD)', highWater, setHighWater),
          liveField('Bester Tag (USD)', bestDay, setBestDay)
        ),

        a.activationFee ? h('label', { style: {
          display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: T.muted,
          margin: '22px 0 4px', cursor: 'pointer',
        } },
          h('input', { type: 'checkbox', checked: paid, onChange: (e) => setPaid(e.target.checked), style: { accentColor: T.accent } }),
          'Activation Fee bezahlt'
        ) : null,

        h(Field, { label: 'Notizen', style: { marginTop: 22 } },
          h('textarea', {
            value: notes, onChange: (e) => setNotes(e.target.value), rows: 6,
            style: { ...inputS(), resize: 'vertical', lineHeight: 1.6 },
            placeholder: 'Regeln, Payout-Plan, Erinnerungen …',
          })
        ),

        h(Btn, { onClick: save, style: { width: '100%' } }, 'Änderungen speichern')
      )
    )
  );
}

export function AccountForm({ initial, onClose, onSubmit, chfRate }) {
  const [f, setF] = useState(initial || {
    name: '', firm: 'Apex', size: 50000, phase: 'eval',
    startBalance: 50000, balance: 50000, highWater: 50000,
    trail: 2000, target: 3000, dll: 1000, riskPerTrade: riskDefault('eval'),
    maxContracts: 6, consistencyPct: 50, bestDayProfit: 0,
    activationFee: 99, activationPaid: false, expiryDate: '', notes: '',
  });
  const [more, setMore] = useState(!!initial);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === '' ? '' : parseFloat(e.target.value));

  const setPhase = (phase) => setF((s) => {
    const wasDefault = Number(s.riskPerTrade) === riskDefault(s.phase);
    return { ...s, phase, riskPerTrade: wasDefault ? riskDefault(phase) : s.riskPerTrade };
  });

  const applyPreset = (p) => setF((s) => {
    const untouched = Number(s.balance) === Number(s.startBalance);
    return {
      ...s,
      size: p.size, startBalance: p.size,
      balance: untouched ? p.size : s.balance,
      highWater: Math.max(p.size, Number(s.balance) || 0),
      trail: p.trail, target: p.target, dll: p.dll,
      maxContracts: s.phase === 'eval' ? p.contracts : p.paContracts,
      activationFee: p.activationFee,
      name: s.name || `Apex ${p.label}`,
    };
  });

  const seg = (id, label) => h('button', {
    key: id, onClick: () => setPhase(id),
    style: {
      flex: 1, background: f.phase === id ? T.chipBg : 'transparent',
      border: `1px solid ${f.phase === id ? T.text : T.border}`,
      color: f.phase === id ? T.text : T.muted, borderRadius: 6, padding: '10px 0',
      fontSize: 13, fontWeight: f.phase === id ? 500 : 400, cursor: 'pointer', fontFamily: SANS,
    },
  }, label);

  const two = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' };

  return h(Modal, { onClose, max: 620, z: 60 },
    h(ModalHead, {
      title: initial ? 'Account bearbeiten' : 'Account anlegen',
      subtitle: initial ? null : 'Preset wählen — Name und Risiko prüfen. Alles Weitere ist optional.',
      onClose,
    }),

    !initial && h(Field, { label: 'Apex EOD-Preset' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
        PRESETS.map((p) => h('button', {
          key: p.label, onClick: () => applyPreset(p),
          style: {
            background: Number(f.size) === p.size ? T.chipBg : 'transparent',
            border: `1px solid ${Number(f.size) === p.size ? T.text : T.border}`,
            color: T.text, borderRadius: 6, padding: '9px 15px', fontSize: 13,
            cursor: 'pointer', fontFamily: SANS, ...NUM,
          },
        }, p.label))
      )
    ),

    h(Field, { label: 'Phase' },
      h('div', { style: { display: 'flex', gap: 8 } }, seg('eval', 'Evaluation'), seg('pa', 'PA / Funded'), seg('live', 'Live'))
    ),

    h('div', { style: two },
      h(Field, { label: 'Name' },
        h('input', { value: f.name, onChange: (e) => set('name', e.target.value), style: inputS(), placeholder: 'z. B. Apex 50K #1' })),
      h(Field, { label: `Max. Risiko pro Trade (USD) · Standard $${riskDefault(f.phase)}` },
        h('input', { type: 'number', value: f.riskPerTrade, onChange: num('riskPerTrade'), style: { ...numS(), borderColor: T.text } })),
      h(Field, { label: 'Aktuelle Balance (USD)' },
        h('input', { type: 'number', value: f.balance, onChange: num('balance'), style: numS() })),
      h(Field, { label: 'Account läuft ab am' },
        h('input', { type: 'date', value: f.expiryDate || '', onChange: (e) => set('expiryDate', e.target.value), style: inputS() }))
    ),

    h('button', {
      onClick: () => setMore(!more),
      style: {
        background: 'none', border: 'none', color: T.muted, fontSize: 12.5, cursor: 'pointer',
        padding: 0, fontFamily: SANS, margin: '2px 0 18px', borderBottom: `1px solid ${T.border}`,
      },
    }, more ? 'Weitere Werte ausblenden' : 'Weitere Werte (Drawdown, Target, Fees, Kontrakte)'),

    more && h('div', null,
      h('div', { style: two },
        h(Field, { label: 'Firm' },
          h('input', { value: f.firm, onChange: (e) => set('firm', e.target.value), style: inputS() })),
        h(Field, { label: 'Account-Grösse (USD)' },
          h('input', { type: 'number', value: f.size, onChange: num('size'), style: numS() })),
        h(Field, { label: 'Start-Balance (USD)' },
          h('input', { type: 'number', value: f.startBalance, onChange: num('startBalance'), style: numS() })),
        h(Field, { label: 'Höchster EOD-Stand (USD)' },
          h('input', { type: 'number', value: f.highWater, onChange: num('highWater'), style: numS() })),
        h(Field, { label: 'Trailing Drawdown (USD)' },
          h('input', { type: 'number', value: f.trail, onChange: num('trail'), style: numS() })),
        h(Field, { label: 'Daily Loss Limit (USD)' },
          h('input', { type: 'number', value: f.dll, onChange: num('dll'), style: numS() })),
        h(Field, { label: 'Profit-Target (USD, Eval)' },
          h('input', { type: 'number', value: f.target, onChange: num('target'), style: numS() })),
        h(Field, { label: 'Konsistenz-Regel (%, PA)' },
          h('input', { type: 'number', value: f.consistencyPct, onChange: num('consistencyPct'), style: numS() })),
        h(Field, { label: 'Max. Kontrakte' },
          h('input', { type: 'number', value: f.maxContracts, onChange: num('maxContracts'), style: numS() })),
        h(Field, { label: 'Activation Fee (USD)' },
          h('input', { type: 'number', value: f.activationFee, onChange: num('activationFee'), style: numS() }),
          null)
      ),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: T.muted, margin: '2px 0 18px', cursor: 'pointer' } },
        h('input', { type: 'checkbox', checked: !!f.activationPaid, onChange: (e) => set('activationPaid', e.target.checked), style: { accentColor: T.accent } }),
        'Activation Fee bereits bezahlt'
      ),
      h(Field, { label: 'Notizen' },
        h('textarea', { value: f.notes, onChange: (e) => set('notes', e.target.value), rows: 2, style: { ...inputS(), resize: 'vertical', lineHeight: 1.55 } }))
    ),

    h('div', { style: { display: 'flex', gap: 10, marginTop: 6 } },
      h(Btn, {
        style: { flex: 1 },
        onClick: () => onSubmit({
          ...f, id: f.id || uid(),
          highWater: Math.max(Number(f.highWater) || 0, Number(f.startBalance) || 0),
        }),
      }, initial ? 'Änderungen speichern' : 'Account anlegen'),
      h(Ghost, { onClick: onClose, style: { color: T.muted } }, 'Abbrechen')
    )
  );
}

export function QuickBalance({ a, onClose, onSave }) {
  const [v, setV] = useState(String(a.balance));
  return h(Modal, { onClose, max: 360, z: 70, center: true },
    h('div', { style: { fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' } }, a.name),
    h('div', { style: { fontSize: 12.5, color: T.muted, margin: '6px 0 18px' } }, 'Neue Balance eintragen'),
    h('input', {
      autoFocus: true, value: v, onChange: (e) => setV(e.target.value), inputMode: 'decimal',
      onKeyDown: (e) => e.key === 'Enter' && onSave(parseFloat(v) || 0, false),
      style: { ...numS(), fontSize: 22, fontWeight: 500, letterSpacing: '-0.03em', padding: '14px', marginBottom: 12 },
    }),
    h(Btn, { style: { width: '100%', marginBottom: 8 }, onClick: () => onSave(parseFloat(v) || 0, false) }, 'Speichern'),
    h(Ghost, {
      onClick: () => onSave(parseFloat(v) || 0, true),
      style: { width: '100%', color: T.muted, padding: '11px 0', fontSize: 12.5 },
    }, 'Speichern & Tag abschliessen')
  );
}

// Archiv als eigener Bereich, nicht als Dialog.
export function ArchiveView({ archived, onRestore, onDelete }) {
  const [armed, setArmed] = useState(null);
  const narrow = useNarrow();
  if (archived.length === 0) {
    return h('div', { style: { fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 460, paddingTop: 40, textWrap: 'pretty' } },
      'Noch keine archivierten Accounts. Bestandene Evaluations landen hier automatisch, sobald du sie in Funded überführst.');
  }
  return h('div', null,
    narrow ? null : h('div', { style: {
      display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.8fr 1.2fr', gap: 20,
      padding: '0 0 11px', borderBottom: `1px solid ${T.border}`, ...cap(T.faint),
    } },
      h('div', null, 'Account'), h('div', null, 'Phase'),
      h('div', { style: { textAlign: 'right' } }, 'P&L'),
      h('div', { style: { textAlign: 'right' } }, 'Archiviert'),
      h('div', { style: { textAlign: 'right' } }, '')
    ),
    archived.map((a) => {
      const c = calcAccount(a);
      return h('div', {
        key: a.id,
        style: narrow
          ? { display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 14px', alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${T.borderSoft}` }
          : { display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.8fr 1.2fr', gap: 20,
              alignItems: 'center', padding: '18px 0', borderBottom: `1px solid ${T.borderSoft}` },
      },
        h('div', null,
          h('div', { style: { fontSize: 14.5, fontWeight: 500 } }, a.name),
          h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 4, ...NUM } }, `${a.firm} · ${fmtUsd(a.size)}`)
        ),
        h('div', null,
          a.archivedAs === 'blown'
            ? h('span', { style: { fontSize: 12, fontWeight: 500, color: T.red } }, 'Blown')
            : h('span', { style: { fontSize: 12, fontWeight: 500, color: T.green } }, 'Bestanden')
        ),
        h('div', { style: { textAlign: 'right', fontSize: 14, fontWeight: 500, color: c.profit >= 0 ? T.green : T.red, ...NUM } },
          (c.profit >= 0 ? '+' : '−') + fmtUsd(Math.abs(c.profit))),
        h('div', { style: { textAlign: 'right', fontSize: 12, color: T.faint, ...NUM } },
          a.archivedAt ? new Date(a.archivedAt).toLocaleDateString('de-CH') : '–'),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
          h(Ghost, { onClick: () => onRestore(a.id), style: { padding: '8px 13px', fontSize: 12.5 } }, 'Wiederherstellen'),
          h(Danger, {
            armed: armed === a.id,
            onClick: () => (armed === a.id ? onDelete(a.id) : setArmed(a.id)),
            onBlur: () => setArmed(null),
            style: { padding: '8px 13px', fontSize: 12.5 },
          }, armed === a.id ? 'Sicher?' : 'Löschen')
        )
      );
    })
  );
}
