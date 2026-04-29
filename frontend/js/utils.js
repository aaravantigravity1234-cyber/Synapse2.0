/**
 * Utility functions for the Synapse AI frontend.
 */

/**
 * Formats a timestamp into a relative time string (e.g., "Just now", "5m ago", "Yesterday").
 * @param {number} timestamp - The timestamp to format.
 * @returns {string} - The formatted relative time string.
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatRelativeTime
  };
}
