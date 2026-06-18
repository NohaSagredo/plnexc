import { useState, useMemo, useEffect, useRef } from 'react';
import { Scale, User, Trash2, Calendar, Plus, Minus, HelpCircle, Calculator, ChevronDown, ChevronUp, Check, Info, Lock, Camera, Award, X, Image as ImageIcon, Settings, Volume2, Loader2, ShieldAlert } from 'lucide-react';
import { calculatePBProfiles, calculateAchievements, compressAndResizeImage, getAthleteLevel } from '../utils/ProgressionEngine';
import type { ProgressionSystem } from '../utils/ProgressionEngine';
import { TRANSLATIONS } from '../utils/translations';
import AlgorithmsTab from './AlgorithmsTab';
import { updateUserProfile, isUsernameAvailable } from '../utils/firebaseSync';
import { auth } from '../utils/firebase';

interface ProfileTabProps {
  bodyWeight: number;
  setBodyWeight: (weight: number) => void;
  height: number;
  setHeight: (height: number) => void;
  gender: 'Masculino' | 'Femenino';
  setGender: (gender: 'Masculino' | 'Femenino') => void;
  bodyFat: number;
  setBodyFat: (fat: number) => void;
  weightHistory: any[];
  onAddWeightRecord: (weight: number, dateStr?: string) => void;
  onDeleteWeightRecord: (dateStr: string) => void;
  profilePicture: string;
  onSaveProfilePicture: (pic: string) => void;
  progressPhotos: any[];
  onAddProgressPhoto: (photo: { id: string; date: string; weight?: number; photoUrl: string; note?: string }) => void;
  onDeleteProgressPhoto: (id: string) => void;
  localHistory: any[];
  cardioHistory: any[];
  language: 'es' | 'en';
  onToggleLanguage: () => void;
  progressionSystem: ProgressionSystem;
  onSetProgressionSystem: (system: ProgressionSystem) => void;
  username: string;
  setUsername: (username: string) => void;
  displayName: string;
  setDisplayName: (displayName: string) => void;
  bio: string;
  setBio: (bio: string) => void;
  followers: string[];
  following: string[];
}

