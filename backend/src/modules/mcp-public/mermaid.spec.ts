import { describe, expect, it } from 'vitest'
import { renderMermaid } from './mermaid'

function item(
  courseId: string,
  title: string,
  bucket: 'required' | 'recommended' | 'optional' | 'anytime' | null,
  alreadyKnown = false,
) {
  return { course_id: courseId, title, bucket, already_known: alreadyKnown }
}

function mermaidErrors(source: string): string[] {
  const errors: string[] = []
  if (!source.startsWith('flowchart LR\n')) errors.push('missing flowchart LR')
  const nodeLines = source.split('\n').filter((line) => /^\s+c\d+\["/.test(line))
  if (nodeLines.length === 0) errors.push('no nodes')
  for (const line of nodeLines) {
    if (!/:::(\w+)$/.test(line)) errors.push(`node without class: ${line}`)
    const label = line.match(/\["(.*)"\]/)?.[1]
    if (label?.includes('\n') || label?.includes('\r')) errors.push('raw newline in label')
    if (label && /(?<!\\)"/.test(label)) errors.push('unescaped quote')
  }
  return errors
}

describe('mermaid diagram', () => {
  it('draws edges for a path with more than one required course', () => {
    const source = renderMermaid(
      [
        item('2063649', 'Nest: Desarrollo backend escalable con Node', 'required'),
        item('111', 'JavaScript Moderno', 'recommended'),
        item('2095680', 'Nest + GraphQL: Evoluciona tus APIs', 'required'),
      ],
      [
        { from_course_id: '2063649', to_course_id: '2095680' },
      ],
    )
    expect(mermaidErrors(source)).toEqual([])
    expect(source).toContain('c2063649["Nest: Desarrollo backend escalable con Node"]')
    expect(source).toContain('c2063649 --> c2095680')
    expect(source).not.toContain('c111 -->')
    expect(source).toContain('c2063649["Nest: Desarrollo backend escalable con Node"]:::required')
    expect(source).toContain('c111["JavaScript Moderno"]:::recommended')
  })

  it('draws a linear path as a single chain', () => {
    const source = renderMermaid(
      [
        item('1', 'Uno', 'required'),
        item('2', 'Dos', 'required'),
        item('3', 'Tres', 'required'),
      ],
      [
        { from_course_id: '1', to_course_id: '2' },
        { from_course_id: '2', to_course_id: '3' },
      ],
    )
    expect(mermaidErrors(source)).toEqual([])
    expect(source).toContain('c1 --> c2')
    expect(source).toContain('c2 --> c3')
  })

  it('draws a search result without official buckets', () => {
    const source = renderMermaid(
      [
        item('1000', 'Go APIs', null),
        item('999', 'Go básico', null, true),
      ],
      [{ from_course_id: '1000', to_course_id: '999' }],
    )
    expect(mermaidErrors(source)).toEqual([])
    expect(source).toContain('c1000["Go APIs"]:::search')
    expect(source).toContain('c999["Go básico"]:::searchKnown')
    expect(source).toContain('c1000 --> c999')
  })

  it('keeps quotes, colons, parentheses, accents and emoji inside a quoted label', () => {
    const title = 'React "pro": (guía) año é 🚀'
    const source = renderMermaid([item('222', title, 'optional', true)], [])
    expect(mermaidErrors(source)).toEqual([])
    expect(source).toContain('c222["React \\"pro\\": (guía) año é 🚀"]:::optionalKnown')
  })
})
