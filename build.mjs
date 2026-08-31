// Bygger dist/rtd-boedeliga.html: hele appen samlet i én fil (CSS + JS inlinet).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('styles.css', 'utf8');
const js = readFileSync('app.js', 'utf8');

const bodyStart = html.indexOf('<body>') + '<body>'.length;
const bodyEnd = html.lastIndexOf('</body>');
let body = html.slice(bodyStart, bodyEnd);
body = body.replace('<script src="app.js"></script>', '');

const out = `<title>RTD Bødeligaen</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;600;700&display=swap">
<style>
${css}
</style>
${body}
<script>
${js.replace(/<\/script>/g, '<\\/script>')}
</script>
`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/rtd-boedeliga.html', out);
console.log('wrote dist/rtd-boedeliga.html (' + Math.round(out.length / 1024) + ' KB)');
