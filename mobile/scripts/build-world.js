// Turns the drawn worlds in src/world/*.html into TypeScript strings the app loads into a
// WebView. Run after editing any of them:  npm run world
// Open an .html file in a browser on its own to see it with sample data.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../src/world');
const pages = { 'world.html': ['worldHtml.ts', 'WORLD_HTML'], 'vesuvius.html': ['vesuviusHtml.ts', 'VESUVIUS_HTML'] };
for (const [src, [out, name]] of Object.entries(pages)) {
  const html = fs.readFileSync(path.join(dir, src), 'utf8');
  fs.writeFileSync(path.join(dir, out), `// Generated from ${src} by scripts/build-world.js. Do not edit by hand.\nexport const ${name} = ${JSON.stringify(html)};\n`);
  console.log('wrote', out, html.length, 'chars');
}
