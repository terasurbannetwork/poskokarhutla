---
name: hermes-neo-mcp-2026-09
description: Hermes Agent + BrowserOS neo terpasang di Mac mini; ketiganya saling tersambung lewat MCP sejak 5 Sep 2026
metadata:
  type: reference
---

Di Mac mini ([[mesin-24-jam-mac-mini]]) ada dua agent-surface lokal, keduanya tersambung ke Claude Code scope user (`~/.claude.json`):

- BrowserOS neo (BrowserClaw.app) = MCP HTTP `http://127.0.0.1:9010/mcp`. Membuka URL itu di browser memang balas `{"error":"unsupported request"}`; itu bukan rusak, MCP butuh POST JSON-RPC.
- Hermes Agent v0.19 (`~/.local/bin/hermes`, home `~/.hermes`) = MCP stdio `hermes mcp serve`. Model Hermes masih `upstage/solar-pro4:free` via Nous Portal; Anthropic key belum diisi (5 Sep 2026).
- Hermes juga sudah punya neo sebagai MCP server-nya (`~/.hermes/config.yaml` → `mcp_servers.browseros-neo`, 20 tool). `hermes mcp add` butuh TTY; jalur non-interaktif: `yes Y | hermes mcp add ...`.
