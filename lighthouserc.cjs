'use strict';

// Lighthouse CI configuration for Mapnova (mapnova.org)
// Assertions are set to 'warn' (not 'error') until a stable baseline is established.
// See: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
module.exports = {
  ci: {
    collect: {
      // Run 3 times per URL and use the median for assertions
      numberOfRuns: 3,
    },
    assert: {
      // Skip PWA checks — this is not a PWA
      preset: 'lighthouse:no-pwa',
      assertions: {
        // Core Web Vitals thresholds (Lighthouse default throttling: Moto G4 on slow 4G)
        // LCP < 2.5 s
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        // INP < 200 ms
        'interaction-to-next-paint': ['warn', { maxNumericValue: 200 }],
        // CLS < 0.1
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        // JS transferred ≤ 800 KB — single-file app approaches this limit
        'resource-summary:script:size': ['warn', { maxNumericValue: 819200 }],
      },
    },
    upload: {
      // Post report links to temporary public storage (no token required)
      target: 'temporary-public-storage',
    },
  },
};
