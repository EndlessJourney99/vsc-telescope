# Telescope-VSCode Development Guide

## Project Vision
A high-performance fuzzy finder for VS Code that mimics the `telescope.nvim` experience. It uses a centered Webview to simulate a modal popup and leverages native `fzf` and `ripgrep` for speed.

## Technical Stack
- **Frontend**: VS Code Webview API (React or Vanilla TS + CSS for minimal overhead).
- **Backend**: Node.js (VS Code Extension Host).
- **Search Engine**: Native `ripgrep` (rg) and `fzf` binaries.
- **Communication**: JSON-RPC over `postMessage` between Extension Host and Webview.

## Architecture Patterns
- **UI Style**: Centered modal layout. Use absolute positioning with `top: 5%`, `left: 10%`, `width: 80%`, `height: 80%`. Add a backdrop blur to mimic the native Settings overlay.
- **Streaming Results**: Do not wait for search to finish. Stream `ripgrep` stdout directly to the Webview to ensure "instant-as-you-type" feedback.
- **Binary Management**: Use `@vscode/ripgrep` to bundle the binary. Handle platform-specific `fzf` paths.

## Development Commands
- `npm run compile`: Build the extension and webview.
- `npm run watch`: Start incremental compilation.
- `F5`: Launch Extension Development Host.

## Code Style Guidelines
- **Performance First**: Minimize Webview re-renders. Use virtual scrolling for large result sets.
- **Keybindings**: Use `onDidReceiveMessage` to handle 'Enter' (open file) and 'Esc' (close) to match Neovim ergonomics.
- **State**: The Webview is ephemeral. Do not store state in the UI; keep the "source of truth" in the Extension Host.

## Critical Implementation Details
- **Focus**: When the Webview opens, immediately programmatically focus the search input.
- **Preview**: Use `vscode.workspace.openTextDocument` + `vscode.languages.setTextDocumentLanguage` to generate syntax-highlighted previews for the right-hand panel of the Telescope UI.
- **Binary Spawning**: Use `child_process.spawn`. Do not use `exec` to avoid buffer limits and blocking the event loop.

