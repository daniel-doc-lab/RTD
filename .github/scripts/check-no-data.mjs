// Sikkerhedsnet før udgivelse: den offentlige udgave må aldrig bære klubbens data.
//
// To ting kontrolleres:
//   1. Alle HTML-filer i mappen skal have en TOM #rtd-state-blok.
//   2. Ingen fil må nævne klubbens navn eller medlemmernes navne. Listen læses
//      fra referencefilen (den committede dist), så navnene ikke skal skrives
//      ind her — og kontrollen følger automatisk med, når klubben ændrer sig.
//
// Brug: node check-no-data.mjs <mappe> [referencefil]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const ref = process.argv[3];
if (!dir) {
  console.error('Brug: node check-no-data.mjs <mappe> [referencefil]');
  process.exit(1);
}

function stateOf(html) {
  const m = html.match(/<script[^>]*id="rtd-state"[^>]*>([\s\S]*?)<\/script>/);
  return m ? m[1].trim() : null;
}

// Hvilke navne må ikke optræde?
let forbudt = [];
if (ref && existsSync(ref)) {
  const raa = stateOf(readFileSync(ref, 'utf8'));
  if (raa) {
    try {
      const s = JSON.parse(raa);
      // Kun HELE navne. Enkeltord som »Daniel« eller »Mads« optræder også
      // legitimt i kreditlinjen og i takstnavne, og ville give falsk alarm.
      const navne = (s.members || []).map((m) => String(m.name || '').trim());
      forbudt = [...new Set(
        navne.concat([s.clubName])
          .map((x) => String(x || '').trim())
          .filter((x) => x.length >= 5 && /\s/.test(x))
      )];
      console.log('Referencedata: ' + navne.length + ' medlemmer → ' + forbudt.length + ' forbudte navne');
    } catch (e) {
      console.error('FEJL: kunne ikke læse referencefilens state');
      process.exit(1);
    }
  } else {
    console.log('Referencefilen bærer ingen data — kun state-blokken kontrolleres.');
  }
}

let checked = 0;
let failed = 0;

for (const name of readdirSync(dir)) {
  if (!/\.(html|js)$/.test(name)) continue;
  const html = readFileSync(join(dir, name), 'utf8');
  checked++;

  if (name.endsWith('.html')) {
    const body = stateOf(html);
    if (body === null) {
      console.error('FEJL: ' + name + ' mangler #rtd-state-blokken helt');
      failed++;
      continue;
    }
    if (body) {
      console.error('FEJL: ' + name + ' indeholder ' + body.length + ' tegn klubdata i #rtd-state');
      failed++;
      continue;
    }
  }

  const fundet = forbudt.filter((ord) => html.includes(ord));
  if (fundet.length) {
    console.error('FEJL: ' + name + ' nævner ' + fundet.length + ' navn(e) fra klubben: ' + fundet.slice(0, 5).join(', '));
    failed++;
  } else {
    console.log('ok: ' + name + ' er fri for klubdata');
  }
}

if (!checked) {
  console.error('FEJL: fandt ingen HTML- eller JS-filer i ' + dir);
  process.exit(1);
}
if (failed) {
  console.error('\nUdgivelsen stoppet: ' + failed + ' fil(er) ville lægge klubdata offentligt.');
  process.exit(1);
}
console.log('\n' + checked + ' filer kontrolleret — ingen klubdata i den offentlige udgave.');
