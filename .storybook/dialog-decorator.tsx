import { ReactRenderer } from '@storybook/react';
import { DecoratorFunction } from '@storybook/types';
import React from 'react';

import styles from './dialog.module.css';

type DialogDecoratorArgs = {
  dialogSize?: [number, number];
  dialogTitle?: string;
};

export const DialogDecorator: DecoratorFunction<
  ReactRenderer,
  DialogDecoratorArgs
> = (Story, { args, title: storyTitle }) => {
  const [width, height] = args?.dialogSize ?? [900, 600];

  return (
    <div className={styles.dialog}>
      <div className={styles.dialog__heading}>
        <span className={styles.dialog__heading__title}>
          {args.dialogTitle ?? storyTitle}
        </span>
        <span className={styles.dialog__heading__close} role="button"></span>
      </div>
      <div style={{ width, height }}>
        <Story />
      </div>
    </div>
  );
};
