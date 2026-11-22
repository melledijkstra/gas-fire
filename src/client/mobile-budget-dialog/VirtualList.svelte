<script lang="ts" generics="T">
  import { onMount, type Snippet } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'

  interface Props {
    items: T[]
    getKey: (item: T) => string
    estimatedItemHeight?: number
    overscan?: number
    row: Snippet<[T]>
  }

  let {
    items,
    getKey,
    estimatedItemHeight = 84,
    overscan = 6,
    row,
  }: Props = $props()

  const VIRTUALIZE_THRESHOLD = 40

  let containerEl = $state<HTMLDivElement | null>(null)
  let scrollY = $state(0)
  let viewportHeight = $state(800)
  let containerTop = $state(0)
  const measuredHeights = new SvelteMap<string, number>()

  function updateViewportMetrics() {
    if (typeof window === 'undefined') return
    scrollY = window.scrollY
    viewportHeight = window.innerHeight
    if (containerEl) {
      containerTop = containerEl.getBoundingClientRect().top + window.scrollY
    }
  }

  onMount(() => {
    updateViewportMetrics()
    window.addEventListener('scroll', updateViewportMetrics, { passive: true })
    window.addEventListener('resize', updateViewportMetrics, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateViewportMetrics)
      window.removeEventListener('resize', updateViewportMetrics)
    }
  })

  function measureRow(node: HTMLDivElement, key: string) {
    const record = () => {
      const h = node.getBoundingClientRect().height
      if (h > 0 && measuredHeights.get(key) !== h) {
        measuredHeights.set(key, h)
      }
    }
    record()
    if (typeof ResizeObserver === 'undefined') {
      return {}
    }
    const observer = new ResizeObserver(record)
    observer.observe(node)
    return {
      destroy() {
        observer.disconnect()
      },
    }
  }

  const shouldVirtualize = $derived(items.length > VIRTUALIZE_THRESHOLD)

  const windowSlice = $derived.by(() => {
    if (!shouldVirtualize) {
      return {
        visibleItems: items,
        topSpacer: 0,
        bottomSpacer: 0,
      }
    }

    const relativeTop = Math.max(0, scrollY - containerTop)
    const relativeBottom = relativeTop + viewportHeight

    let offset = 0
    let startIdx = 0
    let foundStart = false
    let endIdx = items.length

    const offsets: number[] = []
    for (let i = 0; i < items.length; i++) {
      offsets.push(offset)
      const h = measuredHeights.get(getKey(items[i])) ?? estimatedItemHeight
      if (!foundStart && offset + h >= relativeTop) {
        startIdx = Math.max(0, i - overscan)
        foundStart = true
      }
      if (offset > relativeBottom && endIdx === items.length) {
        endIdx = Math.min(items.length, i + overscan)
      }
      offset += h
    }

    const totalHeight = offset
    const topSpacer = offsets[startIdx] ?? 0
    const endOffset = endIdx < items.length ? (offsets[endIdx] ?? totalHeight) : totalHeight
    const bottomSpacer = Math.max(0, totalHeight - endOffset)

    return {
      visibleItems: items.slice(startIdx, endIdx),
      topSpacer,
      bottomSpacer,
    }
  })
</script>

<div bind:this={containerEl}>
  {#if windowSlice.topSpacer > 0}
    <div style="height: {windowSlice.topSpacer}px" aria-hidden="true"></div>
  {/if}

  <div class="space-y-2">
    {#each windowSlice.visibleItems as item (getKey(item))}
      <div use:measureRow={getKey(item)}>
        {@render row(item)}
      </div>
    {/each}
  </div>

  {#if windowSlice.bottomSpacer > 0}
    <div style="height: {windowSlice.bottomSpacer}px" aria-hidden="true"></div>
  {/if}
</div>
