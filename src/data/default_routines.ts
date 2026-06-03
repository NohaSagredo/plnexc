export interface PresetRoutine {
  title: string;
  exercises: string[];
  description: string;
}

export const DEFAULT_PRESETS: PresetRoutine[] = [
  {
    title: "PLNEXC Rehab & Core (Rutina Preventiva)",
    exercises: [
      "McGill Curl-up",
      "Side Bridge / Plancha Lateral",
      "Bird Dog",
      "Spanish Squat (Banded)",
      "Banded Face Pull"
    ],
    description: "Ideal para días de recuperación activa, estabilización de columna baja y fortalecimiento de rodillas/hombros."
  },
  {
    title: "Full Body - Fuerza Base (3 días/sem)",
    exercises: [
      "Squat (Barbell)",
      "Bench Press (Barbell)",
      "Bent Over Row (Barbell)",
      "Plank",
      "Bicep Curl (Dumbbell)"
    ],
    description: "Rutina clásica de cuerpo completo enfocada en movimientos multiarticulares de fuerza absoluta."
  },
  {
    title: "Torso - Hipertrofia Estándar",
    exercises: [
      "Bench Press (Barbell)",
      "Pull Up",
      "Overhead Press (Barbell)",
      "Chest Supported Row (Dumbbell)",
      "Tricep Pushdown (Cable)",
      "Bicep Curl (Barbell)"
    ],
    description: "Estímulo de volumen medio-alto para el desarrollo muscular del tren superior."
  },
  {
    title: "Pierna - Cadena Posterior y Cuádriceps",
    exercises: [
      "Squat (Barbell)",
      "Romanian Deadlift (Barbell)",
      "Bulgarian Split Squat (Dumbbell)",
      "Standing Calf Raise (Barbell)",
      "Hanging Leg Raise"
    ],
    description: "Enfoque equilibrado de fuerza y volumen para cuádriceps, glúteos y femorales."
  },
  {
    title: "PPL - Push (Empuje Pesado)",
    exercises: [
      "Bench Press (Dumbbell)",
      "Incline Bench Press (Barbell)",
      "Overhead Press (Barbell)",
      "Dips (Chest Focus)",
      "Lateral Raise (Dumbbell)"
    ],
    description: "Primer día del split Push-Pull-Legs enfocado en empujes horizontales y verticales."
  },
  {
    title: "PPL - Pull (Tracción y Espalda)",
    exercises: [
      "Chin Up",
      "T-Bar Row (Barbell)",
      "Cable Face Pull",
      "Hammer Curl (Dumbbell)",
      "Ab Wheel"
    ],
    description: "Segundo día del split Push-Pull-Legs centrado en densidad, tracciones y bíceps."
  }
];
