/**
 * Measuring phases are time windows in the teacher's local time: a day, or a week from Monday.
 * Which one a class uses is still open (docs/concept.md), so pages show both where it matters.
 */
export type PhaseKind = 'day' | 'week';

export function phaseStart(kind: PhaseKind, at = new Date()): Date {
  const start = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  // getDay() is 0 on Sunday, the last day of the week here
  if (kind === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function nextPhaseStart(kind: PhaseKind, start: Date): Date {
  const next = new Date(start);
  next.setDate(next.getDate() + (kind === 'week' ? 7 : 1));
  return next;
}

/**
 * Starts of `count` consecutive phases, oldest first. Days begin on the Monday of the oldest week,
 * so they fill a Monday-to-Sunday calendar grid; the current week's later days lie in the future.
 */
export function phaseStarts(kind: PhaseKind, count: number, at = new Date()): Date[] {
  const thisWeek = phaseStart('week', at);
  const first = new Date(thisWeek);
  first.setDate(
    first.getDate() - (kind === 'week' ? 7 * (count - 1) : 7 * Math.ceil(count / 7) - 7),
  );
  const starts = [first];
  while (starts.length < count) starts.push(nextPhaseStart(kind, starts.at(-1)!));
  return starts;
}

/** Sums `events` into the phases that begin at `starts` (as returned by `phaseStarts`). */
export function waterPerPhase(
  events: { amount: number; createdAt: string }[],
  kind: PhaseKind,
  starts: Date[],
): number[] {
  const index = new Map(starts.map((s, i) => [s.getTime(), i]));
  const totals = starts.map(() => 0);
  for (const e of events) {
    const i = index.get(phaseStart(kind, new Date(e.createdAt)).getTime());
    if (i !== undefined) totals[i]! += e.amount;
  }
  return totals;
}
