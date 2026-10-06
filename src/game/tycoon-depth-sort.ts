/** Repair a nearly sorted scene in one scan. Moving actors usually cross only
 * a few static wall columns; rebuilds fall back to a full stable sort. */
export function repairDepthOrder<T extends { depth: number }>(items: T[], fullSort: () => void) {
  let shifts = 0
  const limit = items.length * 4
  let previousDepth = items[0]?.depth ?? -Infinity
  for (let i = 1; i < items.length; i++) {
    const item = items[i], depth = item.depth
    if (previousDepth <= depth) { previousDepth = depth; continue }
    let j = i - 1
    while (j >= 0 && items[j].depth > depth) {
      items[j + 1] = items[j]; j--; shifts++
      if (shifts > limit) {
        items[j + 1] = item
        fullSort()
        return
      }
    }
    items[j + 1] = item
  }
}
