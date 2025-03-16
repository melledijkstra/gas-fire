import type { Preview } from '@storybook/svelte';
import { ServerMockDecorator } from './__mocks__/server-mock';

const preview: Preview = {
  parameters: {
    backgrounds: {
      values: [
        {
          name: 'dialog',
          value: 'rgba(0, 0, 0, 0.6)',
        },
      ],
    },
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [ServerMockDecorator],
  tags: ['autodocs'],
};

export default preview;
