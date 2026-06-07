import { useState, useMemo, useEffect } from 'react';
import { MILO_REHAB_PROTOCOLS } from '../utils/MiloRehabEngine';
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
import { calculatePBProfiles } from '../utils/ProgressionEngine';
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
  User
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
}

export default function DashboardTab({ 
  localHistory, 
  activeInjury,
  weightHistory,
  cardioHistory = [],
  profilePicture = '',
  progressPhotos = []
}: DashboardTabProps) {
  const sessions = localHistory as WorkoutSession[];

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
        const formattedDate = date.toLocaleDateString('es-ES', { 
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
  type WidgetId = 'stats' | 'coach' | 'strength' | 'weight' | 'cardio' | 'splits_prs' | 'progress_photo';

  const [isEditingLayout, setIsEditingLayout] = useState<boolean>(false);
  const [layoutOrder, setLayoutOrder] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem('plnexc_dashboard_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const required: WidgetId[] = ['stats', 'coach', 'strength', 'weight', 'cardio', 'splits_prs', 'progress_photo'];
        const isValid = parsed.every((id: any) => required.includes(id)) && parsed.length === required.length;
        if (isValid) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return ['stats', 'coach', 'strength', 'weight', 'cardio', 'splits_prs', 'progress_photo'];
  });

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
  }, [uniqueExerciseNames]);

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
      
      const dateLabel = d.toLocaleDateString('es-ES', { 
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
              Evolución y Gasto de Cardio
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
              Visualiza tus minutos de cardio e intensidad, o el gasto calórico diario
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
                Minutos (Barras)
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
                Calorías (Área)
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
                7 Días
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
                30 Días
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
                  <Bar dataKey="LISS" name="LISS (Bajo)" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="MISS" name="MISS (Medio)" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="HIIT" name="HIIT (Alto)" stackId="a" fill="hsl(var(--danger))" radius={[4, 4, 0, 0]} />
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
              No hay registros de cardio para los últimos {cardioTimeRange} días.<br />
              Usa el cronómetro en la pestaña de Cardio para registrar tu primera sesión.
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
              <span className="stat-label">Sesiones de Fuerza</span>
              <span className="stat-value" style={{ display: 'block', marginTop: '8px' }}>{stats.totalWorkouts}</span>
            </div>
            <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '8px', borderRadius: '12px' }}>
              <Calendar size={20} color="hsl(var(--primary))" />
            </div>
          </div>
          <span className="stat-desc" style={{ zIndex: 1, marginTop: '12px' }}>Entrenamientos registrados de por vida</span>
          <Calendar size={90} className="stat-icon-bg" />
        </div>

        <div className="glass-panel premium-stat-card" style={{ color: 'hsl(var(--secondary))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <span className="stat-label">Series Completadas</span>
              <span className="stat-value" style={{ display: 'block', marginTop: '8px' }}>{stats.totalSets}</span>
            </div>
            <div style={{ background: 'hsla(var(--secondary) / 0.1)', padding: '8px', borderRadius: '12px' }}>
              <Dumbbell size={20} color="hsl(var(--secondary))" />
            </div>
          </div>
          <span className="stat-desc" style={{ zIndex: 1, marginTop: '12px' }}>Sets de trabajo y calentamientos</span>
          <Dumbbell size={90} className="stat-icon-bg" />
        </div>

        <div className="glass-panel premium-stat-card" style={{ color: 'hsl(var(--success))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <span className="stat-label">Fuerza Promedio (1RM PR)</span>
              <span className="stat-value" style={{ display: 'block', marginTop: '8px' }}>
                {stats.bests['Bench Press (Barbell)'] 
                  ? `${Math.round(stats.bests['Bench Press (Barbell)'])} kg` 
                  : 'Lista para medir'}
              </span>
            </div>
            <div style={{ background: 'hsla(var(--success) / 0.1)', padding: '8px', borderRadius: '12px' }}>
              <Award size={20} color="hsl(var(--success))" />
            </div>
          </div>
          <span className="stat-desc" style={{ zIndex: 1, marginTop: '12px' }}>Récord máximo en Press de Banca</span>
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
            Análisis de Puntos Débiles y Plan de Acción
          </h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
            Diagnóstico inteligente en base a volumen, frecuencia, tiempo y estado de lesiones (PLNEXC)
          </p>
        </div>

        <div className="grid-cols-2" style={{ alignItems: 'start', gap: '24px' }}>
          {/* Gráfico de Prioridades y Puntos Débiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--primary))' }}>
              Índice de Prioridad y Debilidad
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {weaknessAnalysis.map(item => {
                let badgeColor = 'badge-success';
                let badgeText = 'Óptimo';
                let barColor = 'hsl(var(--success))';
                
                if (item.status === 'lesion') {
                  badgeColor = 'badge-danger';
                  badgeText = `⚠️ Rehab PLNEXC (Fase ${activeInjury?.phase})`;
                  barColor = 'hsl(var(--danger))';
                } else if (item.status === 'desentrenado') {
                  badgeColor = 'badge-warning';
                  badgeText = `💤 Desentrenado (${item.daysSince}d)`;
                  barColor = 'hsl(var(--warning))';
                } else if (item.status === 'bajo') {
                  badgeColor = 'badge-primary';
                  badgeText = `📉 Bajo Volumen (${item.volShare.toFixed(1)}%)`;
                  barColor = 'hsl(var(--primary))';
                }

                return (
                  <div key={item.group} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{item.group}</strong>
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
              Plan de Acción para el Siguiente Entrenamiento
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {weaknessAnalysis.filter(item => item.score > 25 || item.status !== 'optimo').length === 0 ? (
                <div style={{ background: 'hsla(var(--success) / 0.05)', border: '1px solid hsla(var(--success) / 0.2)', padding: '16px', borderRadius: '12px', color: 'hsl(var(--success))', fontSize: '0.875rem', textAlign: 'center' }}>
                  🎉 ¡Excelente! Todos tus grupos musculares están balanceados y en estado óptimo. Sigue entrenando de forma regular.
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

                    if (item.status === 'lesion') {
                      cardBg = 'hsla(var(--danger) / 0.04)';
                      cardBorder = 'hsla(var(--danger) / 0.3)';
                      titleIcon = '⚠️';
                      titleColor = 'hsl(var(--danger))';
                      const jointName = activeInjury ? (MILO_REHAB_PROTOCOLS[activeInjury.joint]?.displayName || activeInjury.joint) : '';
                      advice = `Tu articulación (${jointName}) está en fase ${activeInjury?.phase} de recuperación PLNEXC. Evita levantar pesos máximos en ejercicios de ${item.group}. Prioriza la movilidad y la fuerza isométrica.`;
                    } else if (item.status === 'desentrenado') {
                      cardBg = 'hsla(var(--warning) / 0.04)';
                      cardBorder = 'hsla(var(--warning) / 0.3)';
                      titleIcon = '💤';
                      titleColor = 'hsl(var(--warning))';
                      advice = `Llevas ${item.daysSince} días sin entrenar ${item.group}. En tu próxima sesión de fuerza, prioriza ejercicios para este grupo para evitar pérdida de adaptaciones neuromusculares.`;
                    } else if (item.status === 'bajo') {
                      cardBg = 'hsla(var(--primary) / 0.04)';
                      cardBorder = 'hsla(var(--primary) / 0.3)';
                      titleIcon = '📉';
                      titleColor = 'hsl(var(--primary))';
                      advice = `El volumen semanal de ${item.group} es bajo (solo representa el ${item.volShare.toFixed(1)}% de tu volumen de trabajo total). Añade 1 ejercicio o 2 series de trabajo extra en tu siguiente rutina.`;
                    } else if (item.hasRegression) {
                      cardBg = 'hsla(var(--secondary) / 0.04)';
                      cardBorder = 'hsla(var(--secondary) / 0.3)';
                      titleIcon = '📊';
                      titleColor = 'hsl(var(--secondary))';
                      advice = `Se detectó una regresión del 1RM estimado en los levantamientos principales de ${item.group}. Asegura al menos 2 minutos de descanso entre series pesadas y controla la fatiga mental.`;
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
                          <span>Prioridad: {item.group}</span>
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
              Curva de Fuerza Inteligente
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
              Progreso del Récord Teórico 1RM (Fórmula Epley)
            </p>
          </div>
          
          <div style={{ width: '100%', maxWidth: '300px' }}>
            <select 
              value={selectedExercise} 
              onChange={(e) => setSelectedExercise(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              {exercisesWithHistory.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
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
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#color1RM)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'hsl(var(--muted))' }}>
              Cargando datos históricos...
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeightChart = () => {
    const weightChartData = weightHistory.map(record => {
      const dateObj = new Date(record.date);
      const formattedDate = dateObj.toLocaleDateString('es-ES', { 
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
            Evolución del Peso Corporal
          </h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
            Historial de pesajes registrados en tu perfil a lo largo del tiempo
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
              Registra tu peso en la pestaña de Perfil para ver la gráfica de progreso.
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
            Distribución de Carga Semanal
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginBottom: '16px' }}>
            Volumen acumulado por grupo muscular (kg totales en tu historial)
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
                      <span>{muscle}</span>
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
              Récords Personales (PBs)
            </h3>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
              Tus mejores marcas registradas. Haz clic en un ejercicio para ver su progreso.
            </p>
          </div>

          {/* Sub-tabs pills */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid hsl(var(--border))', flexWrap: 'wrap' }}>
            {(['1rm', 'weight', 'volume', 'reps'] as const).map((tab) => {
              const label = tab === '1rm' ? '1RM Est.' : tab === 'weight' ? 'Peso Máx' : tab === 'volume' ? 'Vol. Máx' : 'Perfil Reps';
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
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>No hay registros aún.</div>
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
                        cursor: 'pointer'
                      }}
                      className="hover-card-highlight"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exercise}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                          Logrado: {profile.maxEst1RM.weight}kg x {profile.maxEst1RM.reps} reps
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
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>No hay registros aún.</div>
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
                        cursor: 'pointer'
                      }}
                      className="hover-card-highlight"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exercise}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                          Realizado con {profile.maxWeight.reps} reps
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
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>No hay registros aún.</div>
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
                        cursor: 'pointer'
                      }}
                      className="hover-card-highlight"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exercise}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                          Máximo acumulado por sesión
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
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted))', fontSize: '0.8rem', padding: '20px' }}>No hay ejercicios registrados.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', fontWeight: 700 }}>Selecciona Ejercicio:</label>
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
                        <option key={ex} value={ex}>{ex}</option>
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
                              title={record ? `Logrado el ${new Date(record.date).toLocaleDateString('es-ES')}` : 'Sin datos'}
                            >
                              <span style={{ fontSize: '0.6rem', color: 'hsl(var(--muted))', fontWeight: 700 }}>{r} Reps</span>
                              <strong style={{ fontSize: '0.75rem', color: record ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}>
                                {record ? `${record.weight}kg` : '---'}
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
  };

  const renderProgressPhotoWidget = () => {
    const latestPhoto = progressPhotos && progressPhotos.length > 0 ? progressPhotos[0] : null;

    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={22} color="hsl(var(--primary))" />
            Última Foto de Progreso
          </h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
            Tu evolución física visual en base al historial de fotos de tu perfil
          </p>
        </div>

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
              <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 4px 0', color: '#ffffff' }}>No hay fotos de progreso</p>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', margin: 0, maxWidth: '280px', marginInline: 'auto' }}>
                Sube fotos de tu progreso corporal en la pestaña de Perfil para realizar un seguimiento visual.
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
            <div style={{ 
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
              margin: '0 auto'
            }}>
              <img 
                src={latestPhoto.photoUrl} 
                alt="Progreso más reciente" 
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
                  <span style={{ color: 'hsl(var(--muted))' }}>Fecha:</span>
                  <strong style={{ color: '#ffffff' }}>
                    {new Date(latestPhoto.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>
                </div>

                {latestPhoto.weight && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <Scale size={16} color="hsl(var(--muted))" />
                    <span style={{ color: 'hsl(var(--muted))' }}>Peso registrado:</span>
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
                💡 Puedes subir y gestionar tu historial completo de fotos desde la pestaña <strong>Perfil</strong>.
              </div>
            </div>
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
              Posición
            </span>
            <button 
              onClick={() => handleMoveWidget(index, 'up')}
              disabled={isFirst}
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: 'none', 
                color: isFirst ? 'rgba(255,255,255,0.1)' : '#ffffff', 
                cursor: isFirst ? 'not-allowed' : 'pointer',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.8rem'
              }}
              title="Mover Arriba"
            >
              🔼
            </button>
            <button 
              onClick={() => handleMoveWidget(index, 'down')}
              disabled={isLast}
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: 'none', 
                color: isLast ? 'rgba(255,255,255,0.1)' : '#ffffff', 
                cursor: isLast ? 'not-allowed' : 'pointer',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.8rem'
              }}
              title="Mover Abajo"
            >
              🔽
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
                ¡Bienvenido a PLN<span style={{ color: 'hsl(var(--primary))' }}>EXC</span>!
              </h1>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Tu camino hacia una fuerza óptima y libre de lesiones comienza aquí. Registra tu primer entrenamiento para activar los análisis biométricos e identificar tus puntos débiles.
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
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--secondary))', marginBottom: '4px' }}>
                ¿Qué se activará al registrar tu primera sesión?
              </h4>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>📊</span>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>Curva de Fuerza 1RM Inteligente</strong>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', lineHeight: '1.4' }}>Calculamos y proyectamos tu máximo teórico estimado por ejercicio a lo largo del tiempo.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>🩹</span>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>Análisis de Desbalance y Lesiones</strong>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', lineHeight: '1.4' }}>Monitoreamos la distribución de carga y adaptamos tus rutinas ante molestias activas en articulaciones.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>⚡</span>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>Plan de Acción de Sobrecarga</strong>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', lineHeight: '1.4' }}>Recomendaciones de volumen y frecuencia para dar prioridad a tus grupos musculares desentrenados.</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '10px' }}>
                ¿Listo para dar el primer paso?
              </span>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <div 
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
                    gap: '8px'
                  }}
                >
                  <Dumbbell size={16} /> Ve a la pestaña "Entrenar" para comenzar
                </div>
              </div>
            </div>
          </div>

          {/* Peso Corporal Section */}
          {(() => {
            const weightChartData = weightHistory.map(record => {
              const dateObj = new Date(record.date);
              const formattedDate = dateObj.toLocaleDateString('es-ES', { 
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
                    Evolución del Peso Corporal
                  </h2>
                  <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
                    Historial de pesajes registrados en tu perfil a lo largo del tiempo
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
                      Registra tu peso en la pestaña de Perfil para ver la gráfica de progreso.
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
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>Tu Progreso de Fuerza y Cardio</h1>
                <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', margin: '2px 0 0 0' }}>Organiza y analiza tu rendimiento a lo largo del tiempo</p>
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
      {selectedExerciseForChart && (
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
                      Sin historial de levantamientos para este ejercicio.
                    </div>
                  );
                }

                // Prepare chart data format
                const chartData = profile.history1RM.map(pt => {
                  const date = new Date(pt.date);
                  return {
                    name: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
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
                            return [`${value} kg`, '1RM Estimado'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Fecha: ${label}`}
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
                return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
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
                      con {profile.maxEst1RM.weight} kg x {profile.maxEst1RM.reps} reps
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted))', fontWeight: 700, textTransform: 'uppercase' }}>Peso Máximo Levantado</div>
                    <strong style={{ fontSize: '1.2rem', color: 'hsl(var(--secondary))', display: 'block', marginTop: '4px' }}>
                      {profile.maxWeight.weight} kg
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', display: 'block', marginTop: '2px' }}>
                      Logrado el {formatDateStr(profile.maxWeight.date)} <br />
                      con {profile.maxWeight.reps} reps
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
        </div>
      )}

    </div>
  );
}
