/**
 * Expand a recurring session into virtual occurrences within a date range.
 * Supports RRULE-style rules: FREQ=DAILY, FREQ=WEEKLY with BYDAY, and UNTIL.
 */

const DAY_MAP = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function toDateKey(date) {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function parseRule(rule) {
  const parts = {};
  for (const segment of rule.split(';')) {
    const [key, value] = segment.split('=');
    parts[key] = value;
  }
  return parts;
}

function parseUntilDate(until) {
  if (!until) return null;
  const year = parseInt(until.substring(0, 4));
  const month = parseInt(until.substring(4, 6)) - 1;
  const day = parseInt(until.substring(6, 8));
  return new Date(year, month, day, 23, 59, 59);
}

/**
 * Given a session with recurrenceRule, expand occurrences within [rangeStart, rangeEnd].
 * Returns an array of virtual session objects with adjusted startTime/endTime.
 */
function expandRecurringSession(session, rangeStart, rangeEnd) {
  if (!session.isRecurring || !session.recurrenceRule) return [session];

  const rule = parseRule(session.recurrenceRule);
  const freq = rule.FREQ;
  const until = parseUntilDate(rule.UNTIL);
  const effectiveEnd = until && until < rangeEnd ? until : rangeEnd;

  const baseStart = new Date(session.startTime);
  const duration = session.endTime
    ? new Date(session.endTime).getTime() - baseStart.getTime()
    : null;

  // Parse excluded dates (stored as ISO date strings like "2026-02-12")
  const excludedDates = new Set(
    Array.isArray(session.excludedDates) ? session.excludedDates : []
  );

  const occurrences = [];

  if (freq === 'DAILY') {
    let current = new Date(baseStart);
    while (current <= effectiveEnd) {
      if (current >= rangeStart && !excludedDates.has(toDateKey(current))) {
        occurrences.push(makeOccurrence(session, current, duration));
      }
      current.setDate(current.getDate() + 1);
    }
  } else if (freq === 'WEEKLY') {
    const days = rule.BYDAY
      ? rule.BYDAY.split(',').map(d => DAY_MAP[d])
      : [baseStart.getDay()];

    // Start from the week of baseStart, iterate week by week
    let weekStart = new Date(baseStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Go to Sunday of that week
    weekStart.setHours(0, 0, 0, 0);

    while (weekStart <= effectiveEnd) {
      for (const dayOfWeek of days) {
        const occurrence = new Date(weekStart);
        occurrence.setDate(occurrence.getDate() + dayOfWeek);
        // Set same time as base
        occurrence.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds());

        if (occurrence >= baseStart && occurrence >= rangeStart && occurrence <= effectiveEnd && !excludedDates.has(toDateKey(occurrence))) {
          occurrences.push(makeOccurrence(session, occurrence, duration));
        }
      }
      weekStart.setDate(weekStart.getDate() + 7);
    }
  }

  // If no occurrences found in range, still include the original if it falls in range
  if (occurrences.length === 0) {
    if (baseStart >= rangeStart && baseStart <= rangeEnd) {
      return [session];
    }
    return [];
  }

  return occurrences;
}

function makeOccurrence(session, date, duration) {
  const startTime = new Date(date);
  const endTime = duration ? new Date(startTime.getTime() + duration) : null;
  return {
    ...session,
    startTime,
    endTime,
    _isOccurrence: true, // marker for virtual occurrences
  };
}

module.exports = { expandRecurringSession };
