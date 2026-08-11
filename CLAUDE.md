# PropDesk — Arbeitsanweisungen

Persönliches Risk- und Kostentool für Prop-Trading-Accounts (Apex, EOD-Trailing).
Läuft als statische Seite auf GitHub Pages, Daten liegen im Browser und synchronisieren
über einen privaten GitHub-Gist.

## Die wichtigste Regel

**`index.html` niemals von Hand bearbeiten.** Die Datei ist ein minifizierter
esbuild-Output und wird bei jedem Build vollständig überschrieben. Änderungen gehören
ausschliesslich in `src/`, danach:

```bash
npm install     # nur beim ersten Mal
node build.mjs  # erzeugt index.html neu
```

Ein Commit enthält immer beides: die geänderten `src/`-Dateien **und** die neu gebaute
`index.html`. Wird nur `src/` committet, ändert sich die Live-Seite nicht.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/theme.js` | Farbtokens (dark/light), Schriftstapel, Zahlen-Stile |
| `src/lib.js` | Storage, Gist-Sync, Währung, Formatierung, **alle Berechnungen** |
| `src/ui.js` | Basiskomponenten (Felder, Balken, Zeilen, Modal, Raster) |
| `src/accounts.js` | Tabellenzeile, Detailseite, Formular, Quick-Balance, Archiv |
| `src/ledger.js` | Finanzen: Kennzahlen, Monatschart, Zahlungsliste, Zahlungsformular |
| `src/App.js` | Shell, Navigation, Ansichten, Sync, Einstellungen, Handler |
| `build.mjs` | Bundelt `src/main.js` und schreibt `index.html` |

Es wird **kein JSX** verwendet: die Komponenten rufen `h(...)` (`React.createElement`)
direkt auf. Das hält den Build simpel und die Dateien lesbar.

Reines Design und Layout: `src/theme.js` plus die Style-Objekte in den Komponenten.
Für einen Redesign-Auftrag reicht das — `src/lib.js` bleibt dabei unangetastet.

## Was nicht kaputtgehen darf

**Rechenlogik in `src/lib.js`.** `calcAccount()` bildet Apex' EOD-Trailing ab: der
Drawdown trailt dem höchsten *Tagesschluss*, nicht der laufenden Balance. Der High-Water-
Wert steigt deshalb nur über einen ausdrücklichen Tagesabschluss. Diese Trennung nicht
"vereinfachen" — sie ist der Kern des Tools und war vorher ein Bug.

**Datenformat.** Beträge liegen immer in USD. Der Währungsschalter betrifft die Anzeige
und zusätzlich das Betragsfeld im Zahlungsformular: dort steht der Wert in der
Anzeigewährung und wird über `toInput()` / `fromInput()` (in `src/lib.js`) umgerechnet.
Account-Werte werden ausnahmslos über `fmtUsd()` ausgegeben — Risiko-Ansicht, Detailseite,
Archiv, Formulare. Es sind die wörtlichen Zahlen aus der Prop-Firm-Plattform; sie dürfen
nirgends mit der Anzeigewährung wandern und tragen auch keine CHF-Nebenzeile. Über `fmt()`
laufen nur Zahlungen und daraus abgeleitete Summen. Wer eine neue Account-Zahl anzeigt,
nimmt `fmtUsd()`.
`migrate()` liest ältere Blobs ohne `transactions` und ohne `monthly`. Feldnamen in
`accounts` und `transactions` nicht umbenennen, sonst verliert der Nutzer beim nächsten
Laden seine Daten.

**Journal-Rendite.** `monthly` ist eine Map `{ "2026-08": 4.2 }` mit dem manuell erfassten
Prozentwert aus dem Trading-Journal. Rein statistisch — dieser Wert darf in keine Geld-,
Drawdown- oder Risikorechnung einfliessen.

**Blown-Accounts.** `calcAccount().breached` ist wahr, sobald die Balance auf oder unter
dem Drawdown-Level liegt. Archiviert wird nie automatisch, sondern über einen Klick —
die Balance ist manuell erfasst, ein Tippfehler darf keinen Account wegräumen.
`archivedAs` ist `'passed'` oder `'blown'`; fehlt das Feld, gilt der Account als bestanden.

**Activation Fee im Zahlungsformular.** Ist einem Ausgaben-Eintrag ein Eval-Account mit
offener Gebühr zugeordnet, lässt sich die Fee als zweite Buchung mitgeben. `TxForm` ruft
generell `onSubmit(tx, extras)` mit einer Liste weiterer Buchungen — Kopien aus dem
Anzahl-Feld und die Fee. `saveTx()` legt alle an und setzt `activationPaid` am Account,
sobald eine `activation`-Buchung dabei ist.

**Anzahl bei Ausgaben.** `qty > 1` legt identische Buchungen an, nummeriert `1/n` … `n/n`
in der Notiz. Der Beleg bleibt an der ersten, die Kopien bekommen `doc: null` — sonst läge
dieselbe Datei mehrfach im Gist. Nur beim Neuerfassen von Ausgaben sichtbar: Payouts hängen
je an einem eigenen Zertifikat, und Bearbeiten betrifft immer genau eine Buchung.

**Belege.** Payouts erfordern ein Zertifikat, Ausgaben nicht. Dokumente liegen als
Data-URL unter `transaction.doc` und wandern durch den Gist — deshalb werden Bilder in
`fileToDoc()` auf 1600 px verkleinert und alles über `MAX_DOC_BYTES` abgelehnt. Diese
Grenze nicht anheben, ohne den Sync mit echten Datenmengen zu prüfen.

**Kein `localStorage`-Key umbenennen** (`riskdesk:data`, `riskdesk:settings`) und die
Gist-Beschreibung `RiskDesk Sync Data` nicht ändern — daran findet die App ihren Gist wieder.
Die App heisst seit v9 PropDesk; diese beiden technischen Bezeichner bleiben bewusst alt,
sonst verliert der Nutzer Daten und Sync-Ziel.

**Theme synchron anwenden.** `applyTheme()` mutiert das Token-Objekt `T` und wird im
Render-Rumpf von `App` aufgerufen, nicht in einem Effekt. In einem Effekt wären die
Farben beim ersten Rendern nach dem Umschalten noch die alten.

**Responsives Verhalten.** `useNarrow()` aus `src/ui.js` liefert `true` unter 760px.
Layouts, die als Tabelle gedacht sind (Account-Liste, Archiv, Zahlungsliste), stapeln
sich darunter; die Navigation wird zum Ausklappmenü im Header. `html, body` haben
`overflow-x: hidden` — kein Element darf breiter als der Viewport werden. Nach Layout-
Änderungen bei 320px, 390px und 1440px gegenprüfen.

**Keine Build-Tools, Frameworks oder Web-Fonts hinzufügen.** Eine HTML-Datei ohne externe
Abhängigkeiten zur Laufzeit ist Absicht: die Seite lädt offline, funktioniert als PWA auf
dem iPhone und hat keine Angriffsfläche über Dritt-CDNs. Die Schrift ist bewusst der
System-Helvetica-Stapel.

## Testen vor dem Commit

`index.html` im Browser öffnen und durchgehen: Account anlegen, Balance ändern,
Tag abschliessen, Detailseite öffnen und speichern, Zahlung erfassen, Journal-Rendite
eintragen (im Chart und unter Einstellungen), Währung umschalten, Theme umschalten,
Einstellungen → Export JSON. Konsole muss frei von Fehlern sein.
