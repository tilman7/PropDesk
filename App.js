// Shell: Navigation, Ansichten, Sync, Einstellungen, Handler.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { T, SANS, NUM, applyTheme, display, cap } from './theme.js';
import { h, Label, Field, Btn, Ghost, IconBtn, Mark, SectionLabel, Modal, ModalHead, Empty, numS, inputS } from './ui.js';
import { AccountRow, TableHead, AccountDetail, AccountForm, QuickBalance, ArchiveView } from './accounts.js';
import { Ledger, TxForm } from './ledger.js';
import {
  loadData, saveData, loadSettings, saveSettings, findGist, readGist, writeGist,
  calcAccount, calcLedger, daysUntil, setCurrency, fmt, fmtPct, journalStats, monthLabel,
  riskDefault, uid, today,
} from './lib.js';

const SYNC_COLOR = { off: 'faint', idle: 'faint', syncing: 'amber', synced: 'green', error: 'red' };
const SYNC_TEXT = {
  off: 'Sync aus — tippen zum Einrichten',
  idle: 'Sync bereit',
  syncing: 'synchronisiert …',
  synced: 'synchron',
  error: 'Sync-Fehler — Einstellungen prüfen',
};

export default function App() {
  const [data, setData] = useState({ accounts: [], transactions: [], monthly: {}, updatedAt: 0 });
  const [view, setView] = useState('risk');
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [quickId, setQuickId] = useState(null);
  const [txEditId, setTxEditId] = useState(null);
  const [txAddType, setTxAddType] = useState(null);
  const [settings, setSettings] = useState(loadSettings());
  const [theme, setTheme] = useState(loadSettings().theme || 'dark');
  const [sync, setSync] = useState(loadSettings().token ? 'idle' : 'off');
  const [chfRate, setChfRate] = useState(null);
  const [currency, setCurrencyState] = useState(loadSettings().currency || 'USD');
  const timer = useRef(null);

  // Beides synchron beim Rendern: die Tokens müssen stehen, bevor Styles gelesen werden.
  applyTheme(theme);
  setCurrency(currency, chfRate);

  useEffect(() => {
    (async () => {
      try {
        const r = await (await fetch('https://api.frankfurter.app/latest?from=USD&to=CHF')).json();
        if (r?.rates?.CHF) setChfRate(r.rates.CHF);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const d = loadData();
    setData(d);
    const s = loadSettings();
    if (s.token && s.gistId) pull(s, d.updatedAt);
  }, []);

  useEffect(() => {
    const onFocus = () => {
      const s = loadSettings();
      if (s.token && s.gistId) pull(s, loadData().updatedAt);
    };
    const onVis = () => { if (!document.hidden) onFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  async function pull(s, localUpdatedAt) {
    try {
      setSync('syncing');
      const remote = await readGist(s.token, s.gistId);
      if (remote && (remote.updatedAt || 0) > (localUpdatedAt || 0)) { saveData(remote); setData(remote); }
      setSync('synced');
    } catch { setSync('error'); }
  }

  function commit(next) {
    const payload = {
      accounts: next.accounts,
      transactions: next.transactions,
      monthly: next.monthly || {},
      updatedAt: Date.now(),
    };
    setData(payload);
    saveData(payload);
    const s = loadSettings();
    if (!s.token) return;
    setSync('syncing');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const id = await writeGist(s.token, s.gistId || null, payload);
        if (!s.gistId) { const ns = { ...s, gistId: id }; saveSettings(ns); setSettings(ns); }
        setSync('synced');
      } catch { setSync('error'); }
    }, 1200);
  }

  const setAccounts = (accounts) => commit({ ...data, accounts });
  const setTransactions = (transactions) => commit({ ...data, transactions });

  // Journal-Rendite pro Monat: rein statistisch, geht in keine Geldrechnung ein.
  const setMonthly = (key, pct) => {
    const monthly = { ...(data.monthly || {}) };
    if (pct === null || pct === '' || isNaN(pct)) delete monthly[key];
    else monthly[key] = Number(pct);
    commit({ ...data, monthly });
  };

  const active = useMemo(() => data.accounts.filter((a) => !a.archived), [data.accounts]);
  const archived = useMemo(() => data.accounts.filter((a) => a.archived), [data.accounts]);
  const ledger = useMemo(() => calcLedger(data.transactions, data.accounts), [data.transactions, data.accounts]);

  const lastAmounts = useMemo(() => {
    const m = {};
    for (const t of [...data.transactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''))) {
      if (t.type === 'expense' && t.category) m[t.category] = Math.abs(Number(t.amount) || 0);
    }
    return m;
  }, [data.transactions]);

  const summary = useMemo(() => {
    if (active.length === 0) return null;
    const evals = active.filter((a) => a.phase === 'eval').length;
    const totalRisk = active.reduce((s, a) => s + (Number(a.riskPerTrade) || 0), 0);
    const nextExpiry = active.map((a) => ({ a, d: daysUntil(a.expiryDate) }))
      .filter((x) => x.d !== null).sort((x, y) => x.d - y.d)[0] || null;
    const openFees = active.filter((a) => a.activationFee && !a.activationPaid)
      .reduce((s, a) => s + Number(a.activationFee), 0);
    const danger = active.map(calcAccount).filter((c) => c.lossesLeft !== null && c.lossesLeft <= 3).length;
    return { evals, funded: active.length - evals, totalRisk, nextExpiry, openFees, danger };
  }, [active]);

  const detail = data.accounts.find((a) => a.id === detailId);
  const editing = data.accounts.find((a) => a.id === editId);
  const quick = data.accounts.find((a) => a.id === quickId);
  const txEditing = data.transactions.find((t) => t.id === txEditId);

  const saveAccount = (a) => {
    const exists = data.accounts.some((x) => x.id === a.id);
    setAccounts(exists ? data.accounts.map((x) => (x.id === a.id ? a : x)) : [...data.accounts, a]);
    setEditId(null); setAdding(false);
  };
  const deleteAccount = (id) => { setAccounts(data.accounts.filter((a) => a.id !== id)); setDetailId(null); };
  const closeDay = (id, balance) => setAccounts(data.accounts.map((a) =>
    a.id === id ? { ...a, balance, highWater: Math.max(Number(a.highWater) || 0, balance) } : a));
  const saveQuick = (balance, alsoClose) => {
    setAccounts(data.accounts.map((a) => a.id === quickId
      ? { ...a, balance, highWater: alsoClose ? Math.max(Number(a.highWater) || 0, balance) : a.highWater }
      : a));
    setQuickId(null);
  };

  const moveFunded = (id) => {
    const a = data.accounts.find((x) => x.id === id);
    if (!a) return;
    const start = Number(a.startBalance) || 0;
    const funded = {
      ...a, id: uid(), name: `${a.name} · PA`, phase: 'pa',
      balance: start, highWater: start, bestDayProfit: 0, consistencyPct: 50,
      expiryDate: '', activationPaid: false, archived: false, riskPerTrade: riskDefault('pa'),
    };
    const stamp = new Date().toLocaleDateString('de-CH');
    const old = { ...a, archived: true, archivedAt: Date.now(), notes: (a.notes ? a.notes + '\n' : '') + `Eval bestanden am ${stamp}` };
    const accounts = data.accounts.map((x) => (x.id === id ? old : x)).concat(funded);
    let transactions = data.transactions;
    const hasActivation = transactions.some((t) => t.accountId === id && t.category === 'activation');
    if (a.activationFee && a.activationPaid && !hasActivation) {
      transactions = [...transactions, {
        id: uid(), type: 'expense', category: 'activation', amount: Number(a.activationFee),
        date: today(), accountId: id, firm: a.firm || '', note: 'automatisch bei Funded-Überführung',
      }];
    }
    commit({ ...data, accounts, transactions });
    setDetailId(funded.id);
  };

  const duplicate = (id) => {
    const a = data.accounts.find((x) => x.id === id);
    if (!a) return;
    const m = a.name.match(/^(.*?)\s*#(\d+)\s*$/);
    const base = m ? m[1] : a.name;
    let n = m ? parseInt(m[2], 10) + 1 : 2;
    const names = new Set(data.accounts.map((x) => x.name));
    while (names.has(`${base} #${n}`)) n++;
    setAccounts([...data.accounts, { ...a, id: uid(), name: `${base} #${n}` }]);
    setDetailId(null);
  };

  const saveTx = (t) => {
    const exists = data.transactions.some((x) => x.id === t.id);
    setTransactions(exists ? data.transactions.map((x) => (x.id === t.id ? t : x)) : [...data.transactions, t]);
    setTxEditId(null); setTxAddType(null);
  };
  const deleteTx = (id) => { setTransactions(data.transactions.filter((t) => t.id !== id)); setTxEditId(null); };

  const connect = async (token) => {
    setSync('syncing');
    let id = await findGist(token);
    const local = loadData();
    if (id) {
      const remote = await readGist(token, id);
      if (remote && (remote.updatedAt || 0) > (local.updatedAt || 0)) { saveData(remote); setData(remote); }
      else if ((local.updatedAt || 0) > 0) await writeGist(token, id, local);
    } else {
      id = await writeGist(token, null, local);
    }
    const ns = { ...loadSettings(), token, gistId: id };
    saveSettings(ns); setSettings(ns); setSync('synced'); setSettingsOpen(false);
  };
  const disconnect = () => { const ns = { theme: loadSettings().theme }; saveSettings(ns); setSettings(ns); setSync('off'); };

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'CHF' : 'USD';
    const ns = { ...loadSettings(), currency: next };
    saveSettings(ns); setSettings(ns); setCurrencyState(next);
  };
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    const ns = { ...loadSettings(), theme: next };
    saveSettings(ns); setSettings(ns); setTheme(next);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(loadData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'riskdesk-backup.json';
    a.click();
  };
  const importJson = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if (!Array.isArray(parsed.accounts)) throw new Error();
        commit({ accounts: parsed.accounts, transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [], monthly: parsed.monthly && typeof parsed.monthly === 'object' ? parsed.monthly : {} });
      } catch { alert('Ungültige Datei'); }
    };
    r.readAsText(file);
  };

  const dotColor = T[SYNC_COLOR[sync]];
  const goto = (v) => { setDetailId(null); setView(v); };

  const navItem = (id, label, badge) => h('button', {
    key: id, onClick: () => goto(id),
    style: {
      background: view === id && !detailId ? T.chipBg : 'transparent', border: 'none',
      color: view === id && !detailId ? T.text : T.muted,
      borderRadius: 6, padding: '7px 13px', fontSize: 13.5,
      fontWeight: view === id && !detailId ? 500 : 400, cursor: 'pointer',
      fontFamily: SANS, display: 'inline-flex', alignItems: 'center', gap: 8,
    },
  }, label, badge);

  return h('div', {
    key: `${theme}-${currency}-${chfRate ? 1 : 0}`,
    style: { minHeight: '100vh', background: T.bg, color: T.text, fontFamily: SANS, ...NUM },
  },
    h('style', null, `
      * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      body { margin: 0; }
      input, select, textarea, button { font-family: inherit; }
      input::placeholder, textarea::placeholder { color: ${T.faint}; }
      :focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
    `),

    h('header', { style: {
      position: 'sticky', top: 0, zIndex: 20, background: T.headerBg,
      backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`,
    } },
      h('div', { style: {
        maxWidth: 1160, margin: '0 auto', padding: '0 40px', height: 62,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
      } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 30, minWidth: 0 } },
          h('button', {
            onClick: () => goto('settings'), title: SYNC_TEXT[sync],
            style: {
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: T.text,
              display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SANS,
            },
          },
            h(Mark, { size: 19 }),
            h('span', { style: { fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' } }, 'PropDesk'),
            h('span', { style: { width: 5, height: 5, borderRadius: 99, background: dotColor, opacity: sync === 'synced' ? 0.5 : 1, transition: 'opacity .3s' } }),
            sync === 'error' && h('span', { style: { fontSize: 11.5, color: T.red } }, 'Sync-Fehler')
          ),
          h('nav', { style: { display: 'flex', gap: 4 } },
            navItem('risk', 'Risiko'),
            navItem('finances', 'Finanzen', data.transactions.length > 0 && h('span', {
              style: { fontSize: 11.5, color: ledger.net >= 0 ? T.green : T.red, ...NUM },
            }, (ledger.net >= 0 ? '+' : '−') + fmt(Math.abs(ledger.net)))),
            navItem('archive', 'Archiv', archived.length > 0 && h('span', { style: { fontSize: 11.5, color: T.faint } }, archived.length)),
            navItem('settings', 'Einstellungen')
          )
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
          view === 'finances'
            ? h(React.Fragment, null,
                h(Ghost, { onClick: () => setTxAddType('expense'), style: { padding: '8px 14px', fontSize: 13 } }, '− Ausgabe'),
                h(Btn, { onClick: () => setTxAddType('payout'), style: { padding: '9px 15px', fontSize: 13, background: T.green, borderColor: T.green, color: '#fff' } }, '+ Payout'))
            : h(Btn, { onClick: () => setAdding(true), style: { padding: '9px 15px', fontSize: 13 } }, 'Account anlegen')
        )
      )
    ),

    h('main', { style: { maxWidth: 1160, margin: '0 auto', padding: '52px 40px 110px' } },
      detail
        ? h(AccountDetail, {
            a: detail, chfRate, ledgerForAccount: ledger.byAccount[detail.id],
            onBack: () => setDetailId(null),
            onSave: (a) => { saveAccount(a); },
            onDelete: deleteAccount,
            onEdit: (id) => setEditId(id),
            onDuplicate: duplicate,
            onMoveFunded: moveFunded,
            onCloseDay: (id, b) => closeDay(id, b),
          })
        : view === 'risk'
          ? (active.length === 0
              ? h(Empty, {
                  title: 'Noch keine Accounts',
                  hint: 'Lege deinen ersten Prop-Account an. PropDesk rechnet dir Drawdown-Puffer, verbleibende Verlust-Trades und Payout-Schwellen laufend aus.',
                  action: h(Btn, { onClick: () => setAdding(true) }, 'Account anlegen'),
                })
              : h(React.Fragment, null,
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'end' } },
                    h('div', null,
                      h(SectionLabel, null, 'Max. Risiko heute'),
                      h('div', { style: { ...display(76), marginTop: 16 } }, fmt(summary.totalRisk)),
                      h('div', { style: { fontSize: 13, color: T.muted, marginTop: 14 } },
                        `${active.length} aktive Accounts` + (summary.danger > 0 ? ` · ${summary.danger} Account${summary.danger > 1 ? 's' : ''} ≤ 3 Verlust-Trades` : ''))
                    ),
                    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: T.border, border: `1px solid ${T.border}` } },
                      h('div', { style: { background: T.bg, padding: '14px 16px' } },
                        h(SectionLabel, null, 'Accounts'),
                        h('div', { style: { ...display(19), marginTop: 9 } }, `${summary.evals} Eval · ${summary.funded} Funded`)),
                      h('div', { style: { background: T.bg, padding: '14px 16px' } },
                        h(SectionLabel, null, 'Nächster Ablauf'),
                        h('div', { style: { ...display(19, summary.nextExpiry && summary.nextExpiry.d <= 7 ? T.amber : T.text), marginTop: 9 } },
                          summary.nextExpiry ? `${summary.nextExpiry.d} Tage` : '–'),
                        summary.nextExpiry && h('div', { style: { fontSize: 11, color: T.faint, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, summary.nextExpiry.a.name)),
                      h('div', { style: { background: T.bg, padding: '14px 16px' } },
                        h(SectionLabel, null, 'Offene Fees'),
                        h('div', { style: { ...display(19, summary.openFees > 0 ? T.amber : T.text), marginTop: 9 } }, fmt(summary.openFees))),
                      h('div', { style: { background: T.bg, padding: '14px 16px' } },
                        h(SectionLabel, null, 'Netto Finanzen'),
                        h('div', { style: { ...display(19, ledger.net >= 0 ? T.green : T.red), marginTop: 9 } },
                          (ledger.net >= 0 ? '+' : '−') + fmt(Math.abs(ledger.net))))
                    )
                  ),
                  h('div', { style: { marginTop: 64 } },
                    h(TableHead, null),
                    active.map((a) => h(AccountRow, { key: a.id, a, onOpen: setDetailId, onQuickBalance: setQuickId }))
                  )
                ))
          : view === 'finances'
            ? h(Ledger, {
                transactions: data.transactions, accounts: data.accounts,
                monthly: data.monthly || {}, onSetMonthly: setMonthly,
                chfRate, onAdd: setTxAddType, onEdit: setTxEditId,
              })
            : view === 'archive'
            ? h('div', null,
                h('div', { style: { ...display(34), marginBottom: 10 } }, 'Archiv'),
                h('div', { style: { fontSize: 13, color: T.muted, marginBottom: 34 } }, 'Abgeschlossene und stillgelegte Accounts.'),
                h(ArchiveView, {
                  archived,
                  onRestore: (id) => setAccounts(data.accounts.map((a) => (a.id === id ? { ...a, archived: false } : a))),
                  onDelete: (id) => setAccounts(data.accounts.filter((a) => a.id !== id)),
                })
              )
            : h(SettingsView, {
                settings, sync, theme, currency, chfRate,
                monthly: data.monthly || {}, months: ledger.months,
                onSetMonthly: setMonthly,
                onToggleTheme: toggleTheme, onToggleCurrency: toggleCurrency,
                onConnect: connect, onDisconnect: disconnect,
                onExport: exportJson, onImport: importJson,
              })
    ),

    (adding || editing) && h(AccountForm, {
      initial: editing || null, chfRate,
      onClose: () => { setAdding(false); setEditId(null); },
      onSubmit: saveAccount,
    }),
    quick && h(QuickBalance, { a: quick, onClose: () => setQuickId(null), onSave: saveQuick }),
    (txAddType || txEditing) && h(TxForm, {
      initial: txEditing || null, defaultType: txAddType || 'expense',
      accounts: data.accounts, lastAmounts, chfRate,
      onClose: () => { setTxAddType(null); setTxEditId(null); },
      onSubmit: saveTx, onDelete: deleteTx,
    })
  );
}

// Ein Bereich für alles Einstellbare: Darstellung, Journal, Sync, Backup.
function SettingsView({
  settings, sync, theme, currency, chfRate, monthly, months,
  onSetMonthly, onToggleTheme, onToggleCurrency, onConnect, onDisconnect, onExport, onImport,
}) {
  const [token, setToken] = useState(settings.token || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const section = (title, hint, children) => h('div', { style: { marginBottom: 52 } },
    h('div', { style: { ...display(22), marginBottom: hint ? 8 : 18 } }, title),
    hint && h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, maxWidth: 560, marginBottom: 20, textWrap: 'pretty' } }, hint),
    children
  );

  const toggle = (label, value, onClick, hint) => h('div', { style: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
    padding: '15px 0', borderBottom: `1px solid ${T.borderSoft}`,
  } },
    h('div', null,
      h('div', { style: { fontSize: 13.5 } }, label),
      hint && h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 4 } }, hint)
    ),
    h(Ghost, { onClick, style: { padding: '9px 15px', fontSize: 13, minWidth: 110, textAlign: 'center' } }, value)
  );

  // Erfasste Monate plus die letzten zwölf, damit immer etwas zum Eintragen dasteht.
  const keys = (() => {
    const set = new Set([...(months || []), ...Object.keys(monthly || {})]);
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      d.setMonth(d.getMonth() - 1);
    }
    return [...set].sort().reverse().slice(0, 24);
  })();

  const j = journalStats(monthly);

  return h('div', { style: { maxWidth: 720 } },
    h('div', { style: { ...display(34), marginBottom: 10 } }, 'Einstellungen'),
    h('div', { style: { fontSize: 13, color: T.muted, marginBottom: 44 } }, 'Darstellung, Journal-Renditen, Sync und Backup.'),

    section('Darstellung', null,
      h('div', null,
        toggle('Erscheinungsbild', theme === 'light' ? 'Hell' : 'Dunkel', onToggleTheme, 'Gilt auf diesem Gerät.'),
        toggle('Anzeigewährung', currency, onToggleCurrency,
          chfRate ? `Kurs USD→CHF ${chfRate.toFixed(3)} · Eingaben bleiben in USD` : 'Eingaben bleiben immer in USD')
      )
    ),

    section('Journal-Rendite',
      'Der prozentuale Monatsgewinn aus deinem Trading-Journal. Rein statistischer Vergleichswert — er fliesst in keine Geld- oder Risikorechnung ein. Direkt im Monatsverlauf unter der Zeitachse ist er ebenfalls anklickbar.',
      h('div', null,
        j.count > 0 && h('div', { style: {
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1,
          background: T.border, border: `1px solid ${T.border}`, marginBottom: 24,
        } },
          h('div', { style: { background: T.bg, padding: '14px 16px' } },
            h(SectionLabel, null, 'Ø Rendite'),
            h('div', { style: { ...display(20, j.avg >= 0 ? T.green : T.red), marginTop: 9 } }, fmtPct(j.avg))),
          h('div', { style: { background: T.bg, padding: '14px 16px' } },
            h(SectionLabel, null, 'Bester Monat'),
            h('div', { style: { ...display(20, T.green), marginTop: 9 } }, fmtPct(j.best.pct)),
            h('div', { style: { fontSize: 11, color: T.faint, marginTop: 6 } }, monthLabel(j.best.key))),
          h('div', { style: { background: T.bg, padding: '14px 16px' } },
            h(SectionLabel, null, 'Schlechtester'),
            h('div', { style: { ...display(20, T.red), marginTop: 9 } }, fmtPct(j.worst.pct)),
            h('div', { style: { fontSize: 11, color: T.faint, marginTop: 6 } }, monthLabel(j.worst.key))),
          h('div', { style: { background: T.bg, padding: '14px 16px' } },
            h(SectionLabel, null, 'Positive Monate'),
            h('div', { style: { ...display(20), marginTop: 9 } }, `${j.positive} / ${j.count}`))
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: 12 } },
          keys.map((k) => h('div', { key: k },
            h(Label, { style: { marginBottom: 5 } }, monthLabel(k)),
            h('input', {
              defaultValue: monthly[k] ?? '',
              placeholder: '–',
              inputMode: 'decimal',
              onBlur: (e) => {
                const raw = e.target.value.trim().replace(',', '.');
                onSetMonthly(k, raw === '' ? null : parseFloat(raw));
              },
              onKeyDown: (e) => { if (e.key === 'Enter') e.target.blur(); },
              style: { ...numS(), padding: '9px 10px', fontSize: 13.5, textAlign: 'right' },
            })
          ))
        ),
        h('div', { style: { fontSize: 11.5, color: T.faint, marginTop: 12 } }, 'Werte in Prozent, negative Monate mit Minus. Leer lassen entfernt den Eintrag.')
      )
    ),

    section('Sync',
      'Sync läuft über einen privaten GitHub-Gist. Nutze einen Fine-grained Token, der ausschliesslich auf Gists zugreifen darf, und füge ihn auf beiden Geräten ein.',
      h('div', null,
        h(Field, { label: 'GitHub Token' },
          h('input', {
            value: token, onChange: (e) => setToken(e.target.value.trim()), type: 'password',
            placeholder: 'github_pat_…', autoComplete: 'off', style: numS(),
          })
        ),
        err && h('div', { style: { fontSize: 12.5, color: T.red, marginBottom: 14 } }, err),
        settings.token && h('div', { style: { fontSize: 12.5, color: sync === 'error' ? T.red : T.green, marginBottom: 14 } },
          sync === 'error' ? 'Verbindung fehlerhaft' : `Verbunden${settings.gistId ? ' · Gist aktiv' : ''}`),
        h('div', { style: { display: 'flex', gap: 10 } },
          h(Btn, {
            disabled: busy || !token, style: { minWidth: 220 },
            onClick: async () => {
              setBusy(true); setErr('');
              try { await onConnect(token); } catch (e) { setErr(String(e.message || e)); }
              setBusy(false);
            },
          }, busy ? 'Verbinde …' : 'Verbinden & Sync starten'),
          settings.token && h(Ghost, { onClick: onDisconnect, style: { color: T.muted } }, 'Trennen')
        )
      )
    ),

    section('Backup', 'Vollständiger Datenstand als JSON — Accounts, Zahlungen und Journal-Renditen.',
      h('div', { style: { display: 'flex', gap: 10, maxWidth: 420 } },
        h(Ghost, { onClick: onExport, style: { flex: 1, textAlign: 'center' } }, 'Export JSON'),
        h('label', { style: {
          flex: 1, background: 'transparent', border: `1px solid ${T.border}`, color: T.text,
          borderRadius: 6, padding: '12px 0', fontSize: 13, cursor: 'pointer', textAlign: 'center',
        } }, 'Import JSON',
          h('input', {
            type: 'file', accept: '.json', style: { display: 'none' },
            onChange: (e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; },
          })
        )
      )
    )
  );
}
