# Projekt: RTD Bødeligaen — mål, beslutninger og status

Arkivdokument, så arbejdet kan genoptages fra enhver computer. Sidst opdateret: 31. august 2026.
Den fulde udviklingshistorik og rettelseslog ligger komprimeret i `docs/samtale-resume.md` — start dér ved overlevering til en ny model/session.

## Målsætning

Byg en app, der gør det **nemt, hurtigt og simpelt** at administrere bøder i RT 11 Frederiksberg:

1. Bødemesteren skal på et møde kunne klikke personer og bøder af med få tryk.
2. Alle medlemmer har en profil med deres bøder og samlet skyldigt beløb.
3. Indbetalinger reducerer bødesummen og samles i klubbens kasse.
4. Bøder gives på unikke møder, organiseret i klubår (2024/25, 2025/26, …) med 20 planlagte møder pr. år.
5. Ud over de faste takster skal der kunne gives særlige/ekstra bøder med frit beløb.
6. Kun bødemesteren registrerer; medlemmerne skal kunne kigge med.
7. Det skal være sjovt: gamification med streaks, kroner, kåringer og konfetti.

## Centrale beslutninger

| Beslutning | Begrundelse |
|---|---|
| Design: retning 06 "Bødeligaen" (stadion-scoreboard) | Valgt af Daniel blandt 10 mockups (se `design/`); gælden som rangliste passer til klubbens humor |
| Vanilla HTML/CSS/JS uden build-kæde | Simpelt at hoste, ingen afhængigheder at vedligeholde, åbnes direkte fra fil |
| localStorage + delt Claude-artifact-lagring | Autosave lokalt; "Gem ændringer" publicerer til alle med linket; JSON-backup som sikkerhedsnet |
| Klubår 1. juli–30. juni | Møder ligger fra september; sommerferien er årsgrænsen |
| Blødt slet (papirkurv, 30 dage) frem for hårdt slet | Kassererdata må ikke kunne forsvinde ved en fejl |
| Takstkatalog fra klubbens regneark (18 bøder) | Forudindlæst som redigerbare takster, 30–800 kr. |

## Datamodel (state v4)

```
state = {
  version: 4, updatedAt, clubName, formandId,
  members:   [{ id, name, active, createdAt }],
  fineTypes: [{ id, category, description, amount, active }],
  clubYears: [{ id, startYear, label, closedAt }],
  meetings:  [{ id, clubYearId, number, title, date, description, links, closedAt }],
  fines:     [{ id, meetingId, memberId, fineTypeId|null, label|null, amount, ts }],
  payments:  [{ id, memberId, amount, date, note, ts }],
  expenses:  [{ id, amount, date, note, ts }],              // v5: udgifter afholdt af kassen
  writeoffs: [{ id, memberId, clubYearId, amount, date, ts }], // v5: gæld afskrevet ved årsopgørelsen
  rules:     "…",                     // v5: regelark, én regel pr. linje
  formandHistory: [{ memberId, from, to }],  // v6: formandsrækken til Hall of Fame
  audit:     [{ ts, text }],          // revisionslog, nyeste først, maks 800
  trash:     [{ id, kind, deletedAt, ... }]  // møder/medlemmer, ryddes efter 30 dage
}
```

Medlemmer har fra v5 `prospect: bool` og `years: [clubYearId]`. Medlemskab er altså pr. klubår: et medlem kan være med i nogle år og ikke i andre, og bøder fra fravalgte år bliver stående i regnskabet. Mødetavlen viser årets aktive medlemmer plus enhver, der allerede har fået bøde i mødet.

Regler: saldo = bøder − indbetalinger − afskrivninger pr. medlem; kassebeholdning = indbetalinger − udgifter; "afholdt møde" = har bøder eller er afsluttet; streaks tælles bagfra over afholdte møder (åbne møder bryder ikke); `migrate()` løfter v1→v6 og `normalize()` reparerer manglende felter, så gamle backups og delt state altid kan indlæses.

## Status: implementeret

- 10 design-mockups → valgt retning → komplet app (mobil + desktop).
- Klubår med 20 autogenererede, redigerbare placeholder-møder pr. år + "Opret klubår".
- Bøderegistrering med tællere, medlems-skifter, særbøder, fortryd, mødelås.
- Medlemmer (11 forudindlæst), formand med krone, udmeld/genindmeld/slet.
- Indbetalinger med forudfyldt gæld og noter.
- Gamification: bødestreaks, Stamkunde, Fredet (bødefri), hædersbevisninger, dyre-bøde-markering med konfetti, sæsonafslutning med podie.
- Statistik pr. klubår: søjler (bøder pr. møde), kurve (kassebeholdning), top bødetyper, sæsonrekorder, årssammenligning.
- Kassererrapport (print/PDF/fil), afbudsforslag, visningstilstand, papirkurv, revisionslog, JSON-eksport/-import.
- Visuel Pakke A (mikrointeraktioner) + Pakke B (atmosfære) fra `docs/visuelt-oplaeg.md`.
- Ende-til-ende testsuite (`test/test-app.mjs`) — alle grønne.
- To QA-gennemgange med rettelser (se git-historikken for detaljer).

