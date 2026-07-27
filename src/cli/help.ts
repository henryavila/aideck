export const HELP_TEXT = `aideck — AI-native dashboard runtime

USAGE
  aideck <command> [options]

COMMANDS
  serve           Start HTTP server (dashboard + REST + SSE) on default port 7777
                  (auto-fallback to 7778..7787 if 7777 is busy and --port not given).
                  Idempotent: if a healthy instance already holds the port it is
                  reused (no second process); a stale/undead instance is reclaimed.
  demo            Run HTTP server with seeded fixtures (auto-opens browser)
  mcp             Run MCP server (stdio mode) — connect from Claude Code/Cursor via MCP config
  up              Ensure aideck is running (start if needed) and print the URL
                  Idempotent: reuses existing instance or starts a detached one.
  down            Stop a running aideck instance gracefully
  restart         Stop the running instance (if any) and start a fresh one
  env             Print shell exports for AIDECK_URL/AIDECK_PORT (use: eval "$(aideck env)")
  validate-file   Validate a data file against its consumer's schema.json
                  Walks up from the file to find manifest.yaml, matches dataSource by path,
                  validates each record via schema.json. Exit 0=valid, 1=errors, 2=not found.
  init-consumer   Scaffold a new consumer directory with manifest.yaml, schema.json,
                  and sample data. Use --id, --title, --mcp-namespace to configure.

OPTIONS
  --port=<N>              Port for HTTP server (default 7777, ignored by 'mcp' and 'env')
                          If set explicitly and the port is busy, aideck exits 1.
  --static-dir=<path>     Serve a prebuilt SPA bundle from <path> as a fallback handler
                          (serve only). API and SSE routes always take priority; any
                          non-API request that does not match a file falls back to
                          <path>/index.html for client-side routing.
  --expose=<provider>     Remote access for the dashboard (serve only). Default: off.
                          off        local-only (127.0.0.1), unchanged.
                          tailscale  run 'tailscale serve' (private tailnet, HTTPS).
                                     Never Tailscale Funnel — the tailnet stays private.
                          tailnet    bind a 2nd listener on this node's Tailscale IP
                                     (never 0.0.0.0), guarded by a Host allowlist.
                          ngrok      spawn 'ngrok http' (PUBLIC internet HTTPS tunnel).
                                     Requires ngrok CLI + authtoken; reuses an existing
                                     agent tunnel when one already targets this port.
                          external   you run your own proxy; just record its URL
                                     (works for hand-started ngrok/caddy/cloudflare).
                          off/tailscale/ngrok/external keep the socket on 127.0.0.1.
  --expose-port=<N>       Public HTTPS port for the tailnet endpoint (default 8443;
                          used by tailscale only — ignored by ngrok/tailnet/external).
  --remote-base-url=<url> Required for --expose=external; the https:// origin your
                          proxy serves (e.g. https://host.example.ts.net or an
                          ngrok free URL you started yourself).
  --config=<path>         Path to config file (default: none)
  --id=<id>               Consumer ID (init-consumer)
  --title=<title>         Consumer display title (init-consumer)
  --mcp-namespace=<ns>    MCP namespace, e.g. my_consumer (init-consumer)
  -h, --help              Show this help
  -v, --version           Show version

EXAMPLES
  aideck demo
  aideck serve --port=8080
  aideck serve --expose=tailscale          # reach the dashboard from your phone over Tailscale
  aideck serve --expose=ngrok              # public HTTPS tunnel via ngrok (internet-wide)
  aideck serve --static-dir=../atomic-skills/dist/dashboard
  aideck mcp                 # run separately; HTTP and MCP are independent processes
  eval "$(aideck env)"       # source AIDECK_URL/AIDECK_PORT in current shell
  aideck validate-file path/to/data/tasks.yaml
  aideck init-consumer --id my-project --title "My Project" --mcp-namespace my_project

Docs: https://github.com/henryavila/aideck
`
