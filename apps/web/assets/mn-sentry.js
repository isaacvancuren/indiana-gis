(function () {
  var dsn = window.__SENTRY_DSN;
  if (!dsn) return;

  var script = document.createElement('script');
  script.crossOrigin = 'anonymous';
  script.src = 'https://browser.sentry-cdn.com/8.37.1/bundle.tracing.replay.min.js';
  script.onload = initSentry;
  document.head.appendChild(script);

  function initSentry() {
    Sentry.init({
      dsn: dsn,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.1,
      integrations: [Sentry.replayIntegration()],
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    });
  }

  var EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  // Strip serialized parcel owner name fields from stringified API responses
  var OWNER_FIELD_RE = /"(?:OWNER_NAME|OWNERNME1|OWNERNME2|owner_name|ownernme1|ownernme2)":\s*"[^"]*"/g;

  function scrubStr(s) {
    if (typeof s !== 'string') return s;
    return s
      .replace(EMAIL_RE, '[email]')
      .replace(OWNER_FIELD_RE, function (m) {
        return m.replace(/"[^"]*"$/, '"[owner]"');
      });
  }

  function scrubEvent(event) {
    if (event.message) event.message = scrubStr(event.message);
    var exs = event.exception && event.exception.values;
    if (exs) {
      exs.forEach(function (ex) {
        if (ex.value) ex.value = scrubStr(ex.value);
      });
    }
    return event;
  }

  function scrubBreadcrumb(breadcrumb) {
    if (breadcrumb.message) breadcrumb.message = scrubStr(breadcrumb.message);
    if (breadcrumb.data && breadcrumb.data.url) {
      breadcrumb.data.url = scrubStr(breadcrumb.data.url);
    }
    return breadcrumb;
  }
})();
