// RiskDesk — Storage, Gist-Sync, Währung, Formatierung und ALLE Berechnungen.
// Diese Datei ist Rechenlogik, kein Design. Beim Redesign unangetastet lassen.

export const KEY_DATA = 'riskdesk:data';
export const KEY_SETTINGS = 'riskdesk:settings';
export const GIST_DESC = 'RiskDesk Sync Data';
export const GIST_FILE = 'riskdesk.json';

export const PRESETS = [
  { label: '25K EOD', size: 25000, target: 1500, trail: 1000, dll: 500, contracts: 4, paContracts: 2, activationFee: 89 },
  { label: '50K EOD', size: 50000, target: 3000, trail: 2000, dll: 1000, contracts: 6, paContracts: 4, activationFee: 119 },
  { label: '100K EOD', size: 100000, target: 6000, trail: 3000, dll: 1500, contracts: 8, paContracts: 6, activationFee: 119 },
  { label: '150K EOD', size: 150000, target: 9000, trail: 4000, dll: 2000, contracts: 12, paContracts: 9, activationFee: 149 },
];

const RISK_DEFAULTS = { eval: 400, pa: 250, live: 250 };
export const riskDefault = (phase) => RISK_DEFAULTS[phase] ?? 250;

export const CATEGORIES = [
  { id: 'eval_fee', label: 'Eval-Gebühr' },
  { id: 'reset', label: 'Reset' },
  { id: 'activation', label: 'Activation Fee' },
  { id: 'data_fee', label: 'Datenfeed' },
  { id: 'other', label: 'Sonstiges' },
];

export const catLabel = (id) =>
  id === 'payout' ? 'Payout' : CATEGORIES.find((c) => c.id === id)?.label || 'Sonstiges';

const EMPTY = { accounts: [], transactions: [], monthly: {}, updatedAt: 0 };

// Liest auch v6/v7/v8-Blobs ohne `transactions` bzw. ohne `monthly`.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, monthly: {} };
  return {
    accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    monthly: raw.monthly && typeof raw.monthly === 'object' && !Array.isArray(raw.monthly) ? raw.monthly : {},
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

export function loadData() {
  try { return migrate(JSON.parse(localStorage.getItem(KEY_DATA))); } catch { return { ...EMPTY }; }
}
export function saveData(d) {
  try { localStorage.setItem(KEY_DATA, JSON.stringify(d)); } catch {}
}
export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEY_SETTINGS)) || {}; } catch { return {}; }
}
export function saveSettings(s) {
  try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); } catch {}
}

const ghHeaders = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' });

export async function findGist(token) {
  const res = await fetch('https://api.github.com/gists?per_page=100', { headers: ghHeaders(token) });
  if (!res.ok) throw new Error('Token ungültig oder keine Gist-Berechtigung');
  const list = await res.json();
  return list.find((g) => g.description === GIST_DESC)?.id || null;
}

export async function readGist(token, id) {
  const res = await fetch(`https://api.github.com/gists/${id}`, { headers: ghHeaders(token) });
  if (!res.ok) throw new Error('Gist nicht lesbar');
  const content = (await res.json()).files?.[GIST_FILE]?.content;
  return content ? migrate(JSON.parse(content)) : null;
}

