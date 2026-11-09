'use strict';
(() => {
  const button = document.getElementById('topLockdown');
  if (!button || !window.crypto?.subtle || typeof veyraAuthClient === 'undefined') return;

  const PIN_LENGTH = 5;
  let overlay = null;
  let pin = '';
  let flow = 'unlock';
  let pendingPin = '';
  let pendingCurrentPin = '';
  let busy = false;
  let serverStatus = null;
  const accountScope = () => localStorage.getItem('veyra-active-user') || 'legacy';
  const configKey = () => 'veyra-' + (accountScope() === 'legacy' ? 'legacy-' : 'user-' + accountScope() + '-') + 'vaultSettings';
  const readLegacyConfig = () => {
    try {
      const value = JSON.parse(localStorage.getItem(configKey()) || 'null');
      return value && value.version === 1 && typeof value.salt === 'string' && typeof value.hash === 'string' ? value : null;
    } catch { return null; }
  };
  const api = async (action, extra = {}) => {
    const { data, error } = await veyraAuthClient.functions.invoke('veyra-vault-security', { body: { action, ...extra } });
    if (error) throw new Error(error.message || 'Secure vault service is unavailable.');
    if (data?.error) throw new Error(data.error);
    return data;
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const doorSvg = '<div class="vault-halo" aria-hidden="true"></div><div class="vault-door" aria-hidden="true"><span class="vault-bolt b1"></span><span class="vault-bolt b2"></span><span class="vault-bolt b3"></span><span class="vault-bolt b4"></span><span class="vault-bolt b5"></span><span class="vault-bolt b6"></span><span class="vault-bolt b7"></span><span class="vault-bolt b8"></span><span class="vault-wheel"></span><span class="vault-door-label">VEYRA SECURE ACCESS</span></div>';

  const makeOverlay = () => {
    if (overlay) return;
    overlay = document.createElement('section');
    overlay.className = 'vault-overlay is-closing';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'VEYRA Lock Down vault access');
    overlay.innerHTML = '<div class="vault-shell"><div class="vault-brand">VEYRA · SECURITY SYSTEM</div><div class="vault-scene">' + doorSvg + '</div><div class="vault-status" id="vaultStatus">SECURING WORKSPACE</div><h1 class="vault-title" id="vaultTitle">LOCKING DOWN</h1><p class="vault-subtitle" id="vaultSubtitle">Checking your secure vault settings.</p><div class="vault-access" id="vaultAccess" hidden><div class="vault-dots" id="vaultDots" aria-label="PIN entry, five digits"></div><div class="vault-keypad" id="vaultKeypad"></div><div class="vault-message" id="vaultMessage" aria-live="polite"></div><div class="vault-reauth" id="vaultReauth" hidden><label for="vaultAccountPassword">VEYRA account password</label><input id="vaultAccountPassword" type="password" autocomplete="current-password" maxlength="256" placeholder="Enter your account password"><button id="vaultReauthSubmit" type="button">Verify &amp; Unlock</button></div><button class="vault-change-btn" id="vaultChange" type="button" hidden>Change vault PIN</button></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      const key = e.target.closest('[data-vault-key]');
      if (key) { e.preventDefault(); pressKey(key.dataset.vaultKey); }
    });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') e.preventDefault();
      if (/^\\d$/.test(e.key) && !e.target.matches('input')) pressKey(e.key);
      else if (e.key === 'Backspace' && !e.target.matches('input')) pressKey('back');
      else if (e.key === 'Enter' && !e.target.matches('input')) pressKey('enter');
    });
    overlay.querySelector('#vaultChange').addEventListener('click', startChange);
    overlay.querySelector('#vaultReauthSubmit').addEventListener('click', verifyAccountPassword);
    overlay.querySelector('#vaultAccountPassword').addEventListener('keydown', e => { if (e.key === 'Enter') verifyAccountPassword(); });
    requestAnimationFrame(() => overlay?.classList.add('visible'));
  };
  const setCopy = (status, title, subtitle) => {
    if (!overlay) return;
    overlay.querySelector('#vaultStatus').textContent = status;
    overlay.querySelector('#vaultTitle').textContent = title;
    overlay.querySelector('#vaultSubtitle').textContent = subtitle;
  };
  const setMessage = (text, isError = false) => {
    const el = overlay?.querySelector('#vaultMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'vault-message' + (isError ? ' error' : '');
  };
  const renderKeypad = () => {
    if (!overlay) return;
    const keypad = overlay.querySelector('#vaultKeypad');
    keypad.innerHTML = ['1','2','3','4','5','6','7','8','9','CLEAR','0','ENTER'].map(k =>
      '<button type="button" class="vault-key ' + (k === 'ENTER' ? 'enter' : k === 'CLEAR' ? 'utility' : '') + '" data-vault-key="' + (k === 'CLEAR' ? 'clear' : k === 'ENTER' ? 'enter' : k) + '">' + k + '</button>'
    ).join('');
    overlay.querySelector('#vaultDots').innerHTML = Array.from({length: PIN_LENGTH}, (_, i) => '<span class="vault-dot ' + (i < pin.length ? 'filled' : '') + '"></span>').join('');
  };
  const showAccess = mode => {
    if (!overlay) return;
    flow = mode;
    pin = '';
    overlay.classList.remove('is-closing', 'is-opening');
    overlay.querySelector('#vaultAccess').hidden = false;
    const reauth = mode === 'reauth';
    overlay.querySelector('#vaultDots').hidden = reauth;
    overlay.querySelector('#vaultKeypad').hidden = reauth;
    overlay.querySelector('#vaultReauth').hidden = !reauth;
    overlay.querySelector('#vaultChange').hidden = mode !== 'unlock';
    if (mode === 'unlock') setCopy('SYSTEM LOCKED', 'VAULT SEALED', 'Enter your five-digit vault PIN to return to your VEYRA workspace.');
    else if (mode === 'setup') setCopy('FIRST ACCESS', 'CREATE YOUR PIN', 'Choose a new five-digit PIN for this account. Your PIN is stored securely on the server.');
    else if (mode === 'confirm') setCopy('PIN SETUP', 'CONFIRM YOUR PIN', 'Enter the same five digits again to confirm your new PIN.');
    else if (mode === 'change-current') setCopy('SECURITY SETTINGS', 'VERIFY CURRENT PIN', 'Enter your current vault PIN before changing it.');
    else if (mode === 'change-new') setCopy('SECURITY SETTINGS', 'CREATE NEW PIN', 'Choose a new five-digit PIN. Do not use 12345.');
    else if (mode === 'change-confirm') setCopy('SECURITY SETTINGS', 'CONFIRM NEW PIN', 'Enter your new five-digit PIN again.');
    else if (mode === 'reauth') setCopy('ADDITIONAL VERIFICATION', 'ACCOUNT CHECK REQUIRED', 'Three incorrect PIN attempts. Verify your VEYRA account password to unlock.');
    else setCopy('SECURITY SERVICE', 'VAULT UNAVAILABLE', 'The secure vault could not be reached. Refresh and try again.');
    setMessage('');
    renderKeypad();
    if (reauth) overlay.querySelector('#vaultAccountPassword').focus();
    else overlay.querySelector('[data-vault-key="1"]')?.focus();
  };
  const openVault = () => {
    if (typeof go === 'function') go('home');
    overlay?.classList.add('is-opening');
    overlay?.classList.remove('is-closing');
    setCopy('ACCESS GRANTED', 'WELCOME BACK', 'Vault unlocked. Restoring your workspace…');
    overlay.querySelector('#vaultAccess').hidden = true;
    setTimeout(() => {
      overlay?.classList.remove('visible');
      setTimeout(() => { overlay?.remove(); overlay = null; button.focus(); }, 550);
    }, 1150);
  };
  const closeOverlay = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    button.focus();
  };
  const updateSecuritySettings = async () => {
    const status = document.getElementById('vaultSettingsStatus');
    if (!status) return;
    try {
      const data = await api('status');
      serverStatus = data;
      status.textContent = data.has_pin ? 'Server-stored PIN enabled · Account password recovery active' : 'Vault PIN setup required';
    } catch {
      status.textContent = 'Security service unavailable · Check your connection';
    }
  };
  const initializeVault = async () => {
    try {
      let data = await api('status');
      const legacy = readLegacyConfig();
      if (!data.has_pin && legacy) {
        await api('import_legacy_pin', { salt: legacy.salt, hash: legacy.hash });
        try { localStorage.removeItem(configKey()); if (typeof save === 'function') save('vaultSettings', null); } catch {}
        data = await api('status');
      }
      serverStatus = data;
      if (data.requires_reauth) showAccess('reauth');
      else if (!data.has_pin) showAccess('setup');
      else showAccess('unlock');
    } catch (error) {
      showAccess('service-error');
      setMessage(error.message || 'Secure vault service unavailable.', true);
    }
  };
  const pressKey = async key => {
    if (busy || !overlay) return;
    if (key === 'clear') { pin = ''; renderKeypad(); setMessage(''); return; }
    if (key === 'back') { pin = pin.slice(0, -1); renderKeypad(); return; }
    if (key === 'enter') {
      if (pin.length !== PIN_LENGTH) { setMessage('Enter all five digits.', true); return; }
      busy = true;
      try { await handlePin(pin); }
      catch (error) { setMessage(error.message || 'Could not verify the PIN. Please try again.', true); }
      finally { busy = false; }
      return;
    }
    if (!/^\\d$/.test(key) || pin.length >= PIN_LENGTH) return;
    pin += key;
    renderKeypad();
    if (pin.length === PIN_LENGTH) setMessage('Press ENTER to continue.');
  };
  const handlePin = async value => {
    if (flow === 'unlock') {
      const result = await api('verify_pin', { pin: value });
      if (result.ok) { openVault(); return; }
      if (result.requires_reauth) { showAccess('reauth'); return; }
      if (result.needs_setup) { showAccess('setup'); return; }
      pin = '';
      renderKeypad();
      setMessage('Incorrect PIN. ' + Math.max(0, 3 - (result.failed_attempts || 0)) + ' attempt' + ((result.failed_attempts || 0) === 2 ? '' : 's') + ' remaining.', true);
      return;
    }
    if (flow === 'setup' || flow === 'change-new') {
      if (value === '12345') { setMessage('Choose a PIN other than 12345.', true); pin = ''; renderKeypad(); return; }
      pendingPin = value;
      showAccess(flow === 'setup' ? 'confirm' : 'change-confirm');
      return;
    }
    if (flow === 'confirm') {
      if (value !== pendingPin) { pendingPin = ''; showAccess('setup'); setMessage('PINs did not match. Please try again.', true); return; }
      await api('set_pin', { pin: value });
      serverStatus = await api('status');
      openVault();
      return;
    }
    if (flow === 'change-current') {
      pendingCurrentPin = value;
      showAccess('change-new');
      return;
    }
    if (flow === 'change-confirm') {
      if (value !== pendingPin) { pendingPin = ''; pendingCurrentPin = ''; showAccess('change-current'); setMessage('PINs did not match. Start again.', true); return; }
      const result = await api('change_pin', { current_pin: pendingCurrentPin, new_pin: value });
      if (result.requires_reauth) { pendingCurrentPin = ''; pendingPin = ''; showAccess('reauth'); return; }
      pendingCurrentPin = '';
      pendingPin = '';
      serverStatus = await api('status');
      setCopy('PIN UPDATED', 'SECURITY UPDATED', 'Your new PIN is securely stored for this account.');
      overlay.querySelector('#vaultAccess').hidden = true;
      setTimeout(closeOverlay, 1000);
    }
  };
  const verifyAccountPassword = async () => {
    if (busy || !overlay) return;
    const input = overlay.querySelector('#vaultAccountPassword');
    const password = input.value;
    if (!password) { setMessage('Enter your VEYRA account password.', true); input.focus(); return; }
    busy = true;
    const submit = overlay.querySelector('#vaultReauthSubmit');
    submit.disabled = true;
    submit.textContent = 'Verifying…';
    try {
      await api('verify_password', { password });
      input.value = '';
      serverStatus = await api('status');
      openVault();
    } catch (error) {
      input.value = '';
      setMessage(error.message || 'Password verification failed. Try again.', true);
      input.focus();
    } finally {
      busy = false;
      if (submit.isConnected) { submit.disabled = false; submit.textContent = 'Verify & Unlock'; }
    }
  };
  const startChange = () => {
    pendingPin = '';
    pendingCurrentPin = '';
    showAccess('change-current');
  };
  const startLock = async () => {
    if (overlay) return;
    busy = false;
    pin = '';
    pendingPin = '';
    pendingCurrentPin = '';
    makeOverlay();
    setTimeout(initializeVault, 1350);
  };
  button.addEventListener('click', startLock);

  const addSettingsPanel = () => {
    const root = document.getElementById('page');
    if (!root || document.getElementById('vaultSettingsPanel')) return;
    const panel = document.createElement('section');
    panel.id = 'vaultSettingsPanel';
    panel.className = 'vault-settings-panel';
    panel.innerHTML = '<div class="vault-settings-copy"><h3>VEYRA Lock Down</h3><p id="vaultSettingsStatus">Checking secure vault status…</p></div><div class="vault-settings-actions"><button type="button" id="vaultSettingsChange">Change vault PIN</button><button type="button" id="vaultSecurityActivity">View security activity</button></div><div class="vault-event-list" id="vaultEventList" hidden></div>';
    root.appendChild(panel);
    updateSecuritySettings();
    panel.querySelector('#vaultSettingsChange').addEventListener('click', () => { startLock(); setTimeout(() => { if (overlay) startChange(); }, 1500); });
    panel.querySelector('#vaultSecurityActivity').addEventListener('click', async () => {
      const list = panel.querySelector('#vaultEventList');
      try {
        const data = await api('status');
        serverStatus = data;
        const labels = { pin_failed: 'Incorrect vault PIN', lockout_triggered: 'Account password required after failed attempts', password_reauthenticated: 'Account password verified', pin_unlocked: 'Vault unlocked with PIN', pin_changed: 'Vault PIN changed' };
        list.innerHTML = (data.events || []).length ? data.events.map(event => '<div class="vault-event"><span>' + escapeHtml(labels[event.event_type] || 'Security event') + '</span><time>' + escapeHtml(new Date(event.created_at).toLocaleString()) + '</time></div>').join('') : '<div class="vault-event-empty">No security activity recorded yet.</div>';
        list.hidden = false;
      } catch (error) {
        list.innerHTML = '<div class="vault-event-empty">' + escapeHtml(error.message) + '</div>';
        list.hidden = false;
      }
    });
  };
  if (typeof render === 'function') {
    const originalRender = render;
    render = function(...args) {
      const result = originalRender.apply(this, args);
      if (typeof current !== 'undefined' && current === 'settings') addSettingsPanel();
      return result;
    };
    if (typeof current !== 'undefined' && current === 'settings') addSettingsPanel();
  }
})();
