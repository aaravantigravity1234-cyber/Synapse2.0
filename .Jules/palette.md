## 2024-05-18 - Keyboard Accessibility Anti-Pattern on Password Toggles
**Learning:** Found an accessibility issue where `tabindex="-1"` was used on interactive elements like the password visibility toggle (`#toggle-password`), which intentionally but erroneously breaks standard keyboard navigation. Users rely on keyboard to easily toggle the password visibility.
**Action:** Do not use `tabindex="-1"` on interactive elements like icon buttons or toggles. Ensure they are accessible via `Tab` order and include descriptive `aria-label` attributes for screen readers.
