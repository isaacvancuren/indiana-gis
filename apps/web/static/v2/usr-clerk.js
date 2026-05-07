/* Mapnova Clerk Auth — additive integration.
 *
 * Loads the Clerk JS SDK via CDN (auto-derived from the publishable key),
 * mounts a small sign-in / profile widget in the top-right corner, and
 * exposes a global API consumed by future code:
 *
 *   window.MNClerk.ready          // Promise<Clerk>, resolves when SDK loaded
 *   window.MNClerk.getToken()     // Promise<string|null>, current JWT
 *   window.MNClerk.getUser()      // Clerk user object or null
 *   window.MNClerk.isSignedIn()   // boolean
 *   window.MNClerk.signIn()       // opens Clerk's sign-in modal
 *   window.MNClerk.signOut()      // signs out the current user
 *   window.MNClerk.onAuthChange(cb) // subscribes to Clerk auth state changes
 *
 *   window.mnAuthFetch(url, init) // fetch wrapper that attaches the JWT
 *                                 // as Authorization: Bearer for /api/* calls
 *
 * This file is ADDITIVE. It does NOT remove or modify the existing Supabase
 * auth integration. The two coexist temporarily so Clerk can be verified in
 * production before Supabase is removed in a follow-up PR.
 *
 * Loaded via <script src="static/v2/usr-clerk.js" defer> in index.html.
 */
(function(){
  if (window.MNClerk) return;

  var PUBLISHABLE_KEY = 'pk_test_Z29vZC13YWxydXMtNDIuY2xlcmsuYWNjb3VudHMuZGV2JA';

  // Clerk publishable keys are base64url-encoded "<frontend-api-domain>$".
  // Decode to get the frontend API domain so we can load the right SDK.
  function decodeFrontendApi(pk) {
    try {
      var b64 = pk.replace(/^pk_(test|live)_/, '');
      // base64url → base64
      b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var decoded = atob(b64);
      // Strip trailing '$' marker
      return decoded.replace(/\$$/, '');
    } catch (e) {
      console.error('[MNClerk] Failed to decode publishable key', e);
      return null;
    }
  }

  var frontendApi = decodeFrontendApi(PUBLISHABLE_KEY);
  if (!frontendApi) {
    console.error('[MNClerk] Could not derive frontend API; aborting init');
    return;
  }

  var scriptUrl = 'https://' + frontendApi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
  var resolveReady;
  var readyPromise = new Promise(function(resolve){ resolveReady = resolve; });
  var loadFailed = false;

  function loadClerkScript() {
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-clerk-publishable-key', PUBLISHABLE_KEY);
    s.src = scriptUrl;
    s.onerror = function() {
      loadFailed = true;
      console.error('[MNClerk] Failed to load Clerk SDK from ' + scriptUrl);
    };
    s.onload = function() {
      if (!window.Clerk) {
        console.error('[MNClerk] Clerk SDK loaded but window.Clerk is undefined');
        return;
      }
      window.Clerk.load().then(function() {
        var u = window.Clerk.user;
        console.log('[MNClerk] SDK loaded. signedIn=' + !!u + (u ? ' user=' + u.id : ''));
        resolveReady(window.Clerk);
        mountWidget(window.Clerk);
        // Subscribe globally so other code can listen via MNClerk.onAuthChange
        window.Clerk.addListener(function(payload) {
          window.dispatchEvent(new CustomEvent('mnClerkAuthChange', { detail: payload }));
        });
      }).catch(function(err) {
        console.error('[MNClerk] Clerk.load() rejected:', err);
      });
    };
    document.head.appendChild(s);
  }

  function mountWidget(Clerk) {
    if (document.getElementById('mn2-clerk-widget')) return;
    var w = document.createElement('div');
    w.id = 'mn2-clerk-widget';
    w.style.cssText = [
      'position:fixed', 'top:10px', 'right:10px', 'z-index:9999',
      'background:rgba(14,20,32,0.92)', 'border:1px solid #1a2d40',
      'border-radius:6px', 'padding:6px 10px',
      'font:12px -apple-system,system-ui,sans-serif', 'color:#dde4f0',
      'display:flex', 'align-items:center', 'gap:8px',
      'backdrop-filter:blur(6px)', '-webkit-backdrop-filter:blur(6px)',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
    ].join(';');
    document.body.appendChild(w);

    function render() {
      if (Clerk.user) {
        var u = Clerk.user;
        var name = u.firstName || (u.primaryEmailAddress && u.primaryEmailAddress.emailAddress) || 'Signed in';
        w.innerHTML =
          '<span style="opacity:.7">Hi,</span>' +
          '<strong>' + escapeHtml(String(name)) + '</strong>' +
          '<button id="mn2-clerk-signout" type="button" style="background:transparent;border:1px solid #334;color:#dde4f0;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;">Sign out</button>';
        var btn = document.getElementById('mn2-clerk-signout');
        if (btn) btn.onclick = function(){ Clerk.signOut(); };
      } else {
        w.innerHTML =
          '<button id="mn2-clerk-signin" type="button" style="background:#1d4ed8;border:none;color:#fff;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;">Sign in</button>';
        var btn2 = document.getElementById('mn2-clerk-signin');
        if (btn2) btn2.onclick = function(){ Clerk.openSignIn(); };
      }
    }
    render();
    Clerk.addListener(render);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Public API — exposed even before SDK loads, so consumer code can await
  // MNClerk.ready before calling getToken etc.
  window.MNClerk = {
    ready: readyPromise,

    getToken: function() {
      return readyPromise.then(function(Clerk){
        if (!Clerk.session) return null;
        return Clerk.session.getToken();
      });
    },

    getUser: function() {
      return window.Clerk ? window.Clerk.user : null;
    },

    isSignedIn: function() {
      return !!(window.Clerk && window.Clerk.user);
    },

    signIn: function() {
      readyPromise.then(function(Clerk){ Clerk.openSignIn(); });
    },

    signOut: function() {
      readyPromise.then(function(Clerk){ Clerk.signOut(); });
    },

    onAuthChange: function(cb) {
      window.addEventListener('mnClerkAuthChange', function(ev){ cb(ev.detail); });
    },

    isLoadFailed: function() { return loadFailed; },
  };

  // Auth-aware fetch helper. Adds Authorization: Bearer <jwt> for /api/*
  // calls. For non-/api/* calls or when not signed in, behaves as plain fetch.
  window.mnAuthFetch = async function(url, init) {
    init = init || {};
    init.headers = Object.assign({}, init.headers || {});
    try {
      // Only attach for our own /api/* endpoints
      var isApi = false;
      try {
        var u = new URL(url, window.location.origin);
        isApi = u.pathname.indexOf('/api/') === 0;
      } catch (_) {
        isApi = String(url).indexOf('/api/') === 0;
      }
      if (isApi) {
        var token = await window.MNClerk.getToken();
        if (token) init.headers['Authorization'] = 'Bearer ' + token;
      }
    } catch (e) {
      // If token retrieval fails, fall through with no auth header — server
      // will return 401 which the caller should handle.
      console.warn('[MNClerk] mnAuthFetch token fetch failed:', e);
    }
    return fetch(url, init);
  };

  loadClerkScript();
})();
