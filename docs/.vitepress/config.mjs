import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'GAS FIRE',
  description: 'Google Apps Script Financial Automation',
  base: '/gas-fire/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get Started', link: '/getting-started' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/melledijkstra/gas-fire' },
    ],
  },
})
