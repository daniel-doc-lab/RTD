// Fuld røgtest af RTD Bødeligaen: klubår, møder, bøder, streaks, formand, betaling, takster, indstillinger.
import { chromium } from 'playwright';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const APP = 'file://' + join(root, 'index.html');
const shots = join(root, 'test');
let failures = 0;
const fail = (msg) => { console.error('FAIL: ' + msg); failures++; };
const ok = (msg) => console.log('  ok: ' + msg);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => fail('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('net::ERR')) fail('console: ' + m.text()); });
page.on('dialog', (d) => d.accept());

await page.goto(APP);

// 1) Seedede medlemmer: 11 på ligaen med rent ark
await page.waitForSelector('.lb-row');
const nMembers = await page.locator('.lb-row').count();
if (nMembers !== 11) fail('forventede 11 seedede medlemmer, fik ' + nMembers); else ok('11 medlemmer seedet');

// 2) Klubår: 2 år à 20 møder
await page.click('[data-tab="aar"]');
const nYears = await page.locator('.row').count();
if (nYears !== 3) fail('forventede 3 klubår (2024/25–2026/27), fik ' + nYears); else ok('3 klubår');
const labels = await page.locator('.row .t').allTextContents();
if (!labels.some(l => l.includes('2024/25')) || !labels.some(l => l.includes('2025/26')) || !labels.some(l => l.includes('2026/27'))) fail('årslabels mangler: ' + labels);
await page.click('.row:has-text("2025/26")');
await page.waitForSelector('.meet-head');
const nMeetings = await page.locator('.row').count();
if (nMeetings !== 20) fail('forventede 20 møder i 2025/26, fik ' + nMeetings); else ok('20 møder i året');

// 3) Rediger møde 1: titel, dato, beskrivelse, links
await page.click('.row:has-text("Møde 1")');
await page.waitForSelector('.member-grid');
await page.click('[data-action="edit-meeting"]');
await page.fill('#meet-title', 'Sæsonstart');
await page.fill('#meet-date', '2025-09-05');
await page.fill('#meet-desc', 'Første møde efter sommer.\nIndlæg ved Toke.');
await page.fill('#meet-links', 'Referat: https://example.com/referat\nhttps://example.com/slides');
await page.click('[data-action="meeting-save"]');
await page.waitForSelector('.info-card');
const head = await page.locator('.meet-head .t').textContent();
if (head !== 'Sæsonstart') fail('mødetitel ikke opdateret: ' + head); else ok('møde redigeret');
const nLinks = await page.locator('.link-line a').count();
if (nLinks !== 2) fail('forventede 2 links, fik ' + nLinks);
const linkText = await page.locator('.link-line a').first().textContent();
if (linkText !== 'Referat') fail('link-etiket forkert: ' + linkText);

// 4) Giv bøder: Martin Mobil x2, dyre bøde (Mads bøde 500) til Miki, særbøde til Thomas
await page.click('.member-cell:has-text("Martin Mollerup")');
await page.waitForSelector('.fine-grid');
const mobil = page.locator('.fine-btn:has-text("Mobil")').first();
await mobil.click();
await mobil.click();
const badge = await mobil.locator('.n').textContent();
if (badge !== '2') fail('mobil-tæller: ' + badge); else ok('gentagne bøder tælles');
await page.click('[data-action="picker-nav"][data-dir="1"]');
const hotBtns = await page.locator('.fine-btn.hot').count();
if (hotBtns < 4) fail('dyre bøder ikke markeret (hot): ' + hotBtns); else ok('dyre takster markeret');
await page.click('.fine-btn:has-text("Mads bøde")');
await page.click('.sheet-close');
// Kasseapparatet ruller på plads, når totalen springer med en dyr bøde
if (await page.locator('.meet-head .total .dgt').count() < 1) fail('kasseapparat-rulning mangler ved dyr bøde'); else ok('cifrene ruller ved dyre bøder');
// Særbøden gives eksplicit til Thomas, så podiet bliver forudsigeligt
await page.click('.member-cell:has-text("Thomas Jarløv")');
await page.waitForSelector('.fine-grid');
await page.click('[data-action="special-fine"]');
await page.fill('#sp-label', 'Tabt væddemål');
await page.fill('#sp-amount', '75');
await page.click('[data-action="special-save"]');
await page.click('.sheet-close');

// Mødetotal: 30+30+500+75 = 635 — cifrene ruller først på plads
await page.waitForTimeout(1600);
const total = await page.locator('.meet-head .total').textContent();
if (!total.includes('635')) fail('mødetotal: ' + total + ' (ventede 635)'); else ok('mødetotal 635');
// Dyre bøde vises rødt i loggen
if (await page.locator('.log-item .amount.amt-hot').count() < 1) fail('dyr bøde ikke markeret i møde-log');
await page.screenshot({ path: shots + '/shot-mode.png' });

// 5) Fortryd én Mobil → 605
await page.locator('.log-item:has-text("Mobil") .x').first().click();
await page.waitForTimeout(450);
const total2 = await page.locator('.meet-head .total').textContent();
if (!total2.includes('605')) fail('total efter fortryd: ' + total2);

// 6) Møde 2: giv Martin en bøde mere → streak på 2 møder
await page.click('.meet-head [data-action="goto"]');
await page.click('.row:has-text("Møde 2")');
await page.waitForSelector('.member-grid');
await page.click('.member-cell:has-text("Martin Mollerup")');
await page.click('.fine-btn:has-text("Afbryde")');
await page.locator('.fine-btn:has-text("Mobil")').first().click(); // → 2× Mobil i alt = typestreak
await page.click('.sheet-close');

// 7) Ligaen: rang, streaks-panel, zap for dyre bøder
await page.click('[data-tab="liga"]');
await page.waitForSelector('.lb-row');
await page.waitForSelector('.podium');
if (await page.locator('.pod').count() !== 3) fail('podiet mangler tre pladser');
const gold = await page.locator('.pod-1').textContent();
if (!gold.includes('Miki')) fail('guldpladsen er ikke Miki (500 kr.): ' + gold.slice(0, 60)); else ok('podiet rangerer korrekt');
if (!(await page.locator('.pod-2').textContent()).includes('Martin')) fail('sølvpladsen er ikke Martin');
if (!(await page.locator('.pod-3').textContent()).includes('Thomas')) fail('bronzepladsen er ikke Thomas');
if (await page.locator('.zaps').count() < 1) fail('zap-markering for dyr bøde mangler');
await page.waitForSelector('.streak-panel');
const streakTxt = await page.locator('.streak-panel').textContent();
if (!streakTxt.includes('Martin') || !streakTxt.includes('2 møder i træk')) fail('mødestreak mangler: ' + streakTxt.slice(0, 120)); else ok('mødestreak vises');
if (!streakTxt.includes('Stamkunde')) fail('typestreak (Stamkunde) mangler');
// Forsideknappen foreslår at fortsætte et åbent møde med bøder
const cta = await page.locator('.actionbar .btn').textContent();
if (!cta.includes('Fortsæt')) fail('forsideknap foreslår ikke Fortsæt: ' + cta);
await page.screenshot({ path: shots + '/shot-liga.png' });

// 8) Formand: kron Thomas
await page.click('.pod:has-text("Thomas")');
await page.click('[data-action="toggle-formand"]');
await page.waitForSelector('.sheet-head .crown');
ok('formand kronet');
await page.click('.sheet-close');
if (await page.locator('.pod:has-text("Thomas") .crown').count() !== 1) fail('krone mangler på podiet');

// 9) Indbetaling: Miki betaler alt (500)
await page.click('.pod-1');
await page.click('[data-action="pay-form"]');
if (await page.inputValue('#pay-amount') !== '500') fail('forudfyldt beløb: ' + await page.inputValue('#pay-amount'));
await page.click('[data-action="pay-save"]');
await page.waitForSelector('.modal-root', { state: 'detached' });
await page.waitForTimeout(450);
const stats = await page.locator('.stats').textContent();
if (!stats.includes('500 kr.')) fail('kassen viser ikke 500: ' + stats);
if (!(await page.locator('.lb-row:has-text("Miki")').textContent()).includes('Rent ark')) fail('Miki ikke rent ark efter betaling');
ok('indbetaling virker');

// 10) Takster: tilføj, rediger, fjern
await page.click('[data-tab="takster"]');
const nT = await page.locator('.row').count();
if (nT !== 18) fail('forventede 18 takster, fik ' + nT);
await page.click('[data-action="add-finetype"]');
await page.fill('#ft-cat', 'Testbøde');
await page.fill('#ft-desc', 'Kun til test');
await page.fill('#ft-amount', '40');
await page.click('[data-action="finetype-save"]');
if (await page.locator('.row').count() !== 19) fail('takst ikke tilføjet');
await page.click('.row:has-text("Testbøde")');
await page.fill('#ft-amount', '45');
await page.click('[data-action="finetype-save"]');
if (!(await page.locator('.row:has-text("Testbøde")').textContent()).includes('45')) fail('takst ikke opdateret');
await page.click('.row:has-text("Testbøde")');
await page.click('[data-action="finetype-remove"]');
if (await page.locator('.row').count() !== 18) fail('takst ikke fjernet');
ok('takst-CRUD virker');

// 11) Medlemmer: tilføj + omdøb + udmeld/genindmeld
await page.click('[data-tab="medlemmer"]');
await page.click('[data-action="add-member"]');
await page.fill('#mem-name', 'Testperson');
await page.click('[data-action="member-save"]');
await page.waitForSelector('.modal-root', { state: 'detached' });
if (await page.locator('.row:has-text("Testperson")').count() !== 1) fail('medlem ikke tilføjet');
await page.click('.row:has-text("Testperson")');
await page.click('[data-action="retire-member"]');
if (await page.locator('.row:has-text("Testperson")').count() !== 0) fail('udgået medlem vises stadig under Aktive');
await page.click('[data-action="member-filter"][data-key="udgaaede"]');
if (await page.locator('.row.inactive:has-text("Testperson")').count() !== 1) fail('udmeldelse virker ikke');
if (!(await page.locator('.row:has-text("Testperson") .s').textContent()).includes('Med i')) fail('udgået medlem viser ikke sine klubår');
await page.click('.row:has-text("Testperson")');
await page.click('[data-action="revive-member"]');
await page.click('[data-action="member-filter"][data-key="aktive"]');
if (await page.locator('.row.inactive').count() !== 0) fail('genindmeldelse virker ikke');
if (await page.locator('.row:has-text("Testperson")').count() !== 1) fail('genindmeldt medlem mangler');
ok('medlems-CRUD + filtre virker');

// 12) Nyt klubår 2026/27
await page.click('[data-tab="aar"]');
await page.click('[data-action="new-year"]');
await page.waitForSelector('.meet-head');
const yHead = await page.locator('.meet-head .t').textContent();
if (!yHead.includes('2027/28')) fail('nyt klubår: ' + yHead);
if (await page.locator('.row').count() !== 20) fail('nyt år har ikke 20 møder');
ok('nyt klubår med 20 møder');

// 13) Genindlæsning: alt består
await page.reload();
await page.waitForSelector('.lb-row');
const statsR = await page.locator('.stats').textContent();
if (!statsR.includes('500 kr.')) fail('efter reload: kassen forkert: ' + statsR);
await page.click('[data-tab="aar"]');
if (await page.locator('.row').count() !== 4) fail('efter reload: ikke 4 klubår');
ok('persistens efter reload');

// 14) Klubnavn
await page.click('[data-action="settings"]');
await page.fill('#set-club', 'RTD Aalborg');
await page.click('[data-action="settings-save"]');
const brand = await page.locator('#brand-name').textContent();
if (!brand.includes('RTD Aalborg')) fail('klubnavn ikke opdateret: ' + brand);
ok('klubnavn kan ændres');

// 15) Statistik-side: kort, grafer, sammenligning
await page.click('[data-tab="statistik"]');
await page.waitForSelector('.chart-card');
if (await page.locator('.chart-card').count() < 5) fail('statistik: for få kort'); else ok('statistikside renderer');
if (await page.locator('svg.chart').count() < 1) fail('ingen SVG-grafer');
const cmpTxt = await page.locator('table.cmp').textContent();
if (!cmpTxt.includes('2025/26') || !cmpTxt.includes('Miki')) fail('sammenligningstabel mangler data: ' + cmpTxt.slice(0, 80));
const recTxt = await page.locator('.chart-card:has-text("Sæsonrekorder")').textContent();
if (!recTxt.includes('Dyreste møde')) fail('sæsonrekorder mangler');

// 16) Kassererrapport
await page.click('[data-action="report-open"]');
await page.waitForSelector('.report-paper');
const rpt = await page.locator('.report-paper').textContent();
if (!rpt.includes('Kassererrapport') || !rpt.includes('Martin Mollerup')) fail('rapport mangler indhold');
await page.click('[data-action="report-close"]');
ok('kassererrapport virker');

// 17) Papirkurv: slet møde, gendan det
await page.click('[data-tab="aar"]');
await page.click('.row:has-text("2025/26")');
await page.click('.row:has-text("Møde 5")');
await page.waitForSelector('.member-grid');
await page.click('[data-action="delete-meeting"]');
await page.waitForSelector('.meet-head:has-text("Klubår 2025/26")');
if (await page.locator('.row').count() !== 19) fail('møde ikke slettet');
await page.click('[data-action="settings"]');
await page.click('[data-action="trash-open"]');
await page.waitForSelector('.modal-root:has-text("Papirkurv")');
await page.click('[data-action="trash-restore"]');
await page.waitForSelector('.modal-root:has-text("Papirkurven er tom")');
await page.click('.sheet-close');
if (await page.locator('.row').count() !== 20) fail('møde ikke gendannet');
ok('papirkurv: slet + gendan virker');

// 18) Sæsonafslutning: 2024/25 lukkes og kårer
await page.click('[data-action="goto"][data-view="aar"]');
await page.click('.row:has-text("2024/25")');
await page.click('[data-action="season-close"]');
await page.waitForSelector('.modal-root:has-text("Sæsonen 2024/25 er slut")');
await page.click('.sheet-close');
if (!(await page.locator('.meet-head .s').textContent()).includes('sæson afsluttet')) fail('sæson ikke markeret afsluttet');
if (await page.locator('.row .badge:has-text("Afsluttet")').count() !== 20) fail('møder ikke låst ved sæsonafslutning');
await page.click('[data-action="season-reopen"]');
ok('sæsonafslutning virker');

// 19) Revisionslog
await page.click('[data-action="settings"]');
await page.click('[data-action="audit-open"]');
const audit = await page.locator('.sheet-body').textContent();
if (!audit.includes('Mads bøde') || !audit.includes('indbetalte')) fail('revisionslog mangler hændelser: ' + audit.slice(0, 100));
await page.click('.sheet-close');
ok('revisionslog virker');

// 20) Visningstilstand: skjuler registrering, kan slås fra igen
await page.click('[data-action="settings"]');
await page.click('[data-action="viewer-toggle"]');
await page.waitForSelector('.viewer-banner');
await page.click('[data-tab="medlemmer"]');
if (await page.locator('.actionbar').count() !== 0) fail('visningstilstand: actionbar stadig synlig');
await page.click('.row:has-text("Martin")');
if (await page.locator('[data-action="pay-form"]').count() !== 0) fail('visningstilstand: betalingsknap synlig');
await page.click('.sheet-close');
await page.click('[data-action="settings"]');
await page.click('[data-action="viewer-toggle"]');
if (await page.locator('.viewer-banner').count() !== 0) fail('visningstilstand ikke slået fra');
ok('visningstilstand virker');

// 21) Afbudsforslag: møde med dato i morgen markerer Afmelding 24 timer
await page.click('[data-tab="aar"]');
await page.click('.row:has-text("2026/27")');
await page.click('.row:has-text("Møde 1")');
await page.waitForSelector('.member-grid');
await page.click('[data-action="edit-meeting"]');
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
await page.fill('#meet-date', tomorrow);
await page.click('[data-action="meeting-save"]');
await page.click('.member-cell:has-text("Toke")');
await page.waitForSelector('.fine-grid');
if (await page.locator('.fine-btn.suggested:has-text("Afmelding 24 timer")').count() !== 1) fail('afbudsforslag mangler');
if (await page.locator('.sug-strip').count() !== 1) fail('forslagsstribe mangler');
await page.click('.sheet-close');
ok('afbudsforslag virker');

// 22) Historikfilter i medlemsprofil
await page.click('[data-tab="liga"]');
await page.click('.lb-row:has-text("Martin")');
await page.waitForSelector('.hist-chips');
await page.locator('.hist-chips .chip:has-text("2025/26")').click();
await page.waitForSelector('.hist-chips .chip.active:has-text("2025/26")');
const hist = await page.locator('.hist').textContent();
if (!hist.includes('Møde')) fail('historikfilter: ingen poster for 2025/26');
await page.click('.sheet-close');
ok('historikfilter virker');

// 23) Bulk-bøde: én takst til flere medlemmer på én gang
await page.click('[data-tab="aar"]');
await page.click('.row:has-text("2026/27")');
await page.click('.row:has-text("Møde 2")');
await page.waitForSelector('.member-grid');
const beforeBulk = await page.locator('.log-item').count();
await page.click('[data-action="bulk-open"]');
await page.waitForSelector('.fine-grid.compact');
await page.click('.fine-btn:has-text("Nål")');
await page.waitForSelector('.bulk-grid');
if (!(await page.locator('.bulk-picked').textContent()).includes('Nål')) fail('bulk: valgt takst vises ikke');
await page.click('[data-action="bulk-all"]');
const picked = await page.locator('.bulk-cell.on').count();
if (picked < 5) fail('bulk: for få valgte medlemmer, ' + picked);
await page.click('[data-action="bulk-save"]');
await page.waitForSelector('.modal-root', { state: 'detached' });
const afterBulk = await page.locator('.log-item').count();
if (afterBulk !== beforeBulk + picked) fail('bulk-bøde gav ' + (afterBulk - beforeBulk) + ' bøder, ventede ' + picked);
ok('bulk-bøde virker');

// 24) Fortryd og gendan
await page.click('[data-action="undo"]');
if (await page.locator('.log-item').count() !== beforeBulk) fail('fortryd rullede ikke bulk-bøden tilbage');
// Gendan-knappen viger på telefon — tastaturgenvejen skal virke
await page.keyboard.press('Control+Shift+Z');
await page.waitForTimeout(80);
if (await page.locator('.log-item').count() !== afterBulk) fail('gendan (Ctrl+Shift+Z) virker ikke');
await page.keyboard.press('Control+z');
await page.waitForTimeout(80);
if (await page.locator('.log-item').count() !== beforeBulk) fail('anden fortryd virker ikke');
ok('fortryd og gendan virker');

// 25) Søg og spring til
await page.click('[data-action="search"]');
await page.fill('#search-q', 'Miki');
await page.waitForSelector('.search-results .row');
await page.click('.search-results .row:has-text("Miki")');
await page.waitForSelector('.sheet-head:has-text("Miki")');
await page.click('.sheet-close');
ok('søgning springer til medlem');

// 26) Udgift fra kassen trækkes fra beholdningen
await page.click('[data-tab="statistik"]');
await page.waitForSelector('.chart-card:has(.cash-row)');
const potBefore = await page.locator('.cash-row.total b').textContent();
await page.click('[data-action="expense-form"]');
await page.fill('#exp-note', 'Klubtur');
await page.fill('#exp-amount', '200');
await page.click('[data-action="expense-save"]');
await page.waitForSelector('.modal-root', { state: 'detached' });
const potAfter = await page.locator('.cash-row.total b').textContent();
if (potBefore === potAfter) fail('udgift ændrede ikke kassebeholdningen: ' + potBefore);
if (!(await page.locator('.chart-card:has(.cash-row)').textContent()).includes('Klubtur')) fail('udgiftspost mangler i kassen');
if (await page.locator('.chart-card:has-text("Betalingsdisciplin")').count() !== 1) fail('betalingsdisciplin-kort mangler');
ok('udgifter og betalingsdisciplin virker');

// 28) Årsopgørelse ved sæsonskifte: gæld kan afskrives
await page.click('[data-tab="aar"]');
await page.click('.row:has-text("2025/26")');
await page.click('[data-action="season-close"]');
await page.waitForSelector('.sheet-head:has-text("Sæsonen 2025/26 er slut")');
await page.click('[data-action="settle-open"]');
await page.waitForSelector('.sheet-head:has-text("Årsopgørelse")');
const owing = await page.locator('[data-action="settle-writeoff"]').count();
if (owing < 1) fail('årsopgørelse: ingen med gæld');
await page.locator('[data-action="settle-writeoff"]').first().click();
await page.waitForSelector('.sheet-head:has-text("Årsopgørelse")');
if (await page.locator('[data-action="settle-writeoff"]').count() !== owing - 1) fail('afskrivning nulstillede ikke gælden');
await page.click('.sheet-close');
await page.click('[data-action="season-reopen"]');
ok('årsopgørelse med afskrivning virker');

// 29) Prospects: eget ikon og eget filter
await page.click('[data-tab="medlemmer"]');
await page.click('.row:has-text("Testperson")');
await page.click('[data-action="toggle-prospect"]');
await page.waitForSelector('.sheet-head:has-text("Testperson")');
await page.click('.sheet-close');
await page.click('[data-action="member-filter"][data-key="prospects"]');
if (await page.locator('.row:has-text("Testperson")').count() !== 1) fail('prospect-filter virker ikke');
if (await page.locator('.row .sprout').count() !== 1) fail('prospect-ikon mangler');
await page.click('[data-action="member-filter"][data-key="aktive"]');
if (await page.locator('.row:has-text("Testperson")').count() !== 0) fail('prospect vises stadig under Aktive');
ok('prospects virker');

// 30) Medlemskab pr. klubår: slå et år fra uden at miste regnskabet
await page.click('[data-action="member-filter"][data-key="alle"]');
await page.click('.row:has-text("Martin Mollerup")');
await page.waitForSelector('.year-chips');
const yearsOn = await page.locator('.year-chips .chip.active').count();
await page.locator('.year-chips .chip:has-text("2026/27")').click();
await page.waitForSelector('.year-chips');
if (await page.locator('.year-chips .chip.active').count() !== yearsOn - 1) fail('klubår kunne ikke slås fra');
await page.click('.sheet-close');
await page.click('[data-tab="aar"]');
await page.click('.row:has-text("2026/27")');
await page.click('.row:has-text("Møde 3")');
await page.waitForSelector('.member-grid');
if (await page.locator('.member-cell:has-text("Martin Mollerup")').count() !== 0) fail('medlem uden for klubåret står stadig på mødetavlen');
if (await page.locator('.member-cell:has-text("Miki")').count() !== 1) fail('øvrige medlemmer forsvandt fra mødetavlen');
await page.click('[data-tab="liga"]');
await page.waitForSelector('.lb-row');
if (await page.locator('.lb-row:has-text("Martin Mollerup")').count() !== 1) fail('medlem forsvandt fra ligaen');
ok('medlemskab pr. klubår virker');

// 31) Farvetema pr. bødekategori
await page.click('[data-tab="takster"]');
await page.waitForSelector('.fine-ic');
const toner = await page.evaluate(() => {
  const set = new Set();
  document.querySelectorAll('.row .fine-ic').forEach(el => set.add(el.style.getPropertyValue('--fc').trim()));
  return [...set];
});
if (toner.length < 4) fail('for få kategorifarver: ' + toner.join(', ')); else ok('kategorifarver på takstikoner');
await page.click('[data-tab="statistik"]');
await page.waitForSelector('.chart-card');
await page.locator('.chips .year-chip:has-text("2025/26")').click();   // året med bøderne
await page.waitForSelector('.hbar-fill');
if (await page.locator('.glegend .gl').count() !== 5) fail('farveforklaring mangler under Top bødetyper');
const barFarver = await page.evaluate(() =>
  [...document.querySelectorAll('.hbar-fill')].map(el => el.style.background).filter(Boolean));
if (new Set(barFarver).size < 2) fail('søjlerne i Top bødetyper har kun én farve');
ok('gruppefarver i statistikken');

// 32) Metalliske hædersbevisninger
await page.click('[data-tab="liga"]');
await page.click('.lb-row:has-text("Toke"), .pod:has-text("Toke")');
await page.waitForSelector('.sheet-body');
await page.click('.sheet-close');
await page.click('[data-tab="medlemmer"]');
await page.click('[data-action="member-filter"][data-key="alle"]');
await page.click('.row:has-text("Miki")');
await page.waitForSelector('.sheet-body');
const metalKlasser = await page.evaluate(() =>
  [...document.querySelectorAll('.sheet-body .award')].map(el => el.className));
if (metalKlasser.length && !metalKlasser.some(c => /guld|soelv|ild|groen/.test(c))) fail('emblemer mangler metalvariant');
ok('metalliske hædersbevisninger');

// 33) Medlemskort som samlekort
await page.click('[data-action="member-card"]');
await page.waitForSelector('.mcard');
const kort = await page.locator('.mcard').textContent();
if (!kort.includes('Miki')) fail('medlemskortet viser ikke navnet');
if (await page.locator('.mcard-grid b').count() !== 4) fail('medlemskortet mangler nøgletal');
if (await page.locator('[data-action="card-save"]').count() !== 1) fail('gem-kort-knappen mangler');
await page.click('.sheet-close');
ok('medlemskort virker');

// 34) Tegnede tomme tilstande
await page.click('[data-action="member-filter"][data-key="udgaaede"]');
if (await page.locator('.art-empty .art').count() !== 1) fail('tegnet tom tilstand mangler under Udgåede');
await page.click('[data-action="member-filter"][data-key="aktive"]');
ok('tegnede tomme tilstande');

// 35) Levende baggrund pr. fane
const viewAttrs = [];
for (const t of ['liga', 'statistik', 'takster']) {
  await page.click(`[data-tab="${t}"]`);
  viewAttrs.push(await page.getAttribute('html', 'data-view'));
}
if (viewAttrs.join(',') !== 'liga,statistik,takster') fail('baggrundstema følger ikke fanen: ' + viewAttrs);
const glow = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--view-glow').trim());
if (!glow) fail('--view-glow er ikke sat');
ok('levende baggrund pr. fane');

// 36) Hall of Fame
await page.click('[data-tab="hall"]');
await page.waitForSelector('.hof-season, .art-empty');
const hof = await page.locator('#app').textContent();
if (!hof.includes('Hall of Fame')) fail('Hall of Fame-overskrift mangler');
if (!hof.includes('Formandsrækken')) fail('formandsrækken mangler');
if (!hof.includes('Thomas')) fail('formanden står ikke i formandsrækken: ' + hof.slice(0, 120));
if (await page.locator('.chart-card').count() < 4) fail('Hall of Fame mangler kort');
ok('Hall of Fame virker');

// 37) Stryg en bøde væk i mødet
await page.click('[data-tab="aar"]');
await page.click('.row:has-text("2026/27")');
await page.click('.row:has-text("Møde 4")');
await page.waitForSelector('.member-grid');
await page.click('.member-cell:has-text("Miki")');
await page.waitForSelector('.fine-grid');
await page.click('.fine-btn:has-text("Nål")');
await page.click('.sheet-close');
if (await page.locator('.log-wrap.swipeable').count() !== 1) fail('bødelinjen er ikke swipe-bar');
await page.evaluate(() => {
  const el = document.querySelector('.log-wrap.swipeable');
  const r = el.getBoundingClientRect();
  const y = r.top + r.height / 2;
  const mk = (type, x, list) => {
    const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    return new TouchEvent(type, { touches: list ? [t] : [], changedTouches: [t], bubbles: true, cancelable: true });
  };
  el.dispatchEvent(mk('touchstart', 320, true));
  el.dispatchEvent(mk('touchmove', 300, true));
  el.dispatchEvent(mk('touchmove', 180, true));
  el.dispatchEvent(mk('touchend', 180, false));
});
await page.waitForTimeout(500);
if (await page.locator('.log-wrap').count() !== 0) fail('strygning fjernede ikke bøden');
await page.click('[data-action="undo"]');
if (await page.locator('.log-wrap').count() !== 1) fail('strygningen kunne ikke fortrydes');
await page.click('[data-action="undo"]');
ok('stryg for at fortryde virker');

// 38) To udgange i arkets hoved: tilbage til profilen eller helt ud
await page.click('[data-tab="medlemmer"]');
await page.click('[data-action="member-filter"][data-key="alle"]');
await page.click('.row:has-text("Miki")');
await page.waitForSelector('.sheet-body');
if (await page.locator('.sheet-back').count() !== 0) fail('profilen skal ikke have tilbage-pil');
await page.click('[data-action="pay-form"]');
await page.waitForSelector('.sheet-head:has-text("Indbetaling")');
if (await page.locator('.sheet-back').count() !== 1) fail('indbetaling mangler tilbage-pil');
await page.click('[data-action="sheet-back"]');
await page.waitForSelector('.sheet-head:has-text("Miki")');
if (await page.locator('[data-action="pay-form"]').count() !== 1) fail('tilbage-pilen førte ikke til profilen');
// Krydset lukker stadig hele vejen ud
await page.click('[data-action="member-card"]');
await page.waitForSelector('.mcard');
if (await page.locator('.sheet-back').count() !== 1) fail('medlemskortet mangler tilbage-pil');
await page.click('.sheet-close');
await page.waitForSelector('.modal-root', { state: 'detached' });
// Papirkurv og revisionslog fører tilbage til indstillinger
await page.click('[data-action="settings"]');
await page.click('[data-action="audit-open"]');
await page.waitForSelector('.sheet-head:has-text("Revisionslog")');
await page.click('[data-action="sheet-back"]');
await page.waitForSelector('.sheet-head:has-text("Indstillinger")');
await page.click('.sheet-close');
await page.click('[data-action="member-filter"][data-key="aktive"]');
ok('tilbage-pil og luk-kryds virker');

// 39) Bødemesteren: roterer selv, uden knapper, og teksten klippes aldrig
await page.click('[data-tab="liga"]');
await page.waitForSelector('#mascot-inline .mascot');
if (await page.locator('.mc-btn').count() !== 0) fail('maskotten har stadig knapper');
const forste = (await page.locator('#mascot-inline .mc-msg').textContent()).trim();
if (!forste) fail('maskotten viser ingen replik');
if (/\.\./.test(forste) || / \./.test(forste)) fail('tegnsætningsfejl i replik: ' + forste);
if (!/[.!?]$/.test(forste)) fail('replik slutter ikke på et punktum: ' + forste);
const klippet = await page.evaluate(() => {
  const m = document.querySelector('#mascot-inline .mc-msg');
  return m.scrollHeight - m.clientHeight;
});
if (klippet > 1) fail('replikken er klippet af');
// Rotationen kører af sig selv hvert 14. sekund
await page.waitForTimeout(15000);
const anden = (await page.locator('#mascot-inline .mc-msg').textContent()).trim();
if (anden === forste) fail('maskotten roterede ikke af sig selv');
ok('bødemesteren roterer af sig selv uden knapper');

// 15) Desktop-visning
await page.setViewportSize({ width: 1440, height: 900 });
await page.click('[data-tab="liga"]');
await page.screenshot({ path: shots + '/shot-desktop.png' });

// 16) Bundlet enkeltfil booter
const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
page2.on('pageerror', (e) => fail('bundle pageerror: ' + e.message));
await page2.goto('file://' + join(root, 'dist/rtd-boedeliga.html'));
await page2.waitForSelector('.lb-row');
ok('bundle booter');

// 17) Robusthed: malformet state (manglende arrays) må ikke bricke appen
await page2.evaluate(() => localStorage.setItem('rtd-boedeliga-v1',
  JSON.stringify({ version: 2, updatedAt: Date.now() + 1e9, clubName: 'Krøltest', members: [] })));
await page2.reload();
await page2.waitForSelector('.lb-row');
const brand2 = await page2.locator('#brand-name').textContent();
if (!brand2.includes('Krøltest')) fail('malformet state ikke normaliseret: ' + brand2.slice(0, 40));
else ok('malformet state normaliseres uden crash');

// 18) Backup-påmindelse: prik på tandhjulet og linje i indstillinger
// Bemærk: state skal være v7 — migreringen v3→v4 nulstiller revisionsloggen.
const stateMedLog = (navn) => ({
  version: 7, updatedAt: Date.now() + 2e9, clubName: navn, formandId: null,
  members: [{ id: 'm1', name: 'Testperson', active: true, prospect: false, years: [] }],
  fineTypes: [], clubYears: [], meetings: [], fines: [], payments: [],
  expenses: [], writeoffs: [], formandHistory: [], trash: [],
  audit: Array.from({ length: 32 }, (_, i) => ({ ts: Date.now() - i * 1000, text: 'testpost ' + i }))
});
await page2.evaluate((s) => {
  localStorage.setItem('rtd-boedeliga-v1', JSON.stringify(s));
  localStorage.removeItem('rtd-last-export');
}, stateMedLog('Backuptest'));
await page2.reload();
await page2.waitForSelector('.appbar');
if (!await page2.locator('.iconbtn.needs-backup').count()) fail('manglende backup-prik på tandhjulet');
await page2.click('[data-action="settings"]');
await page2.waitForSelector('.sheet');
const bnote = await page2.locator('.note.warn').textContent();
if (!/aldrig taget en backup/.test(bnote)) fail('backup-påmindelse mangler: ' + bnote);
await page2.click('.sheet-close');
await page2.evaluate(() => localStorage.setItem('rtd-last-export', String(Date.now())));
await page2.reload();
await page2.waitForSelector('.appbar');
if (await page2.locator('.iconbtn.needs-backup').count()) fail('backup-prik forsvandt ikke efter eksport');
await page2.click('[data-action="settings"]');
await page2.waitForSelector('.sheet');
if (!await page2.locator('.note').filter({ hasText: 'Seneste backup' }).count()) fail('datoen for seneste backup vises ikke');
if (await page2.locator('.note.warn').count()) fail('påmindelsen står stadig som advarsel efter eksport');
await page2.click('.sheet-close');
ok('backup-påmindelse virker');

// 19) Konflikt ved delt gem: ugemte ændringer lægges til side og kan hentes frem
const henlaeg = async () => page2.evaluate((s) => {
  localStorage.setItem('rtd-conflict', JSON.stringify({ ts: Date.now(), state: s }));
}, stateMedLog('Henlagt Klub'));
await henlaeg();
await page2.reload();
await page2.waitForSelector('.conflict-banner');
const cbanner = await page2.locator('.conflict-banner').textContent();
if (!/En anden gemte først/.test(cbanner)) fail('konfliktbanner har forkert tekst: ' + cbanner);
await page2.click('[data-action="conflict-dismiss"]');
if (await page2.locator('.conflict-banner').count()) fail('banneret forsvandt ikke ved kassering');
if (await page2.evaluate(() => localStorage.getItem('rtd-conflict'))) fail('henlagte data blev ikke ryddet ved kassering');
await henlaeg();
await page2.reload();
await page2.waitForSelector('.conflict-banner');
await page2.click('[data-action="conflict-restore"]');
await page2.waitForSelector('#brand-name:has-text("Henlagt Klub")');
if (await page2.locator('.conflict-banner').count()) fail('banneret blev stående efter gendannelse');
if (await page2.evaluate(() => localStorage.getItem('rtd-conflict'))) fail('henlagte data blev ikke ryddet efter gendannelse');
ok('konflikt ved delt gem lægger ændringer til side og henter dem frem');

// 20) Gem-kredsløbet: migrering af den rigtige live-state og hvad der faktisk publiceres
// Artifact-runtimen stubbes, så vi kan læse det dokument appen ville udgive.
const page3 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page3.on('pageerror', (e) => fail('gem-test pageerror: ' + e.message));
await page3.route('**://fonts.googleapis.com/**', (r) => r.abort());
await page3.addInitScript(() => {
  window.__udgivet = [];
  window.__afvis = null;
  window.claude = {
    use: (navn) => new Promise((res) => {
      if (navn === 'artifact') return res({
        publish: (html) => {
          window.__udgivet.push(html);
          if (window.__afvis) { const e = new Error('x'); e.code = window.__afvis; return Promise.reject(e); }
          return Promise.resolve();
        }
      });
      if (navn === 'downloads') return res({ save: () => Promise.resolve() });
      res(null);
    })
  };
});
await page3.goto('file://' + join(root, 'dist/rtd-boedeliga.html'));
await page3.waitForSelector('.lb-row, .podium');
const foer = JSON.parse(await page3.evaluate(() => document.getElementById('rtd-state').textContent));

await page3.click('[data-tab="aar"]');
await page3.click('.row:has-text("2026/27")');
await page3.waitForSelector('.meet-head');
await page3.click('.row:has-text("Møde 3")');
await page3.waitForSelector('.member-grid');
await page3.click('.member-cell >> nth=0');
await page3.waitForSelector('.fine-grid');
await page3.click('.fine-btn >> nth=0');
await page3.click('.sheet-close');
if (!/Gem ændringer/.test(await page3.locator('#save-btn').textContent())) fail('gem-knappen markerer ikke ugemte ændringer');

await page3.click('#save-btn');
await page3.waitForFunction(() => window.__udgivet.length > 0);
const udgivet = await page3.evaluate(() => window.__udgivet[0]);
const sm = udgivet.match(/<script[^>]*id="rtd-state"[^>]*>([\s\S]*?)<\/script>/);
if (!sm) fail('den publicerede fil mangler state-blokken');
const efter = JSON.parse(sm[1].replace(/\\u003c/g, '<'));

if (efter.version !== 7) fail('publiceret state er v' + efter.version + ', ikke v7');
for (const k of ['members', 'fineTypes', 'meetings', 'clubYears']) {
  if (efter[k].length !== foer[k].length) fail(k + ' tabte poster ved gem: ' + foer[k].length + ' → ' + efter[k].length);
}
if (efter.fines.length !== foer.fines.length + 1) fail('den nye bøde kom ikke med i det publicerede');
if (efter.members.map(x => x.name).sort().join('|') !== foer.members.map(x => x.name).sort().join('|')) fail('medlemsnavne ændret ved gem');
if (efter.formandId !== foer.formandId) fail('formanden ændret ved gem');
if (!Array.isArray(efter.formandHistory) || !efter.formandHistory.length) fail('formandsrækken blev ikke oprettet ved migreringen');
if (efter.members.some(x => x.prospectGoal === undefined || !Array.isArray(x.years))) fail('medlemmer mangler v7-felter efter migrering');
if (efter.audit.length <= foer.audit.length) fail('revisionsloggen voksede ikke');
const lokal = JSON.parse(await page3.evaluate(() => localStorage.getItem('rtd-boedeliga-v1')));
if (lokal.fines.length !== efter.fines.length) fail('localStorage og det publicerede er ikke enige');
if (!/Alt gemt/.test(await page3.locator('#save-btn').textContent())) fail('knappen skifter ikke til »Alt gemt«');
ok('gem publicerer hele datasættet og migrerer v' + foer.version + ' → v7 uden tab');

// Konflikt: ugemte ændringer skal henlægges frem for at forsvinde
await page3.evaluate(() => { window.__afvis = 'conflict'; });
await page3.waitForSelector('.member-grid');
await page3.click('.member-cell >> nth=1');
await page3.waitForSelector('.fine-grid');
await page3.click('.fine-btn >> nth=0');
await page3.click('.sheet-close');
await page3.click('#save-btn');
await page3.waitForFunction(() => localStorage.getItem('rtd-conflict'), null, { timeout: 8000 })
  .catch(() => fail('konflikten henlagde ikke de ugemte ændringer'));
const henlagt = JSON.parse(await page3.evaluate(() => localStorage.getItem('rtd-conflict')) || '{}');
if (!henlagt.state || henlagt.state.fines.length !== efter.fines.length + 1) fail('de henlagte data er ikke komplette');
else ok('afvist gem henlægger hele datasættet i stedet for at tabe det');

await browser.close();
console.log(failures ? 'FÆRDIG MED ' + failures + ' FEJL' : 'ALLE TJEK BESTÅET');
process.exitCode = failures ? 1 : 0;
