import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MILO_REHAB_PROTOCOLS } from '../utils/MiloRehabEngine';
import { auth } from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { EXERCISES_DB, isTimeBasedExercise } from '../data/exercises_db';
import { TRANSLATIONS, getExerciseName } from '../utils/translations';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { calculatePBProfiles, compressAndResizeImage, projectFutureSessions } from '../utils/ProgressionEngine';
import type { ProgressionSystem } from '../utils/ProgressionEngine';
import { 
  TrendingUp, 
  Calendar, 
  Dumbbell, 
  Activity,
  Award,
  Scale,
  HeartPulse,
  X,
  Camera,
  User,
  Plus,
  Trash2,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Zap
} from 'lucide-react';

interface SetRecord {
  setIndex: number;
  setType: string;
  weightKg: number | null;
  reps: number | null;
  distance_km?: number | null;
  duration_seconds?: number | null;
  rpe: number | null;
}

interface ExerciseRecord {
  title: string;
  maxEst1RM?: number;
  totalVolume: number;
  sets: SetRecord[];
}

interface WorkoutSession {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  exercises: ExerciseRecord[];
  parsedDate: string;
}

interface CardioSession {
  date: string;
  minutes: number;
  type: 'LISS' | 'MISS' | 'HIIT';
  calories: number;
}

interface DashboardTabProps {
  localHistory: any[];
  activeInjury: {
    joint: string;
    phase: number;
    weakness: string;
    painScale: number;
  } | null;
  weightHistory: { date: string; weight: number }[];
  cardioHistory?: CardioSession[];
  profilePicture?: string;
  progressPhotos?: any[];
  onAddProgressPhoto?: (photo: { id: string; date: string; weight?: number; photoUrl: string; note?: string }) => void;
  onDeleteProgressPhoto?: (id: string) => void;
  bodyWeight?: number;
  language: 'es' | 'en';
  progressionSystem?: ProgressionSystem;
  onTabChange: (newTab: 'dashboard' | 'workout' | 'rehab' | 'cardio' | 'profile') => void;
}

