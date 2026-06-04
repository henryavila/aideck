/**
 * §2c row-scoped drill-down link. A widget `linkTo` may be either a static page
 * slug (e.g. `plan`) or a path template with `:tokens` (e.g. `plan/:projectId/:slug`)
 * to be interpolated from the clicked record. The result is always anchored under
 * the consumer: `/<consumerId>/<resolved>`.
 *
 *   resolveRowLink('plan/:projectId/:slug', { projectId: 'p', slug: 'x' }, 'c')
 *     => '/c/plan/p/x'
 *   resolveRowLink('details', {}, 'c') => '/c/details'   (static, unchanged)
 */
export function resolveRowLink(
  linkTo: string,
  record: Record<string, unknown>,
  consumerId: string
): string {
  const interpolated = linkTo.replace(/:([A-Za-z0-9_]+)/g, (_m, key: string) => {
    const v = record[key]
    return v === undefined || v === null ? '' : encodeURIComponent(String(v))
  })
  const rel = interpolated.startsWith('/') ? interpolated.slice(1) : interpolated
  return '/' + consumerId + '/' + rel
}
