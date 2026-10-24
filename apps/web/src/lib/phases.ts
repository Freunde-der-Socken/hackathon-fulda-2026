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
