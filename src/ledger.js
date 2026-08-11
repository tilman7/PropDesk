// Finanzen: Kennzahlen, Monatschart, Kategorien, Zahlungsliste, Zahlungsformular.
import React, { useState, useMemo } from 'react';
import { T, SANS, NUM, display, cap } from './theme.js';
import { h, useNarrow, inputS, numS, Label, Field, Bar, Modal, ModalHead, Btn, Ghost, Danger, SectionLabel, MetricRow, Empty } from './ui.js';
import { calcLedger, fileToDoc, humanBytes, openDoc, curCode, toInput, fromInput, fmt, fmtAlt, approxCHF, fmtPct, journalStats, CATEGORIES, catLabel, monthKey, monthLabel, today, uid } from './lib.js';

const GUTTER = 64;

// Payouts über der Achse, Kosten darunter, kumulierte Netto-Linie darüber.
// Unter der Zeitachse liegt die manuell gepflegte Journal-Rendite.
function MonthChart({ byMonth, months, monthly = {}, onSetMonthly }) {
  const keys = months.slice(-12);
  const max = Math.max(1, ...keys.map((k) => Math.max(byMonth[k].spent, byMonth[k].received)));
  const H = 92;
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  let run = 0;
  const cum = keys.map((k) => (run += byMonth[k].received - byMonth[k].spent));
  const cMax = Math.max(1, ...cum.map(Math.abs));
  const pt = (v, i) => {
    const x = keys.length === 1 ? 50 : (i / (keys.length - 1)) * 100;
    const y = 50 - (v / cMax) * 46;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };
  const line = cum.map(pt).join(' ');
  const area = `0,50 ${line} 100,50`;

  const gridline = (top, strong) => h('div', {
    key: 't' + top,
    style: { position: 'absolute', left: 0, right: 0, top, height: 1, background: strong ? T.border : T.borderSoft },
  });

  const commitDraft = (k) => {
    const v = String(draft).trim().replace(',', '.');
    onSetMonthly(k, v === '' ? null : parseFloat(v));
    setEditing(null);
  };

  return h('div', { style: { padding: '24px 26px 18px' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22, gap: 20, flexWrap: 'wrap' } },
      h(SectionLabel, null, `Monatsverlauf · ${keys.length} Monate`),
      h('div', { style: { display: 'flex', gap: 16, fontSize: 11.5, color: T.faint } },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          h('span', { style: { width: 9, height: 9, background: T.green } }), 'Payouts'),
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          h('span', { style: { width: 9, height: 9, background: T.red } }), 'Kosten'),
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          h('span', { style: { width: 12, height: 2, background: T.accent } }), 'Netto kumuliert')
      )
    ),

    h('div', { style: { display: 'flex' } },
      h('div', { style: { width: GUTTER, position: 'relative', height: 2 * H, flexShrink: 0 } },
        h('div', { style: { position: 'absolute', top: -6, right: 12, fontSize: 10.5, color: T.faint, ...NUM } }, fmt(max)),
        h('div', { style: { position: 'absolute', top: H - 7, right: 12, fontSize: 10.5, color: T.muted, ...NUM } }, '0'),
        h('div', { style: { position: 'absolute', top: 2 * H - 13, right: 12, fontSize: 10.5, color: T.faint, ...NUM } }, fmt(max))
      ),

      h('div', { style: { flex: 1, position: 'relative', height: 2 * H, minWidth: 0 } },
        gridline(0, false), gridline(H / 2, false), gridline(H, true),
        gridline(H + H / 2, false), gridline(2 * H - 1, false),

        h('div', { style: { position: 'absolute', inset: 0, display: 'flex', gap: 4 } },
          keys.map((k) => {
            const m = byMonth[k];
            const net = m.received - m.spent;
            return h('div', {
              key: k,
              title: `${monthLabel(k)} · Payouts ${fmt(m.received)} · Kosten ${fmt(m.spent)} · Netto ${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}`,
              style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
            },
              h('div', { style: { height: H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' } },
                h('div', { style: { width: '58%', maxWidth: 22, height: Math.max(m.received ? 2 : 0, (m.received / max) * H), background: T.green } })),
              h('div', { style: { height: H, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' } },
                h('div', { style: { width: '58%', maxWidth: 22, height: Math.max(m.spent ? 2 : 0, (m.spent / max) * H), background: T.red, opacity: 0.9 } }))
            );
          })
        ),

        h('svg', {
          viewBox: '0 0 100 100', preserveAspectRatio: 'none',
          style: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
        },
          h('polygon', { points: area, fill: T.accentSoft }),
          h('polyline', { points: line, fill: 'none', stroke: T.accent, strokeWidth: 1.8, vectorEffect: 'non-scaling-stroke', strokeLinejoin: 'round', strokeLinecap: 'round' })
        )
      )
    ),

    h('div', { style: { display: 'flex', marginTop: 9 } },
      h('div', { style: { width: GUTTER, flexShrink: 0 } }),
      h('div', { style: { flex: 1, display: 'flex', gap: 4, minWidth: 0 } },
        keys.map((k) => h('div', {
          key: k,
          style: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10, color: T.faint, whiteSpace: 'nowrap', ...NUM },
        }, monthLabel(k)))
      )
    ),

    // Journal-Rendite: Zelle anklicken und eintragen
    h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 14, borderTop: `1px solid ${T.borderSoft}`, paddingTop: 12 } },
      h('div', { style: { width: GUTTER, flexShrink: 0, paddingRight: 12, textAlign: 'right', fontSize: 10, color: T.faint } }, 'Journal'),
      h('div', { style: { flex: 1, display: 'flex', gap: 4, minWidth: 0 } },
        keys.map((k) => {
          const v = monthly[k];
          const has = v !== undefined && v !== null && v !== '' && !isNaN(v);
          if (editing === k) {
            return h('input', {
              key: k, autoFocus: true, value: draft,
              onChange: (e) => setDraft(e.target.value),
              onBlur: () => commitDraft(k),
              onKeyDown: (e) => { if (e.key === 'Enter') commitDraft(k); if (e.key === 'Escape') setEditing(null); },
              inputMode: 'decimal', placeholder: '%',
              style: {
                flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box', textAlign: 'center',
                background: T.surface, border: `1px solid ${T.accent}`, borderRadius: 4,
                color: T.text, fontSize: 11.5, padding: '4px 2px', fontFamily: SANS, outline: 'none', ...NUM,
              },
            });
          }
          return h('button', {
            key: k,
            onClick: () => { setDraft(has ? String(v) : ''); setEditing(k); },
            title: `${monthLabel(k)} · Journal-Rendite eintragen`,
            style: {
              flex: 1, minWidth: 0, background: 'transparent', border: '1px solid transparent',
              borderRadius: 4, cursor: 'pointer', fontFamily: SANS, padding: '4px 2px',
              fontSize: 11.5, fontWeight: has ? 500 : 400,
              color: has ? (Number(v) >= 0 ? T.green : T.red) : T.faint, ...NUM,
            },
            onMouseEnter: (e) => { e.currentTarget.style.borderColor = T.border; },
            onMouseLeave: (e) => { e.currentTarget.style.borderColor = 'transparent'; },
          }, has ? fmtPct(v) : '·');
        })
      )
    )
  );
}

