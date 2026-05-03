## 2024-05-15 - Removed tabindex="-1" from Password Toggle
**Learning:** Setting `tabindex="-1"` on interactive elements (like the password toggle button) intentionally breaks standard keyboard accessibility, making it impossible for users navigating via keyboard to toggle password visibility.
**Action:** Always ensure interactive elements are focusable by removing `tabindex="-1"` (or setting it to 0 if necessary).
