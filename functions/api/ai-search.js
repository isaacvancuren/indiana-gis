// Cloudflare Pages Function: AI-backed parcel search.
// POST /api/ai-search  { query, county_fips, county_name, state }
// Calls Anthropic API (claude-sonnet-4-5) to translate natural language into
// a structured IGIO filter, runs the query server-side, returns results.
// ANTHROPIC_API_KEY is read from Cloudflare Pages env — never exposed to browser.

const IGIO_URL = 'https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer/0/query';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Tool schema sent to Claude — defines the structured filter it must return.
const BUILD_FILTER_TOOL = {
  name: 'build_parcel_filter',
  description: "Translate a natural-language parcel search query into a structured filter for the Indiana GIS (IGIO) statewide parcel database. Always call this tool; never reply with plain text.",
  input_schema: {
    type: 'object',
    properties: {
      acres_min: {
        type: 'number',
        description: 'Minimum parcel size in acres (inclusive). Omit if not constrained.',
      },
      acres_max: {
        type: 'number',
        description: 'Maximum parcel size in acres (inclusive). Omit if not constrained.',
      },
      prop_class_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'DLGF property class codes to include. Values: "100" Residential, "101" Single-Family Residential, "102" Mobile Home, "200" Agricultural, "201" AG Land, "202" AG Improvement, "300" Industrial, "400" Commercial, "500" Utilities, "600" Exempt, "700" Vacant Land. Omit to match all classes.',
      },
      address_substring: {
        type: 'string',
        description: 'Case-insensitive substring matched against the property street address (prop_add). Omit if not filtering by street.',
      },
      city_substring: {
        type: 'string',
        description: 'Case-insensitive substring matched against the property city (prop_city). Omit if not filtering by city.',
      },
      zip: {
        type: 'string',
        description: '5-digit ZIP code to filter by. Omit if not filtering by ZIP.',
      },
      vacant_only: {
        type: 'boolean',
        description: 'If true, restrict to vacant land (class 700). Takes precedence over prop_class_codes.',
      },
      reasoning: {
        type: 'string',
        description: 'Short human-readable summary of what the filter returns, e.g. "Vacant lots between 2–5 acres in Hamilton County". Under 120 characters.',
      },
    },
    required: ['reasoning'],
  },
};

// Map DLGF codes to labels — mirrors getPropClass() in index.html
function propClassLabel(code) {
  const MAP = {
    '100': 'Residential', '101': 'Single-Family Residential', '102': 'Mobile Home',
    '200': 'Agricultural', '201': 'AG Land', '202': 'AG Improvement',
    '300': 'Industrial', '400': 'Commercial', '500': 'Utilities',
    '600': 'Exempt', '700': 'Vacant Land',
  };
  const k = String(code || '').trim();
  return MAP[k] || (k ? `Class ${k}` : 'Unknown');
}

