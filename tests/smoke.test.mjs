import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(join(root,name),'utf8');
const html=read('index.html'),css=read('styles.css'),js=read('app.js'),sw=read('sw.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const idsSet=new Set(ids);

test('Every id is unique',()=>assert.equal(ids.length,idsSet.size,`duplicate IDs: ${ids.filter((x,i)=>ids.indexOf(x)<i)}`));
test('All direct JavaScript #id references exist in HTML',()=>{
 const refs=[...js.matchAll(/\$\('#([^']+)'\)/g)].map(x=>x[1]);
 const missing=refs.filter(x=>!idsSet.has(x));
 assert.deepEqual([...new Set(missing)],[]);
});
test('All local navigation targets exist',()=>{
 const targets=[...html.matchAll(/href="#([\w-]+)"/g)].map(x=>x[1]);
 assert.ok(targets.length>=14);
 assert.deepEqual([...new Set(targets.filter(x=>!idsSet.has(x)))],[]);
});
test('Site contains core interactive engines',()=>{
 for(const id of ['generate','feedGrid','brainButton','posterCanvas','bingoBoard','arcadeCanvas','mergeBoard','oracleMessages','bunkerExport','passportGrid','observatoryBars'])assert.ok(idsSet.has(id),`missing #${id}`);
});
test('PWA asset revision matches the service worker version',()=>{
 const assetVersion=html.match(/src="app\.js\?v=([\d.]+)"/)?.[1];
 const styleVersion=html.match(/href="styles\.css\?v=([\d.]+)"/)?.[1];
 const workerVersion=sw.match(/the-ai-slop-v([\d.]+)/)?.[1];
 const workerScriptVersion=sw.match(/app\.js\?v=([\d.]+)/)?.[1];
 assert.ok(assetVersion);
 assert.equal(assetVersion,styleVersion);
 assert.equal(assetVersion,workerVersion);
 assert.equal(assetVersion,workerScriptVersion);
});
test('PWA manifest has safe relative scope and local icon',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.start_url,'./');
 assert.ok(manifest.icons.some(icon=>existsSync(join(root,icon.src))));
});
test('No external runtime scripts or trackers added',()=>{
 assert.equal([...html.matchAll(/<script\b/g)].length,1);
 assert.ok(!/google-analytics|googletagmanager|facebook\.net\/en_US\/fbevents/i.test(html+js));
});
test('Accessibility support is present',()=>{
 assert.match(css,/prefers-reduced-motion/);
 assert.match(html,/class="skip-link"/);
 assert.match(html,/role="status"/);
 assert.match(html,/aria-label=/);
});
test('Bundle stays lightweight',()=>{
 assert.ok(js.length<180000,'JavaScript grew unusually large');
 assert.ok(css.length<150000,'CSS grew unusually large');
});
