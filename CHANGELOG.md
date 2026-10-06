## 4.1.0 (2026-10-06)

### 🚀 Features

- Tailwind v4 parity with `@nativescript/core` 9.x ([#227](https://github.com/NativeScript/tailwind/pull/227)):
  - responsive and media variants (`sm:`–`2xl:`, `max-*:`, `portrait:`/`landscape:`, media-based `dark:`, arbitrary `[@media(...)]`) are rewritten into queries core evaluates instead of being dropped
  - `gap-*`, `max-w-*`/`max-h-*`, `whitespace-*`, `text-ellipsis`, `corner-shape`, and other core-supported properties are no longer stripped
  - `translate-*`/`scale-*` compose into `transform:`
  - logical spacing and border utilities (`ps-*`, `pe-*`, `ms-*`, `me-*`, `border-s/e`, `border-x/y`, `divide-*`) map to physical sides, flipping under `.ns-rtl` (core 9.0+)

### 🩹 Fixes

- `dark:` and other `:where()` variants no longer match every descendant of `.ns-dark` ([#227](https://github.com/NativeScript/tailwind/pull/227))
- `space-*` and `divide-*` gaps sit between items ([#227](https://github.com/NativeScript/tailwind/pull/227))
- rem values with a multi-digit integer part convert correctly (`12.5rem` → `200`) ([#227](https://github.com/NativeScript/tailwind/pull/227))

### ⚠️ Behavior changes

- Breakpoint, orientation, and media-based `dark:` variants now apply. Classes that were silently ignored before can change layouts.
- `invisible` keeps the element's layout space (`visibility: hidden`), matching the web; use `collapse` to remove it from layout.

### ❤️ Thank You

- Alec Larson @aleclarson
- Nathan Walker

## 4.0.10 (2026-09-01)

### 🩹 Fixes

- allow `tint-color` and `vertical-align: middle` ([#223](https://github.com/NativeScript/tailwind/pull/223))

### ❤️ Thank You

- Nathan Walker
