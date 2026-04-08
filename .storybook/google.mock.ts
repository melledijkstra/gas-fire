import { fn } from 'storybook/test'

export const google = {
  script: {
    host: {
      origin: '',
      close: fn(() => { alert('*google.script.host.close()*') }),
      setHeight: fn((_height: number) => {}),
      setWidth: fn((_width: number) => {}),
      editor: {
        focus: fn(() => {}),
      },
    },
  },
}
