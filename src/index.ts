/**
 * aiDeck public runtime API — embed the dashboard runtime in-process.
 *
 * The primary way to consume aiDeck is the `aideck` CLI (`aideck up`, `serve`,
 * `mcp`) over a file-based consumer (`manifest.yaml` + `schema.json` + handlers).
 * This entry point is for hosts that want to start the HTTP/SSE runtime
 * programmatically instead of shelling out. Types live under `@henryavila/aideck/schemas`;
 * the MCP server embed lives under `@henryavila/aideck/mcp`.
 */

export { startServer, buildApp } from './server/index.js'
export type { ServerOptions, RunningServer, BuiltApp } from './server/index.js'
