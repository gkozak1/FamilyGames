// Pure state helpers shared by synchronization and automated tests.
export function epochOf(remote) { return Number(remote?.meta?.epoch || 0); }
export function fragmentsOf(remote, facets) {
  const epoch = epochOf(remote);
  return facets.slice().sort((a, b) => a.partNumber - b.partNumber).map(f => {
    const record = remote?.fragments?.[f.id];
    return record?.epoch === epoch && record.code === f.code ? record.code : '';
  });
}
export function reconcile(previous, remote, facets) {
  const epoch = epochOf(remote);
  const reset = previous.epoch !== null && previous.epoch !== epoch;
  // An offline first visit cannot submit into a run that has already been reset.
  const unknownReset = previous.epoch === null && epoch !== 0;
  const pending = reset || unknownReset ? null : previous.pending;
  return { epoch, pending, reset: reset || unknownReset, assembly: fragmentsOf(remote, facets) };
}
