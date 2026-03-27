// helpers/extractEntries.ts — create this small util
export function extractMoveObjectFields(response: any): any | null {
  const content = response?.data?.content
  if (!content || content.dataType !== 'moveObject') return null
  return (content as any).fields ?? null
}