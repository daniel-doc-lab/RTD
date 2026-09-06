// Sikkerhedsnet før udgivelse: den offentlige udgave må aldrig indeholde
// klubbens data. Alle HTML-filer i mappen skal have en TOM #rtd-state-blok.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('Brug: node check-no-data.mjs <mappe>');
  process.exit(1);
}

let checked = 0;
let failed = 0;

for (const name of readdirSync(dir)) {
  if (!name.endsWith('.html')) continue;
  const file = join(dir, name);
  const html = readFileSync(file, 'utf8');
  const m = html.match(/<script[^>]*id="rtd-state"[^>]*>([\s\S]*?)<\/script>/);
  checked++;
  if (!m) {
    console.error('FEJL: ' + name + ' mangler #rtd-state-blokken helt');
    failed++;
    continue;
  }
  const body = m[1].trim();
  if (body) {
    console.error('FEJL: ' + name + ' indeholder ' + body.length + ' tegn klubdata i #rtd-state');
    failed++;
  } else {
    console.log('ok: ' + name + ' er datafri');
  }
}

if (!checked) {
  console.error('FEJL: fandt ingen HTML-filer i ' + dir);
  process.exit(1);
}
if (failed) {
  console.error('\nUdgivelsen stoppet: ' + failed + ' fil(er) ville lægge klubdata offentligt.');
  process.exit(1);
}
console.log('\n' + checked + ' filer kontrolleret — ingen klubdata i den offentlige udgave.');
