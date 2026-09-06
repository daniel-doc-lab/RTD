# RTD Bødeligaen

Klubbens digitale bødekasse — bygget til RT 11 Frederiksberg. Registrer bøder på klubmøder med få tryk, følg ranglisten over syndere, håndtér indbetalinger og få statistik og kassererrapporter. Designet som et mørkt stadion-scoreboard, mobil-først med fuldt desktop-layout.

**Live-udgave:** Appen kører som en delt Claude-artifact (delbart link med fælles gemte data). Det er dér klubbens rigtige tal bor.

**GitHub Pages:** `.github/workflows/pages.yml` udgiver appen på `https://daniel-doc-lab.github.io/RTD/` ved hvert push til `main`. Den udgave er bevidst en **tom demo**: ingen bøder, ingen gæld, og startdataene er opdigtede navne (Anders Bak, Birger Colding, …), så intet offentligt peger på klubben. `check-no-data.mjs` afbryder udgivelsen, hvis en fil bærer data i `#rtd-state` eller nævner et af klubbens rigtige medlemsnavne — navnelisten læses fra den committede `dist`, så kontrollen følger med af sig selv.

Pages kan ikke tage imod et gem og synkroniserer derfor ikke. Send medlemmerne Claude-linket i stedet: det er altid ajour.

Sådan slås det til: **Settings → Pages → Build and deployment → Source: GitHub Actions.** Derefter kører udgivelsen af sig selv.

## Funktioner

### Kernen
- **Ligaen** — rangliste sorteret efter gæld, med podie for top-3, "rent ark" for de artige, pulje og udestående. Tal tæller op ved ændringer.
- **Klubår** — møder organiseret i regnskabsår (2024/25, 2025/26, …). Hvert år autogenereres med 20 placeholder-møder (hver 14. dag fra første mandag i september), som frit kan redigeres med titel, dato, beskrivelse og links.
- **Bøderegistrering** — klik en spiller → klik bøderne. Tællere på hver takst, hurtig skift mellem medlemmer, fortryd i mødeloggen. Særbøder med frit beløb og egen tekst.
- **Bulk-bøde** — vælg én takst, vælg flere medlemmer, giv bøden til alle på én gang.
- **Takster** — klubbens 18 bøder forudindlæst (Mobil 30 kr. … Ingen fremmøde ved tilmelding på RTD 800 kr.), fuldt redigerbare med eget ikon.
- **Medlemmer** — dynamisk liste (forudindlæst med 11 demomedlemmer, som overskrives af klubbens egne), medlemskab pr. klubår, filtre (Aktive, Prospects, Udgåede, Skylder, Alle), omdøb, udmeld/genindmeld, slet med gendannelse.
- **Indbetalinger** — forudfyldt med hele gælden, delbetaling, note (fx MobilePay). Saldo falder, kassen vokser.
- **Kassen** — beholdning = indbetalinger − udgifter. Udgiftsposter registreres og trækkes fra, både i statistikken og i kassererrapporten.
- **Fortryd/gendan** — undo/redo over de seneste 20 dataændringer, med Ctrl/Cmd+Z og Ctrl+Shift+Z. Stryg en bøde til venstre i mødets liste for at fjerne den.
- **Søg og spring til** — ét søgefelt på tværs af medlemmer, møder og takster.

### Gamification
- **Formand** — ét medlem kan krones; kronen vises overalt og glimter, når formanden selv får en bøde.
- **Prospects** — kommende medlemmer med eget spire-ikon og forløb: »x af 3 møder«, med valgfri længde og manuel overstyring.
- **Dyre bøder** — takster på 300 kr.+ markeres med rødt lyn, kasseapparat-rulning på mødets total og konfettiregn; 500 kr.+ giver et "BØDE!"-fuldskærmsoverlay.
- **Streaks** — bødestreaks ("3 møder i træk" med titler fra *Varm* til *LEGENDE*), "Stamkunde" (samme bøde gentagne gange) og den omvendte "Fredet" (møder i træk uden bøde). Samlet streak-panel på forsiden.
- **Hædersbevisninger** — "Årets synder", "Mest artige", "Comeback" og "Grand Slam" som metalliske badges på medlemsprofilen.
- **Medlemskort** — profilen som et samlekort, der kan gemmes som SVG og deles.
- **Hall of Fame** — egen fane med alle tiders rekorder, kårede pr. sæson, formandsrækken og alle uddelte hædersbevisninger.
- **Sæsonafslutning** — én knap låser alle årets møder, kårer podiet med konfetti og åbner årsopgørelsen, hvor restgæld kan afskrives eller overføres.
- **Bødemesteren** — appens maskot i sidebaren: bødekassen selv, med kække replikker der roterer af sig selv og bygges på klubbens egne tal.

