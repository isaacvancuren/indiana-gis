#!/usr/bin/env node
/**
 * scripts/discover_counties.js
 * Calls api.mapnova.org/api/discover/county/:slug for all 92 Indiana counties,
 * cross-checks against existing curated entries, and writes new discoveries to
 * apps/web/assets/county-gis-servers.js.
 *
 * Usage:
 *   node scripts/discover_counties.js          # dry run, print diff
 *   node scripts/discover_counties.js --write   # write county-gis-servers.js
 *   node scripts/discover_counties.js --muni    # also probe top-30 cities
 *
 * Requires outbound HTTPS. Run locally or in CI after adding Bash(curl*) / Bash(node*)
 * to .claude/settings.json.
 */

'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const MUNI  = process.argv.includes('--muni');

const COUNTIES_IN_ORDER = [
  'adams','allen','bartholomew','benton','blackford','boone','brown',
  'carroll','cass','clark','clay','clinton','crawford','daviess',
  'dearborn','decatur','dekalb','delaware','dubois','elkhart','fayette',
  'floyd','fountain','franklin','fulton','gibson','grant','greene',
  'hamilton','hancock','harrison','hendricks','henry','howard','huntington',
  'jackson','jasper','jay','jefferson','jennings','johnson','knox',
  'kosciusko','lagrange','lake','laporte','lawrence','madison','marion',
  'marshall','martin','miami','monroe','montgomery','morgan','newton',
  'noble','ohio','orange','owen','parke','perry','pike','porter','posey',
  'pulaski','putnam','randolph','ripley','rush','stjoseph','scott','shelby',
  'spencer','starke','steuben','sullivan','switzerland','tippecanoe','tipton',
  'union','vanderburgh','vermillion','vigo','wabash','warren','warrick',
  'washington','wayne','wells','white','whitley',
];

// Counties with curated entries already in county-gis-servers.js — do not overwrite
const CURATED = new Set([
  'hamilton','tippecanoe','monroe','madison','dearborn','franklin',
  'hancock','hendricks','knox','montgomery','morgan','lake','porter',
  'marion','allen','vanderburgh',
]);

// Top-30 Indiana cities for municipal discovery (from PR #71 zoning research)
const TOP_CITIES = [
  { county: 'marion',      city: 'indianapolis',  url: 'https://gis.indy.gov/server/rest/services' },
  { county: 'allen',       city: 'fortwayne',     url: 'https://gis.cityoffortwayne.org/arcgis/rest/services' },
  { county: 'tippecanoe',  city: 'lafayette',     url: 'https://maps.tippecanoe.in.gov/server/rest/services' },
  { county: 'stjoseph',    city: 'southbend',     url: 'https://gis.southbendin.gov/arcgis/rest/services' },
  { county: 'vanderburgh', city: 'evansville',    url: 'https://maps.evansvillegis.com/arcgis_server/rest/services' },
  { county: 'hamilton',    city: 'carmel',        url: 'https://services5.arcgis.com/nKFfYbLYNDrYHgoO/arcgis/rest/services' },
  { county: 'johnson',     city: 'greenwood',     url: 'https://greenwoodgis.greenwood.in.gov/arcgis/rest/services' },
  { county: 'lake',        city: 'hammond',       url: 'https://services3.arcgis.com/Yai1e4WSf7DPtolL/arcgis/rest/services' },
  { county: 'porter',      city: 'valparaiso',    url: 'https://services5.arcgis.com/Qp5vz8Fz7vawwcWD/arcgis/rest/services' },
  { county: 'bartholomew', city: 'columbus',      url: 'https://services8.arcgis.com/VdGaBUXUfZ3ETyKd/arcgis/rest/services' },
  { county: 'monroe',      city: 'bloomington',   url: 'https://services3.arcgis.com/8EQ1HhogM827boPC/arcgis/rest/services' },
  { county: 'madison',     city: 'anderson',      url: 'https://services3.arcgis.com/4UkreHBazssuvI82/arcgis/rest/services' },
  { county: 'hendricks',   city: 'avon',          url: 'https://services2.arcgis.com/Y0fDSibEfxdu2Ya6/arcgis/rest/services' },
  { county: 'wayne',       city: 'richmond',      url: 'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services' },
  { county: 'floyd',       city: 'newalbany',     url: 'https://services.arcgis.com/EAoy39bcmpweKJ4f/arcgis/rest/services' },
];

