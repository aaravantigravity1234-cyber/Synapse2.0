## 2025-05-06 - Interactive Element Accessibility Issues

**Learning:** It's important to not use `tabindex="-1"` on interactive elements like icon buttons or password toggles as it unintentionally breaks keyboard accessibility. We should always make sure these icon-only elements have descriptive `aria-label` attributes to maintain screen reader accessibility.
**Action:** When creating interactive elements like icon buttons or toggles, verify they are focusable by keyboard (e.g. they don't have `tabindex="-1"`) and ensure they contain an `aria-label`.
