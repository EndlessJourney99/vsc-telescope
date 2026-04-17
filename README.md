# vsc-telescope

> A blazing-fast fuzzy finder for VS Code, inspired by [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim).

Bring the Neovim telescope experience to VS Code — instant file search, live content grep, and keyboard-driven navigation, all powered by [ripgrep](https://github.com/BurntSushi/ripgrep).

---

## Features

### Find Files (`Alt+Shift+P`)

Search across all files in your workspace instantly. Results stream in as ripgrep finds them — no waiting for a full scan.

- Fuzzy matching on filename and path
- Hidden files included (`.dotfiles`)
- `node_modules` and `.git` excluded automatically
- Navigate results with `Tab` / `Shift+Tab` or `↑` / `↓`
- Press `Enter` to open, `Escape` to dismiss

### Search in Files (`Alt+Shift+F`)

Live grep through file contents with a split peek preview. See the matched line in context before you open anything.

- Case-insensitive matching
- Results stream live as you type (200ms debounce)
- Right-hand preview pane shows the full file with the matched line highlighted
- Up to 5 matches per file to keep results focused
- Navigate with `Tab` / `Shift+Tab` or `↑` / `↓`
- Press `Enter` to jump directly to the matched line

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+P` | Open file finder |
| `Alt+Shift+F` | Open content search |
| `Tab` | Move selection down |
| `Shift+Tab` | Move selection up |
| `↑` / `↓` | Move selection up / down |
| `Enter` | Open selected file / jump to match |
| `Escape` | Close panel |

---

## Requirements

No additional software needed. `ripgrep` is bundled via [`@vscode/ripgrep`](https://github.com/microsoft/vscode-ripgrep) and works out of the box on Windows, macOS, and Linux.

---

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vsc-telescope) or search for **vsc-telescope** in the Extensions panel (`Ctrl+Shift+X`).

---

## How It Works

- **File search** uses `rg --files` and streams results in batches directly into a native VS Code `QuickPick` overlay.
- **Content search** uses `rg --json --ignore-case` and streams NDJSON match events into a custom Webview panel with a split preview.
- Both panels use **virtual scrolling** to handle thousands of results without degrading performance.

---

## Roadmap

| Feature | Status |
|---|---|
| Find Files | Shipped |
| Search in Files (content grep) | Shipped |
| Tab / Shift+Tab navigation | Shipped |
| Case-insensitive content search | Shipped |
| **Modal Overlay UI** | Planned — pending VS Code public API for extension-hosted modal overlays |
| Fuzzy search refinement | Planned |
| Per-filetype icons | Planned |

> **Modal Overlay**: VS Code is developing a modal overlay API for extensions (tracked internally). Once that API is publicly available, vsc-telescope will move both the file finder and content search into a centered modal popup — matching the native telescope.nvim aesthetic with a backdrop blur and floating panel.

---

## Contributing

```bash
git clone https://github.com/EndlessJourney99/vsc-telescope.git
cd vsc-telescope
npm install
```

Press `F5` in VS Code to launch the Extension Development Host. The extension compiles automatically before launch.

---

## License

MIT
