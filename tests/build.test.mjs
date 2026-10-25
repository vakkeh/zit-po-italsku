import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import config from '../config.mjs';
test('vygenerované HTML podporuje sklad, předprodej a vyprodání bez zásahu do zdrojů',()=>{
 const dir=mkdtempSync(join(tmpdir(),'zit-build-'));
 try{
  for(const file of ['build.mjs','commerce.mjs','styles.css','app.js']) cpSync(new URL('../'+file,import.meta.url),join(dir,file));
  cpSync(new URL('../assets',import.meta.url),join(dir,'assets'),{recursive:true});mkdirSync(join(dir,'docs'));
  for(const availability of ['skladem','predprodej','vyprodano']){
   const c=structuredClone(config);c.product.checkoutMode='product';c.product.price=449;c.product.availability=availability;c.product.dispatchDate='2026-12-01';c.siteUrl='https://kniha.example';c.newsletter.endpoint='https://newsletter.example/form';c.newsletter.privacyReady=true;
   writeFileSync(join(dir,'config.mjs'),`export const SHOPTET_PRODUCT_URL='https://shop.example/kniha/'; export default ${JSON.stringify(c)}`);
   execFileSync(process.execPath,['build.mjs'],{cwd:dir});
   const html=readFileSync(join(dir,'dist/index.html'),'utf8');
   assert.ok(html.includes('<h1 id="hero-title">'));assert.ok(html.includes('https://kniha.example/assets/obalka.webp'));assert.ok(!html.includes('type="email" placeholder="vas@email.cz" autocomplete="email" required disabled'));
   if(availability==='vyprodano'){assert.ok(html.includes('Upozornit na naskladnění'));assert.ok(html.includes('value="naskladneni"'));assert.ok(html.includes('pouze pro upozornění'));assert.ok(!html.includes('utm_content=hero'));assert.ok(html.includes('https://schema.org/OutOfStock'));}
   else {assert.ok(html.includes('utm_content=hero'));assert.ok(html.includes('"price":449'));}
   if(availability==='predprodej')assert.ok(html.includes('Plánovaná expedice: 1. 12. 2026'));
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('vlastní pokladna Stripe + Zásilkovna vykreslí objednávkový formulář jen s úplným nastavením',()=>{
 const dir=mkdtempSync(join(tmpdir(),'zit-build-'));
 try{
  for(const file of ['build.mjs','commerce.mjs','styles.css','app.js']) cpSync(new URL('../'+file,import.meta.url),join(dir,file));
  cpSync(new URL('../assets',import.meta.url),join(dir,'assets'),{recursive:true});mkdirSync(join(dir,'docs'));
  const render=c=>{writeFileSync(join(dir,'config.mjs'),`export const SHOPTET_PRODUCT_URL=''; export default ${JSON.stringify(c)}`);execFileSync(process.execPath,['build.mjs'],{cwd:dir});return readFileSync(join(dir,'dist/index.html'),'utf8');};
  const c=structuredClone(config);c.product.checkoutMode='stripe';c.product.price=449;c.product.availability='skladem';c.siteUrl='https://kniha.example';
  assert.ok(!render(c).includes('id="order-form"'),'bez dopravy a klíče widgetu se pokladna nezobrazí');
  c.shipping={...c.shipping,price:89,packetaWidgetKey:'abcdef0123456789'};
  const html=render(c);
  assert.ok(html.includes('id="order-form"'));assert.ok(html.includes('data-packeta-key="abcdef0123456789"'));assert.ok(html.includes('data-price="449" data-shipping="89"'));
  assert.ok(html.includes('href="#objednavka"'));assert.ok(!html.includes('utm_source'));assert.ok(html.includes('"url":"https://kniha.example/#objednavka"'));
  assert.ok(/538\s*Kč/.test(html),'celková cena včetně dopravy');
  assert.ok(!readFileSync(join(dir,'dist/dekujeme.html'),'utf8').includes('ŠABLONA'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
