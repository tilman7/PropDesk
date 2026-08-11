# PropDesk v9

Single-file prop-account risk manager, cost ledger and journal log.
Formerly RiskDesk — renamed in v9 because it is no longer only about risk.
`index.html` at the repo root is the built app — that is what GitHub Pages serves.
It is generated, never hand-edited.

## Build

```bash
npm install     # first time only
node build.mjs  # regenerates index.html
```

Commit `src/` **and** the rebuilt `index.html` together, otherwise the live site
does not change. See `CLAUDE.md` for the full working rules.

## Source layout

| File | Purpose |
|---|---|
| `src/theme.js` | Colour tokens (dark/light), font stack, number styles |
| `src/lib.js` | Storage, Gist sync, currency, formatting, **all calculations** |
| `src/ui.js` | Shared primitives (fields, bars, rows, modal, grid cells) |
| `src/accounts.js` | Table row, detail page, form, quick balance, archive |
| `src/ledger.js` | Finances: stats, month chart, transaction list and form |
| `src/App.js` | Shell, navigation, views, sync orchestration, settings, handlers |
| `build.mjs` | Bundles `src/main.js` into the root `index.html` |

No JSX — components call `h(...)` (`React.createElement`) directly.

## Data shape

```jsonc
{
  "accounts": [ /* unchanged since v6 */ ],
  "transactions": [
    { "id": "…", "type": "expense|payout",
      "category": "eval_fee|reset|activation|data_fee|other|payout",
      "amount": 137, "date": "2026-08-09",
      "accountId": "…", "firm": "Apex", "note": "" }
  ],
  "monthly": { "2026-07": 3.2, "2026-08": -1.4 },
  "updatedAt": 1234567890
}
```

`monthly` holds the manually entered journal return per month (percent). It is a
purely statistical comparison value and never enters a money or risk calculation.

Amounts are **always stored in USD**. The currency switch is display-only.
v6/v7/v8 blobs migrate automatically.

## v9 — redesign

Same features, new surface. Nothing was removed.

- **Navigation instead of one long page.** Three areas — Risiko, Finanzen, Archiv —
  plus a full-width **account detail page** (was a modal). Archive is an area, not a dialog.
- **Risiko leads with the number that matters:** total max risk per trade today, then a
  four-cell status grid, then accounts as a calm **table** (phase, risk, buffer bar,
  remaining losing trades, status) instead of a card carpet.
- **New look:** neutral greys, one accent colour, semantics reserved for good / warning /
  critical. Helvetica system stack, tabular figures, 1px rules instead of nested boxes,
  no gradients. Light and dark are designed as equals.
- **Charts:** month history now draws payouts above the axis, costs below, with gridlines,
  a value axis, a cumulative net area/line on top — and a journal row under the time axis.
- **Journal return.** Monthly percentage from the trading journal, entered by clicking the
  cell under the chart or in Settings. Statistical only; feeds the "Ø Journal-Rendite" metric.
- **Settings is an area, not a dialog:** appearance (theme, currency), journal returns,
  sync and backup all live under one tab.
- **Account form slimmed:** preset, phase, name, risk, balance, expiry up front —
  everything else behind "Weitere Werte".
- **No web fonts.** The page is fully self-contained and works offline.

## Naming and mark

The app is **PropDesk**. The mark is a ring with a filled arc — the drawdown buffer
read as a gauge. It sits next to the wordmark in the header and is the favicon
(dark arc on light) and the home-screen icon (`icon.png`, `icon-512.png`).

Two things deliberately keep the old name for compatibility: the localStorage keys
`riskdesk:data` / `riskdesk:settings` and the Gist description `RiskDesk Sync Data`.
Renaming either would orphan existing data and the sync target.
