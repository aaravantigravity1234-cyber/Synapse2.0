## 2024-05-09 - [Password Toggle Keyboard Accessibility]
**Learning:** Using `tabindex="-1"` on interactive elements like the password toggle icon button intentionally breaks keyboard accessibility, preventing users from accessing it via the `Tab` key.
**Action:** Do not use `tabindex="-1"` on interactive buttons. Ensure all buttons are keyboard focusable by default.
