import { useState, useMemo, useEffect, useRef } from 'react';
import { Scale, User, Trash2, Calendar, Plus, HelpCircle, Calculator, ChevronDown, ChevronUp, Check, Info, Lock, Camera, Award, X, Image as ImageIcon } from 'lucide-react';
import type { WeightRecord } from '../utils/firebaseSync';
import { calculatePBProfiles, calculateAchievements, compressAndResizeImage } from '../utils/ProgressionEngine';

interface ProfileTabProps {
  bodyWeight: number;
  setBodyWeight: (weight: number) => void;
  height: number;
  setHeight: (height: number) => void;
  gender: 'Masculino' | 'Femenino';
  setGender: (gender: 'Masculino' | 'Femenino') => void;
  bodyFat: number;
  setBodyFat: (fat: number) => void;
  weightHistory: WeightRecord[];
  onAddWeightRecord: (weight: number, dateStr?: string) => void;
  onDeleteWeightRecord: (dateStr: string) => void;
  profilePicture: string;
  onSaveProfilePicture: (pic: string) => void;
  progressPhotos: any[];
  onAddProgressPhoto: (photo: { id: string; date: string; weight?: number; photoUrl: string; note?: string }) => void;
  onDeleteProgressPhoto: (id: string) => void;
  localHistory: any[];
  cardioHistory: any[];
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
  cardioHistory
}: ProfileTabProps) {
  const [newWeightInput, setNewWeightInput] = useState<string>('');
  const [customDateInput, setCustomDateInput] = useState<string>(new Date().toISOString().split('T')[0]);

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
        alert('Ocurrió un error al procesar la imagen.');
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

  // Body Fat Category for profile
  const fatCategory = useMemo(() => {
    const value = bodyFat;
    if (gender === 'Masculino') {
      if (value < 6) return { text: 'Grasa Esencial', color: 'hsl(var(--primary))', desc: 'Rango mínimo necesario para la supervivencia.' };
      if (value < 14) return { text: 'Atleta', color: 'hsl(var(--success))', desc: 'Nivel óptimo para rendimiento deportivo de velocidad/estética.' };
      if (value < 18) return { text: 'Fitness', color: 'hsl(var(--success))', desc: 'Composición corporal atlética y saludable.' };
      if (value < 25) return { text: 'Aceptable', color: 'hsl(var(--warning))', desc: 'Rango promedio saludable para población general.' };
      return { text: 'Obesidad', color: 'hsl(var(--danger))', desc: 'Considera un déficit calórico y entrenamiento para reducir grasa.' };
    } else {
      if (value < 14) return { text: 'Grasa Esencial', color: 'hsl(var(--primary))', desc: 'Rango mínimo necesario para la salud hormonal femenina.' };
      if (value < 21) return { text: 'Atleta', color: 'hsl(var(--success))', desc: 'Nivel óptimo para rendimiento deportivo y estética.' };
      if (value < 25) return { text: 'Fitness', color: 'hsl(var(--success))', desc: 'Composición corporal atlética y saludable.' };
      if (value < 32) return { text: 'Aceptable', color: 'hsl(var(--warning))', desc: 'Rango promedio saludable para población general.' };
      return { text: 'Obesidad', color: 'hsl(var(--danger))', desc: 'Considera un déficit calórico y entrenamiento para reducir grasa.' };
    }
  }, [bodyFat, gender]);

  // BMI calculations
  const bmi = useMemo(() => {
    if (!height || !bodyWeight) return 0;
    return bodyWeight / Math.pow(height / 100, 2);
  }, [bodyWeight, height]);

  const bmiLabel = useMemo(() => {
    if (bmi < 18.5) return { text: 'Bajo peso', color: 'hsl(var(--muted))', desc: 'Tu IMC está por debajo del rango saludable.' };
    if (bmi < 25) return { text: 'Normopeso', color: 'hsl(var(--success))', desc: '¡Felicidades! Tienes un peso saludable para tu estatura.' };
    if (bmi < 30) return { text: 'Sobrepeso', color: 'hsl(var(--warning))', desc: 'Considera realizar ajustes de nutrición y ejercicio.' };
    return { text: 'Obesidad', color: 'hsl(var(--danger))', desc: 'Consulta con un profesional para mejorar tu composición corporal.' };
  }, [bmi]);

  // Lean Mass calculations
  const leanMass = useMemo(() => {
    if (!bodyWeight || !bodyFat) return 0;
    return bodyWeight * (1 - bodyFat / 100);
  }, [bodyWeight, bodyFat]);

  const getCalculatedFatCategory = (value: number) => {
    if (gender === 'Masculino') {
      if (value < 6) return 'Grasa Esencial';
      if (value < 14) return 'Atleta';
      if (value < 18) return 'Fitness';
      if (value < 25) return 'Aceptable';
      return 'Obesidad';
    } else {
      if (value < 14) return 'Grasa Esencial';
      if (value < 21) return 'Atleta';
      if (value < 25) return 'Fitness';
      if (value < 32) return 'Aceptable';
      return 'Obesidad';
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
      alert('Por favor ingresa un peso válido superior a 30 kg.');
    }
  };

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
            <span>Cambiar</span>
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
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, hsl(var(--muted)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Atleta PLNEXC
          </h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '4px' }}>
            Miembro desde junio 2026 • Entrenamientos completados: <strong style={{ color: 'hsl(var(--primary))' }}>{localHistory.length}</strong>
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={12} /> {unlockedCount} / 12 Logros
            </span>
            <span className="badge badge-success">
              {gender}
            </span>
            <span className="badge badge-warning">
              {bodyWeight} kg
            </span>
          </div>
        </div>
      </div>

      {/* Overview Antropométrico Header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'hsla(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px' }}>
            <User size={24} color="hsl(var(--primary))" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Mi Perfil Antropométrico</h2>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
              Configura tus mediciones para ajustar automáticamente los estándares biomecánicos de fuerza
            </p>
          </div>
        </div>

        <div className="grid-cols-2" style={{ gap: '24px', alignItems: 'stretch' }}>
          {/* Controles de Configuración del Perfil */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--primary))' }}>
              Configurar Atributos Físicos
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Género */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Género Biológico</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setGender('Masculino')}
                    className={`btn ${gender === 'Masculino' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem', height: '38px' }}
                  >
                    Masculino
                  </button>
                  <button 
                    onClick={() => setGender('Femenino')}
                    className={`btn ${gender === 'Femenino' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem', height: '38px' }}
                  >
                    Femenino
                  </button>
                </div>
              </div>

              {/* Altura */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Altura (cm)</label>
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
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Peso Corporal (kg)</label>
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
                <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>% Grasa Corporal</label>
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
              {showFatCalc ? 'Ocultar Calculadora' : '¿Cómo medirlo? / Calcular % Grasa'}
              {showFatCalc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Resultados de Composición Corporal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--secondary))' }}>
              Resultados de Composición
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
                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted))', fontWeight: 600, lineHeight: 1.2 }}>Índice de Masa Corporal (IMC)</span>
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
                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted))', fontWeight: 600, lineHeight: 1.2 }}>Masa Corporal Magra</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: 'hsl(var(--primary))' }}>
                  {leanMass > 0 ? `${leanMass.toFixed(1)} kg` : '--'}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'hsl(var(--muted))', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                  <span>Hueso, músculo y agua: {(100 - bodyFat).toFixed(1)}%</span>
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
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Calculadora de % de Grasa Corporal</h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
                Método de la Marina de los EE. UU. Basado en mediciones de circunferencia.
              </p>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '24px', alignItems: 'stretch' }}>
            {/* Formulario de Medidas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--primary))' }}>
                Ingresa tus Medidas (cm)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Altura informada */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))' }}>Altura del perfil:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{height} cm</span>
                </div>

                {/* Cuello */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Circunferencia del Cuello</label>
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
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>Medir horizontalmente justo debajo de la nuez de Adán.</span>
                </div>

                {/* Cintura */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Circunferencia de la Cintura</label>
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
                      ? 'Medir a nivel del ombligo (relajado, sin meter el estómago).' 
                      : 'Medir en la parte más estrecha del torso (por encima del ombligo).'}
                  </span>
                </div>

                {/* Cadera - Sólo mujeres */}
                {gender === 'Femenino' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Circunferencia de la Cadera</label>
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
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>Medir horizontalmente en la parte más ancha de los glúteos.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resultado y Clasificación */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px', color: 'hsl(var(--secondary))' }}>
                Resultado Estimado
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
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>% Grasa Corporal Estimado</span>
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
                      <Check size={16} /> Aplicar a mi perfil
                    </button>
                  </div>

                  {/* Tabla de Rangos */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '10px', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'hsl(var(--muted))', display: 'block', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                      Rangos de Grasa Corporal ({gender})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {gender === 'Masculino' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Grasa Esencial' ? 'rgba(0, 242, 254, 0.1)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Grasa Esencial' ? 'hsl(var(--primary))' : undefined }}>
                            <span>Grasa Esencial:</span><span>2 - 5.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Atleta' ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Atleta' ? 'hsl(var(--success))' : undefined }}>
                            <span>Atletas:</span><span>6 - 13.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Fitness' ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Fitness' ? 'hsl(var(--success))' : undefined }}>
                            <span>Fitness:</span><span>14 - 17.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Aceptable' ? 'rgba(254, 190, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Aceptable' ? 'hsl(var(--warning))' : undefined }}>
                            <span>Aceptable:</span><span>18 - 24.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Obesidad' ? 'rgba(254, 0, 74, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Obesidad' ? 'hsl(var(--danger))' : undefined }}>
                            <span>Exceso/Obesidad:</span><span>25% o más</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Grasa Esencial' ? 'rgba(0, 242, 254, 0.1)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Grasa Esencial' ? 'hsl(var(--primary))' : undefined }}>
                            <span>Grasa Esencial:</span><span>10 - 13.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Atleta' ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Atleta' ? 'hsl(var(--success))' : undefined }}>
                            <span>Atletas:</span><span>14 - 20.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Fitness' ? 'rgba(74, 254, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Fitness' ? 'hsl(var(--success))' : undefined }}>
                            <span>Fitness:</span><span>21 - 24.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Aceptable' ? 'rgba(254, 190, 0, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Aceptable' ? 'hsl(var(--warning))' : undefined }}>
                            <span>Aceptable:</span><span>25 - 31.9%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: getCalculatedFatCategory(calculatedNavyFat) === 'Obesidad' ? 'rgba(254, 0, 74, 0.08)' : 'transparent', color: getCalculatedFatCategory(calculatedNavyFat) === 'Obesidad' ? 'hsl(var(--danger))' : undefined }}>
                            <span>Exceso/Obesidad:</span><span>32% o más</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'hsl(var(--muted))', textAlign: 'center', padding: '20px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
                  <Info size={28} />
                  <p style={{ fontSize: '0.85rem' }}>Ingresa medidas válidas para calcular automáticamente tu % de grasa.</p>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', fontStyle: 'italic' }}>El cuello debe ser menor que la cintura.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tips de Medición */}
          <div style={{ background: 'hsla(var(--primary) / 0.02)', border: '1px dashed hsl(var(--border))', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--primary))' }}>
              <HelpCircle size={16} /> Consejos para mayor precisión
            </span>
            <ul style={{ fontSize: '0.78rem', color: 'hsl(var(--muted))', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Momento ideal:</strong> Realiza las mediciones en ayunas por la mañana, antes de comer o hacer ejercicio.</li>
              <li><strong>Tensión adecuada:</strong> Mantén la cinta tensa y alineada horizontalmente sin presionar la piel.</li>
              <li><strong>Consistencia:</strong> Mídete tres veces y saca el promedio para reducir el margen de error humano.</li>
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
            Registrar Peso Corporal
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginBottom: '20px' }}>
            Añade tu peso del día para hacer un seguimiento temporal en tus curvas de progreso.
          </p>

          <form onSubmit={handleRegisterWeight} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>Peso (kg)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={newWeightInput}
                  onChange={(e) => setNewWeightInput(e.target.value)}
                  placeholder="Ej: 74.8"
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>Fecha</label>
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
              <Plus size={16} /> Registrar Peso
            </button>
          </form>
        </div>

        {/* Historial de Pesos Guardados */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="hsl(var(--secondary))" />
            Historial de Mediciones
          </h3>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', marginBottom: '16px' }}>
            Listado de tus últimas registros de peso en la base de datos local y sincronizada.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
            {weightHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'hsl(var(--muted))', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No hay registros de peso en tu historial.
              </div>
            ) : (
              [...weightHistory].reverse().map((record) => {
                const dateFormatted = new Date(record.date).toLocaleDateString('es-ES', {
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
                      title="Eliminar registro"
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

      {/* Sección: Medallero de Logros */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'hsla(var(--warning) / 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Award size={24} color="hsl(var(--warning))" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Logros y Medallero</h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
                Completa desafíos de fuerza, cardio y constancia para desbloquear insignias
              </p>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
            Progreso General: <span style={{ color: 'hsl(var(--primary))', fontSize: '1rem', fontWeight: 800 }}>{Math.round((unlockedCount / 12) * 100)}%</span>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '16px', 
          marginTop: '10px' 
        }}>
          {achievements.map((medal) => {
            const tierColors = {
              bronze: { border: 'hsla(30, 70%, 45%, 0.3)', bg: 'rgba(180, 83, 9, 0.03)', glow: 'bronze', label: 'Bronce', text: '#b45309' },
              silver: { border: 'hsla(215, 15%, 70%, 0.3)', bg: 'rgba(156, 163, 175, 0.03)', glow: 'silver', label: 'Plata', text: '#9ca3af' },
              gold: { border: 'hsla(45, 95%, 50%, 0.3)', bg: 'rgba(251, 191, 36, 0.03)', glow: 'gold', label: 'Oro', text: '#fbbf24' }
            };
            const currentTier = tierColors[medal.tier];

            return (
              <div 
                key={medal.id}
                className={`medal-card glass-panel ${medal.isUnlocked ? `unlocked ${currentTier.glow}` : 'locked'}`}
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
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Historial de Fotos de Progreso</h2>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
                Registra visualmente tu evolución física con peso corporal asociado
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddPhoto(!showAddPhoto)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Añadir Foto
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>Añadir Nuevo Registro Visual</h3>
            
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
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hacer clic para subir foto</span>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>Imágenes JPG, PNG. Compresión local automática</span>
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
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>Fecha</label>
                    <input 
                      type="date" 
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>Peso Corporal (kg)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={photoWeight}
                      onChange={(e) => setPhotoWeight(e.target.value)}
                      placeholder="Ej: 75.5"
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', display: 'block', marginBottom: '4px' }}>Nota de progreso</label>
                  <textarea 
                    value={photoNote}
                    onChange={(e) => setPhotoNote(e.target.value)}
                    placeholder="Ej: Fin del ciclo de volumen. Nuevos PBs."
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
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                disabled={!photoPreview}
              >
                Guardar Registro
              </button>
            </div>
          </form>
        )}

        {/* Cuadrícula de fotos */}
        {progressPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--muted))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={36} color="hsl(var(--muted))" />
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No hay fotos de progreso aún</p>
            <p style={{ fontSize: '0.75rem' }}>Agrega tu primera foto de progreso para comenzar a trackear visualmente tu físico.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
            gap: '16px' 
          }}>
            {progressPhotos.map((photo) => {
              const dateFormatted = new Date(photo.date).toLocaleDateString('es-ES', {
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
                        if (window.confirm('¿Estás seguro de que deseas eliminar esta foto de progreso?')) {
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
                      title="Eliminar foto"
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Detalles del Progreso</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifySelf: 'start', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                  <Calendar size={14} />
                  <span>
                    {new Date(activeLightboxPhoto.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {activeLightboxPhoto.weight && (
                  <div style={{ display: 'flex', justifySelf: 'start', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                    <Scale size={14} />
                    <span>Peso registrado: <strong>{activeLightboxPhoto.weight} kg</strong></span>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid hsl(var(--border))', margin: '8px 0' }} />

              <div>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nota / Comentario</span>
                <p style={{ fontSize: '0.9rem', color: '#fff', marginTop: '6px', lineHeight: '1.4', whiteSpace: 'pre-wrap', fontStyle: activeLightboxPhoto.note ? 'normal' : 'italic' }}>
                  {activeLightboxPhoto.note || 'Sin anotaciones para este registro.'}
                </p>
              </div>

              <button 
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que deseas eliminar esta foto de progreso permanentemente?')) {
                    onDeleteProgressPhoto(activeLightboxPhoto.id);
                    setActiveLightboxPhoto(null);
                  }
                }}
                className="btn btn-danger"
                style={{ marginTop: 'auto', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Trash2 size={14} /> Eliminar Foto
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

    </div>
  );
}
