import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type LegacyPage = 'home' | 'promotions' | 'launches';

// Use the project directory at build time. `import.meta.url` points to a bundled file in dist.
const source = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const markers: Record<LegacyPage, string> = {
  home: '<!-- ============ PAGE: HOME ============ -->',
  promotions: '<!-- ============ PAGE: PROMOTIONS ============ -->',
  launches: '<!-- ============ PAGE: LAUNCHES ============ -->',
};

const nextMarkers: Record<LegacyPage, string> = {
  home: markers.promotions,
  promotions: markers.launches,
  launches: '<!-- FOOTER -->',
};

/**
 * Reuses the original marketing markup while Astro owns routing, styles and the document head.
 * Content can be incrementally split into components without changing the rendered site.
 */
export function legacyContent(page: LegacyPage) {
  const start = source.indexOf(markers[page]) + markers[page].length;
  const end = source.indexOf(nextMarkers[page], start);

  if (start < markers[page].length || end === -1) {
    throw new Error(`Could not find legacy ${page} content.`);
  }

  return source
    .slice(start, end)
    .replace(/^\s*<main[^>]*>\s*/, '')
    .replace(/\s*<\/main>\s*$/, '')
    .replace('Q1 offers end in', 'Limited availability')
    .replace(
      /onsubmit="event\.preventDefault\(\); this\.querySelector\('button'\)\.textContent='Sent — talk soon ✦';"/,
      'data-contact-form',
    );
}
