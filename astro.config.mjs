import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import awsAmplify from 'astro-aws-amplify';

const site = process.env.SITE_URL || 'https://northshop.agency';

export default defineConfig({
  site,
  output: 'server',
  adapter: awsAmplify(),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