function TxRow({ t, account, onEdit }) {
  const isPayout = t.type === 'payout';
  const narrow = useNarrow();
  return h('div', {
    onClick: () => onEdit(t.id),
    style: {
      display: 'grid', gridTemplateColumns: narrow ? '1fr auto' : '1.6fr 1fr 0.8fr', gap: narrow ? 12 : 20, alignItems: 'center',
      padding: '14px 0', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer',
    },
    onMouseEnter: (e) => { e.currentTarget.style.background = T.cardHover; },
    onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent'; },
  },
    h('div', { style: { minWidth: 0 } },
      h('div', { style: { fontSize: 13.5, color: T.text } },
        catLabel(isPayout ? 'payout' : t.category),
        t.doc ? h('span', { title: t.doc.name, style: { color: T.faint, marginLeft: 6 } }, '◫') : null,
        isPayout && !t.doc ? h('span', { style: { color: T.red, marginLeft: 6, fontSize: 11.5 } }, 'Nachweis fehlt') : null,
        t.note ? h('span', { style: { color: T.faint } }, ' · ' + t.note) : null),
      h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...NUM } },
        t.date + (narrow && (account || t.firm) ? ' · ' + (account ? account.name : t.firm) : ''))
    ),
    narrow ? null : h('div', { style: { fontSize: 12, color: T.muted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      account ? account.name : t.firm || ''),
    h('div', { style: { textAlign: 'right', fontSize: 15, fontWeight: 500, color: isPayout ? T.green : T.text, ...NUM } },
      (isPayout ? '+' : '−') + fmt(Math.abs(Number(t.amount) || 0)))
  );
}

