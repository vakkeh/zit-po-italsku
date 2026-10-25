// Animace a panely stránky Žít po italsku. Prodejní údaje vznikají při sestavení z config.mjs.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!calm && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('wait'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('wait'); io.observe(el); } });
}
/* Jeden den: aktivní je vždy krok nejblíž středu obrazovky. Počítá se při každém scrollu,
   takže nevynechá krok ani při rychlém scrollu nebo uvnitř vloženého rámu. */
const day = document.querySelector('.day'), frames = [...document.querySelectorAll('.frame img')];
const steps = [...document.querySelectorAll('.step')], stepsEl = document.querySelector('.steps'), dots = [...document.querySelectorAll('.dots button')];
/* Na telefonu jsou kroky karty vedle sebe: aktivní je ta uprostřed posuvného pásu. */
const isCarousel = () => getComputedStyle(document.querySelector('.frame')).display === 'none';
let current = -1;
function pickStep() {
  let best = 0, dist = Infinity;
  if (isCarousel()) {
    const box = stepsEl.getBoundingClientRect(), mid = box.left + box.width / 2;
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < dist) { dist = d; best = i; } });
  } else {
    const mid = innerHeight / 2;
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < dist) { dist = d; best = i; } });
  }
  if (best === current) return;
  current = best;
  const s = steps[best];
  steps.forEach((x, i) => x.classList.toggle('on', i === best));
  frames.forEach((f, i) => f.classList.toggle('on', i === best));
  dots.forEach((d, i) => d.classList.toggle('on', i === best));
  document.documentElement.style.setProperty('--day', s.dataset.tone);
}
let ticking = false;
const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; pickStep(); }); } };
addEventListener('scroll', schedule, { passive: true });
stepsEl.addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', () => { current = -1; pickStep(); });
dots.forEach((d, i) => d.addEventListener('click', () => {
  const card = steps[i];
  stepsEl.scrollTo({ left: card.offsetLeft - (stepsEl.clientWidth - card.offsetWidth) / 2, behavior: calm ? 'auto' : 'smooth' });
}));
pickStep();



/* Moře: sluneční třpyt se směrem k divákovi rozšiřuje, vlnky pomalu plují.
   Stejné moře je v úvodu, u citátu (třpyt rozptýlený po hladině) a u nákupu (třpyt pod knihou). */
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
function makeSea(canvas, { center = () => .5, scattered = false } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, glints = [], ripples = [], running = false, cx = 0;
  function setup() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W * center();
    glints = Array.from({ length: Math.round(W / (scattered ? 10 : 5)) }, () => {
      const d = Math.random() ** 1.5;
      return scattered
        ? { d, y: 40 + Math.random() * (H - 80), x: Math.random() * W, len: 2 + 14 * Math.random(), th: 1 + Math.random(), sp: .5 + Math.random() * 1.5, ph: Math.random() * 6.28, k: .55 }
        : { d, y: 4 + d * (H * .6), x: cx + gauss() * (30 + 300 * d), len: 2 + (4 + 30 * d) * Math.random(), th: .8 + 1.6 * d, sp: .6 + Math.random() * 1.8, ph: Math.random() * 6.28, k: 1 };
    });
    ripples = Array.from({ length: Math.round(W / 22) }, () => {
      const d = Math.random() ** 1.3;
      return { d, y: scattered ? 30 + Math.random() * (H - 60) : 6 + d * (H * .62), x: Math.random() * W, len: 16 + 120 * d * Math.random(), v: (4 + 14 * d) * (Math.random() < .5 ? -1 : 1), a: .05 + .08 * Math.random() };
    });
  }
  function draw(t) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    if (!scattered) {
      const glow = ctx.createRadialGradient(cx, 0, 0, cx, 0, H * 1.1);
      glow.addColorStop(0, 'rgba(255,214,140,.35)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    }
    ctx.lineCap = 'round';
    for (const r of ripples) {
      const x = ((r.x + r.v * t) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.strokeStyle = `rgba(255,255,255,${r.a})`; ctx.lineWidth = .8 + r.d;
      ctx.beginPath(); ctx.moveTo(x, r.y); ctx.quadraticCurveTo(x + r.len / 2, r.y - 1.5 - 2 * r.d, x + r.len, r.y); ctx.stroke();
    }
    for (const g of glints) {
      const a = Math.max(0, Math.sin(t * g.sp + g.ph)) ** 3 * (1 - .35 * g.d) * g.k;
      if (a < .02) continue;
      ctx.strokeStyle = `rgba(255,230,170,${a})`; ctx.lineWidth = g.th;
      ctx.beginPath(); ctx.moveTo(g.x - g.len / 2, g.y); ctx.lineTo(g.x + g.len / 2, g.y); ctx.stroke();
    }
  }
  function loop(ms) { if (!running) return; draw(ms / 1000); requestAnimationFrame(loop); }
  setup(); draw(1.3);
  addEventListener('resize', () => { setup(); draw(1.3); });
  if (!calm) new IntersectionObserver(([e]) => { const was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(loop); }).observe(canvas);
}
makeSea(document.querySelector('.sea canvas'));
makeSea(document.querySelector('.quote canvas'), { scattered: true });
const offerCanvas = document.querySelector('.offer-sea canvas'), offerBook = document.querySelector('.offer .book');
makeSea(offerCanvas, { center: () => { const b = offerBook.getBoundingClientRect(), c = offerCanvas.getBoundingClientRect(); return (b.left + b.width / 2 - c.left) / c.width; } });


const dock = document.querySelector('.dock'), hero = document.querySelector('.hero'), offer = document.getElementById('objednat');
let heroOut = false, offerIn = false;
const sync = () => dock.classList.toggle('show', heroOut && !offerIn);
new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; sync(); }).observe(hero);
new IntersectionObserver(([e]) => { offerIn = e.isIntersecting; sync(); }).observe(offer);

