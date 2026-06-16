# Mobile-First Guide

Mobile-first design is a core rule for Agora na Copa 26.

This guide defines how to design and build interfaces starting from the
smallest practical viewport, then progressively enhance for larger screens and
more capable devices.

## Goal

Deliver interfaces that work well on small screens first, with clear content
priority, touch-friendly interaction, and progressive enhancement for tablets,
desktops, and richer input modes.

## In this project

**Primary use case**: viewers checking match details, broadcaster schedules, and
live scores on a phone during a World Cup match. The Partidas tab (match selector
+ scoreboard + pitch lineup) is the critical mobile flow.

**Tooling**: Tailwind v4 responsive prefixes (`sm:`, `md:`, `lg:`) instead of
raw CSS media queries. The CSS examples in this guide show the underlying
pattern — translate to Tailwind utilities when implementing.

**Design system**: glassmorphism conventions defined in `src/index.css` and
`DESIGN.md` — consult before adding new UI surfaces. Typography: Anton for
display text, Archivo Narrow for dense UI, JetBrains Mono for clocks and stats.

**Theming**: `"classic-light"` / `"stadium-dark"` — passed explicitly as a prop,
not via Tailwind `dark:` utilities. Both themes must work at all breakpoints.

**Touch targets**: the pitch lineup (`PitchLineup.tsx`) and match selector chips
are the highest-risk areas for inadequate touch targets — verify at mobile
viewport sizes before shipping.

## What Mobile-First Means

Mobile-first means the default experience is designed for constrained devices:

- small screens
- touch input
- variable network quality
- limited CPU and memory
- interrupted attention

Larger layouts and richer interactions are added only when they improve the
experience and do not undermine the base flow.

## Why It Matters

1. It forces prioritization of essential content and actions.
2. It reduces CSS override complexity by using progressive enhancement.
3. It improves usability for touch devices and small viewports.
4. It usually leads to better performance under real-world constraints.
5. It produces layouts that adapt more cleanly across device classes.

## Mobile-First and Code LLMs

Mobile-first structure also helps LLM-assisted work.

When responsive behavior starts from a small, explicit default and is enhanced
through clear breakpoint layers, code-focused models can understand the intended
behavior faster and edit it with less risk. The base state is easier to infer,
and larger-screen changes are easier to isolate.

### Why LLMs Benefit

- Base behavior is explicit instead of hidden behind many overrides.
- Breakpoint logic is easier to scan when it grows upward from defaults.
- Small-screen constraints make content priority more visible.
- Responsive changes stay localized instead of being spread across exceptions.

### Where Non-Mobile-First Designs Hurt LLMs

- Desktop defaults often require scattered mobile overrides.
- `max-width` patches can hide the real base behavior.
- Hover-first assumptions are easy to miss in reviews and edits.
- Performance and touch constraints may be absent from local context.

## Required Rules

1. Define the base layout, typography, spacing, and interaction model for the
   smallest supported viewport first.
2. Use progressive enhancement with `min-width` breakpoints by default.
3. Prioritize essential content and actions before secondary controls or visual
   decoration.
4. Design interactions for touch first; hover and precision-pointer behavior is
   optional enhancement.
5. Avoid relying on desktop-only assumptions such as wide tables, persistent
   sidebars, or hover-only disclosure.
6. Prefer layouts that naturally reflow before introducing breakpoint-specific
   exceptions.
7. Keep performance budgets biased toward mobile network and device conditions.
8. Test the base flow on small viewports before optimizing larger layouts.

## Positive Signals

- The default stylesheet works well without any media query.
- Breakpoints use `min-width` and add capability rather than undo defaults.
- Primary actions are visible and reachable without horizontal scrolling.
- Interactive controls are sized and spaced for touch.
- Small-screen content order matches task priority.
- Heavier assets or enhancements load conditionally instead of by default.

## Warning Signs

- The base layout assumes desktop width and is later overridden for mobile.
- Responsive rules are mostly `max-width` fixes undoing large-screen defaults.
- Key interactions depend on hover states with no touch equivalent.
- Important actions disappear below the fold because decorative content comes
  first.
- Fixed widths, large margins, or wide tables force horizontal scrolling.
- Small screens receive the same heavy assets and scripts as desktop by default.

## Core Principles

### Content First

Essential content and actions should appear before secondary navigation,
analytics, promotions, or decoration.

Ask these questions in order:

1. What must the user understand immediately?
2. What must the user be able to do immediately?
3. What can wait until more screen space is available?

### Progressive Enhancement

Start with a complete base experience and enhance upward:

```text
Small viewport base -> larger layout enhancements -> richer capability enhancements
```

