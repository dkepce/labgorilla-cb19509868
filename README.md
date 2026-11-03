# LabGorilla

A lab notebook for experiments, protocols, inventory and planning. Plain HTML/CSS/JS, **no build step** — these files are the app. Installable (PWA), works offline.

## Run it locally
```
python -m http.server 8123
```
Open http://localhost:8123 in Chrome/Edge/Brave (the install/offline parts need a web address, not a double-click).

## Where the data lives
* Always in the browser (localStorage + IndexedDB for attachments).
* Optionally in a folder she picks (top bar → "Saved in this browser" → Choose folder): every change is written to `LabGorilla.lbk`, attachments go to `LabGorilla files/` next to it. Needs the File System Access API (Chrome/Edge; in Brave enable it in `brave://flags`).
* Backup / Restore buttons in the same dialog; "Load example data" fills in a demo.

## Files
| File | What it does |
|---|---|
| `index.html`, `style.css` | page + styles (colors are CSS variables, swapped by the Colors picker) |
| `js/util.js` | dates, ids, small helpers |
| `js/store.js` | data model, autosave, `.lbk` file + folder sync, attachments |
| `js/app.js` | render loop, event handling, top bar, dialogs, themes, `#/entry/<code>` links |
| `js/items.js` | pieces shared by Notebook and Inventory (attachments, supplier details, new material) |
| `js/notebook.js` `protocols.js` `inventory.js` `calendar.js` | the four tabs |
| `js/cards.js`, `cards.css` | Procedure tab: card picker, plate map, timeline, flow path, freezer box, dilution series, gel lanes (stored per entry in `entry.extra`), step timers, progress ring |
| `js/analysis.js` | analysis cards on the Procedure tab: ImageJ analysis record, data table (paste/load CSV, statistics, dot plot, copy for Prism), figure with auto-built legend, raw data location, "Copy for Prism" on dilution and plate cards |
| `js/pdms.js` | chip-making cards: PDMS batch (base/curing-agent calculator from a total or mould area x thickness, degas/cure timers, plasma bonding, leak test, step strip) and 3D model (STL) viewer (binary + ASCII STL, own small WebGL renderer, size/triangles/volume, snapshot in the PDF) |
| `js/folders.js` | one level of folders for protocols and inventory (`data.folders.proto` / `.item`, items point at one with `.folder`), drag and drop, moving experiments between projects |
| `js/refs.js` | references on an entry or protocol: DOI / PubMed / link lookup, Zotero search, formatting, PDF styles |
| `js/library.js` | References tab: all papers, folders (`data.folders.ref`), search, "cited in", `.ris` import + export, "From library" picker for entries/protocols (a paper added here has `lib: true` and is kept even when nothing cites it) |
| `js/thesis.js` | Thesis tab: link a .docx (File System Access API, handle kept in IndexedDB; falls back to reading the file once), headings + word counts read from the XML inside the docx (only the outline is stored in `data.thesis`), chapter status, evidence links to entries / protocols / papers |
| `js/seed.js` | example data |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline + install |

## Links from other apps
`<address>#/entry/<entry code or id>` opens that entry, `<address>#/calendar/YYYY-MM-DD` opens the calendar on that day (Hedgehog uses these).

## `.lbk` file format
JSON: `{ app: "labgorilla", version: 1, saved, settings, data }` where `data` has `projects, experiments, entries, protocols, items, types, events`. Each item may carry `expires` (`YYYY-MM-DD` or empty); `settings.warnDays` is how many days ahead an expiry is flagged (default 30).
