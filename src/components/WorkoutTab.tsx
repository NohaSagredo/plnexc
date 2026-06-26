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
  SkipForward,
  Trash2,
  Edit2,
  Target,
  BookOpen,
  Award,
  Volume2,
  VolumeX,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  ArrowUp,
  ArrowDown,
  Search
} from 'lucide-react';
import { proposeNextSet, calculatePBProfiles, getBodyweightPercentage, projectFutureSessions, compressAndResizeImage } from '../utils/ProgressionEngine';
import type { SetData, ProgressionTarget, ProgressionSystem } from '../utils/ProgressionEngine';
import { getSubstitutedExercise, MILO_REHAB_PROTOCOLS } from '../utils/MiloRehabEngine';
import type { SubstitutionRule } from '../utils/MiloRehabEngine';
import RoutineBuilder from './RoutineBuilder';
import CreateExerciseModal from './CreateExerciseModal';
import { publishWorkoutToFeed } from '../utils/firebaseSync';
import { auth } from '../utils/firebase';
import { DEFAULT_PRESETS } from '../data/default_routines';
import { EXERCISES_DB, isTimeBasedExercise, getExerciseImage } from '../data/exercises_db';
import type { Exercise } from '../data/exercises_db';
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
  onUpdateWorkout: (updatedSession: any) => void;
  localHistory: any[];
  customRoutines: any[];
  onSaveCustomRoutine: (name: string, exercises: (string | { title: string; restTime?: number })[], originalName?: string) => void;
  onDeleteRoutine: (name: string) => void;
  deletedRoutines: string[];
  bodyWeight: number;
  height: number;
  gender: 'Masculino' | 'Femenino';
  bodyFat: number;
  language: 'es' | 'en';
  progressionSystem: ProgressionSystem;
  progressPhotos: any[];
  profilePicture: string;
  username: string;
  displayName: string;
  onAddProgressPhoto: (photo: any) => void;
  pendingRoutineToStart?: any;
  onClearPendingRoutine?: () => void;
  customExercises: Exercise[];
  onSaveCustomExercise: (exercise: Omit<Exercise, 'id'> & { id?: string }) => void;
  onDeleteCustomExercise: (id: string) => void;
}