export default function DashboardTab({ 
  localHistory, 
  activeInjury,
  weightHistory,
  cardioHistory = [],
  profilePicture = '',
  progressPhotos = [],
  onAddProgressPhoto,
  onDeleteProgressPhoto,
  bodyWeight = 75,
  language,
  progressionSystem = 'double_progression',
  onTabChange
}: DashboardTabProps) {
  const t = TRANSLATIONS[language];
  const sessions = localHistory as WorkoutSession[];

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

  const resolveExerciseDisplayName = (title: string) => {
    const dbEx = EXERCISES_DB.find(e => e.title.toLowerCase() === title.toLowerCase() || e.id === title.toLowerCase());
    const id = dbEx ? dbEx.id : title.toLowerCase().replace(/\s+/g, '_');
    return getExerciseName(id, dbEx ? dbEx.title : title, language);
  };


  const [userName, setUserName] = useState<string>('Atleta');

  // Photo gallery and upload states/refs
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoNote, setPhotoNote] = useState<string>('');
  const [photoDate, setPhotoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [photoWeight, setPhotoWeight] = useState<string>(bodyWeight.toString());
  const [showAddPhoto, setShowAddPhoto] = useState<boolean>(false);
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<any | null>(null);
  const [activeModal, setActiveModal] = useState<'1rm' | 'injury' | 'overload' | null>(null);


  // Sync photo weight when bodyWeight updates
  useEffect(() => {
    setPhotoWeight(bodyWeight.toString());
  }, [bodyWeight]);

  // Handle gallery file selection and compression
  const handleGalleryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file, 600, 600);
        setPhotoPreview(compressed);
      } catch (err) {
        console.error('Error compressing gallery image:', err);
        alert('Error al procesar la imagen.');
      }
    }
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      alert('Por favor selecciona una foto.');
      return;
    }
    const newPhoto = {
      id: Date.now().toString(),
      date: photoDate,
      weight: photoWeight ? parseFloat(photoWeight) : undefined,
      photoUrl: photoPreview,
      note: photoNote.trim() || undefined
    };
    if (onAddProgressPhoto) {
      onAddProgressPhoto(newPhoto);
    }
    
    // Reset form
    setPhotoPreview('');
    setPhotoNote('');
    setPhotoDate(new Date().toISOString().split('T')[0]);
    setShowAddPhoto(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.displayName) {
        const first = currentUser.displayName.split(' ')[0];
        setUserName(first);
      } else {
        setUserName('Atleta');
      }
    });
    return unsubscribe;
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const subtitle = useMemo(() => {
    if (sessions.length === 0) {
      return '¡Bienvenido a PLNEXC! Comienza registrando tu primer entrenamiento.';
    }
    return `Has completado ${sessions.length} entrenamientos. ¡A seguir superando marcas!`;
  }, [sessions]);

  // 1. Get List of Exercises with enough history for charts
  const exercisesWithHistory = useMemo(() => {
    const counts: { [title: string]: number } = {};
    sessions.forEach(s => {
      s.exercises.forEach(e => {
        if (e.maxEst1RM) {
          counts[e.title] = (counts[e.title] || 0) + 1;
        }
      });
    });
    
    return Object.entries(counts)
      .filter(([_, count]) => count >= 3)
      .map(([title]) => title)
      .sort();
  }, [sessions]);

  const [selectedExercise, setSelectedExercise] = useState<string>(
    exercisesWithHistory.includes('Bench Press (Barbell)') 
      ? 'Bench Press (Barbell)' 
      : exercisesWithHistory[0] || ''
  );

  // 2. Prepare Chart Data for Selected Exercise
  const chartData = useMemo(() => {
    if (!selectedExercise) return [];
    
    const history = sessions
      .filter(s => s.exercises.some(e => e.title === selectedExercise))
      .map(s => {
        const exercise = s.exercises.find(e => e.title === selectedExercise)!;
        const date = new Date(s.parsedDate);
        const formattedDate = date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
          day: 'numeric', 
          month: 'short' 
        });
        
        return {
          rawDate: date,
          date: formattedDate,
          '1RM Estimado (kg)': exercise.maxEst1RM || 0,
          'Volumen Total (kg)': exercise.totalVolume || 0
        };
      })
      .filter(d => d['1RM Estimado (kg)'] > 0)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
      
    return history;
  }, [sessions, selectedExercise]);

  // Widget ID Type & Layout States
  type WidgetId = 'stats' | 'coach' | 'strength' | 'weight' | 'cardio' | 'splits_prs' | 'progress_photo' | 'weekly_sets' | 'projections';

  const [isEditingLayout, setIsEditingLayout] = useState<boolean>(false);
  const [layoutOrder, setLayoutOrder] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem('plnexc_dashboard_layout');
    const required: WidgetId[] = ['stats', 'coach', 'strength', 'weight', 'cardio', 'splits_prs', 'progress_photo', 'weekly_sets', 'projections'];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasAll = required.every(id => parsed.includes(id));
        if (hasAll && parsed.length === required.length) return parsed;

        const filtered = parsed.filter((id: any) => required.includes(id)) as WidgetId[];
        required.forEach(id => {
          if (!filtered.includes(id)) {
            filtered.push(id);
          }
        });
        return filtered;
      } catch (e) {
        // Fallback
      }
    }
    return required;
  });

  // Calculate Weekly Sets per Muscle Group (Monday-Sunday local time)
  const weeklySetsByMuscle = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(now.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const muscles = {
      Pecho: 0,
      Espalda: 0,
      Hombros: 0,
      Bíceps: 0,
      Tríceps: 0,
      Cuádriceps: 0,
      Femorales: 0,
      Glúteos: 0,
      Pantorrillas: 0,
      Core: 0
    };

    sessions.forEach(session => {
      if (!session.parsedDate) return;
      const sessionDate = new Date(session.parsedDate);
      if (sessionDate >= monday && sessionDate <= sunday) {
        session.exercises.forEach(ex => {
          const dbEx = EXERCISES_DB.find(e => e.title.toLowerCase() === ex.title.toLowerCase() || e.id === ex.title.toLowerCase());
          if (dbEx) {
            let muscleGroup = dbEx.muscleGroup;
            let completedSets = 0;
            ex.sets.forEach((s: any) => {
              const isCompleted = s.completed !== undefined ? s.completed : ((s.weight_kg !== null && s.weight_kg > 0) && (s.reps !== null && s.reps > 0));
              if (isCompleted) {
                completedSets++;
              }
            });

            // Map old/legacy categories to specific ones for fallback
            if ((muscleGroup as string) === 'Brazos') {
              muscleGroup = 'Bíceps';
            } else if ((muscleGroup as string) === 'Piernas') {
              muscleGroup = 'Cuádriceps';
            }

            // Primary group accumulation (1.0 sets)
            if (muscles.hasOwnProperty(muscleGroup)) {
              muscles[muscleGroup as keyof typeof muscles] += completedSets;
            } else if (muscleGroup === 'Cuello') {
              muscles['Espalda'] += completedSets;
            }

            // Secondary groups accumulation (0.5 sets each)
            if (dbEx.secondaryMuscleGroups && Array.isArray(dbEx.secondaryMuscleGroups)) {
              dbEx.secondaryMuscleGroups.forEach((secGroup: any) => {
                let mappedSecGroup = secGroup;
                if (mappedSecGroup === 'Brazos') mappedSecGroup = 'Bíceps';
                else if (mappedSecGroup === 'Piernas') mappedSecGroup = 'Cuádriceps';

                if (muscles.hasOwnProperty(mappedSecGroup)) {
                  muscles[mappedSecGroup as keyof typeof muscles] += completedSets * 0.5;
                }
              });
            }
          }
        });
      }
    });

    return muscles;
  }, [sessions]);

  // PB Sub-tabs & modal state variables
  const pbProfiles = useMemo(() => calculatePBProfiles(localHistory), [localHistory]);
  const [pbSubTab, setPbSubTab] = useState<'1rm' | 'weight' | 'volume' | 'reps'>('1rm');
  const [selectedExerciseForChart, setSelectedExerciseForChart] = useState<string | null>(null);
  
  // Default selected exercise for Reps PR tab
  const uniqueExerciseNames = useMemo(() => {
    return Object.keys(pbProfiles).sort();
  }, [pbProfiles]);

  const [selectedExerciseForRepsTab, setSelectedExerciseForRepsTab] = useState<string>('');

  // Set default selected exercise for reps tab when list is calculated
  useEffect(() => {
    if (uniqueExerciseNames.length > 0 && !selectedExerciseForRepsTab) {
      setSelectedExerciseForRepsTab(uniqueExerciseNames[0]);
    }
  }, [uniqueExerciseNames, selectedExerciseForRepsTab]);

  // Projections widget states
  const [projectionsExercise, setProjectionsExercise] = useState<string>('');
  const [projectionsSystem, setProjectionsSystem] = useState<string>(progressionSystem);

  // Set default selected exercise for projections widget
  useEffect(() => {
    if (uniqueExerciseNames.length > 0 && !projectionsExercise) {
      setProjectionsExercise(uniqueExerciseNames[0]);
    }
  }, [uniqueExerciseNames, projectionsExercise]);

  // Sync simulation system when prop changes
  useEffect(() => {
    if (progressionSystem) {
      setProjectionsSystem(progressionSystem);
    }
  }, [progressionSystem]);

  // Extract latest session and sets for projections calculation
  const latestExerciseSession = useMemo(() => {
    if (!projectionsExercise) return null;
    const matching = [...localHistory]
      .filter(s => s.exercises && s.exercises.some((e: any) => e.title.toLowerCase() === projectionsExercise.toLowerCase()));
    matching.sort((a, b) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());
    return matching[0];
  }, [projectionsExercise, localHistory]);

  const lastSetsForProjections = useMemo(() => {
    if (!latestExerciseSession || !projectionsExercise) return [];
    const ex = latestExerciseSession.exercises.find((e: any) => e.title.toLowerCase() === projectionsExercise.toLowerCase());
    if (!ex) return [];
    return ex.sets.map((s: any) => ({
      setIndex: s.setIndex,
      setType: s.setType || 'normal',
      weightKg: s.weight_kg !== undefined ? s.weight_kg : (s.weightKg !== undefined ? s.weightKg : 0),
      reps: s.reps || 0,
      rpe: s.rpe || null
    }));
  }, [latestExerciseSession, projectionsExercise]);

  const projectedData = useMemo(() => {
    if (!projectionsExercise) return [];
    return projectFutureSessions(
      projectionsExercise,
      lastSetsForProjections,
      (projectionsSystem || progressionSystem || 'double_progression') as any,
      bodyWeight
    );
  }, [projectionsExercise, lastSetsForProjections, projectionsSystem, progressionSystem, bodyWeight]);

  // Filter out any hidden widgets (like strength when there is no selectedExercise)
  const activeLayoutOrder = useMemo(() => {
    return layoutOrder.filter(id => {
      if (id === 'strength' && !selectedExercise) return false;
      return true;
    });
  }, [layoutOrder, selectedExercise]);

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...layoutOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < activeLayoutOrder.length) {
      const itemA = activeLayoutOrder[index];
      const itemB = activeLayoutOrder[targetIndex];
      const indexA = newOrder.indexOf(itemA);
      const indexB = newOrder.indexOf(itemB);
      if (indexA !== -1 && indexB !== -1) {
        newOrder[indexA] = itemB;
        newOrder[indexB] = itemA;
        setLayoutOrder(newOrder);
      }
    }
  };

  // Cardio states and helper
  const [cardioTimeRange, setCardioTimeRange] = useState<'7' | '30'>('7');
  const [cardioMetric, setCardioMetric] = useState<'minutes' | 'calories'>('minutes');

  const cardioChartData = useMemo(() => {
    const numDays = parseInt(cardioTimeRange, 10);
    const data = [];
    
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      
      const daySessions = cardioHistory.filter(s => {
        const sDate = new Date(s.date);
        return sDate >= startOfDay && sDate <= endOfDay;
      });
      
      let liss = 0;
      let miss = 0;
      let hiit = 0;
      let calories = 0;
      
      daySessions.forEach(s => {
        if (s.type === 'LISS') liss += s.minutes;
        else if (s.type === 'MISS') miss += s.minutes;
        else if (s.type === 'HIIT') hiit += s.minutes;
        calories += s.calories;
      });
      
      const dateLabel = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
        day: 'numeric', 
        month: 'short' 
      });
      
      data.push({
        date: dateLabel,
        LISS: Math.round(liss * 10) / 10,
        MISS: Math.round(miss * 10) / 10,
        HIIT: Math.round(hiit * 10) / 10,
        'Minutos Totales': Math.round((liss + miss + hiit) * 10) / 10,
        'Calorías (kcal)': Math.round(calories)
      });
    }
    
    return data;
  }, [cardioHistory, cardioTimeRange]);

  const renderCardioChart = () => {
    const numDays = parseInt(cardioTimeRange, 10);
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - numDays);
    cutOffDate.setHours(0, 0, 0, 0);
    const hasCardioData = cardioHistory.some(s => new Date(s.date) >= cutOffDate);

    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HeartPulse size={22} color="hsl(var(--danger))" />
              {language === 'es' ? 'Evolución y Gasto de Cardio' : 'Cardio Progress & Expenditure'}
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
              {language === 'es' ? 'Visualiza tus minutos de cardio e intensidad, o el gasto calórico diario' : 'View your cardio minutes and intensity, or daily calorie burn'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '2px' }}>
              <button 
                onClick={() => setCardioMetric('minutes')}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  borderRadius: '6px',
                  background: cardioMetric === 'minutes' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                  border: 'none',
                  color: cardioMetric === 'minutes' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  cursor: 'pointer',
                  fontWeight: cardioMetric === 'minutes' ? 'bold' : 'normal'
                }}
              >
                {language === 'es' ? 'Minutos (Barras)' : 'Minutes (Bars)'}
              </button>
              <button 
                onClick={() => setCardioMetric('calories')}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  borderRadius: '6px',
                  background: cardioMetric === 'calories' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                  border: 'none',
                  color: cardioMetric === 'calories' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  cursor: 'pointer',
                  fontWeight: cardioMetric === 'calories' ? 'bold' : 'normal'
                }}
              >
                {language === 'es' ? 'Calorías (Área)' : 'Calories (Area)'}
              </button>
            </div>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '2px' }}>
              <button 
                onClick={() => setCardioTimeRange('7')}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  borderRadius: '6px',
                  background: cardioTimeRange === '7' ? 'hsla(var(--secondary) / 0.15)' : 'transparent',
                  border: 'none',
                  color: cardioTimeRange === '7' ? 'hsl(var(--secondary))' : 'hsl(var(--muted))',
                  cursor: 'pointer',
                  fontWeight: cardioTimeRange === '7' ? 'bold' : 'normal'
                }}
              >
                {language === 'es' ? '7 Días' : '7 Days'}
              </button>
              <button 
                onClick={() => setCardioTimeRange('30')}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  borderRadius: '6px',
                  background: cardioTimeRange === '30' ? 'hsla(var(--secondary) / 0.15)' : 'transparent',
                  border: 'none',
                  color: cardioTimeRange === '30' ? 'hsl(var(--secondary))' : 'hsl(var(--muted))',
                  cursor: 'pointer',
                  fontWeight: cardioTimeRange === '30' ? 'bold' : 'normal'
                }}
              >
                {language === 'es' ? '30 Días' : '30 Days'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: '260px', marginTop: '10px' }}>
          {hasCardioData ? (
            <ResponsiveContainer width="100%" height="100%">
              {cardioMetric === 'minutes' ? (
                <BarChart data={cardioChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted))" 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted))" 
                    fontSize={11} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--bg-surface))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontFamily: 'inherit'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Bar dataKey="LISS" name={`LISS (${language === 'es' ? 'Bajo' : 'Low'})`} stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="MISS" name={`MISS (${language === 'es' ? 'Medio' : 'Medium'})`} stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="HIIT" name={`HIIT (${language === 'es' ? 'Alto' : 'High'})`} stackId="a" fill="hsl(var(--danger))" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={cardioChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCardioKcal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted))" 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted))" 
                    fontSize={11} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--bg-surface))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontFamily: 'inherit'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Calorías (kcal)" 
                    name={language === 'es' ? 'Calorías (kcal)' : 'Calories (kcal)'}
                    stroke="hsl(var(--danger))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCardioKcal)" 
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'hsl(var(--muted))', fontSize: '0.85rem', textAlign: 'center', padding: '0 20px', lineHeight: '1.5' }}>
              {language === 'es' ? (
                <>
                  No hay registros de cardio para los últimos {cardioTimeRange} días.<br />
                  Usa el cronómetro en la pestaña de Cardio para registrar tu primera sesión.
                </>
              ) : (
                <>
                  No cardio logs found for the last {cardioTimeRange} days.<br />
                  Use the stopwatch in the Cardio tab to log your first session.
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStatsGrid = () => {
    return (
      <div className="grid-cols-3">
        <div className="glass-panel premium-stat-card" style={{ color: 'hsl(var(--primary))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <span className="stat-label">{language === 'es' ? 'Sesiones de Fuerza' : 'Strength Sessions'}</span>
              <span className="stat-value" style={{ display: 'block', marginTop: '8px' }}>{stats.totalWorkouts}</span>
            </div>
            <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '8px', borderRadius: '12px' }}>
              <Calendar size={20} color="hsl(var(--primary))" />
            </div>
          </div>
          <span className="stat-desc" style={{ zIndex: 1, marginTop: '12px' }}>{language === 'es' ? 'Entrenamientos registrados de por vida' : 'Lifetime registered workouts'}</span>
          <Calendar size={90} className="stat-icon-bg" />
        </div>

        <div className="glass-panel premium-stat-card" style={{ color: 'hsl(var(--secondary))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <span className="stat-label">{language === 'es' ? 'Series Completadas' : 'Completed Sets'}</span>
              <span className="stat-value" style={{ display: 'block', marginTop: '8px' }}>{stats.totalSets}</span>
            </div>
            <div style={{ background: 'hsla(var(--secondary) / 0.1)', padding: '8px', borderRadius: '12px' }}>
              <Dumbbell size={20} color="hsl(var(--secondary))" />
            </div>
          </div>
          <span className="stat-desc" style={{ zIndex: 1, marginTop: '12px' }}>{language === 'es' ? 'Sets de trabajo y calentamientos' : 'Work and warmup sets'}</span>
          <Dumbbell size={90} className="stat-icon-bg" />
        </div>

        <div className="glass-panel premium-stat-card" style={{ color: 'hsl(var(--success))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <span className="stat-label">{language === 'es' ? 'Fuerza Promedio (1RM PR)' : 'Average Strength (1RM PR)'}</span>
              <span className="stat-value" style={{ display: 'block', marginTop: '8px' }}>
                {stats.bests['Bench Press (Barbell)'] 
                  ? `${Math.round(stats.bests['Bench Press (Barbell)'])} kg` 
                  : (language === 'es' ? 'Lista para medir' : 'Ready to measure')}
              </span>
            </div>
            <div style={{ background: 'hsla(var(--success) / 0.1)', padding: '8px', borderRadius: '12px' }}>
              <Award size={20} color="hsl(var(--success))" />
            </div>
          </div>
          <span className="stat-desc" style={{ zIndex: 1, marginTop: '12px' }}>{language === 'es' ? 'Récord máximo en Press de Banca' : 'Bench Press all-time record'}</span>
          <Award size={90} className="stat-icon-bg" />
        </div>
      </div>
    );
  };

  const renderCoachAnalysis = () => {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={22} color="hsl(var(--primary))" />
            {language === 'es' ? 'Análisis de Puntos Débiles y Plan de Acción' : 'Weakness Analysis & Action Plan'}
          </h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
            {language === 'es' ? 'Diagnóstico inteligente en base a volumen, frecuencia, tiempo y estado de lesiones (PLNEXC)' : 'Smart diagnosis based on volume, frequency, time and injury status (PLNEXC)'}
          </p>
        </div>

        <div className="grid-cols-2" style={{ alignItems: 'start', gap: '24px' }}>
          {/* Gráfico de Prioridades y Puntos Débiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--primary))' }}>
              {language === 'es' ? 'Índice de Prioridad y Debilidad' : 'Priority & Weakness Index'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {weaknessAnalysis.map(item => {
                let badgeColor = 'badge-success';
                let badgeText = language === 'es' ? 'Óptimo' : 'Optimal';
                let barColor = 'hsl(var(--success))';
                
                if (item.status === 'lesion') {
                  badgeColor = 'badge-danger';
                  badgeText = language === 'es' ? `⚠️ Rehab PLNEXC (Fase ${activeInjury?.phase})` : `⚠️ Rehab PLNEXC (Phase ${activeInjury?.phase})`;
                  barColor = 'hsl(var(--danger))';
                } else if (item.status === 'desentrenado') {
                  badgeColor = 'badge-warning';
                  badgeText = language === 'es' ? `💤 Desentrenado (${item.daysSince}d)` : `💤 Detrained (${item.daysSince}d)`;
                  barColor = 'hsl(var(--warning))';
                } else if (item.status === 'bajo') {
                  badgeColor = 'badge-primary';
                  badgeText = language === 'es' ? `📉 Bajo Volumen (${item.volShare.toFixed(1)}%)` : `📉 Low Volume (${item.volShare.toFixed(1)}%)`;
                  barColor = 'hsl(var(--primary))';
                }

                return (
                  <div key={item.group} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{translateMuscleGroup(item.group)}</strong>
                      <span className={`badge ${badgeColor}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        {badgeText}
                      </span>
                    </div>
                    
                    <div style={{ position: 'relative', height: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${item.score}%`, 
                          background: `linear-gradient(90deg, ${barColor} 0%, hsl(var(--secondary)) 100%)`,
                          borderRadius: '6px',
                          boxShadow: item.status === 'lesion' ? '0 0 10px hsla(var(--danger) / 0.4)' : 'none',
                          transition: 'width 0.5s ease-out'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tarjetas de Plan de Acción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--secondary))' }}>
              {language === 'es' ? 'Plan de Acción para el Siguiente Entrenamiento' : 'Next Workout Action Plan'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {weaknessAnalysis.filter(item => item.score > 25 || item.status !== 'optimo').length === 0 ? (
                <div style={{ background: 'hsla(var(--success) / 0.05)', border: '1px solid hsla(var(--success) / 0.2)', padding: '16px', borderRadius: '12px', color: 'hsl(var(--success))', fontSize: '0.875rem', textAlign: 'center' }}>
                  {language === 'es' ? '🎉 ¡Excelente! Todos tus grupos musculares están balanceados y en estado óptimo. Sigue entrenando de forma regular.' : '🎉 Excellent! All your muscle groups are balanced and in optimal status. Keep training regularly.'}
                </div>
              ) : (
                weaknessAnalysis
                  .filter(item => item.score > 25 || item.status !== 'optimo')
                  .slice(0, 3)
                  .map(item => {
                    let cardBg = 'rgba(255, 255, 255, 0.01)';
                    let cardBorder = 'hsl(var(--border))';
                    let titleIcon = 'ℹ️';
                    let titleColor = '#ffffff';
                    let advice = '';

                    const groupTrans = translateMuscleGroup(item.group);

                    if (item.status === 'lesion') {
                      cardBg = 'hsla(var(--danger) / 0.04)';
                      cardBorder = 'hsla(var(--danger) / 0.3)';
                      titleIcon = '⚠️';
                      titleColor = 'hsl(var(--danger))';
                      const jointName = activeInjury ? (MILO_REHAB_PROTOCOLS[activeInjury.joint]?.displayName || activeInjury.joint) : '';
                      advice = language === 'es'
                        ? `Tu articulación (${jointName}) está en fase ${activeInjury?.phase} de recuperación PLNEXC. Evita levantar pesos máximos en ejercicios de ${item.group}. Prioriza la movilidad y la fuerza isométrica.`
                        : `Your joint (${jointName}) is in phase ${activeInjury?.phase} of PLNEXC rehab. Avoid lifting maximum weights in ${groupTrans} exercises. Prioritize mobility and isometric strength.`;
                    } else if (item.status === 'desentrenado') {
                      cardBg = 'hsla(var(--warning) / 0.04)';
                      cardBorder = 'hsla(var(--warning) / 0.3)';
                      titleIcon = '💤';
                      titleColor = 'hsl(var(--warning))';
                      advice = language === 'es'
                        ? `Llevas ${item.daysSince} días sin entrenar ${item.group}. En tu próxima sesión de fuerza, prioriza ejercicios para este grupo para evitar pérdida de adaptaciones neuromusculares.`
                        : `You have not trained ${groupTrans} for ${item.daysSince} days. In your next strength session, prioritize exercises for this group to prevent loss of neuromuscular adaptations.`;
                    } else if (item.status === 'bajo') {
                      cardBg = 'hsla(var(--primary) / 0.04)';
                      cardBorder = 'hsla(var(--primary) / 0.3)';
                      titleIcon = '📉';
                      titleColor = 'hsl(var(--primary))';
                      advice = language === 'es'
                        ? `El volumen semanal de ${item.group} es bajo (solo representa el ${item.volShare.toFixed(1)}% de tu volumen de trabajo total). Añade 1 ejercicio o 2 series de trabajo extra en tu siguiente rutina.`
                        : `Weekly volume for ${groupTrans} is low (only represents ${item.volShare.toFixed(1)}% of your total work volume). Add 1 exercise or 2 work sets in your next routine.`;
                    } else if (item.hasRegression) {
                      cardBg = 'hsla(var(--secondary) / 0.04)';
                      cardBorder = 'hsla(var(--secondary) / 0.3)';
                      titleIcon = '📊';
                      titleColor = 'hsl(var(--secondary))';
                      advice = language === 'es'
                        ? `Se detectó una regresión del 1RM estimado en los levantamientos principales de ${item.group}. Asegura al menos 2 minutos de descanso entre series pesadas y controla la fatiga mental.`
                        : `Estimated 1RM regression was detected in the main lifts of ${groupTrans}. Ensure at least 2 minutes of rest between heavy sets and manage mental fatigue.`;
                    }

                    return (
                      <div 
                        key={item.group}
                        style={{
                          background: cardBg,
                          border: `1px solid ${cardBorder}`,
                          padding: '12px 14px',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.85rem', color: titleColor }}>
                          <span>{titleIcon}</span>
                          <span>{language === 'es' ? 'Prioridad:' : 'Priority:'} {groupTrans}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#c7d2fe', lineHeight: '1.4' }}>
                          {advice}
                        </p>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStrengthChart = () => {
    if (!selectedExercise) return null;
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={24} color="hsl(var(--primary))" />
              {language === 'es' ? 'Curva de Fuerza Inteligente' : 'Smart Strength Curve'}
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
              {language === 'es' ? 'Progreso del Récord Teórico 1RM (Fórmula Epley)' : 'Estimated 1RM Theoretical Progress (Epley Formula)'}
            </p>
          </div>
          
          <div style={{ width: '100%', maxWidth: '300px' }}>
            <select 
              value={selectedExercise} 
              onChange={(e) => setSelectedExercise(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              {exercisesWithHistory.map(ex => (
                <option key={ex} value={ex}>{resolveExerciseDisplayName(ex)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ width: '100%', height: '300px', marginTop: '10px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="color1RM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted))" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted))" 
                  fontSize={11} 
                  domain={['auto', 'auto']}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--bg-surface))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontFamily: 'inherit'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="1RM Estimado (kg)" 
                  name={language === 'es' ? '1RM Estimado (kg)' : 'Estimated 1RM (kg)'}
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#color1RM)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'hsl(var(--muted))' }}>
              {language === 'es' ? 'Cargando datos históricos...' : 'Loading history data...'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeightChart = () => {
    const weightChartData = weightHistory.map(record => {
      const dateObj = new Date(record.date);
      const formattedDate = dateObj.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
        day: 'numeric', 
        month: 'short' 
      });
      return {
        date: formattedDate,
        'Peso (kg)': record.weight
      };
    });

    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={22} color="hsl(var(--primary))" />
            {t.bodyWeightEvolTitle}
          </h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
            {t.bodyWeightEvolSubtitle}
          </p>
        </div>

        <div style={{ width: '100%', height: '240px', marginTop: '10px' }}>
          {weightChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted))" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted))" 
                  fontSize={11} 
                  domain={['auto', 'auto']}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--bg-surface))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontFamily: 'inherit'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="Peso (kg)" 
                  name={language === 'es' ? 'Peso (kg)' : 'Weight (kg)'}
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'hsl(var(--muted))', padding: '0 20px', textAlign: 'center', fontSize: '0.85rem' }}>
              {t.bodyWeightNoHistory}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSplitsAndPRs = () => {
    return (
      <div className="grid-cols-2">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="hsl(var(--secondary))" />
            {t.loadDistributionTitle || 'Distribución de Carga Semanal'}
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginBottom: '16px' }}>
            {t.loadDistributionDesc || 'Volumen acumulado por grupo muscular (kg totales en tu historial)'}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(stats.muscleVolume)
              .filter(([_, vol]) => vol > 0)
              .map(([muscle, vol]) => {
                const maxVol = Math.max(...Object.values(stats.muscleVolume));
                const percentage = maxVol > 0 ? (vol / maxVol) * 100 : 0;
                return (
                  <div key={muscle} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span>{translateMuscleGroup(muscle)}</span>
                      <span style={{ color: 'hsl(var(--muted))' }}>{formatVolume(vol)}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${percentage}%`, 
                          background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                          borderRadius: '4px' 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Award size={20} color="hsl(var(--success))" />
              {t.pbTitle || 'Récords Personales (PBs)'}
            </h3>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
              {t.pbDesc || 'Tus mejores marcas registradas. Haz clic en un ejercicio para ver su progreso.'}
            </p>
          </div>

          {/* Sub-tabs pills */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid hsl(var(--border))', flexWrap: 'wrap' }}>
            {(['1rm', 'weight', 'volume', 'reps'] as const).map((tab) => {
              const label = tab === '1rm' ? t.pbTab1RM : tab === 'weight' ? t.pbTabMaxWeight : tab === 'volume' ? t.pbTabMaxVolume : t.pbTabRepsProfile;
              const active = pbSubTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPbSubTab(tab)}
                  style={{
                    flex: 1,
                    background: active ? 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' : 'transparent',
                    border: 'none',
                    color: active ? '#000000' : 'hsl(var(--muted))',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {pbSubTab === '1rm' && (
              Object.entries(pbProfiles).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>{t.pbNoHistory || 'Sin historial de levantamientos para este ejercicio.'}</div>
              ) : (
                Object.entries(pbProfiles)
                  .sort((a, b) => b[1].maxEst1RM.value - a[1].maxEst1RM.value)
                  .map(([exercise, profile]) => (
                    <div 
                      key={exercise} 
                      onClick={() => setSelectedExerciseForChart(exercise)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      className="hover-card-highlight shimmer-card"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {resolveExerciseDisplayName(exercise)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                          {isTimeBasedExercise(exercise)
                            ? (language === 'es' ? `Logrado: ${profile.maxEst1RM.weight}kg x ${profile.maxEst1RM.reps} s` : `Achieved: ${profile.maxEst1RM.weight}kg x ${profile.maxEst1RM.reps} s`)
                            : (t.pbEst1RMWithReps 
                                ? t.pbEst1RMWithReps.replace('{weight}', profile.maxEst1RM.weight.toString()).replace('{reps}', profile.maxEst1RM.reps.toString())
                                : `Logrado: ${profile.maxEst1RM.weight}kg x ${profile.maxEst1RM.reps} reps`)}
                        </span>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {Math.round(profile.maxEst1RM.value)} kg
                      </span>
                    </div>
                  ))
              )
            )}

            {pbSubTab === 'weight' && (
              Object.entries(pbProfiles).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>{t.pbNoHistory || 'Sin historial de levantamientos para este ejercicio.'}</div>
              ) : (
                Object.entries(pbProfiles)
                  .sort((a, b) => b[1].maxWeight.weight - a[1].maxWeight.weight)
                  .map(([exercise, profile]) => (
                    <div 
                      key={exercise} 
                      onClick={() => setSelectedExerciseForChart(exercise)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      className="hover-card-highlight shimmer-card"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {resolveExerciseDisplayName(exercise)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                          {isTimeBasedExercise(exercise)
                            ? (language === 'es' ? `Sostenido por ${profile.maxWeight.reps} s` : `Held for ${profile.maxWeight.reps} s`)
                            : (t.pbMaxWeightWithReps 
                                ? t.pbMaxWeightWithReps.replace('{reps}', profile.maxWeight.reps.toString())
                                : `Realizado con ${profile.maxWeight.reps} reps`)}
                        </span>
                      </div>
                      <span className="badge badge-secondary" style={{ fontSize: '0.8rem', fontWeight: 'bold', background: 'hsla(var(--secondary) / 0.1)', color: 'hsl(var(--secondary))', border: '1px solid hsla(var(--secondary) / 0.2)' }}>
                        {profile.maxWeight.weight} kg
                      </span>
                    </div>
                  ))
              )
            )}

            {pbSubTab === 'volume' && (
              Object.entries(pbProfiles).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>{t.pbNoHistory || 'Sin historial de levantamientos para este ejercicio.'}</div>
              ) : (
                Object.entries(pbProfiles)
                  .sort((a, b) => b[1].maxVolume.value - a[1].maxVolume.value)
                  .map(([exercise, profile]) => (
                    <div 
                      key={exercise} 
                      onClick={() => setSelectedExerciseForChart(exercise)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      className="hover-card-highlight shimmer-card"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {resolveExerciseDisplayName(exercise)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                          {t.pbMaxAccumulatedVolume || 'Máximo acumulado por sesión'}
                        </span>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {profile.maxVolume.value.toLocaleString()} kg
                      </span>
                    </div>
                  ))
              )
            )}

            {pbSubTab === 'reps' && (
              uniqueExerciseNames.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>{t.pbHistoryNoExercises || 'No hay ejercicios registrados.'}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', fontWeight: 700 }}>{t.pbSelectExercise || 'Selecciona Ejercicio:'}</label>
                    <select
                      value={selectedExerciseForRepsTab}
                      onChange={(e) => setSelectedExerciseForRepsTab(e.target.value)}
                      style={{
                        padding: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      {uniqueExerciseNames.map(ex => (
                        <option key={ex} value={ex}>{resolveExerciseDisplayName(ex)}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const profile = pbProfiles[selectedExerciseForRepsTab];
                    if (!profile) return null;
                    const repsToCheck = [1, 3, 5, 8, 10];
                    return (
                      <div 
                        onClick={() => setSelectedExerciseForChart(selectedExerciseForRepsTab)}
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(5, 1fr)', 
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        {repsToCheck.map(r => {
                          const record = profile.repPRs[r];
                          const dateLocaleStr = record ? new Date(record.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US') : '';
                          return (
                            <div 
                              key={r} 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                gap: '4px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                padding: '6px 4px'
                              }}
                              title={record ? (t.pbLogDate ? t.pbLogDate.replace('{date}', dateLocaleStr) : `Logrado el ${dateLocaleStr}`) : (t.pbNoData || 'Sin datos')}
                            >
                              <span style={{ fontSize: '0.6rem', color: 'hsl(var(--muted))', fontWeight: 700 }}>{r} {selectedExerciseForRepsTab && isTimeBasedExercise(selectedExerciseForRepsTab) ? 's' : (t.pbRepsSuffix || 'Reps')}</span>
                              <strong style={{ fontSize: '0.75rem', color: record ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}>
                                {record ? `${record.weight}${t.pbWeightSuffix || 'kg'}` : '---'}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };  const renderProgressPhotoWidget = () => {
    const latestPhoto = progressPhotos && progressPhotos.length > 0 ? progressPhotos[0] : null;

    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Camera size={22} color="hsl(var(--primary))" />
              {t.latestProgressPhoto || 'Última Foto de Progreso'}
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px', marginBottom: 0 }}>
              {t.photoWidgetSubtitle || 'Tu evolución física visual en base al historial de fotos de tu perfil'}
            </p>
          </div>
          <button 
            onClick={() => setShowAddPhoto(!showAddPhoto)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> {t.profilePhotosFormBtn || 'Añadir Foto'}
          </button>
        </div>

        {/* Formulario para añadir foto */}
        {showAddPhoto && (
          <form 
            onSubmit={handleAddPhotoSubmit}
            className="glass-panel fade-in" 
            style={{ 
              padding: '20px', 
              background: 'rgba(255,255,255,0.01)', 
              borderColor: 'hsla(var(--primary) / 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '8px'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--primary))', margin: 0 }}>{t.photoWidgetFormTitle || 'Añadir Nuevo Registro Visual'}</h3>
            
            <div className="grid-cols-2" style={{ gap: '16px' }}>
              
              {/* Carga de Imagen */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed hsl(var(--border))', borderRadius: '10px', padding: '20px', minHeight: '180px', background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
                {photoPreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', maxHeight: '180px', display: 'flex', justifyContent: 'center' }}>
                    <img 
                      src={photoPreview} 
                      alt="Vista previa" 
                      style={{ maxHeight: '180px', objectFit: 'contain', borderRadius: '6px' }} 
                    />
                    <button
                      type="button"
                      onClick={() => { setPhotoPreview(''); }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(7,8,12,0.8)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputGalleryRef.current?.click()}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <ImageIcon size={32} color="hsl(var(--muted))" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.photoWidgetUploadClick || 'Hacer clic para subir foto'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>{t.photoWidgetUploadHint || 'Imágenes JPG, PNG. Compresión local automática'}</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputGalleryRef} 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                  onChange={handleGalleryFileSelect} 
                />
              </div>

              {/* Formulario Metadatos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{t.photoWidgetDate || 'Fecha'}</label>
                    <input 
                      type="date" 
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{t.profileWeightInput || 'Peso Corporal (kg)'}</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={photoWeight}
                      onChange={(e) => setPhotoWeight(e.target.value)}
                      placeholder="Ej: 75.5"
                      style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{t.profilePhotosFormNote || 'Nota de progreso'}</label>
                  <textarea 
                    value={photoNote}
                    onChange={(e) => setPhotoNote(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: Fin del ciclo de volumen. Nuevos PBs.' : 'E.g. End of volume cycle. New PBs.'}
                    rows={3}
                    style={{ resize: 'none', width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowAddPhoto(false); setPhotoPreview(''); setPhotoNote(''); }}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                {t.cancel || 'Cancelar'}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                disabled={!photoPreview}
              >
                {t.photoWidgetSaveBtn || 'Guardar Registro'}
              </button>
            </div>
          </form>
        )}

        {!latestPhoto ? (
          <div style={{
            border: '2px dashed rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.01)'
          }}>
            <Camera size={40} style={{ color: 'hsl(var(--muted))', opacity: 0.5 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 4px 0', color: '#ffffff' }}>{t.photoWidgetNoPhotos || 'No hay fotos de progreso'}</p>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', margin: 0, maxWidth: '280px', marginInline: 'auto' }}>
                {t.photoWidgetNoPhotosHint || 'Sube fotos de tu progreso corporal directamente o desde la pestaña de Perfil.'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '20px',
            alignItems: 'center'
          }}>
            {/* Foto de progreso */}
            <div 
              onClick={() => setActiveLightboxPhoto(latestPhoto)}
              style={{ 
                position: 'relative',
                borderRadius: '8px', 
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '260px',
                aspectRatio: '4/3',
                width: '100%',
                margin: '0 auto',
                cursor: 'pointer'
              }}
            >
              <img 
                src={latestPhoto.photoUrl} 
                alt="Progreso" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '260px',
                  objectFit: 'contain',
                  display: 'block'
                }} 
              />
            </div>

            {/* Metadatos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <Calendar size={16} color="hsl(var(--muted))" />
                  <span style={{ color: 'hsl(var(--muted))' }}>{t.photoWidgetDate || 'Fecha:'}</span>
                  <strong style={{ color: '#ffffff' }}>
                    {new Date(latestPhoto.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>
                </div>

                {latestPhoto.weight && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <Scale size={16} color="hsl(var(--muted))" />
                    <span style={{ color: 'hsl(var(--muted))' }}>{t.profilePhotosDetailWeightLabel || 'Peso registrado:'}</span>
                    <strong style={{ color: 'hsl(var(--primary))' }}>{latestPhoto.weight} kg</strong>
                  </div>
                )}
              </div>

              {latestPhoto.note && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderLeft: '3px solid hsl(var(--primary))',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  color: 'hsl(var(--muted))',
                  lineHeight: '1.4'
                }}>
                  "{latestPhoto.note}"
                </div>
              )}

              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', marginTop: '4px' }}>
                {t.photoWidgetClickDetail || '💡 Puedes ver e interactuar con la foto haciendo clic en ella, o gestionarla desde el Perfil.'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderWeeklySets = () => {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="hsl(var(--primary))" />
            {t.weeklySetsTitle || 'Volumen de Series Semanal por Músculo'}
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
            {t.weeklySetsSubtitle || 'Series completadas en la semana activa frente al objetivo saludable (10-20 series)'}
          </p>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.75rem', fontStyle: 'italic', margin: '6px 0 0 0', lineHeight: '1.4', opacity: 0.85 }}>
            {t.weeklySetsTip || '💡 Nota: Los ejercicios compuestos suman 1.0 serie a su músculo principal y 0.5 series a sus músculos secundarios (sinergistas).'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
          {Object.entries(weeklySetsByMuscle).map(([muscle, completed]) => {
            const target = 10;
            const percentage = Math.min((completed / target) * 100, 100);
            const isGoalAchieved = completed >= target;
            const formattedCompleted = Number(completed.toFixed(1));
            
            // Neon colors depending on muscle
            let color = '0, 242, 254'; // cyan default
            if (muscle === 'Pecho') color = '0, 242, 254'; // cyan
            if (muscle === 'Espalda') color = '147, 51, 234'; // purple
            if (muscle === 'Hombros') color = '236, 72, 153'; // pink
            if (muscle === 'Bíceps') color = '16, 185, 129'; // emerald green
            if (muscle === 'Tríceps') color = '132, 204, 22'; // lime green
            if (muscle === 'Cuádriceps') color = '245, 158, 11'; // orange
            if (muscle === 'Femorales') color = '217, 119, 6'; // amber
            if (muscle === 'Glúteos') color = '239, 68, 68'; // red
            if (muscle === 'Pantorrillas') color = '20, 184, 166'; // teal
            if (muscle === 'Core') color = '59, 130, 246'; // blue

            const translatedMuscle = language === 'es' ? muscle : (
              muscle === 'Pecho' ? 'Chest' :
              muscle === 'Espalda' ? 'Back' :
              muscle === 'Hombros' ? 'Shoulders' :
              muscle === 'Bíceps' ? 'Biceps' :
              muscle === 'Tríceps' ? 'Triceps' :
              muscle === 'Cuádriceps' ? 'Quadriceps' :
              muscle === 'Femorales' ? 'Hamstrings' :
              muscle === 'Glúteos' ? 'Glutes' :
              muscle === 'Pantorrillas' ? 'Calves' :
              muscle === 'Core' ? 'Core' : muscle
            );

            return (
              <div key={muscle} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: `rgb(${color})`, boxShadow: `0 0 8px rgb(${color})` }} />
                    {translatedMuscle}
                  </span>
                  <span style={{ color: isGoalAchieved ? 'hsl(var(--success))' : 'hsl(var(--muted))', fontWeight: 600 }}>
                    {isGoalAchieved ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🎉 {t.weeklySetsGoalAchieved || '¡Meta Semanal Lograda!'} ({formattedCompleted})
                      </span>
                    ) : (
                      t.weeklySetsCompletedOfTarget 
                        ? t.weeklySetsCompletedOfTarget.replace('{completed}', formattedCompleted.toString()).replace('{target}', target.toString()) 
                        : `${formattedCompleted} de ${target} series`
                    )}
                  </span>
                </div>
                
                <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${percentage}%`, 
                      background: `linear-gradient(90deg, rgba(${color}, 0.6) 0%, rgb(${color}) 100%)`, 
                      borderRadius: '4px',
                      boxShadow: `0 0 10px rgba(${color}, 0.5)`,
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProjectionsChart = () => {
    const hasData = uniqueExerciseNames.length > 0 && projectionsExercise && projectedData.length > 0;
    
    // Prepare chart data format
    const chartData = hasData ? projectedData.map(pt => ({
      name: language === 'es' ? `Sesión ${pt.step}` : `Session ${pt.step}`,
      weight: pt.weightKg,
      volume: pt.volume,
      reps: pt.reps,
      sets: pt.sets,
      focus: pt.focusKey
    })) : [];

    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="hsl(var(--primary))" />
            {t.widgetProjections || 'Proyección de Fuerza y Cargas (Strength Road Map)'}
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
            {t.projectionsSubtitle || 'Simula y visualiza el comportamiento de tus siguientes 4 sesiones.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto', minWidth: '150px' }}>
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
              {t.projectionsSelectExercise || 'Seleccionar ejercicio:'}
            </span>
            <select
              value={projectionsExercise}
              onChange={(e) => setProjectionsExercise(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.825rem',
                width: '100%',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {uniqueExerciseNames.length === 0 ? (
                <option value="">{language === 'es' ? 'Sin ejercicios registrados' : 'No logged exercises'}</option>
              ) : (
                uniqueExerciseNames.map(ex => (
                  <option key={ex} value={ex}>
                    {resolveExerciseDisplayName(ex)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto', minWidth: '180px' }}>
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
              {t.projectionsSimulateSystem || 'Simular Sistema:'}
            </span>
            <select
              value={projectionsSystem}
              onChange={(e) => setProjectionsSystem(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.825rem',
                width: '100%',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="double_progression">{t.doubleProgression || 'Progresión Doble (Hipertrofia)'}</option>
              <option value="linear_periodization">{t.linearPeriodization || 'Periodización Lineal (Fuerza / 1RM)'}</option>
              <option value="dup">{language === 'es' ? 'Periodización Ondulante - DUP' : 'Daily Undulating Periodization - DUP'}</option>
            </select>
          </div>
        </div>

        <div style={{ height: '240px', width: '100%', background: 'rgba(0,0,0,0.15)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '16px 12px 4px 12px', marginTop: '4px' }}>
          {!hasData ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'hsl(var(--muted))', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
              {t.pbNoHistory || 'Sin historial de levantamientos para este ejercicio.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted))" 
                  fontSize={10}
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--primary))" 
                  fontSize={10}
                  tickLine={false} 
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${val}kg`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--secondary))" 
                  fontSize={10}
                  tickLine={false} 
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${val}kg`}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--bg-surface))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontFamily: 'inherit',
                    fontSize: '0.78rem'
                  }}
                  formatter={(value, name) => {
                    if (name === 'weight') {
                      return [`${value} kg`, t.projectionsSuggestedWeight || 'Peso Proyectado'];
                    }
                    if (name === 'volume') {
                      return [`${value} kg`, t.projectionsProjectedVolume || 'Volumen Proyectado'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label, items) => {
                    const stepData = items[0]?.payload;
                    const focusTranslated = stepData ? (
                      stepData.focus === 'focusHypertrophy' ? t.focusHypertrophy :
                      stepData.focus === 'focusStrength' ? t.focusStrength :
                      stepData.focus === 'focusPeaking' ? t.focusPeaking :
                      stepData.focus === 'focusDeload' ? t.focusDeload :
                      stepData.focus === 'focusPower' ? t.focusPower : stepData.focus
                    ) : '';
                    const repsSuffix = projectionsExercise && isTimeBasedExercise(projectionsExercise) ? 's' : '';
                    const setsReps = stepData ? `${stepData.sets}x${stepData.reps}${repsSuffix}` : '';
                    return `${label} (${focusTranslated}) - ${setsReps}`;
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  dot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="volume" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  activeDot={{ r: 5, stroke: 'hsl(var(--secondary))', strokeWidth: 1 }}
                  dot={{ r: 3, stroke: 'hsl(var(--secondary))', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {hasData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginTop: '4px' }}>
            {projectedData.map((proj) => {
              const focusTranslated = 
                proj.focusKey === 'focusHypertrophy' ? t.focusHypertrophy :
                proj.focusKey === 'focusStrength' ? t.focusStrength :
                proj.focusKey === 'focusPeaking' ? t.focusPeaking :
                proj.focusKey === 'focusDeload' ? t.focusDeload :
                proj.focusKey === 'focusPower' ? t.focusPower : proj.focusKey;
              
              let focusColor = 'rgba(0, 242, 254, 0.15)';
              let textColor = 'hsl(var(--primary))';
              if (proj.focusKey === 'focusStrength') { focusColor = 'rgba(59, 130, 246, 0.15)'; textColor = '#60a5fa'; }
              else if (proj.focusKey === 'focusPeaking') { focusColor = 'rgba(147, 51, 234, 0.15)'; textColor = '#c084fc'; }
              else if (proj.focusKey === 'focusDeload') { focusColor = 'rgba(239, 68, 68, 0.15)'; textColor = '#f87171'; }

              return (
                <div 
                  key={proj.step} 
                  style={{ 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid hsla(var(--border) / 0.4)', 
                    borderRadius: '6px', 
                    padding: '8px', 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
                    {language === 'es' ? `Sesión ${proj.step}` : `Session ${proj.step}`}
                  </span>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>
                    {proj.weightKg} kg
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                    {proj.sets}x{proj.reps} {projectionsExercise && isTimeBasedExercise(projectionsExercise) ? 's' : 'reps'}
                  </span>
                  <span 
                    style={{ 
                      fontSize: '0.6rem', 
                      padding: '3px 4px', 
                      borderRadius: '4px', 
                      background: focusColor, 
                      color: textColor, 
                      fontWeight: 700,
                      marginTop: 'auto',
                      textTransform: 'uppercase',
                      display: 'block',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      wordBreak: 'break-word'
                    }}
                  >
                    {focusTranslated}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'stats':
        return renderStatsGrid();
      case 'coach':
        return renderCoachAnalysis();
      case 'strength':
        return renderStrengthChart();
      case 'weight':
        return renderWeightChart();
      case 'cardio':
        return renderCardioChart();
      case 'splits_prs':
        return renderSplitsAndPRs();
      case 'progress_photo':
        return renderProgressPhotoWidget();
      case 'weekly_sets':
        return renderWeeklySets();
      case 'projections':
        return renderProjectionsChart();
      default:
        return null;
    }
  };

  const renderWidgetWrapper = (id: WidgetId, index: number, totalActive: number) => {
    const isFirst = index === 0;
    const isLast = index === totalActive - 1;

    return (
      <div 
        key={id} 
        style={{ 
          position: 'relative',
          border: isEditingLayout ? '1px dashed hsl(var(--primary))' : 'none',
          borderRadius: isEditingLayout ? '16px' : '0px',
          padding: isEditingLayout ? '8px' : '0px',
          background: isEditingLayout ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
          transition: 'all 0.3s ease'
        }}
      >
        {isEditingLayout && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '12px', 
              right: '12px', 
              display: 'flex', 
              gap: '6px', 
              zIndex: 50,
              background: 'rgba(10, 10, 20, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '4px'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', padding: '0 4px', fontWeight: 'bold' }}>
              {language === 'es' ? 'Posición' : 'Position'}
            </span>
             <button 
              onClick={() => handleMoveWidget(index, 'up')}
              disabled={isFirst}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: 'none', 
                color: isFirst ? 'rgba(255,255,255,0.15)' : 'hsl(var(--primary))', 
                cursor: isFirst ? 'not-allowed' : 'pointer',
                borderRadius: '6px',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title={language === 'es' ? 'Mover Arriba' : 'Move Up'}
            >
              <ChevronUp size={14} />
            </button>
            <button 
              onClick={() => handleMoveWidget(index, 'down')}
              disabled={isLast}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: 'none', 
                color: isLast ? 'rgba(255,255,255,0.15)' : 'hsl(var(--primary))', 
                cursor: isLast ? 'not-allowed' : 'pointer',
                borderRadius: '6px',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title={language === 'es' ? 'Mover Abajo' : 'Move Down'}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}
        <div style={{ opacity: isEditingLayout ? 0.75 : 1, transition: 'opacity 0.3s ease' }}>
          {renderWidget(id)}
        </div>
      </div>
    );
  };

  // Helper to categorize exercise to muscle group
  const getMuscleGroup = (title: string): string => {
    const name = title.toLowerCase();
    if (name.includes('bench press') || name.includes('push up') || name.includes('fly') || name.includes('dip')) return 'Pecho';
    if (name.includes('row') || name.includes('chin up') || name.includes('pull up') || name.includes('shrug') || name.includes('dead hang') || name.includes('pulldown')) return 'Espalda';
    if (name.includes('squat') || name.includes('deadlift') || name.includes('calf') || name.includes('lunge') || (name.includes('press') && !name.includes('bench') && !name.includes('overhead'))) return 'Piernas';
    if (name.includes('overhead') || name.includes('shoulder') || name.includes('lateral raise') || name.includes('rear delt') || name.includes('face pull')) return 'Hombros';
    if (name.includes('curl') || name.includes('tricep') || name.includes('skullcrusher') || name.includes('wrist') || name.includes('extension')) return 'Brazos';
    if (name.includes('sit up') || name.includes('ab wheel') || name.includes('plank') || name.includes('crunch') || name.includes('tap') || name.includes('bridge') || name.includes('dog') || name.includes('twist')) return 'Core';
    return '';
  };

  const weaknessAnalysis = useMemo(() => {
    const now = new Date();
    const muscleGroups = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'];
    
    // 1. Calculate Last Trained Date & Days Since
    const lastTrained: { [key: string]: Date | null } = {};
    muscleGroups.forEach(g => { lastTrained[g] = null; });

    sessions.forEach(session => {
      const sDate = new Date(session.parsedDate);
      session.exercises.forEach(ex => {
        const group = getMuscleGroup(ex.title);
        if (group && lastTrained[group] === null) {
          lastTrained[group] = sDate;
        }
      });
    });

    const daysSince: { [key: string]: number } = {};
    muscleGroups.forEach(g => {
      const d = lastTrained[g];
      if (d) {
        const diff = Math.max(0, now.getTime() - d.getTime());
        daysSince[g] = Math.floor(diff / (1000 * 60 * 60 * 24));
      } else {
        daysSince[g] = 14; // Default to 2 weeks if never trained
      }
    });

    // 2. Calculate 4-week Volume and Shares
    const volumeLast4Weeks: { [key: string]: number } = {};
    muscleGroups.forEach(g => { volumeLast4Weeks[g] = 0; });
    let totalVolume4Weeks = 0;

    sessions.forEach(session => {
      const sDate = new Date(session.parsedDate);
      const diffDays = (now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 28) {
        session.exercises.forEach(ex => {
          const group = getMuscleGroup(ex.title);
          if (group && ex.totalVolume) {
            volumeLast4Weeks[group] += ex.totalVolume;
            totalVolume4Weeks += ex.totalVolume;
          }
        });
      }
    });

    const volumeShares: { [key: string]: number } = {};
    muscleGroups.forEach(g => {
      volumeShares[g] = totalVolume4Weeks > 0 ? (volumeLast4Weeks[g] / totalVolume4Weeks) * 100 : 16.6;
    });

    // 3. Detect 1RM Regression for main lifts
    const regression: { [key: string]: boolean } = {};
    muscleGroups.forEach(g => { regression[g] = false; });

    const mainLifts: { [key: string]: string[] } = {
      Pecho: ['Bench Press (Barbell)', 'Bench Press (Dumbbell)'],
      Espalda: ['Bent Over Row (Barbell)', 'Pull Up'],
      Piernas: ['Squat (Barbell)', 'Deadlift (Barbell)'],
      Hombros: ['Overhead Press (Barbell)', 'Shoulder Press (Dumbbell)']
    };

    Object.entries(mainLifts).forEach(([group, lifts]) => {
      const records: { lift: string; date: Date; max1RM: number }[] = [];
      sessions.forEach(s => {
        s.exercises.forEach(ex => {
          if (lifts.includes(ex.title) && ex.maxEst1RM) {
            records.push({ lift: ex.title, date: new Date(s.parsedDate), max1RM: ex.maxEst1RM });
          }
        });
      });
      records.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      if (records.length >= 2) {
        const liftNames = Array.from(new Set(records.map(r => r.lift)));
        for (const name of liftNames) {
          const filtered = records.filter(r => r.lift === name);
          if (filtered.length >= 2) {
            const newest = filtered[0].max1RM;
            const previous = filtered[1].max1RM;
            if (newest < previous * 0.97) {
              regression[group] = true;
              break;
            }
          }
        }
      }
    });

    // 4. Map Injuries to Groups
    const injuredGroups: string[] = [];
    if (activeInjury) {
      const joint = activeInjury.joint;
      if (joint === 'shoulder' || joint === 'Hombro') {
        injuredGroups.push('Hombros', 'Pecho');
      } else if (joint === 'knee' || joint === 'Rodilla') {
        injuredGroups.push('Piernas');
      } else if (joint === 'back' || joint === 'Lumbar') {
        injuredGroups.push('Core', 'Piernas');
      } else if (joint === 'hip' || joint === 'Cadera') {
        injuredGroups.push('Piernas');
      } else if (joint === 'ankle' || joint === 'Tobillo') {
        injuredGroups.push('Piernas');
      } else if (joint === 'elbow' || joint === 'Codo') {
        injuredGroups.push('Brazos', 'Espalda');
      }
    }

    // 5. Score and Generate Plans
    const analysis = muscleGroups.map(group => {
      let score = 0;
      const reasons: string[] = [];
      let status: 'optimo' | 'bajo' | 'desentrenado' | 'lesion' = 'optimo';

      const isInjured = injuredGroups.includes(group);
      const days = daysSince[group];
      const volShare = volumeShares[group];
      const hasRegression = regression[group];

      if (isInjured) {
        score += 50;
        reasons.push(`Articulación asociada (${activeInjury?.joint}) en fase de rehab PLNEXC.`);
        status = 'lesion';
      }

      if (days >= 6) {
        const detrainScore = Math.min(30, (days - 5) * 5);
        score += detrainScore;
        reasons.push(`Último estímulo hace ${days} días.`);
        if (status !== 'lesion') status = 'desentrenado';
      }

      if (volShare < 12 && totalVolume4Weeks > 0) {
        score += 20;
        reasons.push(`Solo representa el ${volShare.toFixed(1)}% del volumen de 4 semanas.`);
        if (status !== 'lesion' && status !== 'desentrenado') status = 'bajo';
      }

      if (hasRegression) {
        score += 15;
        reasons.push('Se detectó regresión de fuerza (1RM).');
      }

      score = Math.min(100, score);
      if (score === 0) {
        score = 15;
      }

      return {
        group,
        score,
        daysSince: days,
        volShare,
        isInjured,
        hasRegression,
        reasons,
        status
      };
    });

    analysis.sort((a, b) => b.score - a.score);
    return analysis;
  }, [sessions, activeInjury]);
  


  // 3. Lifetime Stats calculations
  const stats = useMemo(() => {
    let totalSets = 0;
    const bests: { [exercise: string]: number } = {};
    const muscleVolume: { [muscle: string]: number } = {
      Pecho: 0,
      Espalda: 0,
      Piernas: 0,
      Hombros: 0,
      Brazos: 0,
      Core: 0
    };

    sessions.forEach(s => {
      s.exercises.forEach(e => {
        totalSets += e.sets.length;
        if (e.maxEst1RM) {
          bests[e.title] = Math.max(bests[e.title] || 0, e.maxEst1RM);
        }
        
        // Muscle categorization logic
        const name = e.title.toLowerCase();
        let cat = '';
        if (name.includes('bench press') || name.includes('push up') || name.includes('fly')) {
          cat = 'Pecho';
        } else if (name.includes('row') || name.includes('chin up') || name.includes('pull up') || name.includes('shrug') || name.includes('dead hang')) {
          cat = 'Espalda';
        } else if (name.includes('squat') || name.includes('deadlift') || name.includes('calf') || name.includes('leg raise')) {
          cat = 'Piernas';
        } else if (name.includes('overhead press') || name.includes('shoulder') || name.includes('lateral raise') || name.includes('rear delt')) {
          cat = 'Hombros';
        } else if (name.includes('curl') || name.includes('tricep') || name.includes('skullcrusher') || name.includes('wrist')) {
          cat = 'Brazos';
        } else if (name.includes('sit up') || name.includes('ab wheel') || name.includes('plank') || name.includes('crunch') || name.includes('tap')) {
          cat = 'Core';
        }
        
        if (cat && e.totalVolume) {
          muscleVolume[cat] += e.totalVolume;
        }
      });
    });

    return {
      totalWorkouts: sessions.length,
      totalSets,
      bests,
      muscleVolume
    };
  }, [sessions]);

  // Format volume numbers to look premium
  const formatVolume = (vol: number) => {
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k kg`;
    return `${vol} kg`;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {sessions.length === 0 ? (
        <>
          {/* Onboarding Welcome Panel */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '40px 32px', 
              position: 'relative', 
              overflow: 'hidden', 
              border: '1px solid hsla(var(--primary) / 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '20px',
              background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.6) 0%, rgba(10, 10, 20, 0.8) 100%)'
            }}
          >
            {/* Subtle glowing ambient background light */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'hsl(var(--primary))',
              filter: 'blur(100px)',
              opacity: 0.15,
              pointerEvents: 'none'
            }} />

            <div style={{ 
              background: 'hsla(var(--primary) / 0.1)', 
              padding: '16px', 
              borderRadius: '50%', 
              border: '1px solid hsla(var(--primary) / 0.3)',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 0 20px hsla(var(--primary) / 0.2)'
            }}>
              <Dumbbell size={36} color="hsl(var(--primary))" />
            </div>

            <div style={{ maxWidth: '600px' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.025em', color: '#ffffff', marginBottom: '8px' }}>
                {t.welcomeTitle || '¡Bienvenido a PLNEXC!'}
              </h1>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {t.welcomeDesc}
              </p>
            </div>

            <div style={{ 
              width: '100%', 
              maxWidth: '500px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid hsl(var(--border))', 
              borderRadius: '16px', 
              padding: '20px 24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <style>{`
                .onboarding-card {
                  display: flex;
                  gap: 12px;
                  align-items: flex-start;
                  padding: 12px;
                  border-radius: 12px;
                  background: rgba(255, 255, 255, 0.01);
                  border: 1px solid rgba(255, 255, 255, 0.03);
                  cursor: pointer;
                  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .onboarding-card:hover {
                  background: rgba(255, 255, 255, 0.05) !important;
                  border-color: hsla(var(--primary) / 0.3) !important;
                  transform: translateY(-2px);
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                .onboarding-card:active {
                  transform: translateY(0);
                }
                .glassmorphic-modal-backdrop {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: rgba(4, 4, 6, 0.75);
                  backdrop-filter: blur(16px);
                  -webkit-backdrop-filter: blur(16px);
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  z-index: 9999;
                  padding: 20px;
                  animation: modalFadeIn 0.25s ease-out;
                }
                .glassmorphic-modal-container {
                  background: linear-gradient(135deg, rgba(20, 20, 35, 0.75) 0%, rgba(10, 10, 20, 0.9) 100%);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  border-radius: 24px;
                  padding: 32px;
                  max-width: 460px;
                  width: 100%;
                  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                  position: relative;
                  animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                  display: flex;
                  flex-direction: column;
                  gap: 20px;
                }
                @keyframes modalFadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes modalScaleUp {
                  from { transform: scale(0.95); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}</style>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--secondary))', marginBottom: '4px' }}>
                {t.onboardingTitle}
              </h4>
              
              <div className="onboarding-card" onClick={() => setActiveModal('1rm')}>
                <TrendingUp size={20} color="hsl(var(--primary))" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>{t.onboardingItem1Title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', lineHeight: '1.4' }}>{t.onboardingItem1Desc}</span>
                </div>
              </div>

              <div className="onboarding-card" onClick={() => setActiveModal('injury')}>
                <ShieldAlert size={20} color="hsl(var(--secondary))" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>{t.onboardingItem2Title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', lineHeight: '1.4' }}>{t.onboardingItem2Desc}</span>
                </div>
              </div>

              <div className="onboarding-card" onClick={() => setActiveModal('overload')}>
                <Zap size={20} color="hsl(var(--warning))" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>{t.onboardingItem3Title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', lineHeight: '1.4' }}>{t.onboardingItem3Desc}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '10px' }}>
                {language === 'es' ? '¿Listo para dar el primer paso?' : 'Ready to take the first step?'}
              </span>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => onTabChange('workout')}
                  style={{ 
                    background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                    color: '#000000',
                    padding: '10px 24px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px hsla(var(--primary) / 0.3)',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 6px 20px hsla(var(--primary) / 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 15px hsla(var(--primary) / 0.3)';
                  }}
                >
                  <Dumbbell size={16} /> {t.onboardingCta}
                </button>
              </div>
            </div>
          </div>

          {/* Peso Corporal Section */}
          {(() => {
            const weightChartData = weightHistory.map(record => {
              const dateObj = new Date(record.date);
              const formattedDate = dateObj.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
                day: 'numeric', 
                month: 'short' 
              });
              return {
                date: formattedDate,
                'Peso (kg)': record.weight
              };
            });

            return (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scale size={22} color="hsl(var(--primary))" />
                    {t.bodyWeightEvolTitle}
                  </h2>
                  <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
                    {t.bodyWeightEvolSubtitle}
                  </p>
                </div>

                <div style={{ width: '100%', height: '240px', marginTop: '10px' }}>
                  {weightChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted))" 
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted))" 
                          fontSize={11} 
                          domain={['auto', 'auto']}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--bg-surface))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontFamily: 'inherit'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Peso (kg)" 
                          stroke="hsl(var(--secondary))" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorWeight)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'hsl(var(--muted))' }}>
                      {t.bodyWeightNoHistory}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          {renderCardioChart()}
        </>
      ) : (
        <>
          {/* Dashboard Header with Edit Layout Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt="Perfil" 
                  style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '50%', 
                    objectFit: 'cover',
                    border: '2px solid hsl(var(--primary))',
                    boxShadow: '0 0 10px hsla(var(--primary) / 0.3)'
                  }} 
                />
              ) : (
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'hsl(var(--muted))'
                }}>
                  <User size={22} />
                </div>
              )}
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>¡{greeting}, {userName}!</h1>
                <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{subtitle}</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                if (isEditingLayout) {
                  // Save to localStorage
                  localStorage.setItem('plnexc_dashboard_layout', JSON.stringify(layoutOrder));
                }
                setIsEditingLayout(!isEditingLayout);
              }}
              style={{
                background: isEditingLayout ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                color: isEditingLayout ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                border: isEditingLayout ? '1px solid hsl(var(--primary))' : 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              className="hover-opacity"
            >
              {isEditingLayout ? '💾 Guardar' : '⚙️ Organizar'}
            </button>
          </div>

          {/* Reorganizable list of widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {activeLayoutOrder.map((widgetId, index) => renderWidgetWrapper(widgetId, index, activeLayoutOrder.length))}
          </div>
        </>
      )}

      {/* PB Progression Line Chart Modal */}
      {selectedExerciseForChart && createPortal(
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
            maxWidth: '600px',
            width: '100%',
            padding: '28px',
            border: '1px solid hsla(var(--primary) / 0.25)',
            boxShadow: '0 0 30px hsla(var(--primary) / 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-primary" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Historial de Récords
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  {selectedExerciseForChart}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExerciseForChart(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--muted))',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                className="hover-card-highlight"
                title="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Line Chart */}
            <div style={{ height: '230px', width: '100%', background: 'rgba(0,0,0,0.15)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '16px 12px 4px 12px' }}>
              {(() => {
                const profile = pbProfiles[selectedExerciseForChart];
                if (!profile || profile.history1RM.length === 0) {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                      {t.pbNoHistory || 'Sin historial de levantamientos para este ejercicio.'}
                    </div>
                  );
                }

                // Prepare chart data format
                const chartData = profile.history1RM.map(pt => {
                  const date = new Date(pt.date);
                  return {
                    name: date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
                    '1RM (kg)': pt.value,
                    'Peso Levantado (kg)': pt.weight,
                    reps: pt.reps
                  };
                });

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted))" 
                        fontSize={10}
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted))" 
                        fontSize={10}
                        tickLine={false} 
                        axisLine={false}
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `${val}kg`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--bg-surface))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontFamily: 'inherit',
                          fontSize: '0.8rem'
                        }}
                        formatter={(value, name) => {
                          if (name === '1RM (kg)') {
                            return [`${value} kg`, t.pbTab1RM || '1RM Estimado'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `${language === 'es' ? 'Fecha' : 'Date'}: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="1RM (kg)" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        activeDot={{ r: 6, stroke: 'hsl(var(--secondary))', strokeWidth: 2 }}
                        dot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>

            {/* PB stats cards */}
            {(() => {
              const profile = pbProfiles[selectedExerciseForChart];
              if (!profile) return null;
              
              const formatDateStr = (dateStr: string) => {
                if (!dateStr) return '---';
                return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
              };

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))', fontWeight: 700, textTransform: 'uppercase' }}>1RM Histórico Máximo</div>
                    <strong style={{ fontSize: '1.2rem', color: 'hsl(var(--primary))', display: 'block', marginTop: '4px' }}>
                      {Math.round(profile.maxEst1RM.value)} kg
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', display: 'block', marginTop: '2px' }}>
                      Logrado el {formatDateStr(profile.maxEst1RM.date)} <br />
                      con {profile.maxEst1RM.weight} kg x {profile.maxEst1RM.reps} {selectedExerciseForChart && isTimeBasedExercise(selectedExerciseForChart) ? 's' : 'reps'}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))', fontWeight: 700, textTransform: 'uppercase' }}>Peso Máximo Levantado</div>
                    <strong style={{ fontSize: '1.2rem', color: 'hsl(var(--secondary))', display: 'block', marginTop: '4px' }}>
                      {profile.maxWeight.weight} kg
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', display: 'block', marginTop: '2px' }}>
                      Logrado el {formatDateStr(profile.maxWeight.date)} <br />
                      con {profile.maxWeight.reps} {selectedExerciseForChart && isTimeBasedExercise(selectedExerciseForChart) ? 's' : 'reps'}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))', fontWeight: 700, textTransform: 'uppercase' }}>Mayor Volumen en una Sesión</div>
                        <strong style={{ fontSize: '1.1rem', color: 'hsl(var(--success))', display: 'block', marginTop: '4px' }}>
                          {profile.maxVolume.value.toLocaleString()} kg
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', textAlign: 'right' }}>
                        Logrado el <br /> {formatDateStr(profile.maxVolume.date)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setSelectedExerciseForChart(null)}
              className="btn btn-secondary"
              style={{ padding: '10px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox Modal */}
      {activeLightboxPhoto && createPortal(
        <div className="lightbox-backdrop" onClick={() => setActiveLightboxPhoto(null)}>
          <div 
            className="lightbox-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '90%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
          >
            <button 
              onClick={() => setActiveLightboxPhoto(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(7,8,12,0.6)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                zIndex: 10
              }}
            >
              <X size={16} />
            </button>

            <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <img 
                src={activeLightboxPhoto.photoUrl} 
                alt="Progreso" 
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} 
              />
            </div>
            <div style={{ width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'hsl(var(--bg-card))', borderLeft: '1px solid hsl(var(--border))' }} className="lightbox-info-panel">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{t.profilePhotosDetailTitle || 'Detalles del Progreso'}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                  <Calendar size={14} />
                  <span>
                    {new Date(activeLightboxPhoto.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {activeLightboxPhoto.weight && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                    <Scale size={14} />
                    <span>{t.profilePhotosDetailWeightLabel || 'Peso registrado:'} <strong>{activeLightboxPhoto.weight} kg</strong></span>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid hsl(var(--border))', margin: '8px 0' }} />

              <div>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.profilePhotosNotesLabel || 'Nota / Comentario'}</span>
                <p style={{ fontSize: '0.9rem', color: '#fff', marginTop: '6px', lineHeight: '1.4', whiteSpace: 'pre-wrap', fontStyle: activeLightboxPhoto.note ? 'normal' : 'italic', margin: 0 }}>
                  {activeLightboxPhoto.note || (t.profilePhotosNotesEmpty || 'Sin anotaciones para este registro.')}
                </p>
              </div>

              {onDeleteProgressPhoto && (
                <button 
                  onClick={() => {
                    if (window.confirm(t.photoDeleteConfirm || '¿Estás seguro de que deseas eliminar esta foto de progreso permanentemente?')) {
                      onDeleteProgressPhoto(activeLightboxPhoto.id);
                      setActiveLightboxPhoto(null);
                    }
                  }}
                  className="btn btn-danger"
                  style={{ marginTop: 'auto', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} /> Eliminar Foto
                </button>
              )}
            </div>
          </div>
          <style>{`
            @media (min-width: 768px) {
              .lightbox-info-panel {
                width: 320px !important;
              }
            }
          `}</style>
        </div>,
        document.body
      )}

      {activeModal && createPortal(
        <div className="glassmorphic-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="glassmorphic-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button 
              onClick={() => setActiveModal(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                transition: 'background 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <X size={16} />
            </button>

            {/* Modal Content */}
            {activeModal === '1rm' && (
              <>
                <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'hsla(var(--primary) / 0.15)', padding: '14px', borderRadius: '16px', border: '1px solid hsla(var(--primary) / 0.25)' }}>
                  <TrendingUp size={28} color="hsl(var(--primary))" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 850, color: '#ffffff', margin: 0 }}>
                    {t.onboardingItem1Title}
                  </h3>
                  <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>
                    {language === 'es' 
                      ? 'Nuestra calculadora avanzada utiliza la fórmula de Epley para estimar tu 1RM (Repetición Máxima) teórica basándose en tus series de esfuerzo máximo. A medida que registras entrenamientos, el sistema traza una curva de progreso que te permite ver tu evolución de fuerza sin necesidad de realizar levantamientos de riesgo máximo.' 
                      : 'Our advanced calculator uses the Epley formula to estimate your theoretical 1RM (One Rep Max) based on your maximum effort sets. As you log workouts, the system tracks a progress curve that lets you see your strength evolution without the need to perform high-risk maximum lifts.'}
                  </p>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: '14px', padding: '16px', fontSize: '0.825rem', color: 'hsl(var(--muted))', marginTop: '6px' }}>
                    <strong style={{ color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                      {language === 'es' ? 'Fórmula Utilizada:' : 'Formula Used:'}
                    </strong>
                    <code style={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}>1RM = Peso × (1 + Reps / 30)</code>
                    <p style={{ marginTop: '8px', fontSize: '0.775rem', margin: 0, lineHeight: '1.4' }}>
                      {language === 'es' 
                        ? 'Es más precisa para series de entre 1 y 10 repeticiones. A mayor esfuerzo (RPE alto), mejor será la estimación.'
                        : 'It is most accurate for sets between 1 and 10 repetitions. Higher effort (high RPE) yields better estimation.'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeModal === 'injury' && (
              <>
                <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'hsla(var(--warning) / 0.15)', padding: '14px', borderRadius: '16px', border: '1px solid hsla(var(--warning) / 0.25)' }}>
                  <HeartPulse size={28} color="hsl(var(--warning))" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 855, color: '#ffffff', margin: 0 }}>
                    {t.onboardingItem2Title}
                  </h3>
                  <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>
                    {language === 'es' 
                      ? 'PLNEXC cuenta con un motor inteligente de rehabilitación. Si experimentas dolor o tienes una lesión activa en alguna articulación (como rodillas, hombros o muñecas), puedes registrarla en la pestaña Rehab. El sistema adaptará automáticamente tus entrenamientos de fuerza, limitando la carga y sugiriendo ejercicios alternativos seguros según la fase de tu dolor.' 
                      : 'PLNEXC features a smart rehabilitation engine. If you experience pain or have an active injury in any joint (such as knees, shoulders, or wrists), you can log it in the Rehab tab. The system will automatically adapt your strength workouts, limiting loads and suggesting safe alternative exercises based on your pain phase.'}
                  </p>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: '14px', padding: '16px', fontSize: '0.825rem', color: 'hsl(var(--muted))', marginTop: '6px' }}>
                    <strong style={{ color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                      {language === 'es' ? 'Monitoreo de Carga:' : 'Load Monitoring:'}
                    </strong>
                    {language === 'es' 
                      ? 'Evitamos el desentrenamiento mediante protocolos de carga adaptativa y control de volumen por grupo muscular.'
                      : 'We prevent detraining through adaptive loading protocols and volume management per muscle group.'}
                  </div>
                </div>
              </>
            )}

            {activeModal === 'overload' && (
              <>
                <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'hsla(var(--primary) / 0.15)', padding: '14px', borderRadius: '16px', border: '1px solid hsla(var(--primary) / 0.25)' }}>
                  <Activity size={28} color="hsl(var(--primary))" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 855, color: '#ffffff', margin: 0 }}>
                    {t.onboardingItem3Title}
                  </h3>
                  <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>
                    {language === 'es' 
                      ? 'Para asegurar que progresas continuamente de forma balanceada, analizamos los grupos musculares que han recibido menos volumen o frecuencia de entrenamiento en los últimos días. El Plan de Acción te sugerirá exactamente qué músculos priorizar y cómo reestructurar tus series semanales.' 
                      : 'To ensure you continuously progress in a balanced way, we analyze muscle groups that have received less volume or training frequency over the last few days. The Action Plan will suggest exactly which muscles to prioritize and how to restructure your weekly sets.'}
                  </p>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: '14px', padding: '16px', fontSize: '0.825rem', color: 'hsl(var(--muted))', marginTop: '6px' }}>
                    <strong style={{ color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                      {language === 'es' ? 'Prescripción del Coach:' : 'Coach Prescription:'}
                    </strong>
                    {language === 'es' 
                      ? 'Calcula la fatiga sistémica y sugiere incrementos de intensidad precisos en base a tu sistema de periodización activo.'
                      : 'Calculates systemic fatigue and suggests precise intensity increments based on your active periodization system.'}
                  </div>
                </div>
              </>
            )}
            
            <button 
              onClick={() => setActiveModal(null)}
              style={{
                background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                color: '#000000',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '10px',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {language === 'es' ? 'Entendido' : 'Got it'}
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