Enhancements may include:

- multi-column layouts
- denser navigation
- inline filters or tool panels
- richer media presentation
- hover affordances for fine pointers

### Touch-First Interaction

Design for fingers first, then enhance for mouse and trackpad:

- minimum touch target: 44x44px, with 48x48px preferred
- adequate spacing between adjacent controls
- clear pressed, focused, and disabled states
- no critical behavior hidden behind hover alone

### Performance First

Mobile-first is not only about layout. It also means optimizing:

- initial payload
- rendering cost
- font and image loading
- script execution
- layout stability

The small-screen experience should not depend on heavy resources that are only
valuable on larger displays.

## Standard Workflow

### 1. Define the Base Layout

Write base styles without a media query:

```css
.page {
    width: 100%;
    padding: 16px;
}

.stack {
    display: grid;
    gap: 16px;
}

.primary-action {
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
}
```

### 2. Enhance Upward with `min-width`

Add width and layout enhancements only when screen space justifies them:

```css
@media (min-width: 768px) {
    .page {
        max-width: 720px;
        margin: 0 auto;
        padding: 24px;
    }

    .actions {
        display: flex;
        gap: 12px;
    }

    .primary-action {
        width: auto;
        min-width: 160px;
    }
}

@media (min-width: 1024px) {
    .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
        gap: 24px;
    }
}
```

### 3. Add Capability-Based Enhancements

Do not assume all large screens support hover, and do not assume all small
screens are touch-only.

```css
@media (hover: hover) and (pointer: fine) {
    .interactive:hover {
        background: var(--interactive-hover);
    }
}

@media (hover: none) and (pointer: coarse) {
    .interactive:active {
        background: var(--interactive-active);
    }
}
```

## Breakpoint Guidance

Choose breakpoints based on layout pressure, not on specific device brands.

### Common Reference Points

```css
/* Base: small mobile, no media query */

/* Larger phones */
@media (min-width: 375px) { }

/* Small tablets / large mobile landscape */
@media (min-width: 640px) { }

/* Tablets */
@media (min-width: 768px) { }

/* Small laptops / desktop */
@media (min-width: 1024px) { }

/* Wide desktop */
@media (min-width: 1440px) { }
```

### Breakpoint Rules

1. Add a breakpoint only when the current layout starts to break down.
2. Prefer a small set of stable breakpoints over many narrow device-specific
   bands.
3. Let components reflow naturally before introducing new grid definitions.
4. Keep breakpoint values centralized when a project uses shared design tokens.

## Layout Patterns

### Stacked to Horizontal

```css
.nav {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

@media (min-width: 768px) {
    .nav {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}
```

### Single Column to Multi-Column Grid

```css
.cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

@media (min-width: 768px) {
    .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (min-width: 1024px) {
    .cards {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}
```

### Inline Sidebar as Enhancement

```css
.page-layout {
    display: grid;
    gap: 20px;
}

@media (min-width: 1024px) {
    .page-layout {
        grid-template-columns: minmax(0, 1fr) 320px;
        align-items: start;
    }
}
```

### Fixed Elements Only When Justified

Persistent fixed headers, floating controls, and side panels can consume too
much space on small screens. Make them opt-in enhancements.

```css
.header {
    position: static;
}

@media (min-width: 1024px) {
    .header {
        position: sticky;
        top: 0;
    }
}
```

## Typography and Spacing

### Use Readable Defaults

```css
body {
    font-size: 1rem;
    line-height: 1.5;
}

input,
select,
textarea,
button {
    font: inherit;
}
```

### Prefer Relative Units

```css
.section {
    padding: 1rem;
    margin-block: 1.5rem;
}

.headline {
    font-size: clamp(1.5rem, 5vw, 3rem);
}
```

### Avoid Small-Screen Density by Default

Do not pack dense tables, small text, or tight controls into the base layout.
Increase density only when space and pointer precision allow it.

## Forms and Inputs

### Form Rules

1. Stack fields by default.
2. Use labels that remain visible without relying on placeholder text.
3. Prefer input types and `inputmode` values that improve mobile keyboards.
4. Keep validation messages visible near the relevant field.
5. Avoid multi-column forms until the viewport clearly supports them.

### Example

```html
<label for="email">Email</label>
<input
    id="email"
    name="email"
    type="email"
    inputmode="email"
    autocomplete="email"
>

<label for="phone">Phone</label>
<input
    id="phone"
    name="phone"
    type="tel"
    inputmode="tel"
    autocomplete="tel"
>
```

### Enhanced Form Layout

```css
.form-grid {
    display: grid;
    gap: 16px;
}

@media (min-width: 768px) {
    .form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
```

