import { Preview } from '@storybook/react';
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
};

export default preview;
