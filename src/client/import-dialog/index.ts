import { mount } from 'svelte';
import ImportDialog from './Dialog.svelte';
import '../app.css';

mount(ImportDialog, {
  target: document.getElementById('index')!
})
