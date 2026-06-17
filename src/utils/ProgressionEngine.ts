import { EXERCISES_DB } from '../data/exercises_db';

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

export function getBodyweightPercentage(exerciseTitle: string): number {
  const name = exerciseTitle.toLowerCase();
  
  // Single-leg squats (unilateral leg squats) support 100% of body weight on one leg
  if (
    name.includes('single-leg squat') || 
    name.includes('pistol squat') || 
    name.includes('sentadilla a una pierna') || 
    name.includes('sentadilla pistola') ||
    name.includes('bulgarian') || 
    name.includes('búlgara') ||
    name.includes('step-up') ||
    name.includes('step up') ||
    name.includes('unipodal')
  ) {
    return 1.0; // 100% of body weight
  }

  // Bilateral bodyweight squats (bodyweight squat, slant board squat, Spanish squat, glute bridge)
  if (
    name.includes('bodyweight squat') ||
    name.includes('sentadilla con peso corporal') ||
    name.includes('air squat') ||
    name.includes('free squat') ||
    name.includes('bridge') ||
    name.includes('puente') ||
    name.includes('hip thrust') ||
    name.includes('slant board squat')
  ) {
    return 0.50; // 50% of body weight per leg (distributed on both legs)
  }

  // Pull-up / Chin-up / Hanging (90% of body weight)
  if (
    name.includes('pull-up') || 
    name.includes('pull up') || 
    name.includes('chin-up') || 
    name.includes('chin up') || 
    name.includes('dominada') || 
    name.includes('hang') || 
    name.includes('colgado')
  ) {
    return 0.90; // 90%
  }

  // Push-up / Dips (65% of body weight)
  if (
    name.includes('push-up') || 
    name.includes('push up') || 
    name.includes('lagartija') || 
    name.includes('flexión') || 
    name.includes('dip') || 
    name.includes('fondo')
  ) {
    return 0.65; // 65%
  }

  // Planks / Core / Bird-Dog / Abdominal exercises (50% of body weight)
  if (
    name.includes('plank') || 
    name.includes('plancha') || 
    name.includes('bird dog') || 
    name.includes('bird-dog') || 
    name.includes('mcgill') || 
    name.includes('core') || 
    name.includes('crunch') || 
    name.includes('sit-up') || 
    name.includes('sit up') || 
    name.includes('raise')
  ) {
    return 0.50; // 50%
  }

  // Default for other bodyweight movements
  return 0.60;
}

