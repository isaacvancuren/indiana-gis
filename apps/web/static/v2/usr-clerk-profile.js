/* Mapnova Custom Profile — extends Clerk's user with mapnova-specific fields.
 *
 * Adds an "Edit profile" entry that opens a modal with these custom fields:
 *   - Display name (overrides Clerk's first/last for in-app display)
 *   - Company / Organization
 *   - Job title
 *   - Phone number
 *   - Bio / about
 *
 * Persists via Clerk.user.update({ unsafeMetadata: { ... } }).
 * unsafeMetadata is the public-readable, frontend-writable metadata bucket
 * Clerk provides for app-specific user data. Survives across sessions and
 * devices. Available on test (pk_test_*) and production (pk_live_*) keys
 * with no dashboard configuration required.
 *
 * Mounted as a small "Edit profile" button next to the Clerk UserButton
 * (since Clerk's UserButton menu can't be customized from the SDK without
 * Clerk's "Custom Pages" feature which requires Production instance + a
 * separate dashboard config step).
 *
 * Loaded via <script src="static/v2/usr-clerk-profile.js" defer> in index.html.
 */
(function(){
  'use strict';
  if (window.MNClerkProfile) return;

  // ─── DOM helpers ────────────────────────────────────────────────────────────
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k){
        if (k === 'style') n.style.cssText = attrs[k];
        else if (k === 'onclick') n.onclick = attrs[k];
        else if (k === 'oninput') n.oninput = attrs[k];
        else if (k === 'class') n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function(c){
      if (typeof c === 'string') n.appendChild(document.createTextNode(c));
      else if (c) n.appendChild(c);
    });
    return n;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ─── Profile shape ──────────────────────────────────────────────────────────
  // All fields stored in Clerk.user.unsafeMetadata.profile.
  var FIELDS = [
    { key: 'displayName', label: 'Display name', placeholder: 'How others see your name' },
    { key: 'company',     label: 'Company / Organization', placeholder: 'Acme Realty' },
    { key: 'title',       label: 'Title', placeholder: 'Land Surveyor, Realtor, etc.' },
    { key: 'phone',       label: 'Phone', placeholder: '+1 (555) 555-1212', type: 'tel' },
    { key: 'bio',         label: 'Bio', placeholder: 'A short description of yourself or your work', textarea: true },
  ];

  function readProfile(user) {
    var meta = (user && user.unsafeMetadata) || {};
    var p = meta.profile || {};
    return FIELDS.reduce(function(acc, f){ acc[f.key] = p[f.key] || ''; return acc; }, {});
  }

  async function saveProfile(user, values) {
    var existingMeta = (user && user.unsafeMetadata) || {};
    return user.update({
      unsafeMetadata: Object.assign({}, existingMeta, { profile: values }),
    });
  }

  // ─── Modal ──────────────────────────────────────────────────────────────────
  function openModal() {
    if (!window.Clerk || !window.Clerk.user) {
      alert('Please sign in first.');
      return;
    }
    if (document.getElementById('mn2-profile-modal')) return;
    var user = window.Clerk.user;
    var initial = readProfile(user);

    var backdrop = el('div', {
      id: 'mn2-profile-modal',
      style: [
        'position:fixed','inset:0','background:rgba(0,0,0,0.7)',
        'z-index:99999','display:flex','align-items:center','justify-content:center',
        'backdrop-filter:blur(4px)','-webkit-backdrop-filter:blur(4px)',
        'font:14px -apple-system,system-ui,sans-serif','color:#dde4f0',
      ].join(';'),
    });

    var panel = el('div', {
      style: [
        'background:#0e1420','border:1px solid #1a2d40','border-radius:10px',
        'padding:20px 24px','width:min(480px,calc(100vw - 32px))',
        'max-height:calc(100vh - 64px)','overflow-y:auto',
        'box-shadow:0 12px 32px rgba(0,0,0,0.5)',
      ].join(';'),
    });

    var header = el('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;',
    });
    header.appendChild(el('h2', { style: 'font:600 18px sans-serif;margin:0;color:#fff' }, ['Profile']));
    var closeBtn = el('button', {
      type: 'button',
      style: 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font:18px sans-serif;padding:4px 10px;border-radius:4px;',
      onclick: function(){ document.body.removeChild(backdrop); },
    }, ['×']);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    panel.appendChild(el('div', {
      style: 'opacity:.6;font-size:12px;margin-bottom:16px;',
    }, ['Saved to your account. Visible only to you in-app for now.']));

    var form = el('div', { style: 'display:flex;flex-direction:column;gap:14px;' });
    var inputs = {};

    FIELDS.forEach(function(f){
      var row = el('div', { style: 'display:flex;flex-direction:column;gap:5px;' });
      row.appendChild(el('label', {
        style: 'font:500 12px sans-serif;color:#94a3b8;letter-spacing:.3px',
      }, [f.label]));
      var input;
      if (f.textarea) {
        input = el('textarea', {
          rows: '3',
          placeholder: f.placeholder || '',
          style: 'background:#172030;border:1px solid #1a2d40;color:#dde4f0;border-radius:5px;padding:8px 10px;font:13px sans-serif;resize:vertical;min-height:60px;',
        });
        input.value = initial[f.key];
      } else {
        input = el('input', {
          type: f.type || 'text',
          placeholder: f.placeholder || '',
          value: initial[f.key],
          style: 'background:#172030;border:1px solid #1a2d40;color:#dde4f0;border-radius:5px;padding:8px 10px;font:13px sans-serif;',
        });
      }
      inputs[f.key] = input;
      row.appendChild(input);
      form.appendChild(row);
    });

    panel.appendChild(form);

    // Status line + buttons
    var status = el('div', {
      id: 'mn2-profile-status',
      style: 'min-height:18px;margin:14px 0 6px;font-size:12px;color:#94a3b8;',
    });
    panel.appendChild(status);

    var actions = el('div', {
      style: 'display:flex;gap:8px;justify-content:flex-end;',
    });
    var cancelBtn = el('button', {
      type: 'button',
      style: 'background:transparent;border:1px solid #334;color:#dde4f0;padding:8px 16px;border-radius:5px;cursor:pointer;font:500 13px sans-serif;',
      onclick: function(){ document.body.removeChild(backdrop); },
    }, ['Cancel']);
    var saveBtn = el('button', {
      type: 'button',
      style: 'background:#1d4ed8;border:none;color:#fff;padding:8px 18px;border-radius:5px;cursor:pointer;font:500 13px sans-serif;',
      onclick: async function(){
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        status.textContent = '';
        status.style.color = '#94a3b8';
        var values = {};
        FIELDS.forEach(function(f){ values[f.key] = (inputs[f.key].value || '').trim(); });
        try {
          await saveProfile(window.Clerk.user, values);
          status.textContent = 'Saved.';
          status.style.color = '#22c55e';
          // Update the visible name in the widget if displayName changed
          window.dispatchEvent(new CustomEvent('mnClerkProfileSaved', { detail: values }));
          setTimeout(function(){
            try { document.body.removeChild(backdrop); } catch(_e){}
          }, 600);
        } catch (err) {
          console.error('[MNClerkProfile] save failed:', err);
          status.textContent = 'Save failed: ' + (err && err.message ? err.message : 'unknown');
          status.style.color = '#ef4444';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      },
    }, ['Save']);
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    panel.appendChild(actions);

    backdrop.appendChild(panel);
    backdrop.addEventListener('click', function(ev){
      if (ev.target === backdrop) document.body.removeChild(backdrop);
    });
    document.body.appendChild(backdrop);

    // Focus the first input
    setTimeout(function(){ try { inputs.displayName.focus(); } catch(_e){} }, 50);
  }

  // ─── Edit profile button next to the Clerk widget ───────────────────────────
  function mountEditButton() {
    if (document.getElementById('mn2-edit-profile-btn')) return;
    var widget = document.getElementById('mn2-clerk-widget');
    if (!widget) return; // Will be retried by the interval below

    var btn = el('button', {
      id: 'mn2-edit-profile-btn',
      type: 'button',
      title: 'Edit profile',
      style: [
        'background:rgba(14,20,32,0.9)','border:1px solid #1a2d40','color:#dde4f0',
        'padding:6px 10px','border-radius:6px','cursor:pointer',
        'font:500 12px -apple-system,system-ui,sans-serif',
        'display:none',  // shown only when signed in
        'align-items:center','gap:6px','height:36px',
      ].join(';'),
      onclick: openModal,
    }, ['⚙ Profile']);
    // Insert as the FIRST child so it sits left of the name+avatar
    widget.insertBefore(btn, widget.firstChild);

    function updateVisibility() {
      var signedIn = window.MNClerk && window.MNClerk.isSignedIn && window.MNClerk.isSignedIn();
      btn.style.display = signedIn ? 'inline-flex' : 'none';
    }
    if (window.MNClerk && window.MNClerk.onAuthChange) {
      window.MNClerk.onAuthChange(updateVisibility);
    }
    setInterval(updateVisibility, 1000);
    updateVisibility();
  }

  // Boot once Clerk widget is in the DOM.
  function boot() {
    var tries = 0;
    var t = setInterval(function(){
      tries++;
      if (document.getElementById('mn2-clerk-widget')) {
        clearInterval(t);
        mountEditButton();
        console.log('[MNClerkProfile] mounted');
      } else if (tries > 200) {
        clearInterval(t);
        console.warn('[MNClerkProfile] Clerk widget never appeared; profile button disabled');
      }
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // Public API
  window.MNClerkProfile = {
    open: openModal,
    read: function(){ return readProfile(window.Clerk && window.Clerk.user); },
    save: function(values){ return saveProfile(window.Clerk.user, values); },
  };
})();