// Build ArcGIS SQL where clause from the structured filter
function buildWhere(filter, countyFips) {
  const parts = [];

  if (countyFips) {
    const n = parseInt(countyFips, 10);
    if (!isNaN(n)) parts.push(`county_fips=${n}`);
  }

  if (filter.vacant_only) {
    parts.push(`dlgf_prop_class_code='700'`);
  } else if (filter.prop_class_codes && filter.prop_class_codes.length > 0) {
    const codes = filter.prop_class_codes
      .map(c => `'${String(c).replace(/'/g, "''")}'`)
      .join(',');
    parts.push(`dlgf_prop_class_code IN (${codes})`);
  }

  if (filter.acres_min != null) parts.push(`legal_acreage>=${filter.acres_min}`);
  if (filter.acres_max != null) parts.push(`legal_acreage<=${filter.acres_max}`);

  if (filter.address_substring) {
    const s = filter.address_substring.replace(/'/g, "''").toUpperCase();
    parts.push(`UPPER(prop_add) LIKE '%${s}%'`);
  }

  if (filter.city_substring) {
    const s = filter.city_substring.replace(/'/g, "''").toUpperCase();
    parts.push(`UPPER(prop_city) LIKE '%${s}%'`);
  }

  if (filter.zip) {
    const z = filter.zip.replace(/'/g, "''");
    parts.push(`prop_zip='${z}'`);
  }

  return parts.length ? parts.join(' AND ') : '1=1';
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ error: 'Invalid JSON body' }, 400);
  }

  const { query, county_fips, county_name, state = 'IN' } = body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return jsonResp({ error: 'query is required' }, 400);
  }
  if (query.length > 500) {
    return jsonResp({ error: 'query exceeds 500-character limit' }, 400);
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResp(
      { error: 'Service not configured', detail: 'ANTHROPIC_API_KEY not set in Cloudflare Pages environment variables' },
      502,
    );
  }

  const geoCtx = [county_name, state].filter(Boolean).join(', ') || 'Indiana';
  const systemPrompt = `You are a GIS analyst assistant for the Mapnova Indiana parcel search tool.
The user will describe parcels they are looking for in natural language. Translate that description into a structured database filter by calling the build_parcel_filter tool.

Geographic context: The search is scoped to ${geoCtx}.

Available IGIO statewide parcel fields:
- prop_add: property street address (e.g. "123 MAIN ST")
- prop_city: city of the property
- prop_zip: 5-digit ZIP code
- dlgf_prop_class_code: Indiana DLGF property class (see tool schema for full list)
- legal_acreage: parcel size in decimal acres

DLGF property class codes:
  100 = Residential (general)   101 = Single-Family Residential
  102 = Mobile Home             200 = Agricultural (general)
  201 = AG Land (bare farmland) 202 = AG Improvement (farm + structures)
  300 = Industrial              400 = Commercial
  500 = Utilities               600 = Exempt (government/nonprofit)
  700 = Vacant Land

Rules:
- Always call build_parcel_filter — never reply with plain text.
- Prefer broader filters over narrow ones that risk returning 0 results.
- If the user asks for "vacant lots", use vacant_only=true.
- If acreage is mentioned ("5 acres", "under 2 acres"), set acres_min / acres_max accordingly.
- The reasoning field must be a short, human-readable description of the result set.`;

  let anthropicResp;
  try {
    anthropicResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: systemPrompt,
        tools: [BUILD_FILTER_TOOL],
        tool_choice: { type: 'tool', name: 'build_parcel_filter' },
        messages: [{ role: 'user', content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    return jsonResp({ error: 'Anthropic API unreachable', detail: String(err) }, 502);
  }

  if (!anthropicResp.ok) {
    const detail = await anthropicResp.text().catch(() => `HTTP ${anthropicResp.status}`);
    return jsonResp({ error: 'Anthropic API error', detail }, 502);
  }

  let anthropicJson;
  try {
    anthropicJson = await anthropicResp.json();
  } catch {
    return jsonResp({ error: 'Failed to parse Anthropic response' }, 502);
  }

  const toolUse = (anthropicJson.content || []).find(
    b => b.type === 'tool_use' && b.name === 'build_parcel_filter',
  );
  if (!toolUse) {
    return jsonResp(
      { error: 'LLM did not return a filter', detail: 'No build_parcel_filter call in response' },
      502,
    );
  }

  const filter = toolUse.input || {};
  const reasoning = String(filter.reasoning || 'Matching parcels');
  const where = buildWhere(filter, county_fips);

  const igioParams = new URLSearchParams({
    where,
    outFields: 'parcel_id,state_parcel_id,prop_add,prop_city,prop_zip,dlgf_prop_class_code,legal_acreage,latitude,longitude',
    returnGeometry: 'false',
    resultRecordCount: '200',
    f: 'json',
  });

  let igioResp;
  try {
    igioResp = await fetch(`${IGIO_URL}?${igioParams}`, {
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    return jsonResp({ error: 'IGIO query failed', detail: String(err) }, 502);
  }

  if (!igioResp.ok) {
    return jsonResp({ error: 'IGIO service error', detail: `HTTP ${igioResp.status}` }, 502);
  }

  let igioJson;
  try {
    igioJson = await igioResp.json();
  } catch {
    return jsonResp({ error: 'Failed to parse IGIO response' }, 502);
  }

  if (igioJson.error) {
    return jsonResp(
      { error: 'IGIO query error', detail: igioJson.error.message || JSON.stringify(igioJson.error) },
      502,
    );
  }

  const parcels = (igioJson.features || []).map(f => {
    const a = f.attributes || {};
    return {
      pid:   a.parcel_id || a.state_parcel_id || '',
      id:    a.parcel_id || a.state_parcel_id || '',
      addr:  a.prop_add  || '',
      city:  a.prop_city || '',
      zip:   a.prop_zip  || '',
      use:   propClassLabel(a.dlgf_prop_class_code),
      acres: a.legal_acreage != null ? parseFloat(a.legal_acreage).toFixed(3) : null,
      lat:   parseFloat(a.latitude)  || 0,
      lon:   parseFloat(a.longitude) || 0,
    };
  });

  return jsonResp({ filter, parcels, reasoning });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