export function proposeNextSet(
  exerciseName: string,
  lastSets: SetData[],
  recoveryScore: number = 10, // 1 to 10 (10 = fully recovered)
  isActivePain: boolean = false,
  daysSinceLastSession?: number,
  bodyWeight: number = 75
): ProgressionTarget {
  const defaultRange = getRepRangeForExercise(exerciseName);
  
  const dbEx = EXERCISES_DB.find(db => db.title.toLowerCase() === exerciseName.toLowerCase() || db.id === exerciseName);
  const isBodyweight = dbEx?.equipment === 'Peso Corporal';
  
  // Filtering only normal and failure sets (actual work sets)
  const workSets = lastSets.filter(s => s.setType === 'normal' || s.setType === 'failure');
  
  if (workSets.length === 0) {
    if (isBodyweight) {
      const percentage = getBodyweightPercentage(exerciseName);
      const bwWeight = Math.round(bodyWeight * percentage * 2) / 2;
      return {
        suggestedWeight: bwWeight,
        suggestedReps: defaultRange.min,
        message: `🏋️ Primer registro de peso corporal: Carga sugerida de ${bwWeight}kg (${Math.round(percentage * 100)}% de tu peso corporal de ${bodyWeight}kg) calculado de forma inteligente para este ejercicio.`,
        isDeload: false
      };
    }
    
    // Fallback if no work sets exist (e.g. running or warmup only)
    return {
      suggestedWeight: lastSets[0]?.weightKg || 10,
      suggestedReps: defaultRange.min,
      message: 'Comienza con tu carga habitual del historial.',
      isDeload: false
    };
  }

  // Check if they had pain during any of these sets
  const reportedPain = isActivePain || workSets.some(s => s.hasPain);
  
  if (reportedPain) {
    // AUTO-REGULATED DELOAD FOR INJURY/PAIN
    // Reduce weight by 20% to train safely
    const lastWeight = workSets[0].weightKg || (isBodyweight ? Math.round(bodyWeight * getBodyweightPercentage(exerciseName) * 2) / 2 : 10);
    const reducedWeight = Math.round((lastWeight * 0.8) / 0.5) * 0.5; // Redondea al 0.5kg más cercano
    return {
      suggestedWeight: Math.max(0.5, reducedWeight),
      suggestedReps: defaultRange.min,
      message: isBodyweight 
        ? `⚠️ Alerta de Dolor Activa: Carga reducida a ${reducedWeight}kg. Realiza una variante asistida (ej. con bandas o apoyando rodillas) para entrenar sin dolor.`
        : '⚠️ Alerta de Dolor Activa: Peso reducido un 20% para recuperación activa. Concéntrate en la forma perfecta y controlada.',
      isDeload: true
    };
  }

  // Check fatigue score (wellness check)
  if (recoveryScore <= 4) {
    // AUTO-REGULATED fatigue deload (Reduce intensity by 10% and sets)
    const lastWeight = workSets[0].weightKg || (isBodyweight ? Math.round(bodyWeight * getBodyweightPercentage(exerciseName) * 2) / 2 : 10);
    const reducedWeight = Math.round((lastWeight * 0.9) / 0.5) * 0.5;
    return {
      suggestedWeight: Math.max(0.5, reducedWeight),
      suggestedReps: defaultRange.min,
      message: '🔋 Baja recuperación reportada: Deload del 10% aplicado para prevenir fatiga acumulada.',
      isDeload: true
    };
  }

  // 1. CHECK DETRAINING (Return after a long break)
  if (daysSinceLastSession !== undefined && daysSinceLastSession > 14) {
    const lastWeight = workSets[0].weightKg || (isBodyweight ? Math.round(bodyWeight * getBodyweightPercentage(exerciseName) * 2) / 2 : 10);
    
    if (daysSinceLastSession > 28) {
      // More than 4 weeks: 20% safety deload
      const reducedWeight = Math.round((lastWeight * 0.8) / 0.5) * 0.5;
      return {
        suggestedWeight: Math.max(0.5, reducedWeight),
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

  // Get max reps accomplished with the heaviest weight in work sets
  const maxWeight = Math.max(...workSets.map(s => s.weightKg || 0));
  const heavySets = workSets.filter(s => s.weightKg === maxWeight);
  
  if (heavySets.length === 0) {
    const defaultWeight = isBodyweight ? Math.round(bodyWeight * getBodyweightPercentage(exerciseName) * 2) / 2 : maxWeight;
    return {
      suggestedWeight: defaultWeight,
      suggestedReps: defaultRange.min,
      message: 'Sugerido continuar con la misma carga.',
      isDeload: false
    };
  }

  // Double Progression logic
  // Did they hit the top of the rep range in ALL heavy sets?
  const hitTopRangeAllSets = heavySets.every(s => (s.reps || 0) >= defaultRange.max);
  
  if (hitTopRangeAllSets) {
    if (isBodyweight) {
      const percentage = getBodyweightPercentage(exerciseName);
      const bwWeight = Math.round(bodyWeight * percentage * 2) / 2;
      return {
        suggestedWeight: bwWeight,
        suggestedReps: defaultRange.max,
        message: `🎉 ¡Objetivo completado con peso corporal! Has dominado el ejercicio con ${bwWeight}kg (${Math.round(percentage * 100)}% de tu peso de ${bodyWeight}kg). Mantén esta carga base y concéntrate en mejorar la velocidad controlada o avanzar a una variante más difícil.`,
        isDeload: false
      };
    }

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
    
    const suggestedWeightVal = isBodyweight ? Math.round(bodyWeight * getBodyweightPercentage(exerciseName) * 2) / 2 : maxWeight;
    
    return {
      suggestedWeight: suggestedWeightVal,
      suggestedReps: targetReps,
      message: isBodyweight
        ? `💪 Progreso con peso corporal: Carga base inteligente de ${suggestedWeightVal}kg (${Math.round(getBodyweightPercentage(exerciseName) * 100)}% de tu peso). Intenta alcanzar al menos ${targetReps} repeticiones en todas tus series.`
        : `💪 Sigue empujando con ${maxWeight}kg. Intenta alcanzar al menos ${targetReps} repeticiones en todas tus series antes de subir peso.`,
      isDeload: false
    };
  }
}

export interface PBDetail {
  weight: number;
  reps: number;
  date: string;
}

export interface ExercisePBProfile {
  maxWeight: PBDetail;
  maxEst1RM: PBDetail & { value: number };
  maxVolume: { value: number; date: string };
  repPRs: { [reps: number]: { weight: number; date: string } };
  history1RM: { date: string; value: number; weight: number; reps: number }[];
}

export function calculatePBProfiles(sessions: any[]): { [exercise: string]: ExercisePBProfile } {
  const profiles: { [exercise: string]: ExercisePBProfile } = {};

  // Sort sessions chronologically ascending so we trace evolution properly
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.parsedDate).getTime() - new Date(b.parsedDate).getTime());

  sortedSessions.forEach(s => {
    const dateStr = s.parsedDate;

    s.exercises.forEach((ex: any) => {
      const title = ex.title;
      if (!profiles[title]) {
        profiles[title] = {
          maxWeight: { weight: 0, reps: 0, date: '' },
          maxEst1RM: { weight: 0, reps: 0, date: '', value: 0 },
          maxVolume: { value: 0, date: '' },
          repPRs: {},
          history1RM: []
        };
      }

      const profile = profiles[title];
      let currentSessionVolume = 0;
      let sessionBest1RM = 0;
      let sessionBestWeightFor1RM = 0;
      let sessionBestRepsFor1RM = 0;

      ex.sets.forEach((set: any) => {
        const weight = set.weight_kg || set.weightKg || 0;
        const reps = set.reps || 0;
        const completed = set.completed !== false;

        if (completed && weight > 0 && reps > 0) {
          const est1RM = weight * (1 + reps / 30);
          
          if (est1RM > sessionBest1RM) {
            sessionBest1RM = est1RM;
            sessionBestWeightFor1RM = weight;
            sessionBestRepsFor1RM = reps;
          }

          // 1. Max Weight
          if (weight > profile.maxWeight.weight) {
            profile.maxWeight = { weight, reps, date: dateStr };
          }

          // 2. Max Est 1RM
          if (est1RM > profile.maxEst1RM.value) {
            profile.maxEst1RM = { weight, reps, date: dateStr, value: parseFloat(est1RM.toFixed(2)) };
          }

          // 3. Rep PRs
          if (!profile.repPRs[reps] || weight > profile.repPRs[reps].weight) {
            profile.repPRs[reps] = { weight, date: dateStr };
          }

          currentSessionVolume += weight * reps;
        }
      });

      // 4. Max Volume
      if (currentSessionVolume > profile.maxVolume.value) {
        profile.maxVolume = { value: currentSessionVolume, date: dateStr };
      }

      // 5. History of 1RM
      if (sessionBest1RM > 0) {
        profile.history1RM.push({
          date: dateStr,
          value: parseFloat(sessionBest1RM.toFixed(2)),
          weight: sessionBestWeightFor1RM,
          reps: sessionBestRepsFor1RM
        });
      }
    });
  });

  return profiles;
}

export function compressAndResizeImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context error'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'strength' | 'consistency' | 'cardio' | 'rehab';
  tier: 'bronze' | 'silver' | 'gold';
  isUnlocked: boolean;
  progressText?: string;
  icon: string;
}

