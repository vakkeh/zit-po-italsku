// Dočasná heslová brána (přidává ji build.mjs, jen když je nastavené SITE_PASSWORD).
// Zamyká jen vzhled stránky, obsah zůstává v HTML. Heslo se porovnává přes otisk PBKDF2, heslo samo ve webu není.
(() => {
  const salt = '__SALT__', hash = '__HASH__', key = 'zit-gate';
  try { if (localStorage.getItem(key) === hash) return; } catch { /* bez úložiště se brána ukáže vždy */ }
  document.documentElement.classList.add('gate-locked');
  const style = document.createElement('style');
  style.textContent = `html.gate-locked body>:not(#gate){display:none!important}
html.gate-locked{background:#FFF3DF}
#gate{min-height:100vh;display:grid;place-content:center;gap:14px;padding:24px;text-align:center;color:var(--ink,#1F3A44);font-family:var(--body,system-ui,sans-serif)}
#gate h1{margin:0;font:500 clamp(30px,6vw,44px)/1.1 var(--display,Georgia,serif)}
#gate p{margin:0;color:var(--soft,#5B6B6D)}
#gate input{font:inherit;padding:12px 14px;border:1px solid var(--line,rgba(31,58,68,.3));border-radius:10px;background:#fff;color:inherit;text-align:center}
#gate button{font:inherit;font-weight:600;padding:12px 22px;border:0;border-radius:999px;background:var(--sea,#13505F);color:#fff;cursor:pointer}
#gate [role=alert]{min-height:1.4em;color:#B3402A}`;
  document.head.append(style);
  const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  const derive = async text => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(text), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, base, 256));
  };
  addEventListener('DOMContentLoaded', () => {
    const form = document.createElement('form');
    form.id = 'gate';
    form.innerHTML = '<h1>Žít po italsku</h1><p>Stránka je zatím zamčená. Zadejte heslo.</p><input type="password" name="password" aria-label="Heslo" autocomplete="current-password" required><button type="submit">Odemknout</button><p role="alert"></p>';
    document.body.prepend(form);
    form.password.focus();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const alert = form.querySelector('[role=alert]');
      let ok = false;
      try { ok = await derive(form.password.value) === hash; } catch { alert.textContent = 'Tento prohlížeč heslo neumí ověřit.'; return; }
      if (!ok) { alert.textContent = 'Špatné heslo.'; form.password.select(); return; }
      try { localStorage.setItem(key, hash); } catch { /* odemčeno jen do zavření stránky */ }
      location.reload();
    });
  });
})();
