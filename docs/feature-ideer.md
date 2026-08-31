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
