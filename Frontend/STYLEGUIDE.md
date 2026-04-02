FitCek Design Tokens & Style Guide

Purpose
- Single-page reference for tokens, typography, spacing, and component usage.

Tokens (in Frontend/src/styles/tokens.css)
- Primary: `--color-primary`: #2563EB
- Primary-600: `--color-primary-600`: #1D4ED8
- Secondary: `--color-secondary`: #22C55E
- Background: `--color-bg`: #F8FAFC
- Surface: `--color-surface`: #FFFFFF
- Muted: `--color-muted`: #6B7280
- Text: `--color-text`: #0F172A
- Radius: `--radius`: 10px (also `--radius-sm`, `--radius-lg`)
- Spacing: base `--space` = 16px (also `--space-sm`, `--space-md`)
- Shadows: `--shadow-1`, `--shadow-2`

Typography
- Font stack: `--font-sans` (Inter, system-ui...) applied to body
- Scale: `--fs-xxl` 32px, `--fs-xl` 24px, `--fs-lg` 20px, `--fs-base` 16px, `--fs-sm` 13px
- Line-height: 1.5 for body, 1.25 for headings

Spacing & Layout
- Base spacing unit: 8px grid; tokens expose `--space` (16px) and variants
- Sidebar width: `--sidebar-width` 240px

Components
- Buttons
  - Primary: `.btn-primary` — filled, token-based gradient, medium radius, subtle elevation
  - Ghost: `.btn-ghost` — outline/transparent
- Inputs
  - `.field` wrapper, floating label pattern, 44–48px touch targets
- Cards
  - `.card` uses `--color-surface`, `--radius`, `--shadow-sm`

Accessibility
- Focus rings use `--focus-ring` (semi-transparent primary)
- Buttons and inputs include ARIA attributes where appropriate

Usage
- Import tokens first in your main stylesheet with: `@import './styles/tokens.css'`
- Use tokens instead of raw hex values: `color: var(--color-primary)`

Notes
- Gradients reserved for key CTAs and avatar/hero accents only.
- Keep visual density light: prefer whitespace over heavy shadows.

Files to edit when extending the system
- `Frontend/src/styles/tokens.css`
- `Frontend/src/styles/global.css`
- UI primitives in `Frontend/src/components/ui/` (Button.jsx, Input.jsx, Card.jsx)

