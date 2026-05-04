---
name: Daylog Design System
description: >
  Daylog UI guide derived from the current product styles. This system keeps the
  app minimal, operational, white-surface-first, and consistent across projects,
  notifications, memo, attendance, calendar, and workspace settings.
colors:
  canvas:
    value: "#F4F5F7"
    usage: "Primary app background and page canvas."
  surface:
    value: "#FFFFFF"
    usage: "Default card, panel, modal, input, and table surface."
  surface-subtle:
    value: "#F8F9FA"
    usage: "Secondary panel fill, table header, and quiet hover background."
  surface-muted:
    value: "#F1F5F9"
    usage: "Soft selected state, supporting surface, and muted panels."
  text-strong:
    value: "#111827"
    usage: "Modal titles, dark selected tabs, and highest-emphasis text."
  text-default:
    value: "#4B5563"
    usage: "Default body text in lists, forms, comments, calendar, and detail views."
  text-soft:
    value: "#6B7280"
    usage: "Secondary labels and page-level descriptive text."
  text-muted:
    value: "#9CA3AF"
    usage: "Placeholder, helper text, metadata, and subtle labels."
  border:
    value: "#E5E7EB"
    usage: "Default border for cards, inputs, tables, and segmented controls."
  border-subtle:
    value: "#F3F4F6"
    usage: "Inner separators, table row dividers, and modal section lines."
  accent:
    value: "#4F7CFF"
    usage: "Primary action color. Workspace theme may override this via CSS variables."
  accent-hover:
    value: "#3D6AEE"
    usage: "Hover state for primary actions."
  accent-soft:
    value: "#EEF2FF"
    usage: "Soft accent background for badges, icons, and helper emphasis."
  success:
    value: "#2A8C50"
    usage: "Positive confirmation and approved states."
  success-soft:
    value: "#DCFCE7"
    usage: "Soft success background."
  warning:
    value: "#F97316"
    usage: "Pending, warning, review, and caution states."
  warning-soft:
    value: "#FFF0E6"
    usage: "Soft warning background."
  danger:
    value: "#EF4444"
    usage: "Delete, rejection, and error states."
  danger-soft:
    value: "#FEE2E2"
    usage: "Soft danger background."
  purple:
    value: "#8B5CF6"
    usage: "Secondary status color for review and idea-related emphasis."
  purple-soft:
    value: "#F3F0FF"
    usage: "Soft purple background."
  yellow:
    value: "#EAB308"
    usage: "Limited highlight or reminder state."
  yellow-soft:
    value: "#FEF9C3"
    usage: "Soft yellow background."
  sidebar-bg:
    value: "#16181D"
    usage: "Main desktop sidebar background."
  sidebar-hover:
    value: "#22252D"
    usage: "Sidebar hover background."
  sidebar-active:
    value: "#2A2D36"
    usage: "Sidebar active item background."
