// Turns src/world/world.html (the drawn mountain) into a TypeScript string the app can load
// into a WebView. Run after editing world.html:  npm run world
// Open world.html in a browser on its own to see it with sample data.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src/world/world.html');
const out = path.join(__dirname, '../src/world/worldHtml.ts');
const html = fs.readFileSync(src, 'utf8');
fs.writeFileSync(out, '// Generated from world.html by scripts/build-world.js. Do not edit by hand.\nexport const WORLD_HTML = ' + JSON.stringify(html) + ';\n');
console.log('wrote', path.relative(process.cwd(), out), html.length, 'chars');
