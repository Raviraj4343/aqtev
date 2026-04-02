FitCek Design System — Compact Spec

1) Tokens (CSS variables in `src/styles/tokens.css`)
- Primary: `--color-primary`: #2563EB
- Primary-600: `--color-primary-600`: #1D4ED8
- Secondary: `--color-secondary`: #22C55E
- Background: `--color-bg`: #F8FAFC
- Surface: `--color-surface`: #FFFFFF
- Muted: `--color-muted`: #6B7280
- Text: `--color-text`: #0F172A
- Success: `--color-success`: #16A34A
- Danger: `--color-danger`: #DC2626

Spacing & Radii
- Base spacing unit: 8px
- Tokens: `--space` 16px; `--space-sm` 12px; `--space-md` 24px
- Radii: `--radius-sm` 6px; `--radius` 10px; `--radius-lg` 16px

Shadows
- `--shadow-1`: 0 6px 18px rgba(2,6,23,0.06)
- `--shadow-2`: 0 2px 8px rgba(2,6,23,0.04)

Typography
- Font family: Inter (variable) stack via `--font-sans`
- Scale: `--fs-xxl`32, `--fs-xl`24, `--fs-lg`20, `--fs-base`16, `--fs-sm`13

2) Component specs (desktop baseline)

Buttons
- Primary
  - Height: 44px
  - Padding: 12px 16px
  - Border-radius: `--radius`
  - Background: linear-gradient(90deg, var(--color-primary), var(--color-primary-600))
  - Text: white, font-weight 700
  - Box-shadow: `--shadow-1`
  - Hover: translateY(-2px), shadow -> `--shadow-2`
  - Focus: visible outline `--focus-ring` (semi-transparent primary)
  - Disabled: opacity 0.5; remove pointer events

- Ghost
  - Transparent background, 1px neutral border, primary text color
  - Hover: subtle background tint (rgba primary 6%)

Inputs (field)
- Height: 44px (padding fit)
- Border: 1px solid rgba(15,23,42,0.06)
- Border-radius: `--radius`
- Floating label: small text over input when focused / filled
- Focus: border-color `--color-primary-600`, box-shadow subtle bluish
- Error: border-color `--color-danger`, small error text under field
- Disabled: muted text, lighter background (`--color-surface` with low contrast)

Cards
- Background: `--color-surface`
- Radius: `--radius`
- Padding: 16px
- Shadow: `--shadow-sm`

Navbar
- Height: `--topbar-height` 64px
- Background: transparent or `--color-surface` in heavy UIs
- Elements: left - menu + search; right - avatar, notifications
- Avatar: 36px circle, gradient using primary tokens

Sidebar
- Width: `--sidebar-width` 240px (collapsed 72px mobile)
- Background: `--color-surface` with subtle gradient
- Nav item default: muted text; active: primary color + tinted background

Modals
- Backdrop: rgba(2,6,23,0.45)
- Dialog: background `--color-surface`, radius `--radius-lg`, padding 24px
- Focus trap: keyboard-only; close on ESC

Form states (summary)
- Idle: neutral border
- Focus: primary accent + ring
- Success: border `--color-success` + success hint
- Error: border `--color-danger` + error text/aria-invalid
- Disabled: low-contrast, aria-disabled

Accessibility criteria
- Color contrast: ensure text on background >= 4.5:1 for body text, 3:1 for large text
- Focus: visible 3px ring using `--focus-ring`
- Inputs: include `aria-label` or visible label; errors use `aria-invalid` and `aria-describedby`
- Buttons: provide `aria-disabled` when disabled; use `button` role for clickable non-buttons
- Keyboard: all interactive elements reachable via Tab and operable with Enter/Space

3) Export formats
- CSS variables: `src/styles/tokens.css`
- SCSS tokens: `src/styles/_tokens.scss`
- Tailwind: `tailwind.config.cjs` added at project root for utility use

4) Mockups
- See `src/pages/MockupAuth.jsx` and `src/pages/MockupDashboard.jsx` for high-fidelity React mockups using tokens and components.

Notes & next steps
- Replace remaining legacy hex/variables across styles and components.
- Create Storybook (recommended) to document components and states interactively.

