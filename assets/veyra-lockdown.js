'use strict';
(() => {
  const button = document.getElementById('topLockdown');
  if (!button || !window.crypto?.subtle) return;
  const PIN_LENGTH = 5;
  const DEFAULT_PIN = '12345';
  const PBKDF2_ROUNDS = 140000;
  let config = null;
  let overlay = null;
  let pin = '';
  let flow = 'unlock';
  let pendingPin = '';
  let failures = 0;
  let blockedUntil = 0;
  const attemptKey = () => 'veyra-' + (accountScope() === 'legacy' ? 'legacy-' : 'user-' + accountScope() + '-') + 'vaultAttempts';
  const readAttempts = () => {
    try {
      const state = JSON.parse(localStorage.getItem(attemptKey()) || 'null');
      if (!state || typeof state.failures !== 'number' || typeof state.blockedUntil !== 'number') return { failures: 0, blockedUntil: 0 };
      return state;
    } catch { return { failures: 0, blockedUntil: 0 }; }
  };
  const writeAttempts = () => {
    try { localStorage.setItem(attemptKey(), JSON.stringify({ failures, blockedUntil })); } catch {}
  };
  const resetAttempts = () => { failures = 0; blockedUntil = 0; writeAttempts(); };
  const recordFailure = async () => {
    failures++;
    if (failures >= 3) {
      blockedUntil = Date.now() + 60000;
      writeAttempts();
      setMessage('Three incorrect PIN attempts. Signing out of this device…', true);
      try {
        if (window.veyraAuthClient?.auth) await window.veyraAuthClient.auth.signOut({ scope: 'local' });
        else setMessage('Three incorrect attempts. Sign out and sign back in to continue.', true);
      } catch {
        setMessage('Three incorrect attempts. Your local sign-out was requested; reload and sign in again.', true);
      }
      return;
    }
    writeAttempts();
    setMessage('Incorrect PIN. ' + (3 - failures) + ' attempt' + (3 - failures === 1 ? '' : 's') + ' remaining.', true);
    pin = '';
    renderKeypad();
  };
  let message = '';
  let busy = false;

  const accountScope = () => localStorage.getItem('veyra-active-user') || 'legacy';
  const readConfig = () => {
    try {
      const raw = localStorage.getItem('veyra-' + (accountScope() === 'legacy' ? 'legacy-' : 'user-' + accountScope() + '-') + 'vaultSettings');
      const value = raw ? JSON.parse(raw) : null;
      return value && value.version === 1 && typeof value.salt === 'string' && typeof value.hash === 'string' ? value : null;
    } catch { return null; }
  };
  const saveConfig = value => {
    config = value;
    try {
      const key = 'veyra-' + (accountScope() === 'legacy' ? 'legacy-' : 'user-' + accountScope() + '-') + 'vaultSettings';
      localStorage.setItem(key, JSON.stringify(value));
      if (typeof save === 'function') save('vaultSettings', value);
      if (typeof updateStatus === 'function') updateStatus();
      return true;
    } catch { return false; }
  };
  const bytesToHex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
  const hashPin = async (value, salt) => {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ROUNDS, hash: 'SHA-256' }, material, 256);
    return bytesToHex(bits);
  };
  const equal = (a,b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };
  const verify = async value => {
    if (!config) return value === DEFAULT_PIN;
    return equal(await hashPin(value, config.salt), config.hash);
  };
  const makeConfig = async value => {
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    return { version: 1, salt, hash: await hashPin(value, salt), changed: true, updatedAt: new Date().toISOString() };
  };
  const statusText = () => config ? 'Personal PIN enabled' : 'Default PIN active · change recommended';
  const ensureConfig = () => { config = readConfig(); };

  const doorSvg = '<div class="vault-halo" aria-hidden="true"></div><div class="vault-door" aria-hidden="true"><span class="vault-bolt b1"></span><span class="vault-bolt b2"></span><span class="vault-bolt b3"></span><span class="vault-bolt b4"></span><span class="vault-bolt b5"></span><span class="vault-bolt b6"></span><span class="vault-bolt b7"></span><span class="vault-bolt b8"></span><span class="vault-wheel"></span><span class="vault-door-label">VEYRA SECURE ACCESS</span></div>';
  const makeOverlay = (initialMode = 'unlock') => {
    if (overlay) return;
    overlay = document.createElement('section');
    overlay.className = 'vault-overlay is-closing';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','VEYRA Lock Down vault access');
    overlay.innerHTML = '<div class="vault-shell"><div class="vault-brand">VEYRA · SECURITY SYSTEM</div><div class="vault-scene">'+doorSvg+'</div><div class="vault-status" id="vaultStatus">SECURING WORKSPACE</div><h1 class="vault-title" id="vaultTitle">LOCKING DOWN</h1><p class="vault-subtitle" id="vaultSubtitle">Closing the vault and securing your workspace.</p><div class="vault-access" id="vaultAccess" hidden><div class="vault-dots" id="vaultDots" aria-label="PIN entry, five digits"><span class="vault-dot"></span><span class="vault-dot"></span><span class="vault-dot"></span><span class="vault-dot"></span><span class="vault-dot"></span></div><div class="vault-keypad" id="vaultKeypad"></div><div class="vault-message" id="vaultMessage" aria-live="polite"></div><button class="vault-change-btn" id="vaultChange" type="button" hidden>Change vault PIN</button></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      const key = e.target.closest('[data-vault-key]');
      if (key) { e.preventDefault(); pressKey(key.dataset.vaultKey); }
    });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape' || e.key === 'Tab' && e.shiftKey && document.activeElement === overlay.querySelector('[data-vault-key="1"]')) e.preventDefault();
      if (/^\d$/.test(e.key)) pressKey(e.key);
      else if (e.key === 'Backspace') pressKey('back');
      else if (e.key === 'Enter') pressKey('enter');
    });
    overlay.querySelector('#vaultChange').addEventListener('click', () => startChange());
    requestAnimationFrame(() => overlay.classList.add('visible'));
    setTimeout(() => showAccess(initialMode), 1450);
  };
  const setCopy = (status,title,subtitle) => {
    overlay.querySelector('#vaultStatus').textContent = status;
    overlay.querySelector('#vaultTitle').textContent = title;
    overlay.querySelector('#vaultSubtitle').textContent = subtitle;
  };
  const renderKeypad = () => {
    const keypad = overlay.querySelector('#vaultKeypad');
    keypad.innerHTML = ['1','2','3','4','5','6','7','8','9','CLEAR','0','ENTER'].map(k => '<button type="button" class="vault-key '+(k==='ENTER'?'enter':k==='CLEAR'?'utility':'')+'" data-vault-key="'+(k==='CLEAR'?'clear':k==='ENTER'?'enter':k)+'">'+k+'</button>').join('');
    overlay.querySelector('#vaultDots').innerHTML = Array.from({length:PIN_LENGTH},(_,i)=>'<span class="vault-dot '+(i<pin.length?'filled':'')+'"></span>').join('');
  };
  const showAccess = mode => {
    flow = mode || 'unlock';
    pin = '';
    message = '';
    overlay.classList.remove('is-closing','is-opening');
    overlay.querySelector('#vaultAccess').hidden = false;
    overlay.querySelector('#vaultChange').hidden = flow !== 'unlock';
    if (flow === 'unlock') setCopy('SYSTEM LOCKED','VAULT SEALED','Enter your five-digit vault PIN to return to your VEYRA workspace.');
    else if (flow === 'setup') setCopy('FIRST ACCESS','CREATE YOUR PIN','The default PIN worked. Choose a new five-digit PIN for this account.');
    else if (flow === 'confirm') setCopy('PIN SETUP','CONFIRM YOUR PIN','Enter the same five digits again to confirm your new PIN.');
    else if (flow === 'change-current') setCopy('SECURITY SETTINGS','VERIFY CURRENT PIN','Enter your current vault PIN before changing it.');
    else if (flow === 'change-new') setCopy('SECURITY SETTINGS','CREATE NEW PIN','Choose a new five-digit PIN. Do not reuse 12345.');
    else if (flow === 'change-confirm') setCopy('SECURITY SETTINGS','CONFIRM NEW PIN','Enter your new five-digit PIN again.');
    overlay.querySelector('#vaultMessage').textContent = message;
    overlay.querySelector('#vaultMessage').className = 'vault-message';
    renderKeypad();
    overlay.querySelector('[data-vault-key="1"]')?.focus();
  };
  const setMessage = (text,isError=false) => {
    const el = overlay.querySelector('#vaultMessage');
    el.textContent = text;
    el.className = 'vault-message' + (isError?' error':'');
  };
  const openVault = () => {
    if (typeof go === 'function') go('home');
    overlay.classList.add('is-opening');
    overlay.classList.remove('is-closing');
    setCopy('ACCESS GRANTED','WELCOME BACK','Vault unlocked. Restoring your workspace…');
    overlay.querySelector('#vaultAccess').hidden = true;
    setTimeout(() => {
      overlay.classList.remove('visible');
      setTimeout(() => { overlay.remove(); overlay=null; button.focus(); }, 550);
    }, 1150);
  };
  const pressKey = async key => {
    if (busy || !overlay) return;
    if (key === 'clear') { pin=''; renderKeypad(); setMessage(''); return; }
    if (key === 'back') { pin=pin.slice(0,-1); renderKeypad(); return; }
    if (key === 'enter') {
      if (pin.length !== PIN_LENGTH) { setMessage('Enter all five digits.',true); return; }
      busy = true;
      try { await handlePin(pin); }
      catch { setMessage('Could not verify the PIN. Please try again.',true); }
      finally { busy=false; }
      return;
    }
    if (!/^\d$/.test(key) || pin.length>=PIN_LENGTH) return;
    pin += key;
    renderKeypad();
    if (pin.length===PIN_LENGTH) setMessage('Press ENTER to continue.');
  };
  const handlePin = async value => {
    if (flow === 'unlock') {
      if (Date.now() < blockedUntil) { setMessage('Security cooldown active. Please wait ' + Math.ceil((blockedUntil - Date.now()) / 1000) + ' seconds before trying again.',true); return; }
      if (blockedUntil && Date.now() >= blockedUntil) resetAttempts();
      if (await verify(value)) {
        resetAttempts();
        if (!config) { pendingPin=''; showAccess('setup'); setMessage('Default accepted. Create your personal PIN.'); }
        else openVault();
      } else {
        await recordFailure();
      }
      return;
    }
    if (flow === 'setup' || flow === 'change-new') {
      if (value === DEFAULT_PIN) { setMessage('Choose a different PIN than the default 12345.',true); pin=''; renderKeypad(); return; }
      pendingPin=value;
      showAccess(flow === 'setup' ? 'confirm' : 'change-confirm');
      return;
    }
    if (flow === 'confirm' || flow === 'change-confirm') {
      if (value !== pendingPin) { pendingPin=''; showAccess(flow === 'confirm' ? 'setup' : 'change-new'); setMessage('PINs did not match. Please enter a new PIN again.',true); return; }
      const next=await makeConfig(value);
      if (!saveConfig(next)) { setMessage('Could not save this PIN. Check browser storage.',true); return; }
      if (flow === 'confirm') { openVault(); }
      else { setCopy('PIN UPDATED','SECURITY UPDATED','Your account now has its own vault PIN.'); overlay.querySelector('#vaultAccess').hidden=true; setTimeout(()=>{overlay.classList.remove('visible');setTimeout(()=>{overlay.remove();overlay=null;button.focus();},550)},900); }
      return;
    }
    if (flow === 'change-current') {
      if (await verify(value)) { resetAttempts(); showAccess('change-new'); setMessage('Current PIN verified.'); }
      else { await recordFailure(); }
    }
  };
  const startChange = () => {
    pendingPin='';
    showAccess('change-current');
  };
  const startLock = () => {
    if (overlay) return;
    ensureConfig();
    busy=false; pin=''; flow='unlock';
    ({ failures, blockedUntil } = readAttempts());
    if (blockedUntil && Date.now() >= blockedUntil) resetAttempts();
    makeOverlay();
  };
  button.addEventListener('click',startLock);

  const addSettingsPanel = () => {
    const root=document.getElementById('page');
    if (!root || document.getElementById('vaultSettingsPanel')) return;
    const panel=document.createElement('section');
    panel.id='vaultSettingsPanel';
    panel.className='vault-settings-panel';
    panel.innerHTML='<div><h3>VEYRA Lock Down</h3><p id="vaultSettingsStatus"></p></div><button type="button" id="vaultSettingsChange">Change vault PIN</button>';
    root.appendChild(panel);
    panel.querySelector('#vaultSettingsStatus').textContent=statusText() + ' · Each account has its own PIN.';
    panel.querySelector('#vaultSettingsChange').addEventListener('click',() => {
      ensureConfig();
      makeOverlay('change-current');
    });
  };
  if (typeof render === 'function') {
    const originalRender=render;
    render=function(...args){ const result=originalRender.apply(this,args); if (typeof current!=='undefined' && current==='settings') addSettingsPanel(); return result; };
    if (typeof current!=='undefined' && current==='settings') addSettingsPanel();
  }
  ensureConfig();
  const updateStatus = () => {
    const el=document.getElementById('vaultSettingsStatus');
    if (el) el.textContent=statusText() + ' · Each account has its own PIN.';
  };
  updateStatus();
  window.addEventListener('storage',e=>{ if (e.key && e.key.endsWith('vaultSettings')) { ensureConfig(); updateStatus(); }});
})();
