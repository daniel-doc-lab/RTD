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
await page.click('[data-action="picker-nav"][data-dir="1"]');
await page.click('[data-action="special-fine"]');
await page.fill('#sp-label', 'Tabt væddemål');
await page.fill('#sp-amount', '75');
await page.click('[data-action="special-save"]');
await page.click('.sheet-close');

// Mødetotal: 30+30+500+75 = 635
await page.waitForTimeout(450);
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
const first = await page.locator('.lb-row').first().textContent();
if (!first.includes('Miki')) fail('rang 1 er ikke Miki (500 kr.): ' + first.slice(0, 60)); else ok('rangering korrekt');
if (await page.locator('.lb-row .zaps').count() < 1) fail('zap-markering for dyr bøde mangler');
await page.waitForSelector('.streak-panel');
const streakTxt = await page.locator('.streak-panel').textContent();
if (!streakTxt.includes('Martin') || !streakTxt.includes('2 møder i træk')) fail('mødestreak mangler: ' + streakTxt.slice(0, 120)); else ok('mødestreak vises');
if (!streakTxt.includes('Stamkunde')) fail('typestreak (Stamkunde) mangler');
// Forsideknappen foreslår at fortsætte et åbent møde med bøder
const cta = await page.locator('.actionbar .btn').textContent();
if (!cta.includes('Fortsæt')) fail('forsideknap foreslår ikke Fortsæt: ' + cta);
await page.screenshot({ path: shots + '/shot-liga.png' });

// 8) Formand: kron Thomas
await page.click('.lb-row:has-text("Thomas Jarløv")');
await page.click('[data-action="toggle-formand"]');
await page.waitForSelector('.sheet-head .crown');
ok('formand kronet');
await page.click('.sheet-close');
if (await page.locator('.lb-row:has-text("Thomas") .crown').count() !== 1) fail('krone mangler på ligaen');

// 9) Indbetaling: Miki betaler alt (500)
await page.click('.lb-row:has-text("Miki")');
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
if (await page.locator('.row.inactive:has-text("Testperson")').count() !== 1) fail('udmeldelse virker ikke');
await page.click('.row:has-text("Testperson")');
await page.click('[data-action="revive-member"]');
if (await page.locator('.row.inactive').count() !== 0) fail('genindmeldelse virker ikke');
ok('medlems-CRUD virker');

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
await page.waitForSelector('.chips.small');
await page.locator('.chips.small .chip:has-text("2025/26")').click();
await page.waitForSelector('.chips.small .chip.active:has-text("2025/26")');
const hist = await page.locator('.hist').textContent();
if (!hist.includes('Møde')) fail('historikfilter: ingen poster for 2025/26');
await page.click('.sheet-close');
ok('historikfilter virker');

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

await browser.close();
console.log(failures ? 'FÆRDIG MED ' + failures + ' FEJL' : 'ALLE TJEK BESTÅET');
process.exitCode = failures ? 1 : 0;
