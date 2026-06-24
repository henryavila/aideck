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
| `--expose=<off\|tailscale\|tailnet\|external>` | `off` | Remote-access provider. |
| `--expose-port=<N>` | `8443` | Public HTTPS port for the tailnet endpoint (`tailscale` only; ignored by `tailnet`). |
| `--remote-base-url=<url>` | — | Required for `external`; the `https://` origin your own proxy serves. |

### `tailnet` — direct bind, Host-validated (no proxy, no TLS hassle)

```bash
aideck serve --expose=tailnet
# aideck serve: listening on http://127.0.0.1:7777
# aideck serve: remote (tailnet) http://wsl.tailnet.ts.net:7777
# aideck serve: WARNING — reachable by tailnet peers (reads AND writes, no auth)
```

Use this when `tailscale serve` can't deliver inbound (e.g. some WSL setups) but the node is
still reachable on the tailnet. aiDeck binds a **second listener on its own Tailscale IP** (the
loopback listener stays up) on the **same app port** — never `0.0.0.0`, so the LAN can't reach
it. There's no proxy and no certificate: traffic is already encrypted end-to-end by WireGuard,
so the endpoint is plain `http://<name>:<port>` over the tunnel.

What makes a no-auth, read/write service safe to bind here is the **Host-header allowlist**
(`src/server/host-guard.ts`): the server only answers requests whose `Host` is loopback or this
node's own tailnet name/IP, and 403s anything else. That closes DNS-rebinding — the one
browser-attack vector that binding `127.0.0.1` otherwise mitigated. It does **not** add auth
(see Security below); it removes the rebinding risk that direct exposure would otherwise add.

Open `http://<your-node>.<tailnet>.ts.net:<port>` from any device signed into the same tailnet
(MagicDNS must resolve the name, or use the node's `100.x` Tailscale IP directly).

### `external` — bring your own proxy

If you already run a reverse proxy / tunnel (Caddy, Cloudflare Tunnel, ngrok, SSH `-R`, or a
hand-rolled `tailscale serve`) pointing at aiDeck's loopback port, aiDeck won't spawn
anything — it just records the public origin so the env-file and CORS know about it:

```bash
aideck serve --expose=external --remote-base-url=https://dash.example.ts.net
```

## SSH tunnel — the zero-exposure fallback (always printed)

Independent of `--expose`, every `aideck serve` prints an SSH local-forward command:

```
aideck serve: remote (ssh tunnel) ssh -L 7777:127.0.0.1:7777 -p 2222 you@host
aideck serve: then open http://localhost:7777 (replace host with your SSH host if it differs)
```

This is the most generic and most secure remote path, and the recommended one when
`tailscale serve` can't be reached (e.g. WSL setups where the serve listener is bound to the
tailnet IP but inbound connections don't land). Why it's safe: aiDeck stays bound to
`127.0.0.1`, **no proxy process is spawned, no relay, no stored credential, no new listening
surface** — the tunnel is your own authenticated SSH session. aiDeck only prints the command;
it never runs it.

The SSH port is **detected, never assumed to be 22**, in this order:

1. `$SSH_CONNECTION` — when aiDeck runs inside an SSH session, its 4th field is the exact
   server port the session arrived on.
2. `Port` in `/etc/ssh/sshd_config` (and `sshd_config.d/*.conf` drop-ins).
3. Fall back to `22`, with a warning that it's a guess (replace `-p` in the printed command).

Run the printed command from your **client** machine, then browse `http://localhost:<port>`.
Swap the suggested host for your own SSH alias/tailnet name if it differs.

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
