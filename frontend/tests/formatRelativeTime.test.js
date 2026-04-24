const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

// 1. Read the frontend chat.js file
const chatJsPath = path.join(__dirname, '../js/chat.js');
const chatJsCode = fs.readFileSync(chatJsPath, 'utf8');

// 2. Set up a JSDOM environment with the script included directly
const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="chat-messages"></div>
  <input id="chat-input" />
  <button id="send-btn"></button>
  <div id="hero-section"></div>
  <div id="empty-state"></div>
  <div id="suggestion-chips-container"></div>
  <div id="user-display-name"></div>
  <div id="user-avatar"></div>
  <button id="logout-btn"></button>
  <button id="nav-new-chat-btn"></button>
  <button id="nav-history-btn"></button>
  <div id="history-modal"></div>
  <div id="history-modal-content"></div>
  <button id="close-history-btn"></button>
  <div id="history-list-container"></div>
  <button id="drawer-toggle"></button>
  <div id="header-logo"></div>
  <button id="attach-btn"></button>
  <input id="file-input" />
  <div id="attachment-preview-container"></div>
  <button id="model-selector-btn"></button>
  <div id="model-dropdown"></div>
  <div id="current-model-name"></div>
  <button id="settings-btn"></button>
  <div id="settings-modal"></div>
  <button id="close-settings-btn"></button>
  <button id="cancel-settings-btn"></button>
  <button id="save-settings-btn"></button>
  <input id="persona-input" />
  <div class="model-option"></div>
  <div id="chat-footer"></div>
  <div class="footer-gradient"></div>
  <div id="code-preview-modal"></div>

  <script>
    // Provide minimal implementations for missing browser features
    window.visualViewport = { addEventListener: () => {} };
    window.generateId = () => "test-id";
    window.showToast = () => {};
    // Override localStorage specifically for JSDOM opaque origin error
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    });
    // Mock firebase auth
    window.auth = {
      onAuthStateChanged: (cb) => {
        cb({ uid: 'test-user', displayName: 'Test User' });
      }
    };
    window.db = {};
  </script>
  <script>
    ${chatJsCode}
  </script>
</body>
</html>
`;

// use a local URL to avoid opaque origin issues with localStorage
const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost" });

// Ensure the function was defined globally
if (typeof dom.window.formatRelativeTime !== 'function') {
  console.error("formatRelativeTime function was not found on the window object after loading chat.js");
  process.exit(1);
}
const formatRelativeTime = dom.window.formatRelativeTime;

// 4. Run tests
const originalDateNow = dom.window.Date.now;

try {
  console.log("🧪 Running tests for formatRelativeTime...");

  // Set a fixed timestamp for "now" to make tests deterministic
  // '2023-10-15T12:00:00Z'
  const mockNow = new Date('2023-10-15T12:00:00Z').getTime();
  dom.window.Date.now = () => mockNow;

  const minMs = 60000;
  const hourMs = 3600000;
  const dayMs = 86400000;

  let passed = 0;
  let failed = 0;

  function runTest(name, inputTime, expectedOutput) {
    try {
      const result = formatRelativeTime(inputTime);
      assert.strictEqual(result, expectedOutput);
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ❌ FAIL: ${name}`);
      console.log(`     Expected: "${expectedOutput}"`);
      console.log(`     Got:      "${formatRelativeTime(inputTime)}"`);
      failed++;
    }
  }

  // --- Test Cases ---

  // < 1 minute (Just now)
  runTest("0 seconds ago", mockNow, "Just now");
  runTest("30 seconds ago", mockNow - 30 * 1000, "Just now");
  runTest("59 seconds ago", mockNow - 59 * 1000, "Just now");

  // < 60 minutes (m ago)
  runTest("1 minute ago", mockNow - 1 * minMs, "1m ago");
  runTest("5 minutes ago", mockNow - 5 * minMs, "5m ago");
  runTest("59 minutes ago", mockNow - 59 * minMs, "59m ago");

  // < 24 hours (h ago)
  runTest("1 hour ago", mockNow - 1 * hourMs, "1h ago");
  runTest("3 hours ago", mockNow - 3 * hourMs, "3h ago");
  runTest("23 hours ago", mockNow - 23 * hourMs, "23h ago");

  // == 1 day (Yesterday)
  runTest("24 hours ago", mockNow - 24 * hourMs, "Yesterday");
  runTest("47 hours ago", mockNow - 47 * hourMs, "Yesterday");

  // < 7 days (d ago)
  runTest("2 days ago (48h)", mockNow - 48 * hourMs, "2d ago");
  runTest("3 days ago", mockNow - 3 * dayMs, "3d ago");
  runTest("6 days ago", mockNow - 6 * dayMs, "6d ago");

  // >= 7 days (formatted date)
  const exactly7DaysAgo = mockNow - 7 * dayMs;
  const formatted7Days = new Date(exactly7DaysAgo).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  runTest("7 days ago", exactly7DaysAgo, formatted7Days);

  const olderDate = mockNow - 10 * dayMs;
  const formattedOlder = new Date(olderDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  runTest("10 days ago", olderDate, formattedOlder);

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
} finally {
  // Restore original Date.now
  dom.window.Date.now = originalDateNow;
}
