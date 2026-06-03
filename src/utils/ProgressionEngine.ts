export interface SetData {
  setIndex: number;
  setType: string; // 'normal' | 'warmup' | 'failure' | 'dropset'
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  hasPain?: boolean;
}

export interface ProgressionTarget {
  suggestedWeight: number;
  suggestedReps: number;
  message: string;
  isDeload: boolean;
}

export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return parseFloat((weight * (1 + reps / 30)).toFixed(2));
}

export function getRepRangeForExercise(exerciseName: string): { min: number; max: number } {
  const name = exerciseName.toLowerCase();
  
  if (name.includes('squat') || name.includes('deadlift') || name.includes('press')) {
    // Compound strength movements
    return { min: 6, max: 10 };
  }
  
  if (name.includes('raise') || name.includes('curl') || name.includes('fly') || name.includes('extension') || name.includes('push up')) {
    // Isolations / Hypertrophy
    return { min: 10, max: 15 };
  }
  
  if (name.includes('calf') || name.includes('wrist') || name.includes('forearm')) {
    // High rep endurance / pump joints
    return { min: 15, max: 25 };
  }
  
  // Default range
  return { min: 8, max: 12 };
}

export function proposeNextSet(
  exerciseName: string,
  lastSets: SetData[],
  recoveryScore: number = 10, // 1 to 10 (10 = fully recovered)
  isActivePain: boolean = false,
  daysSinceLastSession?: number
): ProgressionTarget {
  const defaultRange = getRepRangeForExercise(exerciseName);
  
  // Filtering only normal and failure sets (actual work sets)
  const workSets = lastSets.filter(s => s.setType === 'normal' || s.setType === 'failure');
  
  if (workSets.length === 0) {
    // Fallback if no work sets exist (e.g. running or warmup only)
    return {
      suggestedWeight: lastSets[0]?.weightKg || 10,
      suggestedReps: defaultRange.min,
      message: 'Comienza con tu carga habitual del historial.',
      isDeload: false
    };
  }

  // 1. CHECK DETRAINING (Return after a long break)
  if (daysSinceLastSession !== undefined && daysSinceLastSession > 14) {
    const lastWeight = workSets[0].weightKg || 10;
    
    if (daysSinceLastSession > 28) {
      // More than 4 weeks: 20% safety deload
      const reducedWeight = Math.round((lastWeight * 0.8) / 2.5) * 2.5;
      return {
        suggestedWeight: Math.max(2.5, reducedWeight),
        suggestedReps: defaultRange.min,
        message: `💤 Reactivación segura (>4 semanas): No has hecho este ejercicio en ${daysSinceLastSession} días. Reducimos peso un 20% para acondicionar tendones y evitar dolor agudo.`,
        isDeload: true
      };
    } else {
      // 2 to 4 weeks: Hold last weight (override "Objetivo completado" increments)
      return {
        suggestedWeight: lastWeight,
        suggestedReps: defaultRange.min,
        message: `💤 Retorno tras pausa (>2 semanas): No has realizado este ejercicio en ${daysSinceLastSession} días. Mantendremos el peso previo (${lastWeight}kg) para reactivar con seguridad.`,
        isDeload: true
      };
    }
  }

  // Check if they had pain during any of these sets
  const reportedPain = isActivePain || workSets.some(s => s.hasPain);
  
  if (reportedPain) {
    // AUTO-REGULATED DELOAD FOR INJURY/PAIN
    // Reduce weight by 20% to train safely
    const lastWeight = workSets[0].weightKg || 10;
    const reducedWeight = Math.round((lastWeight * 0.8) / 2.5) * 2.5; // Redondea al 2.5kg más cercano
    return {
      suggestedWeight: Math.max(2.5, reducedWeight),
      suggestedReps: defaultRange.min,
      message: '⚠️ Alerta de Dolor Activa: Peso reducido un 20% para recuperación activa. Concéntrate en la forma perfecta y controlada.',
      isDeload: true
    };
  }

  // Check fatigue score (wellness check)
  if (recoveryScore <= 4) {
    // AUTO-REGULATED fatigue deload (Reduce intensity by 10% and sets)
    const lastWeight = workSets[0].weightKg || 10;
    const reducedWeight = Math.round((lastWeight * 0.9) / 2.5) * 2.5;
    return {
      suggestedWeight: Math.max(2.5, reducedWeight),
      suggestedReps: defaultRange.min,
      message: '🔋 Baja recuperación reportada: Deload del 10% aplicado para prevenir fatiga acumulada.',
      isDeload: true
    };
  }

  // Get max reps accomplished with the heaviest weight in work sets
  const maxWeight = Math.max(...workSets.map(s => s.weightKg || 0));
  const heavySets = workSets.filter(s => s.weightKg === maxWeight);
  
  if (heavySets.length === 0) {
    return {
      suggestedWeight: maxWeight,
      suggestedReps: defaultRange.min,
      message: 'Sugerido continuar con la misma carga.',
      isDeload: false
    };
  }

  // Double Progression logic
  // Did they hit the top of the rep range in ALL heavy sets?
  const hitTopRangeAllSets = heavySets.every(s => (s.reps || 0) >= defaultRange.max);
  
  if (hitTopRangeAllSets) {
    // Propose load increment!
    let increment = 2.5; // Barbell default
    if (exerciseName.toLowerCase().includes('dumbbell') || exerciseName.toLowerCase().includes('raise') || exerciseName.toLowerCase().includes('curl')) {
      increment = 1.0; // Dumbbells or minor movements
    }
    
    const newWeight = Math.round((maxWeight + increment) / 0.5) * 0.5; // Redondea a 0.5kg
    
    return {
      suggestedWeight: newWeight,
      suggestedReps: defaultRange.min,
      message: `🎉 ¡Objetivo completado! Subimos de ${maxWeight}kg a ${newWeight}kg e iniciamos en el rango bajo de repeticiones (${defaultRange.min}).`,
      isDeload: false
    };
  } else {
    // Propose reps progress!
    // Find what was the minimum reps done in work sets
    const minRepsDone = Math.min(...workSets.map(s => s.reps || 0));
    
    // Propose increasing reps on the lowest sets
    const targetReps = Math.min(defaultRange.max, minRepsDone + 1);
    
    return {
      suggestedWeight: maxWeight,
      suggestedReps: targetReps,
      message: `💪 Sigue empujando con ${maxWeight}kg. Intenta alcanzar al menos ${targetReps} repeticiones en todas tus series antes de subir peso.`,
      isDeload: false
    };
  }
}