### Overblik og drift
- **Statistik** pr. klubår: bøder pr. møde (søjler), kassebeholdning over tid (kurve), top bødetyper, sæsonrekorder, betalingsdisciplin (dage fra bøde til betaling) og sammenligning på tværs af klubår.
- **Farvetema pr. bødekategori** — afbud blå, forsinkelse orange, adfærd lilla, pligt grøn, øvrigt amber. Farven følger ikoner, søjler og sparkline, så mønstre kan aflæses på et blik.
- **Kassererrapport** — pæn printbar rapport pr. klubår (print/PDF eller gem som fil).
- **Afbudsforslag** — ved afbud tæt på mødedato foreslår bødevælgeren automatisk den rette afmeldingsbøde.
- **Visningstilstand** — skjul al registrering på en enhed, så linket trygt kan deles med medlemmerne. Delevejledning ligger i indstillinger.
- **Papirkurv** — slettede møder og medlemmer kan gendannes i 30 dage.
- **Revisionslog** — alle registreringer logges med tidspunkt (seneste 800).
- **Backup** — JSON-eksport/-import under Indstillinger, med påmindelse når der er gået for længe siden sidste eksport.
- **Konfliktsikring** — gemmer en anden først, lægges dine ugemte ændringer til side og kan hentes frem igen efter genindlæsningen.

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
| `app.js` | Al logik: state, migrering, views, handlinger, grafer (~3.700 linjer vanilla JS) |
| `build.mjs` | Samler appen i én HTML-fil til deling |
| `test/test-app.mjs` | Ende-til-ende røgtest (Playwright), 48 tjek af alle flows — inkl. at klubbens rigtige data migreres og gemmes uden tab |
| `design/` | De 10 oprindelige mockup-retninger (nr. 06 "Bødeligaen" blev valgt) |
| `docs/` | Projektmål, feature-katalog, visuelt oplæg |
| `.github/` | Pages-arbejdsgang + `check-no-data.mjs`, der holder den offentlige udgave fri for klubdata og rigtige navne |

**Datamodel (state v7):** `clubYears` → `meetings` → `fines` (takst- eller særbøde) pr. `member`; `payments` reducerer saldo, `writeoffs` nulstiller den uden at fylde kassen, `expenses` tømmer kassen; `fineTypes` er takstkataloget; `formandHistory` er formandsrækken; `audit` er revisionsloggen; `trash` er papirkurven. Medlemskab er pr. klubår (`members[].years`). Se `docs/projekt.md` for felter og regler.

**Lagring:** localStorage (autosave ved hver handling) + delt lagring når appen kører som Claude-artifact ("Gem ændringer"-knappen publicerer til alle med linket). `migrate()` løfter automatisk gamle dataversioner (v1→v7), og `normalize()` gør importeret data ufarligt. Ved republicering skal den nyeste live-state altid flettes ind i den nye `dist`-fil — se `CLAUDE.md`.

## Data og offentlighed

Repoet er offentligt. `dist/rtd-boedeliga.html` er et øjebliksbillede af den delte udgave og indeholder derfor klubbens rigtige data — navne, bøder, gæld og revisionslog — som alle kan læse på GitHub. Det er bevidst, så længe det kun er RT 11's interne bødehumor; skal det ikke være offentligt, er der to veje:

1. Gør repoet privat (Settings → General → Change visibility). Pages kræver da et betalt GitHub-abonnement.
2. Behold repoet offentligt, men fjern data fra `dist` og opbevar backup som JSON uden for GitHub.

Pages-udgaven er upåvirket af valget — den er datafri i begge tilfælde.

## Videre arbejde

Se `docs/samtale-resume.md` (komprimeret udviklingshistorik — startpunkt for en ny AI-session), `docs/projekt.md` (mål, beslutninger, status) og `docs/feature-ideer.md` (resterende idéer). Ny sæson startes i appen med "Opret klubår"-knappen — der kræves ingen kodeændringer.