### Runde 5 (1. sep. 2026)

- **Bulk-bøde**: vælg takst, vælg medlemmer, giv bøden til alle på én gang.
- **Fortryd-stak**: undo/redo over de seneste 20 dataændringer, knapper i toppen + Ctrl/Cmd+Z og Ctrl+Shift+Z. Snapshots tages centralt i `runAction()` og lever kun i hukommelsen.
- **Søg og spring til**: ét søgefelt på tværs af medlemmer, møder og takster.
- **Kassen**: udgiftsposter trækkes fra beholdningen; ind/ud/beholdning og udgiftsliste på statistiksiden, med i kassererrapporten, og kurven "kassebeholdning over tid" tæller nu både ind og ud.
- **Betalingsdisciplin**: gennemsnitlige dage fra bøde til betaling pr. medlem (FIFO-fordeling af indbetalinger), plus rekorden "hurtigste betaler".
- **Regelark**: klubbens bødevedtægter under Takster, redigerbare og med i kassererrapporten.
- **Årsopgørelse**: ved sæsonafslutning kan restgæld pr. medlem afskrives eller overføres til næste klubår.
- **Medlemskab pr. klubår** + medlemsfiltre (Aktive som udgangspunkt, Prospects, Udgåede med årstal, Skylder, Alle).
- **Prospects**: egen status og eget spire-ikon ved siden af formandens krone.
- **Delevejledning** i indstillinger: hvordan ligaen deles med kun læseadgang.

### Runde 6 (1. sep. 2026) — visuelt og gamification

- **Farvetema pr. bødekategori**: afbud blå, forsinkelse orange, adfærd lilla, pligt grøn, øvrigt amber. Farven følger ikonbaggrund, søjler i Top bødetyper og prikker i sparklinen, med farveforklaring i statistikken.
- **Podie på forsiden**: top-3 vises som podie (guld hævet i midten); resten af listen fortsætter nedenunder. Podiet vises kun når mindst tre skylder noget.
- **Tegnede tomme tilstande**: tom bødekasse, sovende dommer og støvet pokal (`ART`) i stedet for en tekstlinje.
- **Metalliske hædersbevisninger**: guld, sølv, ild og grøn med gradient, støjtekstur og blank kant.
- **Stryg for at fortryde**: stryg en bøde til venstre i mødets liste for at fjerne den; strygningen lægger selv et fortryd-punkt.
- **Kasseapparat-rulning**: mødets total ruller ciffer for ciffer, når en bøde på 300 kr.+ lander.
- **Medlemskort**: profilen som samlekort, der kan gemmes som SVG og deles.
- **Levende baggrund pr. fane**: `html[data-view]` styrer et svagt, drivende lysskær i fanens farve.
- **Ikoner der reagerer**: bødeikonet vipper, kronen glimter når formanden får en bøde, og spiren vokser med prospektets fremdrift (5 møder til optagelse).
- **Hall of Fame**: egen fane efter Takster med alle tiders rekorder, kårede pr. sæson, formandsrækken (ny `formandHistory`) og alle uddelte hædersbevisninger.

## Udestående / kendte begrænsninger

- Telefonens tilbage-knap lukker ikke dialoger (history-håndtering ikke implementeret).
- Delt gem er "sidste skriver vinder" — fint med én bødemester, ikke bygget til samtidig redigering.
- Uimplementerede idéer: se `docs/feature-ideer.md` (bl.a. MobilePay-genvej, rykkerbesked, PWA, fremmøderegistrering, mødeskabelon, flettende import) og `docs/visuelle-ideer.md` runde 3.
- Fortryd-stakken lever kun i hukommelsen: den nulstilles ved genindlæsning af siden.
- Formandsrækken starter ved v6-migreringen: tidligere formænd før 1. sep. 2026 er ikke registreret.
- Stryg-for-at-fortryde kræver berøring; på desktop bruges krydset.

## Sådan arbejder du videre (ny computer / ny sæson)

1. **Ny sæson kræver ingen kode**: åbn appen → Klubår → "Opret klubår" (20 møder autogenereres). Afslut den gamle sæson med "Afslut sæson"-knappen.
2. **Kode**: klon repoet, åbn `index.html` — færdig. Ret i `app.js`/`styles.css`, kør `node build.mjs`, og verificér med testsuiten (se README).
3. **Data**: ligger i den delte live-udgave og i browserens localStorage. Tag en JSON-eksport (Indstillinger) som backup før større ændringer.
4. **Med Claude Code**: åbn repoet og bed om ændringen — `CLAUDE.md` fortæller værktøjet, hvordan projektet hænger sammen.
