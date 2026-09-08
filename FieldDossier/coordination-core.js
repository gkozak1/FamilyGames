(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.FIELD_COORDINATION_CORE = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PERSONAS = ['scarlet','peacock','mustard','plum'];

  function pressCount(attempt) {
    return PERSONAS.filter(p => attempt?.presses?.[p]).length;
  }

  function pressSpreadMs(attempt) {
    const times = PERSONAS.map(p => Number(attempt?.presses?.[p]?.at)).filter(Number.isFinite);
    if (!times.length) return null;
    return Math.max(...times) - Math.min(...times);
  }

  function qualifies(attempt, windowMs = 5000) {
    if (!attempt || attempt.status !== 'arming') return false;
    if (pressCount(attempt) !== 4) return false;
    const spread = pressSpreadMs(attempt);
    return Number.isFinite(spread) && spread <= windowMs;
  }

  function expired(attempt, now) {
    return Boolean(attempt && attempt.status === 'arming' && Number(now) > Number(attempt.deadlineAt));
  }

  function makeAttempt({ attemptId, sequence, now, persona, uid, windowMs = 5000 }) {
    return {
      attemptId,
      sequence,
      status: 'arming',
      startedAt: now,
      deadlineAt: now + windowMs,
      presses: { [persona]: { at: now, uid: uid || '' } }
    };
  }

  function applyPress(current, { attemptId, now, persona, uid, windowMs = 5000 }) {
    if (current && current.status === 'arming' && expired(current, now)) {
      return JSON.parse(JSON.stringify(current));
    }
    const fresh = !current || current.status !== 'arming';
    const next = fresh
      ? makeAttempt({ attemptId, sequence: Number(current?.sequence || 0) + 1, now, persona, uid, windowMs })
      : JSON.parse(JSON.stringify(current));
    next.presses ||= {};
    next.presses[persona] = { at: now, uid: uid || '' };
    return next;
  }

  return { PERSONAS, pressCount, pressSpreadMs, qualifies, expired, makeAttempt, applyPress };
});
