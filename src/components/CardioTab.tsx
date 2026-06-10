import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Activity, 
  TrendingDown, 
  Scale, 
  Info, 
  Trash2,
  Plus,
  Target,
  Heart
} from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';

interface CardioSession {
  date: string; // ISO string
  minutes: number;
  type: 'LISS' | 'MISS' | 'HIIT';
  calories: number;
}

interface CardioTabProps {
  cardioGoalType: 'daily' | 'weekly';
  setCardioGoalType: (type: 'daily' | 'weekly') => void;
  cardioTargetMinutes: number;
  setCardioTargetMinutes: (mins: number) => void;
  cardioHistory: CardioSession[];
  onAddCardioSession: (session: CardioSession) => void;
  onDeleteCardioSession: (dateStr: string) => void;
  bodyWeight: number;
  bodyFat: number;
  language: 'es' | 'en';
}

export default function CardioTab({
  cardioGoalType,
  setCardioGoalType,
  cardioTargetMinutes,
  setCardioTargetMinutes,
  cardioHistory,
  onAddCardioSession,
  onDeleteCardioSession,
  bodyWeight,
  bodyFat,
  language
}: CardioTabProps) {
  const t = TRANSLATIONS[language];
  // Timer States
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<'LISS' | 'MISS' | 'HIIT'>('LISS');
  const timerRef = useRef<any>(null);

  // Manual entry states
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualMinutes, setManualMinutes] = useState<string>('');
  const [manualType, setManualType] = useState<'LISS' | 'MISS' | 'HIIT'>('LISS');

  // Smart Adjuster States
  const [targetFat, setTargetFat] = useState<string>(Math.max(5, Math.floor(bodyFat - 5)).toString());
  const [weeksToGoal, setWeeksToGoal] = useState<string>('8');
  const [selectedAdjusterType, setSelectedAdjusterType] = useState<'LISS' | 'MISS' | 'HIIT'>('LISS');

  // Heart Rate Zone Calculator States
  const [age, setAge] = useState<string>('25');
  const [rhr, setRhr] = useState<string>('65'); // Rest Heart Rate

  // MET values for cardio intensity
  const MET_VALUES = {
    LISS: 3.5, // e.g., brisk walking, light cycling
    MISS: 7.0, // e.g., steady jogging, moderate rowing
    HIIT: 11.0 // e.g., high-intensity sprint intervals, heavy rowing intervals
  };

  // 1. Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleStartPause = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleReset = () => {
    setIsTimerRunning(false);
    setSecondsElapsed(0);
  };

  // Kcal calculation helper
  const calculateKcal = (mins: number, type: 'LISS' | 'MISS' | 'HIIT') => {
    const met = MET_VALUES[type];
    // Formula: kcal = MET * 3.5 * (weight / 200) * minutes
    return Math.round(met * 3.5 * (bodyWeight / 200) * mins);
  };

  const currentTimerKcal = useMemo(() => {
    const mins = secondsElapsed / 60;
    return calculateKcal(mins, selectedType);
  }, [secondsElapsed, selectedType, bodyWeight]);

  const handleSaveTimerSession = () => {
    const minutesCompleted = Math.round((secondsElapsed / 60) * 10) / 10;
    if (minutesCompleted < 0.5) {
      alert(t.cardioTimerMinDuration || 'La sesión debe durar al menos 30 segundos para ser registrada.');
      return;
    }

    const kcal = calculateKcal(minutesCompleted, selectedType);
    const newSession: CardioSession = {
      date: new Date().toISOString(),
      minutes: minutesCompleted,
      type: selectedType,
      calories: kcal
    };

    onAddCardioSession(newSession);
    setIsTimerRunning(false);
    setSecondsElapsed(0);
  };

  const handleAddManualSession = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseFloat(manualMinutes);
    if (isNaN(mins) || mins <= 0) {
      alert(t.cardioManualMinAlert || 'Ingresa una cantidad de minutos válida.');
      return;
    }

    const kcal = calculateKcal(mins, manualType);
    const newSession: CardioSession = {
      date: new Date().toISOString(),
      minutes: mins,
      type: manualType,
      calories: kcal
    };

    onAddCardioSession(newSession);
    setManualMinutes('');
    setShowManualEntry(false);
  };

  // Format MM:SS or HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // 2. Weekly calculations
  const weeklyStats = useMemo(() => {
    const now = new Date();
    // Get start of this week (Monday)
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    let minutesThisWeek = 0;
    let caloriesThisWeek = 0;
    let sessionsThisWeek = 0;

    cardioHistory.forEach(s => {
      const sDate = new Date(s.date);
      if (sDate >= startOfWeek) {
        minutesThisWeek += s.minutes;
        caloriesThisWeek += s.calories;
        sessionsThisWeek += 1;
      }
    });

    // Daily stats (today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let minutesToday = 0;
    let caloriesToday = 0;
    cardioHistory.forEach(s => {
      const sDate = new Date(s.date);
      if (sDate >= startOfToday) {
        minutesToday += s.minutes;
        caloriesToday += s.calories;
      }
    });

    const activeGoalMinutes = cardioGoalType === 'daily' ? cardioTargetMinutes : cardioTargetMinutes;
    const currentProgressValue = cardioGoalType === 'daily' ? minutesToday : minutesThisWeek;
    const remainingMinutes = Math.max(0, activeGoalMinutes - currentProgressValue);
    const progressPercent = Math.min(100, Math.round((currentProgressValue / activeGoalMinutes) * 100));

    // Weekly progress towards weekly goal (for the state bar required)
    const weeklyGoalMins = cardioGoalType === 'daily' ? cardioTargetMinutes * 7 : cardioTargetMinutes;
    const weeklyProgressPercent = Math.min(100, Math.round((minutesThisWeek / weeklyGoalMins) * 100));

    return {
      minutesThisWeek,
      caloriesThisWeek,
      sessionsThisWeek,
      minutesToday,
      caloriesToday,
      remainingMinutes,
      progressPercent,
      weeklyGoalMins,
      weeklyProgressPercent
    };
  }, [cardioHistory, cardioGoalType, cardioTargetMinutes]);

  // 3. Smart Adjuster Calculations
  const smartAdjusterResults = useMemo(() => {
    const tgtFat = parseFloat(targetFat);
    const wks = parseFloat(weeksToGoal);

    if (isNaN(tgtFat) || isNaN(wks) || wks <= 0 || tgtFat <= 0 || tgtFat >= bodyFat) {
      return null;
    }

    // Fat calculations
    const currentFatMass = bodyWeight * (bodyFat / 100);
    const currentLeanMass = bodyWeight - currentFatMass;
    
    // Weight target keeping lean mass constant: Target Weight = Lean Mass / (1 - Target Fat%)
    const targetWeight = currentLeanMass / (1 - tgtFat / 100);
    const fatToLoseKg = Math.max(0, bodyWeight - targetWeight);
    
    // Caloric deficit needed (1 kg fat ~ 7700 kcal)
    const totalKcalDeficit = fatToLoseKg * 7700;
    const dailyKcalDeficit = totalKcalDeficit / (wks * 7);

    // Dosis: 60% nutrition deficit, 40% cardio deficit
    const dailyCardioKcalTarget = dailyKcalDeficit * 0.4;

    // Minutes needed for chosen type (LISS, MISS, HIIT)
    const met = MET_VALUES[selectedAdjusterType];
    // kcal/min = met * 3.5 * (weight/200)
    const kcalPerMin = met * 3.5 * (bodyWeight / 200);
    const dailyMinutesNeeded = Math.round(dailyCardioKcalTarget / kcalPerMin);
    const weeklyMinutesNeeded = dailyMinutesNeeded * 7;

    return {
      fatToLoseKg: parseFloat(fatToLoseKg.toFixed(2)),
      targetWeight: parseFloat(targetWeight.toFixed(1)),
      dailyKcalDeficit: Math.round(dailyKcalDeficit),
      dailyCardioKcalTarget: Math.round(dailyCardioKcalTarget),
      dailyMinutesNeeded,
      weeklyMinutesNeeded
    };
  }, [bodyWeight, bodyFat, targetFat, weeksToGoal, selectedAdjusterType]);

  const handleApplyCalculatedGoal = () => {
    if (!smartAdjusterResults) return;
    
    if (cardioGoalType === 'daily') {
      setCardioTargetMinutes(smartAdjusterResults.dailyMinutesNeeded);
    } else {
      setCardioTargetMinutes(smartAdjusterResults.weeklyMinutesNeeded);
    }
    const valStr = cardioGoalType === 'daily' 
      ? `${smartAdjusterResults.dailyMinutesNeeded} ${language === 'es' ? 'min diarios' : 'daily min'}` 
      : `${smartAdjusterResults.weeklyMinutesNeeded} ${language === 'es' ? 'min semanales' : 'weekly min'}`;
    const alertMsg = (t.cardioFatLossApplyGoalSuccess || 'Meta de minutos de cardio ajustada a: {goal}').replace('{goal}', valStr);
    alert(alertMsg);
  };

  // 4. Heart Rate Zones (Karvonen)
  const hrZones = useMemo(() => {
    const ageNum = parseInt(age, 10);
    const rhrNum = parseInt(rhr, 10);

    if (isNaN(ageNum) || isNaN(rhrNum) || ageNum <= 0 || rhrNum <= 0) {
      return null;
    }

    // HRmax = 220 - Age
    const hrMax = 220 - ageNum;
    const hrReserve = hrMax - rhrNum;

    // Karvonen formula: Target HR = ((HRmax - RHR) * %Intensity) + RHR
    const calcHr = (pct: number) => Math.round((hrReserve * pct) + rhrNum);

    return {
      hrMax,
      zone2: { min: calcHr(0.60), max: calcHr(0.70) },
      zone3: { min: calcHr(0.70), max: calcHr(0.80) },
      zone4: { min: calcHr(0.80), max: calcHr(0.90) }
    };
  }, [age, rhr]);

  // Clean date representation
  const formatSessionDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid-cols-2" style={{ gap: '24px', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Cronómetro & Progreso Semanal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* PROGRESS CARD */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={22} color="hsl(var(--primary))" />
                {t.cardioTitle || 'Progreso de Cardio'}
              </h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
                {(t.cardioGoalLabel || 'Meta actual: {mins} min {type}').replace('{mins}', cardioTargetMinutes.toString()).replace('{type}', cardioGoalType === 'daily' ? (t.cardioGoalDaily || 'Diarios') : (t.cardioGoalWeekly || 'Semanales'))}
              </p>
            </div>
            
            {/* Goal Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '2px' }}>
              <button 
                onClick={() => setCardioGoalType('daily')}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  borderRadius: '6px',
                  background: cardioGoalType === 'daily' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                  border: 'none',
                  color: cardioGoalType === 'daily' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  cursor: 'pointer',
                  fontWeight: cardioGoalType === 'daily' ? 'bold' : 'normal'
                }}
              >
                {t.cardioGoalDaily || 'Diario'}
              </button>
              <button 
                onClick={() => setCardioGoalType('weekly')}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  borderRadius: '6px',
                  background: cardioGoalType === 'weekly' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                  border: 'none',
                  color: cardioGoalType === 'weekly' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  cursor: 'pointer',
                  fontWeight: cardioGoalType === 'weekly' ? 'bold' : 'normal'
                }}
              >
                {t.cardioGoalWeekly || 'Semanal'}
              </button>
            </div>
          </div>

          {/* Quick Target Modifier Form */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>{t.cardioAdjustGoal || 'Ajustar meta:'}</span>
            <input 
              type="number"
              value={cardioTargetMinutes}
              onChange={(e) => setCardioTargetMinutes(Math.max(1, parseInt(e.target.value) || 0))}
              style={{ width: '70px', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px', textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>{t.cardioMinutes || 'minutos'}</span>
          </div>

          {/* PROGRESS METRICS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid hsl(var(--border))', borderRadius: '12px', padding: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.cardioToday || 'Hoy'}</span>
              <strong style={{ fontSize: '1.15rem', color: '#ffffff', display: 'block', marginTop: '2px' }}>
                {Math.round(weeklyStats.minutesToday)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'hsl(var(--muted))' }}>min</span>
              </strong>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid hsl(var(--border))', borderRight: '1px solid hsl(var(--border))' }}>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.cardioThisWeek || 'Esta Semana'}</span>
              <strong style={{ fontSize: '1.15rem', color: '#ffffff', display: 'block', marginTop: '2px' }}>
                {Math.round(weeklyStats.minutesThisWeek)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'hsl(var(--muted))' }}>min</span>
              </strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.cardioRemaining || 'Faltan'}</span>
              <strong style={{ fontSize: '1.15rem', color: 'hsl(var(--secondary))', display: 'block', marginTop: '2px' }}>
                {Math.round(weeklyStats.remainingMinutes)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'hsl(var(--muted))' }}>min</span>
              </strong>
            </div>
          </div>

          {/* GLOWING WEEKLY PROGRESS BAR (Required) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>{(t.cardioGoalProgress || 'Progreso hacia el objetivo semanal ({mins} min)').replace('{mins}', weeklyStats.weeklyGoalMins.toString())}</span>
              <strong style={{ color: 'hsl(var(--primary))' }}>{weeklyStats.weeklyProgressPercent}%</strong>
            </div>
            
            <div style={{ position: 'relative', height: '18px', background: 'rgba(255,255,255,0.01)', borderRadius: '9px', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${weeklyStats.weeklyProgressPercent}%`, 
                  background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                  borderRadius: '8px',
                  boxShadow: '0 0 12px hsla(var(--primary) / 0.5)',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
            </div>
          </div>
        </div>

        {/* ACTIVE TIMER CARD */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden' }}>
          
          {/* Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: '-30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'hsl(var(--primary))',
            filter: 'blur(90px)',
            opacity: isTimerRunning ? 0.15 : 0.03,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none'
          }} />

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={18} color="hsl(var(--secondary))" />
              {t.cardioCronometer || 'Cronómetro de Cardio'}
            </h3>
            
            <button 
              className="btn btn-secondary"
              onClick={() => setShowManualEntry(!showManualEntry)}
              style={{ padding: '4px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> {t.cardioManualLog || 'Log Manual'}
            </button>
          </div>

          {showManualEntry ? (
            /* MANUAL LOG EXPANSION */
            <form onSubmit={handleAddManualSession} className="fade-in" style={{ width: '100%', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '6px' }}>{t.cardioManualTitle || 'Registrar Cardio Manualmente'}</h4>
              
              <div className="grid-cols-2" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.cardioManualDuration || 'Duración (minutos)'}</label>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="e.g. 30"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.cardioManualIntensity || 'Intensidad / Tipo'}</label>
                  <select 
                    value={manualType} 
                    onChange={(e) => setManualType(e.target.value as any)}
                  >
                    <option value="LISS">{t.cardioManualIntensityLISS || 'LISS (Zona 2 / Suave)'}</option>
                    <option value="MISS">{t.cardioManualIntensityMISS || 'MISS (Zona 3 / Moderado)'}</option>
                    <option value="HIIT">{t.cardioManualIntensityHIIT || 'HIIT (Zona 4-5 / Intervalos)'}</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>{t.cardioManualSave || 'Guardar Sesión'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualEntry(false)} style={{ padding: '8px', fontSize: '0.8rem' }}>{t.cancel || 'Cancelar'}</button>
              </div>
            </form>
          ) : (
            /* ACTIVE TIMER DISPLAY */
            <>
              {/* Type Selectors */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.1)', border: '1px solid hsl(var(--border))', borderRadius: '10px', padding: '4px', gap: '4px' }}>
                {['LISS', 'MISS', 'HIIT'].map(type => (
                  <button 
                    key={type}
                    onClick={() => !isTimerRunning && setSelectedType(type as any)}
                    disabled={isTimerRunning}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: isTimerRunning ? 'not-allowed' : 'pointer',
                      background: selectedType === type ? 'hsl(var(--primary))' : 'transparent',
                      color: selectedType === type ? '#000000' : 'hsl(var(--muted))',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Glowing Timer Circle */}
              <div 
                style={{ 
                  width: '180px', 
                  height: '180px', 
                  borderRadius: '50%', 
                  border: `3px solid ${isTimerRunning ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                  boxShadow: isTimerRunning ? '0 0 24px hsla(var(--primary) / 0.2), inset 0 0 24px hsla(var(--primary) / 0.1)' : 'none',
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  background: 'rgba(10, 10, 20, 0.4)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.5s ease',
                  position: 'relative'
                }}
              >
                {/* Heart Pulse Icon when running */}
                {isTimerRunning && (
                  <Heart 
                    size={20} 
                    fill="hsl(var(--danger))" 
                    color="hsl(var(--danger))" 
                    style={{
                      position: 'absolute',
                      top: '25px',
                      animation: 'pulse 1.2s infinite'
                    }}
                  />
                )}
                
                <span style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em', color: '#ffffff' }}>
                  {formatTime(secondsElapsed)}
                </span>
                
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedType}
                </span>

                <span style={{ fontSize: '0.85rem', color: 'hsl(var(--primary))', fontWeight: 'bold', marginTop: '6px' }}>
                  {currentTimerKcal} kcal
                </span>
              </div>

              {/* Timer Controls */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className={`btn ${isTimerRunning ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={handleStartPause}
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: !isTimerRunning ? '0 4px 15px hsla(var(--primary) / 0.3)' : 'none'
                  }}
                >
                  {isTimerRunning ? <Pause size={20} /> : <Play size={20} fill="#000000" />}
                </button>

                {(secondsElapsed > 0) && (
                  <>
                    <button 
                      className="btn btn-secondary"
                      onClick={handleReset}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={t.cardioTimerReset || 'Reiniciar'}
                    >
                      <Square size={16} />
                    </button>

                    <button 
                      className="btn btn-primary"
                      onClick={handleSaveTimerSession}
                      style={{
                        padding: '0 20px',
                        borderRadius: '27px',
                        height: '54px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                        color: '#000000',
                        border: 'none',
                        boxShadow: '0 4px 15px hsla(var(--secondary) / 0.3)'
                      }}
                    >
                      {t.cardioTimerSave || 'Guardar Sesión'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* RECENT CARDIO LOGS */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={18} color="hsl(var(--primary))" />
            {t.cardioRecentHistory || 'Historial de Cardio Reciente'}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {cardioHistory.length === 0 ? (
              <div style={{ color: 'hsl(var(--muted))', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>
                {t.cardioHistoryEmpty || 'No hay sesiones registradas aún. ¡Usa el cronómetro para iniciar!'}
              </div>
            ) : (
              cardioHistory.slice(0, 10).map((s, idx) => {
                let badgeColor = 'badge-primary';
                if (s.type === 'MISS') badgeColor = 'badge-success';
                if (s.type === 'HIIT') badgeColor = 'badge-danger';
                
                return (
                  <div 
                    key={s.date || idx}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${badgeColor}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                          {s.type}
                        </span>
                        <strong style={{ fontSize: '0.85rem' }}>{s.minutes} min</strong>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                        {formatSessionDate(s.date)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', fontWeight: 'bold' }}>
                        {s.calories} kcal
                      </span>
                      <button 
                        onClick={() => onDeleteCardioSession(s.date)}
                        style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted))', cursor: 'pointer', padding: '4px' }}
                        title={t.cardioHistoryDeleteTooltip || 'Eliminar registro'}
                      >
                        <Trash2 size={14} className="hover-danger" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Inteligencia de Déficit & Guías */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* SMART CARDIO AUTO-ADJUSTER (Required) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={22} color="hsl(var(--secondary))" />
              {t.cardioFatLossCoach || 'Déficit e Ajuste de Cardio Inteligente'}
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
              {t.cardioFatLossCoachDesc || 'Calcula y ajusta la dosis de cardio ideal según tu objetivo de grasa corporal'}
            </p>
          </div>

          <div style={{ background: 'hsla(var(--primary) / 0.03)', border: '1px solid hsla(var(--primary) / 0.15)', borderRadius: '12px', padding: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Scale size={18} color="hsl(var(--primary))" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
              {t.cardioFatLossCoachStatus
                ? t.cardioFatLossCoachStatus.replace('{weight}', bodyWeight.toString()).replace('{fat}', bodyFat.toString())
                : `Composición Corporal Actual: Peso: ${bodyWeight} kg | Grasa: ${bodyFat}%`}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid-cols-2" style={{ gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.cardioFatLossGoalFat || 'Grasa Corporal Objetivo (%)'}</label>
              <input 
                type="number"
                value={targetFat}
                onChange={(e) => setTargetFat(e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.cardioFatLossWeeks || 'Plazo Límite (Semanas)'}</label>
              <input 
                type="number"
                value={weeksToGoal}
                onChange={(e) => setWeeksToGoal(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.cardioFatLossMode || 'Modalidad de Cardio para Prescribir'}</label>
            <select 
              value={selectedAdjusterType} 
              onChange={(e) => setSelectedAdjusterType(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="LISS">{t.cardioIntensityLissOption || 'LISS (Suave / Zona 2 - Caminata rápida)'}</option>
              <option value="MISS">{t.cardioIntensityMissOption || 'MISS (Moderado / Zona 3 - Trote/Bici)'}</option>
              <option value="HIIT">{t.cardioIntensityHiitOption || 'HIIT (Fuerte / Zona 4-5 - Sprints/Intervalos)'}</option>
            </select>
          </div>

          {/* RESULTS PANEL */}
          {smartAdjusterResults ? (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'hsl(var(--secondary))', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '6px' }}>
                {t.cardioFatLossPrescriptionTitle || 'Prescripción de Fuerza & Cardio'}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(var(--muted))' }}>{t.cardioFatLossTargetWeight || 'Peso Objetivo Estimado:'}</span>
                  <strong>{smartAdjusterResults.targetWeight} kg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(var(--muted))' }}>{t.cardioFatLossToLose || 'Grasa Total a Perder:'}</span>
                  <strong style={{ color: 'hsl(var(--danger))' }}>{smartAdjusterResults.fatToLoseKg} kg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(var(--muted))' }}>{t.cardioFatLossRequiredDeficit || 'Déficit Diario Requerido:'}</span>
                  <strong>{smartAdjusterResults.dailyKcalDeficit} kcal / {language === 'es' ? 'día' : 'day'}</strong>
                </div>
                
                <hr style={{ border: 'none', borderBottom: '1px solid hsl(var(--border))', opacity: 0.5 }} />

                <div style={{ background: 'hsla(var(--secondary) / 0.04)', border: '1px solid hsla(var(--secondary) / 0.15)', padding: '10px', borderRadius: '8px', lineHeight: '1.4' }}>
                  <span style={{ color: 'hsl(var(--secondary))', fontWeight: 'bold', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {t.cardioFatLossRecomendedTitle || 'Distribución de Déficit Recomendado (40% Cardio)'}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                    {t.cardioFatLossRecomendedText
                      ? t.cardioFatLossRecomendedText
                          .replace('{diet}', Math.round(smartAdjusterResults.dailyKcalDeficit * 0.6).toString())
                          .replace('{cardio}', smartAdjusterResults.dailyCardioKcalTarget.toString())
                      : `Se sugiere un corte nutricional de ${Math.round(smartAdjusterResults.dailyKcalDeficit * 0.6)} kcal de comida y quemar ${smartAdjusterResults.dailyCardioKcalTarget} kcal mediante cardio.`}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>{t.cardioFatLossSuggestedDose || 'Dosis de Cardio Sugerida:'}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span>{t.cardioFatLossSuggestedDaily || 'Meta Diaria:'}</span>
                    <strong style={{ color: 'hsl(var(--primary))' }}>{smartAdjusterResults.dailyMinutesNeeded} {language === 'es' ? 'minutos / día' : 'minutes / day'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.cardioFatLossSuggestedWeekly || 'Meta Semanal:'}</span>
                    <strong style={{ color: 'hsl(var(--primary))' }}>{smartAdjusterResults.weeklyMinutesNeeded} {language === 'es' ? 'minutos / sem' : 'minutes / week'}</strong>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                className="btn btn-primary"
                onClick={handleApplyCalculatedGoal}
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)', color: '#000000', fontWeight: 'bold' }}
              >
                <Target size={16} /> {t.cardioFatLossApplyGoalBtn
                  ? t.cardioFatLossApplyGoalBtn.replace('{type}', cardioGoalType === 'daily' 
                      ? (language === 'es' ? 'Diaria' : 'Daily') 
                      : (language === 'es' ? 'Semanal' : 'Weekly'))
                  : `Aplicar como Meta ${cardioGoalType === 'daily' ? 'Diaria' : 'Semanal'}`}
              </button>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '12px', padding: '16px', color: 'hsl(var(--muted))', fontSize: '0.8rem', textAlign: 'center' }}>
              {t.cardioFatLossInstructionTip
                ? t.cardioFatLossInstructionTip.replace('{fat}', bodyFat.toString())
                : `💡 Ingresa un objetivo de grasa inferior a tu grasa actual (${bodyFat}%) para ver la prescripción personalizada de cardio.`}
            </div>
          )}
        </div>

        {/* EDUCATION & HEART RATE ZONES (Required) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={22} color="hsl(var(--danger))" />
              {t.cardioKarvonenTitle || 'Zonas de Frecuencia Cardíaca (Karvonen)'}
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
              {t.cardioKarvonenDesc || 'Ajusta la intensidad de tus sesiones monitoreando tus rangos de pulso cardíaco'}
            </p>
          </div>

          {/* Age & RHR Inputs */}
          <div className="grid-cols-2" style={{ gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.cardioKarvonenAgeLabel || 'Tu Edad (Años)'}</label>
              <input 
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{t.cardioKarvonenRhrLabel || 'Pulso en Reposo (RHR)'}</label>
              <input 
                type="number"
                value={rhr}
                onChange={(e) => setRhr(e.target.value)}
                placeholder="60"
              />
            </div>
          </div>

          {hrZones ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Zone 2 */}
              <div style={{ display: 'flex', gap: '12px', padding: '10px 12px', border: '1px solid hsla(var(--success) / 0.2)', background: 'hsla(var(--success) / 0.02)', borderRadius: '10px' }}>
                <div style={{ background: 'hsla(var(--success) / 0.1)', color: 'hsl(var(--success))', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>
                  Z2
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{t.cardioKarvonenZone2Title || 'Cardio LISS (Lipólisis)'}</strong>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{hrZones.zone2.min} - {hrZones.zone2.max} {language === 'es' ? 'PPM' : 'BPM'}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginTop: '2px', lineHeight: '1.3' }}>
                    {t.cardioZone2Detail || 'Intensidad suave (60-70%). Excelente para maximizar la oxidación de grasas y mejorar la salud mitocondrial sin interferir en la recuperación de tus entrenamientos de fuerza.'}
                  </span>
                </div>
              </div>

              {/* Zone 3 */}
              <div style={{ display: 'flex', gap: '12px', padding: '10px 12px', border: '1px solid hsla(var(--primary) / 0.2)', background: 'hsla(var(--primary) / 0.02)', borderRadius: '10px' }}>
                <div style={{ background: 'hsla(var(--primary) / 0.1)', color: 'hsl(var(--primary))', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>
                  Z3
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{t.cardioKarvonenZone3Title || 'Cardio MISS (Aeróbico)'}</strong>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{hrZones.zone3.min} - {hrZones.zone3.max} {language === 'es' ? 'PPM' : 'BPM'}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginTop: '2px', lineHeight: '1.3' }}>
                    {t.cardioZone3Detail || 'Intensidad moderada (70-80%). Desarrolla resistencia cardiovascular general y acondicionamiento aeróbico medio.'}
                  </span>
                </div>
              </div>

              {/* Zone 4/5 */}
              <div style={{ display: 'flex', gap: '12px', padding: '10px 12px', border: '1px solid hsla(var(--danger) / 0.2)', background: 'hsla(var(--danger) / 0.02)', borderRadius: '10px' }}>
                <div style={{ background: 'hsla(var(--danger) / 0.1)', color: 'hsl(var(--danger))', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>
                  Z4
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{t.cardioKarvonenZone4Title || 'Cardio HIIT (Anaeróbico)'}</strong>
                    <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>{hrZones.zone4.min} - {hrZones.hrMax} {language === 'es' ? 'PPM' : 'BPM'}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginTop: '2px', lineHeight: '1.3' }}>
                    {t.cardioZone4Detail || 'Alta intensidad (>80%). Trabajo por intervalos cortos de esfuerzo máximo. Excelente para aumentar el metabolismo post-ejercicio (EPOC) en poco tiempo.'}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ color: 'hsl(var(--muted))', fontSize: '0.8rem', textAlign: 'center' }}>
              {t.cardioKarvonenInstructionTip || 'Ingresa una edad y pulso válidos para calcular tus zonas cardíacas personalizadas.'}
            </div>
          )}

          {/* Education guidelines */}
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} color="hsl(var(--primary))" />
              {t.cardioPrescriptionTitle || 'Recomendación de Fuerza'}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', lineHeight: '1.4', margin: 0 }}>
              {t.cardioPrescriptionText || 'Si tu prioridad principal es mantener la masa muscular mientras pierdes grasa corporal, es sumamente recomendable realizar cardio de tipo LISS (Zona 2). Produce un estrés neuromuscular mínimo y te permite rendir al máximo en tus levantamientos de fuerza principales.'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Keyframe pulse animation style */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
