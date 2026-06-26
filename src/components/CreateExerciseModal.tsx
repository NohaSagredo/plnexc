import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Dumbbell, AlertCircle } from 'lucide-react';
import type { Exercise } from '../data/exercises_db';

interface CreateExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: Omit<Exercise, 'id'>) => void;
  language: 'es' | 'en';
  existingExercises: Exercise[];
}

export default function CreateExerciseModal({
  isOpen,
  onClose,
  onSave,
  language,
  existingExercises
}: CreateExerciseModalProps) {
  const [title, setTitle] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<Exercise['muscleGroup']>('Pecho');
  const [equipment, setEquipment] = useState<Exercise['equipment']>('Mancuerna');
  const [difficulty, setDifficulty] = useState<Exercise['difficulty']>('Intermedio');
  const [description, setDescription] = useState('');
  const [isTimeBased, setIsTimeBased] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loc = {
    es: {
      modalTitle: 'Crear Ejercicio Personalizado',
      nameLabel: 'Nombre del Ejercicio *',
      namePlaceholder: 'Ej. Elevaciones Laterales con Polea',
      muscleLabel: 'Grupo Muscular Principal',
      equipmentLabel: 'Equipamiento',
      difficultyLabel: 'Dificultad sugerida',
      descriptionLabel: 'Descripción / Notas (Opcional)',
      descriptionPlaceholder: 'Notas sobre la técnica, postura o ejecución...',
      measurementLabel: 'Método de Medición',
      repsWeightOption: 'Peso y Repeticiones (Estándar)',
      timeDistanceOption: 'Tiempo / Isométrico (Ej. Planchas, Colgadas, Cardio)',
      errorDuplicate: 'Ya existe un ejercicio con este nombre o ID.',
      errorEmpty: 'El nombre es obligatorio.',
      saveBtn: 'Guardar Ejercicio',
      cancelBtn: 'Cancelar',
      // Muscle options
      Pecho: 'Pecho',
      Espalda: 'Espalda',
      Hombros: 'Hombros',
      Bíceps: 'Bíceps',
      Tríceps: 'Tríceps',
      Cuádriceps: 'Cuádriceps',
      Femorales: 'Femorales',
      Glúteos: 'Glúteos',
      Pantorrillas: 'Pantorrillas',
      Core: 'Core / Abdomen',
      Cuello: 'Cuello',
      Cardio: 'Cardio / Aeróbico',
      // Equipment options
      Barra: 'Barra',
      Mancuerna: 'Mancuerna',
      'Peso Corporal': 'Peso Corporal',
      'Polea/Cable': 'Polea / Cable',
      Banda: 'Banda Elástica',
      Otro: 'Otro',
      // Difficulty options
      Principiante: 'Principiante',
      Intermedio: 'Intermedio',
      Avanzado: 'Avanzado'
    },
    en: {
      modalTitle: 'Create Custom Exercise',
      nameLabel: 'Exercise Name *',
      namePlaceholder: 'e.g. Cable Lateral Raises',
      muscleLabel: 'Primary Muscle Group',
      equipmentLabel: 'Equipment',
      difficultyLabel: 'Suggested Difficulty',
      descriptionLabel: 'Description / Notes (Optional)',
      descriptionPlaceholder: 'Notes on form, setup, or technique...',
      measurementLabel: 'Measurement Method',
      repsWeightOption: 'Weight & Reps (Standard)',
      timeDistanceOption: 'Time-Based / Isometric (e.g. Planks, Holds, Cardio)',
      errorDuplicate: 'An exercise with this name or ID already exists.',
      errorEmpty: 'Exercise name is required.',
      saveBtn: 'Save Exercise',
      cancelBtn: 'Cancel',
      // Muscle options
      Pecho: 'Chest',
      Espalda: 'Back',
      Hombros: 'Shoulders',
      Bíceps: 'Biceps',
      Tríceps: 'Triceps',
      Cuádriceps: 'Quads',
      Femorales: 'Hamstrings',
      Glúteos: 'Glutes',
      Pantorrillas: 'Calves',
      Core: 'Core / Abs',
      Cuello: 'Neck',
      Cardio: 'Cardio / Aerobic',
      // Equipment options
      Barra: 'Barbell',
      Mancuerna: 'Dumbbell',
      'Peso Corporal': 'Bodyweight',
      'Polea/Cable': 'Cable / Pulley',
      Banda: 'Resistance Band',
      Otro: 'Other',
      // Difficulty options
      Principiante: 'Beginner',
      Intermedio: 'Intermediate',
      Avanzado: 'Advanced'
    }
  }[language];

  const muscles: Exercise['muscleGroup'][] = [
    'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femorales', 'Glúteos', 'Pantorrillas', 'Core', 'Cuello', 'Cardio'
  ];

  const equipments: Exercise['equipment'][] = [
    'Barra', 'Mancuerna', 'Peso Corporal', 'Polea/Cable', 'Banda', 'Otro'
  ];

  const difficulties: Exercise['difficulty'][] = [
    'Principiante', 'Intermedio', 'Avanzado'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(loc.errorEmpty);
      return;
    }

    // Uniqueness validation
    const cleanTitle = trimmedTitle.toLowerCase();
    const isDuplicate = existingExercises.some(
      ex => ex.title.toLowerCase() === cleanTitle || 
            (ex.nameEs && ex.nameEs.toLowerCase() === cleanTitle) || 
            (ex.nameEn && ex.nameEn.toLowerCase() === cleanTitle)
    );

    if (isDuplicate) {
      setError(loc.errorDuplicate);
      return;
    }

    onSave({
      title: trimmedTitle,
      muscleGroup,
      equipment,
      difficulty,
      description: description.trim(),
      isTimeBased
    });

    // Reset form states
    setTitle('');
    setDescription('');
    setMuscleGroup('Pecho');
    setEquipment('Mancuerna');
    setDifficulty('Intermedio');
    setIsTimeBased(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
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
      zIndex: 10050,
      padding: '20px'
    }}>
      <div className="glass-panel fade-in" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '24px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        border: '1px solid hsl(var(--border))'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dumbbell size={20} color="hsl(var(--primary))" />
            {loc.modalTitle}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'hsl(var(--muted))', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgb(239, 68, 68)',
            padding: '10px 12px',
            borderRadius: '8px',
            color: 'rgb(248, 113, 113)',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Exercise Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{loc.nameLabel}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={loc.namePlaceholder}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          {/* Muscle Group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{loc.muscleLabel}</label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as Exercise['muscleGroup'])}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {muscles.map(m => (
                <option key={m} value={m} style={{ background: '#121620', color: '#fff' }}>
                  {loc[m]}
                </option>
              ))}
            </select>
          </div>

          {/* Equipment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{loc.equipmentLabel}</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Exercise['equipment'])}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {equipments.map(eq => (
                <option key={eq} value={eq} style={{ background: '#121620', color: '#fff' }}>
                  {loc[eq]}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{loc.difficultyLabel}</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Exercise['difficulty'])}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {difficulties.map(d => (
                <option key={d} value={d} style={{ background: '#121620', color: '#fff' }}>
                  {loc[d]}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{loc.descriptionLabel}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={loc.descriptionPlaceholder}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Measurement / Time-based */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{loc.measurementLabel}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="isTimeBased"
                  checked={!isTimeBased}
                  onChange={() => setIsTimeBased(false)}
                  style={{ cursor: 'pointer' }}
                />
                <span>{loc.repsWeightOption}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="isTimeBased"
                  checked={isTimeBased}
                  onChange={() => setIsTimeBased(true)}
                  style={{ cursor: 'pointer' }}
                />
                <span>{loc.timeDistanceOption}</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px' }}
            >
              {loc.cancelBtn}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px' }}
            >
              {loc.saveBtn}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
