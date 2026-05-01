// Netlify Function: cors-proxy
// Replaces previous reliance on the public corsproxy.io service for the
// MapDotNet/WTH GIS identify endpoints. Strict allow-list ensures the proxy
// cannot be used to fetch arbitrary URLs.
//
// Usage: /.netlify/functions/cors-proxy?url=<encoded target>

const ALLOWED_HOST_SUFFIXES = [
  '.wthgis.com'
];

function isAllowed(host) {
  return ALLOWED_HOST_SUFFIXES.some(s => host.endsWith(s));
}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://mapnova.org',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  const target = event.queryStringParameters && event.queryStringParameters.url;
  if (!target) {
    return { statusCode: 400, headers, body: 'Missing url parameter' };
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch (e) {
    return { statusCode: 400, headers, body: 'Invalid url' };
  }
  if (parsed.protocol !== 'https:') {
    return { statusCode: 400, headers, body: 'Only https targets allowed' };
  }
  if (!isAllowed(parsed.hostname)) {
    return { statusCode: 403, headers, body: 'Host not in allow-list' };
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json,text/plain,*/*' },
      signal: AbortSignal.timeout(8000)
    });
    const body = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: {
        ...headers,
        'Content-Type': upstream.headers.get('content-type') || 'text/plain',
        'Cache-Control': 'public, max-age=60'
      },
      body
    };
  } catch (e) {
    return { statusCode: 502, headers, body: 'Upstream fetch failed: ' + (e.message || 'unknown') };
  }
};