export async function writeGist(token, id, data) {
  const body = JSON.stringify({
    description: GIST_DESC,
    public: false,
    files: { [GIST_FILE]: { content: JSON.stringify(data) } },
  });
  const res = await fetch(id ? `https://api.github.com/gists/${id}` : 'https://api.github.com/gists', {
    method: id ? 'PATCH' : 'POST',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error('Sync-Upload fehlgeschlagen');
  return (await res.json()).id;
}

export const CHF_FALLBACK = 0.8;
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Anzeigewährung. Beträge liegen IMMER in USD, das hier ist reine Darstellung.
const CUR = { code: 'USD', rate: 1 };
export function setCurrency(code, rate) {
  CUR.code = code === 'CHF' ? 'CHF' : 'USD';
  CUR.rate = CUR.code === 'CHF' ? rate || CHF_FALLBACK : 1;
}

export const fmt = (v, digits = 0) => {
  if (v == null || v === '' || isNaN(v)) return '–';
  const n = Number(v) * CUR.rate;
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  return CUR.code === 'CHF'
    ? sign + 'CHF ' + abs.toLocaleString('de-CH', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

// Der jeweils andere Betrag, als Nebenzeile.
export const fmtAlt = (v, rate) => {
  if (v == null || v === '' || isNaN(v) || Number(v) === 0) return '';
  const r = rate || CHF_FALLBACK;
  return CUR.code === 'CHF'
    ? '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : 'CHF ' + (Number(v) * r).toLocaleString('de-CH', { maximumFractionDigits: 0 });
};

export const approxCHF = (v, rate) =>
  v == null || v === '' || isNaN(v) || Number(v) === 0
    ? ''
    : '≈ CHF ' + (Number(v) * (rate || CHF_FALLBACK)).toLocaleString('de-CH', { maximumFractionDigits: 0 });

/* --------------------------- Belege / Nachweise ---------------------------
   Dokumente liegen als Data-URL im Datensatz und wandern damit durch den Gist.
   Bilder werden vorher verkleinert, sonst sprengt ein Foto den Speicher. */

export const MAX_DOC_BYTES = 900 * 1024;   // nach der Komprimierung
const IMG_MAX_EDGE = 1600;
const IMG_QUALITY = 0.72;

export const docBytes = (doc) => (doc && doc.data ? Math.round((doc.data.length - (doc.data.indexOf(',') + 1)) * 0.75) : 0);

export const humanBytes = (n) =>
  n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

const readAsDataURL = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(new Error('Datei konnte nicht gelesen werden'));
  r.readAsDataURL(file);
});

const shrinkImage = (dataUrl) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, IMG_MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    res(cv.toDataURL('image/jpeg', IMG_QUALITY));
  };
  img.onerror = () => rej(new Error('Bild konnte nicht gelesen werden'));
  img.src = dataUrl;
});

// Wandelt eine Datei in einen speicherbaren Beleg. Wirft bei zu grossen Dateien.
export async function fileToDoc(file) {
  const raw = await readAsDataURL(file);
  const isImage = (file.type || '').startsWith('image/');
  const data = isImage ? await shrinkImage(raw) : raw;
  const doc = {
    name: file.name || 'Beleg',
    type: isImage ? 'image/jpeg' : file.type || 'application/octet-stream',
    data,
    addedAt: Date.now(),
  };
  doc.size = docBytes(doc);
  if (doc.size > MAX_DOC_BYTES) {
    throw new Error(
      `Datei ist nach der Komprimierung ${humanBytes(doc.size)} gross — erlaubt sind ${humanBytes(MAX_DOC_BYTES)}. ` +
      (isImage ? 'Mach einen kleineren Ausschnitt.' : 'Speichere das PDF kleiner oder als Screenshot.')
    );
  }
  return doc;
}

// Gesamtgrösse aller Belege — der Gist und localStorage sind endlich.
export const docsTotal = (transactions = []) =>
  transactions.reduce((sum, t) => sum + (t.doc ? t.doc.size || docBytes(t.doc) : 0), 0);

export const payoutsMissingDoc = (transactions = []) =>
  transactions.filter((t) => t.type === 'payout' && !t.doc).length;

export const openDoc = (doc) => {
  if (!doc || !doc.data) return;
  const w = window.open();
  if (!w) return;
  w.document.write(
    doc.type === 'application/pdf'
      ? `<iframe src="${doc.data}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`
      : `<img src="${doc.data}" style="max-width:100%;display:block;margin:0 auto">`
  );
  w.document.title = doc.name || 'Beleg';
};

