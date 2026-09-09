import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-GB',
  title: 'YMYL',
  description: 'Your Money, Your Life - Google Sheet Personal Finance Automation',
  base: '/gas-fire/docs/',
  outDir: '.vitepress/dist/docs',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/welcome' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Welcome & First Look', link: '/getting-started/welcome' },
          { text: 'Initial Setup', link: '/getting-started/initial-setup' },
          { text: 'Configuring Imports', link: '/getting-started/import-settings' },
          { text: 'Importing Transactions', link: '/getting-started/importing-transactions' },
          { text: 'Setting Your Baseline', link: '/getting-started/setting-baseline' },
        ],
      },
      {
        text: 'Reference Guide',
        items: [
          { text: 'Dashboard', link: '/reference/dashboard' },
          { text: 'Source (Ledger)', link: '/reference/source' },
          { text: 'Investments, Capital & Debt', link: '/reference/investments-capital-debt' },
          { text: 'Categories & Budgets', link: '/reference/categories-budgets' },
        ],
      },
      {
        text: 'Developer Guide',
        items: [
          { text: 'Local Development', link: '/developer/getting-started' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/melledijkstra/gas-fire' },
    ],
  },
})
