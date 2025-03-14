import type { Preview } from '@storybook/svelte';
import { DialogDecorator } from './dialog-decorator';
import { ServerMockDecorator } from './__mocks__/server-mock';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dialog',
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
  decorators: [ServerMockDecorator, DialogDecorator],
  tags: ['autodocs'],
};

export default preview;
