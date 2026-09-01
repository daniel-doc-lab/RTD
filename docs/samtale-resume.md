# Samtale-resumé — komprimeret projekthistorik (til ny LLM/session)

Dette dokument komprimerer hele udviklingssamtalen mellem Daniel (dkuntkes@gmail.com, klub: RT 11 Frederiksberg) og Claude Code, 31. august 2026. Læs dette først, derefter `docs/projekt.md` (mål/datamodel) og `CLAUDE.md` (kodekonventioner). Så har en ny model fuld kontekst.

## Nøglelinks

- **Repo:** github.com/daniel-doc-lab/rtd — branch `claude/fines-app-mockups-kvz4pe` (al kode + docs)
- **Live-app (delt Claude-artifact med klubbens rigtige data):** https://claude.ai/code/artifact/d44c493f-0362-4947-810d-ea9a05aca475
- **Design-canvas (de 10 mockups):** https://claude.ai/code/artifact/9b8f3871-3759-4585-b30e-faea7f275198

## Forløbet, tur for tur

### 1. Opgaven (Daniels første besked)
Byg en simpel app til at administrere bøder i en medlemsklub: klik personer og bøder af pr. møde, sum pr. person, medlemsprofiler, indbetalinger der reducerer gæld, unikke møder, særbøder ud over taksterne. Generér 10 helt forskellige mockups, hvorefter Daniel vælger retning. Afklaringssvar: mobil + desktop, hele tone-spektret, ~17 medlemmer (10–30), kun bødemesteren registrerer.

### 2. 10 mockups leveret
Ét design-canvas med 10 telefon-mockups af samme kerneskærm: 01 Nordisk minimal, 02 Mørk fintech, 03 Kridttavlen, 04 Kassererens protokol, 05 Neobrutalist, **06 Bødeligaen (stadion-scoreboard)**, 07 Kvitteringen, 08 Blød og venlig, 09 Bødetidende (avis), 10 Arkade. Kilder i `design/`. Et baggrundsgennemsyn fandt og rettede 15+ småfejl i mockups (overløb, kolonneforskydninger, danske stavefejl som "à jour"→"ajour").

### 3. Valg + bødekatalog
Daniel valgte **06 Bødeligaen** og leverede klubbens takster fra regneark (18 stk., indlæst som seed): Mobil 30, Dårlig adfærd 30, Mads bøde 500, Diverse bøde 30, Afmelding efter frist 150, Afmelding 24 timer 300, Glemt formandskæde 500, Ikke rejse sig 30, Afbryde 50, Mødereferat 350, Ingen fremmøde ved tilmelding på RTD 800, Nål 30, Toilet 50, Dårlig pligt 150, To late BIG BET 100, To late SMALL BET 50, Glemt pligt 150, Dårlig planlægning 50.

### 4. App v1 bygget (state v1)
Vanilla HTML/CSS/JS uden afhængigheder: Ligaen (rangliste), Møder, Medlemmer, Takster, bødevælger med tællere, særbøder, indbetalinger, localStorage + delt artifact-lagring ("Gem ændringer"), JSON-eksport/-import. Publiceret som artifact. Daniel tog den straks i brug: omdøbte klubben til "RT 11 Frederiksberg" og oprettede et møde — **hans gemte data skulle herefter altid flettes ind ved republicering** (vigtig regel, står i CLAUDE.md).

### 5. Klubår + nye ønsker (state v2–v3)
Daniel bad om: møder under menuen **Klubår** (2024/25, 2025/26 …) med 20 autogenererede redigerbare placeholder-møder pr. år (titel/dato/beskrivelse/links); QA af alle knapper/flows; featureliste; visuelt oplæg. Midt i arbejdet: bulk-tilføj 11 navngivne medlemmer (Martin Mollerup, Miki Kjeldsen, Thomas Jarløv, Asger Holmsted, Marco Brøndsted, Daniel Kuntkes, Steffen Desmond, Casper Infeld, Benjamin Rasmussen, Toke Suhr, Rasmus De Martino), formand med kongekrone, visuel markering af dyre bøder, og gamification med streaks + streak-oversigt. Alt implementeret (mødestreaks med titler Varm/I brand/Ustoppelig/LEGENDE, "Stamkunde" for gentagne bødetyper, lyn-ikon ved 300 kr.+).

### 6. QA-runde 1 (dybdegående kodegennemgang) — 21 fund, alle relevante rettet
Høj: (H1) import afviste appens egen eksport; (H2) malformet import kunne bricke appen permanent → `normalize()` indført. Mellem: hardkodede klubår → dynamisk seed t.o.m. indeværende år; streak-skævheder (afsluttede bødefri møder talte ikke, åbne møder brød streaks) → rettet; formandskab ryddes nu ved udmeldelse; "Fortsæt møde"-knappen søger på tværs af år; dobbeltklik-sikring på delt gem; toast-ombrydning på mobil; attribut-escaping af alle id'er; Enter i "Nyt medlem" = fortsæt til næste navn; tusindtalsseparator på ranglisten; mødedato kan ryddes. Bevidst udeladt: telefonens tilbage-knap (history-håndtering) og automatisk konfliktfletning ved samtidige delte gem (sidste skriver vinder — acceptabelt med én bødemester).

