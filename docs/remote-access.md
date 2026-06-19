# Remote access (`aideck serve --expose`)

aiDeck binds `127.0.0.1` only (Iron Law #4). To open the dashboard from another device —
e.g. your phone — a **separate out-of-process proxy** terminates a private-tailnet HTTPS
connection and forwards to the loopback port. aiDeck never widens its own bind.

We use **Tailscale Serve** (tailnet-private). **Tailscale Funnel (public internet) is never
used** — the dashboard stays reachable only by devices on your tailnet.

## TL;DR

```bash
aideck serve --expose=tailscale
# aideck serve: listening on http://127.0.0.1:7777
# aideck serve: remote (private tailnet) https://wsl.tailnet.ts.net:8443
# aideck serve: WARNING — reachable by tailnet peers (reads AND writes, no auth)
```

Open the `https://…ts.net:8443` URL on any device signed into the same tailnet.

## Prerequisites

- **Tailscale installed and running** on the host (`tailscale status` shows
  `BackendState: Running`). On WSL, either run tailscaled in the distro or expose the
  Windows host's tailscale in PATH.
- **One-time operator grant** so a non-root user may drive `tailscale serve`:
  ```bash
  sudo tailscale set --operator=$USER
  ```
  Without it, exposure logs an `access denied` warning and continues **local-only** (aiDeck
  never runs `sudo` for you).

## Flags

| Flag | Default | Meaning |
|------|---------|---------|
| `--expose=<off\|tailscale\|external>` | `off` | Remote-access provider. |
| `--expose-port=<N>` | `8443` | Public HTTPS port for the tailnet endpoint. |
| `--remote-base-url=<url>` | — | Required for `external`; the `https://` origin your own proxy serves. |

### `external` — bring your own proxy

If you already run a reverse proxy / tunnel (Caddy, Cloudflare Tunnel, ngrok, SSH `-R`, or a
hand-rolled `tailscale serve`) pointing at aiDeck's loopback port, aiDeck won't spawn
anything — it just records the public origin so the env-file and CORS know about it:

```bash
aideck serve --expose=external --remote-base-url=https://dash.example.ts.net
```

## What changes when exposed

- **CORS** accepts exactly the resolved remote host's origin, in addition to localhost.
- **`~/.aideck/env`** gains `export AIDECK_REMOTE_URL=…`.
- **Nothing else.** The server socket is still `127.0.0.1`; SSE/live-update works unchanged
  because the client uses relative URLs.

## Security

aiDeck has **no authentication of its own**. While exposed, any device on your tailnet can
both **read and write** (annotations, highlights, inbox). This is fine for a personal,
single-user tailnet — which is the supported use case — but do not share a tailnet that
contains untrusted peers while exposing aiDeck. The CLI prints a warning on every exposed
start as a reminder.

## Teardown

`Ctrl-C` (SIGINT/SIGTERM) runs `tailscale serve --https=<exposePort> off` and removes
`~/.aideck/env` before exiting. To confirm nothing lingers:

```bash
tailscale serve status --json   # should no longer list the :8443 mapping
```

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `tailscale is not available` | CLI not in PATH; install Tailscale or fix PATH. Stays local-only. |
| `tailscale is not running` | `tailscale up` first. Stays local-only. |
| `access denied … sudo tailscale set --operator=$USER` | Run that once, then restart. |
| `reported no mapping` | Serve didn't persist the mapping; check `tailscale serve status`. |
| Remote URL 403s in the browser console | The origin must match the resolved ts.net host exactly; restart so CORS picks it up. |
