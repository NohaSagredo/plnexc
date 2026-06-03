import { useState, useMemo } from 'react';
import { Scale, User, Trash2, Calendar, Plus } from 'lucide-react';
import type { WeightRecord } from '../utils/firebaseSync';

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
  onDeleteWeightRecord
}: ProfileTabProps) {
  const [newWeightInput, setNewWeightInput] = useState<string>('');
  const [customDateInput, setCustomDateInput] = useState<string>(new Date().toISOString().split('T')[0]);

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
                <span style={{ fontSize: '0.62rem', color: 'hsl(var(--muted))' }}>
                  Hueso, músculo y agua: {(100 - bodyFat).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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

    </div>
  );
}
