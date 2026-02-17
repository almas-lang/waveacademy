/**
 * Parse and clamp pagination params from query string.
 * Prevents negative pages, zero/negative limits, and absurdly large limits.
 */
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = { parsePagination };