## Touch, Focus, and State

### Touch Targets

```css
.touch-target {
    min-width: 48px;
    min-height: 48px;
}
```

### Focus Visibility

Keyboard and assistive-technology users still need strong focus treatment on
every viewport.

```css
.interactive:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
}
```

### State Clarity

Disabled, loading, selected, expanded, and error states should be visually and
semantically explicit.

```html
<button type="button" aria-disabled="true">Save</button>
<div role="status" aria-live="polite">Saving changes...</div>
```

## Media and Assets

### Responsive Images

```html
<img
    src="image-640.jpg"
    srcset="image-640.jpg 640w, image-1280.jpg 1280w"
    sizes="(min-width: 1024px) 50vw, 100vw"
    loading="lazy"
    alt="Descriptive alternative text"
>
```

### Asset Rules

1. Do not send large desktop assets to all devices by default.
2. Use responsive images and modern formats where supported.
3. Lazy load below-the-fold media when appropriate.
4. Avoid decorative media that blocks the primary mobile task.

## Performance Guidance

### Favor a Light Base Experience

```html
<link rel="preconnect" href="https://fonts.example.com">
<link rel="stylesheet" href="/styles.css">
```

```javascript
if (window.matchMedia("(min-width: 1024px)").matches) {
    import("./desktop-enhancements.js");
}
```

### Performance Review Heuristics

- Is the primary mobile task usable before non-essential scripts finish?
- Are above-the-fold resources prioritized?
- Are layout shifts minimized when assets load?
- Are desktop-only enhancements deferred?

## Accessibility Guidance

Mobile-first work must remain accessible across devices and input modes.

### Required Accessibility Checks

1. Text remains readable without zooming tricks or fixed-height clipping.
2. Focus order follows the visible content order.
3. Controls have accessible names and clear state.
4. Color contrast remains sufficient in all responsive variants.
5. Orientation changes do not break the primary flow.
6. Zoom and text scaling do not hide content or disable actions.

## Testing Guidance

### Minimum Viewport Coverage

Test at least:

1. a narrow mobile viewport
2. a wider phone or small landscape viewport
3. a tablet viewport
4. a desktop viewport

Use real devices when possible, especially for touch behavior, keyboards,
scrolling, viewport height quirks, and performance.

### Testing Checklist

```markdown
## Mobile-First Review Checklist

### Layout
- [ ] No horizontal scrolling in the primary flow
- [ ] Content order matches task priority on small screens
- [ ] Navigation and actions remain reachable on narrow viewports

### Interaction
- [ ] Touch targets are large enough and well spaced
- [ ] No critical behavior depends on hover only
- [ ] Keyboard focus remains visible and usable

### Forms
- [ ] Labels, inputs, and validation remain clear on small screens
- [ ] Mobile keyboards are appropriate for the input type
- [ ] Submission and recovery flows are usable without precision pointing

### Performance
- [ ] The primary mobile task works before non-essential enhancements load
- [ ] Images and scripts are not oversized for the base experience
- [ ] Layout shifts are controlled

### Accessibility
- [ ] Text scaling does not break the layout
- [ ] Screen readers can identify controls and states
- [ ] Contrast remains sufficient across breakpoints
```

## Review Heuristics

### Base Experience Test

If all media queries were removed, would the remaining layout still support the
core user task on a small screen?

### Enhancement Test

Does each breakpoint add value, or is it mostly undoing poor defaults?

### Input-Mode Test

Can the core flow be completed with touch, keyboard, and assistive technology
without relying on hover-only behavior?

### Payload Test

Are small-screen users paying for assets and behaviors that only benefit larger
screens?

## Preferred Fixes

1. Move the smallest-screen layout into the base styles.
2. Replace `max-width` rescue rules with `min-width` enhancements where
   practical.
3. Simplify content order so primary tasks appear first on narrow screens.
4. Replace hover-only controls with explicit buttons or touch-safe patterns.
5. Defer or conditionally load enhancements that are not needed for the base
   flow.
6. Reduce fixed widths and let components reflow naturally.

## Related Guides

- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md)
- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md)

## Summary Checklist

- [ ] Base styles support the smallest target viewport.
- [ ] Responsive behavior is built with progressive enhancement.
- [ ] Content and actions are prioritized for small screens.
- [ ] Touch targets and state feedback support touch-first interaction.
- [ ] Desktop-specific enhancements are not required for the core flow.
- [ ] Performance decisions are biased toward constrained devices.
- [ ] Accessibility holds across breakpoints and input modes.
- [ ] Breakpoints add capability instead of undoing defaults.
