import { Preview } from '@storybook/react';
import { DialogDecorator } from './dialog-decorator';

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
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [DialogDecorator],
};

export default preview;
