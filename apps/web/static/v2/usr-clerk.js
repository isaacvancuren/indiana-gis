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
      // Configure Clerk to land users back in-app immediately after auth.
      // Without these, OAuth (Google/Microsoft) flows go:
      //   user → /sso-callback → Clerk Account Portal "completing…" → app
      // The middle step is the "secondary screen" the user complained about.
      // Setting all the redirect URLs to '/' skips the Account Portal entirely.
      window.Clerk.load({
        signInUrl: '/',
        signUpUrl: '/',
        afterSignInUrl: '/',
        afterSignUpUrl: '/',
        signInForceRedirectUrl: '/',
        signUpForceRedirectUrl: '/',
      }).then(function() {
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

  function fullName(u) {
    if (!u) return '';
    // Prefer Clerk.user.fullName (concatenated first+last from OAuth).
    // Fall back to firstName + lastName, then to primary email's local part.
    if (u.fullName) return u.fullName;
    var parts = [];
    if (u.firstName) parts.push(u.firstName);
    if (u.lastName) parts.push(u.lastName);
    if (parts.length) return parts.join(' ');
    var email = u.primaryEmailAddress && u.primaryEmailAddress.emailAddress;
    if (email) {
      var local = email.split('@')[0];
      // Title-case "isaacv" → "Isaacv"; better than the raw email handle
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return 'Signed in';
  }

  function mountWidget(Clerk) {
    if (document.getElementById('mn2-clerk-widget')) return;
    var w = document.createElement('div');
    w.id = 'mn2-clerk-widget';
    // Top-right; aligned with the existing header action group (Print /
    // Export / Share / Analytics). Vertically centered, properly padded so
    // the avatar circle sits cleanly in the corner.
    w.style.cssText = [
      'position:fixed', 'top:12px', 'right:18px', 'z-index:9999',
      'display:flex', 'align-items:center', 'gap:10px',
      'pointer-events:auto',
      'height:40px',  // Fixed height matches header buttons; avatar centers within
    ].join(';');
    document.body.appendChild(w);

    function render() {
      // Clear and re-render based on auth state
      while (w.firstChild) w.removeChild(w.firstChild);

      if (Clerk.user) {
        // Full name beside the avatar.
        var nameEl = document.createElement('span');
        nameEl.id = 'mn2-clerk-name';
        nameEl.textContent = fullName(Clerk.user);
        nameEl.style.cssText = 'color:#dde4f0;font:500 13px -apple-system,system-ui,sans-serif;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.5);';
        w.appendChild(nameEl);

        // Use Clerk's prebuilt UserButton — gives the standard avatar UX:
        // click avatar → menu opens with profile + sign out + manage account.
        // Keeps sign-out behind a click instead of always showing a button.
        if (typeof Clerk.mountUserButton === 'function') {
          var slot = document.createElement('div');
          slot.id = 'mn2-clerk-userbutton';
          // The slot is a flex item; make it a square so the avatar centers.
          slot.style.cssText = 'display:flex;align-items:center;justify-content:center;width:36px;height:36px;';
          w.appendChild(slot);
          Clerk.mountUserButton(slot, {
            afterSignOutUrl: window.location.origin,
            appearance: {
              elements: {
                userButtonAvatarBox: 'width:36px;height:36px;',
                rootBox: 'display:flex;align-items:center;',
              },
            },
          });
        } else {
          // Fallback initials avatar
          var initials = (function(){
            var n = fullName(Clerk.user) || 'U';
            var bits = n.split(/\s+/).filter(Boolean).slice(0, 2);
            return bits.map(function(s){ return s.charAt(0).toUpperCase(); }).join('') || 'U';
          })();
          var fallback = document.createElement('div');
          fallback.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#1d4ed8;color:#fff;font:600 14px sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer;';
          fallback.textContent = initials;
          fallback.title = 'Click to manage account';
          w.appendChild(fallback);
        }
      } else {
        // Sign-in button for unauth state
        var btn = document.createElement('button');
        btn.id = 'mn2-clerk-signin';
        btn.type = 'button';
        btn.textContent = 'Sign in';
        btn.style.cssText = 'background:#1d4ed8;border:none;color:#fff;padding:6px 16px;border-radius:6px;cursor:pointer;font:500 12px sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.3)';
        btn.onclick = function(){
          Clerk.openSignIn({
            afterSignInUrl: '/',
            afterSignUpUrl: '/',
            redirectUrl: '/',
          });
        };
        w.appendChild(btn);
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
      readyPromise.then(function(Clerk){
        // Open as MODAL with explicit redirect URLs so OAuth lands directly
        // back on mapnova.org instead of bouncing through Clerk's hosted
        // Account Portal "completing sign-in…" interstitial page.
        Clerk.openSignIn({
          afterSignInUrl: '/',
          afterSignUpUrl: '/',
          redirectUrl: '/',
        });
      });
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
