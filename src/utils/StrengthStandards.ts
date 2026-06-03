export interface StrengthStandard {
  exerciseName: string;
  beginner: number; // multiplier of body weight (total working weight for ~8-10 reps)
  intermediate: number;
  advanced: number;
  isDumbbellPerHand?: boolean; // If true, weight is shown per hand (e.g. dumbbell curls)
  isBodyweight?: boolean; // If true, standards are in repetitions, not kg
  unit?: string; // 'kg' or 'reps'
}

// Working weight multipliers (for ~8-10 repetitions) relative to bodyweight (BW)
const STANDARDS_DATABASE: StrengthStandard[] = [
  {
    exerciseName: "Bench Press (Barbell)",
    beginner: 0.55,      // 80kg BW = 44kg working weight
    intermediate: 0.85,  // 80kg BW = 68kg
    advanced: 1.15       // 80kg BW = 92kg
  },
  {
    exerciseName: "Bench Press (Dumbbell)",
    beginner: 0.22,      // 80kg BW = 17.5kg per hand
    intermediate: 0.35,  // 80kg BW = 28kg per hand
    advanced: 0.48,      // 80kg BW = 38kg per hand
    isDumbbellPerHand: true
  },
  {
    exerciseName: "Squat (Barbell)",
    beginner: 0.65,      // 80kg BW = 52kg
    intermediate: 1.00,  // 80kg BW = 80kg
    advanced: 1.40       // 80kg BW = 112kg
  },
  {
    exerciseName: "Deadlift (Barbell)",
    beginner: 0.80,      // 80kg BW = 64kg
    intermediate: 1.20,  // 80kg BW = 96kg
    advanced: 1.70       // 80kg BW = 136kg
  },
  {
    exerciseName: "Overhead Press (Barbell)",
    beginner: 0.32,      // 80kg BW = 25kg
    intermediate: 0.50,  // 80kg BW = 40kg
    advanced: 0.68       // 80kg BW = 54kg
  },
  {
    exerciseName: "Shoulder Press (Dumbbell)",
    beginner: 0.12,      // 80kg BW = 10kg per hand
    intermediate: 0.20,  // 80kg BW = 16kg per hand
    advanced: 0.30,      // 80kg BW = 24kg per hand
    isDumbbellPerHand: true
  },
  {
    exerciseName: "Bicep Curl (Dumbbell)",
    beginner: 0.10,      // 80kg BW = 8kg per hand
    intermediate: 0.16,  // 80kg BW = 12.5kg per hand
    advanced: 0.22,      // 80kg BW = 18kg per hand
    isDumbbellPerHand: true
  },
  {
    exerciseName: "Lateral Raise (Dumbbell)",
    beginner: 0.06,      // 80kg BW = 5kg per hand
    intermediate: 0.10,  // 80kg BW = 8kg per hand
    advanced: 0.14,      // 80kg BW = 11kg per hand
    isDumbbellPerHand: true
  },
  {
    exerciseName: "Bent Over Row (Barbell)",
    beginner: 0.50,      // 80kg BW = 40kg
    intermediate: 0.75,  // 80kg BW = 60kg
    advanced: 1.00       // 80kg BW = 80kg
  },
  {
    exerciseName: "Pull Up",
    beginner: 3,         // reps
    intermediate: 10,
    advanced: 16,
    isBodyweight: true,
    unit: "reps"
  },
  {
    exerciseName: "Chin Up",
    beginner: 4,
    intermediate: 11,
    advanced: 17,
    isBodyweight: true,
    unit: "reps"
  },
  {
    exerciseName: "Push Up (Normal)",
    beginner: 12,
    intermediate: 25,
    advanced: 40,
    isBodyweight: true,
    unit: "reps"
  },
  {
    exerciseName: "Dips (Chest Focus)",
    beginner: 5,
    intermediate: 12,
    advanced: 20,
    isBodyweight: true,
    unit: "reps"
  },
  {
    exerciseName: "Dips (Tricep Focus)",
    beginner: 4,
    intermediate: 11,
    advanced: 18,
    isBodyweight: true,
    unit: "reps"
  }
];

