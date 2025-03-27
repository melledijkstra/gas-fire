<script lang="ts">
  import type { Snippet } from 'svelte';
  import styles from './dialog.module.css';
  
  let { children, size, title }: {
    children: Snippet,
    size: [number, number]
    title: string
  } = $props();

  const [width, height] = size ?? [900, 600];
</script>

<div class={styles.dialog}>
  <div class={styles.dialog__heading}>
    <span class={styles.dialog__heading__title}>
      {title}
    </span>
    <span class={styles.dialog__heading__close}></span>
  </div>
  <div class={styles.dialog__content} style:width={`${width}px`} style:height={`${height}px`}>
    {@render children()}
  </div>
</div>
