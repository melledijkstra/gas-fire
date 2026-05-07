import { mount } from 'svelte'
import Dialog from './Dialog.svelte'
import '../app.css'

mount(Dialog, {
  target: document.getElementById('app')!,
})
