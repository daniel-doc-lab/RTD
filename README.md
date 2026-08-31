# RTD Bødeligaen

Klubbens bødekasse som en enkel webapp — registrer bøder på møder, se ranglisten over syndere, og hold styr på indbetalinger. Designet som et mørkt stadion-scoreboard ("Bødeligaen"), mobil-først med desktop-layout.

## Funktioner

- **Ligaen** — rangliste over medlemmer sorteret efter gæld, med pulje ("i kassen") og samlet udestående.
- **Møder** — start et møde, klik en spiller og klik derefter bøderne af (tryk flere gange for flere af samme bøde). Fortryd direkte i mødets bødeliste. Afslut/genåbn/slet møder.
- **Særbøder** — frit beløb og egen beskrivelse, ud over de faste takster.
- **Takster** — bødekataloget er forudindlæst med klubbens 18 bøder (Mobil, Mads bøde, To late BIG/SMALL BET, osv.) og kan redigeres frit.
- **Medlemmer** — tilføj, omdøb, udmeld/genindmeld; medlemslisten er dynamisk.
- **Indbetalinger** — registrer betaling pr. medlem (forudfyldt med hele gælden); saldoen reduceres, og beløbet lægges i kassen.
- **Data** — gemmes automatisk i browseren (localStorage) med eksport/import som JSON under Indstillinger.

## Kørsel

Ingen build eller server nødvendig — åbn `index.html` i en browser, eller udgiv repoet via GitHub Pages.

## Filer

- `index.html`, `styles.css`, `app.js` — selve appen (vanilla JS, ingen afhængigheder).
- `build.mjs` — `node build.mjs` bygger `dist/rtd-boedeliga.html`, hele appen samlet i én fil til nem deling.
- `design/` — de 10 oprindelige mockup-retninger (Bødeligaen, nr. 06, blev valgt).
