# Feature-idéer til Bødeligaen

Prioriteret idékatalog til videreudvikling. ✅ = implementeret (status 31. aug. 2026).

## Hurtige gevinster (små, høj værdi)

1. **MobilePay-genvej** — knap på medlemsprofilen der åbner MobilePay med beløb udfyldt (`mobilepay://send?amount=…`), så indbetaling tager ét tryk.
2. ✅ **Bødehistorik pr. klubår i medlemsprofilen** — filtrér historikken efter klubår.
3. **"Ryk skyldnere"-tekst** — generér en færdig besked ("Du skylder 350 kr. — betal inden fredag") til copy/paste i klubbens gruppechat.
4. **Fortryd-knap i toast** — "Martin: Mobil · 30 kr. [FORTRYD]" direkte i kvitteringen i stedet for at lede i loggen.
5. ✅ **Sæsonafslutning** — én knap der låser alle årets møder og kårer årets synder.

## Gamification (bygger videre på streaks)

6. ✅ **Badges/hædersbevisninger** — "Årets synder", "Mest artige", "Comeback" (fra 1. plads til rent ark), "Grand Slam" (alle bødetyper prøvet). Vises på profilen.
7. ✅ **Sæsonrekorder** — dyreste enkeltmøde, længste streak nogensinde, største enkeltindbetaling.
8. ✅ **Bødefri-streak** — omvendt streak for de artige ("5 møder uden bøde") så begge ender af tabellen har noget at spille for.
9. **Ugens højdepunkt** — automatisk genereret "avisnotits" efter hvert møde (genbrug Bødetidende-tonen fra mockup 09).
10. **Formandens dobbelttakst** — valgfri regel: formanden betaler ×2 for udvalgte bøder (kongekronen forpligter).

## Statistik og overblik

11. ✅ **Grafer** — kassebeholdning over tid, bøder pr. møde, top-bødetyper (søjler). Én statistik-side pr. klubår.
12. ✅ **Sammenlign klubår** — 2024/25 vs. 2025/26: total, gennemsnit pr. møde, værste synder.
13. ✅ **Kassererrapport** — eksportér et klubår som pæn PDF/print til generalforsamlingen.

## Drift og deling

14. ✅ **Læse-adgang (visningstilstand)** — del et link hvor medlemmer kan SE ligaen men ikke registrere (er delvist muligt allerede via artifact-deling).
15. **Fremmøderegistrering** — kryds af hvem der deltog i mødet; muliggør automatiske "ikke fremmødt"-bøder og fremmødestatistik.
16. ✅ **Automatiske bødeforslag** — hvis afbud registreres < 24 timer før mødedato, foreslå "Afmelding 24 timer"-bøden automatisk.
17. **Notifikation før møde** — påmindelse om at åbne dagens møde (kræver PWA/push eller kalenderintegration).
18. **PWA/hjemmeskærm** — manifest + service worker så appen kan installeres på telefonen og virker offline.

## Robusthed

19. ✅ **Papirkurv for slettede møder og medlemmer** — blødt slet med 30 dages frist i stedet for permanent sletning.
20. ✅ **Revisionslog** — hvem/hvornår for alle registreringer, så kassereren kan dokumentere alt.

---

# Runde 2 — 15 nye funktionsidéer

Status 1. sep. 2026. De to visuelle runder ligger i `visuelle-ideer.md` — denne runde handler om, hvad appen *kan*, ikke hvordan den ser ud. Idéerne er nye og overlapper hverken med de 20 ovenfor eller med de visuelle lister.

## Hurtigere registrering under mødet

21. **Bulk-bøde** — vælg først taksten, derefter flere medlemmer på én gang ("alle der kom for sent"). Kollektive bøder er i dag 8 tryk pr. mand; her bliver det ét klik pr. mand i én omgang.
22. **Fortryd-stak** — en rigtig undo/redo over de seneste ~20 handlinger (bøde, indbetaling, sletning), med knap i mødet og Ctrl/Cmd+Z på desktop. I dag skal man finde posteringen manuelt og slette den.
23. **Søg og spring til** — ét søgefelt i toppen: skriv "Toke" og hop til profilen, "møde 7" og hop til mødet. Ved 17+ medlemmer og 60 møder er scroll ikke længere hurtigst.
24. **Tastaturbetjening på desktop** — piletaster mellem medlemmer i bødevælgeren, taltaster 1–9 for de øverste takster, Enter for at gemme. Bødemesteren kan registrere hele mødet uden at røre musen.

## Økonomi der stemmer

25. **Udgifter fra kassen** — i dag er "I kassen" summen af alle indbetalinger og falder aldrig. Med en udgiftspost (klubtur, øl, gaver) viser tallet den reelle beholdning, og kassererrapporten får en ægte ind/ud-opgørelse.
26. **Restancealder** — vis hvor længe en gæld har stået ("350 kr. i 87 dage") og farv den efter alder. Gør det synligt, hvem der reelt trækker den, frem for kun hvem der skylder mest.
27. **Betalingsdisciplin** — nyt nøgletal i statistikken: gennemsnitlige dage fra bøde til betaling pr. medlem. Giver en "hurtigste betaler"-rekord som modvægt til synderlisten.

## Regler og retfærdighed

28. **Regelark** — en redigerbar tekstside med klubbens bødevedtægter, linket fra Takster og med i kassererrapporten. I dag lever reglerne uden for appen, og så diskuteres de på hvert møde.
29. **Bøde under protest** — markér en bøde som omstridt; den tælles med, men vises med mærke, indtil bødemesteren stadfæster eller annullerer den. Al diskussion havner ét sted i stedet for i gruppechatten.
30. **Gentagelsestakst** — valgfri regel pr. takst: tredje gang samme synd i én sæson koster dobbelt. Bygger direkte oven på streak-data, som appen allerede beregner.

## Sæson og kontinuitet

31. **Årsopgørelse ved sæsonskifte** — når sæsonen lukkes, vælg pr. medlem om restgælden overføres til det nye klubår eller afskrives, og få en kvittering pr. mand. I dag ruller gælden bare videre uden beslutning.
32. **Mødeskabelon ved nyt klubår** — kopiér sidste års rytme, titler og beskrivelser til de 20 nye placeholders i stedet for "Møde 1 … Møde 20". Sparer en aften med redigering hver sæson.

## Robusthed og drift

33. **Backup-påmindelse** — vis dato for seneste JSON-eksport i indstillinger og mind blidt om det efter fx 30 ændringer uden backup. Al data ligger i browseren og i den delte side; en glemt eksport er den eneste reelle tabsrisiko.
34. **Flettende import** — importér en fil og *flet* den ind i stedet for at overskrive alt. Gør det muligt at samle to enheders registreringer, hvis nogen har tastet offline. Kan gøres sikkert, fordi alle poster allerede har unikke id'er.
35. **Papir-reserveliste** — print mødets medlemsliste og takster som ét A4-ark til at krydse af på, hvis telefonen dør. Registreres bagefter i appen.

## Anbefaling til næste runde

Start med **21 (bulk-bøde)** og **22 (fortryd-stak)** — de rammer den ene handling der udføres hundredvis af gange, og fjerner den eneste rigtigt irriterende fejlrettelse. Tag derefter **25 (udgifter fra kassen)**, som er den største reelle mangel i regnskabet, og **32 (mødeskabelon)**, der betaler sig hver eneste sæsonstart.
