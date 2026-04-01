import type { Preview } from '@storybook/svelte';
import { sb } from 'storybook/test'
import { google } from './google.mock.ts';
import '@/client/app.css';

sb.mock(import('../src/client/utils/serverFunctions.ts'))

window.google = google;

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        dialog: {
          name: 'dialog',
          value: 'rgba(0, 0, 0, 0.6)',
        }
      },
    },
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