export const today = () => new Date().toISOString().slice(0, 10);
export const monthKey = (d) => (d || '').slice(0, 7);
export const monthLabel = (key) => {
  const [y, m] = key.split('-');
  const names = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${names[Number(m) - 1] || m} ${y?.slice(2)}`;
};
export const daysUntil = (d) => (d ? Math.ceil((new Date(d + 'T23:59:59') - new Date()) / 86400000) : null);

// Journal-Rendite: rein statistischer Vergleichswert, manuell pro Monat erfasst.
// Liegt in `monthly` als { "2026-08": 4.2 } und geht in keine Geldrechnung ein.
export const journalStats = (monthly = {}) => {
  const entries = Object.entries(monthly)
    .filter(([, v]) => v !== null && v !== '' && !isNaN(v))
    .map(([k, v]) => ({ key: k, pct: Number(v) }))
    .sort((a, b) => a.key.localeCompare(b.key));
  if (!entries.length) return { entries, count: 0, avg: null, best: null, worst: null, positive: 0, last: null };
  const sum = entries.reduce((s, e) => s + e.pct, 0);
  return {
    entries,
    count: entries.length,
    avg: sum / entries.length,
    best: entries.reduce((m, e) => (e.pct > m.pct ? e : m)),
    worst: entries.reduce((m, e) => (e.pct < m.pct ? e : m)),
    positive: entries.filter((e) => e.pct > 0).length,
    last: entries[entries.length - 1],
  };
};

export const fmtPct = (v) => (v == null || v === '' || isNaN(v) ? '–' : `${Number(v) >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(1)}%`);

// Apex EOD-Trailing: der Drawdown trailt dem höchsten TAGESSCHLUSS, nicht der
// laufenden Balance. highWater steigt nur über einen ausdrücklichen Tagesabschluss.
export function calcAccount(a) {
  const balance = Number(a.balance) || 0;
  const start = Number(a.startBalance) || 0;
  const trail = Number(a.trail) || 0;
  const highWater = Math.max(Number(a.highWater) || start, start);
  const profit = balance - start;

  const levelFor = (hw) => {
    if (a.phase !== 'eval') {
      const lvl = hw - trail;
      return lvl >= start + 100 ? { level: start + 100, locked: true } : { level: lvl, locked: false };
    }
    return { level: hw - trail, locked: false };
  };

  const { level: ddLevel, locked: ddLocked } = levelFor(highWater);
  const pending = levelFor(Math.max(highWater, balance));
  const dayUnclosed = balance > highWater;

  const buffer = balance - ddLevel;
  const bufferAfterClose = balance - pending.level;
  const risk = Number(a.riskPerTrade) || 0;
  const lossesLeft = risk > 0 ? Math.max(0, Math.floor(buffer / risk)) : null;
  const bufferPct = trail > 0 ? Math.max(0, Math.min(1, buffer / trail)) : 0;

  const target = Number(a.target) || 0;
  const targetProgress = target > 0 ? Math.max(0, Math.min(1, profit / target)) : 0;
  const toTarget = Math.max(0, start + target - balance);

  const consistency = (Number(a.consistencyPct) || 50) / 100;
  const bestDay = Number(a.bestDayProfit) || 0;
  const maxAllowedDay = profit > 0 ? profit * consistency : 0;
  const consistencyKnown = bestDay > 0;
  const consistencyOk = !consistencyKnown || bestDay <= maxAllowedDay;
  const neededProfitForConsistency = consistency > 0 ? bestDay / consistency : 0;

  const safetyNet = start + trail + 100;
  const toSafetyNet = Math.max(0, safetyNet - balance);
  const safetyNetPct = Math.max(0, Math.min(1, (balance - start) / (trail + 100)));

  return {
    balance, start, trail, highWater, profit,
    ddLevel, ddLocked, pendingDdLevel: pending.level, dayUnclosed,
    buffer, bufferAfterClose, bufferPct,
    lossesLeft, risk,
    target, targetProgress, toTarget,
    bestDay, maxAllowedDay, consistencyOk, consistencyKnown, neededProfitForConsistency,
    safetyNet, toSafetyNet, safetyNetPct,
    expiryDays: daysUntil(a.expiryDate),
    passed: a.phase === 'eval' && target > 0 && profit >= target,
    // Drawdown verletzt: die Balance liegt auf oder unter dem Trailing-Level.
    breached: balance <= ddLevel,
  };
}

export function calcLedger(transactions = [], accounts = []) {
  let spent = 0;
  let received = 0;
  const byMonth = {};
  const byAccount = {};
  const byFirm = {};
  const byCategory = {};

  for (const t of transactions) {
    const amt = Math.abs(Number(t.amount) || 0);
    const isPayout = t.type === 'payout';
    if (isPayout) received += amt; else spent += amt;

    const mk = monthKey(t.date);
    byMonth[mk] = byMonth[mk] || { spent: 0, received: 0 };
    byMonth[mk][isPayout ? 'received' : 'spent'] += amt;

    if (t.accountId) {
      byAccount[t.accountId] = byAccount[t.accountId] || { spent: 0, received: 0 };
      byAccount[t.accountId][isPayout ? 'received' : 'spent'] += amt;
    }

    const firm = t.firm || '–';
    byFirm[firm] = byFirm[firm] || { spent: 0, received: 0 };
    byFirm[firm][isPayout ? 'received' : 'spent'] += amt;

    const cat = isPayout ? 'payout' : t.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + amt;
  }

  const net = received - spent;
  const months = Object.keys(byMonth).sort();
  const payouts = transactions
    .filter((t) => t.type === 'payout')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const firstDate = transactions.map((t) => t.date).filter(Boolean).sort()[0] || null;
  const lastPayoutDate = payouts.length ? payouts[payouts.length - 1].date : null;
  const monthsElapsed = firstDate
    ? Math.max(
        1,
        (new Date().getFullYear() - Number(firstDate.slice(0, 4))) * 12 +
          (new Date().getMonth() + 1 - Number(firstDate.slice(5, 7))) + 1
      )
    : 0;

  const seq = [];
  if (firstDate) {
    const cur = new Date(firstDate.slice(0, 7) + '-01');
    const end = new Date();
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      const m = byMonth[key] || { spent: 0, received: 0 };
      seq.push({ key, net: m.received - m.spent });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  const sum = (arr) => arr.reduce((acc, m) => acc + m.net, 0);
  const recent3 = sum(seq.slice(-3));
  const prior3 = seq.length >= 4 ? sum(seq.slice(-6, -3)) : null;

  const fundedReached = accounts.filter((a) => a.phase !== 'eval').length;
  const evalSpend = (byCategory.eval_fee || 0) + (byCategory.reset || 0);

  return {
    spent, received, net,
    roi: spent > 0 ? net / spent : null,
    multiple: spent > 0 ? received / spent : null,
    breakEvenGap: Math.max(0, spent - received),
    byMonth, byAccount, byFirm, byCategory, months, seq,
    payoutCount: payouts.length,
    avgPayout: payouts.length ? received / payouts.length : 0,
    biggestPayout: payouts.reduce((m, t) => Math.max(m, Math.abs(Number(t.amount) || 0)), 0),
    firstDate, lastPayoutDate,
    daysSinceLastPayout: lastPayoutDate ? Math.floor((new Date() - new Date(lastPayoutDate)) / 86400000) : null,
    monthsElapsed,
    burnPerMonth: monthsElapsed ? spent / monthsElapsed : 0,
    incomePerMonth: monthsElapsed ? received / monthsElapsed : 0,
    netPerMonth: monthsElapsed ? net / monthsElapsed : 0,
    profitableMonths: seq.filter((m) => m.net > 0).length,
    recent3, prior3,
    trendDelta: prior3 === null ? null : recent3 - prior3,
    fundedReached, evalSpend,
    costPerFunded: fundedReached > 0 ? evalSpend / fundedReached : null,
    accountsMap: Object.fromEntries(accounts.map((a) => [a.id, a])),
  };
}