typography:
  fontFamily:
    base: '"Geist Sans", "Noto Sans KR", sans-serif'
    display: '"Geist Sans", "Noto Sans KR", sans-serif'
    mono: '"Geist Mono", monospace'
  weights:
    regular: 400
    medium: 500
    semibold: 600
    bold: 700
  sizes:
    meta: "11px"
    label: "12px"
    body: "13.5px"
    body-large: "14.5px"
    title: "16px"
    section-title: "18px"
    stat-value: "28px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  xxl: "20px"
  panel: "22px"
  pill: "999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "28px"
  3xl: "32px"
  page-gap: "24px"
  section-gap: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent.value}"
    textColor: "{colors.surface.value}"
    borderColor: "{colors.accent.value}"
    typography: "{typography.sizes.body} / {typography.weights.semibold}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
    shadow: "0 12px 20px rgba(79, 124, 255, 0.18)"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover.value}"
    textColor: "{colors.surface.value}"
    borderColor: "{colors.accent-hover.value}"
  button-secondary:
    backgroundColor: "{colors.surface.value}"
    textColor: "{colors.text-default.value}"
    borderColor: "{colors.border.value}"
    typography: "{typography.sizes.body} / {typography.weights.semibold}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-subtle.value}"
    textColor: "{colors.text-strong.value}"
    borderColor: "#D7DCE4"
  tab-selected:
    backgroundColor: "{colors.text-strong.value}"
    textColor: "{colors.surface.value}"
    borderColor: "{colors.text-strong.value}"
    typography: "{typography.sizes.body} / {typography.weights.semibold}"
    rounded: "{rounded.pill}"
    padding: "0 15px"
    height: "36px"
  tab-default:
    backgroundColor: "{colors.surface.value}"
    textColor: "{colors.text-soft.value}"
    borderColor: "{colors.border.value}"
    hoverBackgroundColor: "{colors.surface-subtle.value}"
    hoverTextColor: "{colors.text-default.value}"
    rounded: "{rounded.pill}"
    padding: "0 15px"
    height: "36px"
  card-default:
    backgroundColor: "{colors.surface.value}"
    textColor: "{colors.text-default.value}"
    borderColor: "{colors.border.value}"
    rounded: "{rounded.lg}"
    padding: "20px 24px"
    shadow: "0 1px 2px rgba(15, 23, 42, 0.06)"
  card-hover:
    backgroundColor: "{colors.surface.value}"
    borderColor: "#DBE2EC"
    shadow: "0 12px 24px rgba(15, 23, 42, 0.08)"
    transform: "translateY(-1px)"
  modal-panel:
    backgroundColor: "{colors.surface.value}"
    textColor: "{colors.text-default.value}"
    borderColor: "{colors.border.value}"
    rounded: "{rounded.xxl}"
    padding: "24px"
    shadow: "0 24px 48px rgba(15, 23, 42, 0.14)"
  input-field:
    backgroundColor: "{colors.surface.value}"
    textColor: "{colors.text-strong.value}"
    borderColor: "{colors.border.value}"
    placeholderColor: "{colors.text-muted.value}"
    focusBorderColor: "rgba(79, 124, 255, 0.45)"
    focusRing: "0 0 0 4px rgba(79, 124, 255, 0.08)"
    rounded: "{rounded.md}"
    padding: "12px 15px"
    height: "44px"
  chip-default:
    backgroundColor: "{colors.surface-subtle.value}"
    textColor: "{colors.text-default.value}"
    borderColor: "{colors.border.value}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-selected:
    backgroundColor: "{colors.text-strong.value}"
    textColor: "{colors.surface.value}"
    borderColor: "{colors.text-strong.value}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-personal-calendar:
    backgroundColor: "{colors.surface.value}"
    textColor: "rgb(75, 85, 99)"
    borderColor: "{colors.surface.value}"
    hoverBackgroundColor: "{colors.surface.value}"
    hoverTextColor: "rgb(75, 85, 99)"
    hoverBorderColor: "{colors.surface.value}"
    focusBackgroundColor: "{colors.surface.value}"
    focusTextColor: "rgb(75, 85, 99)"
    focusBorderColor: "{colors.surface.value}"
    activeBackgroundColor: "{colors.surface.value}"
    activeTextColor: "rgb(75, 85, 99)"
    activeBorderColor: "{colors.surface.value}"
    rounded: "4px"
    padding: "2px 6px"
  badge-user-color:
    backgroundColor: "soft tint derived from the member personal color"
    textColor: "derived readable text from the same personal color"
    borderColor: "soft tint derived from the member personal color"
    typography: "{typography.sizes.meta} / {typography.weights.semibold}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    usage: "avatar, small badge, status dot, or schedule marker only"
  sidebar-item:
    backgroundColor: "transparent"
    textColor: "rgba(255, 255, 255, 0.72)"
    borderColor: "transparent"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
    height: "auto"
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-active.value}"
    textColor: "{colors.surface.value}"
    borderColor: "transparent"
    accentStripColor: "{colors.accent.value}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

This guide is based on the current Daylog codebase, especially the shared tokens and reusable UI patterns in `tailwind.config.ts`, `app/globals.css`, shared `ui` primitives, the project board, the notification inbox, the memo flow, attendance and calendar UIs, and the workspace settings/profile screens.

## Brand & Style

Daylog should feel like a calm work management SaaS, not a landing page experiment. The product tone is operational, structured, and easy to scan. White surfaces, thin gray borders, restrained shadows, and quiet typography are the default language.

The current codebase still contains some legacy warm tokens and a few page-level variations, but the canonical direction is the newer white-and-gray redesign system. This document treats that redesign layer as the main standard and narrows future work toward one reusable system instead of page-by-page styling.

Use accent color as a single focused signal for primary actions, active icons, and limited emphasis. Keep the rest of the UI neutral. Strong gradients, glossy glass effects, and attention-seeking color stacks do not fit Daylog.

Two exceptions are allowed because they already exist in the product tone:

