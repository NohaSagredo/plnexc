import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Bookmark
} from 'lucide-react';
import { EXERCISES_DB } from '../data/exercises_db';
import type { Exercise } from '../data/exercises_db';

interface RoutineBuilderProps {
  onSave: (name: string, exercises: string[], originalName?: string) => void;
  onCancel: () => void;
  editRoutineName?: string;
  editExercises?: string[];
  isEditing?: boolean;
}

export default function RoutineBuilder({ 
  onSave, 
  onCancel,
  editRoutineName = '',
  editExercises = [],
  isEditing = false
}: RoutineBuilderProps) {
  const [routineName, setRoutineName] = useState(editRoutineName);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>(() => {
    if (editExercises.length > 0) {
      return editExercises.map(title => {
        const found = EXERCISES_DB.find(ex => ex.title === title);
        if (found) return found;
        return {
          id: `custom_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          title: title,
          muscleGroup: 'Pecho',
          equipment: 'Mancuerna',
          difficulty: 'Intermedio',
          description: 'Ejercicio cargado'
        } as Exercise;
      });
    }
    return [];
  });
  
  // Filters State
  const [searchText, setSearchText] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Todos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Todos');

  // Filter exercises based on selections
  const filteredExercises = useMemo(() => {
    return EXERCISES_DB.filter(ex => {
      const matchText = ex.title.toLowerCase().includes(searchText.toLowerCase());
      const matchMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle;
      const matchEquipment = selectedEquipment === 'Todos' || ex.equipment === selectedEquipment;
      const matchDifficulty = selectedDifficulty === 'Todos' || ex.difficulty === selectedDifficulty;
      
      return matchText && matchMuscle && matchEquipment && matchDifficulty;
    });
  }, [searchText, selectedMuscle, selectedEquipment, selectedDifficulty]);

  // Unique categories for selectors
  const muscles = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cuello', 'Cardio'];
  const equipments = ['Todos', 'Barra', 'Mancuerna', 'Peso Corporal', 'Polea/Cable', 'Banda', 'Otro'];
  const difficulties = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

  // Add exercise to custom routine
  const handleAddExercise = (exercise: Exercise) => {
    if (selectedExercises.some(e => e.id === exercise.id)) return;
    setSelectedExercises(prev => [...prev, exercise]);
  };

  // Remove exercise from custom routine
  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== exerciseId));
  };

  // Reorder exercises: Up
  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedExercises(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      return updated;
    });
  };

  // Reorder exercises: Down
  const handleMoveDown = (idx: number) => {
    if (idx === selectedExercises.length - 1) return;
    setSelectedExercises(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      return updated;
    });
  };

  // Save Custom Routine
  const handleSaveRoutine = () => {
    const trimmedName = routineName.trim();
    if (!trimmedName) {
      alert('Por favor, introduce un nombre para la rutina.');
      return;
    }
    if (selectedExercises.length === 0) {
      alert('Por favor, añade al menos un ejercicio a tu rutina.');
      return;
    }
    
    // Save only exercise titles to match core history engine
    const exerciseTitles = selectedExercises.map(e => e.title);
    onSave(trimmedName, exerciseTitles, isEditing ? editRoutineName : undefined);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Header Banner */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bookmark size={24} color="hsl(var(--primary))" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{isEditing ? 'Editar Rutina' : 'Diseñador de Rutina'}</h2>
        </div>
        <button className="btn btn-secondary" onClick={onCancel} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          <X size={16} /> Cancelar
        </button>
      </div>

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Routine Form & Selected List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Routine Name Input */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <label style={{ fontSize: '0.9rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
              Nombre de tu Nueva Rutina:
            </label>
            <input 
              type="text" 
              value={routineName} 
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Ej. Torso Pesado, Rutina de Pierna A, Cardio & Core"
              style={{ marginTop: '8px' }}
            />
          </div>

          {/* Selected Exercises Editor */}
          <div className="glass-panel" style={{ padding: '20px', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
              Ejercicios Seleccionados ({selectedExercises.length})
            </h3>

            {selectedExercises.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'hsl(var(--muted))', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
                Selecciona ejercicios de la biblioteca de la derecha para agregarlos a tu rutina
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedExercises.map((ex, idx) => (
                  <div 
                    key={ex.id}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--border-radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '65%' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{ex.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                        {ex.muscleGroup} • {ex.equipment}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        style={{ background: 'transparent', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.05)' : 'hsl(var(--muted))', cursor: idx === 0 ? 'default' : 'pointer' }}
                        title="Subir"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button 
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === selectedExercises.length - 1}
                        style={{ background: 'transparent', border: 'none', color: idx === selectedExercises.length - 1 ? 'rgba(255,255,255,0.05)' : 'hsl(var(--muted))', cursor: idx === selectedExercises.length - 1 ? 'default' : 'pointer' }}
                        title="Bajar"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveExercise(ex.id)}
                        style={{ background: 'transparent', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', marginLeft: '6px' }}
                        title="Remover"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleSaveRoutine}
              style={{ width: '100%', marginTop: 'auto', padding: '12px' }}
            >
              <Check size={18} /> {isEditing ? 'Actualizar Rutina' : 'Guardar Rutina en PLNEXC'}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Library Search & Filters */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
            Biblioteca de Ejercicios
          </h3>

          {/* Text Search */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar ejercicio por nombre..."
              style={{ paddingLeft: '36px' }}
            />
            <Search 
              size={18} 
              color="hsl(var(--muted))" 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
            />
          </div>

          {/* Category Dropdowns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Filtrar por Músculo:</label>
              <select value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)} style={{ padding: '6px 10px', marginTop: '4px' }}>
                {muscles.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Filtrar por Equipamiento:</label>
              <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)} style={{ padding: '6px 10px', marginTop: '4px' }}>
                {equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>Filtrar por Dificultad (Ruta de Progreso):</label>
              <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} style={{ padding: '6px 10px', marginTop: '4px' }}>
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Exercises Library List */}
          <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', marginTop: '6px' }}>
            {filteredExercises.length === 0 ? (
              <div style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                No se encontraron ejercicios con los filtros seleccionados
              </div>
            ) : (
              filteredExercises.map(ex => {
                const isAdded = selectedExercises.some(e => e.id === ex.id);
                return (
                  <div 
                    key={ex.id}
                    style={{ 
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--border-radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '75%', gap: '4px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{ex.title}</strong>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{ex.muscleGroup}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{ex.equipment}</span>
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{ex.difficulty}</span>
                      </div>
                    </div>

                    <button 
                      className={`btn ${isAdded ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '6px', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      disabled={isAdded}
                      onClick={() => handleAddExercise(ex)}
                      title={isAdded ? 'Añadido' : 'Añadir a la rutina'}
                    >
                      {isAdded ? <Check size={14} /> : <Plus size={14} />}
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
