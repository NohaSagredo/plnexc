import { 
  Info, 
  TrendingUp, 
  Flame, 
  HeartPulse, 
  Activity
} from 'lucide-react';

export default function AlgorithmsTab() {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Info size={36} color="hsl(var(--primary))" />
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Motor de Decisiones Inteligentes</h2>
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.875rem', marginTop: '2px' }}>
            Documentación y fundamentos matemáticos del algoritmo de entrenamiento y el protocolo clínico
          </p>
        </div>
      </div>

      {/* Grid containing explaining cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1RM Epley */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--primary))' }}>
            <TrendingUp size={20} />
            1. Estimación de Fuerza Máxima (Fórmula de Epley)
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '14px', lineHeight: '1.6' }}>
            Para calcular tu progreso de fuerza a lo largo del historial sin necesidad de realizar levantamientos de esfuerzo máximo de una repetición (1RM) reales —lo cual aumenta exponencialmente el riesgo de lesión— la app utiliza la fórmula de <strong>Epley</strong> para estimar tu 1RM teórico:
          </p>
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '16px', 
            borderRadius: '8px', 
            textAlign: 'center', 
            fontFamily: 'monospace', 
            fontSize: '1.2rem', 
            border: '1px solid hsl(var(--border))',
            margin: '12px 0',
            color: 'hsl(var(--primary))'
          }}>
            1RM = Peso × (1 + Repeticiones / 30)
          </div>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', lineHeight: '1.5' }}>
            <strong>Aplicación práctica:</strong> Si registraste 50kg en Sentadilla para 10 repeticiones, tu 1RM estimado será: 50 × (1 + 10/30) = 66.67 kg. Esta cifra sirve como referencia para trazar tus curvas del panel de progreso y medir tu ganancia de fuerza absoluta.
          </p>
        </div>

        {/* Double Progression */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc' }}>
            <Flame size={20} />
            2. Algoritmo de Progresión Doble (Double Progression)
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '14px', lineHeight: '1.6' }}>
            La progresión lineal simple (añadir peso cada sesión) falla rápidamente. Por eso, el coach aplica un sistema de <strong>Doble Progresión</strong>. Primero aumentamos repeticiones dentro de un rango predefinido; una vez dominado, aumentamos el peso.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Rangos de Repeticiones según Tipo de Ejercicio:</h4>
            <ul style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Ejercicios Compuestos (Banca, Sentadilla, Militar):</strong> Rango 6 - 10 repeticiones.</li>
              <li><strong>Ejercicios de Aislamiento (Bíceps, Elevaciones, Extensiones):</strong> Rango 10 - 15 repeticiones.</li>
              <li><strong>Ejercicios de Alta Resistencia (Gemelo, Antebrazo, Abdomen):</strong> Rango 15 - 25 repeticiones.</li>
            </ul>
          </div>

          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>El Flujo Algorítmico:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span className="badge badge-success">SÍ</span>
                <span style={{ color: '#e5e7eb' }}>
                  <strong>¿Hiciste el máximo de reps en TODAS las series efectivas?</strong> <br />
                  El coach aumenta la carga en el próximo entrenamiento (<strong>+2.5 kg</strong> en barra, <strong>+1.0 kg</strong> en mancuernas) y baja la recomendación de repeticiones al rango mínimo (ej. de 10 a 6).
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '6px' }}>
                <span className="badge badge-primary">NO</span>
                <span style={{ color: '#e5e7eb' }}>
                  <strong>¿Aún no has completado el rango máximo en alguna serie?</strong> <br />
                  El peso se mantiene igual para la siguiente sesión, pero el coach te exige intentar hacer <strong>mínimo 1 repetición más</strong> que en tu peor serie del historial actual.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fatigue Autoregulation */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--warning))' }}>
            <Activity size={20} />
            3. Autorregulación por Fatiga (Wellness Deload)
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '12px', lineHeight: '1.6' }}>
            El sistema nervioso y los músculos no rinden igual todos los días debido al estrés diario, sueño o mala alimentación. Si el motor forzara el peso programado, corres el riesgo de estancamiento o lesión.
          </p>
          <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', color: '#fef08a' }}>
            <strong>Criterio de Descarga por Fatiga (Deload):</strong> <br />
            Antes de entrenar, indicas tu puntuación de bienestar. Si es <strong>4 o inferior</strong>, el motor aplica automáticamente un <strong>Deload de Fatiga</strong>: reduce un 10% el peso objetivo del entrenamiento de ese día y limita las repeticiones al rango mínimo. Esto te permite entrenar con un volumen que tu cuerpo sí puede asimilar sin acumular sobreentrenamiento.
          </div>
        </div>

        {/* Pain & Rehab (Rebuilding Milo) */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--danger))' }}>
            <HeartPulse size={20} />
            4. Motor Adaptativo al Dolor e Integración "PLNEXC Rehab"
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '14px', lineHeight: '1.6' }}>
            Inspirada directamente en las reglas de diagnóstico de movimiento del Dr. Aaron Horschig, la app entrelaza el dolor con las decisiones de carga física:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderLeft: '3px solid hsl(var(--danger))', paddingLeft: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Reducción de Peso por Dolor (Active Recovery):</h4>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', marginTop: '2px' }}>
                Si durante el entrenamiento marcas el botón de <strong>"Molestia / Dolor"</strong> en cualquier serie, el algoritmo anula los cálculos normales de progresión. Para la siguiente sesión de ese ejercicio, aplicará una <strong>reducción inmediata del 20% del peso</strong> y te sugerirá centrarte exclusivamente en el control y recorrido perfecto sin dolor.
              </p>
            </div>

            <div style={{ borderLeft: '3px solid hsl(var(--warning))', paddingLeft: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Árbol de Decisión de Sustitución de Ejercicios:</h4>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted))', marginTop: '2px' }}>
                Cuando tienes una lesión activa registrada en <strong>Rehab PLNEXC</strong>, el motor intercepta tu rutina y aplica reglas de exclusión/sustitución biomecánica.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                    <th style={{ padding: '6px' }}>Ejercicio Original</th>
                    <th style={{ padding: '6px' }}>Sustituto Programado</th>
                    <th style={{ padding: '6px' }}>Razón Biomecánica</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>Sentadilla con barra</td>
                    <td style={{ padding: '8px 6px', color: 'hsl(var(--primary))' }}>Goblet Squat a Caja</td>
                    <td style={{ padding: '8px 6px' }}>Menor cizallamiento en lumbar, torso más erguido.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>Press de Banca Barra</td>
                    <td style={{ padding: '8px 6px', color: 'hsl(var(--primary))' }}>Press con Mancuernas Neutro</td>
                    <td style={{ padding: '8px 6px' }}>Permite rotación del hombro libre, disminuye pinzamiento.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>Peso Muerto Barra</td>
                    <td style={{ padding: '8px 6px', color: 'hsl(var(--primary))' }}>Rack Pulls (desde bloques)</td>
                    <td style={{ padding: '8px 6px' }}>Acorta el rango de movimiento inferior evitando flexión de columna.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
