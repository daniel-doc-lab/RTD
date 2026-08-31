# RTD Bødeligaen — projektguide

Dansk klub-bødekasse-app for RT 11 Frederiksberg. Al UI-tekst er på dansk; beløb i DKK ("1.234 kr." — punktum som tusindtalsseparator).

## Struktur

- `index.html` + `styles.css` + `app.js` — hele appen, vanilla JS uden afhængigheder eller build-kæde. `app.js` er én IIFE: seed/migrering → helpers → views (render-funktioner returnerer HTML-strenge) → modals → `actions`-objekt (event-delegation via `data-action`-attributter).
- `node build.mjs` → `dist/rtd-boedeliga.html` (enkeltfil til den delte live-udgave).
- `test/test-app.mjs` — Playwright ende-til-ende-suite. Kør: `npm install playwright && node test/test-app.mjs` (sæt evt. `CHROMIUM_PATH`). **Kør altid suiten før commit.**
- `design/` — 10 mockup-retninger (kun historik; retning 06 blev appen). `docs/` — mål, idékatalog, visuelt oplæg.

## Vigtige regler

- State er versioneret (`version: 4`). Enhver ny/ændret datastruktur kræver et migreringstrin i `migrate()` OG defaults i `normalize()` — gamle backups og den delte live-state skal altid kunne indlæses.
- Al brugertekst escapes med `esc()` — også i attributter. Nye mutérende handlinger skal: kalde `log()` (revisionslog), tilføjes i `MUTATING`-listen (visningstilstand) og bruge `commit()`/`commitQuiet()`.
- Sletning af møder/medlemmer går via `state.trash` (blødt slet), aldrig hårdt slet.
- Live-udgaven er en delt Claude-artifact hvor brugere kan have gemt data inde fra siden. Ved republicering: flet altid den nyeste publicerede state (`#rtd-state`-blokken) ind i den nye `dist`-fil — overskriv aldrig brugerdata.
- Design: mørkt scoreboard-tema (CSS-variabler i `:root`), Anton + Barlow Condensed, amber-accent. Ingen emoji i UI — inline SVG-ikoner (`IC`-objektet). Hit targets ≥ 44 px. Respekter `prefers-reduced-motion`.
