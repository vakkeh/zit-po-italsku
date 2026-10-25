// Prodejní odkazy, dostupnost a SEO vznikají při sestavení z jediné konfigurace.
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!motion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.remove('is-pending'); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => { el.classList.add('is-pending'); observer.observe(el); });
  motion.addEventListener('change', () => { if (motion.matches) { document.querySelectorAll('.is-pending').forEach(el=>el.classList.remove('is-pending')); observer.disconnect(); } });
}
const dialog=document.querySelector('#legal-dialog');
let legalPromise;
document.querySelectorAll('[data-legal]').forEach(button => button.addEventListener('click',async()=>{
  const title=document.querySelector('#legal-title'), content=document.querySelector('#legal-content');
  title.textContent='Právní dokument';content.textContent='Načítání…';dialog.showModal();
  try {
    legalPromise ||= fetch('legal.json').then(response=>{if(!response.ok)throw new Error('Dokument není dostupný');return response.json();});
    const documents=await legalPromise;
    const [name,...paragraphs]=documents[button.dataset.legal];title.textContent=name;
    content.replaceChildren();
    for(const text of ['Tato kostra není hotový právní dokument. Před použitím ji nechte zkontrolovat a doplňte údaje o prodávajícím i skutečný provoz webu.',...paragraphs]){const p=document.createElement('p');p.textContent=text;content.append(p);}
  } catch { legalPromise=null;content.textContent='Dokument se nepodařilo načíst. Pracovní šablony jsou v dokumentaci projektu.'; }
}));
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
const form=document.querySelector('#newsletter-form');
form.addEventListener('submit',event=>{
  if (!form.hasAttribute('action')) {
    event.preventDefault();
    const email=form.querySelector('input[type="email"]');
    const fallback=form.dataset.fallback;
    if(!fallback) return;
    const purpose=form.dataset.purpose==='naskladneni'?'Upozornění na naskladnění knihy':'Odběr novinek Žít po italsku';
    window.location.href=`mailto:${encodeURIComponent(fallback)}?subject=${encodeURIComponent(purpose)}&body=${encodeURIComponent(`Můj e-mail: ${email.value}\nSouhlasím se zpracováním e-mailu pro účel: ${purpose}. Souhlas mohu kdykoli odvolat.`)}`;
    form.querySelector('[role="status"]').textContent='Otevřeli jsme e-mailovou zprávu. Pro dokončení žádosti ji odešlete ve svém e-mailovém klientu.';
  }
});
// Mobilní lišta s objednávkou nepřekrývá samotný objednávkový formulář.
const mobileOrder=document.querySelector('.mobile-order'),purchase=document.querySelector('#objednavka');
if(mobileOrder&&purchase&&'IntersectionObserver' in window)new IntersectionObserver(([entry])=>mobileOrder.classList.toggle('is-hidden',entry.isIntersecting)).observe(purchase);
// Vlastní pokladna: výběr výdejního místa ve widgetu Zásilkovny, cenu ověřuje a účtuje server (api/checkout).
const order=document.querySelector('#order-form');
if(order){
  const quantity=order.querySelector('#order-quantity'),total=order.querySelector('#order-total'),selected=order.querySelector('#pickup-selected'),pick=order.querySelector('#pickup-button'),status=order.querySelector('[role="status"]'),submit=order.querySelector('[type="submit"]');
  const czk=n=>new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',maximumFractionDigits:0}).format(n);
  const update=()=>{total.textContent=czk(Number(order.dataset.price)*Number(quantity.value)+Number(order.dataset.shipping));};
  quantity.addEventListener('change',update);update();
  let point=null,widget;
  // Knihovna Zásilkovny se načítá až po kliknutí, ne při otevření stránky.
  const loadWidget=()=>widget||=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://widget.packeta.com/v6/www/js/library.js';script.onload=()=>window.Packeta?resolve(window.Packeta):reject();script.onerror=()=>{widget=null;reject();};document.head.append(script);});
  pick.addEventListener('click',async()=>{
    try{
      const Packeta=await loadWidget();
      Packeta.Widget.pick(order.dataset.packetaKey,result=>{
        if(!result)return;
        const label=[result.place,result.name].filter(Boolean).join(', ');
        point={id:String(result.id),carrierId:result.carrierId?String(result.carrierId):'',carrierPickupPointId:result.carrierPickupPointId?String(result.carrierPickupPointId):'',label};
        selected.textContent=label;pick.textContent=pick.dataset.change;status.textContent='';
      },{country:'cz',language:'cs'});
    }catch{status.textContent='Mapu výdejních míst se nepodařilo načíst. Zkuste to prosím znovu.';}
  });
  order.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!point){status.textContent='Nejprve prosím vyberte výdejní místo Zásilkovny.';pick.focus();return;}
    submit.disabled=true;status.textContent='Přesměrováváme vás na zabezpečenou platbu…';
    try{
      const response=await fetch('api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({quantity:Number(quantity.value),point})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.url)throw new Error(data.error);
      window.location.href=data.url;
    }catch(error){status.textContent=error.message||'Platbu se teď nepodařilo zahájit. Zkuste to prosím za chvíli znovu.';submit.disabled=false;}
  });
  window.addEventListener('pageshow',()=>{submit.disabled=false;});
}
// Přímý POST směřuje k poskytovateli newsletteru. Žádný falešný stav úspěchu.
// Cookie šablona zůstává neaktivní: žádné měření ani volitelné cookies se nenačítají.
