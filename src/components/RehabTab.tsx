import { useState } from 'react';
import { MILO_REHAB_PROTOCOLS } from '../utils/MiloRehabEngine';
import type { JointRehabProtocol, ScreenTest, CorrectiveExercise } from '../utils/MiloRehabEngine';
import { 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle,
  Activity,
  HeartPulse,
  BookOpen
} from 'lucide-react';

interface RehabTabProps {
  activeInjury: {
    joint: string;
    phase: number;
    weakness: string;
    painScale: number;
  } | null;
  setActiveInjury: (injury: any) => void;
}

export default function RehabTab({ activeInjury, setActiveInjury }: RehabTabProps) {
  const [selectedJoint, setSelectedJoint] = useState<string>('back');
  const [screeningAnswers, setScreeningAnswers] = useState<{ [testId: string]: boolean }>({});
  const [showScreening, setShowScreening] = useState<boolean>(false);
  const [painLevel, setPainLevel] = useState<number>(3);
  const [expandedInstructions, setExpandedInstructions] = useState<{[key: string]: boolean}>({});

  const protocol: JointRehabProtocol = MILO_REHAB_PROTOCOLS[selectedJoint];

  const handleTestToggle = (testId: string, failed: boolean) => {
    setScreeningAnswers(prev => ({
      ...prev,
      [testId]: failed
    }));
  };

  const handleStartScreening = (jointId: string) => {
    setSelectedJoint(jointId);
    setScreeningAnswers({});
    setShowScreening(true);
  };

  const handleAnalyzeScreening = () => {
    // Basic diagnostic rule engine based on Rebuilding Milo
    let diagnosedWeakness = '';
    let startingPhase = 1;

    if (selectedJoint === 'back') {
      if (screeningAnswers['flexion_tolerance']) {
        diagnosedWeakness = 'Intolerancia a la Flexión Lumbar';
      } else if (screeningAnswers['extension_tolerance']) {
        diagnosedWeakness = 'Intolerancia a la Extensión Lumbar';
      } else {
        diagnosedWeakness = 'Falta de Estabilidad del Núcleo (Core)';
      }
      // If severe pain (>5), phase 1. Otherwise, start phase 2.
      startingPhase = painLevel > 5 ? 1 : 2;
    } 
    
    else if (selectedJoint === 'shoulder') {
      if (screeningAnswers['impingement_test']) {
        diagnosedWeakness = 'Pinzamiento Subacromial';
        startingPhase = 1;
      } else if (screeningAnswers['internal_rotation']) {
        diagnosedWeakness = 'Déficit de Rotación Interna (GIRD)';
        startingPhase = 2;
      } else {
        diagnosedWeakness = 'Inestabilidad del Manguito Rotador';
        startingPhase = 2;
      }
    } 
    else if (selectedJoint === 'knee') {
      if (screeningAnswers['ankle_restriction']) {
        diagnosedWeakness = 'Restricción de Movilidad de Tobillo';
        startingPhase = 2;
      } else if (screeningAnswers['valgus_check']) {
        diagnosedWeakness = 'Inestabilidad de Cadera (Valgo Dinámico)';
        startingPhase = 2;
      } else {
        diagnosedWeakness = 'Tendinopatía Patelar (Falta de tolerancia)';
        startingPhase = 1;
      }
    }

    else if (selectedJoint === 'hip') {
      if (screeningAnswers['fadir_test']) {
        diagnosedWeakness = 'Pinzamiento Femoroacetabular (FAI)';
        startingPhase = 1;
      } else if (screeningAnswers['hip_extension_test']) {
        diagnosedWeakness = 'Acortamiento de Flexores de Cadera';
        startingPhase = 2;
      } else {
        diagnosedWeakness = 'Inestabilidad Lumbo-Pélvica (Glúteo Medio Débil)';
        startingPhase = 1;
      }
    }

    else if (selectedJoint === 'ankle') {
      if (screeningAnswers['ankle_dorsiflexion_test']) {
        diagnosedWeakness = 'Restricción de Dorsiflexión (Tope Articular)';
        startingPhase = 1;
      } else if (screeningAnswers['ankle_instability_test']) {
        diagnosedWeakness = 'Inestabilidad Crónica de Tobillo';
        startingPhase = 2;
      } else {
        diagnosedWeakness = 'Tendinopatía de Aquiles';
        startingPhase = 1;
      }
    }

    else if (selectedJoint === 'elbow') {
      if (screeningAnswers['cozens_test']) {
        diagnosedWeakness = 'Epicondilitis Lateral (Codo de Tenista)';
        startingPhase = 1;
      } else if (screeningAnswers['golfers_elbow_test']) {
        diagnosedWeakness = 'Epicondilitis Medial (Codo de Golfista)';
        startingPhase = 1;
      } else {
        diagnosedWeakness = 'Debilidad Dinámica de Muñeca y Agarre';
        startingPhase = 2;
      }
    }
 
     setActiveInjury({
       joint: selectedJoint,
       phase: startingPhase,
       weakness: diagnosedWeakness,
       painScale: painLevel
     });
     setShowScreening(false);
   };
 
   const handleClearInjury = () => {
     if (window.confirm('¿Te has recuperado por completo de tu molestia? ¡Felicidades! Se reestablecerá tu entrenamiento habitual.')) {
       setActiveInjury(null);
     }
   };
 
   const handleProgressPhase = () => {
     if (activeInjury && activeInjury.phase < 3) {
       setActiveInjury({
         ...activeInjury,
         phase: activeInjury.phase + 1
       });
     }
   };
 
   return (
     <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
       
       {/* HEADER SECTION */}
       <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <HeartPulse size={36} color="hsl(var(--warning))" />
           <div>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>PLNEXC Rehab Assistant</h2>
             <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
               Autoevaluación física y rehabilitación de lesiones adaptada para PLNEXC (según Aaron Horschig)
             </p>
           </div>
         </div>
       </div>
 
       {/* ACTIVE REHAB PROTOCOL BOX */}
       {activeInjury ? (
         <div className="glass-panel glass-panel-glow" style={{ padding: '24px', borderLeft: '4px solid hsl(var(--warning))' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
             <div>
               <span className="badge badge-warning" style={{ marginBottom: '8px' }}>
                 Protocolo Activo: {MILO_REHAB_PROTOCOLS[activeInjury.joint]?.displayName}
               </span>
               <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                 Eslabón Débil Detectado: <span style={{ color: 'hsl(var(--warning))' }}>{activeInjury.weakness}</span>
               </h3>
               <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '4px', maxWidth: '600px' }}>
                 Estás actualmente en la <strong>{MILO_REHAB_PROTOCOLS[activeInjury.joint]?.phases[activeInjury.phase]?.name}</strong>. 
                 El algoritmo ha modificado de forma adaptativa tu rutina de entrenamiento y ha integrado este calentamiento obligatorio.
               </p>
             </div>
             
             <div style={{ display: 'flex', gap: '10px' }}>
               {activeInjury.phase < 3 && (
                 <button className="btn btn-secondary" onClick={handleProgressPhase} style={{ color: 'hsl(var(--success))' }}>
                   Avanzar de Fase
                 </button>
               )}
               <button className="btn btn-danger" onClick={handleClearInjury}>
                 Marcar como Recuperado
               </button>
             </div>
           </div>
 
           <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: '20px', paddingTop: '20px' }}>
             <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '12px' }}>
               <ShieldAlert size={18} color="hsl(var(--warning))" />
               Rutina Correctiva Recomendada
             </h4>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               {MILO_REHAB_PROTOCOLS[activeInjury.joint]?.phases[activeInjury.phase]?.exercises.map((ex: CorrectiveExercise) => (
                 <div 
                   key={ex.id} 
                   style={{ 
                     padding: '16px', 
                     background: 'rgba(255,255,255,0.02)', 
                     borderRadius: '12px',
                     border: '1px solid hsl(var(--border))'
                   }}
                 >
                   <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                     <strong style={{ color: 'hsl(var(--warning))' }}>{ex.name}</strong>
                     <span className="badge badge-primary">{ex.sets} series x {ex.reps}</span>
                   </div>
                   <p style={{ fontSize: '0.875rem', color: '#e5e7eb', marginBottom: ex.instructions ? '12px' : '0' }}>
                     {ex.description}
                   </p>

                   {ex.instructions && (
                     <div style={{ marginTop: '8px' }}>
                       {(() => {
                         const isExpanded = !!expandedInstructions[ex.id];
                         return (
                           <>
                             <button
                               onClick={() => setExpandedInstructions(prev => ({ ...prev, [ex.id]: !isExpanded }))}
                               style={{
                                 background: 'none',
                                 border: 'none',
                                 color: 'hsl(var(--primary))',
                                 fontSize: '0.75rem',
                                 fontWeight: 600,
                                 cursor: 'pointer',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '4px',
                                 padding: 0
                               }}
                             >
                               <BookOpen size={12} />
                               <span>{isExpanded ? 'Ocultar guía de técnica' : 'Ver guía de técnica paso a paso'}</span>
                             </button>

                             {isExpanded && (
                               <div style={{ 
                                 marginTop: '12px', 
                                 padding: '12px', 
                                 background: 'rgba(0,0,0,0.15)', 
                                 borderRadius: '8px', 
                                 border: '1px solid rgba(255,255,255,0.05)',
                                 display: 'flex',
                                 flexDirection: 'column',
                                 gap: '12px'
                               }}>
                                 {ex.image && (
                                   <div style={{ width: '100%', maxHeight: '160px', overflow: 'hidden', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                     <img 
                                       src={ex.image} 
                                       alt={ex.name} 
                                       loading="lazy" 
                                       style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                       onError={(e) => {
                                         (e.target as HTMLImageElement).style.display = 'none';
                                       }}
                                     />
                                   </div>
                                 )}
                                 <ol style={{ paddingLeft: '16px', margin: 0, fontSize: '0.8rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.4' }}>
                                   {ex.instructions.map((step, sIdx) => (
                                     <li key={sIdx}>{step}</li>
                                   ))}
                                 </ol>
                               </div>
                             )}
                           </>
                         );
                       })()}
                     </div>
                   )}
                 </div>
               ))}
             </div>
           </div>
         </div>
       ) : null}
 
       {/* JOINT SELECTOR & SCREENING SECTION */}
       {!showScreening && !activeInjury ? (
         <div className="glass-panel" style={{ padding: '24px' }}>
           <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>¿Sientes molestias en algún levantamiento?</h3>
           <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginBottom: '20px' }}>
             Selecciona la articulación afectada para iniciar tu sesión de evaluación física y obtener un diagnóstico clínico.
           </p>
 
           <div className="grid-cols-3">
              {Object.values(MILO_REHAB_PROTOCOLS).map((jointProto) => {
                const isSelected = selectedJoint === jointProto.joint;
                return (
                  <div 
                    key={jointProto.joint}
                    className="glass-panel" 
                    style={{ 
                      padding: '24px 20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '16px', 
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderWidth: '1px',
                      borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      background: isSelected ? 'hsla(var(--primary) / 0.03)' : 'hsla(var(--bg-card-glass))',
                      boxShadow: isSelected ? '0 4px 20px hsla(var(--primary) / 0.1)' : 'var(--shadow-sm)',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      transition: 'all var(--transition-smooth)'
                    }}
                    onClick={() => setSelectedJoint(jointProto.joint)}
                  >
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '50%', 
                      background: isSelected ? 'hsla(var(--primary) / 0.1)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid',
                      borderColor: isSelected ? 'hsla(var(--primary) / 0.3)' : 'hsl(var(--border))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all var(--transition-fast)'
                    }}>
                      <Activity size={26} color={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '1.1rem', color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)' }}>{jointProto.displayName}</strong>
                      <p style={{ color: 'hsl(var(--muted))', fontSize: '0.75rem', marginTop: '4px' }}>
                        {jointProto.screens.length} Pruebas de Movilidad
                      </p>
                    </div>
                    <button 
                      className={"btn " + (isSelected ? "btn-primary" : "btn-secondary")}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartScreening(jointProto.joint);
                      }}
                    >
                      Evaluar Articulación
                    </button>
                  </div>
                );
              })}
            </div>
         </div>
       ) : null}
 
       {/* ACTIVE SCREENING INTERACTIVE MODAL/CARD */}
       {showScreening && (
         <div className="glass-panel" style={{ padding: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '16px', marginBottom: '20px' }}>
             <div>
               <span className="badge badge-primary">Evaluación en Progreso</span>
               <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                 Diagnóstico de: {protocol.displayName}
               </h3>
             </div>
             <button className="btn btn-secondary" onClick={() => setShowScreening(false)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
               Cancelar
             </button>
           </div>

            {/* Pain Scale Selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.9rem', color: 'hsl(var(--muted))', fontWeight: 600 }}>
                ¿Qué nivel de dolor o molestia experimentas habitualmente en esta articulación? (1-10)
              </label>
              <div className="pain-scale-container" style={{ marginTop: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                  const isSelected = painLevel === val;
                  let colorStr = 'hsl(var(--success))';
                  if (val > 6) {
                    colorStr = 'hsl(var(--danger))';
                  } else if (val > 3) {
                    colorStr = 'hsl(var(--warning))';
                  }
                  
                  return (
                    <button
                      key={val}
                      className={`pain-btn ${isSelected ? 'selected' : ''}`}
                      style={{ 
                        color: isSelected ? '#07080c' : colorStr,
                        background: isSelected ? colorStr : 'rgba(255,255,255,0.02)',
                        borderColor: isSelected ? colorStr : 'hsl(var(--border))',
                        boxShadow: isSelected ? `0 0 15px ${colorStr}` : 'none'
                      }}
                      onClick={() => setPainLevel(val)}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--muted))', marginTop: '4px' }}>
              <span>Leve rigidez (1)</span>
              <span>Moderado (5)</span>
              <span>Dolor Agudo / Impedimento (10)</span>
            </div>
            </div>

          {/* Interactive Screen Tests */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '1.1rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
              Pruebas Físicas Obligatorias
            </h4>
            
            {protocol.screens.map((screen: ScreenTest, idx) => (
              <div 
                key={screen.id} 
                className="glass-panel" 
                style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid hsl(var(--primary))' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <HelpCircle size={18} color="hsl(var(--primary))" />
                  <strong>Test #{idx+1}: {screen.name}</strong>
                </div>
                
                <p style={{ fontSize: '0.875rem', color: '#e5e7eb', marginBottom: '10px' }}>
                  <strong>Cómo hacerlo:</strong> {screen.instruction}
                </p>
                
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', color: 'hsl(var(--muted))', marginBottom: '12px' }}>
                  <strong>Criterio de Fallo:</strong> {screen.criteria}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className={`btn ${screeningAnswers[screen.id] === true ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => handleTestToggle(screen.id, true)}
                  >
                    ⚠️ Siento Dolor / Restricción (Falla)
                  </button>
                  <button 
                    className={`btn ${screeningAnswers[screen.id] === false ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => handleTestToggle(screen.id, false)}
                  >
                    <CheckCircle2 size={16} /> Pasa Correctamente
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '24px', padding: '12px' }}
            onClick={handleAnalyzeScreening}
          >
            Analizar Diagnóstico e Iniciar Rehabilitación
          </button>
        </div>
      )}

      {/* PHILOSOPHY ALERT */}
      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(0, 242, 254, 0.02)', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <ShieldAlert size={24} color="hsl(var(--primary))" />
        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))' }}>
          <strong>Filosofía PLNEXC Rehab:</strong> "Nunca permitas que la lesión te detenga". Si un ejercicio te causa dolor en la escala de 3 o superior,
          utiliza el botón de sustituto de la rutina. La sobrecarga progresiva solo funciona si no hay dolor de por medio.
        </span>
      </div>

    </div>
  );
}
