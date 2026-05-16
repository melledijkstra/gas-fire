import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-GB',
  title: 'GAS FIRE',
  description: 'Google Sheet Personal Finance Automation',
  base: '/gas-fire/docs/',
  outDir: '.vitepress/dist/docs',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get Started', link: '/getting-started' },
      { text: 'Banking', link: '/bank-accounts' },
      { text: 'Importing', link: '/importing' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started' },
          { text: 'Setup Bank Accounts', link: '/bank-accounts' },
          { text: 'Organizing Categories', link: '/categories' },
          { text: 'Live Demo', link: '/demo' },
        ],
      },
      {
        text: 'Core Features',
        items: [
          { text: 'The Dashboard', link: '/dashboard' },
          { text: 'Importing Transactions', link: '/importing' },
          { text: 'Automation Rules', link: '/rules' },
          { text: 'Investments', link: '/investments' },
        ],
      },
      {
        text: 'Advanced Usage',
        items: [
          { text: 'The Source Tab', link: '/source-tab' },
          { text: 'FAQ', link: '/faq' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/melledijkstra/gas-fire' },
    ],
  },
})