export interface CalculatedStandard {
  beginner: string;
  intermediate: string;
  advanced: string;
  label: string;
}

/**
 * Calculates working weight (or reps) standards for an exercise based on body weight, gender, height, and body fat
 */
export function getStrengthStandards(
  exerciseName: string,
  bodyWeightKg: number,
  gender: 'Masculino' | 'Femenino' = 'Masculino',
  heightCm: number = 175,
  bodyFat: number = 15
): CalculatedStandard | null {
  // Find match by exact name or substring
  const standard = STANDARDS_DATABASE.find(
    s => s.exerciseName.toLowerCase() === exerciseName.toLowerCase() || 
         exerciseName.toLowerCase().includes(s.exerciseName.toLowerCase())
  );

  if (!standard) return null;

  // 1. Gender adjustment factor
  // Lower body & Back exercises get a slightly higher percentage (0.72) than Upper body push & Arms (0.60)
  const isLowerOrBack = 
    standard.exerciseName.toLowerCase().includes("squat") ||
    standard.exerciseName.toLowerCase().includes("deadlift") ||
    standard.exerciseName.toLowerCase().includes("row") ||
    standard.exerciseName.toLowerCase().includes("pull up") ||
    standard.exerciseName.toLowerCase().includes("chin up");
    
  const genderFactor = gender === 'Femenino' ? (isLowerOrBack ? 0.72 : 0.60) : 1.0;

  // 2. Height adjustment factor (lever arms)
  // Reference heights: 175cm for men, 162cm for women
  const refHeight = gender === 'Femenino' ? 162 : 175;
  const heightDiff = heightCm - refHeight;
  // Decrease strength standard by 3% for every 10cm taller, and vice-versa
  const heightFactor = 1 - (heightDiff / 100) * 0.3;

  // 3. Body Fat adjustment (Lean Mass calculation)
  // Reference fat: 15% for men, 23% for women
  // If the user has excess fat, adjust the effective body weight down so the weight standard is more realistic
  const refFat = gender === 'Femenino' ? 23 : 15;
  const fatDiff = Math.max(0, bodyFat - refFat);
  const fatAdjustmentFactor = 1 - (fatDiff / 100) * 0.5;
  const effectiveWeightKg = bodyWeightKg * fatAdjustmentFactor;

  if (standard.isBodyweight) {
    // For bodyweight reps, scale reps based on gender, height, and fat
    // (taller and higher fat makes bodyweight exercises significantly harder)
    const scaleReps = (val: number) => {
      const rawReps = val * genderFactor * heightFactor * fatAdjustmentFactor;
      return Math.max(1, Math.round(rawReps));
    };

    return {
      beginner: `${scaleReps(standard.beginner)} reps`,
      intermediate: `${scaleReps(standard.intermediate)} reps`,
      advanced: `${scaleReps(standard.advanced)} reps`,
      label: "repeticiones seguidas"
    };
  }

  // Calculate weights rounded to nearest 0.5kg
  const round = (val: number) => Math.round(val / 0.5) * 0.5;
  const unitLabel = standard.isDumbbellPerHand ? "kg c/u" : "kg total";

  // Combine factors: weight uses effectiveWeightKg, and the multiplier is adjusted by gender & height factors
  const calculateWeight = (multiplier: number) => {
    return round(effectiveWeightKg * multiplier * genderFactor * heightFactor);
  };

  return {
    beginner: `${calculateWeight(standard.beginner)} ${unitLabel}`,
    intermediate: `${calculateWeight(standard.intermediate)} ${unitLabel}`,
    advanced: `${calculateWeight(standard.advanced)} ${unitLabel}`,
    label: standard.isDumbbellPerHand ? "Peso por mancuerna" : "Peso total (barra + discos)"
  };
}
