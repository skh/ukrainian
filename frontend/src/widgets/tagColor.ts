export function tagColor(id: number): { background: string; color: string } {
  const hue = Math.round((id * 137.508) % 360)
  return {
    background: `hsl(${hue}, 55%, 86%)`,
    color:      `hsl(${hue}, 55%, 26%)`,
  }
}
