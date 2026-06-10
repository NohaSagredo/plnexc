import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Pause,
  X,
  Check, 
  AlertTriangle, 
  Flame, 
  Clock,
  Dumbbell,
  Plus,
  Minus,
  SkipForward,
  Trash2,
  Edit2,
  Target,
  BookOpen,
  Award
} from 'lucide-react';
import { proposeNextSet, calculatePBProfiles } from '../utils/ProgressionEngine';
import type { SetData, ProgressionTarget } from '../utils/ProgressionEngine';
import { getSubstitutedExercise, MILO_REHAB_PROTOCOLS } from '../utils/MiloRehabEngine';
import type { SubstitutionRule } from '../utils/MiloRehabEngine';
import RoutineBuilder from './RoutineBuilder';
import { DEFAULT_PRESETS } from '../data/default_routines';
import { EXERCISES_DB } from '../data/exercises_db';
import { getStrengthStandards } from '../utils/StrengthStandards';
import { TRANSLATIONS, getExerciseName, translateEngineText } from '../utils/translations';

interface WorkoutTabProps {
  activeInjury: {
    joint: string;
    phase: number;
    weakness: string;
    painScale: number;
  } | null;
  onSaveWorkout: (newSession: any) => void;
  onDeleteWorkout: (parsedDate: string) => void;
  localHistory: any[];
  customRoutines: any[];
  onSaveCustomRoutine: (name: string, exercises: string[], originalName?: string) => void;
  onDeleteRoutine: (name: string) => void;
  deletedRoutines: string[];
  bodyWeight: number;
  height: number;
  gender: 'Masculino' | 'Femenino';
  bodyFat: number;
  language: 'es' | 'en';
}

