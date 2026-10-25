// CO2 estimate (docs/concept.md, "CO2 estimate"). We have no CO2 sensor, so the API calculates the
// concentration with a single-zone mass balance: dC/dt = N·G·10⁶/V − λ·(C − C_out). For constant
// N and λ it relaxes exponentially towards C_out + N·G·10⁶/(V·λ).

/** Room and ventilation the estimate assumes. Rates are per hour. */
export interface Co2Room {
  /** Air volume in m³. */
  volume: number;
  /** People in the room during a lesson. The room is empty during the break. */
  people: number;
  /** CO2 one person exhales, in m³/h. */
  perPerson: number;
  /** Outdoor air, in ppm. */
  outdoor: number;
  /** Air changes per hour with the windows closed (lesson) and wide open (break). */
  airChangesLesson: number;
  airChangesBreak: number;
  /** One lesson and one break form a cycle, counted from the Unix epoch. */
  lessonMinutes: number;
  breakMinutes: number;
}

// Fixed demo values. A 60 minute cycle starts every lesson at a full hour.
export const DEMO_ROOM: Co2Room = {
  // 60 m² floor, 3 m ceiling
  volume: 180,
  // 24 students and a teacher
  people: 25,
  // 18 L/h, sitting quietly
  perPerson: 0.018,
  outdoor: 420,
  airChangesLesson: 0.5,
  airChangesBreak: 6,
  lessonMinutes: 45,
  breakMinutes: 15,
};

const HOUR_MS = 3_600_000;

// Concentration `hours` into a phase that starts at `start` and tends towards `steady`
const relax = (start: number, steady: number, airChanges: number, hours: number) =>
  steady + (start - steady) * Math.exp(-airChanges * hours);

/** Estimated CO2 in ppm at a point in time. */
export function estimateCo2(at: Date, room: Co2Room = DEMO_ROOM): number {
  const lessonHours = room.lessonMinutes / 60;
  const breakHours = room.breakMinutes / 60;
  const steady =
    room.outdoor + (room.people * room.perPerson * 1e6) / (room.volume * room.airChangesLesson);
  const keptLesson = Math.exp(-room.airChangesLesson * lessonHours);
  const keptBreak = Math.exp(-room.airChangesBreak * breakHours);
  // The cycle repeats, so the break has to end where the lesson started. Both phases are linear in
  // their start value, which makes that start value the solution of a linear equation.
  const lessonStart =
    (room.outdoor * (1 - keptBreak) + keptBreak * steady * (1 - keptLesson)) /
    (1 - keptBreak * keptLesson);

  const cycleMs = (room.lessonMinutes + room.breakMinutes) * 60_000;
  const hours = (((at.getTime() % cycleMs) + cycleMs) % cycleMs) / HOUR_MS;
  if (hours < lessonHours) return relax(lessonStart, steady, room.airChangesLesson, hours);
  const lessonEnd = relax(lessonStart, steady, room.airChangesLesson, lessonHours);
  return relax(lessonEnd, room.outdoor, room.airChangesBreak, hours - lessonHours);
}

/** Up to here the air is fine (Umweltbundesamt: hygienically harmless), the LED ring is green. */
export const CO2_GOOD = 1000;
/** From here the air is unacceptable (Umweltbundesamt), the LED ring is red. */
export const CO2_BAD = 2000;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * LED ring color in measuring mode: green up to CO2_GOOD, then the hue slowly slides over yellow
 * to red at CO2_BAD.
 */
export function co2Color(ppm: number): Rgb {
  const share = Math.min(Math.max((ppm - CO2_GOOD) / (CO2_BAD - CO2_GOOD), 0), 1);
  // Hue 120° (green) to 0° (red) at full saturation, so one channel always stays at 255
  const hue = 120 * (1 - share);
  return hue >= 60
    ? { r: Math.round((255 * (120 - hue)) / 60), g: 255, b: 0 }
    : { r: 255, g: Math.round((255 * hue) / 60), b: 0 };
}
