import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL || 'https://northshop.agency';

export default defineConfig({
  site,
  output: 'static',
  adapter: node({
    mode: 'standalone',
    bodySizeLimit: 64 * 1024,
  }),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