export default function ProfileTab({
  bodyWeight,
  setBodyWeight,
  height,
  setHeight,
  gender,
  setGender,
  bodyFat,
  setBodyFat,
  weightHistory,
  onAddWeightRecord,
  onDeleteWeightRecord,
  profilePicture,
  onSaveProfilePicture,
  progressPhotos,
  onAddProgressPhoto,
  onDeleteProgressPhoto,
  localHistory,
  cardioHistory,
  language,
  onToggleLanguage,
  progressionSystem,
  onSetProgressionSystem,
  username,
  setUsername,
  displayName,
  setDisplayName,
  bio,
  setBio,
  followers,
  following
}: ProfileTabProps) {
  const t = TRANSLATIONS[language];
  const [newWeightInput, setNewWeightInput] = useState<string>('');
  const [customDateInput, setCustomDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAlgorithms, setShowAlgorithms] = useState<boolean>(false);

  // Social Profile edit states
  const [localUsername, setLocalUsername] = useState(username);
  const [localDisplayName, setLocalDisplayName] = useState(displayName);
  const [localBio, setLocalBio] = useState(bio);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialSuccess, setSocialSuccess] = useState(false);

  useEffect(() => {
    setLocalUsername(username);
  }, [username]);

  useEffect(() => {
    setLocalDisplayName(displayName);
  }, [displayName]);

  useEffect(() => {
    setLocalBio(bio);
  }, [bio]);

  // Debounced validation for username input
  useEffect(() => {
    if (localUsername === username) {
      setUsernameStatus('idle');
      return;
    }
    const cleaned = localUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned !== localUsername) {
      setUsernameStatus('invalid');
      return;
    }
    if (cleaned.length < 3) {
      setUsernameStatus('invalid');
      return;
    }
    
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const ok = await isUsernameAvailable(cleaned, currentUser.uid);
          setUsernameStatus(ok ? 'available' : 'taken');
        } catch {
          setUsernameStatus('taken');
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [localUsername, username]);

  const handleSaveSocial = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    setSavingSocial(true);
    setSocialError(null);
    setSocialSuccess(false);
    
    try {
      const cleaned = localUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleaned.length < 3) {
        throw new Error(language === 'es' ? 'El usuario debe tener al menos 3 caracteres.' : 'Username must be at least 3 characters.');
      }
      
      await updateUserProfile(currentUser.uid, {
        username: cleaned,
        displayName: localDisplayName,
        bio: localBio
      });
      
      setUsername(cleaned);
      setDisplayName(localDisplayName);
      setBio(localBio);
      
      setSocialSuccess(true);
      setTimeout(() => setSocialSuccess(false), 3000);
    } catch (err: any) {
      setSocialError(err.message || 'Error al guardar el perfil social');
    } finally {
      setSavingSocial(false);
    }
  };

  // Rest Timer Settings State
  const [restTimerEnabled, setRestTimerEnabled] = useState<boolean>(() => {
    return localStorage.getItem('plnexc_rest_timer_enabled') !== 'false';
  });
  const [restTimeCompound, setRestTimeCompound] = useState<number>(() => {
    const saved = localStorage.getItem('plnexc_rest_time_compound');
    return saved ? parseInt(saved, 10) : 120;
  });
  const [restTimeAccessory, setRestTimeAccessory] = useState<number>(() => {
    const saved = localStorage.getItem('plnexc_rest_time_accessory');
    return saved ? parseInt(saved, 10) : 90;
  });
  const [restTimerSoundEnabled, setRestTimerSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('plnexc_rest_timer_sound_enabled') !== 'false';
  });

  const handleToggleRestTimer = () => {
    const newVal = !restTimerEnabled;
    setRestTimerEnabled(newVal);
    localStorage.setItem('plnexc_rest_timer_enabled', String(newVal));
  };

  const handleToggleRestSound = () => {
    const newVal = !restTimerSoundEnabled;
    setRestTimerSoundEnabled(newVal);
    localStorage.setItem('plnexc_rest_timer_sound_enabled', String(newVal));
  };

  const adjustCompoundTime = (amount: number) => {
    const newVal = Math.max(30, Math.min(600, restTimeCompound + amount));
    setRestTimeCompound(newVal);
    localStorage.setItem('plnexc_rest_time_compound', String(newVal));
  };

  const adjustAccessoryTime = (amount: number) => {
    const newVal = Math.max(15, Math.min(300, restTimeAccessory + amount));
    setRestTimeAccessory(newVal);
    localStorage.setItem('plnexc_rest_time_accessory', String(newVal));
  };

  // States for body fat calculator
  const [showFatCalc, setShowFatCalc] = useState<boolean>(false);
  const [neckCirc, setNeckCirc] = useState<number>(gender === 'Masculino' ? 38 : 34);
  const [waistCirc, setWaistCirc] = useState<number>(gender === 'Masculino' ? 85 : 75);
  const [hipCirc, setHipCirc] = useState<number>(95);

  // Photo gallery and avatar upload refs/states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);
  
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoNote, setPhotoNote] = useState<string>('');
  const [photoDate, setPhotoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [photoWeight, setPhotoWeight] = useState<string>(bodyWeight.toString());
  const [showAddPhoto, setShowAddPhoto] = useState<boolean>(false);
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<any | null>(null);

  // Sync photo weight when bodyWeight updates
  useEffect(() => {
    setPhotoWeight(bodyWeight.toString());
  }, [bodyWeight]);

  // Handle avatar file selection and compression
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file, 150, 150);
        onSaveProfilePicture(compressed);
      } catch (err) {
        console.error('Error compressing avatar image:', err);
        alert(language === 'es' ? 'Ocurrió un error al procesar la imagen.' : 'An error occurred while processing the image.');
      }
    }
  };

  // Handle gallery file selection and compression
  const handleGalleryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file, 600, 600);
        setPhotoPreview(compressed);
      } catch (err) {
        console.error('Error compressing gallery image:', err);
        alert(language === 'es' ? 'Error al procesar la imagen.' : 'Error processing the image.');
      }
    }
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      alert(language === 'es' ? 'Por favor selecciona una foto.' : 'Please select a photo.');
      return;
    }
    const newPhoto = {
      id: Date.now().toString(),
      date: photoDate,
      weight: photoWeight ? parseFloat(photoWeight) : undefined,
      photoUrl: photoPreview,
      note: photoNote.trim() || undefined
    };
    onAddProgressPhoto(newPhoto);
    
    // Reset form
    setPhotoPreview('');
    setPhotoNote('');
    setPhotoDate(new Date().toISOString().split('T')[0]);
    setShowAddPhoto(false);
  };

  // Calculate achievements dynamically
  const pbProfiles = useMemo(() => calculatePBProfiles(localHistory), [localHistory]);
  const achievements = useMemo(() => calculateAchievements(localHistory, pbProfiles, cardioHistory), [localHistory, pbProfiles, cardioHistory]);
  const unlockedCount = useMemo(() => achievements.filter(a => a.isUnlocked).length, [achievements]);
  const athleteLevel = useMemo(() => getAthleteLevel(pbProfiles, bodyWeight, gender, height, bodyFat), [pbProfiles, bodyWeight, gender, height, bodyFat]);

  // Sync state defaults when gender changes
  useEffect(() => {
    setNeckCirc(gender === 'Masculino' ? 38 : 34);
    setWaistCirc(gender === 'Masculino' ? 85 : 75);
  }, [gender]);

  // Navy Fat Calculation
  const calculatedNavyFat = useMemo(() => {
    if (!height || !waistCirc || !neckCirc) return null;
    if (gender === 'Femenino' && !hipCirc) return null;

    try {
      if (gender === 'Masculino') {
        if (waistCirc <= neckCirc) return null;
        const density = 1.0324 - 0.19077 * Math.log10(waistCirc - neckCirc) + 0.15456 * Math.log10(height);
        const bf = 495 / density - 450;
        return isNaN(bf) || bf < 2 || bf > 60 ? null : parseFloat(bf.toFixed(1));
      } else {
        if ((waistCirc + hipCirc) <= neckCirc) return null;
        const density = 1.29579 - 0.35004 * Math.log10(waistCirc + hipCirc - neckCirc) + 0.22100 * Math.log10(height);
        const bf = 495 / density - 450;
        return isNaN(bf) || bf < 2 || bf > 60 ? null : parseFloat(bf.toFixed(1));
      }
    } catch (e) {
      return null;
    }
  }, [gender, height, waistCirc, neckCirc, hipCirc]);

  // BMI calculations
  const bmi = useMemo(() => {
    if (!height || !bodyWeight) return 0;
    return bodyWeight / Math.pow(height / 100, 2);
  }, [bodyWeight, height]);

  const bmiLabel = useMemo(() => {
    if (bmi < 18.5) return { 
      text: t.profileBmiStatusUnderweight || 'Bajo peso', 
      color: 'hsl(var(--muted))', 
      desc: language === 'es' ? 'Tu IMC está por debajo del rango saludable.' : 'Your BMI is below the healthy range.' 
    };
    if (bmi < 25) return { 
      text: t.profileBmiStatusNormal || 'Normopeso', 
      color: 'hsl(var(--success))', 
      desc: language === 'es' ? '¡Felicidades! Tienes un peso saludable para tu estatura.' : 'Congratulations! You have a healthy weight for your height.' 
    };
    if (bmi < 30) return { 
      text: t.profileBmiStatusOverweight || 'Sobrepeso', 
      color: 'hsl(var(--warning))', 
      desc: language === 'es' ? 'Considera realizar ajustes de nutrición y ejercicio.' : 'Consider making nutrition and exercise adjustments.' 
    };
    return { 
      text: t.profileBmiStatusObese || 'Obesidad', 
      color: 'hsl(var(--danger))', 
      desc: language === 'es' ? 'Consulta con un profesional para mejorar tu composición corporal.' : 'Consult a professional to improve your body composition.' 
    };
  }, [bmi, language, t]);

  // Lean Mass calculations
  const leanMass = useMemo(() => {
    if (!bodyWeight || !bodyFat) return 0;
    return bodyWeight * (1 - bodyFat / 100);
  }, [bodyWeight, bodyFat]);

  const getCalculatedFatCategory = (value: number) => {
    if (gender === 'Masculino') {
      if (value < 6) return language === 'es' ? 'Grasa Esencial' : 'Essential Fat';
      if (value < 14) return language === 'es' ? 'Atleta' : 'Athlete';
      if (value < 18) return language === 'es' ? 'Fitness' : 'Fitness';
      if (value < 25) return language === 'es' ? 'Aceptable' : 'Acceptable';
      return language === 'es' ? 'Obesidad' : 'Obesity';
    } else {
      if (value < 14) return language === 'es' ? 'Grasa Esencial' : 'Essential Fat';
      if (value < 21) return language === 'es' ? 'Atleta' : 'Athlete';
      if (value < 25) return language === 'es' ? 'Fitness' : 'Fitness';
      if (value < 32) return language === 'es' ? 'Aceptable' : 'Acceptable';
      return language === 'es' ? 'Obesidad' : 'Obesity';
    }
  };

  const handleRegisterWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(newWeightInput);
    if (!isNaN(weightVal) && weightVal > 30) {
      onAddWeightRecord(weightVal, customDateInput);
      setBodyWeight(weightVal); // Sync main profile weight
      setNewWeightInput('');
    } else {
      alert(language === 'es' ? 'Por favor ingresa un peso válido superior a 30 kg.' : 'Please enter a valid weight over 30 kg.');
    }
  };

  // Localized achievements list helper
  const localizedAchievements = useMemo(() => {
    return achievements.map(medal => {
      let title = medal.title;
      let description = medal.description;
      let progressText = medal.progressText;

      if (language === 'en') {
        const enData: { [id: string]: { title: string; desc: string } } = {
          first_workout: { title: 'Strength Pioneer', desc: 'Complete your first workout session.' },
          ten_workouts: { title: 'Iron Consistency', desc: 'Complete 10 workout sessions.' },
          bench_press_50: { title: 'Bronze Bench', desc: 'Exceed 50 kg personal record in Bench Press.' },
          bench_press_100: { title: 'Golden Bench', desc: 'Exceed 100 kg personal record in Bench Press.' },
          squat_80: { title: 'Bronze Squat', desc: 'Exceed 80 kg personal record in Squats.' },
          squat_150: { title: 'Golden Squat', desc: 'Exceed 150 kg personal record in Squats.' },
          deadlift_100: { title: 'Bronze Deadlift', desc: 'Exceed 100 kg personal record in Deadlift.' },
          deadlift_200: { title: 'Golden Deadlift', desc: 'Exceed 200 kg personal record in Deadlift.' },
          power_total_300: { title: '300 kg Club', desc: 'Sum over 300 kg combining your Squat, Bench Press, and Deadlift PBs.' },
          power_total_500: { title: '500 kg Club', desc: 'Sum over 500 kg combining your Squat, Bench Press, and Deadlift PBs.' },
          rehab_master: { title: 'Protected Temple', desc: 'Log an exercise with reported pain successfully for active recovery.' },
          cardio_hero: { title: 'Relentless Runner', desc: 'Complete a Cardio session of more than 45 minutes.' }
        };
        if (enData[medal.id]) {
          title = enData[medal.id].title;
          description = enData[medal.id].desc;
        }

        if (progressText) {
          progressText = progressText
            .replace('entrenamientos', 'workouts')
            .replace('reportes', 'reports')
            .replace('reportado', 'reported');
        }
      }
      return {
        ...medal,
        title,
        description,
        progressText
      };
    });
  }, [achievements, language]);

  const fatCategory = useMemo(() => {
    const value = bodyFat;
    if (gender === 'Masculino') {
      if (value < 6) return { 
        text: language === 'es' ? 'Grasa Esencial' : 'Essential Fat', 
        color: 'hsl(var(--primary))', 
        desc: language === 'es' ? 'Rango mínimo necesario para la supervivencia.' : 'Minimum range necessary for survival.' 
      };
      if (value < 14) return { 
        text: language === 'es' ? 'Atleta' : 'Athlete', 
        color: 'hsl(var(--success))', 
        desc: language === 'es' ? 'Nivel óptimo para rendimiento deportivo de velocidad/estética.' : 'Optimal level for speed/aesthetic athletic performance.' 
      };
      if (value < 18) return { 
        text: language === 'es' ? 'Fitness' : 'Fitness', 
        color: 'hsl(var(--success))', 
        desc: language === 'es' ? 'Composición corporal atlética y saludable.' : 'Athletic and healthy body composition.' 
      };
      if (value < 25) return { 
        text: language === 'es' ? 'Aceptable' : 'Acceptable', 
        color: 'hsl(var(--warning))', 
        desc: language === 'es' ? 'Rango promedio saludable para población general.' : 'Average healthy range for general population.' 
      };
      return { 
        text: language === 'es' ? 'Obesidad' : 'Obesity', 
        color: 'hsl(var(--danger))', 
        desc: language === 'es' ? 'Considera un déficit calórico y entrenamiento para reducir grasa.' : 'Consider a calorie deficit and training to reduce fat.' 
      };
    } else {
      if (value < 14) return { 
        text: language === 'es' ? 'Grasa Esencial' : 'Essential Fat', 
        color: 'hsl(var(--primary))', 
        desc: language === 'es' ? 'Rango mínimo necesario para la salud hormonal femenina.' : 'Minimum range necessary for female hormonal health.' 
      };
      if (value < 21) return { 
        text: language === 'es' ? 'Atleta' : 'Athlete', 
        color: 'hsl(var(--success))', 
        desc: language === 'es' ? 'Nivel óptimo para rendimiento deportivo y estética.' : 'Optimal level for athletic performance and aesthetics.' 
      };
      if (value < 25) return { 
        text: language === 'es' ? 'Fitness' : 'Fitness', 
        color: 'hsl(var(--success))', 
        desc: language === 'es' ? 'Composición corporal atlética y saludable.' : 'Athletic and healthy body composition.' 
      };
      if (value < 32) return { 
        text: language === 'es' ? 'Aceptable' : 'Acceptable', 
        color: 'hsl(var(--warning))', 
        desc: language === 'es' ? 'Rango promedio saludable para población general.' : 'Average healthy range for general population.' 
      };
      return { 
        text: language === 'es' ? 'Obesidad' : 'Obesity', 
        color: 'hsl(var(--danger))', 
        desc: language === 'es' ? 'Considera un déficit calórico y entrenamiento para reducir grasa.' : 'Consider a calorie deficit and training to reduce fat.' 
      };
    }
  }, [bodyFat, gender, language]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cabecera del Perfil con Foto y Resumen de Logros */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
        <div className="profile-avatar-container" onClick={() => fileInputRef.current?.click()}>
          {profilePicture ? (
            <img 
              src={profilePicture} 
              alt="Avatar de usuario" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <User size={48} color="hsl(var(--muted))" />
          )}
          <div className="profile-avatar-overlay">
            <Camera size={18} />
            <span>{t.profileAvatarChange || 'Cambiar'}</span>
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleAvatarChange} 
        />

        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, hsl(var(--primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {displayName || (username ? `@${username}` : (language === 'es' ? 'Atleta PLNEXC' : 'PLNEXC Athlete'))}
          </h2>
          {username && (
            <p style={{ color: 'hsl(var(--primary))', fontSize: '1rem', fontWeight: 600, marginTop: '-2px' }}>
              @{username}
            </p>
          )}
          {bio && (
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '4px', fontStyle: 'italic', maxWidth: '500px' }}>
              {bio}
            </p>
          )}
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '6px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              <strong style={{ color: '#fff' }}>{followers?.length || 0}</strong> {language === 'es' ? 'seguidores' : 'followers'}
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'hsl(var(--muted))' }} />
            <span>
              <strong style={{ color: '#fff' }}>{following?.length || 0}</strong> {language === 'es' ? 'seguidos' : 'following'}
            </span>
          </p>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '6px' }}>
            {language === 'es' 
              ? `Miembro desde junio 2026 • Entrenamientos completados: ` 
              : `Member since June 2026 • Workouts completed: `}
            <strong style={{ color: 'hsl(var(--primary))' }}>{localHistory.length}</strong>
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={12} /> {unlockedCount} / 12 {language === 'es' ? 'Logros' : 'Achievements'}
            </span>
            <span className="badge badge-success">
              {gender === 'Masculino' ? (t.profileGenderMale || 'Masculino') : (t.profileGenderFemale || 'Femenino')}
            </span>
            <span className="badge badge-warning">
              {bodyWeight} kg
            </span>
          </div>
        </div>
      </div>

      {/* Sección: Configuración de la Comunidad (Red Social) */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px' }}>
            <Settings size={24} color="hsl(var(--primary))" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{language === 'es' ? 'Perfil de la Comunidad' : 'Community Profile'}</h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
              {language === 'es'
                ? 'Personaliza tu identidad pública y biografía para interactuar en la red social PLNEXC'
                : 'Customize your public identity and biography to interact on the PLNEXC social network'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Nombre de Usuario (@username) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
              {language === 'es' ? 'Nombre de usuario (@username)' : 'Username (@username)'}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', color: 'hsl(var(--muted))', fontWeight: 'bold' }}>@</span>
              <input
                type="text"
                value={localUsername}
                onChange={(e) => setLocalUsername(e.target.value)}
                placeholder="usuario"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 28px',
                  fontSize: '0.9rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
            {/* Mensajes de validación */}
            {usernameStatus === 'checking' && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--warning))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Loader2 size={12} className="spin" /> {language === 'es' ? 'Verificando disponibilidad...' : 'Verifying availability...'}
              </span>
            )}
            {usernameStatus === 'available' && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--success))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} /> {language === 'es' ? '¡Nombre de usuario disponible!' : 'Username available!'}
              </span>
            )}
            {usernameStatus === 'taken' && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--danger))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={12} /> {language === 'es' ? 'Este nombre de usuario ya está en uso.' : 'This username is already taken.'}
              </span>
            )}
            {usernameStatus === 'invalid' && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--danger))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={12} /> {language === 'es' ? 'Mínimo 3 caracteres alfanuméricos o guiones bajos.' : 'Minimum 3 alphanumeric or underscore characters.'}
              </span>
            )}
          </div>

          {/* Nombre Visible */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
              {language === 'es' ? 'Nombre visible' : 'Display Name'}
            </label>
            <input
              type="text"
              value={localDisplayName}
              onChange={(e) => setLocalDisplayName(e.target.value)}
              placeholder={language === 'es' ? 'Tu nombre para mostrar' : 'Your display name'}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          {/* Biografía */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
              {language === 'es' ? 'Biografía (Máx. 150 caracteres)' : 'Bio (Max 150 characters)'}
            </label>
            <textarea
              value={localBio}
              onChange={(e) => setLocalBio(e.target.value.slice(0, 150))}
              placeholder={language === 'es' ? 'Cuéntale a la comunidad sobre tus objetivos, rutinas o marcas...' : 'Tell the community about your goals, routines, or stats...'}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                resize: 'none'
              }}
            />
            <span style={{ alignSelf: 'flex-end', fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
              {localBio.length} / 150
            </span>
          </div>

          {socialError && (
            <div style={{ color: 'hsl(var(--danger))', fontSize: '0.85rem', padding: '10px', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '6px' }}>
              {socialError}
            </div>
          )}

          {socialSuccess && (
            <div style={{ color: 'hsl(var(--success))', fontSize: '0.85rem', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
              {language === 'es' ? '¡Perfil social actualizado con éxito!' : 'Social profile updated successfully!'}
            </div>
          )}

          <button
            onClick={handleSaveSocial}
            disabled={savingSocial || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
            className="btn btn-primary"
            style={{
              padding: '12px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: savingSocial || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking' ? 'not-allowed' : 'pointer'
            }}
          >
            {savingSocial ? (
              <>
                <Loader2 size={16} className="spin" />
                {language === 'es' ? 'Guardando...' : 'Saving...'}
              </>
            ) : (
              <>
                <Check size={16} />
                {language === 'es' ? 'Guardar Perfil de la Comunidad' : 'Save Community Profile'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Antropométrico Header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px' }}>
            <User size={24} color="hsl(var(--primary))" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{language === 'es' ? 'Mi Perfil Antropométrico' : 'My Anthropometric Profile'}</h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
              {language === 'es'
                ? 'Configura tus mediciones para ajustar automáticamente los estándares biomecánicos de fuerza'
                : 'Configure your measurements to automatically adjust strength biomechanical standards'}
            </p>
          </div>
        </div>

        <div className="grid-cols-2" style={{ gap: '24px', alignItems: 'stretch' }}>
          {/* Controles de Configuración del Perfil */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--primary))' }}>
              {language === 'es' ? 'Configurar Atributos Físicos' : 'Configure Physical Attributes'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Género */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{t.profileGender || 'Género Biológico'}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setGender('Masculino')}
                    className={`btn ${gender === 'Masculino' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem', height: '38px' }}
                  >
                    {t.profileGenderMale || 'Masculino'}
                  </button>
                  <button 
                    onClick={() => setGender('Femenino')}
                    className={`btn ${gender === 'Femenino' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem', height: '38px' }}
                  >
                    {t.profileGenderFemale || 'Femenino'}
                  </button>
                </div>
              </div>

              {/* Altura */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{t.profileHeight || 'Altura (cm)'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    onClick={() => setHeight(Math.max(100, height - 1))}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={height} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) setHeight(val);
                    }}
                    style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', height: '38px' }}
                  />
                  <button 
                    onClick={() => setHeight(height + 1)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Peso Actual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{t.profileWeightInput || 'Peso Corporal (kg)'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    onClick={() => {
                      const newW = Math.max(30, bodyWeight - 0.5);
                      setBodyWeight(newW);
                      onAddWeightRecord(newW); // Automatically log in history
                    }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    step="0.1"
                    value={bodyWeight} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setBodyWeight(val);
                        onAddWeightRecord(val); // Automatically log in history
                      }
                    }}
                    style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', height: '38px' }}
                  />
                  <button 
                    onClick={() => {
                      const newW = bodyWeight + 0.5;
                      setBodyWeight(newW);
                      onAddWeightRecord(newW);
                    }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Grasa Corporal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{t.profileBodyFat || '% Grasa Corporal'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    onClick={() => setBodyFat(Math.max(3, bodyFat - 0.5))}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    step="0.5"
                    value={bodyFat} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) setBodyFat(val);
                    }}
                    style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', height: '38px' }}
                  />
                  <button 
                    onClick={() => setBodyFat(bodyFat + 0.5)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFatCalc(!showFatCalc)}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: showFatCalc ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                padding: '8px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all var(--transition-fast)',
                marginTop: '12px',
                width: '100%'
              }}
            >
              <Calculator size={14} />
              {showFatCalc 
                ? (language === 'es' ? 'Ocultar Calculadora' : 'Hide Calculator') 
                : (language === 'es' ? '¿Cómo medirlo? / Calcular % Grasa' : 'How to measure? / Calculate Fat %')}
              {showFatCalc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Resultados de Composición Corporal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--secondary))' }}>
              {language === 'es' ? 'Resultados de Composición' : 'Composition Results'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: 'calc(100% - 38px)' }}>
              {/* BMI Card */}
              <div 
                className="glass-panel"
                style={{ 
                  padding: '14px', 
                  background: 'rgba(255,255,255,0.01)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted))', fontWeight: 600, lineHeight: 1.2 }}>{t.profileBmi || 'Índice de Masa Corporal (IMC)'}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: '#fff' }}>
                  {bmi > 0 ? bmi.toFixed(1) : '--'}
                </span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${bmiLabel.color}`, color: bmiLabel.color, fontSize: '0.65rem', padding: '1px 6px' }}>
                  {bmiLabel.text}
                </span>
              </div>

              {/* Lean Mass Card */}
              <div 
                className="glass-panel"
                style={{ 
                  padding: '14px', 
                  background: 'rgba(255,255,255,0.01)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted))', fontWeight: 600, lineHeight: 1.2 }}>{t.profileLeanMass || 'Masa Corporal Magra'}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: 'hsl(var(--primary))' }}>
                  {leanMass > 0 ? `${leanMass.toFixed(1)} kg` : '--'}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'hsl(var(--muted))', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                  <span>{language === 'es' ? 'Hueso, músculo y agua: ' : 'Bone, muscle and water: '}{(100 - bodyFat).toFixed(1)}%</span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${fatCategory.color}`, color: fatCategory.color, fontSize: '0.6rem', padding: '1px 6.5px', marginTop: '2px' }}>
                    {fatCategory.text}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Panel */}
      {showFatCalc && (
        <div className="glass-panel fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '4px solid hsl(var(--primary))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Calculator size={24} color="hsl(var(--primary))" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{language === 'es' ? 'Calculadora de % de Grasa Corporal' : 'Body Fat % Calculator'}</h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
                {language === 'es' 
                  ? 'Método de la Marina de los EE. UU. Basado en mediciones de circunferencia.' 
                  : 'U.S. Navy Method. Based on circumference measurements.'}
              </p>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '24px', alignItems: 'stretch' }}>
            {/* Formulario de Medidas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--primary))' }}>
                {language === 'es' ? 'Ingresa tus Medidas (cm)' : 'Enter Your Measurements (cm)'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Altura informada */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Altura del perfil:' : 'Profile height:'}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{height} cm</span>
                </div>

                {/* Cuello */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{language === 'es' ? 'Circunferencia del Cuello' : 'Neck Circumference'}</label>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{neckCirc} cm</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      type="button"
                      onClick={() => setNeckCirc(Math.max(20, neckCirc - 0.5))}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      step="0.5"
                      value={neckCirc} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) setNeckCirc(val);
                      }}
                      style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', height: '38px' }}
                    />
                    <button 
                      type="button"
                      onClick={() => setNeckCirc(neckCirc + 0.5)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                    >
                      +
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Medir horizontalmente justo debajo de la nuez de Adán.' : 'Measure horizontally just below the Adam\'s apple.'}</span>
                </div>

                {/* Cintura */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{language === 'es' ? 'Circunferencia de la Cintura' : 'Waist Circumference'}</label>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{waistCirc} cm</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      type="button"
                      onClick={() => setWaistCirc(Math.max(30, waistCirc - 0.5))}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      step="0.5"
                      value={waistCirc} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) setWaistCirc(val);
                      }}
                      style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', height: '38px' }}
                    />
                    <button 
                      type="button"
                      onClick={() => setWaistCirc(waistCirc + 0.5)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                    >
                      +
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                    {gender === 'Masculino' 
                      ? (language === 'es' ? 'Medir a nivel del ombligo (relajado, sin meter el estómago).' : 'Measure at navel level (relaxed, do not suck in stomach).') 
                      : (language === 'es' ? 'Medir en la parte más estrecha del torso (por encima del ombligo).' : 'Measure at the narrowest part of the torso (above the navel).')}
                  </span>
                </div>

                {/* Cadera - Sólo mujeres */}
                {gender === 'Femenino' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{language === 'es' ? 'Circunferencia de la Cadera' : 'Hip Circumference'}</label>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>{hipCirc} cm</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button"
                        onClick={() => setHipCirc(Math.max(40, hipCirc - 0.5))}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        step="0.5"
                        value={hipCirc} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) setHipCirc(val);
                        }}
                        style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '6px', color: '#fff', height: '38px' }}
                      />
                      <button 
                        type="button"
                        onClick={() => setHipCirc(hipCirc + 0.5)}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '28px', height: '38px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                      >
                        +
                      </button>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Medir horizontalmente en la parte más ancha de los glúteos.' : 'Measure horizontally at the widest part of the glutes.'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resultado y Clasificación */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--secondary))' }}>
                {language === 'es' ? 'Resultado Estimado' : 'Estimated Result'}
              </h3>

              {calculatedNavyFat !== null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                  <div 
                    className="glass-panel" 
                    style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.02)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{language === 'es' ? '% Grasa Corporal Estimado' : 'Estimated Body Fat %'}</span>
                    <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'hsl(var(--primary))', margin: '6px 0' }}>
                      {calculatedNavyFat}%
                    </span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${
                      gender === 'Masculino'
                        ? (calculatedNavyFat < 6 ? 'hsl(var(--primary))' : calculatedNavyFat < 18 ? 'hsl(var(--success))' : calculatedNavyFat < 25 ? 'hsl(var(--warning))' : 'hsl(var(--danger))')
                        : (calculatedNavyFat < 14 ? 'hsl(var(--primary))' : calculatedNavyFat < 25 ? 'hsl(var(--success))' : calculatedNavyFat < 32 ? 'hsl(var(--warning))' : 'hsl(var(--danger))')
                    }`, color: 
                      gender === 'Masculino'
                        ? (calculatedNavyFat < 6 ? 'hsl(var(--primary))' : calculatedNavyFat < 18 ? 'hsl(var(--success))' : calculatedNavyFat < 25 ? 'hsl(var(--warning))' : 'hsl(var(--danger))')
                        : (calculatedNavyFat < 14 ? 'hsl(var(--primary))' : calculatedNavyFat < 25 ? 'hsl(var(--success))' : calculatedNavyFat < 32 ? 'hsl(var(--warning))' : 'hsl(var(--danger))')
                    , fontSize: '0.7rem', padding: '2px 8px' }}>
                      {getCalculatedFatCategory(calculatedNavyFat)}
                    </span>

                    <button 
                      type="button"
                      onClick={() => {
                        setBodyFat(calculatedNavyFat);
                        setShowFatCalc(false);
                      }}
                      className="btn btn-primary"
                      style={{ marginTop: '16px', width: '100%', gap: '6px', fontSize: '0.85rem', padding: '8px 16px' }}
                    >
                      <Check size={16} /> {language === 'es' ? 'Aplicar a mi perfil' : 'Apply to my profile'}
                    </button>
                  </div>

                  {/* Tabla de Rangos */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '10px', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'hsl(var(--muted))', display: 'block', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                      {language === 'es' ? 'Rangos de Grasa Corporal' : 'Body Fat Ranges'} ({gender === 'Masculino' ? (t.profileGenderMale || 'Masculino') : (t.profileGenderFemale || 'Femenino')})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {gender === 'Masculino' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Grasa Esencial' : 'Essential Fat') ? 'rgba(0, 242, 254, 0.1)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Grasa Esencial' : 'Essential Fat') ? 'hsl(var(--primary))' : undefined }}>
                            <span>{language === 'es' ? 'Grasa Esencial:' : 'Essential Fat:'}</span><span>2 - 5.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Atleta' : 'Athlete') ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Atleta' : 'Athlete') ? 'hsl(var(--success))' : undefined }}>
                            <span>{language === 'es' ? 'Atletas:' : 'Athletes:'}</span><span>6 - 13.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Fitness' : 'Fitness') ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Fitness' : 'Fitness') ? 'hsl(var(--success))' : undefined }}>
                            <span>Fitness:</span><span>14 - 17.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Aceptable' : 'Acceptable') ? 'rgba(254, 190, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Aceptable' : 'Acceptable') ? 'hsl(var(--warning))' : undefined }}>
                            <span>{language === 'es' ? 'Aceptable:' : 'Acceptable:'}</span><span>18 - 24.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Obesidad' : 'Obesity') ? 'rgba(254, 0, 74, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Obesidad' : 'Obesity') ? 'hsl(var(--danger))' : undefined }}>
                            <span>{language === 'es' ? 'Exceso/Obesidad:' : 'Excess/Obesity:'}</span><span>25% o más</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Grasa Esencial' : 'Essential Fat') ? 'rgba(0, 242, 254, 0.1)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Grasa Esencial' : 'Essential Fat') ? 'hsl(var(--primary))' : undefined }}>
                            <span>{language === 'es' ? 'Grasa Esencial:' : 'Essential Fat:'}</span><span>10 - 13.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Atleta' : 'Athlete') ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Atleta' : 'Athlete') ? 'hsl(var(--success))' : undefined }}>
                            <span>{language === 'es' ? 'Atletas:' : 'Athletes:'}</span><span>14 - 20.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Fitness' : 'Fitness') ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Fitness' : 'Fitness') ? 'hsl(var(--success))' : undefined }}>
                            <span>Fitness:</span><span>21 - 24.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Aceptable' : 'Acceptable') ? 'rgba(254, 190, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Aceptable' : 'Acceptable') ? 'hsl(var(--warning))' : undefined }}>
                            <span>{language === 'es' ? 'Aceptable:' : 'Acceptable:'}</span><span>25 - 31.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Obesidad' : 'Obesity') ? 'rgba(254, 0, 74, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === (language === 'es' ? 'Obesidad' : 'Obesity') ? 'hsl(var(--danger))' : undefined }}>
                            <span>{language === 'es' ? 'Exceso/Obesidad:' : 'Excess/Obesity:'}</span><span>32% o más</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'hsl(var(--muted))', textAlign: 'center', padding: '20px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
                  <Info size={28} />
                  <p style={{ fontSize: '0.85rem' }}>{language === 'es' ? 'Ingresa medidas válidas para calcular automáticamente tu % de grasa.' : 'Enter valid measurements to automatically calculate your body fat %.'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', fontStyle: 'italic' }}>{language === 'es' ? 'El cuello debe ser menor que la cintura.' : 'The neck must be smaller than the waist.'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tips de Medición */}
          <div style={{ background: 'hsla(var(--primary) / 0.02)', border: '1px dashed hsl(var(--border))', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--primary))' }}>
              <HelpCircle size={16} /> {language === 'es' ? 'Consejos para mayor precisión' : 'Tips for higher precision'}
            </span>
            <ul style={{ fontSize: '0.78rem', color: 'hsl(var(--muted))', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>{language === 'es' ? 'Momento ideal:' : 'Ideal time:'}</strong> {language === 'es' ? 'Realiza las mediciones en ayunas por la mañana, antes de comer o hacer ejercicio.' : 'Take measurements fasting in the morning, before eating or exercising.'}</li>
              <li><strong>{language === 'es' ? 'Tensión adecuada:' : 'Proper tension:'}</strong> {language === 'es' ? 'Mantén la cinta tensa y alineada horizontalmente sin presionar la piel.' : 'Keep the tape snug and horizontally aligned without pressing the skin.'}</li>
              <li><strong>{language === 'es' ? 'Consistencia:' : 'Consistency:'}</strong> {language === 'es' ? 'Mídete tres veces y saca el promedio para reducir el margen de error humano.' : 'Measure three times and take the average to reduce the margin of human error.'}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Registrar Peso e Historial */}
      <div className="grid-cols-2">
        
        {/* Registrar Peso Manual */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="hsl(var(--primary))" />
            {language === 'es' ? 'Registrar Peso Corporal' : 'Log Body Weight'}
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginBottom: '20px' }}>
            {language === 'es' 
              ? 'Añade tu peso del día para hacer un seguimiento temporal en tus curvas de progreso.' 
              : 'Add your daily weight to track progress over time.'}
          </p>

          <form onSubmit={handleRegisterWeight} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{t.weight || 'Peso'} (kg)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={newWeightInput}
                  onChange={(e) => setNewWeightInput(e.target.value)}
                  placeholder={language === 'es' ? 'Ej: 74.8' : 'e.g. 74.8'}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{language === 'es' ? 'Fecha' : 'Date'}</label>
                <input 
                  type="date" 
                  value={customDateInput}
                  onChange={(e) => setCustomDateInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}>
              <Plus size={16} /> {language === 'es' ? 'Registrar Peso' : 'Log Weight'}
            </button>
          </form>
        </div>

        {/* Historial de Pesos Guardados */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="hsl(var(--secondary))" />
            {language === 'es' ? 'Historial de Mediciones' : 'Measurement History'}
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginBottom: '16px' }}>
            {language === 'es'
              ? 'Listado de tus últimos registros de peso en la base de datos local y sincronizada.'
              : 'List of your latest weight records in local and synchronized database.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
            {weightHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'hsl(var(--muted))', fontSize: '0.8rem', fontStyle: 'italic' }}>
                {language === 'es' ? 'No hay registros de peso en tu historial.' : 'No weight records in your history.'}
              </div>
            ) : (
              [...weightHistory].reverse().map((record) => {
                const dateFormatted = new Date(record.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                
                return (
                  <div 
                    key={record.date} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fff' }}>
                        {record.weight} kg
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                        {dateFormatted}
                      </span>
                    </div>

                    <button 
                      onClick={() => onDeleteWeightRecord(record.date)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'hsl(var(--danger))', 
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title={t.cardioHistoryDeleteTooltip || 'Eliminar registro'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Sección: Configuración de la Aplicación */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px' }}>
            <Settings size={24} color="hsl(var(--primary))" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {t.profileSectionSettings || 'Configuración de la Aplicación'}
            </h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
              {language === 'es' 
                ? 'Personaliza tus preferencias generales de la aplicación.' 
                : 'Customize your general application preferences.'}
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px solid hsl(var(--border))',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>
              {t.profileSettingsLanguageLabel || 'Idioma de la Interfaz'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>
              {t.profileSettingsLanguageDesc || 'Cambiar el idioma global de los textos y ejercicios'}
            </span>
          </div>
          
          <button 
            type="button"
            onClick={onToggleLanguage}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all var(--transition-fast)'
            }}
            className="hover-card-highlight"
          >
            🌐 {language === 'es' ? 'Español (ES)' : 'English (EN)'}
          </button>
        </div>

        {/* Divider */}
        <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />

        {/* Subsección: Entrenamiento */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '8px', margin: '0' }}>
            🏋️ {t.profileSectionWorkoutSettings || 'Configuración de Entrenamiento'}
          </h3>

          {/* Habilitar temporizador */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid hsl(var(--border))',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '200px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>
                {t.profileRestTimerAuto || 'Temporizador de Descanso Automático'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>
                {t.profileRestTimerAutoDesc || 'Arranca automáticamente al completar una serie.'}
              </span>
            </div>
            
            <button 
              type="button"
              onClick={handleToggleRestTimer}
              style={{
                background: restTimerEnabled ? 'hsla(var(--primary) / 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid ' + (restTimerEnabled ? 'hsl(var(--primary))' : 'hsl(var(--border))'),
                borderRadius: '8px',
                padding: '8px 16px',
                color: restTimerEnabled ? 'hsl(var(--primary))' : '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              className="hover-card-highlight"
            >
              {restTimerEnabled ? (language === 'es' ? 'Activado' : 'Enabled') : (language === 'es' ? 'Desactivado' : 'Disabled')}
            </button>
          </div>

          {restTimerEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {/* Descanso Compuesto */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.01)',
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                    {t.profileRestTimeCompound || 'Descanso en Compuestos'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                    {language === 'es' ? 'Sentadillas, Press Banca, etc.' : 'Squat, Bench Press, etc.'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => adjustCompoundTime(-15)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: '45px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>
                    {restTimeCompound}s
                  </span>
                  <button 
                    type="button"
                    onClick={() => adjustCompoundTime(15)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Descanso Accesorio */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.01)',
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                    {t.profileRestTimeAccessory || 'Descanso en Accesorios'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                    {language === 'es' ? 'Aislamiento, Brazos, etc.' : 'Isolation, Arms, etc.'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => adjustAccessoryTime(-15)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: '45px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>
                    {restTimeAccessory}s
                  </span>
                  <button 
                    type="button"
                    onClick={() => adjustAccessoryTime(15)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sonidos de Alerta */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid hsl(var(--border))',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '200px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={18} color="hsl(var(--primary))" />
                {t.profileRestTimerSound || 'Sonidos de Alerta'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>
                {t.profileRestTimerSoundDesc || 'Activa pitidos de pre-alerta (últimos 3s) y de finalización.'}
              </span>
            </div>
            
            <button 
              type="button"
              onClick={handleToggleRestSound}
              style={{
                background: restTimerSoundEnabled ? 'hsla(var(--primary) / 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid ' + (restTimerSoundEnabled ? 'hsl(var(--primary))' : 'hsl(var(--border))'),
                borderRadius: '8px',
                padding: '8px 16px',
                color: restTimerSoundEnabled ? 'hsl(var(--primary))' : '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              className="hover-card-highlight"
            >
              {restTimerSoundEnabled ? (language === 'es' ? 'Activado' : 'Enabled') : (language === 'es' ? 'Desactivado' : 'Disabled')}
            </button>
          </div>

          {/* Selector de Sistema de Progresión */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid hsl(var(--border))'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="hsl(var(--primary))" />
                {t.progressionSystemLabel}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>
                {t.progressionSystemDesc}
              </span>
            </div>
            
            <select
              value={progressionSystem}
              onChange={(e) => onSetProgressionSystem(e.target.value as ProgressionSystem)}
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                padding: '10px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'border-color var(--transition-fast)'
              }}
              className="hover-card-highlight"
            >
              <option value="double_progression" style={{ background: '#18181b', color: '#fff' }}>
                {t.doubleProgression}
              </option>
              <option value="linear_periodization" style={{ background: '#18181b', color: '#fff' }}>
                {t.linearPeriodization}
              </option>
              <option value="dup" style={{ background: '#18181b', color: '#fff' }}>
                {t.dup}
              </option>
            </select>

            {/* Alerta inteligente del Coach (DUP o Linear Periodization) */}
            {((athleteLevel === 'intermediate' || athleteLevel === 'advanced') && progressionSystem === 'double_progression') && (
              <div style={{
                marginTop: '8px',
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.04) 100%)',
                border: '1px solid hsl(38, 92%, 50%)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="hsl(38, 92%, 50%)" />
                  <strong style={{ fontSize: '0.9rem', color: 'hsl(38, 92%, 60%)' }}>
                    {t.coachRecommendation}
                  </strong>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#fef3c7', lineHeight: '1.4' }}>
                  {t.coachAdviseChange}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección: Medallero de Logros */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'hsla(var(--warning) / 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Award size={24} color="hsl(var(--warning))" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{language === 'es' ? 'Logros y Medallero' : 'Achievements & Medals'}</h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
                {language === 'es'
                  ? 'Completa desafíos de fuerza, cardio y constancia para desbloquear insignias'
                  : 'Complete strength, cardio and consistency challenges to unlock badges'}
              </p>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
            {language === 'es' ? 'Progreso General: ' : 'Overall Progress: '}<span style={{ color: 'hsl(var(--primary))', fontSize: '1rem', fontWeight: 800 }}>{Math.round((unlockedCount / 12) * 100)}%</span>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '16px', 
          marginTop: '10px' 
        }}>
          {localizedAchievements.map((medal) => {
            const tierColors = {
              bronze: { border: 'hsla(30, 70%, 45%, 0.3)', bg: 'rgba(180, 83, 9, 0.03)', glow: 'bronze', label: language === 'es' ? 'Bronce' : 'Bronze', text: '#b45309' },
              silver: { border: 'hsla(215, 15%, 70%, 0.3)', bg: 'rgba(156, 163, 175, 0.03)', glow: 'silver', label: language === 'es' ? 'Plata' : 'Silver', text: '#9ca3af' },
              gold: { border: 'hsla(45, 95%, 50%, 0.3)', bg: 'rgba(251, 191, 36, 0.03)', glow: 'gold', label: language === 'es' ? 'Oro' : 'Gold', text: '#fbbf24' }
            };
            const currentTier = tierColors[medal.tier];

            return (
              <div 
                key={medal.id}
                className={`medal-card glass-panel shimmer-card ${medal.isUnlocked ? `unlocked ${currentTier.glow}` : 'locked'}`}
                style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '12px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: medal.isUnlocked ? currentTier.border : 'hsl(var(--border))',
                  background: medal.isUnlocked ? currentTier.bg : 'rgba(255,255,255,0.01)',
                  opacity: medal.isUnlocked ? 1 : 0.45,
                  position: 'relative'
                }}
              >
                <div style={{ 
                  fontSize: '2.2rem', 
                  filter: medal.isUnlocked ? 'none' : 'grayscale(100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px'
                }}>
                  {medal.icon}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold', 
                    color: medal.isUnlocked ? '#fff' : 'hsl(var(--muted))' 
                  }}>
                    {medal.title}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))', lineHeight: '1.2' }}>
                    {medal.description}
                  </span>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.65rem' }}>
                    <span style={{ color: medal.isUnlocked ? currentTier.text : 'hsl(var(--muted))', fontWeight: 700 }}>
                      {currentTier.label}
                    </span>
                    <span style={{ color: 'hsl(var(--muted))', fontFamily: 'monospace' }}>
                      {medal.progressText}
                    </span>
                  </div>
                </div>
                
                {!medal.isUnlocked && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '8px', 
                    right: '8px', 
                    background: 'rgba(0,0,0,0.4)', 
                    borderRadius: '50%', 
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Lock size={10} color="hsl(var(--muted))" style={{ opacity: 0.7 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección: Galería de Progreso Físico */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Camera size={24} color="hsl(var(--primary))" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{language === 'es' ? 'Historial de Fotos de Progreso' : 'Progress Photos History'}</h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
                {language === 'es'
                  ? 'Registra visualmente tu evolución física con peso corporal asociado'
                  : 'Visually track your physical progress with associated body weight'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddPhoto(!showAddPhoto)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> {language === 'es' ? 'Añadir Foto' : 'Add Photo'}
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
              gap: '16px'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>{t.photoWidgetFormTitle || 'Añadir Nuevo Registro Visual'}</h3>
            
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
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{language === 'es' ? 'Fecha' : 'Date'}</label>
                    <input 
                      type="date" 
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{t.profilePhotosFormWeight || 'Peso en la foto (kg - opcional)'}</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={photoWeight}
                      onChange={(e) => setPhotoWeight(e.target.value)}
                      placeholder={language === 'es' ? 'Ej: 75.5' : 'e.g. 75.5'}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>{t.profilePhotosFormNote || 'Comentario / Nota de la foto'}</label>
                  <textarea 
                    value={photoNote}
                    onChange={(e) => setPhotoNote(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: Fin del ciclo de volumen. Nuevos PBs.' : 'e.g. End of bulk cycle. New PBs.'}
                    rows={3}
                    style={{ resize: 'none' }}
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

        {/* Cuadrícula de fotos */}
        {progressPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--muted))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={36} color="hsl(var(--muted))" />
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{language === 'es' ? 'No hay fotos de progreso aún' : 'No progress photos yet'}</p>
            <p style={{ fontSize: '0.75rem' }}>{t.profilePhotosEmpty || 'Agrega tu primera foto de progreso para comenzar a trackear visualmente tu físico.'}</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
            gap: '16px' 
          }}>
            {progressPhotos.map((photo) => {
              const dateFormatted = new Date(photo.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div key={photo.id} className="progress-photo-card">
                  <div className="photo-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(language === 'es' ? '¿Estás seguro de que deseas eliminar esta foto de progreso?' : 'Are you sure you want to delete this progress photo?')) {
                          onDeleteProgressPhoto(photo.id);
                        }
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.9)',
                        border: 'none',
                        borderRadius: '6px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                      title={t.photoDeleteBtn || 'Eliminar Foto'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ cursor: 'pointer' }} onClick={() => setActiveLightboxPhoto(photo)}>
                    <img src={photo.photoUrl} alt={`Progreso ${dateFormatted}`} />
                    
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>{dateFormatted}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'hsl(var(--muted))' }}>
                        <span>{photo.weight ? `${photo.weight} kg` : '-- kg'}</span>
                        {photo.note && <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>💬 {photo.note}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {activeLightboxPhoto && (
        <div className="lightbox-backdrop" onClick={() => setActiveLightboxPhoto(null)}>
          <div 
            className="lightbox-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '90%', maxWidth: '850px', maxHeight: '90vh' }}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t.profilePhotosDetailTitle || 'Detalles del Progreso'}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifySelf: 'start', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
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
                  <div style={{ display: 'flex', justifySelf: 'start', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                    <Scale size={14} />
                    <span>{t.profilePhotosDetailWeightLabel || 'Peso registrado: '} <strong>{activeLightboxPhoto.weight} kg</strong></span>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid hsl(var(--border))', margin: '8px 0' }} />

              <div>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.profilePhotosNotesLabel || 'Nota / Comentario'}</span>
                <p style={{ fontSize: '0.9rem', color: '#fff', marginTop: '6px', lineHeight: '1.4', whiteSpace: 'pre-wrap', fontStyle: activeLightboxPhoto.note ? 'normal' : 'italic' }}>
                  {activeLightboxPhoto.note || (t.profilePhotosNotesEmpty || 'Sin anotaciones para este registro.')}
                </p>
              </div>

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
                <Trash2 size={14} /> {t.profilePhotosDeleteBtn || 'Eliminar Foto'}
              </button>
            </div>
          </div>
          <style>{`
            @media (min-width: 768px) {
              .lightbox-info-panel {
                width: 320px !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Sección: Motor de Decisiones e Inteligencia (Algoritmos) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <button
          type="button"
          onClick={() => setShowAlgorithms(!showAlgorithms)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            width: '100%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Info size={24} color="hsl(var(--primary))" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{language === 'es' ? 'Motor de Decisiones e Inteligencia' : 'Decision Engine & Intelligence'}</h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginTop: '2px' }}>
                {language === 'es'
                  ? 'Documentación y fundamentos matemáticos del sistema PLNEXC'
                  : 'Documentation and mathematical foundations of the PLNEXC system'}
              </p>
            </div>
          </div>
          {showAlgorithms ? <ChevronUp size={20} color="hsl(var(--muted))" /> : <ChevronDown size={20} color="hsl(var(--muted))" />}
        </button>

        {showAlgorithms && (
          <div style={{ marginTop: '24px', borderTop: '1px solid hsl(var(--border))', paddingTop: '20px' }}>
            <AlgorithmsTab />
          </div>
        )}
      </div>

    </div>
  );
}