// Dynamically generate a beep sound as a WAV Data URI/Blob to bypass iOS Web Audio API mute/silent-switch limitations
const generateBeepWav = (frequency: number, duration: number) => {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = Math.floor(sampleRate * duration);
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, fileSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Generate sine wave samples with attack (fade-in) and decay (fade-out) envelope
  // to avoid pops/clicks and make it sound soft and premium
  const attackSamples = Math.floor(dataSize * 0.15); // 15% fade-in
  const decaySamples = Math.floor(dataSize * 0.40);  // 40% fade-out

  for (let i = 0; i < dataSize; i++) {
    const t = i / sampleRate;
    let volumeScale = 1.0;

    if (i < attackSamples) {
      volumeScale = i / attackSamples;
    } else if (i > dataSize - decaySamples) {
      volumeScale = (dataSize - i) / decaySamples;
    }

    // Use a maximum amplitude of 100 to prevent clipping/distortion
    const sample = 128 + Math.round(100 * volumeScale * Math.sin(2 * Math.PI * frequency * t));
    view.setUint8(44 + i, sample);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

let warningBeepUrl = '';
let completionSound1Url = '';
let completionSound2Url = '';

const getWarningBeepUrl = () => {
  if (!warningBeepUrl) {
    warningBeepUrl = generateBeepWav(650, 0.18); // Increased from 0.08 to 0.18s
  }
  return warningBeepUrl;
};

const getCompletionSound1Url = () => {
  if (!completionSound1Url) {
    completionSound1Url = generateBeepWav(880, 0.28); // Increased from 0.15 to 0.28s
  }
  return completionSound1Url;
};

const getCompletionSound2Url = () => {
  if (!completionSound2Url) {
    completionSound2Url = generateBeepWav(1175, 0.45); // Harmonious perfect fourth (1175Hz instead of 1200Hz, duration increased from 0.25 to 0.45s)
  }
  return completionSound2Url;
};

let feedbackSound1Url = '';
let feedbackSound2Url = '';

const getFeedbackSound1Url = () => {
  if (!feedbackSound1Url) {
    feedbackSound1Url = generateBeepWav(523, 0.22); // Increased from 0.08 to 0.22s
  }
  return feedbackSound1Url;
};

const getFeedbackSound2Url = () => {
  if (!feedbackSound2Url) {
    feedbackSound2Url = generateBeepWav(659, 0.35); // Increased from 0.12 to 0.35s
  }
  return feedbackSound2Url;
};

const playFeedbackSound = () => {
  try {
    const audio1 = new Audio(getFeedbackSound1Url());
    audio1.volume = 0.5;
    audio1.play().catch(err => console.warn('Feedback sound 1 play blocked:', err));
    
    setTimeout(() => {
      try {
        const audio2 = new Audio(getFeedbackSound2Url());
        audio2.volume = 0.5;
        audio2.play().catch(err => console.warn('Feedback sound 2 play blocked:', err));
      } catch (e) {
        console.warn('Feedback sound 2 failed:', e);
      }
    }, 140); // Increased delay between starts from 60ms to 140ms
  } catch (e) {
    console.warn('Feedback sound 1 failed:', e);
  }
};

export default function WorkoutTab({ 
  activeInjury, 
  onSaveWorkout, 
  onDeleteWorkout,
  onUpdateWorkout,
  localHistory,
  customRoutines,
  onSaveCustomRoutine,
  onDeleteRoutine,
  deletedRoutines,
  bodyWeight,
  height,
  gender,
  bodyFat,
  language,
  progressionSystem,
  progressPhotos,
  profilePicture,
  username,
  displayName,
  onAddProgressPhoto,
  pendingRoutineToStart,
  onClearPendingRoutine,
  customExercises,
  onSaveCustomExercise,
  onDeleteCustomExercise
}: WorkoutTabProps) {
  const t = TRANSLATIONS[language];

  const allExercises = useMemo(() => {
    return [...EXERCISES_DB, ...customExercises];
  }, [customExercises]);

  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState<boolean>(false);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const resolveExerciseDisplayName = (title: string) => {
    const found = allExercises.find(ex => ex.title.toLowerCase() === title.toLowerCase() || ex.id === title);
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
      'Cardio': 'Cardio',
      'Bíceps': 'Biceps',
      'Tríceps': 'Triceps',
      'Cuádriceps': 'Quadriceps',
      'Femorales': 'Hamstrings',
      'Glúteos': 'Glutes',
      'Pantorrillas': 'Calves'
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
    const map = new Map<string, (string | { title: string; restTime?: number })[]>(); // Title -> Exercise List
    
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
        const titleExists = list.some(el => {
          const t = typeof el === 'string' ? el : el.title;
          return t === ex.title;
        });
        if (!titleExists) {
          if (ex.restTime !== undefined && ex.restTime !== null) {
            list.push({ title: ex.title, restTime: ex.restTime });
          } else {
            list.push(ex.title);
          }
        }
      });
    });

    // 3. Overlay custom routines (these can override or append)
    customRoutines.forEach(r => {
      map.set(r.title, r.exercises);
    });
    
    const list = Array.from(map.entries())
      .map(([title, exercises]) => {
        const normalizedExercises = exercises.map(ex => {
          if (typeof ex === 'string') {
            return { title: ex };
          }
          return ex;
        });
        const isCustom = customRoutines.some(cr => cr.title === title);
        const isPreset = DEFAULT_PRESETS.some(dp => dp.title === title);
        return {
          title,
          exercises: normalizedExercises,
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
  const [editingRoutine, setEditingRoutine] = useState<{ title: string; exercises: (string | { title: string; restTime?: number })[] } | null>(null);
  const [expandedStandards, setExpandedStandards] = useState<{[key: string]: boolean}>({});
  const [expandedInstructions, setExpandedInstructions] = useState<{[key: string]: boolean}>({});
  const [brokenPBs, setBrokenPBs] = useState<any[]>([]);
  const [pendingSessionToSave, setPendingSessionToSave] = useState<any | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);
  const [shareComment, setShareComment] = useState('');
  const [sharePublicly, setSharePublicly] = useState(true);
  const [selectedProgressPhoto, setSelectedProgressPhoto] = useState<string | null>(null);
  const [publishingToFeed, setPublishingToFeed] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

  // Add Exercise & Reorder States
  const [showAddExerciseModal, setShowAddExerciseModal] = useState<boolean>(false);
  const [exerciseSearchText, setExerciseSearchText] = useState<string>('');
  const [selectedAddExerciseMuscle, setSelectedAddExerciseMuscle] = useState<string>('Todos');
  const [updateRoutineOnFinish, setUpdateRoutineOnFinish] = useState<boolean>(false);

  const filteredExercisesForAdd = useMemo(() => {
    return allExercises.filter(ex => {
      const matchSearch = ex.title.toLowerCase().includes(exerciseSearchText.toLowerCase()) || 
                          getExerciseName(ex.id, ex.title, language).toLowerCase().includes(exerciseSearchText.toLowerCase());
      
      const matchMuscle = selectedAddExerciseMuscle === 'Todos' || ex.muscleGroup === selectedAddExerciseMuscle;
      
      return matchSearch && matchMuscle;
    });
  }, [exerciseSearchText, selectedAddExerciseMuscle, language, allExercises]);

  // Strength Road Map States
  const [projectionExercise, setProjectionExercise] = useState<string | null>(null);

  const projectionData = useMemo(() => {
    if (!projectionExercise) return [];
    
    const matchingSessions = [...localHistory]
      .filter(s => s.exercises && s.exercises.some((e: any) => e.title.toLowerCase() === projectionExercise.toLowerCase()));
      
    matchingSessions.sort((a, b) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());
    
    const latestMatch = matchingSessions[0];
    const latestExercise = latestMatch?.exercises.find((e: any) => e.title.toLowerCase() === projectionExercise.toLowerCase());
    
    const lastSetsMapped = latestExercise ? latestExercise.sets.map((s: any) => ({
      setIndex: s.setIndex,
      setType: s.setType || 'normal',
      weightKg: s.weight_kg !== undefined ? s.weight_kg : (s.weightKg !== undefined ? s.weightKg : 0),
      reps: s.reps || 0,
      rpe: s.rpe || null
    })) : [];

    return projectFutureSessions(
      projectionExercise,
      lastSetsMapped,
      progressionSystem,
      bodyWeight
    );
  }, [projectionExercise, localHistory, progressionSystem, bodyWeight]);

  // For history session details/editing
  const [selectedHistorySession, setSelectedHistorySession] = useState<any | null>(null);
  const [isEditingHistorySession, setIsEditingHistorySession] = useState<boolean>(false);
  const [editingHistorySessionData, setEditingHistorySessionData] = useState<any | null>(null);
  const [expandedHistoryExercises, setExpandedHistoryExercises] = useState<{[key: string]: boolean}>({});

  const updateEditingSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps' | 'hasPain', value: any) => {
    if (!editingHistorySessionData) return;
    const clone = JSON.parse(JSON.stringify(editingHistorySessionData));
    const set = clone.exercises[exIdx].sets[setIdx];
    if (field === 'weight') {
      if (set.weightKg !== undefined) set.weightKg = value;
      if (set.weight_kg !== undefined) set.weight_kg = value;
      if (set.weightKg === undefined && set.weight_kg === undefined) {
        set.weightKg = value;
      }
    } else if (field === 'reps') {
      set.reps = value;
    } else if (field === 'hasPain') {
      set.hasPain = value;
    }
    setEditingHistorySessionData(clone);
  };

  const addEditingSet = (exIdx: number) => {
    if (!editingHistorySessionData) return;
    const clone = JSON.parse(JSON.stringify(editingHistorySessionData));
    const setsObj = clone.exercises[exIdx].sets;
    const lastSet = setsObj[setsObj.length - 1] || { weightKg: 20, weight_kg: 20, reps: 10, hasPain: false };
    setsObj.push({
      weightKg: lastSet.weightKg !== undefined ? lastSet.weightKg : lastSet.weight_kg,
      weight_kg: lastSet.weight_kg !== undefined ? lastSet.weight_kg : lastSet.weightKg,
      reps: lastSet.reps,
      hasPain: false
    });
    setEditingHistorySessionData(clone);
  };

  const deleteEditingSet = (exIdx: number, setIdx: number) => {
    if (!editingHistorySessionData) return;
    const clone = JSON.parse(JSON.stringify(editingHistorySessionData));
    clone.exercises[exIdx].sets.splice(setIdx, 1);
    if (clone.exercises[exIdx].sets.length === 0) {
      clone.exercises.splice(exIdx, 1);
    }
    setEditingHistorySessionData(clone);
  };

  const deleteEditingExercise = (exIdx: number) => {
    if (!editingHistorySessionData) return;
    const confirmDel = window.confirm(language === 'es' ? '¿Eliminar este ejercicio completo?' : 'Delete this entire exercise?');
    if (!confirmDel) return;
    const clone = JSON.parse(JSON.stringify(editingHistorySessionData));
    clone.exercises.splice(exIdx, 1);
    setEditingHistorySessionData(clone);
  };

  // pre-workout recovery wizard states
  const [showRecoveryWizard, setShowRecoveryWizard] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [sleepScore, setSleepScore] = useState<number>(3);
  const [fatigueScore, setFatigueScore] = useState<number>(3);
  const [stressScore, setStressScore] = useState<number>(3);
  const [energyScoreInput, setEnergyScoreInput] = useState<number>(3);

  const routineGridRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silentAudioUrlRef = useRef<string | null>(null);

  const startSilentAudio = () => {
    try {
      if (!silentAudioRef.current) {
        // Generate a 1-second silent WAV dynamically
        const sampleRate = 8000;
        const numChannels = 1;
        const bitsPerSample = 8;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const durationSecs = 1;
        const dataSize = sampleRate * durationSecs;
        const fileSize = 36 + dataSize;

        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // Write WAV header
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, fileSize, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true);

        // Fill silent data (128 is midpoint for 8-bit unsigned PCM)
        for (let i = 0; i < dataSize; i++) {
          view.setUint8(44 + i, 128);
        }

        const blob = new Blob([buffer], { type: 'audio/wav' });
        const silentAudioUrl = URL.createObjectURL(blob);
        silentAudioUrlRef.current = silentAudioUrl;
        
        const audio = new Audio(silentAudioUrl);
        audio.loop = true;
        audio.volume = 0.01; // Tiny non-zero volume to keep audio active in background
        silentAudioRef.current = audio;
      }
      
      if (silentAudioRef.current.paused && silentAudioRef.current.src === silentAudioUrlRef.current) {
        silentAudioRef.current.play().catch(err => {
          console.warn('Silent audio play blocked:', err);
        });
      }
    } catch (e) {
      console.error('Error generating silent audio:', e);
    }
  };

  const stopSilentAudio = () => {
    if (silentAudioRef.current) {
      try {
        silentAudioRef.current.pause();
        if (silentAudioUrlRef.current) {
          silentAudioRef.current.src = silentAudioUrlRef.current;
        }
        silentAudioRef.current.currentTime = 0;
      } catch (err) {
        console.warn('Error stopping silent audio:', err);
      }
    }
  };

  const playSoundThroughSilentAudio = (soundUrl: string, completionCallback?: () => void) => {
    try {
      if (silentAudioRef.current && silentAudioUrlRef.current) {
        const audio = silentAudioRef.current;
        
        // Temporarily disable looping
        audio.loop = false;
        
        // Set higher volume for the beep/alarm
        audio.volume = 0.8;
        
        // Change src to the beep
        audio.src = soundUrl;
        
        // Define what happens when the beep ends
        audio.onended = () => {
          // Restore the silent loop if rest timer is still active
          if (restTimerActive) {
            audio.loop = true;
            audio.volume = 0.01;
            audio.src = silentAudioUrlRef.current || '';
            audio.play().catch(err => console.warn('Failed to resume silent audio:', err));
          }
          if (completionCallback) {
            completionCallback();
          }
        };
        
        audio.currentTime = 0;
        audio.play().catch(err => {
          console.warn('Playback through silent audio ref blocked:', err);
          // Attempt to restore if blocked
          if (restTimerActive) {
            audio.loop = true;
            audio.volume = 0.01;
            audio.src = silentAudioUrlRef.current || '';
            audio.play().catch(() => {});
          }
        });
      } else {
        // Fallback to standard playback if silent audio is not initialized
        const fallbackAudio = new Audio(soundUrl);
        fallbackAudio.volume = 0.8;
        fallbackAudio.play().catch(err => console.warn('Fallback play blocked:', err));
        if (completionCallback) {
          setTimeout(completionCallback, 300);
        }
      }
    } catch (e) {
      console.warn('playSoundThroughSilentAudio failed:', e);
    }
  };

  const playWarningBeep = () => {
    playSoundThroughSilentAudio(getWarningBeepUrl());
  };

  const playCompletionSound = () => {
    playSoundThroughSilentAudio(getCompletionSound1Url(), () => {
      setTimeout(() => {
        playSoundThroughSilentAudio(getCompletionSound2Url());
      }, 80);
    });
  };

  useEffect(() => {
    if (pendingRoutineToStart) {
      setSelectedRoutine(pendingRoutineToStart.title);
      const timer = setTimeout(() => {
        handleStartWorkout(8);
        if (onClearPendingRoutine) {
          onClearPendingRoutine();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pendingRoutineToStart]);

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
    return selectedRoutineObj.exercises.map(exObj => {
      const title = exObj.title;
      const found = allExercises.find(ex => ex.title === title);
      const exerciseBase = found || {
        id: `custom_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        title,
        muscleGroup: 'Pecho',
        equipment: 'Mancuerna',
        difficulty: 'Intermedio',
        description: 'Ejercicio personalizado'
      };
      return {
        ...exerciseBase,
        restTime: exObj.restTime
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
  const [restTimerMuted, setRestTimerMuted] = useState<boolean>(() => {
    return localStorage.getItem('plnexc_rest_timer_muted') === 'true';
  });

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
            
            const soundEnabled = localStorage.getItem('plnexc_rest_timer_sound_enabled') !== 'false';
            if (soundEnabled && !restTimerMuted) {
              playCompletionSound();
            }

            if ('vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
            return 0;
          }

          const nextVal = r - 1;
          if (nextVal >= 1 && nextVal <= 5) {
            const soundEnabled = localStorage.getItem('plnexc_rest_timer_sound_enabled') !== 'false';
            if (soundEnabled && !restTimerMuted) {
              playWarningBeep();
            }
          }

          return nextVal;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [restTimerActive, restTimeRemaining, restTimerMuted]);

  // Effect to manage silent background audio loop (prevents mobile background sleep)
  useEffect(() => {
    if (restTimerActive) {
      startSilentAudio();
    } else {
      stopSilentAudio();
    }
    return () => {
      stopSilentAudio();
    };
  }, [restTimerActive]);

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
    const exercisesForSession = routine.exercises.map(exItem => {
      const exTitle = exItem.title;
      const customRestTime = exItem.restTime;
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

      const dbEx = allExercises.find(db => db.title.toLowerCase() === finalTitle.toLowerCase() || db.id === finalTitle);
      const isBodyweight = dbEx?.equipment === 'Peso Corporal';

      // Calculate progressive overload suggestions
      let target: ProgressionTarget = {
        suggestedWeight: isBodyweight ? Math.round(bodyWeight * getBodyweightPercentage(finalTitle) * 2) / 2 : 10,
        suggestedReps: 10,
        message: isBodyweight 
          ? `Carga sugerida inteligente de ${Math.round(bodyWeight * getBodyweightPercentage(finalTitle) * 2) / 2}kg basado en el peso corporal (${Math.round(getBodyweightPercentage(finalTitle) * 100)}% de tu peso).`
          : 'Comienza con una carga moderada para explorar el rango de movimiento.',
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
        
        target = proposeNextSet(finalTitle, lastSetsMapped, scoreToUse, false, daysSinceLastSession, bodyWeight, progressionSystem);
      }

      // Generate 3 standard sets with suggested values
      const initialSets = Array.from({ length: 3 }).map((_, i) => ({
        setIndex: i,
        setType: (i === 0 && target.suggestedWeight > 20 && !isBodyweight) ? 'warmup' : 'normal',
        weightKg: (i === 0 && target.suggestedWeight > 20 && !isBodyweight) ? Math.round((target.suggestedWeight * 0.6) / 2.5) * 2.5 : target.suggestedWeight,
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
        sets: initialSets,
        restTime: customRestTime
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

  const handleMoveExerciseUp = (exIdx: number) => {
    if (exIdx === 0) return;
    setActiveSession((prev: any) => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const temp = newExercises[exIdx];
      newExercises[exIdx] = newExercises[exIdx - 1];
      newExercises[exIdx - 1] = temp;
      return {
        ...prev,
        exercises: newExercises
      };
    });
  };

  const handleMoveExerciseDown = (exIdx: number) => {
    setActiveSession((prev: any) => {
      if (!prev) return prev;
      if (exIdx >= prev.exercises.length - 1) return prev;
      const newExercises = [...prev.exercises];
      const temp = newExercises[exIdx];
      newExercises[exIdx] = newExercises[exIdx + 1];
      newExercises[exIdx + 1] = temp;
      return {
        ...prev,
        exercises: newExercises
      };
    });
  };

  const handleRemoveExercise = (exIdx: number) => {
    if (window.confirm(language === 'es' ? '¿Estás seguro de que deseas quitar este ejercicio del entrenamiento?' : 'Are you sure you want to remove this exercise from the workout?')) {
      setActiveSession((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.filter((_: any, idx: number) => idx !== exIdx)
        };
      });
    }
  };

  const handleAddExerciseToActiveSession = (exTitle: string) => {
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
    
    exerciseHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
    const latestSession = exerciseHistory[exerciseHistory.length - 1];
    
    const dbEx = allExercises.find(db => db.title.toLowerCase() === exTitle.toLowerCase() || db.id === exTitle);
    const isBodyweight = dbEx?.equipment === 'Peso Corporal';

    let target: ProgressionTarget = {
      suggestedWeight: isBodyweight ? Math.round(bodyWeight * getBodyweightPercentage(exTitle) * 2) / 2 : 10,
      suggestedReps: 10,
      message: isBodyweight 
        ? `Carga sugerida inteligente de ${Math.round(bodyWeight * getBodyweightPercentage(exTitle) * 2) / 2}kg basado en el peso corporal.`
        : 'Comienza con una carga moderada.',
      isDeload: false
    };

    if (latestSession && latestSession.sets) {
      const lastSetsMapped: SetData[] = latestSession.sets.map((s: any) => ({
        setIndex: s.setIndex,
        setType: s.setType || 'normal',
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe
      }));
      target = proposeNextSet(exTitle, lastSetsMapped, 10, false, undefined, bodyWeight, progressionSystem);
    }

    const initialSets = Array.from({ length: 3 }).map((_, i) => ({
      setIndex: i,
      setType: (i === 0 && target.suggestedWeight > 20 && !isBodyweight) ? 'warmup' : 'normal',
      weightKg: (i === 0 && target.suggestedWeight > 20 && !isBodyweight) ? Math.round((target.suggestedWeight * 0.6) / 2.5) * 2.5 : target.suggestedWeight,
      reps: target.suggestedReps,
      rpe: null as number | null,
      completed: false,
      hasPain: false
    }));

    const newExercise = {
      originalTitle: exTitle,
      title: exTitle,
      isSubstituted: false,
      suggestion: target,
      sets: initialSets
    };

    setActiveSession((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: [...prev.exercises, newExercise]
      };
    });

    setShowAddExerciseModal(false);
    setExerciseSearchText('');
    setSelectedAddExerciseMuscle('Todos');
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
          let msg = t.pbCelebrationDetailMaxWeight
            .replace('{old}', oldMaxWeight.toString())
            .replace('{new}', maxWeightInSession.toString());
          if (isTimeBasedExercise(ex.title)) {
            const isEs = language === 'es';
            msg = msg.replace('(x {reps} reps)', isEs ? `(sostenido por ${sessionMaxWeightReps} s)` : `(held for ${sessionMaxWeightReps} s)`);
          } else {
            msg = msg.replace('{reps}', sessionMaxWeightReps.toString());
          }
          details.push(msg);
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
            let msg = t.pbCelebrationDetailRepPR
              .replace('{old}', oldRepPR.toString())
              .replace('{new}', weight.toString());
            if (isTimeBasedExercise(ex.title)) {
              msg = msg.replace('{reps} reps', `${reps} s`);
            } else {
              msg = msg.replace('{reps}', reps.toString());
            }
            details.push(msg);
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

    setBrokenPBs(sessionBrokenPBs);
    setPendingSessionToSave(newSession);
    setShareComment('');
    setSharePublicly(!!username);
    setSelectedProgressPhoto(null);
    setShowCelebrationModal(true);
  };

  const handleSaveAndShareWorkout = async () => {
    if (!pendingSessionToSave) return;
    
    setPublishingToFeed(true);
    try {
      // If user chose to update/save the routine template
      if (updateRoutineOnFinish && onSaveCustomRoutine) {
        const exercisesData = pendingSessionToSave.exercises.map((ex: any) => {
          if (ex.restTime !== undefined && ex.restTime !== null && ex.restTime > 0) {
            return { title: ex.title, restTime: ex.restTime };
          }
          return ex.title;
        });
        onSaveCustomRoutine(pendingSessionToSave.title, exercisesData);
      }

      let photoUrl = selectedProgressPhoto || undefined;
      
      if (selectedProgressPhoto && selectedProgressPhoto.startsWith('data:image')) {
        const photoId = Date.now().toString();
        onAddProgressPhoto({
          id: photoId,
          date: new Date().toISOString().split('T')[0],
          weight: bodyWeight,
          photoUrl: selectedProgressPhoto,
          note: `Entrenamiento: ${pendingSessionToSave.title}`
        });
      }
      
      if (sharePublicly && username) {
        let totalVolume = 0;
        pendingSessionToSave.exercises.forEach((ex: any) => {
          totalVolume += ex.totalVolume || 0;
        });
        
        const recordsBrokenText: string[] = [];
        brokenPBs.forEach((pb: any) => {
          pb.details.forEach((det: string) => {
            recordsBrokenText.push(`${pb.exercise}: ${det}`);
          });
        });
        
        let durationMinutes = 60;
        if (pendingSessionToSave.startTime && pendingSessionToSave.endTime) {
          try {
            const [startH, startM] = pendingSessionToSave.startTime.split(':').map(Number);
            const [endH, endM] = pendingSessionToSave.endTime.split(':').map(Number);
            const startTotal = startH * 60 + startM;
            const endTotal = endH * 60 + endM;
            if (endTotal > startTotal) {
              durationMinutes = endTotal - startTotal;
            }
          } catch {
            durationMinutes = 60;
          }
        }
        
        await publishWorkoutToFeed({
          userId: auth.currentUser?.uid || '',
          username: username,
          userDisplayName: displayName || username,
          userProfilePicture: profilePicture || '',
          routineTitle: pendingSessionToSave.title,
          durationMinutes,
          totalVolumeKg: totalVolume,
          recordsBroken: recordsBrokenText,
          comment: shareComment,
          photoUrl,
          workoutData: pendingSessionToSave
        });
      }
      
      onSaveWorkout(pendingSessionToSave);
      
      setActiveSession(null);
      setTimerActive(false);
      setRestTimerActive(false);
      setRestTimeRemaining(0);
      setBrokenPBs([]);
      setPendingSessionToSave(null);
      setShowCelebrationModal(false);
      
      setShareComment('');
      setSelectedProgressPhoto(null);
      setUpdateRoutineOnFinish(false);
    } catch (err: any) {
      console.error('Error sharing workout:', err);
      alert('Error al guardar el entrenamiento: ' + (err.message || err));
    } finally {
      setPublishingToFeed(false);
    }
  };

  const handleSharePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressAndResizeImage(file, 600, 600);
        setSelectedProgressPhoto(base64);
      } catch (err) {
        console.error('Error processing photo:', err);
        alert(language === 'es' ? 'Error al procesar la foto.' : 'Error processing the photo.');
      }
    }
  };

  const handleToggleCompleted = (exIdx: number, setIdx: number) => {
    if (!activeSession) return;

    const targetExercise = activeSession.exercises[exIdx];
    const targetSet = targetExercise.sets[setIdx];
    const newCompleted = !targetSet.completed;

    let triggeredRest = false;
    let isCompound = false;

    if (newCompleted) {
      triggeredRest = true;
      const titleLower = targetExercise.title.toLowerCase();
      isCompound = titleLower.includes('squat') || 
                   titleLower.includes('deadlift') || 
                   titleLower.includes('bench press') || 
                   titleLower.includes('overhead press');

      const soundEnabled = localStorage.getItem('plnexc_rest_timer_sound_enabled') !== 'false';
      if (soundEnabled && !restTimerMuted) {
        playFeedbackSound();
      }
    }

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
                completed: newCompleted
              };
            })
          };
        })
      };
    });

    if (triggeredRest) {
      const isTimerEnabled = localStorage.getItem('plnexc_rest_timer_enabled') !== 'false';
      if (isTimerEnabled) {
        let seconds = targetExercise.restTime;
        if (seconds === undefined || seconds === null || seconds <= 0) {
          const savedCompound = localStorage.getItem('plnexc_rest_time_compound');
          const savedAccessory = localStorage.getItem('plnexc_rest_time_accessory');
          const defaultCompound = savedCompound ? parseInt(savedCompound, 10) : 120;
          const defaultAccessory = savedAccessory ? parseInt(savedAccessory, 10) : 90;
          seconds = isCompound ? defaultCompound : defaultAccessory;
        }

        setRestTimeTotal(seconds);
        setRestTimeRemaining(seconds);
        setRestTimerActive(true);
        startSilentAudio();

        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
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
        language={language}
        customExercises={customExercises}
        onSaveCustomExercise={onSaveCustomExercise}
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
                            ? r.exercises.map((ex: any) => resolveExerciseDisplayName(ex.title)).join(', ') 
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
              Historial
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(showAllHistory ? localHistory : localHistory.slice(0, 5)).map((session, idx) => {
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
                    onClick={() => {
                      setSelectedHistorySession(session);
                      setEditingHistorySessionData(JSON.parse(JSON.stringify(session)));
                      setIsEditingHistorySession(false);
                    }}
                    style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--border-radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    className="hover-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{session.title}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>{dateStr}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWorkout(session.parsedDate);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'hsl(var(--muted))',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'all var(--transition-fast)',
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            minHeight: '36px',
                          }}
                          className="hover-danger"
                          title={language === 'es' ? "Eliminar entrenamiento" : "Delete workout"}
                        >
                          <Trash2 size={16} />
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

            {localHistory.length > 5 && (
              <button
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="btn btn-secondary"
                style={{
                  alignSelf: 'center',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginTop: '8px',
                  width: '100%',
                  maxWidth: '200px',
                  border: '1px solid hsl(var(--border))',
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: '#ffffff',
                  borderRadius: 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {showAllHistory 
                  ? (language === 'es' ? 'Ver menos' : 'Show less') 
                  : (language === 'es' ? `Ver todo (${localHistory.length})` : `Show all (${localHistory.length})`)}
              </button>
            )}
          </div>
        </>
      ) : (
        
        /* 2. ACTIVE WORKOUT LOGGER */
        <div className={`active-workout-container ${restTimeRemaining > 0 ? 'has-active-rest' : ''}`}>
          
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
                <button className="btn btn-secondary" onClick={() => setShowAddExerciseModal(true)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} title={language === 'es' ? 'Agregar Ejercicio' : 'Add Exercise'}>
                  <Plus size={18} /> {language === 'es' ? 'Agregar' : 'Add'}
                </button>
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
          {restTimeRemaining > 0 && createPortal(
            (() => {
              const soundEnabledGlobal = localStorage.getItem('plnexc_rest_timer_sound_enabled') !== 'false';
              return (
                <div className="glass-panel fade-in floating-rest-timer">
                  <div className="timer-row">
                    <div className="timer-info">
                      <Clock size={16} color="hsl(var(--secondary))" style={{ animation: 'fadeIn 1.5s infinite alternate', flexShrink: 0 }} />
                      <span className="timer-title">
                        {language === 'es' ? 'Descanso:' : 'Rest:'}
                      </span>
                      <span className="timer-countdown">
                        {formatTime(restTimeRemaining)}
                      </span>
                    </div>
                    
                    <div className="timer-controls">
                      {soundEnabledGlobal && (
                        <button 
                          className="btn btn-secondary timer-btn" 
                          type="button"
                          onClick={() => {
                            const nextMute = !restTimerMuted;
                            setRestTimerMuted(nextMute);
                            localStorage.setItem('plnexc_rest_timer_muted', String(nextMute));
                          }} 
                          style={{ 
                            background: restTimerMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid ' + (restTimerMuted ? 'rgb(239, 68, 68)' : 'hsl(var(--border))'),
                            color: restTimerMuted ? 'rgb(239, 68, 68)' : '#ffffff',
                          }}
                          title={t.activeWorkoutMuteTooltip || 'Silenciar / Activar sonido'}
                        >
                          {restTimerMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      )}
                      <button className="btn btn-secondary timer-btn time-adj-btn" onClick={handleSubtractRestTime} title="-30s">
                        -30s
                      </button>
                      <button className="btn btn-secondary timer-btn time-adj-btn" onClick={handleAddRestTime} title="+30s">
                        +30s
                      </button>
                      <button className="btn btn-warning timer-btn timer-skip-btn" onClick={handleSkipRest} title={language === 'es' ? 'Omitir descanso' : 'Skip rest'}>
                        <SkipForward size={14} />
                        <span className="timer-btn-text">{language === 'es' ? 'Omitir' : 'Skip'}</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Description - shown on PC/Desktop via CSS */}
                  <div className="timer-desc" style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px', marginTop: '2px' }}>
                    {language === 'es' 
                      ? 'Espera o ajusta el tiempo de recuperación entre series' 
                      : 'Wait or adjust the recovery time between sets'}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${(restTimeRemaining / restTimeTotal) * 100}%`, 
                      background: 'hsl(var(--secondary))',
                      borderRadius: '2px',
                      transition: 'width 1s linear'
                    }} />
                  </div>
                </div>
              );
            })(),
            document.body
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
            <div key={`${ex.title}_${exIdx}`} className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
              
              {/* Exercise Header */}
              {/* Exercise Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '12px', marginBottom: '16px' }}>
                {/* Title & List Management Controls Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontWeight: 800 }}>
                    <img 
                      src={getExerciseImage(ex)} 
                      alt={ex.title} 
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        objectFit: 'cover', 
                        border: '1.5px solid hsl(var(--primary))',
                        flexShrink: 0
                      }} 
                    />
                    {ex.title}
                  </h3>

                  {/* Reordering & Deleting buttons group */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => handleMoveExerciseUp(exIdx)}
                      disabled={exIdx === 0}
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid hsla(var(--border) / 0.5)', 
                        color: exIdx === 0 ? 'rgba(255,255,255,0.05)' : 'hsl(var(--muted))', 
                        cursor: exIdx === 0 ? 'default' : 'pointer', 
                        padding: '6px', 
                        borderRadius: '6px',
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all var(--transition-fast)'
                      }}
                      title={language === 'es' ? 'Mover arriba' : 'Move up'}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleMoveExerciseDown(exIdx)}
                      disabled={exIdx === activeSession.exercises.length - 1}
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid hsla(var(--border) / 0.5)', 
                        color: exIdx === activeSession.exercises.length - 1 ? 'rgba(255,255,255,0.05)' : 'hsl(var(--muted))', 
                        cursor: exIdx === activeSession.exercises.length - 1 ? 'default' : 'pointer', 
                        padding: '6px', 
                        borderRadius: '6px',
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all var(--transition-fast)'
                      }}
                      title={language === 'es' ? 'Mover abajo' : 'Move down'}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button 
                      onClick={() => handleRemoveExercise(exIdx)}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.08)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        color: 'hsl(var(--danger))', 
                        cursor: 'pointer', 
                        padding: '6px', 
                        borderRadius: '6px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        transition: 'all var(--transition-fast)'
                      }}
                      title={language === 'es' ? 'Quitar ejercicio de la rutina' : 'Remove exercise from routine'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Badges Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(() => {
                    const dbEx = allExercises.find(e => e.title.toLowerCase() === ex.title.toLowerCase() || e.id === ex.title.toLowerCase());
                    if (!dbEx) return null;
                    return (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '1px 5px', textTransform: 'capitalize' }}>
                          {translateMuscleGroup(dbEx.muscleGroup)}
                        </span>
                        {dbEx.secondaryMuscleGroups && dbEx.secondaryMuscleGroups.length > 0 && (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '1px 5px', textTransform: 'capitalize', background: 'rgba(255, 255, 255, 0.05)', color: 'hsl(var(--muted))', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            + {dbEx.secondaryMuscleGroups.map(m => translateMuscleGroup(m)).join(', ')}
                          </span>
                        )}
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '1px 5px', textTransform: 'capitalize' }}>
                          {translateEquipment(dbEx.equipment)}
                        </span>
                      </div>
                    );
                  })()}
                  {ex.isSubstituted && (
                    <span className="badge badge-warning" style={{ alignSelf: 'flex-start', display: 'inline-block' }}>
                      {language === 'es' ? '⚠️ Variante PLNEXC por dolor en' : '⚠️ PLNEXC variation due to pain in'} {activeInjury ? (translateEngineText(MILO_REHAB_PROTOCOLS[activeInjury.joint]?.displayName || '', language) || activeInjury.joint) : ''}
                    </span>
                  )}
                </div>

                {/* Objective and Secondary Action Buttons Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', color: '#ffffff' }}>
                    <span><strong>Objetivo:</strong> {ex.suggestion.suggestedWeight}kg x {ex.suggestion.suggestedReps}{isTimeBasedExercise(ex.title) ? 's' : ' reps'}</span>

                    {(() => {
                      const titleLower = ex.title.toLowerCase();
                      const isCompound = titleLower.includes('squat') || 
                                         titleLower.includes('deadlift') || 
                                         titleLower.includes('bench press') || 
                                         titleLower.includes('overhead press');
                      const savedCompound = localStorage.getItem('plnexc_rest_time_compound');
                      const savedAccessory = localStorage.getItem('plnexc_rest_time_accessory');
                      const defaultCompound = savedCompound ? parseInt(savedCompound, 10) : 120;
                      const defaultAccessory = savedAccessory ? parseInt(savedAccessory, 10) : 90;
                      const defaultVal = isCompound ? defaultCompound : defaultAccessory;

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid hsla(var(--border) / 0.5)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#ffffff' }}>
                          <span style={{ fontSize: '0.9rem', color: 'hsl(var(--primary))' }} title={language === 'es' ? 'Temporizador de descanso' : 'Rest timer'}>⏱️</span>
                          <span>{language === 'es' ? 'Descanso:' : 'Rest:'}</span>
                          <input 
                            type="number" 
                            placeholder={String(defaultVal)}
                            value={ex.restTime !== undefined && ex.restTime !== null ? ex.restTime : ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const newRest = isNaN(val) ? undefined : val;
                              setActiveSession((prev: any) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  exercises: prev.exercises.map((el: any, i: number) => {
                                    if (i !== exIdx) return el;
                                    return {
                                      ...el,
                                      restTime: newRest
                                    };
                                  })
                                };
                              });
                            }}
                            style={{
                              width: '45px',
                              background: 'transparent',
                              border: 'none',
                              color: '#ffffff',
                              textAlign: 'center',
                              fontSize: '0.8rem',
                              padding: 0,
                              outline: 'none',
                              borderBottom: '1px solid hsla(var(--border) / 0.8)'
                            }}
                          />
                          <span>s</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(() => {
                      const standards = getStrengthStandards(ex.title, bodyWeight, gender, height, bodyFat);
                      if (!standards) return null;
                      const isExpanded = !!expandedStandards[ex.title];
                      return (
                        <button 
                          onClick={() => setExpandedStandards(prev => ({ ...prev, [ex.title]: !isExpanded }))}
                          className={`btn-standards ${isExpanded ? 'active' : ''}`}
                          style={{ margin: 0 }}
                        >
                          <Target size={12} style={{ opacity: isExpanded ? 1 : 0.6 }} />
                          <span>{isExpanded ? 'Ocultar estándares' : 'Estándares de fuerza'}</span>
                        </button>
                      );
                    })()}
                    
                    <button 
                      type="button"
                      onClick={() => setProjectionExercise(ex.title)}
                      className="btn-standards"
                      style={{ margin: 0, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px' }}
                    >
                      <TrendingUp size={12} />
                      <span>{t.viewProjection || 'Ver Proyección'}</span>
                    </button>

                    {(() => {
                      let foundEx = allExercises.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                      if (!foundEx && ex.originalTitle) {
                        foundEx = allExercises.find(dbEx => dbEx.title.toLowerCase() === ex.originalTitle.toLowerCase());
                      }
                      if (!foundEx) {
                        const cleanTitle = ex.title.toLowerCase();
                        if (cleanTitle.includes('squat')) {
                          foundEx = allExercises.find(d => d.id === 'squat_barbell');
                        } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                          foundEx = allExercises.find(d => d.id === 'bench_press_barbell');
                        } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                          foundEx = allExercises.find(d => d.id === 'deadlift_barbell');
                        } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                          foundEx = allExercises.find(d => d.id === 'overhead_press_barbell');
                        } else if (cleanTitle.includes('row')) {
                          foundEx = allExercises.find(d => d.id === 'bent_over_row_barbell');
                        } else if (cleanTitle.includes('curl')) {
                          foundEx = allExercises.find(d => d.id === 'bicep_curl_dumbbell');
                        } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                          foundEx = allExercises.find(d => d.id === 'pull_up');
                        }
                      }

                      if (!foundEx || !foundEx.instructions) return null;
                      const isExExpanded = !!expandedInstructions[ex.title];
                      return (
                        <button 
                          onClick={() => setExpandedInstructions(prev => ({ ...prev, [ex.title]: !isExExpanded }))}
                          className={`btn-standards ${isExExpanded ? 'active' : ''}`}
                          style={{ margin: 0 }}
                        >
                          <BookOpen size={12} style={{ opacity: isExExpanded ? 1 : 0.6 }} />
                          <span>{isExExpanded ? 'Ocultar técnica' : 'Ver técnica / guía'}</span>
                        </button>
                      );
                    })()}
                  </div>
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
                      <strong>Récord de Fuerza:</strong> {profile.maxWeight.weight} kg x {profile.maxWeight.reps} {isTimeBasedExercise(ex.title) ? 's' : 'reps'}
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
                let foundEx = allExercises.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                if (!foundEx && ex.originalTitle) {
                  foundEx = allExercises.find(dbEx => dbEx.title.toLowerCase() === ex.originalTitle.toLowerCase());
                }
                if (!foundEx) {
                  const cleanTitle = ex.title.toLowerCase();
                  if (cleanTitle.includes('squat')) {
                    foundEx = allExercises.find(d => d.id === 'squat_barbell');
                  } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                    foundEx = allExercises.find(d => d.id === 'bench_press_barbell');
                  } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                    foundEx = allExercises.find(d => d.id === 'deadlift_barbell');
                  } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                    foundEx = allExercises.find(d => d.id === 'overhead_press_barbell');
                  } else if (cleanTitle.includes('row')) {
                    foundEx = allExercises.find(d => d.id === 'bent_over_row_barbell');
                  } else if (cleanTitle.includes('curl')) {
                    foundEx = allExercises.find(d => d.id === 'bicep_curl_dumbbell');
                  } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                    foundEx = allExercises.find(d => d.id === 'pull_up');
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
                      <th style={{ padding: '8px' }}>
                        {isTimeBasedExercise(ex.title)
                          ? (language === 'es' ? 'Tiempo (seg)' : 'Time (sec)')
                          : (t.repsLabel || 'Reps')}
                      </th>
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
                            placeholder={isTimeBasedExercise(ex.title) ? "60s" : "0"}
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
                                    if (isTimeBasedExercise(ex.title)) {
                                      pbReason = language === 'es' ? `🏆 ¡Nuevo Récord para ${reps} segundos!` : `🏆 New Record for ${reps} seconds!`;
                                    } else {
                                      pbReason = language === 'es' ? `🏆 ¡Nuevo Récord para ${reps} Repeticiones!` : `🏆 New Record for ${reps} Repetitions!`;
                                    }
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

          {/* Add Exercise button at the bottom */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', marginBottom: '24px' }}>
            <button 
              className="btn btn-secondary hover-card-highlight" 
              onClick={() => setShowAddExerciseModal(true)} 
              style={{ 
                padding: '12px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                borderRadius: '24px', 
                fontSize: '0.9rem', 
                border: '1px dashed hsl(var(--primary))', 
                color: 'hsl(var(--primary))', 
                background: 'rgba(0,0,0,0.15)',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={18} /> {language === 'es' ? 'Agregar Ejercicio a este entrenamiento' : 'Add Exercise to this workout'}
            </button>
          </div>

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
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            border: brokenPBs.length > 0 ? '1px solid hsla(45, 100%, 50%, 0.3)' : '1px solid hsl(var(--border))',
            boxShadow: brokenPBs.length > 0 ? '0 0 30px hsla(45, 100%, 50%, 0.15)' : 'none'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem',
                animation: 'pulseScale 1s infinite alternate',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                {brokenPBs.length > 0 ? '🏆' : '🎉'}
              </div>
              <h2 style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                color: brokenPBs.length > 0 ? '#fbbf24' : '#fff',
                textShadow: brokenPBs.length > 0 ? '0 0 15px rgba(251, 191, 36, 0.3)' : 'none',
                margin: 0
              }}>
                {brokenPBs.length > 0 
                  ? (language === 'es' ? '¡Nuevos Récords Superados!' : 'New Records Broken!')
                  : (language === 'es' ? '¡Sesión Completada!' : 'Workout Completed!')}
              </h2>
              <p style={{
                color: 'hsl(var(--muted))',
                fontSize: '0.85rem',
                marginTop: '6px'
              }}>
                {language === 'es' 
                  ? 'Buen trabajo. Registra los detalles finales de tu entrenamiento a continuación.'
                  : 'Great job. Log the final details of your workout below.'}
              </p>
            </div>

            {/* PB Cards (if any) */}
            {brokenPBs.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'left',
                background: 'rgba(251, 191, 36, 0.05)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: 'var(--border-radius-md)',
                padding: '14px',
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {brokenPBs.map((pb, idx) => (
                  <div key={idx} className="shimmer-card" style={{
                    borderBottom: idx < brokenPBs.length - 1 ? '1px dashed rgba(251, 191, 36, 0.1)' : 'none',
                    paddingBottom: idx < brokenPBs.length - 1 ? '8px' : 0,
                    marginBottom: idx < brokenPBs.length - 1 ? '8px' : 0,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <strong style={{ fontSize: '0.9rem', color: '#fbbf24', display: 'block', marginBottom: '2px' }}>
                      💪 {resolveExerciseDisplayName(pb.exercise)}
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.4' }}>
                      {pb.details.map((detail: string, dIdx: number) => (
                        <li key={dIdx}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Social Sharing & Routine Update Setup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              
              {/* Update Routine Option */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid hsla(var(--border) / 0.3)' }}>
                <input
                  type="checkbox"
                  id="updateRoutineCheck"
                  checked={updateRoutineOnFinish}
                  onChange={(e) => setUpdateRoutineOnFinish(e.target.checked)}
                  style={{ marginTop: '4px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <label htmlFor="updateRoutineCheck" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                    {language === 'es' ? 'Actualizar plantilla de rutina' : 'Update routine template'}
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', marginTop: '2px', wordBreak: 'break-word' }}>
                    {language === 'es' 
                      ? `Guarda los cambios de este entrenamiento (ejercicios agregados, eliminados u ordenados) en tu rutina "${pendingSessionToSave?.title}".`
                      : `Save the changes from this workout (added, removed, or reordered exercises) to your routine "${pendingSessionToSave?.title}".`}
                  </span>
                </div>
              </div>

              {/* Toggle sharing */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="shareWorkoutCheck"
                  checked={sharePublicly && !!username}
                  disabled={!username}
                  onChange={(e) => setSharePublicly(e.target.checked)}
                  style={{ marginTop: '4px', cursor: username ? 'pointer' : 'not-allowed' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <label htmlFor="shareWorkoutCheck" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', cursor: username ? 'pointer' : 'not-allowed' }}>
                    {language === 'es' ? 'Compartir en la comunidad' : 'Share in the community'}
                  </label>
                  {!username ? (
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--warning))', marginTop: '2px' }}>
                      ⚠️ {language === 'es' ? 'Configura un @username en tu Perfil para compartir.' : 'Set up a @username in your Profile to share.'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', marginTop: '2px' }}>
                      {language === 'es' ? 'Publica este entrenamiento en el feed público.' : 'Publish this workout on the public feed.'}
                    </span>
                  )}
                </div>
              </div>

              {sharePublicly && !!username && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Personal Comment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
                      {language === 'es' ? 'Comentario (opcional)' : 'Comment (optional)'}
                    </label>
                    <textarea
                      value={shareComment}
                      onChange={(e) => setShareComment(e.target.value)}
                      placeholder={language === 'es' ? '¿Qué tal se sintió la rutina de hoy? Escribe un comentario...' : 'How did today\'s routine feel? Write a comment...'}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        color: '#fff',
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                  </div>

                  {/* Progress Photo upload or select */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
                      {language === 'es' ? 'Foto de progreso (opcional)' : 'Progress photo (optional)'}
                    </label>
                    
                    {/* Gallery photos selection scroll */}
                    {progressPhotos.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                          {language === 'es' ? 'Selecciona una foto existente:' : 'Select an existing photo:'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                          {progressPhotos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.photoUrl}
                              alt="Progreso"
                              onClick={() => setSelectedProgressPhoto(photo.photoUrl)}
                              style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: selectedProgressPhoto === photo.photoUrl ? '2px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.1)',
                                opacity: selectedProgressPhoto === photo.photoUrl ? 1 : 0.6,
                                transition: 'all 0.2s'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {/* Upload new photo button */}
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('share-photo-file-input');
                          el?.click();
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ImageIcon size={14} />
                        {language === 'es' ? 'Subir nueva foto' : 'Upload new photo'}
                      </button>
                      <input
                        id="share-photo-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleSharePhotoUpload}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {/* Photo preview */}
                    {selectedProgressPhoto && (
                      <div style={{ position: 'relative', width: '100px', height: '100px', marginTop: '6px', borderRadius: '6px', overflow: 'hidden', border: '1px solid hsl(var(--border))' }}>
                        <img src={selectedProgressPhoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setSelectedProgressPhoto(null)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.6)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCelebrationModal(false);
                  setPendingSessionToSave(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}
                disabled={publishingToFeed}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              
              <button
                type="button"
                onClick={handleSaveAndShareWorkout}
                className="btn btn-primary"
                style={{
                  flex: 2,
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                disabled={publishingToFeed}
              >
                {publishingToFeed ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    {language === 'es' ? 'Publicando...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {sharePublicly && !!username 
                      ? (language === 'es' ? 'Publicar y Finalizar' : 'Publish & Finish')
                      : (language === 'es' ? 'Finalizar sin Publicar' : 'Finish without sharing')}
                  </>
                )}
              </button>
            </div>
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
              padding: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              border: '1px solid hsla(var(--primary) / 0.3)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
              background: '#0a0e17',
              overflow: 'hidden'
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
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
                        <img 
                          src={getExerciseImage(ex)} 
                          alt={ex.title} 
                          style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            objectFit: 'cover', 
                            border: '1.5px solid hsl(var(--primary))',
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '2px 6px', textTransform: 'capitalize' }}>
                            {translateMuscleGroup(ex.muscleGroup)}
                          </span>
                          {(() => {
                            const dbEx = allExercises.find(e => e.title.toLowerCase() === ex.title.toLowerCase() || e.id === ex.title.toLowerCase());
                            if (dbEx && dbEx.secondaryMuscleGroups && dbEx.secondaryMuscleGroups.length > 0) {
                              return (
                                <span className="badge badge-secondary" style={{ fontSize: '0.625rem', padding: '2px 6px', textTransform: 'capitalize', background: 'rgba(255, 255, 255, 0.05)', color: 'hsl(var(--muted))', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                  + {dbEx.secondaryMuscleGroups.map(m => translateMuscleGroup(m)).join(', ')}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '2px 6px', textTransform: 'capitalize' }}>
                            {translateEquipment(ex.equipment)}
                          </span>
                          {ex.restTime !== undefined && ex.restTime !== null && ex.restTime > 0 && (
                            <span 
                              className="badge badge-secondary" 
                              style={{ 
                                fontSize: '0.625rem', 
                                padding: '2px 6px', 
                                background: 'rgba(59, 130, 246, 0.08)', 
                                color: '#60a5fa', 
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              ⏱️ {ex.restTime}s
                            </span>
                          )}
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

                          {/* Proyección Toggle */}
                          <button
                            type="button"
                            onClick={() => setProjectionExercise(ex.title)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.68rem',
                              color: '#60a5fa',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            <TrendingUp size={12} />
                            <span>{language === 'es' ? 'Proyección' : 'Projection'}</span>
                          </button>

                          {/* Tech Guide Toggle */}
                          {(() => {
                            let foundEx = allExercises.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                            if (!foundEx) {
                              const cleanTitle = ex.title.toLowerCase();
                              if (cleanTitle.includes('squat')) {
                                foundEx = allExercises.find(d => d.id === 'squat_barbell');
                              } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                                foundEx = allExercises.find(d => d.id === 'bench_press_barbell');
                              } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                                foundEx = allExercises.find(d => d.id === 'deadlift_barbell');
                              } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                                foundEx = allExercises.find(d => d.id === 'overhead_press_barbell');
                              } else if (cleanTitle.includes('row')) {
                                foundEx = allExercises.find(d => d.id === 'bent_over_row_barbell');
                              } else if (cleanTitle.includes('curl')) {
                                foundEx = allExercises.find(d => d.id === 'bicep_curl_dumbbell');
                              } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                                foundEx = allExercises.find(d => d.id === 'pull_up');
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
                      let foundEx = allExercises.find(dbEx => dbEx.title.toLowerCase() === ex.title.toLowerCase());
                      if (!foundEx) {
                        const cleanTitle = ex.title.toLowerCase();
                        if (cleanTitle.includes('squat')) {
                          foundEx = allExercises.find(d => d.id === 'squat_barbell');
                        } else if (cleanTitle.includes('bench press') || cleanTitle.includes('floor press')) {
                          foundEx = allExercises.find(d => d.id === 'bench_press_barbell');
                        } else if (cleanTitle.includes('deadlift') || cleanTitle.includes('rack pull')) {
                          foundEx = allExercises.find(d => d.id === 'deadlift_barbell');
                        } else if (cleanTitle.includes('press') || cleanTitle.includes('push up') || cleanTitle.includes('pushup')) {
                          foundEx = allExercises.find(d => d.id === 'overhead_press_barbell');
                        } else if (cleanTitle.includes('row')) {
                          foundEx = allExercises.find(d => d.id === 'bent_over_row_barbell');
                        } else if (cleanTitle.includes('curl')) {
                          foundEx = allExercises.find(d => d.id === 'bicep_curl_dumbbell');
                        } else if (cleanTitle.includes('pull up') || cleanTitle.includes('pulldown') || cleanTitle.includes('chin up')) {
                          foundEx = allExercises.find(d => d.id === 'pull_up');
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

      {/* History Details and Editing Modal */}
      {selectedHistorySession && editingHistorySessionData && createPortal(
        <div 
          onClick={() => {
            setSelectedHistorySession(null);
            setIsEditingHistorySession(false);
            setExpandedHistoryExercises({});
          }}
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
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              border: '1px solid hsla(var(--primary) / 0.3)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
              background: '#0a0e17'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsla(var(--border) / 0.5)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={20} color="hsl(var(--primary))" />
                  {isEditingHistorySession ? (t.editWorkout || 'Editar Entrenamiento') : (t.workoutDetails || 'Detalle del Entrenamiento')}
                </h3>
                <p style={{ color: 'hsl(var(--muted))', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  {isEditingHistorySession 
                    ? (language === 'es' ? 'Modifica los detalles de la sesión registrada' : 'Modify the details of the logged session')
                    : (language === 'es' ? 'Visualiza los detalles de tu sesión de entrenamiento' : 'View the details of your workout session')
                  }
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedHistorySession(null);
                  setIsEditingHistorySession(false);
                  setExpandedHistoryExercises({});
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--muted))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '50%',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted))'; e.currentTarget.style.background = 'transparent'; }}
                title={t.close}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Title & Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--muted))', marginBottom: '6px', fontWeight: 600 }}>
                    {t.workoutTitle || 'Título del Entrenamiento'}
                  </label>
                  {isEditingHistorySession ? (
                    <input 
                      type="text" 
                      value={editingHistorySessionData.title}
                      onChange={(e) => setEditingHistorySessionData({ ...editingHistorySessionData, title: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '10px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color var(--transition-fast)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'hsl(var(--primary))'}
                      onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                    />
                  ) : (
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', padding: '6px 0' }}>
                      {selectedHistorySession.title}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--muted))', marginBottom: '6px', fontWeight: 600 }}>
                    {t.workoutDate || 'Fecha del Entrenamiento'}
                  </label>
                  {isEditingHistorySession ? (
                    <input 
                      type="date" 
                      value={editingHistorySessionData.parsedDate ? editingHistorySessionData.parsedDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const timePart = editingHistorySessionData.parsedDate.split('T')[1] || '12:00:00.000Z';
                        setEditingHistorySessionData({ 
                          ...editingHistorySessionData, 
                          parsedDate: e.target.value ? `${e.target.value}T${timePart}` : new Date().toISOString()
                        });
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '10px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color var(--transition-fast)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'hsl(var(--primary))'}
                      onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                    />
                  ) : (
                    <div style={{ fontSize: '1rem', color: '#ffffff', padding: '6px 0' }}>
                      {new Date(selectedHistorySession.parsedDate).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Exercises List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '8px' }}>
                {(isEditingHistorySession ? editingHistorySessionData.exercises : selectedHistorySession.exercises).map((ex: any, exIdx: number) => {
                  const isExpanded = isEditingHistorySession || !!expandedHistoryExercises[`${ex.title || ex.id}_${exIdx}`];
                  return (
                    <div 
                      key={`${ex.title || ex.id}_${exIdx}`}
                      style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid hsla(var(--border) / 0.6)',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'hsl(var(--primary))', fontSize: '0.95rem' }}>
                          {resolveExerciseDisplayName(ex.title)}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isEditingHistorySession && (
                            <button
                              onClick={() => deleteEditingExercise(exIdx)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'hsl(var(--danger))',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                transition: 'all var(--transition-fast)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={12} /> {t.deleteExercise || 'Eliminar Ejercicio'}
                            </button>
                          )}
                          
                          {!isEditingHistorySession && (
                            <button
                              onClick={() => {
                                const key = `${ex.title || ex.id}_${exIdx}`;
                                setExpandedHistoryExercises(prev => ({ ...prev, [key]: !prev[key] }));
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid hsla(var(--border) / 0.5)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.72rem',
                                color: isExpanded ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all var(--transition-fast)'
                              }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={14} />
                                  <span>{language === 'es' ? 'Ocultar' : 'Hide'}</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} />
                                  <span>{language === 'es' ? 'Ver series' : 'View sets'} ({ex.sets.length})</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                          {/* Sets Table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid hsla(var(--border) / 0.3)', textAlign: 'left' }}>
                                <th style={{ padding: '6px 4px', fontSize: '0.75rem', color: 'hsl(var(--muted))', width: '40px' }}>#</th>
                                <th style={{ padding: '6px 4px', fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.weightLabel || 'Peso'} (kg)</th>
                                <th style={{ padding: '6px 4px', fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                                  {isTimeBasedExercise(ex.title)
                                    ? (language === 'es' ? 'Tiempo (seg)' : 'Time (sec)')
                                    : (t.repsLabel || 'Reps')}
                                </th>
                                <th style={{ padding: '6px 4px', fontSize: '0.75rem', color: 'hsl(var(--muted))', width: '110px', textAlign: 'center' }}>{t.pain || 'Molestia'}</th>
                                {isEditingHistorySession && <th style={{ padding: '6px 4px', width: '40px' }}></th>}
                              </tr>
                            </thead>
                            <tbody>
                              {ex.sets.map((set: any, setIdx: number) => {
                                const weightVal = set.weightKg !== undefined ? set.weightKg : (set.weight_kg !== undefined ? set.weight_kg : 0);
                                return (
                                  <tr key={setIdx} style={{ borderBottom: '1px solid hsla(var(--border) / 0.15)' }}>
                                    <td style={{ padding: '8px 4px', fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--muted))' }}>
                                      {setIdx + 1}
                                    </td>
                                    <td style={{ padding: '8px 4px' }}>
                                      {isEditingHistorySession ? (
                                        <input 
                                          type="number" 
                                          step="any"
                                          value={weightVal}
                                          onChange={(e) => updateEditingSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                                          style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid hsl(var(--border))',
                                            color: '#ffffff',
                                            borderRadius: '4px',
                                            padding: '6px',
                                            width: '75px',
                                            textAlign: 'center',
                                            fontSize: '0.85rem'
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>{weightVal} kg</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 4px' }}>
                                      {isEditingHistorySession ? (
                                        <input 
                                          type="number" 
                                          value={set.reps || 0}
                                          onChange={(e) => updateEditingSet(exIdx, setIdx, 'reps', parseInt(e.target.value, 10) || 0)}
                                          style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid hsl(var(--border))',
                                            color: '#ffffff',
                                            borderRadius: '4px',
                                            padding: '6px',
                                            width: '65px',
                                            textAlign: 'center',
                                            fontSize: '0.85rem'
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>
                                          {set.reps} {isTimeBasedExercise(ex.title) ? 's' : ''}
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                      {isEditingHistorySession ? (
                                        <button
                                          onClick={() => updateEditingSet(exIdx, setIdx, 'hasPain', !set.hasPain)}
                                          style={{
                                            background: set.hasPain ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${set.hasPain ? 'hsl(var(--danger))' : 'hsla(var(--border) / 0.5)'}`,
                                            color: set.hasPain ? 'hsl(var(--danger))' : 'hsl(var(--muted))',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            width: '100px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            transition: 'all var(--transition-fast)'
                                          }}
                                        >
                                          {set.hasPain ? (
                                            <>⚠️ {t.hasPain || 'Con molestia'}</>
                                          ) : (
                                            t.noPain || 'Sin molestia'
                                          )}
                                        </button>
                                      ) : (
                                        set.hasPain ? (
                                          <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '2px 6px', display: 'inline-block' }}>
                                            ⚠️ Molestia
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>—</span>
                                        )
                                      )}
                                    </td>
                                    {isEditingHistorySession && (
                                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                        <button
                                          onClick={() => deleteEditingSet(exIdx, setIdx)}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'hsl(var(--danger))',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '50%'
                                          }}
                                          className="hover-danger"
                                          title={t.deleteSet || 'Eliminar Serie'}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {isEditingHistorySession && (
                            <button
                              onClick={() => addEditingSet(exIdx)}
                              className="btn btn-secondary"
                              style={{
                                alignSelf: 'flex-start',
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px dashed hsla(var(--border) / 0.5)'
                              }}
                            >
                              <Plus size={12} /> {t.addSet || 'Añadir Serie'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              justifyContent: 'flex-end', 
              gap: '12px', 
              marginTop: '16px', 
              borderTop: '1px solid hsla(var(--border) / 0.5)', 
              paddingTop: '16px' 
            }}>
              {isEditingHistorySession ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditingHistorySession(false);
                      setEditingHistorySessionData(JSON.parse(JSON.stringify(selectedHistorySession)));
                    }}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      padding: '10px 20px',
                      flex: '1 1 auto',
                      minWidth: '140px'
                    }}
                  >
                    <X size={14} /> {t.discardChanges || 'Descartar Cambios'}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!editingHistorySessionData.title.trim()) {
                        alert(language === 'es' ? 'El título no puede estar vacío.' : 'Title cannot be empty.');
                        return;
                      }
                      if (editingHistorySessionData.exercises.length === 0) {
                        alert(language === 'es' ? 'El entrenamiento debe tener al menos un ejercicio.' : 'Workout must have at least one exercise.');
                        return;
                      }
                      onUpdateWorkout(editingHistorySessionData);
                      setSelectedHistorySession(editingHistorySessionData);
                      setIsEditingHistorySession(false);
                    }}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      padding: '10px 20px',
                      background: 'hsl(var(--primary))',
                      color: '#000000',
                      fontWeight: 700,
                      flex: '1 1 auto',
                      minWidth: '140px'
                    }}
                  >
                    <Check size={14} /> {t.saveChanges || 'Guardar Cambios'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const confirmDelete = window.confirm(t.confirmDeleteWorkout || '¿Estás seguro de que deseas eliminar este entrenamiento?');
                      if (confirmDelete) {
                        onDeleteWorkout(selectedHistorySession.parsedDate);
                        setSelectedHistorySession(null);
                        setExpandedHistoryExercises({});
                      }
                    }}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      padding: '10px 20px',
                      borderColor: 'hsl(var(--danger))',
                      color: 'hsl(var(--danger))',
                      marginRight: 'auto',
                      flex: '1 1 auto',
                      minWidth: '140px'
                    }}
                  >
                    <Trash2 size={14} /> {t.deleteWorkout || 'Eliminar'}
                  </button>
 
                  <button
                    onClick={() => setIsEditingHistorySession(true)}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      padding: '10px 20px',
                      flex: '1 1 auto',
                      minWidth: '120px'
                    }}
                  >
                    <Edit2 size={14} /> {t.editWorkout || 'Editar'}
                  </button>
 
                  <button
                    onClick={() => {
                      setSelectedHistorySession(null);
                      setExpandedHistoryExercises({});
                    }}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      padding: '10px 24px',
                      fontWeight: 700,
                      flex: '1 1 auto',
                      minWidth: '100px'
                    }}
                  >
                    {t.close || 'Cerrar'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Strength Road Map Projection Portal Overlay */}
      {projectionExercise && projectionData.length > 0 && createPortal(
        <div 
          onClick={() => setProjectionExercise(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(5, 7, 12, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel fade-in" 
            style={{ 
              maxWidth: '600px',
              width: '100%',
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              border: '1px solid hsla(var(--primary) / 0.4)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              background: 'linear-gradient(180deg, #0d1321 0%, #070a12 100%)',
              color: '#fff'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsla(var(--border) / 0.5)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} color="hsl(var(--primary))" />
                  {t.forecastTitle || 'Strength Road Map'}
                </h3>
                <p style={{ color: 'hsl(var(--muted))', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  {resolveExerciseDisplayName(projectionExercise)} • {
                    progressionSystem === 'double_progression' ? t.doubleProgression :
                    progressionSystem === 'linear_periodization' ? t.linearPeriodization :
                    t.dup
                  }
                </p>
              </div>
              <button 
                onClick={() => setProjectionExercise(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: 'hsl(var(--muted))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '50%',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted))'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
              {t.forecastDesc || 'Proyección de cargas y reps para las siguientes 4 sesiones.'}
            </p>

            {/* Timeline Layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              {projectionData.map((proj) => {
                const focusName = 
                  proj.focusKey === 'focusHypertrophy' ? t.focusHypertrophy :
                  proj.focusKey === 'focusStrength' ? t.focusStrength :
                  proj.focusKey === 'focusPeaking' ? t.focusPeaking :
                  proj.focusKey === 'focusDeload' ? t.focusDeload :
                  proj.focusKey === 'focusPower' ? t.focusPower : proj.focusKey;

                return (
                  <div 
                    key={proj.step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px 16px',
                      background: proj.isCurrent ? 'linear-gradient(90deg, hsla(var(--primary) / 0.15) 0%, rgba(255, 255, 255, 0.02) 100%)' : 'rgba(255, 255, 255, 0.02)',
                      border: proj.isCurrent ? '1px solid hsl(var(--primary))' : '1px solid hsla(var(--border) / 0.5)',
                      borderRadius: '12px',
                      position: 'relative',
                      boxShadow: proj.isCurrent ? '0 0 15px hsla(var(--primary) / 0.1)' : 'none',
                      transition: 'transform 0.2s ease'
                    }}
                    className="hover-card-highlight"
                  >
                    {/* Step indicator */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: proj.isCurrent ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.05)',
                      color: proj.isCurrent ? '#000' : 'hsl(var(--muted))',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {proj.step}
                    </div>

                    {/* Proj details */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                          {proj.weightKg} kg x {proj.reps} {projectionExercise && isTimeBasedExercise(projectionExercise) ? 's' : t.reps}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 8px', 
                          borderRadius: '20px', 
                          background: 
                            proj.focusKey === 'focusDeload' ? 'rgba(239, 68, 68, 0.15)' :
                            proj.focusKey === 'focusPeaking' ? 'rgba(245, 158, 11, 0.15)' :
                            proj.focusKey === 'focusStrength' ? 'rgba(139, 92, 246, 0.15)' :
                            'rgba(16, 185, 129, 0.15)',
                          color: 
                            proj.focusKey === 'focusDeload' ? '#f87171' :
                            proj.focusKey === 'focusPeaking' ? '#fbbf24' :
                            proj.focusKey === 'focusStrength' ? '#a78bfa' :
                            '#34d399',
                          fontWeight: 700,
                          display: 'inline-block',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {focusName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--muted))', marginTop: '2px' }}>
                        <span>{proj.sets} {t.series || 'series'}</span>
                        <span>{t.projectedVolume || 'Volumen'}: <strong style={{ color: 'hsl(var(--primary))' }}>{proj.volume.toLocaleString()} kg</strong></span>
                      </div>
                    </div>

                    {/* Current Tag */}
                    {proj.isCurrent && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '16px',
                        background: 'hsl(var(--primary))',
                        color: '#000',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {language === 'es' ? 'Siguiente Sesión' : 'Next Session'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Exercise Modal */}
      {showAddExerciseModal && createPortal(
        <div style={{
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
        }}>
          <div className="glass-panel fade-in" style={{
            maxWidth: '600px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1px solid hsl(var(--border))'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dumbbell size={20} color="hsl(var(--primary))" />
                {language === 'es' ? 'Agregar Ejercicio al Entrenamiento' : 'Add Exercise to Workout'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddExerciseModal(false);
                  setExerciseSearchText('');
                  setSelectedAddExerciseMuscle('Todos');
                }}
                style={{ background: 'none', border: 'none', color: 'hsl(var(--muted))', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="hsl(var(--muted))" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={exerciseSearchText}
                onChange={(e) => setExerciseSearchText(e.target.value)}
                placeholder={language === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  fontSize: '0.85rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            {/* Create Custom Exercise Button */}
            <button
              onClick={() => setShowCreateExerciseModal(true)}
              className="btn btn-primary animate-pulse"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsla(var(--primary) / 0.8) 100%)',
                color: '#000',
                border: 'none'
              }}
            >
              <Plus size={16} />
              {language === 'es' ? 'Crear Ejercicio Personalizado' : 'Create Custom Exercise'}
            </button>

            {/* Muscle Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['Todos', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femorales', 'Glúteos', 'Core'].map(muscle => (
                <button
                  key={muscle}
                  onClick={() => setSelectedAddExerciseMuscle(muscle)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: selectedAddExerciseMuscle === muscle ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.03)',
                    color: selectedAddExerciseMuscle === muscle ? '#000' : 'hsl(var(--muted))',
                    border: '1px solid ' + (selectedAddExerciseMuscle === muscle ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'),
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {translateMuscleGroup(muscle)}
                </button>
              ))}
            </div>

            {/* Exercises List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '45vh', paddingRight: '4px' }}>
              {filteredExercisesForAdd.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                  {language === 'es' ? 'No se encontraron ejercicios.' : 'No exercises found.'}
                </div>
              ) : (
                filteredExercisesForAdd.map(ex => (
                  <div
                    key={ex.id}
                    onClick={() => handleAddExerciseToActiveSession(ex.title)}
                    className="hover-card-highlight"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid hsla(var(--border) / 0.3)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img 
                        src={getExerciseImage(ex)} 
                        alt={ex.title} 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          border: '1.5px solid hsl(var(--primary))',
                          flexShrink: 0
                        }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong style={{ fontSize: '0.875rem', color: '#fff' }}>
                          {resolveExerciseDisplayName(ex.title)}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted))' }}>
                          {translateEquipment(ex.equipment)} • {translateMuscleGroup(ex.muscleGroup)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {ex.id.startsWith('custom_') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(language === 'es' ? `¿Estás seguro de que deseas eliminar "${ex.title}" para siempre?` : `Are you sure you want to delete "${ex.title}" permanently?`)) {
                              onDeleteCustomExercise(ex.id);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgb(239, 68, 68)',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px'
                          }}
                          title={language === 'es' ? 'Eliminar ejercicio' : 'Delete exercise'}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                      <Plus size={16} color="hsl(var(--primary))" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <CreateExerciseModal
        isOpen={showCreateExerciseModal}
        onClose={() => setShowCreateExerciseModal(false)}
        onSave={onSaveCustomExercise}
        language={language}
        existingExercises={allExercises}
      />
    </div>
  );
}
