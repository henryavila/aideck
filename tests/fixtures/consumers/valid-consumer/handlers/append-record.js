export default async function({ args, files }) {
  await files.append(args.target, { message: args.message ?? 'hello' })
  return { appended: true }
}