/* Panely (obsah knihy, právní dokumenty). Fokus přesouváme jen při ovládání klávesnicí,
   myš a prst tak po zavření nevidí rámeček. */
let panelReturn = null, viaKeys = false, openPanelEl = null;
addEventListener('keydown', () => viaKeys = true, true);
addEventListener('pointerdown', () => viaKeys = false, true);
function openPanel(panel, opener) { panelReturn = opener; openPanelEl = panel; panel.hidden = false; document.body.style.overflow = 'hidden'; if (viaKeys) panel.querySelector('.toc-close').focus(); }
function closePanel() { if (!openPanelEl) return; openPanelEl.hidden = true; openPanelEl = null; document.body.style.overflow = ''; if (viaKeys) panelReturn?.focus(); else document.activeElement?.blur(); }
document.querySelectorAll('.toc-panel').forEach(p => {
  p.querySelector('.toc-close').addEventListener('click', closePanel);
  p.addEventListener('click', e => { if (e.target === p) closePanel(); });
});
addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
const tocPanel = document.getElementById('toc');
document.querySelectorAll('[data-toc]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openPanel(tocPanel, e.currentTarget); }));

/* Právní dokumenty: pracovní šablony z legal.json, dokud je nenahradí zkontrolované texty. */
const legalPanel = document.getElementById('legal'), legalTitle = document.getElementById('legal-h'), legalBody = document.getElementById('legal-body');
let legalDocs;
document.querySelectorAll('[data-legal]').forEach(b => b.addEventListener('click', async e => {
  legalTitle.textContent = 'Právní dokument'; legalBody.textContent = 'Načítání…';
  openPanel(legalPanel, e.currentTarget);
  try {
    legalDocs ||= fetch('legal.json').then(r => { if (!r.ok) throw new Error(); return r.json(); });
    const [name, ...paragraphs] = (await legalDocs)[b.dataset.legal];
    legalTitle.textContent = name; legalBody.replaceChildren();
    const note = document.createElement('p'); note.className = 'legal-draft'; note.textContent = 'Pracovní šablona. Před zahájením prodeje ji nahradí zkontrolovaný dokument.'; legalBody.append(note);
    for (const t of paragraphs) { const p = document.createElement('p'); p.textContent = t; legalBody.append(p); }
  } catch { legalDocs = null; legalBody.textContent = 'Dokument se nepodařilo načíst.'; }
}));