- A small number of focal panels may use deeper contrast, such as the dashboard check-in card and the dark desktop sidebar.
- Memo notes may use soft paper-like tints from the memo palette, but those note colors should stay inside the memo feature and must not spread into the global app system.

## Colors

The main app canvas is `#F4F5F7`, with `#FFFFFF` as the default interactive surface. Supporting surfaces use `#F8F9FA` and `#F1F5F9`. Borders are primarily `#E5E7EB`, with `#F3F4F6` reserved for inner dividers and separators.

Text should stay dark but quiet:

- High-emphasis text: `#111827`
- Default body text: `#4B5563`
- Secondary text: `#6B7280`
- Muted text and placeholders: `#9CA3AF`

Accent is based on `#4F7CFF` and its related hover and soft states. In code, the accent may be replaced by the workspace theme variables, so new UI should prefer `var(--accent)`, `var(--accent-hover)`, and `var(--accent-light)` rather than hardcoding blue unless a fixed semantic color is required.

Semantic colors are reserved for status meaning, not general decoration:

- Success: `#2A8C50`
- Warning: `#F97316`
- Danger: `#EF4444`
- Purple: `#8B5CF6` for secondary review or idea emphasis

Selected tab and filter controls should now standardize on a dark neutral fill:

- Background: `#111827`
- Text: `#FFFFFF`
- Border: `#111827`

This is an intentional system rule for shared tabs and filters, even though a few existing older controls still use accent-blue selected states. Going forward, reusable tab and filter controls should converge on the dark selected token so selection is clear without becoming loud.

Default tab and filter controls should stay quiet:

- Background: `#FFFFFF`
- Border: `#E5E7EB`
- Text: `#6B7280`
- Hover background: `#F8F9FA`

## Typography

Daylog uses a sans-first product voice. In practice, the live UI is centered on `Geist Sans` with `Noto Sans KR` fallback for Korean text. Display headings should not become decorative or editorial. They should read like product headings, not marketing headlines.

Recommended scale:

- Metadata and compact labels: `11px`
- Form labels and small chips: `12px`
- Default body text: `13.5px`
- Comfortable body text: `14.5px`
- Small page and modal titles: `16px`
- Section titles and important modal headings: `18px`
- Dashboard stat values: `28px`

Weights should stay in the `500` to `700` range for emphasis. Avoid very light weights. Avoid oversized hero text except when a screen already has a single focal summary card.

## Layout & Spacing

The default page recipe is:

`page-shell` -> `page-header` -> content sections

This pattern is already used across the dashboard, projects, notifications, memo, and settings. Use it as the baseline for new screens unless the feature already has a specialized layout, such as calendar or attendance.

Desktop structure:

- Dark sidebar for global navigation
- Top header for page title, date, notification, search, and settings
- Scrollable content area with generous outer padding

Spacing should stay consistent and practical:

- `24px` between major sections
- `16px` inside most card stacks
- `12px` for control gaps inside dense forms
- `8px` for small badge, chip, and inline tool gaps

Feature-specific layout rules that match the current product:

- Settings uses a left sticky navigation column around `220px` wide.
- Project board filters sit above the content, not inside each card.
- Notifications use stacked list cards grouped by date.
- Attendance alternates between calendar and list views but keeps the same neutral shell.
- Calendar uses a split layout with a filter sidebar and a main grid panel.

## Elevation & Depth

Depth should be subtle and structural, not dramatic.

Default surface behavior:

- Cards: very light shadow, usually `0 1px 2px rgba(15, 23, 42, 0.06)`
- Hoverable cards: slight border emphasis or `translateY(-1px)` with a restrained shadow
- Dense operational pages: it is acceptable to remove hover lift entirely if motion feels noisy

Modal depth can be stronger than cards because it needs separation from the page, but it should still look crisp rather than cinematic. Use white surfaces, clean edges, and shadow for separation. Do not layer heavy blur, glow, or multi-color lighting.

The only place where stronger contrast is acceptable is a purposeful focal surface such as the dashboard attendance card or the fixed dark sidebar. Even there, keep the shape clean and the color story limited.

## Shapes

Daylog shapes are soft, not playful. Radii should feel modern and consistent:

- Small utility controls: `8px`
- Standard buttons and inputs: `12px`
- Standard cards and tabs: `14px`
- Larger panels and feature cards: `18px`
- Detail modals and full-feature forms: `20px`
- Hero and page header panels: up to `22px`
- Chips and badges: full pill radius