### 7. Stor featurerunde (state v4) — Daniel valgte #2,5,6,7,8,11,12,13,14,16,19,20 + visuel Pakke A+B
Implementeret: historikfilter pr. klubår i profilen; sæsonafslutning (låser årets møder, podiekåring med konfetti + "Mest artige"); hædersbevisninger (Årets synder, Mest artige, Comeback, Grand Slam) på profilen; sæsonrekorder; bødefri-streak ("Fredet"); Statistik-fane med SVG-grafer (bøder pr. møde, kassebeholdning over tid, top bødetyper) og KPI'er; sammenlign klubår-tabel; kassererrapport (print/PDF/fil, hvidt papir-layout); visningstilstand (skjuler al registrering pr. enhed, auto-aktiveres ved ren læseadgang); afbudsforslag (<24 t → "Afmelding 24 timer", <7 dage → "Afmelding efter frist" fremhæves i bødevælgeren); papirkurv (blødt slet af møder/medlemmer, 30 dages gendannelse); revisionslog (alle hændelser med tidsstempel, maks 800). Visuelt: hover-løft, guld-glød + skimmer på 1. pladsen, tal der tæller op, stempel-bounce, konfetti ved dyre bøder, flakkende flammer, glimtende krone, stadion-projektørlys med støjtekstur, skrå accent, blur bag sheets, gradient-medaljer, spring-animation — alt bag `prefers-reduced-motion`.

### 8. Arkivering (denne fase)
Daniel bad om fuld dokumentation i GitHub til videre arbejde i ny sæson fra anden computer, samt dette komprimerede samtale-resumé. Undervejs gemte Daniel igen data i live-appen (kronede **Marco Brøndsted som formand**) — flettet ind og bevaret ved republicering.

### 9. Kommentar-rettelser fra live-appen (1. sep. 2026)
To kommentarer i artifact-tråden: (a) "nogle medlemmer mangler i dette view" og (b) "Ligaen-menuen rækker ind over teksten bagved". Samme rodårsag: `.content` havde kun 108 px bundplads, mens den faste knap-bjælke (bottom 64 px + ~72 px høj) plus fanebjælken fylder ~136 px — så nederste række på ranglisten lå skjult bag knappen, selv når der var scrollet helt ned. Rettet: bundplads → `calc(160px + env(safe-area-inset-bottom))`, knap-bjælken løftet til `calc(76px + safe-area)`, fanebjælken fik mere luft (8 px), desktop-padding 120 → 130 px. Verificeret med de rigtige 12 medlemmer på 360/390/768/1440 px: intet element overlapper længere. Begge tråde besvaret og markeret løst.

## Rettelseslog (alle QA-/reviewrunder samlet)

1. **Mockup-review:** Tidende-overløb; Scoreboard manglende kolonne + forskudt header; Kridttavle-tallies matchede ikke beløb; Protokol-stempel-overlap; da. stavning (ajour, særbøde, væddemål, "11 flere"); dato-konsistens på tværs af mockups; dingbat→SVG.
2. **App-flowtest fund:** stale hovedvisning efter modal-luk; `pickerMemberId` blev nulstillet af modal-oprydning så bødeklik ikke registrerede; navne-afkortning på mobil (kolonne skjules <480 px, ikon-clipping fikset med `.nm`-span).
3. **QA-runde 1:** se afsnit 6 ovenfor (H1, H2 + 9 mellem + 8 lav rettet).
4. **Artifact-viewer:** JSON-eksport via download-link virker ikke i sandboxen → `downloads`-capability med blob-fallback (også brugt af kassererrapporten).
5. **Tælle-animation:** startværdier renderes nu i HTML (intet tomt felt før animation).
6. **Bundplads (fra artifact-kommentarer):** faste bjælker i bunden dækkede nederste indhold — bundplads og bjælke-placering rettet, verificeret på fire skærmbredder.

## Nuværende tilstand (pr. 1. sep. 2026)

- State-version **4**; live-data: klub "RT 11 Frederiksberg", 12 medlemmer (Romanas Markovas kom til), formand = Marco Brøndsted, 3 klubår (2024/25, 2025/26, 2026/27 à 20 møder), "Møde 1 - Fisketur" i gang med 8 registrerede bøder, ingen indbetalinger endnu.
- Testsuite `test/test-app.mjs`: 32 tjek, alle grønne.
- Uimplementerede idéer: `docs/feature-ideer.md` uden ✅ (MobilePay-genvej, rykkerbesked, fortryd-i-toast, avisnotits, formandens dobbelttakst, fremmøderegistrering, notifikationer, PWA) + Pakke C-rest i `docs/visuelt-oplaeg.md`.

## Instruks til en ny model

1. Læs `CLAUDE.md` (hårde regler: migrér+normalisér al state, esc() alt, log() + MUTATING ved nye handlinger, blødt slet, **flet altid live-artifactens `#rtd-state` ind før republicering**, kør testsuiten før commit).
2. Kør `node build.mjs` efter kodeændringer; verificér med `node test/test-app.mjs`.
3. Republicér til artifact-URL'en ovenfor — aldrig som ny artifact.
4. Sprog: dansk UI, DKK-format "1.234 kr.". Design: mørkt scoreboard, Anton + Barlow Condensed, amber, inline SVG-ikoner, ingen emoji i UI.