export function Ledger({ transactions, accounts, monthly, onSetMonthly, onAdd, onEdit, chfRate }) {
  const narrow = useNarrow();
  const l = useMemo(() => calcLedger(transactions, accounts), [transactions, accounts]);
  const j = useMemo(() => journalStats(monthly), [monthly]);
  const [filter, setFilter] = useState('all');

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id > a.id ? 1 : -1)),
    [transactions]
  ).filter((t) => (filter === 'all' ? true : filter === 'payout' ? t.type === 'payout' : t.type === 'expense'));

  const groups = useMemo(() => {
    const g = {};
    for (const t of sorted) (g[monthKey(t.date) || '—'] = g[monthKey(t.date) || '—'] || []).push(t);
    return g;
  }, [sorted]);

  if (transactions.length === 0) {
    return h(Empty, {
      title: 'Noch keine Zahlungen erfasst',
      hint: 'Trage jede Eval-Gebühr, jeden Reset und jeden Payout ein. Danach siehst du schwarz auf weiss, ob die Prop-Firmen dich Geld kosten oder verdienen.',
      action: h(Btn, { onClick: () => onAdd('expense') }, 'Erste Ausgabe erfassen'),
    });
  }

  const netColor = l.net >= 0 ? T.green : T.red;
  const cover = l.spent > 0 ? Math.min(1, l.received / l.spent) : 0;

  return h('div', null,
    // Kopfzeile
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: narrow ? 30 : 56, alignItems: 'end' } },
      h('div', null,
        h(SectionLabel, null, 'Netto seit Start'),
        h('div', { style: { ...display(narrow ? 46 : 76, netColor), marginTop: narrow ? 10 : 16 } },
          (l.net >= 0 ? '+' : '−') + fmt(Math.abs(l.net))),
        h('div', { style: { fontSize: 13, color: T.muted, marginTop: 14, ...NUM } },
          fmtAlt(Math.abs(l.net), chfRate) + (l.multiple !== null ? ` · ${l.multiple.toFixed(2)}× auf jeden Dollar` : ''))
      ),
      h('div', null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, ...NUM } },
          h('span', { style: { color: T.faint } }, l.breakEvenGap > 0 ? 'Bis Break-even' : 'Kosten gedeckt'),
          h('span', { style: { color: l.breakEvenGap > 0 ? T.amber : T.green, fontWeight: 500 } },
            l.breakEvenGap > 0 ? fmt(l.breakEvenGap) : `${fmt(l.received)} / ${fmt(l.spent)}`)
        ),
        h(Bar, { pct: cover, color: l.breakEvenGap > 0 ? T.amber : T.green, height: 4 }),
        h('div', { style: {
          display: 'grid', gridTemplateColumns: narrow ? 'repeat(auto-fit, minmax(110px, 1fr))' : 'repeat(3, 1fr)', gap: 1,
          background: T.border, border: `1px solid ${T.border}`, marginTop: 22,
        } },
          h('div', { style: { background: T.bg, padding: '14px 16px' } },
            h(SectionLabel, null, 'Ausgaben'),
            h('div', { style: { ...display(20, T.red), marginTop: 9 } }, fmt(l.spent))),
          h('div', { style: { background: T.bg, padding: '14px 16px' } },
            h(SectionLabel, null, 'Payouts'),
            h('div', { style: { ...display(20, T.green), marginTop: 9 } }, fmt(l.received)),
            h('div', { style: { fontSize: 11, color: T.faint, marginTop: 6 } },
              `${l.payoutCount} Auszahlung${l.payoutCount === 1 ? '' : 'en'}`)),
          h('div', { style: { background: T.bg, padding: '14px 16px' } },
            h(SectionLabel, null, 'Ø Payout'),
            h('div', { style: { ...display(20), marginTop: 9 } }, l.payoutCount ? fmt(l.avgPayout) : '–'),
            l.biggestPayout ? h('div', { style: { fontSize: 11, color: T.faint, marginTop: 6, ...NUM } }, `grösster ${fmt(l.biggestPayout)}`) : null)
        )
      )
    ),

    l.months.length > 1 && h('div', { style: { border: `1px solid ${T.border}`, marginTop: narrow ? 34 : 56, background: T.card, overflowX: 'auto' } },
      h(MonthChart, { byMonth: l.byMonth, months: l.months, monthly, onSetMonthly })
    ),

    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: narrow ? 34 : 56, marginTop: narrow ? 34 : 56 } },
      h('div', null,
        h(SectionLabel, { style: { marginBottom: 8 } }, 'Kennzahlen'),
        h(MetricRow, {
          label: 'Netto pro Monat',
          hint: `über ${l.monthsElapsed} Monat${l.monthsElapsed === 1 ? '' : 'e'} seit der ersten Buchung`,
          value: `${l.netPerMonth >= 0 ? '+' : '−'}${fmt(Math.abs(l.netPerMonth))}`,
          color: l.netPerMonth >= 0 ? T.green : T.red,
        }),
        h(MetricRow, { label: 'Laufende Kosten pro Monat', hint: 'Gebühren, Resets, Activation', value: fmt(l.burnPerMonth), color: T.red }),
        h(MetricRow, {
          label: 'Profitable Monate',
          hint: l.seq.length ? `${l.profitableMonths} von ${l.seq.length}` : null,
          value: l.seq.length ? `${Math.round((l.profitableMonths / l.seq.length) * 100)}%` : '–',
          color: l.seq.length && l.profitableMonths / l.seq.length >= 0.5 ? T.green : T.amber,
        }),
        l.trendDelta !== null && h(MetricRow, {
          label: 'Trend', hint: 'letzte 3 Monate vs. die 3 davor',
          value: `${l.trendDelta >= 0 ? '+' : '−'}${fmt(Math.abs(l.trendDelta))}`,
          color: l.trendDelta >= 0 ? T.green : T.red,
        }),
        l.costPerFunded !== null && h(MetricRow, {
          label: 'Kosten pro Funded-Account',
          hint: `${fmt(l.evalSpend)} Eval- und Reset-Gebühren / ${l.fundedReached} Account${l.fundedReached === 1 ? '' : 's'}`,
          value: fmt(l.costPerFunded),
        }),
        l.daysSinceLastPayout !== null && h(MetricRow, {
          label: 'Letzter Payout', hint: l.lastPayoutDate,
          value: l.daysSinceLastPayout === 0 ? 'heute' : `vor ${l.daysSinceLastPayout} Tagen`,
          color: l.daysSinceLastPayout > 60 ? T.amber : T.text,
        }),
        j.count > 0 && h(MetricRow, {
          label: 'Ø Journal-Rendite',
          hint: `${j.count} erfasste Monate · bester ${fmtPct(j.best.pct)} · schlechtester ${fmtPct(j.worst.pct)}`,
          value: fmtPct(j.avg),
          color: j.avg >= 0 ? T.green : T.red,
        })
      ),

      h('div', null,
        h(SectionLabel, { style: { marginBottom: 18 } }, 'Wohin das Geld geht'),
        CATEGORIES.filter((c) => l.byCategory[c.id]).map((c) => {
          const v = l.byCategory[c.id];
          return h('div', { key: c.id, style: { marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 } },
              h('span', { style: { color: T.muted } }, c.label),
              h('span', { style: { color: T.text, ...NUM } }, fmt(v),
                h('span', { style: { color: T.faint } }, l.spent ? ` ${Math.round((v / l.spent) * 100)}%` : ''))
            ),
            h(Bar, { pct: l.spent ? v / l.spent : 0, color: T.accent, height: 2 })
          );
        }),

        Object.keys(l.byAccount).length > 0 && h('div', { style: { marginTop: 34 } },
          h(SectionLabel, { style: { marginBottom: 8 } }, 'Pro Account'),
          Object.entries(l.byAccount).map(([id, v]) => {
            const acc = l.accountsMap[id];
            const net = v.received - v.spent;
            return h('div', { key: id, style: {
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '11px 0', borderBottom: `1px solid ${T.borderSoft}`, gap: 16,
            } },
              h('span', { style: { fontSize: 12.5, color: T.muted, minWidth: 0 } }, acc ? acc.name : 'Gelöschter Account'),
              h('span', { style: { fontSize: 12.5, whiteSpace: 'nowrap', ...NUM } },
                h('span', { style: { color: T.faint } }, `${fmt(v.spent)} → `),
                h('span', { style: { color: net >= 0 ? T.green : T.red, fontWeight: 500 } }, (net >= 0 ? '+' : '−') + fmt(Math.abs(net))))
            );
          })
        )
      )
    ),

    h('div', { style: { display: 'flex', gap: 8, margin: '56px 0 4px', alignItems: 'center' } },
      [['all', 'Alle'], ['expense', 'Ausgaben'], ['payout', 'Payouts']].map(([id, label]) =>
        h('button', {
          key: id, onClick: () => setFilter(id),
          style: {
            background: filter === id ? T.chipBg : 'transparent',
            border: `1px solid ${filter === id ? T.text : T.border}`,
            color: filter === id ? T.text : T.muted, borderRadius: 6, padding: '7px 15px',
            fontSize: 12.5, cursor: 'pointer', fontFamily: SANS,
          },
        }, label))
    ),

    Object.keys(groups).sort().reverse().map((mk) => {
      const list = groups[mk];
      const out = list.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
      const inc = list.filter((t) => t.type === 'payout').reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
      return h('div', { key: mk },
        h('div', { style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '26px 0 10px', borderBottom: `1px solid ${T.border}`,
        } },
          h('span', { style: cap(T.faint) }, monthLabel(mk)),
          h('span', { style: { fontSize: 12.5, color: inc - out >= 0 ? T.green : T.muted, ...NUM } },
            (inc - out >= 0 ? '+' : '−') + fmt(Math.abs(inc - out)))
        ),
        list.map((t) => h(TxRow, { key: t.id, t, account: l.accountsMap[t.accountId], onEdit }))
      );
    })
  );
}

