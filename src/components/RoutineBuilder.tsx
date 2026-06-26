import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Bookmark
} from 'lucide-react';
import { EXERCISES_DB, getExerciseImage } from '../data/exercises_db';
import type { Exercise } from '../data/exercises_db';
import { getExerciseName } from '../utils/translations';
import CreateExerciseModal from './CreateExerciseModal';

interface RoutineBuilderProps {
  onSave: (name: string, exercises: (string | { title: string; restTime?: number })[], originalName?: string) => void;
  onCancel: () => void;
  editRoutineName?: string;
  editExercises?: (string | { title: string; restTime?: number })[];
  isEditing?: boolean;
  language?: 'es' | 'en';
  customExercises?: Exercise[];
  onSaveCustomExercise?: (exercise: Omit<Exercise, 'id'> & { id?: string }) => void;
}

export default function RoutineBuilder({ 
  onSave, 
  onCancel,
  editRoutineName = '',
  editExercises = [],
  isEditing = false,
  language = 'es',
  customExercises = [],
  onSaveCustomExercise
}: RoutineBuilderProps) {
  const allExercises = useMemo(() => {
    return [...EXERCISES_DB, ...customExercises];
  }, [customExercises]);

  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState<boolean>(false);

  const [routineName, setRoutineName] = useState(editRoutineName);
  const [selectedExercises, setSelectedExercises] = useState<(Exercise & { restTime?: number })[]>(() => {
    if (editExercises.length > 0) {
      return editExercises.map(exItem => {
        const title = typeof exItem === 'string' ? exItem : exItem.title;
        const restTime = typeof exItem === 'string' ? undefined : exItem.restTime;
        const found = allExercises.find(ex => ex.title === title);
        if (found) {
          return { ...found, restTime };
        }
        return {
          id: `custom_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          title: title,
          muscleGroup: 'Pecho',
          equipment: 'Mancuerna',
          difficulty: 'Intermedio',
          description: 'Ejercicio cargado',
          restTime
        } as Exercise & { restTime?: number };
      });
    }
    return [];
  });

  const selectedListRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(selectedExercises.length);

  useEffect(() => {
    if (selectedExercises.length > prevLengthRef.current) {
      if (selectedListRef.current) {
        selectedListRef.current.scrollTo({
          top: selectedListRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    prevLengthRef.current = selectedExercises.length;
  }, [selectedExercises.length]);
  
  // Filters State
  const [searchText, setSearchText] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Todos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Todos');

  // Feedback notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Translation helpers
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

  const loc = {
    editRoutine: language === 'es' ? 'Editar Rutina' : 'Edit Routine',
    routineDesigner: language === 'es' ? 'Diseñador de Rutina' : 'Routine Designer',
    cancel: language === 'es' ? 'Cancelar' : 'Cancel',
    routineNameLabel: language === 'es' ? 'Nombre de tu Nueva Rutina:' : 'Name of your New Routine:',
    routineNamePlaceholder: language === 'es' ? 'Ej. Torso Pesado, Rutina de Pierna A, Cardio & Core' : 'e.g. Heavy Upper Body, Leg Routine A, Cardio & Core',
    selectedExercisesTitle: language === 'es' ? 'Ejercicios Seleccionados' : 'Selected Exercises',
    emptySelectedList: language === 'es' ? 'Selecciona ejercicios de la biblioteca de la derecha para agregarlos a tu rutina' : 'Select exercises from the library on the right to add them to your routine',
    up: language === 'es' ? 'Subir' : 'Move Up',
    down: language === 'es' ? 'Bajar' : 'Move Down',
    remove: language === 'es' ? 'Remover' : 'Remove',
    updateRoutine: language === 'es' ? 'Actualizar Rutina' : 'Update Routine',
    saveRoutine: language === 'es' ? 'Guardar Rutina en PLNEXC' : 'Save Routine to PLNEXC',
    libraryTitle: language === 'es' ? 'Biblioteca de Ejercicios' : 'Exercise Library',
    searchPlaceholder: language === 'es' ? 'Buscar ejercicio por nombre...' : 'Search exercise by name...',
    noExercisesFound: language === 'es' ? 'No se encontraron ejercicios con los filtros seleccionados' : 'No exercises found with the selected filters',
    filterMuscle: language === 'es' ? 'Filtrar por Músculo:' : 'Filter by Muscle:',
    filterEquipment: language === 'es' ? 'Filtrar por Equipamiento:' : 'Filter by Equipment:',
    filterDifficulty: language === 'es' ? 'Filtrar por Dificultad (Ruta de Progreso):' : 'Filter by Difficulty (Progress Route):'
  };

  const filteredExercises = useMemo(() => {
    return allExercises.filter(ex => {
      const nameLocal = getExerciseName(ex.id, ex.title, language);
      const matchText = ex.title.toLowerCase().includes(searchText.toLowerCase()) ||
                        nameLocal.toLowerCase().includes(searchText.toLowerCase());
      const matchMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle;
      const matchEquipment = selectedEquipment === 'Todos' || ex.equipment === selectedEquipment;
      const matchDifficulty = selectedDifficulty === 'Todos' || ex.difficulty === selectedDifficulty;
      
      return matchText && matchMuscle && matchEquipment && matchDifficulty;
    });
  }, [searchText, selectedMuscle, selectedEquipment, selectedDifficulty, language, allExercises]);

  // Unique categories for selectors
  const muscles = ['Todos', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femorales', 'Glúteos', 'Pantorrillas', 'Core', 'Cuello', 'Cardio'];
  const equipments = ['Todos', 'Barra', 'Mancuerna', 'Peso Corporal', 'Polea/Cable', 'Banda', 'Otro'];
  const difficulties = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

  // Add exercise to custom routine
  const handleAddExercise = (exercise: Exercise) => {
    if (selectedExercises.some(e => e.id === exercise.id)) return;
    setSelectedExercises(prev => [...prev, exercise]);

    const name = getExerciseName(exercise.id, exercise.title, language);
    const msg = language === 'es' 
      ? `Se agregó "${name}" satisfactoriamente` 
      : `Successfully added "${name}"`;
    setNotification({ message: msg, type: 'success' });
    setTimeout(() => {
      setNotification(prev => prev?.message === msg ? null : prev);
    }, 2000);
  };

  // Remove exercise from custom routine
  const handleRemoveExercise = (exerciseId: string) => {
    const ex = allExercises.find(e => e.id === exerciseId);
    setSelectedExercises(prev => prev.filter(e => e.id !== exerciseId));

    const name = ex ? getExerciseName(ex.id, ex.title, language) : '';
    const msg = language === 'es' 
      ? `Se quitó "${name}" de la rutina` 
      : `Removed "${name}" from routine`;
    setNotification({ message: msg, type: 'info' });
    setTimeout(() => {
      setNotification(prev => prev?.message === msg ? null : prev);
    }, 2000);
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

  const handleUpdateExerciseRest = (exerciseId: string, restTime: number | undefined) => {
    setSelectedExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, restTime };
      }
      return ex;
    }));
  };

  // Save Custom Routine
  const handleSaveRoutine = () => {
    const trimmedName = routineName.trim();
    if (!trimmedName) {
      alert(language === 'es' ? 'Por favor, introduce un nombre para la rutina.' : 'Please enter a name for the routine.');
      return;
    }
    if (selectedExercises.length === 0) {
      alert(language === 'es' ? 'Por favor, añade al menos un ejercicio a tu rutina.' : 'Please add at least one exercise to your routine.');
      return;
    }
    
    // Save exercises with titles and restTime if specified
    const exercisesData = selectedExercises.map(e => {
      if (e.restTime !== undefined && e.restTime !== null && e.restTime > 0) {
        return { title: e.title, restTime: e.restTime };
      }
      return e.title;
    });
    onSave(trimmedName, exercisesData, isEditing ? editRoutineName : undefined);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Header Banner */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bookmark size={24} color="hsl(var(--primary))" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{isEditing ? loc.editRoutine : loc.routineDesigner}</h2>
        </div>
        <button className="btn btn-secondary" onClick={onCancel} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          <X size={16} /> {loc.cancel}
        </button>
      </div>

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Routine Form & Selected List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Routine Name Input */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <label style={{ fontSize: '0.9rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
              {loc.routineNameLabel}
            </label>
            <input 
              type="text" 
              value={routineName} 
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder={loc.routineNamePlaceholder}
              style={{ marginTop: '8px' }}
            />
          </div>

          {/* Selected Exercises Editor */}
          <div className="glass-panel" style={{ padding: '20px', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
              {loc.selectedExercisesTitle} ({selectedExercises.length})
            </h3>

            {selectedExercises.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'hsl(var(--muted))', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
                {loc.emptySelectedList}
              </div>
            ) : (
              <div 
                ref={selectedListRef}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  paddingRight: '6px'
                }}
              >
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '50%' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{getExerciseName(ex.id, ex.title, language)}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                          {translateMuscleGroup(ex.muscleGroup)} {ex.secondaryMuscleGroups && ex.secondaryMuscleGroups.length > 0 ? `(+ ${ex.secondaryMuscleGroups.map(m => translateMuscleGroup(m)).join(', ')})` : ''} • {translateEquipment(ex.equipment)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid hsla(var(--border) / 0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.8rem' }} title={language === 'es' ? 'Descanso' : 'Rest'}>⏱️</span>
                      <input 
                        type="number"
                        placeholder="Def"
                        min="0"
                        value={ex.restTime !== undefined ? ex.restTime : ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          handleUpdateExerciseRest(ex.id, isNaN(val) ? undefined : val);
                        }}
                        style={{
                          width: '40px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ffffff',
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          padding: 0,
                          outline: 'none'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>s</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        style={{ background: 'transparent', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.05)' : 'hsl(var(--muted))', cursor: idx === 0 ? 'default' : 'pointer' }}
                        title={loc.up}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button 
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === selectedExercises.length - 1}
                        style={{ background: 'transparent', border: 'none', color: idx === selectedExercises.length - 1 ? 'rgba(255,255,255,0.05)' : 'hsl(var(--muted))', cursor: idx === selectedExercises.length - 1 ? 'default' : 'pointer' }}
                        title={loc.down}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveExercise(ex.id)}
                        style={{ background: 'transparent', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', marginLeft: '6px' }}
                        title={loc.remove}
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
              <Check size={18} /> {isEditing ? loc.updateRoutine : loc.saveRoutine}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Library Search & Filters */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
            {loc.libraryTitle}
          </h3>

          {/* Text Search */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={loc.searchPlaceholder}
              style={{ paddingLeft: '36px' }}
            />
            <Search 
              size={18} 
              color="hsl(var(--muted))" 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
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
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsla(var(--primary) / 0.8) 100%)',
              color: '#000',
              border: 'none',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} />
            {language === 'es' ? 'Crear Ejercicio Personalizado' : 'Create Custom Exercise'}
          </button>

          {/* Category Dropdowns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{loc.filterMuscle}</label>
              <select value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)} style={{ padding: '6px 10px', marginTop: '4px' }}>
                {muscles.map(m => <option key={m} value={m}>{m === 'Todos' ? (language === 'es' ? 'Todos' : 'All') : translateMuscleGroup(m)}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{loc.filterEquipment}</label>
              <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)} style={{ padding: '6px 10px', marginTop: '4px' }}>
                {equipments.map(eq => <option key={eq} value={eq}>{eq === 'Todos' ? (language === 'es' ? 'Todos' : 'All') : translateEquipment(eq)}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>{loc.filterDifficulty}</label>
              <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} style={{ padding: '6px 10px', marginTop: '4px' }}>
                {difficulties.map(d => (
                  <option key={d} value={d}>
                    {d === 'Todos' ? (language === 'es' ? 'Todos' : 'All') : (
                      language === 'es' ? d : (
                        d === 'Principiante' ? 'Beginner' :
                        d === 'Intermedio' ? 'Intermediate' :
                        d === 'Avanzado' ? 'Advanced' : d
                      )
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exercises Library List */}
          <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', marginTop: '6px' }}>
            {filteredExercises.length === 0 ? (
              <div style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                {loc.noExercisesFound}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '75%' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ fontSize: '0.85rem' }}>{getExerciseName(ex.id, ex.title, language)}</strong>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{translateMuscleGroup(ex.muscleGroup)}</span>
                          {ex.secondaryMuscleGroups && ex.secondaryMuscleGroups.length > 0 && (
                            <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '1px 4px', background: 'rgba(255, 255, 255, 0.05)', color: 'hsl(var(--muted))', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              + {ex.secondaryMuscleGroups.map(m => translateMuscleGroup(m)).join(', ')}
                            </span>
                          )}
                          <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{translateEquipment(ex.equipment)}</span>
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
                            {language === 'es' ? ex.difficulty : (
                              ex.difficulty === 'Principiante' ? 'Beginner' :
                              ex.difficulty === 'Intermedio' ? 'Intermediate' :
                              ex.difficulty === 'Avanzado' ? 'Advanced' : ex.difficulty
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      style={{ 
                        padding: '6px', 
                        borderRadius: '50%', 
                        width: '28px', 
                        height: '28px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        border: isAdded ? '1px solid hsl(var(--primary))' : '1px solid rgba(255, 255, 255, 0.15)',
                        background: isAdded ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.03)',
                        color: isAdded ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                        boxShadow: isAdded ? '0 0 10px hsla(var(--primary) / 0.4)' : 'none'
                      }}
                      onClick={() => {
                        if (isAdded) {
                          handleRemoveExercise(ex.id);
                        } else {
                          handleAddExercise(ex);
                        }
                      }}
                      title={isAdded ? (language === 'es' ? 'Quitar de la rutina' : 'Remove from routine') : (language === 'es' ? 'Añadir a la rutina' : 'Add to routine')}
                    >
                      {isAdded ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Local Toast Notification System */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideUp 0.3s ease-out',
          color: '#ffffff',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '20px', 
            height: '20px', 
            minWidth: '20px',
            minHeight: '20px',
            flexShrink: 0,
            borderRadius: '50%', 
            background: notification.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--primary))',
            color: '#000000'
          }}>
            {notification.type === 'success' ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
          </span>
          {notification.message}
        </div>
      )}

      {onSaveCustomExercise && (
        <CreateExerciseModal
          isOpen={showCreateExerciseModal}
          onClose={() => setShowCreateExerciseModal(false)}
          onSave={onSaveCustomExercise}
          language={language}
          existingExercises={allExercises}
        />
      )}
    </div>
  );
}