export function calculateAchievements(
  sessions: any[],
  pbProfiles: { [exercise: string]: ExercisePBProfile },
  cardioHistory: any[]
): Achievement[] {
  const achievements: Achievement[] = [
    {
      id: 'first_workout',
      title: 'Pionero de Fuerza',
      description: 'Completa tu primera sesión de entrenamiento.',
      category: 'consistency',
      tier: 'bronze',
      isUnlocked: sessions.length >= 1,
      progressText: `${sessions.length}/1 entrenamientos`,
      icon: '🏋️'
    },
    {
      id: 'ten_workouts',
      title: 'Consistencia de Hierro',
      description: 'Completa 10 sesiones de entrenamiento.',
      category: 'consistency',
      tier: 'silver',
      isUnlocked: sessions.length >= 10,
      progressText: `${sessions.length}/10 entrenamientos`,
      icon: '🔥'
    },
    {
      id: 'bench_press_50',
      title: 'Banco de Bronce',
      description: 'Supera los 50 kg de récord personal en Press de Banca.',
      category: 'strength',
      tier: 'bronze',
      isUnlocked: (pbProfiles['Bench Press (Barbell)']?.maxWeight.weight || 0) >= 50,
      progressText: `${Math.round(pbProfiles['Bench Press (Barbell)']?.maxWeight.weight || 0)}/50 kg`,
      icon: '💪'
    },
    {
      id: 'bench_press_100',
      title: 'Banco de Oro',
      description: 'Supera los 100 kg de récord personal en Press de Banca.',
      category: 'strength',
      tier: 'gold',
      isUnlocked: (pbProfiles['Bench Press (Barbell)']?.maxWeight.weight || 0) >= 100,
      progressText: `${Math.round(pbProfiles['Bench Press (Barbell)']?.maxWeight.weight || 0)}/100 kg`,
      icon: '👑'
    },
    {
      id: 'squat_80',
      title: 'Sentadilla de Bronce',
      description: 'Supera los 80 kg de récord personal en Sentadillas.',
      category: 'strength',
      tier: 'bronze',
      isUnlocked: (pbProfiles['Squat (Barbell)']?.maxWeight.weight || 0) >= 80,
      progressText: `${Math.round(pbProfiles['Squat (Barbell)']?.maxWeight.weight || 0)}/80 kg`,
      icon: '🦵'
    },
    {
      id: 'squat_150',
      title: 'Sentadilla de Oro',
      description: 'Supera los 150 kg de récord personal en Sentadillas.',
      category: 'strength',
      tier: 'gold',
      isUnlocked: (pbProfiles['Squat (Barbell)']?.maxWeight.weight || 0) >= 150,
      progressText: `${Math.round(pbProfiles['Squat (Barbell)']?.maxWeight.weight || 0)}/150 kg`,
      icon: '🦖'
    },
    {
      id: 'deadlift_100',
      title: 'Muerto de Bronce',
      description: 'Supera los 100 kg de récord personal en Peso Muerto.',
      category: 'strength',
      tier: 'bronze',
      isUnlocked: (pbProfiles['Deadlift (Barbell)']?.maxWeight.weight || 0) >= 100,
      progressText: `${Math.round(pbProfiles['Deadlift (Barbell)']?.maxWeight.weight || 0)}/100 kg`,
      icon: '💀'
    },
    {
      id: 'deadlift_200',
      title: 'Muerto de Oro',
      description: 'Supera los 200 kg de récord personal en Peso Muerto.',
      category: 'strength',
      tier: 'gold',
      isUnlocked: (pbProfiles['Deadlift (Barbell)']?.maxWeight.weight || 0) >= 200,
      progressText: `${Math.round(pbProfiles['Deadlift (Barbell)']?.maxWeight.weight || 0)}/200 kg`,
      icon: '💎'
    },
    {
      id: 'power_total_300',
      title: 'Club de los 300 kg',
      description: 'Suma más de 300 kg combinando tus PBs de Sentadilla, Press de Banca y Peso Muerto.',
      category: 'strength',
      tier: 'silver',
      isUnlocked: false,
      progressText: '0/300 kg',
      icon: '⚡'
    },
    {
      id: 'power_total_500',
      title: 'Club de los 500 kg',
      description: 'Suma más de 500 kg combinando tus PBs de Sentadilla, Press de Banca y Peso Muerto.',
      category: 'strength',
      tier: 'gold',
      isUnlocked: false,
      progressText: '0/500 kg',
      icon: '🔱'
    },
    {
      id: 'rehab_master',
      title: 'Templo Protegido',
      description: 'Registra un ejercicio con molestia reportada con éxito para la recuperación activa.',
      category: 'rehab',
      tier: 'silver',
      isUnlocked: false,
      progressText: '0/1 reportes',
      icon: '🛡️'
    },
    {
      id: 'cardio_hero',
      title: 'Corredor Incansable',
      description: 'Completa una sesión de Cardio de más de 45 minutos.',
      category: 'cardio',
      tier: 'silver',
      isUnlocked: false,
      progressText: '0/45 min',
      icon: '🏃'
    }
  ];

  // 1. Calculate Big Three Total
  const bpPB = pbProfiles['Bench Press (Barbell)']?.maxWeight.weight || 0;
  const sqPB = pbProfiles['Squat (Barbell)']?.maxWeight.weight || 0;
  const dlPB = pbProfiles['Deadlift (Barbell)']?.maxWeight.weight || 0;
  const bigThreeTotal = bpPB + sqPB + dlPB;

  const total300 = achievements.find(a => a.id === 'power_total_300')!;
  total300.isUnlocked = bigThreeTotal >= 300;
  total300.progressText = `${Math.round(bigThreeTotal)}/300 kg`;

  const total500 = achievements.find(a => a.id === 'power_total_500')!;
  total500.isUnlocked = bigThreeTotal >= 500;
  total500.progressText = `${Math.round(bigThreeTotal)}/500 kg`;

  // 2. Calculate Rehab reports
  let hasRehabReport = false;
  sessions.forEach(s => {
    s.exercises?.forEach((e: any) => {
      e.sets?.forEach((set: any) => {
        if (set.hasPain || set.has_pain) {
          hasRehabReport = true;
        }
      });
    });
  });
  const rehab = achievements.find(a => a.id === 'rehab_master')!;
  rehab.isUnlocked = hasRehabReport;
  rehab.progressText = hasRehabReport ? '1/1 reportado' : '0/1 reportado';

  // 3. Calculate long cardio session
  let hasLongCardio = false;
  let maxCardioMin = 0;
  cardioHistory.forEach(c => {
    if (c.minutes > maxCardioMin) {
      maxCardioMin = c.minutes;
    }
    if (c.minutes >= 45) {
      hasLongCardio = true;
    }
  });
  const cardio = achievements.find(a => a.id === 'cardio_hero')!;
  cardio.isUnlocked = hasLongCardio;
  cardio.progressText = `${maxCardioMin}/45 min`;

  return achievements;
}