export function TxForm({ initial, defaultType = 'expense', accounts, lastAmounts = {}, onClose, onSubmit, onDelete, chfRate }) {
  // Der Feldwert steht in der Anzeigewährung, gespeichert wird in USD.
  const [t, setT] = useState(initial
    ? { ...initial, amount: toInput(initial.amount) }
    : {
        type: defaultType,
        category: defaultType === 'payout' ? 'payout' : 'eval_fee',
        amount: '', date: today(), accountId: '', firm: 'Apex', note: '',
      });
  const [armed, setArmed] = useState(false);
  const [docErr, setDocErr] = useState('');
  const [docBusy, setDocBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Activation Fee als zweite Buchung im selben Vorgang, nur bei Ausgaben.
  const [addFee, setAddFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const set = (k, v) => setT((s) => ({ ...s, [k]: v }));
  const isPayout = t.type === 'payout';

  const pickDoc = async (file) => {
    if (!file) return;
    setDocErr(''); setDocBusy(true);
    try { set('doc', await fileToDoc(file)); }
    catch (e) { setDocErr(e.message || String(e)); }
    setDocBusy(false);
  };

  const setType = (type) => setT((s) => ({
    ...s, type,
    category: type === 'payout' ? 'payout' : s.category === 'payout' ? 'eval_fee' : s.category,
  }));

  const selectedAccount = accounts.find((a) => a.id === t.accountId) || null;
  // Nur sinnvoll, solange die Gebühr offen ist.
  const feeAccount = selectedAccount && selectedAccount.phase === 'eval'
    && selectedAccount.activationFee && !selectedAccount.activationPaid ? selectedAccount : null;

  const suggested = !isPayout && lastAmounts[t.category] && !t.amount ? toInput(lastAmounts[t.category]) : null;

  const pill = (active) => ({
    background: active ? T.chipBg : 'transparent',
    border: `1px solid ${active ? T.text : T.border}`,
    color: active ? T.text : T.muted,
    borderRadius: 6, padding: '8px 13px', fontSize: 12.5, cursor: 'pointer', fontFamily: SANS,
  });

  return h(Modal, { onClose, max: 500, z: 65 },
    h(ModalHead, { title: initial ? 'Zahlung bearbeiten' : 'Zahlung erfassen', onClose }),

    h('div', { style: { display: 'flex', gap: 8, marginBottom: 22 } },
      [['expense', 'Ausgabe'], ['payout', 'Payout']].map(([id, label]) =>
        h('button', {
          key: id, onClick: () => setType(id),
          style: {
            flex: 1,
            background: t.type === id ? (id === 'payout' ? T.greenSoft : T.redSoft) : 'transparent',
            border: `1px solid ${t.type === id ? (id === 'payout' ? T.green : T.red) : T.border}`,
            color: t.type === id ? (id === 'payout' ? T.green : T.red) : T.muted,
            borderRadius: 6, padding: '11px 0', fontSize: 13.5,
            fontWeight: t.type === id ? 600 : 400, cursor: 'pointer', fontFamily: SANS,
          },
        }, label))
    ),

    h(Field, { label: `Betrag (${curCode()})` },
      h('input', {
        autoFocus: true, type: 'number', value: t.amount,
        onChange: (e) => set('amount', e.target.value === '' ? '' : parseFloat(e.target.value)),
        inputMode: 'decimal', placeholder: suggested ? String(suggested) : '0',
        style: { ...numS(), fontSize: 22, fontWeight: 500, letterSpacing: '-0.03em', padding: '14px' },
      }),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 7, gap: 12 } },
        h('span', { style: { fontSize: 11.5, color: T.faint, ...NUM } },
          t.amount === '' || isNaN(t.amount)
            ? ''
            : curCode() === 'CHF'
              ? `entspricht $${fromInput(t.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} · so gespeichert`
              : approxCHF(t.amount, chfRate)),
        suggested && h('button', {
          onClick: () => set('amount', suggested),
          style: { background: 'none', border: 'none', color: T.accent, fontSize: 11.5, cursor: 'pointer', fontFamily: SANS, padding: 0, whiteSpace: 'nowrap' },
        }, `zuletzt ${fmt(fromInput(suggested))} übernehmen`)
      )
    ),

    !isPayout && h(Field, { label: 'Kategorie' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
        CATEGORIES.map((c) => h('button', { key: c.id, onClick: () => set('category', c.id), style: pill(t.category === c.id) }, c.label)))
    ),

    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
      h(Field, { label: 'Datum' },
        h('input', { type: 'date', value: t.date, onChange: (e) => set('date', e.target.value), style: inputS() })),
      h(Field, { label: 'Firm' },
        h('input', { value: t.firm, onChange: (e) => set('firm', e.target.value), style: inputS() }))
    ),

    h(Field, { label: 'Account zuordnen' },
      accounts.length === 0
        ? h('div', { style: { fontSize: 12.5, color: T.faint, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: '11px 12px' } },
            'Noch keine Accounts angelegt — die Zahlung wird ohne Zuordnung gespeichert.')
        : h('div', null,
            // Zusammengeklappt: nur die aktuelle Wahl. Bei vielen Accounts sonst eine Wand aus Chips.
            h('button', {
              onClick: () => setPickerOpen((o) => !o),
              style: {
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6,
                padding: '11px 12px', fontSize: 13.5, color: selectedAccount ? T.text : T.muted,
                cursor: 'pointer', fontFamily: SANS, textAlign: 'left',
              },
            },
              h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                selectedAccount ? selectedAccount.name + (selectedAccount.archived ? ' · Archiv' : '') : 'Keinem Account zugeordnet'),
              h('span', { style: { color: T.faint, fontSize: 11, flexShrink: 0 } }, pickerOpen ? '▲' : '▼')
            ),
            pickerOpen && h('div', { style: {
              display: 'flex', flexDirection: 'column', gap: 1, marginTop: 6,
              border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden', background: T.border,
            } },
              [{ id: '', name: 'Keinem Account zugeordnet' }].concat(accounts).map((a) => h('button', {
                key: a.id || 'none',
                onClick: () => { set('accountId', a.id); setPickerOpen(false); },
                style: {
                  background: t.accountId === a.id ? T.chipBg : T.surface, border: 'none',
                  color: t.accountId === a.id ? T.text : T.muted,
                  padding: '11px 12px', fontSize: 13.5, cursor: 'pointer', fontFamily: SANS,
                  textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 12,
                },
              },
                h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                  a.name + (a.archived ? ' · Archiv' : '')),
                a.phase === 'eval' ? h('span', { style: { fontSize: 11, color: T.faint, flexShrink: 0 } }, 'Eval') : null
              ))
            )
          )
    ),

    // Eval-Account gewählt: Activation Fee lässt sich in einem Rutsch mitbuchen.
    !isPayout && feeAccount && h('div', { style: { marginTop: -4, marginBottom: 16 } },
      !addFee
        ? h('button', {
            onClick: () => { setAddFee(true); setFeeAmount(toInput(feeAccount.activationFee) || ''); },
            style: {
              background: 'transparent', border: `1px dashed ${T.border}`, color: T.accent,
              borderRadius: 6, padding: '10px 13px', fontSize: 12.5, cursor: 'pointer',
              fontFamily: SANS, width: '100%', textAlign: 'left',
            },
          }, `+ Activation Fee für ${feeAccount.name} mitbuchen`)
        : h('div', { style: { border: `1px solid ${T.border}`, borderRadius: 6, padding: '13px 14px', background: T.surface } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 } },
              h('span', { style: { fontSize: 12.5, color: T.text } }, `Activation Fee · ${feeAccount.name}`),
              h('button', {
                onClick: () => { setAddFee(false); setFeeAmount(''); },
                style: { background: 'none', border: 'none', color: T.muted, fontSize: 12.5, cursor: 'pointer', fontFamily: SANS },
              }, 'Entfernen')
            ),
            h('input', {
              type: 'number', value: feeAmount, inputMode: 'decimal',
              onChange: (e) => setFeeAmount(e.target.value === '' ? '' : parseFloat(e.target.value)),
              placeholder: String(toInput(feeAccount.activationFee) || 0),
              style: { ...numS(), fontSize: 15 },
            }),
            h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 7, lineHeight: 1.5 } },
              `Wird als zweite Ausgabe in ${curCode()} erfasst und dem Account zugeordnet. Der Account wird als bezahlt markiert.`)
          )
    ),

    h(Field, { label: 'Notiz' },
      h('input', { value: t.note, onChange: (e) => set('note', e.target.value), style: inputS(), placeholder: 'z. B. Promo 80%, Reset nach Breach …' })),

    // Payout ohne Zertifikat wird nicht gespeichert. Bei Ausgaben ist der Beleg freiwillig.
    h(Field, { label: isPayout ? 'Payout-Zertifikat · erforderlich' : 'Rechnung / Beleg · optional' },
      t.doc
        ? h('div', { style: {
            display: 'flex', alignItems: 'center', gap: 12,
            border: `1px solid ${T.border}`, borderRadius: 6, padding: '10px 12px', background: T.surface,
          } },
            t.doc.type && t.doc.type.startsWith('image/')
              ? h('img', { src: t.doc.data, alt: '', style: { width: 38, height: 38, objectFit: 'cover', borderRadius: 4, flexShrink: 0 } })
              : h('div', { style: { width: 38, height: 38, borderRadius: 4, background: T.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: T.muted, flexShrink: 0 } }, 'PDF'),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.doc.name),
              h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 3 } }, humanBytes(t.doc.size || 0))
            ),
            h('button', {
              onClick: () => openDoc(t.doc),
              style: { background: 'none', border: 'none', color: T.accent, fontSize: 12.5, cursor: 'pointer', fontFamily: SANS, flexShrink: 0 },
            }, 'Öffnen'),
            h('button', {
              onClick: () => set('doc', null),
              style: { background: 'none', border: 'none', color: T.muted, fontSize: 12.5, cursor: 'pointer', fontFamily: SANS, flexShrink: 0 },
            }, 'Entfernen')
          )
        : h('label', { style: {
            display: 'block', border: `1px dashed ${isPayout && !t.doc ? T.border : T.border}`, borderRadius: 6,
            padding: '14px 12px', textAlign: 'center', fontSize: 13, color: T.muted, cursor: 'pointer', background: T.surface,
          } },
            docBusy ? 'wird verarbeitet …' : (isPayout ? 'Zertifikat wählen (Bild oder PDF)' : 'Beleg wählen (Bild oder PDF)'),
            h('input', {
              type: 'file', accept: 'image/*,application/pdf', style: { display: 'none' },
              onChange: (e) => { const f = e.target.files && e.target.files[0]; pickDoc(f); e.target.value = ''; },
            })
          ),
      docErr && h('div', { style: { fontSize: 12, color: T.red, marginTop: 8, lineHeight: 1.5 } }, docErr),
      !docErr && h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 8, lineHeight: 1.5 } },
        'Bilder werden automatisch verkleinert. Belege synchronisieren über den Gist mit.')
    ),

    h('div', { style: { display: 'flex', gap: 10 } },
      h(Btn, {
        style: { flex: 1 }, disabled: !t.amount || (isPayout && !t.doc) || docBusy,
        onClick: () => onSubmit(
          { ...t, id: t.id || uid(), amount: Math.abs(Number(fromInput(t.amount)) || 0) },
          addFee && feeAccount && feeAmount !== ''
            ? { id: uid(), type: 'expense', category: 'activation',
                amount: Math.abs(Number(fromInput(feeAmount)) || 0), date: t.date,
                accountId: feeAccount.id, firm: t.firm || '', note: 'zusammen mit ' + catLabel(t.category) + ' erfasst' }
            : null
        ),
      }, initial ? 'Änderungen speichern' : 'Erfassen'),
      initial && h(Danger, {
        armed, onClick: () => (armed ? onDelete(t.id) : setArmed(true)), onBlur: () => setArmed(false),
      }, armed ? 'Sicher?' : 'Löschen')
    )
  );
}