// Municipal entries already curated in municipal-gis-servers.js — skip these
const CURATED_MUNI = new Set([
  'hamilton/carmel','bartholomew/columbus','monroe/bloomington','lake/hammond',
  'stjoseph/southbend','johnson/greenwood','marion/indianapolis',
  'hendricks/avon','hendricks/brownsburg','vanderburgh/evansville',
  'porter/valparaiso','allen/fortwayne','madison/anderson','wayne/richmond',
  'floyd/newalbany',
]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'mapnova-discover/1.0', 'Accept': 'application/json' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error(`JSON parse error from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    const t = setTimeout(() => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); }, timeoutMs);
    req.on('close', () => clearTimeout(t));
  });
}

function categorizeLayer(name) {
  const n = name.toLowerCase();
  if (/parcel|deed|ownership|property|lot|cadastral|address/.test(n)) return 'parcels';
  if (/zon|land.?use|overlay|historic|entitlement|district/.test(n)) return 'zoning';
  if (/flood|hydro|water|wetland|drain|stream|river|lake/.test(n)) return 'hydrology';
  if (/road|street|highway|trail|transit|bridge|rail|bike/.test(n)) return 'transportation';
  if (/census|voting|precinct|school|fire|police|council|ward/.test(n)) return 'districts';
  if (/park|cemetery|hospital|library|poi|facility|landmark/.test(n)) return 'poi';
  if (/soil|elevation|topo|contour|environment|wildlife/.test(n)) return 'environment';
  if (/utility|sewer|water.?main|electric|gas|telecom/.test(n)) return 'utility';
  if (/township|municipal|corporate|boundary|limit/.test(n)) return 'civic';
  return 'other';
}

function convertToLayers(sourceResult) {
  const layers = [];
  for (const svc of sourceResult.services || []) {
    const typeSuffix = svc.type === 'FeatureServer' ? 'FeatureServer' : 'MapServer';
    const svcUrl = `${sourceResult.rest_root}/${svc.name}/${typeSuffix}`;
    if (!svc.layers || svc.layers.length === 0) {
      layers.push({ svc: svcUrl, ids: [0], name: svc.name.replace(/_/g, ' '), cat: categorizeLayer(svc.name) });
    } else {
      for (const l of svc.layers.slice(0, 10)) {
        if (l.geometryType === 'esriGeometryPoint' || !l.geometryType) {
          if (layers.filter(e => e.svc === svcUrl).length === 0) {
            layers.push({ svc: svcUrl, ids: [l.id], name: l.name || svc.name, cat: categorizeLayer(l.name || svc.name) });
          } else {
            layers[layers.length - 1].ids.push(l.id);
          }
        } else {
          layers.push({ svc: svcUrl, ids: [l.id], name: l.name || svc.name, cat: categorizeLayer(l.name || svc.name) });
        }
      }
    }
  }
  // Cap at 50
  return layers.slice(0, 50).filter(l => l.cat !== 'other' || layers.length < 10);
}

async function discoverCounty(slug) {
  const url = `https://api.mapnova.org/api/discover/county/${slug}`;
  try {
    const result = await fetchJson(url);
    return result;
  } catch(e) {
    return { slug, sources: [], errors: [`fetch error: ${e.message}`] };
  }
}

async function probeCity(entry) {
  const url = `https://api.mapnova.org/api/discover/probe?url=${encodeURIComponent(entry.url + '?f=json')}`;
  try {
    const result = await fetchJson(url);
    return { ...entry, result };
  } catch(e) {
    return { ...entry, error: e.message };
  }
}

async function main() {
  const today = new Date().toISOString().split('T')[0];

  console.error('=== County GIS Discovery ===');
  const addedCounties = [];
  const skippedCounties = [];

  for (const slug of COUNTIES_IN_ORDER) {
    if (CURATED.has(slug)) {
      skippedCounties.push({ slug, reason: 'curated entry exists — not overwritten' });
      process.stderr.write('.');
      continue;
    }

    process.stderr.write(`\n[county] ${slug} ... `);
    const result = await discoverCounty(slug);
    await sleep(300);

    if (!result.sources || result.sources.length === 0) {
      skippedCounties.push({ slug, reason: (result.errors || ['no sources returned'])[0] });
      process.stderr.write('skip');
      continue;
    }

    const allLayers = [];
    for (const src of result.sources) {
      allLayers.push(...convertToLayers(src));
    }

    if (allLayers.length === 0) {
      skippedCounties.push({ slug, reason: 'API returned sources but 0 usable layers' });
      process.stderr.write('skip (0 layers)');
      continue;
    }

    const host = result.sources.map(s => s.host).join(', ');
    addedCounties.push({ slug, host, layerCount: allLayers.length, layers: allLayers, fetched_at: result.fetched_at });
    process.stderr.write(`${allLayers.length} layers`);
  }

  process.stderr.write('\n\n');

  // Build JS block for county-gis-servers.js
  let countyBlock = '';
  for (const c of addedCounties) {
    countyBlock += `\n  // ${c.slug.charAt(0).toUpperCase() + c.slug.slice(1)} County — discovered ${today} via api.mapnova.org (host: ${c.host})\n`;
    countyBlock += `  ${c.slug}: [\n`;
    for (const l of c.layers) {
      const ids = JSON.stringify(l.ids);
      countyBlock += `    {svc:'${l.svc}', ids:${ids}, name:'${l.name.replace(/'/g,"\\'")}', cat:'${l.cat}'},\n`;
    }
    countyBlock += '  ],\n';
  }

  // Municipal discovery
  let muniBlock = '';
  const addedCities = [];
  const skippedCities = [];

  if (MUNI) {
    console.error('=== Municipal GIS Discovery ===');
    for (const entry of TOP_CITIES) {
      const key = `${entry.county}/${entry.city}`;
      if (CURATED_MUNI.has(key)) {
        skippedCities.push({ ...entry, reason: 'curated entry exists' });
        process.stderr.write('.');
        continue;
      }
      process.stderr.write(`\n[muni] ${entry.city} (${entry.county}) ... `);
      const r = await probeCity(entry);
      await sleep(300);
      if (r.error || !r.result) {
        skippedCities.push({ ...entry, reason: r.error || 'no result' });
        process.stderr.write('skip');
      } else {
        addedCities.push({ ...entry, result: r.result });
        process.stderr.write('ok');
      }
    }
    process.stderr.write('\n\n');
  }

  // Print summary
  console.log('=== COUNTIES ADDED ===');
  console.table(addedCounties.map(c => ({ slug: c.slug, host: c.host, layers: c.layerCount })));
  console.log('\n=== COUNTIES SKIPPED ===');
  console.table(skippedCounties.map(c => ({ slug: c.slug, reason: c.reason })));

  if (MUNI) {
    console.log('\n=== CITIES ADDED ===');
    console.table(addedCities.map(c => ({ county: c.county, city: c.city })));
    console.log('\n=== CITIES SKIPPED ===');
    console.table(skippedCities.map(c => ({ county: c.county, city: c.city, reason: c.reason })));
  }

  if (WRITE && countyBlock) {
    const filePath = path.resolve(__dirname, '../apps/web/assets/county-gis-servers.js');
    let content = fs.readFileSync(filePath, 'utf8');
    // Insert before the closing brace of COUNTY_GIS_SERVERS
    content = content.replace(/\n};\n\n\n  \/\/ Expose globally/, `${countyBlock}\n};\n\n\n  // Expose globally`);
    fs.writeFileSync(filePath, content);
    console.log(`\nWrote ${addedCounties.length} new county entries to county-gis-servers.js`);
  } else if (!WRITE && countyBlock) {
    console.log('\n=== JS BLOCK (add to county-gis-servers.js) ===');
    console.log(countyBlock);
  }

  if (WRITE && muniBlock) {
    const filePath = path.resolve(__dirname, '../apps/web/assets/municipal-gis-servers.js');
    console.log(`Municipal block ready (${addedCities.length} cities) — manual merge required`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
