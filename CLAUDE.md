# RTD Bødeligaen — projektguide

Dansk klub-bødekasse-app for RT 11 Frederiksberg. Al UI-tekst er på dansk; beløb i DKK ("1.234 kr." — punktum som tusindtalsseparator).

## Struktur

- `index.html` + `styles.css` + `app.js` — hele appen, vanilla JS uden afhængigheder eller build-kæde. `app.js` er én IIFE: seed/migrering → helpers → views (render-funktioner returnerer HTML-strenge) → modals → `actions`-objekt (event-delegation via `data-action`-attributter).
- `node build.mjs` → `dist/rtd-boedeliga.html` (enkeltfil til den delte live-udgave).
- `test/test-app.mjs` — Playwright ende-til-ende-suite. Kør: `npm install playwright && node test/test-app.mjs` (sæt evt. `CHROMIUM_PATH`). **Kør altid suiten før commit.**
- `design/` — 10 mockup-retninger (kun historik; retning 06 blev appen). `docs/` — mål, idékatalog, visuelt oplæg.
- Datamodel v5: `members` (`active`, `prospect`, `years[]`), `fineTypes`, `clubYears`, `meetings`, `fines`, `payments`, `expenses`, `writeoffs`, `rules`, `audit`, `trash`, `formandId`.

## Vigtige regler

- State er versioneret (`version: 5`). Enhver ny/ændret datastruktur kræver et migreringstrin i `migrate()` OG defaults i `normalize()` — gamle backups og den delte live-state skal altid kunne indlæses.
- Al brugertekst escapes med `esc()` — også i attributter. Nye mutérende handlinger skal: kalde `log()` (revisionslog), tilføjes i `MUTATING`-listen (visningstilstand) og bruge `commit()`/`commitQuiet()`.
- `MUTATING` styrer tre ting på én gang: blokering i visningstilstand, og — via `runAction()` — om der lægges et fortryd-punkt på stakken. Handlinger der ændrer data uden for et klik (fx `import-json`s `FileReader`) skal selv kalde `pushUndo()` før ændringen.
- Medlemskab er pr. klubår (`m.years`). Bruger man `activeMembers()` et sted hvor der er et konkret klubår eller møde, skal det i stedet være `meetingMembers(meet)` eller `inYear(m, yearId)` — ellers dukker medlemmer op i år, de ikke var med i.
- Kassen er `paymentsInTotal() − expenseTotal()`. Gæld er `fines − payments − writeoffs`; afskrivninger (`state.writeoffs`) nulstiller en saldo uden at lægge penge i kassen.
- Sletning af møder/medlemmer går via `state.trash` (blødt slet), aldrig hårdt slet.
- Live-udgaven er en delt Claude-artifact hvor brugere kan have gemt data inde fra siden. Ved republicering: flet altid den nyeste publicerede state (`#rtd-state`-blokken) ind i den nye `dist`-fil — overskriv aldrig brugerdata.
- Design: mørkt scoreboard-tema (CSS-variabler i `:root`), Anton + Barlow Condensed, amber-accent. Ingen emoji i UI — inline SVG-ikoner (`IC`-objektet). Hit targets ≥ 44 px. Respekter `prefers-reduced-motion`.
