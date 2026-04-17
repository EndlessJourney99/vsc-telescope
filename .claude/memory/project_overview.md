---
name: project_overview
description: Overview of the vsc-telescope VS Code extension project
type: project
---

VS Code extension mimicking `telescope.nvim` — a high-performance fuzzy finder with a centered modal Webview UI.

**Why:** Bring the Neovim telescope.nvim experience to VS Code users with native speed via ripgrep/fzf binaries.

**How to apply:** All feature work should follow the architecture: Extension Host (Node.js backend) ↔ Webview (frontend) via JSON-RPC postMessage. Use streaming ripgrep results, virtual scrolling, and keep state in the Extension Host.

## Current State (2026-04-16)
- Boilerplate only: single `helloWorld` command in `src/extension.ts`
- No Webview, no search functionality, no commands yet
- Stack: TypeScript, esbuild, VS Code Webview API, ripgrep, fzf
