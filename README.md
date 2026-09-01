# RTD Bødeligaen

Klubbens digitale bødekasse — bygget til RT 11 Frederiksberg. Registrer bøder på klubmøder med få tryk, følg ranglisten over syndere, håndtér indbetalinger og få statistik og kassererrapporter. Designet som et mørkt stadion-scoreboard, mobil-først med fuldt desktop-layout.

**Live-udgave:** Appen kører som en delt Claude-artifact (delbart link med fælles gemte data). Den kan også åbnes direkte fra `index.html` eller hostes via GitHub Pages.

## Funktioner

### Kernen
- **Ligaen** — rangliste sorteret efter gæld med guld/sølv/bronze, "rent ark" for de artige, pulje og udestående. Tal tæller op ved ændringer.
- **Klubår** — møder organiseret i regnskabsår (2024/25, 2025/26, …). Hvert år autogenereres med 20 placeholder-møder (hver 14. dag fra første mandag i september), som frit kan redigeres med titel, dato, beskrivelse og links.
- **Bøderegistrering** — klik en spiller → klik bøderne. Tællere på hver takst, hurtig skift mellem medlemmer, fortryd i mødeloggen. Særbøder med frit beløb og egen tekst.
- **Takster** — klubbens 18 bøder forudindlæst (Mobil 30 kr. … Ingen fremmøde ved tilmelding på RTD 800 kr.), fuldt redigerbare.
- **Medlemmer** — dynamisk liste (forudindlæst med klubbens 11 medlemmer), omdøb, udmeld/genindmeld, slet med gendannelse.
- **Indbetalinger** — forudfyldt med hele gælden, delbetaling, note (fx MobilePay). Saldo falder, kassen vokser.

### Gamification
- **Formand** — ét medlem kan krones 👑; kronen vises overalt og glimter.
- **Dyre bøder** — takster på 300 kr.+ markeres med rødt lyn og konfettiregn, når de uddeles.
- **Streaks** — bødestreaks ("3 møder i træk" med titler fra *Varm* til *LEGENDE*), "Stamkunde" (samme bøde gentagne gange) og den omvendte "Fredet" (møder i træk uden bøde). Samlet streak-panel på forsiden.
- **Hædersbevisninger** — "Årets synder", "Mest artige", "Comeback" og "Grand Slam" vises på medlemsprofilen.
- **Sæsonafslutning** — én knap låser alle årets møder og kårer podiet med konfetti.

### Overblik og drift
- **Statistik** pr. klubår: bøder pr. møde (søjler), kassebeholdning over tid (kurve), top bødetyper, sæsonrekorder og sammenligning på tværs af klubår.
- **Kassererrapport** — pæn printbar rapport pr. klubår (print/PDF eller gem som fil).
- **Afbudsforslag** — ved afbud tæt på mødedato foreslår bødevælgeren automatisk den rette afmeldingsbøde.
- **Visningstilstand** — skjul al registrering på en enhed, så linket trygt kan deles med medlemmerne.
- **Papirkurv** — slettede møder og medlemmer kan gendannes i 30 dage.
- **Revisionslog** — alle registreringer logges med tidspunkt.
- **Backup** — JSON-eksport/-import under Indstillinger.

## Kørsel og udvikling

Ingen build-kæde, ingen afhængigheder — ren HTML/CSS/JS:

```bash
# Kør: åbn index.html i en browser (eller enhver statisk webserver)

# Byg enkeltfils-udgaven (bruges til den delte live-udgave):
node build.mjs        # → dist/rtd-boedeliga.html

# Kør testsuiten (kræver Playwright + Chromium):
npm install playwright
node test/test-app.mjs
```

## Arkitektur

| Fil | Rolle |
|---|---|
| `index.html` | Skal + faner + fonte (Anton/Barlow Condensed via Google Fonts) |
| `styles.css` | Hele designsystemet: scoreboard-tema, animationer, print-CSS |
| `app.js` | Al logik: state, migrering, views, handlinger, grafer (~2.000 linjer vanilla JS) |
| `build.mjs` | Samler appen i én HTML-fil til deling |
| `test/test-app.mjs` | Ende-til-ende røgtest (Playwright) af alle flows |
| `design/` | De 10 oprindelige mockup-retninger (nr. 06 "Bødeligaen" blev valgt) |
| `docs/` | Projektmål, feature-katalog, visuelt oplæg |

**Datamodel (state v4):** `clubYears` → `meetings` → `fines` (takst- eller særbøde) pr. `member`; `payments` reducerer saldo; `fineTypes` er takstkataloget; `audit` er revisionsloggen; `trash` er papirkurven. Se `docs/projekt.md` for felter og regler.

**Lagring:** localStorage (autosave ved hver handling) + valgfri delt lagring når appen kører som Claude-artifact ("Gem ændringer"-knappen publicerer til alle). `migrate()` løfter automatisk gamle dataversioner (v1→v4), og `normalize()` gør importeret data ufarligt.

## Videre arbejde

Se `docs/samtale-resume.md` (komprimeret udviklingshistorik — startpunkt for en ny AI-session), `docs/projekt.md` (mål, beslutninger, status) og `docs/feature-ideer.md` (resterende idéer). Ny sæson startes i appen med "Opret klubår"-knappen — der kræves ingen kodeændringer.