Cards and modals should always prioritize border clarity over shape theatrics. Rounded corners are important, but they should never become bubble-like.

## Components

`button-primary` is the standard save, create, submit, and confirm action. Use the accent fill, white text, `12px` rounding, and the existing restrained blue shadow. The hover state should only move to `{colors.accent-hover.value}`.

`button-secondary` is the default neutral action. It should stay white with a light gray border, muted text, and a soft `#F8F9FA` hover. Do not create separate page-specific "light" buttons when this token already fits.

`tab-selected` is the system-level standard for selected tab and filter buttons. Use `#111827` background, white text, and a matching dark border. This should apply to shared tabs, filter pills, and segmented view selectors that act like a selection state.

`tab-default` is the unselected state for those same controls. Use white background, `#E5E7EB` border, `#6B7280` text, and a very soft `#F8F9FA` hover.

`chip-default` is for neutral informational chips. It should use a subtle filled or lightly bordered neutral surface and never overpower the content around it.

`chip-selected` follows the same dark-selected logic as tabs when a chip is acting like a filter or multi-select control. Do not make selected chips bright blue if they function as a selection state rather than a primary action.

`chip-personal-calendar` is a special exception. It must keep:

- Background: `#FFFFFF`
- Border: `#FFFFFF`
- Text: `rgb(75, 85, 99)`

This exact white-border rule must remain true in hover, focus, and active states as well. This exception is only for personal schedule chips. It must not be copied to project schedule chips, company shared schedule chips, attendance chips, leave chips, or holiday chips.

`badge-user-color` is only for identity accents such as avatars, tiny dots, mini badges, schedule markers, or soft personal-color previews inside profile settings. Member personal colors must not spread into whole panels, primary actions, or large layout accents.

Comment and feed policy for personal color:

- Username text stays dark neutral, not personal-color tinted.
- Personal color belongs on the avatar or a very small badge-like indicator.
- The interface should still look like one product, not eight personal themes layered together.

`card-default` is the standard for project cards, notifications, settings panels, drawers, and list sections: white background, light border, soft radius, and minimal shadow.

`card-hover` should remain subtle. Use a slightly stronger border or a small shadow. Avoid aggressive color shifts on hover. Attendance, docs, or other dense operational screens may choose to keep hover almost flat.

`modal-panel` should be centered, white, softly rounded, and spacious. Header, body, and footer should read as separate zones with clear separators. Footer actions should align consistently and never feel cramped.

`input-field` should stay white with a light border and readable placeholder text. Focus must use a clear accessible border or ring, based on the existing blue focus treatment. Error states should use restrained soft-red surfaces and readable dark-red text, not saturated warning boxes.

`sidebar-item` should stay transparent in its resting state with softened white text over the dark sidebar. Hover may use the quiet `#22252D` state.

`sidebar-item-active` should use `#2A2D36` with white text and the existing accent strip. This active state already matches the current product tone and should remain stable.

Feature notes based on the current UI:

- Notifications should continue to use stacked `list-card` patterns with small status badges and one clear unread indicator.
- Memo cards may use soft note colors, but their typography, spacing, and hover behavior should still stay consistent with the broader product language.
- Attendance detail and request modals should use the same clean white panel logic as project and calendar modals.
- Calendar drawers and modals should stay neutral and structured, with color mainly reserved for event identity and semantic states.

## Do's and Don'ts

Do reuse shared button, input, chip, badge, card, and modal patterns instead of restyling the same control per page.

Do keep selected tabs and filter buttons dark and readable, with white text and a controlled border.

Do keep default tabs and filters white, bordered, and quiet.

Do keep personal schedule chips white with white borders in all interactive states.

Do use member personal colors only for user identification accents such as avatars, dots, and tiny badges.

Do keep cards white, lightly bordered, softly rounded, and visually calm.

Do keep modals centered, padded, and structurally separated into header, body, and footer.

Do keep input focus states accessible and error states restrained.

Do allow special-case feature accents only when they already serve a clear product role, such as memo note tints or the dashboard attendance focal card.

Do not invent a new primary button style for each page.

Do not add decorative gradients to standard cards, modals, or forms.

Do not mix several strong colors inside one workflow unless they represent actual status meaning.

Do not introduce glassmorphism, neon glow, or heavy shadow stacks.

Do not expand personal member colors into global theming or comment-name text styling.

Do not turn functional changes into unrequested redesign work.

Do not change existing UX flows just because a screen is being touched for a different feature.
