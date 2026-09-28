# Frozen design tokens

Source: `assets/styles.css` at `af53a4c34295a160217845465c33002b074e10d7`. Runtime CSS remains authoritative. Express Track preserves the existing design.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f7f9` | `#0f1114` |
| `--surface` | `#ffffff` | `#171a1f` |
| `--surface-2` | `#f0f2f5` | `#1d2127` |
| `--surface-3` | `#e8ebef` | `#262b33` |
| `--text` | `#15171a` | `#f3f5f7` |
| `--muted` | `#70757d` | `#9aa2ad` |
| `--line` | `#e2e5e9` | `#2b3139` |
| `--accent` | `#20242a` | `#f4f5f6` |
| `--success` | `#1f7a4f` | `#71c89a` |
| `--warning` | `#8f6a12` | `#dec06d` |
| `--danger` | `#a43b3b` | `#e77c7c` |
| `--info` | `#3867a7` | `#81aee9` |
| `--focus` | `#4d72a4` | `#9abce7` |
| `--scrollbar-thumb` | `#c4c9d0` | `#454c56` |
| `--scrollbar-track` | `transparent` | inherited |
| `--shadow` | `0 10px 30px rgba(16,24,40,0.06)` | `0 10px 30px rgba(0,0,0,0.24)` |

Shared: `--radius:16px`; `--sidebar:252px` (210px at ≤1080px); `--sans:Inter` with system fallbacks; `--mono:JetBrains Mono` with monospace fallbacks. Most remaining sizes are literal CSS values, not a complete token scale.

Main heading 28px; metric 30px; section title 16px; main card padding 20px; desktop content padding `28px 36px 56px`; grid gaps 16px; section spacing 22px. Controls commonly use 9–11px radii. Buttons/nav transitions typically 140ms; toast entry 220ms.

Breakpoints include 1080px, 900px, 760px and 520px. At 760px the fixed rail becomes a horizontal navigation area. Reduced-motion and forced-colors media queries already exist.

Theme mechanism: `data-theme` on `<html>`, stored under `scholarship-theme`; defaults to light. No automatic `prefers-color-scheme` selection exists. No token changes are made in E-0/E-1.
