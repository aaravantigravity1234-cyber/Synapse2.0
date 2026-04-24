## 2026-04-24 - Added missing ARIA labels to icon-only buttons
**Learning:** Found a recurring pattern in the frontend where many Material Symbol icon-only buttons lacked 'aria-label' attributes, rendering them inaccessible to screen readers.
**Action:** Always verify that 'aria-label' attributes are present when using icon-only buttons like `<button><span class="material-symbols-outlined">icon</span></button>`.
