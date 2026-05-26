export default async function({ args, data }) {
  const items = data.get('items') ?? []
  const filtered = args.status
    ? items.filter(i => i.status === args.status)
    : items
  return { count: filtered.length, status: args.status ?? 'all' }
}