export default function WorkoutTab({ 
  activeInjury, 
  onSaveWorkout, 
  onDeleteWorkout,
  localHistory,
  customRoutines,
  onSaveCustomRoutine,
  onDeleteRoutine,
  deletedRoutines,
  bodyWeight,
  height,
  gender,
  bodyFat,
  language
}: WorkoutTabProps) {
  const t = TRANSLATIONS[language];

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const resolveExerciseDisplayName = (title: string) => {
    const found = EXERCISES_DB.find(ex => ex.title.toLowerCase() === title.toLowerCase() || ex.id === title);
    if (found) {
      return getExerciseName(found.id, found.title, language);
    }
    return title;
  };

  const translateMuscleGroup = (m: string) => {
    if (language === 'es') return m;
    const mapping: any = {
      'Piernas': 'Legs',
      'Brazos': 'Arms',
      'Core': 'Core',
      'Hombros': 'Shoulders',
      'Pecho': 'Chest',
      'Espalda': 'Back',
      'Cuello': 'Neck',
      'Cardio': 'Cardio'
    };
    return mapping[m] || m;
  };

  const translateEquipment = (e: string) => {
    if (language === 'es') return e;
    const mapping: any = {
      'Barra': 'Barbell',
      'Mancuerna': 'Dumbbell',
      'Peso Corporal': 'Bodyweight',
      'Polea/Cable': 'Cable',
      'Banda': 'Band',
      'Otro': 'Other'
    };
    return mapping[e] || e;
  };

  // Calculate PBs from history
  const pbProfiles = useMemo(() => calculatePBProfiles(localHistory), [localHistory]);

  const [routineOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('plnexc_routine_order');
    return saved ? JSON.parse(saved) : [];
  });

  // 1. Group exercises into routines from historical logs and custom creations
  const routines = useMemo(() => {
    const map = new Map<string, string[]>(); // Title -> Exercise List
    
    // 1. Load default presets
    DEFAULT_PRESETS.forEach(r => {
      map.set(r.title, r.exercises);
    });

    // 2. Scan full history to map unique titles to exercises
    localHistory.forEach(session => {
      if (!session.title) return;
      if (!map.has(session.title)) {
        map.set(session.title, []);
      }
      const list = map.get(session.title)!;
      session.exercises.forEach((ex: any) => {
        if (!list.includes(ex.title)) {
          list.push(ex.title);
        }
      });
    });

    // 3. Overlay custom routines (these can override or append)
    customRoutines.forEach(r => {
      map.set(r.title, r.exercises);
    });
    
    const list = Array.from(map.entries())
      .map(([title, exercises]) => {
        const isCustom = customRoutines.some(cr => cr.title === title);
        const isPreset = DEFAULT_PRESETS.some(dp => dp.title === title);
        return {
          title,
          exercises,
          isCustom,
          isPreset,
          highlight: (isCustom && isPreset) ? 'modified' : (isCustom && !isPreset) ? 'created' : 'preset'
        };
      })
      .filter(r => !deletedRoutines.includes(r.title));

    // Build a map of routine title -> last used timestamp
    const lastUsedMap = new Map<string, number>();
    localHistory.forEach(session => {
      if (!session.title || !session.parsedDate) return;
      const time = new Date(session.parsedDate).getTime();
      const existing = lastUsedMap.get(session.title) || 0;
      if (time > existing) {
        lastUsedMap.set(session.title, time);
      }
    });

    list.sort((a, b) => {
      const timeA = lastUsedMap.get(a.title) || 0;
      const timeB = lastUsedMap.get(b.title) || 0;
      
      if (timeA !== timeB) {
        return timeB - timeA; // Descending (most recent first)
      }
      
      // Secondary: Manual order in routineOrder (if any)
      if (routineOrder.length > 0) {
        const idxA = routineOrder.indexOf(a.title);
        const idxB = routineOrder.indexOf(b.title);
        if (idxA !== -1 || idxB !== -1) {
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        }
      }
      
      // Tertiary: Alphabetical
      return a.title.localeCompare(b.title);
    });

    return list;
  }, [localHistory, customRoutines, deletedRoutines, routineOrder]);



  const [selectedRoutine, setSelectedRoutine] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [recoveryScore, setRecoveryScore] = useState<number>(8);
  const [isBuildingRoutine, setIsBuildingRoutine] = useState<boolean>(false);
  const [editingRoutine, setEditingRoutine] = useState<{ title: string; exercises: string[] } | null>(null);
  const [expandedStandards, setExpandedStandards] = useState<{[key: string]: boolean}>({});
  const [expandedInstructions, setExpandedInstructions] = useState<{[key: string]: boolean}>({});
  const [brokenPBs, setBrokenPBs] = useState<any[]>([]);
  const [pendingSessionToSave, setPendingSessionToSave] = useState<any | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  // pre-workout recovery wizard states
  const [showRecoveryWizard, setShowRecoveryWizard] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [sleepScore, setSleepScore] = useState<number>(3);
  const [fatigueScore, setFatigueScore] = useState<number>(3);
  const [stressScore, setStressScore] = useState<number>(3);
  const [energyScoreInput, setEnergyScoreInput] = useState<number>(3);

  const routineGridRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);

  useEffect(() => {
    const container = routineGridRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [activeSession, showRecoveryWizard, isBuildingRoutine]);

  // Desplazar ligeramente a la derecha al montar para esconder parcialmente la tarjeta de Crear Rutina
  useEffect(() => {
    const container = routineGridRef.current;
    if (container && routines.length > 0 && !hasInitialScrolled.current) {
      const timer = setTimeout(() => {
        container.scrollLeft = 145;
        hasInitialScrolled.current = true;
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [routines.length]);

  const selectedRoutineObj = useMemo(() => {
    return routines.find(r => r.title === selectedRoutine);
  }, [routines, selectedRoutine]);

  const previewExercises = useMemo(() => {
    if (!selectedRoutineObj) return [];
    return selectedRoutineObj.exercises.map(title => {
      const found = EXERCISES_DB.find(ex => ex.title === title);
      return found || {
        id: `custom_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        title,
        muscleGroup: 'Pecho',
        equipment: 'Mancuerna',
        difficulty: 'Intermedio',
        description: 'Ejercicio personalizado'
      };
    });
  }, [selectedRoutineObj]);

  // Set default routine on load if not set
  useEffect(() => {
    if (!selectedRoutine && routines.length > 0) {
      setSelectedRoutine(routines[0].title);
    }
  }, [routines, selectedRoutine]);

  // Rest Timer State
  const [restTimeTotal, setRestTimeTotal] = useState<number>(90);
  const [restTimeRemaining, setRestTimeRemaining] = useState<number>(0);
  const [restTimerActive, setRestTimerActive] = useState<boolean>(false);

  // Timer Effect (Main workout duration)
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  // Rest Timer Effect (Countdown between sets)
  useEffect(() => {
    let interval: any = null;
    if (restTimerActive && restTimeRemaining > 0) {
      interval = setInterval(() => {
        setRestTimeRemaining(r => {
          if (r <= 1) {
            setRestTimerActive(false);
            if ('vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [restTimerActive, restTimeRemaining]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // 2. Start Active Session
  const handleStartWorkout = (finalRecoveryScore?: number) => {
    const routine = routines.find(r => r.title === selectedRoutine);
    if (!routine) return;

    const scoreToUse = finalRecoveryScore !== undefined ? finalRecoveryScore : recoveryScore;

    // Load exercises and calculate recommendations
    const exercisesForSession = routine.exercises.map(exTitle => {
      // Find history of this specific exercise
      const exerciseHistory: any[] = [];
      localHistory.forEach(session => {
        const found = session.exercises.find((e: any) => e.title === exTitle);
        if (found) {
          exerciseHistory.push({
            date: new Date(session.parsedDate),
            sets: found.sets
          });
        }
      });
      
      // Sort oldest to newest, then take the latest
      exerciseHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
      const latestSession = exerciseHistory[exerciseHistory.length - 1];
      
      // Calculate progressive overload suggestions
      let target: ProgressionTarget = {
        suggestedWeight: 10,
        suggestedReps: 10,
        message: 'Comienza con una carga moderada para explorar el rango de movimiento.',
        isDeload: false
      };

      if (latestSession && latestSession.sets) {
        // Map sets to Progression engine interface
        const lastSetsMapped: SetData[] = latestSession.sets.map((s: any) => ({
          setIndex: s.setIndex,
          setType: s.setType || 'normal',
          weightKg: s.weightKg,
          reps: s.reps,
          rpe: s.rpe
        }));
        
        const diffTime = Math.abs(new Date().getTime() - latestSession.date.getTime());
        const daysSinceLastSession = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        target = proposeNextSet(exTitle, lastSetsMapped, scoreToUse, false, daysSinceLastSession);
      }

      // 3. Rebuilding Milo Substitution check
      let activeSub: SubstitutionRule | undefined = undefined;
      let finalTitle = exTitle;
      
      if (activeInjury) {
        const subRule = getSubstitutedExercise(exTitle);
        if (subRule) {
          // If the exercise affects the injured joint, substitute it
          activeSub = subRule;
          finalTitle = subRule.substitutedExercise;
        }
      }

      // Generate 3 standard sets with suggested values
      const initialSets = Array.from({ length: 3 }).map((_, i) => ({
        setIndex: i,
        setType: i === 0 && target.suggestedWeight > 20 ? 'warmup' : 'normal',
        weightKg: i === 0 && target.suggestedWeight > 20 ? Math.round((target.suggestedWeight * 0.6) / 2.5) * 2.5 : target.suggestedWeight,
        reps: target.suggestedReps,
        rpe: null as number | null,
        completed: false,
        hasPain: false
      }));

      return {
        originalTitle: exTitle,
        title: finalTitle,
        isSubstituted: !!activeSub,
        subRule: activeSub,
        suggestion: target,
        sets: initialSets
      };
    });

    setActiveSession({
      title: selectedRoutine,
      startTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      exercises: exercisesForSession
    });

    setTimer(0);
    setTimerActive(true);
    setShowPreviewModal(false);
  };

  // Change input value in real time
  const handleSetChange = (exIdx: number, setIdx: number, field: string, value: any) => {
    setActiveSession((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex: any, eIdx: number) => {
          if (eIdx !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((set: any, sIdx: number) => {
              if (sIdx !== setIdx) return set;
              return {
                ...set,
                [field]: value
              };
            })
          };
        })
      };
    });
  };

  const handleTogglePain = (exIdx: number, setIdx: number) => {
    setActiveSession((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex: any, eIdx: number) => {
          if (eIdx !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((set: any, sIdx: number) => {
              if (sIdx !== setIdx) return set;
              const newPain = !set.hasPain;
              return {
                ...set,
                hasPain: newPain,
                rpe: newPain ? null : set.rpe // clear RPE if pain is flagged
              };
            })
          };
        })
      };
    });
  };

  const handleAddSet = (exIdx: number) => {
    setActiveSession((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex: any, eIdx: number) => {
          if (eIdx !== exIdx) return ex;
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                setIndex: ex.sets.length,
                setType: 'normal',
                weightKg: lastSet ? lastSet.weightKg : 10,
                reps: lastSet ? lastSet.reps : 10,
                rpe: null,
                completed: false,
                hasPain: false
              }
            ]
          };
        })
      };
    });
  };

  const handleRemoveSet = (exIdx: number) => {
    setActiveSession((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex: any, eIdx: number) => {
          if (eIdx !== exIdx) return ex;
          if (ex.sets.length <= 1) return ex;
          return {
            ...ex,
            sets: ex.sets.slice(0, -1)
          };
        })
      };
    });
  };

  const handleFinishWorkout = () => {
    if (!activeSession) return;
    
    // Check if any set has pain and prompt user
    const hasAnyPain = activeSession.exercises.some((e: any) => e.sets.some((s: any) => s.hasPain));
    if (hasAnyPain && !activeInjury) {
      alert('⚠️ Hemos detectado que registraste dolor durante esta sesión. Al finalizar, te recomendamos ir a la pestaña "Rehab PLNEXC" para realizar una autoevaluación física de tu articulación afectada.');
    }

    const compiledExercises = activeSession.exercises.map((ex: any) => {
      // Calculate local maxEst1RM & volume
      let maxEst1RM = 0;
      let totalVolume = 0;
      
      const filteredSets = ex.sets.map((s: any) => {
        const weight = s.weightKg || 0;
        const reps = s.reps || 0;
        
        if (s.completed && weight && reps) {
          totalVolume += weight * reps;
          const est1RM = weight * (1 + reps / 30);
          if (est1RM > maxEst1RM) {
            maxEst1RM = parseFloat(est1RM.toFixed(2));
          }
        }
        
        return {
          setIndex: s.setIndex,
          setType: s.setType,
          weight_kg: weight || null,
          reps: reps || null,
          rpe: s.rpe || null,
          hasPain: s.hasPain || false,
          completed: s.completed || false
        };
      });

      return {
        title: ex.title,
        notes: ex.isSubstituted ? `Variante sustituida por molestia. Original: ${ex.originalTitle}` : '',
        maxEst1RM: maxEst1RM > 0 ? maxEst1RM : undefined,
        totalVolume,
        sets: filteredSets
      };
    });

    const newSession = {
      title: activeSession.title,
      startTime: activeSession.startTime,
      endTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      description: 'Entrenamiento completado en la app',
      exercises: compiledExercises,
      parsedDate: new Date().toISOString()
    };

    // Detect broken PBs
    const sessionBrokenPBs: any[] = [];
    compiledExercises.forEach((ex: any) => {
      const profile = pbProfiles[ex.title];
      const hasHistory = profile && profile.maxWeight.weight > 0;
      
      let maxWeightInSession = 0;
      let maxEst1RMInSession = 0;
      let sessionMaxWeightReps = 0;
      
      const sessionRepPRs: { [reps: number]: number } = {};

      ex.sets.forEach((set: any) => {
        const weight = set.weight_kg || 0;
        const reps = set.reps || 0;
        
        if (weight > 0 && reps > 0) {
          const est1RM = weight * (1 + reps / 30);
          
          if (weight > maxWeightInSession) {
            maxWeightInSession = weight;
            sessionMaxWeightReps = reps;
          }
          if (est1RM > maxEst1RMInSession) {
            maxEst1RMInSession = est1RM;
          }
          if (!sessionRepPRs[reps] || weight > sessionRepPRs[reps]) {
            sessionRepPRs[reps] = weight;
          }
        }
      });

      if (maxWeightInSession > 0 && profile && hasHistory) {
        const oldMaxWeight = profile.maxWeight.weight;
        const oldMaxEst1RM = profile.maxEst1RM.value;

        let exerciseBroken = false;
        const details: string[] = [];

        if (maxWeightInSession > oldMaxWeight) {
          details.push(t.pbCelebrationDetailMaxWeight
            .replace('{old}', oldMaxWeight.toString())
            .replace('{new}', maxWeightInSession.toString())
            .replace('{reps}', sessionMaxWeightReps.toString())
          );
          exerciseBroken = true;
        }

        if (maxEst1RMInSession > oldMaxEst1RM) {
          details.push(t.pbCelebrationDetailEst1RM
            .replace('{old}', Math.round(oldMaxEst1RM).toString())
            .replace('{new}', Math.round(maxEst1RMInSession).toString())
          );
          exerciseBroken = true;
        }

        // Check rep PRs
        Object.entries(sessionRepPRs).forEach(([repsStr, weight]) => {
          const reps = parseInt(repsStr, 10);
          const oldRepPR = profile.repPRs[reps]?.weight || 0;
          if (oldRepPR > 0 && weight > oldRepPR) {
            details.push(t.pbCelebrationDetailRepPR
              .replace('{reps}', reps.toString())
              .replace('{old}', oldRepPR.toString())
              .replace('{new}', weight.toString())
            );
            exerciseBroken = true;
          }
        });

        if (exerciseBroken) {
          sessionBrokenPBs.push({
            exercise: ex.title,
            details
          });
        }
      }
    });

    if (sessionBrokenPBs.length > 0) {
      setBrokenPBs(sessionBrokenPBs);
      setPendingSessionToSave(newSession);
      setShowCelebrationModal(true);
    } else {
      // Complete directly if no records were broken
      onSaveWorkout(newSession);
      setActiveSession(null);
      setTimerActive(false);
      setRestTimerActive(false);
      setRestTimeRemaining(0);
    }
  };

  const handleToggleCompleted = (exIdx: number, setIdx: number) => {
    let triggeredRest = false;
    let isCompound = false;

    setActiveSession((prev: any) => {
      if (!prev) return prev;
      
      const targetExercise = prev.exercises[exIdx];
      const targetSet = targetExercise.sets[setIdx];
      const newCompleted = !targetSet.completed;

      if (newCompleted) {
        triggeredRest = true;
        const titleLower = targetExercise.title.toLowerCase();
        isCompound = titleLower.includes('squat') || 
                     titleLower.includes('deadlift') || 
                     titleLower.includes('bench press') || 
                     titleLower.includes('overhead press');
      }

      return {
        ...prev,
        exercises: prev.exercises.map((ex: any, eIdx: number) => {
          if (eIdx !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((set: any, sIdx: number) => {
              if (sIdx !== setIdx) return set;
              return {
                ...set,
                completed: newCompleted
              };
            })
          };
        })
      };
    });

    if (triggeredRest) {
      const seconds = isCompound ? 120 : 90;
      setRestTimeTotal(seconds);
      setRestTimeRemaining(seconds);
      setRestTimerActive(true);

      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    }
  };

  const handleCancelWorkout = () => {
    const confirmCancel = window.confirm(
      '⚠️ ¿Estás seguro de que quieres cancelar el entrenamiento actual? Perderás todo el progreso registrado en esta sesión.'
    );
    if (confirmCancel) {
      setActiveSession(null);
      setTimerActive(false);
      setTimer(0);
      setRestTimerActive(false);
      setRestTimeRemaining(0);
    }
  };

  const handleAddRestTime = () => {
    setRestTimeRemaining(r => r + 30);
    setRestTimeTotal(t => t + 30);
  };

  const handleSubtractRestTime = () => {
    setRestTimeRemaining(r => Math.max(0, r - 30));
  };

  const handleSkipRest = () => {
    setRestTimerActive(false);
    setRestTimeRemaining(0);
  };

  if (isBuildingRoutine) {
    return (
      <RoutineBuilder 
        editRoutineName={editingRoutine?.title}
        editExercises={editingRoutine?.exercises}
        isEditing={!!editingRoutine}
        onSave={(name, exercises, originalName) => {
          onSaveCustomRoutine(name, exercises, originalName);
          setIsBuildingRoutine(false);
          setEditingRoutine(null);
          setSelectedRoutine(name);
        }}
        onCancel={() => {
          setIsBuildingRoutine(false);
          setEditingRoutine(null);
        }}
      />
    );
  }

  if (showRecoveryWizard) {
    const calculatedScore = Math.round((sleepScore + fatigueScore + stressScore + energyScoreInput - 4) * (9 / 12)) + 1;
    
    return (
      <div className="fade-in glass-panel glass-panel-glow" style={{ padding: '30px', maxWidth: '600px', margin: '20px auto', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid hsla(var(--primary) / 0.3)' }}>
        {/* Wizard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '4px' }}>{t.readinessTitle}</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.readinessSubtitle}</h2>
          </div>
          <button 
            onClick={() => {
              setShowRecoveryWizard(false);
              setWizardStep(1);
            }} 
            style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted))', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="wizard-progress-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--muted))', marginBottom: '6px' }}>
            <span>{t.readinessStep.replace('{step}', wizardStep.toString())}</span>
            <span>{t.readinessPercent.replace('{percent}', Math.round((wizardStep / 5) * 100).toString())}</span>
          </div>
          <div className="wizard-progress-track">
            <div className="wizard-progress-bar" style={{ width: `${(wizardStep / 5) * 100}%` }} />
          </div>
        </div>

        {/* STEP 1: SLEEP */}
        {wizardStep === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.readinessQ1}</h3>
            <div className="wizard-cards-grid">
              {[
                { val: 1, label: t.readinessO1_1, desc: t.readinessO1_1D },
                { val: 2, label: t.readinessO1_2, desc: t.readinessO1_2D },
                { val: 3, label: t.readinessO1_3, desc: t.readinessO1_3D },
                { val: 4, label: t.readinessO1_4, desc: t.readinessO1_4D }
              ].map(opt => (
                <div 
                  key={opt.val}
                  onClick={() => {
                    setSleepScore(opt.val);
                    setWizardStep(2);
                  }}
                  className={`wizard-card ${sleepScore === opt.val ? 'selected' : ''}`}
                >
                  <strong style={{ fontSize: '0.95rem', color: sleepScore === opt.val ? 'hsl(var(--primary))' : '#fff' }}>{opt.label}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', marginTop: '2px', lineHeight: '1.4' }}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: FATIGUE */}
        {wizardStep === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.readinessQ2}</h3>
            <div className="wizard-cards-grid">
              {[
                { val: 1, label: t.readinessO2_1, desc: t.readinessO2_1D },
                { val: 2, label: t.readinessO2_2, desc: t.readinessO2_2D },
                { val: 3, label: t.readinessO2_3, desc: t.readinessO2_3D },
                { val: 4, label: t.readinessO2_4, desc: t.readinessO2_4D }
              ].map(opt => (
                <div 
                  key={opt.val}
                  onClick={() => {
                    setFatigueScore(opt.val);
                    setWizardStep(3);
                  }}
                  className={`wizard-card ${fatigueScore === opt.val ? 'selected' : ''}`}
                >
                  <strong style={{ fontSize: '0.95rem', color: fatigueScore === opt.val ? 'hsl(var(--primary))' : '#fff' }}>{opt.label}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', marginTop: '2px', lineHeight: '1.4' }}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: STRESS */}
        {wizardStep === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.readinessQ3}</h3>
            <div className="wizard-cards-grid">
              {[
                { val: 1, label: t.readinessO3_1, desc: t.readinessO3_1D },
                { val: 2, label: t.readinessO3_2, desc: t.readinessO3_2D },
                { val: 3, label: t.readinessO3_3, desc: t.readinessO3_3D },
                { val: 4, label: t.readinessO3_4, desc: t.readinessO3_4D }
              ].map(opt => (
                <div 
                  key={opt.val}
                  onClick={() => {
                    setStressScore(opt.val);
                    setWizardStep(4);
                  }}
                  className={`wizard-card ${stressScore === opt.val ? 'selected' : ''}`}
                >
                  <strong style={{ fontSize: '0.95rem', color: stressScore === opt.val ? 'hsl(var(--primary))' : '#fff' }}>{opt.label}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', marginTop: '2px', lineHeight: '1.4' }}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: ENERGY */}
        {wizardStep === 4 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.readinessQ4}</h3>
            <div className="wizard-cards-grid">
              {[
                { val: 1, label: t.readinessO4_1, desc: t.readinessO4_1D },
                { val: 2, label: t.readinessO4_2, desc: t.readinessO4_2D },
                { val: 3, label: t.readinessO4_3, desc: t.readinessO4_3D },
                { val: 4, label: t.readinessO4_4, desc: t.readinessO4_4D }
              ].map(opt => (
                <div 
                  key={opt.val}
                  onClick={() => {
                    setEnergyScoreInput(opt.val);
                    setWizardStep(5);
                  }}
                  className={`wizard-card ${energyScoreInput === opt.val ? 'selected' : ''}`}
                >
                  <strong style={{ fontSize: '0.95rem', color: energyScoreInput === opt.val ? 'hsl(var(--primary))' : '#fff' }}>{opt.label}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', marginTop: '2px', lineHeight: '1.4' }}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: SUMMARY & CONFIRMATION */}
        {wizardStep === 5 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{t.readinessSubtitle}</span>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'hsl(var(--primary))', margin: '8px 0', textShadow: '0 0 15px hsla(var(--primary) / 0.3)' }}>
                {calculatedScore}/10
              </div>
              <strong style={{ fontSize: '1.05rem', color: '#fff' }}>
                {calculatedScore <= 4 
                  ? (language === 'es' ? '⚠️ Fatiga Alta / Deload Aconsejado' : '⚠️ High Fatigue / Deload Advised') 
                  : calculatedScore >= 8 
                    ? (language === 'es' ? '🔥 Energía Excelente / Sobrecarga Normal' : '🔥 Excellent Energy / Normal Overload') 
                    : (language === 'es' ? '✅ Estado Óptimo / Recuperación Adecuada' : '✅ Optimal State / Adequate Recovery')}
              </strong>
            </div>

            <div 
              style={{ 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '10px', 
                padding: '16px', 
                fontSize: '0.85rem', 
                lineHeight: '1.4', 
                color: '#c7d2fe' 
              }}
            >
              {calculatedScore <= 4 ? (
                <span>{t.readinessDeloadDecision}</span>
              ) : calculatedScore >= 8 ? (
                <span>{t.readinessNormalDecision}</span>
              ) : (
                <span>{t.readinessStableDecision}</span>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => {
                setRecoveryScore(calculatedScore);
                handleStartWorkout(calculatedScore);
                setShowRecoveryWizard(false);
                setWizardStep(1);
                const todayStr = getLocalDateString();
                localStorage.setItem('plnexc_last_recovery_date', todayStr);
                localStorage.setItem('plnexc_last_recovery_score', calculatedScore.toString());
              }}
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 'bold' }}
            >
              {t.readinessStartBtn}
            </button>
          </div>
        )}

        {/* Wizard Footer Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          {wizardStep > 1 ? (
            <button 
              className="btn btn-secondary" 
              onClick={() => setWizardStep(wizardStep - 1)}
              style={{ padding: '6px 16px', fontSize: '0.85rem' }}
            >
              {t.readinessBackBtn}
            </button>
          ) : (
            <div />
          )}

          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowRecoveryWizard(false);
              setWizardStep(1);
            }}
            style={{ padding: '6px 16px', fontSize: '0.85rem', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .btn-standards {
          background: transparent;
          border: none;
          color: hsl(var(--muted));
          font-size: 0.72rem;
          font-weight: 600;
          padding: 4px 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          transition: all var(--transition-fast);
        }
        .btn-standards:hover {
          color: hsl(var(--primary));
          text-shadow: 0 0 8px hsla(var(--primary) / 0.3);
        }
        .btn-standards.active {
          color: hsl(var(--primary));
        }

        .standards-container {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.00) 100%);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.05);
          animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .standards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .standard-card {
          padding: 8px 10px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.00) 100%);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: all var(--transition-fast);
        }

        .standard-card:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          transform: translateY(-1px);
        }

        .standard-card.beginner {
          border-color: rgba(147, 197, 253, 0.08);
        }
        .standard-card.beginner:hover {
          border-color: rgba(147, 197, 253, 0.25);
          box-shadow: 0 4px 12px rgba(147, 197, 253, 0.05);
        }

        .standard-card.intermediate {
          border-color: hsla(var(--primary) / 0.08);
          background: linear-gradient(180deg, hsla(var(--primary) / 0.03) 0%, hsla(var(--primary) / 0.00) 100%);
        }
        .standard-card.intermediate:hover {
          border-color: hsla(var(--primary) / 0.25);
          box-shadow: 0 4px 12px hsla(var(--primary) / 0.08);
        }

        .standard-card.advanced {
          border-color: hsla(var(--secondary) / 0.08);
          background: linear-gradient(180deg, hsla(var(--secondary) / 0.03) 0%, hsla(var(--secondary) / 0.00) 100%);
        }
        .standard-card.advanced:hover {
          border-color: hsla(var(--secondary) / 0.25);
          box-shadow: 0 4px 12px hsla(var(--secondary) / 0.08);
        }

        .routine-grid {
          display: flex;
          overflow-x: auto;
          gap: 12px;
          margin-top: 8px;
          padding: 6px 4px 12px 4px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        
        .routine-grid::-webkit-scrollbar {
          height: 6px;
        }
        .routine-grid::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 3px;
        }
        .routine-grid::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          transition: background var(--transition-fast);
        }
        .routine-grid::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.4);
        }

        .routine-card {
          flex: 0 0 260px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid hsl(var(--border));
          border-radius: var(--border-radius-md);
          padding: 14px 16px;
          cursor: pointer;
          transition: all var(--transition-smooth);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
          position: relative;
          overflow: hidden;
          min-height: 140px;
        }

        .routine-card:hover {
          transform: translateY(-2px);
          border-color: hsla(var(--primary) / 0.4);
          box-shadow: 0 4px 20px rgba(0, 242, 254, 0.05);
        }

        .routine-card.active {
          background: hsla(var(--primary) / 0.04);
          border-color: hsl(var(--primary));
          box-shadow: 0 0 20px hsla(var(--primary) / 0.15);
        }

        .routine-card.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: hsl(var(--primary));
        }

        /* Highlights para rutinas creadas y modificadas */
        .routine-card.created {
          background: hsla(142, 70%, 50%, 0.02);
          border-color: hsla(142, 70%, 50%, 0.25);
        }
        .routine-card.created:hover {
          border-color: hsl(142, 70%, 50%);
          box-shadow: 0 4px 20px hsla(142, 70%, 50%, 0.1);
        }
        .routine-card.created.active {
          background: hsla(142, 70%, 50%, 0.06);
          border-color: hsl(142, 70%, 50%);
          box-shadow: 0 0 20px hsla(142, 70%, 50%, 0.25);
        }
        .routine-card.created.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: hsl(142, 70%, 50%);
        }

        .routine-card.modified {
          background: hsla(262, 80%, 50%, 0.02);
          border-color: hsla(262, 80%, 50%, 0.25);
        }
        .routine-card.modified:hover {
          border-color: hsl(262, 80%, 50%);
          box-shadow: 0 4px 20px hsla(262, 80%, 50%, 0.1);
        }
        .routine-card.modified.active {
          background: hsla(262, 80%, 50%, 0.06);
          border-color: hsl(262, 80%, 50%);
          box-shadow: 0 0 20px hsla(262, 80%, 50%, 0.25);
        }
        .routine-card.modified.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: hsl(262, 80%, 50%);
        }

        .btn-card-action {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: hsl(var(--muted));
          border-radius: 6px;
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-card-action:hover {
          color: hsl(var(--primary));
          border-color: hsla(var(--primary) / 0.3);
          background: hsla(var(--primary) / 0.05);
        }

        .btn-card-action.btn-card-danger:hover {
          color: hsl(var(--danger));
          border-color: hsla(var(--danger) / 0.3);
          background: hsla(var(--danger) / 0.05);
        }
      `}</style>
      
      {/* 1. SELECTION & WELLNESS QUESTIONNAIRE (BEFORE STARTING) */}
      {!activeSession ? (
        <>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={24} color="hsl(var(--primary))" />
                  {t.newWorkoutSession}
                  <span style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))', fontWeight: 'normal', opacity: 0.5, marginLeft: '6px' }}>v1.4.1</span>
                </h2>
                <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
                  {t.newWorkoutSessionDesc}
                </p>
              </div>

            </div>

            <div>
              {/* Routine Cards Selection */}
              <div>
                <label style={{ fontSize: '0.9rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{language === 'es' ? 'Seleccionar Rutina' : 'Select Routine'}</label>
                <div 
                  ref={routineGridRef}
                  className="routine-grid"
                >
                  {/* Tarjeta vacía para crear rutina */}
                  <div 
                    onClick={() => setIsBuildingRoutine(true)}
                    className="routine-card"
                    style={{
                      borderStyle: 'dashed',
                      borderWidth: '2px',
                      borderColor: 'hsla(var(--primary) / 0.3)',
                      background: 'rgba(255, 255, 255, 0.01)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '140px',
                      flexDirection: 'column',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-smooth)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                      e.currentTarget.style.background = 'rgba(0, 242, 254, 0.02)';
                      e.currentTarget.style.boxShadow = '0 0 15px hsla(var(--primary) / 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.3)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Plus size={28} color="hsl(var(--primary))" style={{ opacity: 0.8 }} />
                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--primary))', fontWeight: 700 }}>{t.createRoutineBtn}</span>
                  </div>

                  {routines.map((r) => (
                    <div 
                      key={r.title}
                      onClick={() => {
                        setSelectedRoutine(r.title);
                        setShowPreviewModal(true);
                      }}
                      className={`routine-card ${selectedRoutine === r.title ? 'active' : ''} ${r.highlight}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`badge ${
                          r.highlight === 'created' ? 'badge-success' : r.highlight === 'modified' ? 'badge-secondary' : 'badge-primary'
                        }`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {r.highlight === 'created' 
                            ? (language === 'es' ? '★ Creada por ti' : '★ Created by you') 
                            : r.highlight === 'modified' 
                              ? (language === 'es' ? '✎ Modificada' : '✎ Modified') 
                              : (language === 'es' ? '✦ Prediseñada' : '✦ Preset')}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoutine({ title: r.title, exercises: r.exercises });
                              setIsBuildingRoutine(true);
                            }}
                            title={language === 'es' ? 'Editar Rutina' : 'Edit Routine'}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            className="btn-card-action btn-card-danger" 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(language === 'es' ? `¿Estás seguro de que quieres eliminar la rutina "${r.title}"?` : `Are you sure you want to delete the routine "${r.title}"?`)) {
                                onDeleteRoutine(r.title);
                                setSelectedRoutine(routines.find(rout => rout.title !== r.title)?.title || '');
                              }
                            }}
                            title={language === 'es' ? 'Eliminar Rutina' : 'Delete Routine'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: '4px 0 2px 0' }}>
                          {r.title}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '32px', lineHeight: '1.4' }}>
                          {r.exercises.length > 0 
                            ? r.exercises.map(resolveExerciseDisplayName).join(', ') 
                            : (language === 'es' ? 'Sin ejercicios registrados' : 'No exercises registered')}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--primary))' }}>
                          <Dumbbell size={14} />
                          <span>{r.exercises.length} {
                            r.exercises.length === 1 
                              ? (language === 'es' ? 'ejercicio' : 'exercise') 
                              : (language === 'es' ? 'ejercicios' : 'exercises')
                          }</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>            {/* Exercise Preview Container */}



          </div>

          {/* Historial de Entrenamientos Recientes */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="hsl(var(--primary))" />
              Historial de Entrenamientos Recientes
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {localHistory.slice(0, 5).map((session, idx) => {
                let totalSets = 0;
                let totalVolume = 0;
                let hasSessionPain = false;
                
                session.exercises.forEach((ex: any) => {
                  totalSets += ex.sets.length;
                  let exVolume = 0;
                  ex.sets.forEach((s: any) => {
                    const weight = s.weightKg || s.weight_kg || 0;
                    const reps = s.reps || 0;
                    exVolume += weight * reps;
                    if (s.hasPain) {
                      hasSessionPain = true;
                    }
                  });
                  totalVolume += exVolume;
                });
                
                const dateObj = new Date(session.parsedDate);
                const dateStr = dateObj.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div 
                    key={`${session.title}_${session.startTime}_${idx}`}
                    style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--border-radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{session.title}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>{dateStr}</span>
                        <button
                          onClick={() => onDeleteWorkout(session.parsedDate)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'hsl(var(--muted))',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Eliminar entrenamiento"
                        >
                          <X size={14} className="hover-danger" />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>
                      <span>🏋️ {session.exercises.length} Ejercicios</span>
                      <span>🔄 {totalSets} Series</span>
                      <span>📊 Volumen: <strong>{totalVolume.toLocaleString()} kg</strong></span>
                      {hasSessionPain && (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                          ⚠️ Molestia Reportada
                        </span>
                      )}
                    </div>

                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: 'rgba(255,255,255,0.4)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      borderTop: '1px dashed rgba(255,255,255,0.05)',
                      paddingTop: '8px',
                      marginTop: '4px'
                    }}>
                      {session.exercises.map((ex: any) => ex.title).join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        
        /* 2. ACTIVE WORKOUT LOGGER */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Workout Info Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: '4px' }}>Entrenamiento Activo</span>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{activeSession.title}</h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Timer & Play/Pause */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: 'rgba(255,255,255,0.03)',
                padding: '6px 12px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid hsl(var(--border))'
              }}>
                <button 
                  onClick={() => setTimerActive(!timerActive)}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: timerActive ? 'hsl(var(--primary))' : 'hsl(var(--warning))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={timerActive ? 'Pausar' : 'Reanudar'}
                >
                  {timerActive ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '1.1rem', 
                  fontWeight: 700, 
                  color: timerActive ? 'hsl(var(--primary))' : 'hsl(var(--warning))',
                  fontFamily: 'monospace'
                }}>
                  <Clock size={16} />
                  <span>{formatTime(timer)}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-danger" onClick={handleCancelWorkout} style={{ padding: '8px 16px' }} title="Cancelar entrenamiento">
                  <X size={18} /> Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleFinishWorkout} style={{ padding: '8px 16px' }}>
                  <Check size={18} /> Completar
                </button>
              </div>
            </div>
          </div>

          {/* Rest Timer Banner */}
          {restTimeRemaining > 0 && (
            <div className="glass-panel fade-in" style={{ 
              padding: '16px 20px', 
              background: 'hsla(var(--secondary) / 0.08)', 
              borderColor: 'hsla(var(--secondary) / 0.3)',
              boxShadow: '0 0 15px hsla(var(--secondary) / 0.15)',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              borderRadius: 'var(--border-radius-md)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={20} color="hsl(var(--secondary))" style={{ animation: 'fadeIn 1.5s infinite alternate' }} />
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>Tiempo de Descanso Activo</strong>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                      Espera o ajusta el tiempo de recuperación entre series
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', color: 'hsl(var(--secondary))' }}>
                    {formatTime(restTimeRemaining)}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" onClick={handleSubtractRestTime} style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Minus size={12} /> 30s
                    </button>
                    <button className="btn btn-secondary" onClick={handleAddRestTime} style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Plus size={12} /> 30s
                    </button>
                    <button className="btn btn-warning" onClick={handleSkipRest} style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <SkipForward size={12} /> Omitir
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${(restTimeRemaining / restTimeTotal) * 100}%`, 
                  background: 'hsl(var(--secondary))',
                  borderRadius: '3px',
                  transition: 'width 1s linear'
                }} />
              </div>
            </div>
          )}

          {/* Paused Session Warning Banner */}
          {!timerActive && (
            <div className="glass-panel fade-in" style={{ 
              padding: '14px 20px', 
              background: 'hsla(var(--warning) / 0.08)', 
              borderColor: 'hsla(var(--warning) / 0.3)',
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center',
              borderRadius: 'var(--border-radius-md)',
              color: 'hsl(var(--warning))'
            }}>
              <Pause size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Entrenamiento Pausado. El temporizador de duración de la sesión está detenido. Pulsa "Reanudar" para continuar.
              </span>
            </div>
          )}

          {/* Exercises Loop */}
          {activeSession.exercises.map((ex: any, exIdx: number) => (
            <div key={ex.originalTitle} className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
              
              {/* Exercise Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Dumbbell size={18} color="hsl(var(--primary))" />
                    {ex.title}
                  </h3>
                  {ex.isSubstituted && (
                    <span className="badge badge-warning" style={{ marginTop: '6px' }}>
                      {language === 'es' ? '⚠️ Variante PLNEXC por dolor en' : '⚠️ PLNEXC variation due to pain in'} {activeInjury ? (translateEngineText(MILO_REHAB_PROTOCOLS[activeInjury.joint]?.displayName || '', language) || activeInjury.joint) : ''}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span><strong>Objetivo:</strong> {ex.suggestion.suggestedWeight}kg x {ex.suggestion.suggestedReps} reps</span>
                  {(() => {
                    const standards = getStrengthStandards(ex.title, bodyWeight, gender, height, bodyFat);
                    if (!standards) return null;
                    const isExpanded = !!expandedStandards[ex.title];
                    return (
                      <button 
                        onClick={() => setExpandedStandards(prev => ({ ...prev, [ex.title]: !isExpanded }))}
                        className={`btn-standards ${isExpanded ? 'active' : ''}`}
                      >
                        <Target size={12} style={{ opacity: isExpanded ? 1 : 0.6 }} />
                        <span>{isExpanded ? 'Ocultar estándares' : 'Estándares de fuerza'}</span>
                      </button>
                    );
                  })()}
                  {(() => {
                    let foundEx = EXERCISES_DB.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                    if (!foundEx && ex.originalTitle) {
                      foundEx = EXERCISES_DB.find(dbEx => dbEx.title.toLowerCase() === ex.originalTitle.toLowerCase());
                    }
                    if (!foundEx) {
                      const cleanTitle = ex.title.toLowerCase();
                      if (cleanTitle.includes('squat')) {
                        foundEx = EXERCISES_DB.find(d => d.id === 'squat_barbell');
                      } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                        foundEx = EXERCISES_DB.find(d => d.id === 'bench_press_barbell');
                      } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                        foundEx = EXERCISES_DB.find(d => d.id === 'deadlift_barbell');
                      } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                        foundEx = EXERCISES_DB.find(d => d.id === 'overhead_press_barbell');
                      } else if (cleanTitle.includes('row')) {
                        foundEx = EXERCISES_DB.find(d => d.id === 'bent_over_row_barbell');
                      } else if (cleanTitle.includes('curl')) {
                        foundEx = EXERCISES_DB.find(d => d.id === 'bicep_curl_dumbbell');
                      } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                        foundEx = EXERCISES_DB.find(d => d.id === 'pull_up');
                      }
                    }

                    if (!foundEx || !foundEx.instructions) return null;
                    const isExExpanded = !!expandedInstructions[ex.title];
                    return (
                      <button 
                        onClick={() => setExpandedInstructions(prev => ({ ...prev, [ex.title]: !isExExpanded }))}
                        className={`btn-standards ${isExExpanded ? 'active' : ''}`}
                        style={{ marginTop: '4px' }}
                      >
                        <BookOpen size={12} style={{ opacity: isExExpanded ? 1 : 0.6 }} />
                        <span>{isExExpanded ? 'Ocultar técnica' : 'Ver técnica / guía'}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* PLNEXC Substitution Tips box */}
              {ex.isSubstituted && ex.subRule && (
                <div style={{ background: 'hsla(var(--warning) / 0.05)', border: '1px solid hsla(var(--warning) / 0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.825rem', marginBottom: '16px', color: 'hsl(var(--warning))' }}>
                  <strong>Por qué cambiamos:</strong> {ex.subRule.reason} <br />
                  <strong>Consejo PLNEXC Rehab:</strong> {ex.subRule.rehabTips}
                </div>
              )}

              {/* Overload Engine Coaching Tips Box */}
              {!ex.isSubstituted && (
                <div style={{ background: 'hsla(var(--primary) / 0.03)', border: '1px solid hsla(var(--primary) / 0.1)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '16px', color: '#c7d2fe' }}>
                  💡 <strong>Coach de Fuerza:</strong> {ex.suggestion.message}
                </div>
              )}

              {/* PB Record reference box */}
              {(() => {
                const profile = pbProfiles[ex.title];
                if (!profile || profile.maxWeight.weight === 0) return null;
                return (
                  <div style={{ 
                    background: 'hsla(45, 100%, 50%, 0.03)', 
                    border: '1px solid hsla(45, 100%, 50%, 0.15)', 
                    padding: '10px 14px', 
                    borderRadius: '8px', 
                    fontSize: '0.8rem', 
                    marginBottom: '16px', 
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🏆</span>
                    <div>
                      <strong>Récord de Fuerza:</strong> {profile.maxWeight.weight} kg x {profile.maxWeight.reps} reps
                      <span style={{ opacity: 0.7, marginLeft: '8px' }}>
                        (1RM Estimado: {Math.round(profile.maxEst1RM.value)} kg)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Estándares de Fuerza Colapsables (Versión Premium Discreta) */}
              {(() => {
                const standards = getStrengthStandards(ex.title, bodyWeight, gender, height, bodyFat);
                if (!standards) return null;
                const isExpanded = !!expandedStandards[ex.title];
                if (!isExpanded) return null;
                
                return (
                  <div className="standards-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: 'hsl(var(--primary))', boxShadow: '0 0 6px hsl(var(--primary))' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                          Estándares de Fuerza para tu peso
                        </span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))' }}>{standards.label}</span>
                    </div>
                    
                    <div className="standards-grid">
                      <div className="standard-card beginner">
                        <span style={{ fontSize: '0.6rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Principiante</span>
                        <strong style={{ fontSize: '0.85rem', color: '#93c5fd', textShadow: '0 0 10px rgba(147,197,253,0.15)' }}>{standards.beginner}</strong>
                      </div>
                      <div className="standard-card intermediate">
                        <span style={{ fontSize: '0.6rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Intermedio</span>
                        <strong style={{ fontSize: '0.85rem', color: 'hsl(var(--primary))', textShadow: '0 0 10px hsla(var(--primary) / 0.2)' }}>{standards.intermediate}</strong>
                      </div>
                      <div className="standard-card advanced">
                        <span style={{ fontSize: '0.6rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Avanzado</span>
                        <strong style={{ fontSize: '0.85rem', color: 'hsl(var(--secondary))', textShadow: '0 0 10px hsla(var(--secondary) / 0.2)' }}>{standards.advanced}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Técnica e Instrucciones Colapsables con Imagen en la Nube */}
              {(() => {
                let foundEx = EXERCISES_DB.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                if (!foundEx && ex.originalTitle) {
                  foundEx = EXERCISES_DB.find(dbEx => dbEx.title.toLowerCase() === ex.originalTitle.toLowerCase());
                }
                if (!foundEx) {
                  const cleanTitle = ex.title.toLowerCase();
                  if (cleanTitle.includes('squat')) {
                    foundEx = EXERCISES_DB.find(d => d.id === 'squat_barbell');
                  } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                    foundEx = EXERCISES_DB.find(d => d.id === 'bench_press_barbell');
                  } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                    foundEx = EXERCISES_DB.find(d => d.id === 'deadlift_barbell');
                  } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                    foundEx = EXERCISES_DB.find(d => d.id === 'overhead_press_barbell');
                  } else if (cleanTitle.includes('row')) {
                    foundEx = EXERCISES_DB.find(d => d.id === 'bent_over_row_barbell');
                  } else if (cleanTitle.includes('curl')) {
                    foundEx = EXERCISES_DB.find(d => d.id === 'bicep_curl_dumbbell');
                  } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                    foundEx = EXERCISES_DB.find(d => d.id === 'pull_up');
                  }
                }

                if (!foundEx || !foundEx.instructions) return null;
                const isExExpanded = !!expandedInstructions[ex.title];
                if (!isExExpanded) return null;

                return (
                  <div className="standards-container" style={{ marginTop: '0px', marginBottom: '16px', borderLeft: '3px solid hsl(var(--primary))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookOpen size={16} color="hsl(var(--primary))" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                          Guía Técnica de Realización: {foundEx.title}
                        </span>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Nube</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {foundEx.image && (
                        <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'rgba(0,0,0,0.2)' }}>
                          <img 
                            src={foundEx.image} 
                            alt={foundEx.title}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: '#e5e7eb', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
                        {foundEx.instructions.map((inst, idx) => (
                          <li key={idx}>{inst}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })()}

              {/* Sets Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '450px' }}>
                  <thead>
                    <tr style={{ color: 'hsl(var(--muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px' }}>{t.tableSet}</th>
                      <th style={{ padding: '8px' }}>{t.tableType}</th>
                      <th style={{ padding: '8px' }}>{t.tableWeight}</th>
                      <th style={{ padding: '8px' }}>{language === 'es' ? 'Reps' : 'Reps'}</th>
                      <th style={{ padding: '8px' }}>RPE / {t.tablePain}</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>{t.tableCompleted}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((set: any, setIdx: number) => (
                      <tr 
                        key={set.setIndex} 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: set.completed ? 'rgba(0, 242, 254, 0.01)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '10px 8px', fontWeight: 700 }}>{set.setIndex + 1}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <select 
                            value={set.setType} 
                            onChange={(e) => handleSetChange(exIdx, setIdx, 'setType', e.target.value)}
                            style={{ padding: '4px', fontSize: '0.75rem', width: 'auto' }}
                          >
                            <option value="normal">{t.tableNormal}</option>
                            <option value="warmup">{t.tableWarmup}</option>
                            <option value="failure">{language === 'es' ? 'Al Fallo' : 'To Failure'}</option>
                            <option value="dropset">Dropset</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <input 
                            type="number" 
                            step="0.5"
                            value={set.weightKg === null ? '' : set.weightKg} 
                            placeholder="0"
                            onChange={(e) => handleSetChange(exIdx, setIdx, 'weightKg', e.target.value ? parseFloat(e.target.value) : null)}
                            style={{ padding: '6px', fontSize: '0.85rem', width: '70px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <input 
                            type="number" 
                            value={set.reps === null ? '' : set.reps} 
                            placeholder="0"
                            onChange={(e) => handleSetChange(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value, 10) : null)}
                            style={{ padding: '6px', fontSize: '0.85rem', width: '60px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select 
                              value={set.rpe === null ? '' : set.rpe} 
                              disabled={set.hasPain}
                              onChange={(e) => handleSetChange(exIdx, setIdx, 'rpe', e.target.value ? parseFloat(e.target.value) : null)}
                              style={{ padding: '4px', fontSize: '0.75rem', width: '65px' }}
                            >
                              <option value="">RPE</option>
                              <option value="10">10 (Fallo)</option>
                              <option value="9.5">9.5</option>
                              <option value="9">9 (1 RIR)</option>
                              <option value="8.5">8.5</option>
                              <option value="8">8 (2 RIR)</option>
                              <option value="7">7 (3 RIR)</option>
                              <option value="6">6 (Fácil)</option>
                            </select>

                            <button 
                              className={`set-pain-btn ${set.hasPain ? 'has-pain' : ''}`}
                              onClick={() => handleTogglePain(exIdx, setIdx)}
                              title={set.hasPain ? 'Registrado con Dolor' : 'Reportar Dolor/Molestia'}
                            >
                              <AlertTriangle size={14} />
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {(() => {
                              if (!set.completed) return null;
                              const weight = set.weightKg || 0;
                              const reps = set.reps || 0;
                              if (weight <= 0 || reps <= 0) return null;

                              const profile = pbProfiles[ex.title];
                              const est1RM = weight * (1 + reps / 30);
                              
                              let isPB = false;
                              let pbReason = "";
                              
                              if (profile) {
                                const isNewMaxWeight = weight > profile.maxWeight.weight;
                                const isNewMaxEst1RM = est1RM > profile.maxEst1RM.value;
                                const isNewRepPR = !profile.repPRs[reps] || weight > profile.repPRs[reps].weight;
                                
                                if (profile.maxWeight.weight > 0 && (isNewMaxWeight || isNewMaxEst1RM || isNewRepPR)) {
                                  isPB = true;
                                  if (isNewMaxWeight && isNewMaxEst1RM) {
                                    pbReason = "🏆 ¡Nuevo Récord de Peso Máximo y 1RM Estimado!";
                                  } else if (isNewMaxWeight) {
                                    pbReason = "🏆 ¡Nuevo Récord de Peso Máximo!";
                                  } else if (isNewMaxEst1RM) {
                                    pbReason = "🏆 ¡Nuevo Récord de 1RM Estimado!";
                                  } else if (isNewRepPR) {
                                    pbReason = `🏆 ¡Nuevo Récord para ${reps} Repeticiones!`;
                                  }
                                }
                              }
                              
                              if (isPB) {
                                return (
                                  <span title={pbReason} style={{ display: 'inline-flex' }}>
                                    <Award 
                                      size={16} 
                                      color="#fbbf24" 
                                      style={{ 
                                        filter: 'drop-shadow(0 0 3px rgba(251, 191, 36, 0.6))',
                                        animation: 'pulseScale 1s infinite alternate',
                                        cursor: 'help'
                                      }} 
                                    />
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            <button
                              onClick={() => handleToggleCompleted(exIdx, setIdx)}
                              className={`set-checkbox-btn ${set.completed ? 'completed' : ''}`}
                            >
                              {set.completed && <Check size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warnings box when pain is reported in active set */}
              {ex.sets.some((s: any) => s.hasPain) && (
                <div style={{ marginTop: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px', borderRadius: '8px', color: 'hsl(var(--danger))', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem' }}>
                  <AlertTriangle size={18} />
                  <span>
                    <strong>Alerta de Dolor:</strong> No fuerces el movimiento. Reduce el peso de inmediato o sustituye el ejercicio por su variante Milo haciendo click en Molestia.
                  </span>
                </div>
              )}

              {/* Set Actions Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button className="btn btn-secondary" onClick={() => handleRemoveSet(exIdx)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                  {t.activeWorkoutRemoveSet}
                </button>
                <button className="btn btn-secondary" onClick={() => handleAddSet(exIdx)} style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' }}>
                  {t.activeWorkoutAddSet}
                </button>
              </div>

            </div>
          ))}

        </div>
      )}

      {/* PB Celebration Modal */}
      {showCelebrationModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '30px',
            textAlign: 'center',
            border: '1px solid hsla(45, 100%, 50%, 0.3)',
            boxShadow: '0 0 30px hsla(45, 100%, 50%, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>
              <div style={{
                fontSize: '3.5rem',
                animation: 'pulseScale 1s infinite alternate',
                display: 'inline-block',
                marginBottom: '10px'
              }}>
                🏆
              </div>
              <h2 style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: '#fbbf24',
                textShadow: '0 0 15px rgba(251, 191, 36, 0.4)',
                margin: 0
              }}>
                {t.pbCelebrationTitle}
              </h2>
              <p style={{
                color: 'hsl(var(--muted))',
                fontSize: '0.9rem',
                marginTop: '6px'
              }}>
                {t.pbCelebrationSubtitle}
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              textAlign: 'left',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--border-radius-md)',
              padding: '16px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {brokenPBs.map((pb, idx) => (
                <div key={idx} style={{
                  borderBottom: idx < brokenPBs.length - 1 ? '1px dashed rgba(255, 255, 255, 0.05)' : 'none',
                  paddingBottom: idx < brokenPBs.length - 1 ? '10px' : 0,
                  marginBottom: idx < brokenPBs.length - 1 ? '10px' : 0
                }}>
                  <strong style={{ fontSize: '0.95rem', color: '#ffffff', display: 'block', marginBottom: '4px' }}>
                    💪 {resolveExerciseDisplayName(pb.exercise)}
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.825rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                    {pb.details.map((detail: string, dIdx: number) => (
                      <li key={dIdx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                if (pendingSessionToSave) {
                  onSaveWorkout(pendingSessionToSave);
                }
                setActiveSession(null);
                setTimerActive(false);
                setRestTimerActive(false);
                setRestTimeRemaining(0);
                setBrokenPBs([]);
                setPendingSessionToSave(null);
                setShowCelebrationModal(false);
              }}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                borderColor: '#fbbf24',
                color: '#000000',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                cursor: 'pointer'
              }}
            >
              {t.pbCelebrationSaveBtn}
            </button>
          </div>
        </div>,
        document.body
      )}

      {showPreviewModal && previewExercises.length > 0 && selectedRoutineObj && createPortal(
        <div 
          onClick={() => setShowPreviewModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel fade-in" 
            style={{ 
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              border: '1px solid hsla(var(--primary) / 0.3)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
              background: '#0a0e17'
            }}
          >
            {/* Header of the unified details card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsla(var(--border) / 0.5)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={18} color="hsl(var(--primary))" />
                  {selectedRoutineObj.title}
                </h3>
                <p style={{ color: 'hsl(var(--muted))', fontSize: '0.75rem', margin: '2px 0 0 0' }}>
                  {t.routinePreviewTitle} • {t.routineExercisesCount.replace('{count}', previewExercises.length.toString())}
                </p>
              </div>
              {/* Minimalist close button */}
              <button 
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--muted))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '50%',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted))'; e.currentTarget.style.background = 'transparent'; }}
                title={t.close}
              >
                <X size={18} />
              </button>
            </div>

            {/* Vertical list of exercises */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {previewExercises.map((ex, index) => {
                let willBeSubstituted = false;
                let substitutionTitle = '';
                let subRule: any = null;
                if (activeInjury) {
                  const rule = getSubstitutedExercise(ex.title);
                  if (rule) {
                    willBeSubstituted = true;
                    substitutionTitle = rule.substitutedExercise;
                    subRule = rule;
                  }
                }

                const isStandardsExpanded = !!expandedStandards[ex.title];
                const isInstructionsExpanded = !!expandedInstructions[ex.title];

                return (
                  <div 
                    key={ex.id + '_' + index}
                    style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid hsla(var(--border) / 0.5)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all var(--transition-smooth)'
                    }}
                  >
                    {/* Main row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
                        {/* Neon cyan dot */}
                        <span 
                          style={{ 
                            display: 'inline-block', 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            background: willBeSubstituted ? 'hsl(var(--warning))' : 'hsl(var(--primary))', 
                            boxShadow: willBeSubstituted ? '0 0 8px hsl(var(--warning))' : '0 0 8px hsl(var(--primary))',
                            flexShrink: 0
                          }} 
                        />
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>
                            {resolveExerciseDisplayName(ex.title)}
                          </strong>
                          {willBeSubstituted && (
                            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--warning))', fontWeight: 600, marginTop: '2px' }}>
                              ⚠️ {language === 'es' ? 'Sustituido por:' : 'Substituted by:'} {resolveExerciseDisplayName(substitutionTitle)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badges & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '2px 6px', textTransform: 'capitalize' }}>
                            {translateMuscleGroup(ex.muscleGroup)}
                          </span>
                          <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '2px 6px', textTransform: 'capitalize' }}>
                            {translateEquipment(ex.equipment)}
                          </span>
                        </div>

                        {/* Action Quick Access Toggles */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {/* Strength Standards Toggle */}
                          {(() => {
                            const standards = getStrengthStandards(ex.title, bodyWeight, gender, height, bodyFat);
                            if (!standards) return null;
                            return (
                              <button
                                onClick={() => setExpandedStandards(prev => ({ ...prev, [ex.title]: !isStandardsExpanded }))}
                                style={{
                                  background: isStandardsExpanded ? 'hsla(var(--primary) / 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid ' + (isStandardsExpanded ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.8)'),
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  color: isStandardsExpanded ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all var(--transition-fast)'
                                }}
                              >
                                <Target size={12} />
                                <span>{language === 'es' ? 'Estándares' : 'Standards'}</span>
                              </button>
                            );
                          })()}

                          {/* Tech Guide Toggle */}
                          {(() => {
                            let foundEx = EXERCISES_DB.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                            if (!foundEx) {
                              const cleanTitle = ex.title.toLowerCase();
                              if (cleanTitle.includes('squat')) {
                                foundEx = EXERCISES_DB.find(d => d.id === 'squat_barbell');
                              } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                                foundEx = EXERCISES_DB.find(d => d.id === 'bench_press_barbell');
                              } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                                foundEx = EXERCISES_DB.find(d => d.id === 'deadlift_barbell');
                              } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                                foundEx = EXERCISES_DB.find(d => d.id === 'overhead_press_barbell');
                              } else if (cleanTitle.includes('row')) {
                                foundEx = EXERCISES_DB.find(d => d.id === 'bent_over_row_barbell');
                              } else if (cleanTitle.includes('curl')) {
                                foundEx = EXERCISES_DB.find(d => d.id === 'bicep_curl_dumbbell');
                              } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                                foundEx = EXERCISES_DB.find(d => d.id === 'pull_up');
                              }
                            }

                            if (!foundEx || !foundEx.instructions) return null;
                            return (
                              <button
                                onClick={() => setExpandedInstructions(prev => ({ ...prev, [ex.title]: !isInstructionsExpanded }))}
                                style={{
                                  background: isInstructionsExpanded ? 'hsla(var(--primary) / 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid ' + (isInstructionsExpanded ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.8)'),
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  color: isInstructionsExpanded ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all var(--transition-fast)'
                                }}
                              >
                                <BookOpen size={12} />
                                <span>{language === 'es' ? 'Guía' : 'Guide'}</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible details (injury substitution reasons) */}
                    {willBeSubstituted && subRule && (
                      <div style={{ background: 'hsla(var(--warning) / 0.04)', border: '1px solid hsla(var(--warning) / 0.15)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.75rem', color: 'hsl(var(--warning))' }}>
                        <strong>{language === 'es' ? 'Motivo del Cambio:' : 'Reason for Change:'}</strong> {translateEngineText(subRule.reason, language)} <br />
                        <strong>Rehab Tips:</strong> {translateEngineText(subRule.rehabTips, language)}
                      </div>
                    )}

                    {/* Collapsible Strength Standards */}
                    {(() => {
                      const standards = getStrengthStandards(ex.title, bodyWeight, gender, height, bodyFat);
                      if (!standards || !isStandardsExpanded) return null;
                      return (
                        <div className="standards-container" style={{ margin: 0, padding: '10px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid hsla(var(--border) / 0.4)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                              {language === 'es' ? 'Estándares de Fuerza para tu peso' : 'Strength Standards for your weight'}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))' }}>{standards.label}</span>
                          </div>
                          <div className="standards-grid" style={{ gap: '8px' }}>
                            <div className="standard-card beginner" style={{ padding: '6px' }}>
                              <span style={{ fontSize: '0.55rem', color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Principiante' : 'Beginner'}</span>
                              <strong style={{ fontSize: '0.75rem', color: '#93c5fd' }}>{standards.beginner}</strong>
                            </div>
                            <div className="standard-card intermediate" style={{ padding: '6px' }}>
                              <span style={{ fontSize: '0.55rem', color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Intermedio' : 'Intermediate'}</span>
                              <strong style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))' }}>{standards.intermediate}</strong>
                            </div>
                            <div className="standard-card advanced" style={{ padding: '6px' }}>
                              <span style={{ fontSize: '0.55rem', color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Avanzado' : 'Advanced'}</span>
                              <strong style={{ fontSize: '0.75rem', color: 'hsl(var(--secondary))' }}>{standards.advanced}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Collapsible Technical Guide */}
                    {(() => {
                      let foundEx = EXERCISES_DB.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                      if (!foundEx) {
                        const cleanTitle = ex.title.toLowerCase();
                        if (cleanTitle.includes('squat')) {
                          foundEx = EXERCISES_DB.find(d => d.id === 'squat_barbell');
                        } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                          foundEx = EXERCISES_DB.find(d => d.id === 'bench_press_barbell');
                        } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                          foundEx = EXERCISES_DB.find(d => d.id === 'deadlift_barbell');
                        } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                          foundEx = EXERCISES_DB.find(d => d.id === 'overhead_press_barbell');
                        } else if (cleanTitle.includes('row')) {
                          foundEx = EXERCISES_DB.find(d => d.id === 'bent_over_row_barbell');
                        } else if (cleanTitle.includes('curl')) {
                          foundEx = EXERCISES_DB.find(d => d.id === 'bicep_curl_dumbbell');
                        } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                          foundEx = EXERCISES_DB.find(d => d.id === 'pull_up');
                        }
                      }

                      if (!foundEx || !foundEx.instructions || !isInstructionsExpanded) return null;
                      return (
                        <div className="standards-container" style={{ margin: 0, padding: '10px', background: 'rgba(255, 255, 255, 0.01)', borderLeft: '3px solid hsl(var(--primary))', borderTop: '1px solid hsla(var(--border) / 0.4)', borderRight: '1px solid hsla(var(--border) / 0.4)', borderBottom: '1px solid hsla(var(--border) / 0.4)' }}>
                          {foundEx.image && (
                            <div style={{ width: '100%', maxHeight: '140px', overflow: 'hidden', borderRadius: '6px', border: '1px solid hsl(var(--border))', background: 'rgba(0,0,0,0.2)', marginBottom: '10px' }}>
                              <img 
                                src={foundEx.image} 
                                alt={foundEx.title}
                                loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                            <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {foundEx.instructions.map((step, sIdx) => (
                                <li key={sIdx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* Footer of the details card with action button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', borderTop: '1px solid hsla(var(--border) / 0.5)', paddingTop: '16px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const todayStr = getLocalDateString();
                  const lastRecoveryDate = localStorage.getItem('plnexc_last_recovery_date');
                  if (lastRecoveryDate === todayStr) {
                    const lastScoreStr = localStorage.getItem('plnexc_last_recovery_score');
                    const lastScore = lastScoreStr ? parseInt(lastScoreStr, 10) : 8;
                    handleStartWorkout(lastScore);
                  } else {
                    setWizardStep(1);
                    setShowRecoveryWizard(true);
                  }
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  fontSize: '0.9rem', 
                  padding: '12px 32px', 
                  fontWeight: 'bold',
                  width: '100%',
                  maxWidth: '300px',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: '0 0 15px hsla(var(--primary) / 0.3)'
                }}
              >
                <Play size={16} /> {t.routineStartBtn}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
