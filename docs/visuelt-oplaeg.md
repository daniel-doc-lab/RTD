# Visuelt oplæg — mere spændende Bødeliga

Tre pakker i stigende ambitionsniveau. Alle bygger videre på scoreboard-identiteten (mørk bund, Anton-typografi, ravgul accent) i stedet for at skifte retning.

## Pakke A — Liv i det eksisterende (mikrointeraktioner) ✅ IMPLEMENTERET

Små effekter der får appen til at føles "dyr" uden at ændre layoutet:

- **Hover/tryk-løft** på rækker og kort: `translateY(-1px)` + blødere skygge, 120 ms ease-out. På mobil: tryk-nedskalering (`scale(0.98)`).
- **Guld-glød på 1. pladsen**: subtil pulserende `box-shadow` omkring rank-1-rækken + skimmer-animation hen over det gyldne venstre-bord hvert 6. sekund.
- **Tal der tæller op**: mødetotal og kassebeholdning animerer fra gammel til ny værdi (200 ms) når en bøde registreres.
- **Bøde-kvittering med punch**: toasten får et lille "stempel-bounce" (scale 1.15 → 1) og en kort konfetti-burst ved dyre bøder (300 kr.+).
- **Streak-flammer der flakker**: 2-3 frames CSS-animation på flamme-ikonerne, så de levende blafrer.
- **Kronen glimter** når formanden vises (lille diagonal skimmer hvert 8. sekund).

## Pakke B — Atmosfære (baggrund og dybde) ✅ IMPLEMENTERET

- **Stadionbaggrund**: meget mørk radial gradient bag indholdet ("projektørlys" oppefra) + fint støj-tekstur (inline SVG-noise, 3 % opacity) så fladerne ikke er sterile.
- **Diagonal accentlinje** i toppen af hver side (som kridtstriber på en bane) — skær appbar-underkanten skråt med `clip-path`.
- **Overlays i lag**: bundsheets får blur bag sig (`backdrop-filter: blur(8px)`), så bødevælgeren "svæver" over mødet.
- **Rangfarver med mere temperament**: guld/sølv/bronze som gradienter frem for flade farver; rent-ark-rækker får en kølig grøn glød.
- **Sheet-indgang**: bundsheet glider op med spring-kurve (250 ms `cubic-bezier(0.2, 0.9, 0.3, 1.1)`) i stedet for at poppe frem.

## Pakke C — Øjeblikke (celebrations og drama) — delvist (konfetti ved dyre bøder og podie ved sæsonafslutning er med)

- **"BØDE!"-overlay**: ved dyre bøder (500 kr.+) et kort fuldskærms-overlay i 0,8 sek. — beløbet i kæmpe Anton-typografi der stemples ind med kamerarystelse, som et måls-overlay på et sportsprogram.
- **Podie-visning**: klubårsafslutning viser top-3 på et animeret podie (guld/sølv/bronze) med navnetræk og konfettiregn.
- **Streak-opgradering**: når nogen når "I brand"/"Ustoppelig", brænder en flamme-animation kort bag deres række.
- **Sæsonintro**: første åbning i et nyt klubår viser en "sæsonplakat" (årstal i kæmpetypografi) før ligaen fader ind.
- **Lydeffekter (opt-in)**: kort "kaching" ved indbetaling, dommerfløjt ved dyre bøder — slået fra som standard, tænd i indstillinger.

## Anbefaling

Start med **Pakke A + blur-overlays fra B** (ren CSS, ingen risiko, mærkbart løft), og tag "BØDE!"-overlayet fra C som det første store øjeblik — det rammer præcis app'ens humor og gør det sjovt at UDDELE bøder, ikke kun at undgå dem.
