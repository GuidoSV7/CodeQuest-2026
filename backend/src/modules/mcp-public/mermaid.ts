export type MermaidItem = {
  course_id: string
  title: string
  bucket: 'required' | 'recommended' | 'optional' | 'anytime' | null
  already_known: boolean
}

export type MermaidEdge = {
  from_course_id: string
  to_course_id: string
}

export function escapeMermaidLabel(title: string): string {
  return title.replace(/\r?\n/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function mermaidClass(item: MermaidItem): string {
  const base = item.bucket ?? 'search'
  return item.already_known ? `${base}Known` : base
}

export function renderMermaid(items: MermaidItem[], edges: MermaidEdge[]): string {
  const lines = ['flowchart LR']
  for (const item of items) {
    lines.push(
      `  c${item.course_id}["${escapeMermaidLabel(item.title)}"]:::${mermaidClass(item)}`,
    )
  }
  for (const edge of edges) {
    lines.push(`  c${edge.from_course_id} --> c${edge.to_course_id}`)
  }
  lines.push('  classDef required stroke:#b48cf3')
  lines.push('  classDef recommended stroke:#7d6bff')
  lines.push('  classDef optional stroke:#8a849f')
  lines.push('  classDef anytime stroke:#5b5670')
  lines.push('  classDef search stroke:#8a849f')
  lines.push('  classDef requiredKnown stroke:#b48cf3,stroke-dasharray: 4 3')
  lines.push('  classDef recommendedKnown stroke:#7d6bff,stroke-dasharray: 4 3')
  lines.push('  classDef optionalKnown stroke:#8a849f,stroke-dasharray: 4 3')
  lines.push('  classDef anytimeKnown stroke:#5b5670,stroke-dasharray: 4 3')
  lines.push('  classDef searchKnown stroke:#8a849f,stroke-dasharray: 4 3')
  return lines.join('\n')
}
