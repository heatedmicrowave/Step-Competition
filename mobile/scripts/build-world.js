// Turns the drawn worlds in src/world/*.html into TypeScript strings the app loads into a
// WebView. Run after editing any of them:  npm run world
// Open an .html file in a browser on its own to see it with sample data.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../src/world');
const pages = { 'world.html': ['worldHtml.ts', 'WORLD_HTML'], 'vesuvius.html': ['vesuviusHtml.ts', 'VESUVIUS_HTML'] };
// Vesuvius's music (src/world/music/*.m4a) is baked into its page as base64.
const music = () => {
  const m = {};
  for (const k of ['bay', 'tar']) m[k] = fs.readFileSync(path.join(dir, 'music', k + '.m4a')).toString('base64');
  return 'window.__MUSIC = ' + JSON.stringify(m) + ';';
};
for (const [src, [out, name]] of Object.entries(pages)) {
  let html = fs.readFileSync(path.join(dir, src), 'utf8');
  if (html.includes('/*MUSIC*/')) html = html.replace('/*MUSIC*/', music());
  fs.writeFileSync(path.join(dir, out), `// Generated from ${src} by scripts/build-world.js. Do not edit by hand.\nexport const ${name} = ${JSON.stringify(html)};\n`);
  console.log('wrote', out, html.length, 'chars');
}
