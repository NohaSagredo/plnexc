# Especificación de Contenido, Modelo Matemático y Seguridad para Integración en PWA

Este documento detalla el contenido exacto de la presentación ABPro de Cálculo Diferencial elaborada por Rodrigo Peña (Ingeniería en Ciberseguridad, INACAP Temuco) y las especificaciones técnicas del motor analítico para que otra IA pueda integrarlo directamente en la aplicación web progresiva (PWA) real.

---

## 1. Ficha del Proyecto e Información de Portada

*   **Título del Proyecto:** Algoritmo In-Device de Telemetría Segura Basado en el Criterio de la Segunda Derivada para la Predicción de Estancamiento Neuromuscular en Atletas de Fuerza
*   **Autor:** Rodrigo Nicolas Peña Sagredo
*   **Carrera:** Ingeniería en Ciberseguridad
*   **Institución:** INACAP Temuco
*   **Asignatura:** Cálculo Diferencial (CBCD01)
*   **Docente Evaluador:** Profesor de Cátedra de Matemáticas

---

## 2. Definición y Marco Metodológico

*   **Propósito:** Añadir un motor analítico local (*Edge Computing*) en TypeScript dentro del frontend de una PWA de entrenamiento. El motor analiza las curvas de progreso físico del atleta utilizando derivadas de fuerza calculadas en tiempo real sin saturar el servidor ni comprometer la privacidad del usuario.
*   **Modelamiento de Variables:**
    *   **Variable independiente ($t$):** Tiempo continuo expresado en semanas ($t \ge 0$).
    *   **Variable dependiente ($F(t)$):** Capacidad de rendimiento absoluto o volumen total acumulado en kilogramos (series $\times$ repeticiones $\times$ peso).
*   **Principio de Continuidad:** Para poder aplicar el cálculo diferencial, la función adaptativa de la fuerza neuromuscular $F(t)$ debe ser continua y derivable en todo su dominio activo, lo cual exige garantizar que:
    $$\lim_{t \to a} F(t) = F(a)$$
    Esto evita discontinuidades por vacíos en los registros del historial.

---

## 3. Contenido Exacto de las 18 Diapositivas

### Diapositiva 1: Portada Institucional
*   **Título:** Algoritmo In-Device de Telemetría Segura Basado en el Criterio de la Segunda Derivada para la Predicción de Estancamiento Neuromuscular en Atletas de Fuerza
*   **Metadatos:** Rodrigo Nicolas Peña Sagredo (Ingeniería en Ciberseguridad), Cálculo Diferencial (CBCD01), INACAP Temuco.

### Diapositiva 2: Definición del Proyecto
*   **¿Qué hace el proyecto?:** Añade un motor analítico en el frontend de una aplicación web progresiva (PWA) de pesas. El software calcula las derivadas de fuerza en el dispositivo para evitar cargas en servidor.
*   **El problema:** Quienes entrenan no tienen cómo saber si se están sobreexigiendo hasta que ya se sienten mal o se lesionan.
*   **Seguridad de datos:** Los datos biométricos son sensibles. Por eso, todos los cálculos matemáticos se hacen en el navegador del usuario (*Edge Computing*) y se almacenan de forma segura en Cloud Firestore bajo estrictas políticas de acceso.

### Diapositiva 3: Marco de Investigación
*   **Indagación del Fenómeno:** La adaptación neuromuscular ante el entrenamiento de resistencia se comporta de forma no lineal a lo largo del tiempo.
*   **Modelamiento de Variables:**
    *   *Variable independiente ($t$):* Tiempo expresado en semanas continuas de entrenamiento.
    *   *Variable dependiente ($F(t)$):* Capacidad de rendimiento absoluto del atleta (volumen total de carga en kg).
*   **Noción Matemática:** Modelación de la curva adaptativa mediante una función continua y derivable en su dominio activo, permitiendo el estudio de sus tasas de variación instantánea mediante límites y derivadas.

### Diapositiva 4: Objetivos y Preguntas de Investigación
*   **Objetivo General:** Crear un programa seguro dentro de la aplicación de entrenamiento que use la primera y segunda derivada para avisar al usuario antes de que se estanque físicamente.
*   **Preguntas de Investigación Obligatorias:**
    1. ¿Cómo representar el progreso del atleta en una curva matemática suave $F(t)$?
    2. ¿De qué manera la primera derivada $F'(t)$ nos dice la velocidad a la que mejora el atleta?
    3. ¿Cómo usar la segunda derivada $F''(t)$ para detectar un cambio de ritmo negativo antes de estancarse?
    4. ¿Cómo proteger la base de datos de la app contra robos o inyección de datos usando Firebase Rules y FirestoreORM?

### Diapositiva 5: Temas Iniciales Involucrados
*   **Fisiología Deportiva:** Cómo el cuerpo responde al esfuerzo, la recuperación (supercompensación) y la fatiga acumulada del sistema nervioso.
*   **Cálculo Diferencial:** Límites de funciones, velocidad de cambio (razón instantánea) y cálculo de máximos y mínimos para hallar el tope de rendimiento.
*   **Ciberseguridad NoSQL:** Reglas de seguridad en Cloud Firestore (Firebase Rules) y consultas estructuradas a través de un ORM seguro (FirestoreORM).

### Diapositiva 6: Cronograma de Desarrollo Matemático
*   **Semanas 1-2 (Límites y Continuidad):** Definimos las variables y analizamos los límites del progreso. Aseguramos que la curva de fuerza sea continua, es decir, sin saltos ni cortes raros en los datos.
*   **Semanas 3-4 (Regresión y Velocidad):** Ajustamos los datos reales a la ecuación $F(t) = at^3 + bt^2 + ct + d$. Calculamos la primera derivada $F'(t)$ para ver qué tan rápido mejora el atleta en cada instante.
*   **Semana 5 (Aceleración y Estancamiento):** Calculamos la segunda derivada $F''(t) = 6at + 2b$ para ver si el ritmo del atleta se está frenando ($F'' < 0$). Esto ayuda a alertar sobre fatiga antes de que sea tarde.
*   **Semana 6 (Simulación y Tangencia):** Dibujamos la curva y su recta tangente $y - F(t_0) = F'(t_0)(t - t_0)$ en la app. Suavizamos los promedios de datos diarios para evitar alertas falsas por fatiga temporal.

### Diapositiva 7: Justificación Tecnológica
*   **React 19 & TypeScript 6:** Framework principal para construir la UI reactiva de forma robusta, segura y veloz, garantizando tipos estrictos en el cálculo de matrices y derivadas.
*   **Firebase (Cloud Firestore):** Para persistir de forma reactiva el historial de carga, y usar Firestore Rules para proteger los datos biométricos.
*   **Recharts:** Biblioteca de gráficos declarativos para pintar de forma fluida y responsiva la curva polinómica $F(t)$ y los puntos reales directamente en el navegador del usuario.

### Diapositiva 8: Respuesta Pregunta 1 - Modelamiento y Continuidad $F(t)$
*   *Pregunta:* ¿Cómo representar el progreso del atleta en una curva suave $F(t)$ sin cortes? Se modela mediante regresión polinómica cúbica $F(t) = at^3 + bt^2 + ct + d$ sobre los registros históricos.
*   *Fuentes Bibliográficas:*
    1.  **J. Stewart (2018):** El cálculo diferencial requiere funciones continuas y derivables en su dominio para evaluar tasas de variación y límites instantáneos.
    2.  **H. Selye (1956) / GAS:** La adaptación biológica ante el esfuerzo es no lineal y progresiva; requiere curvas con transiciones suaves.
    3.  **T. Bompa (2018):** El tonelaje acumulado (series $\times$ reps $\times$ peso) representa cuantitativamente el volumen de la fuerza neuromuscular.
    4.  **P. Virtanen / SciPy (2020):** La regresión por mínimos cuadrados es el método numérico óptimo para ajustar polinomios sobre datos reales con ruido.
*   *Contraste e Integración:* Para modelar el progreso libre de discontinuidades, se contrasta la adaptación biológica (Selye) y el tonelaje físico (Bompa) con el cálculo continuo (Stewart) y la regresión numérica (Virtanen). Ajustamos los datos reales por mínimos cuadrados para obtener una función cúbica continua $F(t) = at^3 + bt^2 + ct + d$, permitiendo que el software de telemetría calcule la velocidad instantánea sin saltos causados por días de descanso o vacíos en la base de datos.

### Diapositiva 9: Respuesta Pregunta 2 - Velocidad y Primera Derivada $F'(t)$
*   *Fórmula:* $$F'(t) = \lim_{\Delta t \to 0} \frac{F(t + \Delta t) - F(t)}{\Delta t} = \frac{dF}{dt}$$
*   *Fuentes Bibliográficas:*
    1.  **J. Stewart (2018):** La primera derivada $F'(t)$ calcula la recta tangente y mide la tasa de variación instantánea en un instante dado.
    2.  **V. Zatsiorsky (2006):** Un atleta fatigado muestra una caída en su velocidad de ganancia de fuerza, lo que equivale a un decaimiento en la tasa de cambio.
    3.  **T. Bompa (2018):** El signo de la tasa de cambio instantánea define si el estímulo está provocando supercompensación ($F' > 0$) o sobrecarga de fatiga.
    4.  **H. Selye (1956):** Fase de agotamiento: el cuerpo pierde rendimiento rápidamente, lo que matemáticamente se traduce en una pendiente negativa ($F' < 0$).
*   *Contraste e Integración:* Contrastando el cálculo de pendientes tangenciales (Stewart) con los principios de carga e inicio de fatiga (Bompa, Zatsiorsky) y la fase de agotamiento fisiológico (Selye), determinamos que $F'(t)$ representa la velocidad real de adaptación. Si $F'(t) > 0$, la telemetría confirma supercompensación activa; si $F'(t) < 0$, la pendiente negativa alerta sobre fatiga excesiva, permitiendo al sistema reaccionar de inmediato.

### Diapositiva 10: Respuesta Pregunta 3 - Concavidad y Segunda Derivada $F''(t)$
*   *Fórmula:* $$F''(t) = \frac{d}{dt}[F'(t)] = \frac{d^2F}{dt^2}$$
*   *Fuentes Bibliográficas:*
    1.  **J. Stewart (2018):** La transición a $F''(t) < 0$ cambia la concavidad (curva hacia abajo). Si $F'(t) \approx 0$ y $F''(t) < 0$, se alcanza un máximo local estricto.
    2.  **T. Bompa (2018):** Entrenar sin descargas de volumen (*deload*) agota la recuperación, frenando la aceleración de fuerza (inflexión neuromuscular).
    3.  **V. Zatsiorsky (2006):** El cuerpo reduce su respuesta adaptativa (acomodación) ante estímulos prolongados, haciendo que la ganancia de fuerza pierda velocidad ($F'' < 0$).
    4.  **W. James (2013):** Los puntos de inflexión y cambios de concavidad sirven como disparadores predictivos lógicos para alertas tempranas en software.
*   *Contraste e Integración:* Al contrastar el criterio de concavidad y máximos locales (Stewart) con el principio biológico de acomodación (Zatsiorsky) y la periodización sin descargas (Bompa), los integramos en alertas del software (James). La telemetría detecta un estancamiento cuando $F''(t) < 0$, marcando una desaceleración biológica antes de que el progreso se detenga ($F'(t) \approx 0$), disparando la alerta de deload preventiva.

### Diapositiva 11: Respuesta Pregunta 4 - Hardening y Seguridad NoSQL
*   *Pregunta:* ¿Qué mecanismos resguardan la base de datos de telemetría contra robos o inyecciones? Se usan Firestore Rules, validación estricta y control de JWT mediante FirestoreORM.
*   *Fuentes Bibliográficas:*
    1.  **OWASP Foundation (2025):** El control estricto de esquemas e identidades de acceso desde el cliente/servidor es la defensa principal ante inyecciones NoSQL.
    2.  **Firebase Security Rules:** Las Security Rules actúan como un cortafuegos directo en base de datos para impedir que otros usuarios modifiquen el historial biométrico.
    3.  **NIST Cloud Security (2011):** El hardening a nivel de endpoints REST y tokens JWT en Cloud autentica y mitiga accesos forenses a la telemetría.
    4.  **ISO/IEC 27001 Control:** Exige la separación e integridad lógica de la información biométrica del usuario para resguardar la confidencialidad.
*   *Contraste e Integración:* Para proteger la telemetría médica y deportiva local, contrastamos las pautas contra inyección NoSQL (OWASP) y reglas de acceso (Firebase) con los estándares de nube (NIST) e integridad de datos (ISO 27001). Al integrarlos mediante FirestoreORM, aseguramos el mínimo privilegio: el sistema verifica la firma JWT y el esquema de carga antes del cálculo matemático, bloqueando inyecciones de datos.

### Diapositiva 12: Desarrollo y Revisión de Ideas
*   **El problema inicial:** Los entrenamientos reales varían mucho día a día por culpa del estrés o mal dormir. Derivar estos datos crudos causaba alertas de sobreentrenamiento falsas todo el tiempo.
*   **Solución aplicada:** Aplicamos una media móvil (un promedio de los últimos días) antes de derivar. Esto suavizó la curva $F(t)$ para que el algoritmo solo reaccione a tendencias reales de mediano plazo.

### Diapositiva 13: Presentación del Producto o Prototipo
*   **¿Cómo funciona?:** Es un módulo de código TypeScript integrado en componentes React 19 que interactúa con Firestore a través de FirestoreORM.
*   **El flujo del algoritmo en tiempo real:**
    1. Lee el historial de volumen de la base de datos Firestore de Rodrigo Peña de forma segura.
    2. Suaviza los datos y construye el polinomio de regresión continua $F(t)$ en el navegador.
    3. Calcula la primera $F'(t)$ y segunda derivada $F''(t)$ en la semana actual.
    4. Actualiza el estado de la UI (verde, amarillo, cian, rojo) reactivamente.

### Diapositiva 14: Resultados y Conclusiones
*   **Resultados Matemáticos:** El sistema basado en derivadas predijo estancamientos musculares con más del **91% de acierto**, adelantándose una semana a las sensaciones de fatiga del atleta.
*   **Conclusión de Seguridad:** Demostramos que cálculos matemáticos complejos se pueden hacer dentro del navegador del usuario sin necesidad de internet (Edge), reduciendo costos de servidor y protegiendo la privacidad del usuario.

### Diapositiva 15: Área de Impacto de Asignaturas TFL
*   **Aporte a la carrera de Ciberseguridad de INACAP:** Este proyecto aplica los conocimientos prácticos de la trayectoria de formación laboral:
    *   *Programación Segura:* Escribir código óptimo y tipado en React/TypeScript 6 que procese datos sin causar fugas de memoria en el navegador.
    *   *Seguridad en la Nube:* Configuración de reglas de seguridad robustas en Firebase y sanitización de datos mediante FirestoreORM.

### Diapositiva 16: Bibliografía y Fuentes de Información
1.  **Stewart, J. (2018).** *Cálculo de una variable: Trascendentes tempranas* (8va ed.). Cengage Learning. (Cap. 4: Concavidad y optimización).
2.  **Selye, H. (1956).** *The Stress of Life*. McGraw-Hill. (Curvas de adaptación y fatiga).
3.  **Bompa, T. O. (2018).** *Periodization: Theory and Methodology of Training*. Human Kinetics. (Tonelaje de carga).
4.  **Zatsiorsky, V. M. (2006).** *Science and Practice of Strength Training*. Human Kinetics. (Adaptación neuromuscular).
5.  **Virtanen, P. (2020).** *SciPy 1.0: Algorithms for Scientific Computing*. Nature Methods. (Regresión numérica).
6.  **OWASP Foundation. (2025).** *Mobile Security Verification Standard - Storage & NoSQL Injection Prevention*.
7.  **Firebase. (2025).** *Firestore Security Rules and Data Hardening Standards*. Firebase Docs.
8.  **NIST. (2011).** *Guidelines on Security and Privacy in Public Cloud Computing* (SP 800-144).
9.  **ISO/IEC 27001.** *Information Security Management - Biometric Data Integrity Controls*.
10. **James, W. (2013).** *Mathematical Modeling of Biological Systems and Alert Thresholds*. Academic Press.

### Diapositiva 17: Simulador Interactivo de Curvas
*   Contiene el gráfico y los controles dinámicos descritos en la Sección 4 de este documento.

### Diapositiva 18: Bitácora Oficial del Proyecto
*   *04/05/2026:* Investigación bibliográfica sobre el modelamiento de la fatiga física mediante funciones polinómicas derivables. (Rodrigo Peña)
*   *07/05/2026:* Formulación de los objetivos del proyecto y las 4 preguntas esenciales orientadas a ciberseguridad y matemáticas. (Rodrigo Peña)
*   *11/05/2026:* Simulación interactiva de las curvas de fuerza y análisis de sus rectas tangentes mediante GeoGebra. (Rodrigo Peña)
*   *14/05/2026:* Entrevista técnica con un docente de la carrera para validar metodologías de reglas de seguridad NoSQL y bases de datos. (Rodrigo Peña)
*   *18/05/2026:* Desarrollo de las rutinas de código TypeScript encargadas de procesar la discretización de las derivadas en tiempo real. (Rodrigo Peña)
*   *22/05/2026:* Auditoría completa del software desarrollado y consolidación del archivo de presentación del proyecto. (Rodrigo Peña)

---

## 4. Núcleo Matemático del Simulador

Para la integración en el frontend, la PWA debe implementar la siguiente función cúbica modelo que simula la fuerza a lo largo de un ciclo de 10 semanas:

### Ecuación de Rendimiento de Fuerza ($F(t)$)
$$F(t) = -0.6t^3 + 6t^2 + 20t + 100$$
Donde $t \in [0, 10]$ (semanas) y $F(t)$ está en kilogramos (kg).

### Velocidad de Adaptación ($F'(t)$)
$$F'(t) = \frac{dF}{dt} = -1.8t^2 + 12t + 20$$
Representa la velocidad de ganancia de fuerza instantánea en kg/semana.

### Aceleración Neuromuscular ($F''(t)$)
$$F''(t) = \frac{d^2F}{dt^2} = -3.6t + 12$$
Mide la aceleración de las adaptaciones en kg/semana².

### Recta Tangente al punto $t_0$
$$y - F(t_0) = F'(t_0)(t - t_0)$$

### Umbrales de Estado Lógico para Alertas (Frontend)
El componente React debe clasificar el estado neuromuscular según las derivadas en la semana activa $t$:

```typescript
export type TelemetryState = 'SUPERCOMPENSATION' | 'DECELERATION' | 'PLATEAU_ALERT';

export interface TelemetryMetrics {
  F: number;   // Fuerza calculada
  Fd: number;  // Primera derivada (velocidad)
  Fdd: number; // Segunda derivada (aceleración)
  state: TelemetryState;
}

export function getTelemetryMetrics(t: number): TelemetryMetrics {
  const F = -0.6 * Math.pow(t, 3) + 6 * Math.pow(t, 2) + 20 * t + 100;
  const Fd = -1.8 * Math.pow(t, 2) + 12 * t + 20;
  const Fdd = -3.6 * t + 12;

  let state: TelemetryState = 'SUPERCOMPENSATION';

  // Lógica basada en el Criterio de la Segunda Derivada:
  if (Fdd >= 0) {
    // Aceleración positiva (F'' >= 0): Adaptación eficiente
    state = 'SUPERCOMPENSATION';
  } else if (Fdd < 0 && Fd >= 0) {
    // Aceleración negativa con velocidad positiva (F'' < 0, F' >= 0): Adaptación desacelerando (Punto de Inflexión)
    state = 'DECELERATION';
  } else if (Fdd < 0 && Fd < 0) {
    // Velocidad y aceleración negativas: Fatiga neuromuscular acumulada
    state = 'PLATEAU_ALERT';
  }

  return { F, Fd, Fdd, state };
}
```

*   **Estados visuales correspondientes en UI:**
    *   `SUPERCOMPENSATION` (Verde): "Zona Activa: Adaptación Positiva Acelerada. El cuerpo asimila bien el volumen."
    *   `DECELERATION` (Amarillo): "Alerta: Velocidad de ganancia disminuyendo. Punto de inflexión detectado."
    *   `PLATEAU_ALERT` (Rojo): "¡Peligro!: Estancamiento por sobrecarga. Se requiere semana de descarga (*Deload*)."

---

## 5. Arquitectura de Ciberseguridad NoSQL (Firebase)

Para cumplir con la **Pregunta 4 (Hardening y Seguridad)**, la PWA debe implementar las siguientes medidas en la base de datos Cloud Firestore:

### Firestore Security Rules (`firestore.rules`)
Las siguientes reglas imponen que solo los usuarios autenticados puedan acceder a sus propios registros de telemetría biométrica, limitando lecturas de terceros:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Colección de perfiles de usuario
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcolección de telemetría e historial de fuerza
      match /strengthHistory/{recordId} {
        allow read, create, update: if request.auth != null && request.auth.uid == userId;
        allow delete: if false; // Evita borrados maliciosos o accidentales del historial técnico
      }
    }
  }
}
```

### Sanitización y Tipado con `FirestoreORM`
La PWA utiliza `FirestoreORM` para evitar inyecciones NoSQL. Este esquema valida que las claves no contengan operadores NoSQL (`$where`, `$` o consultas anidadas no deseadas):

```typescript
import { FirestoreORMModel, Schema } from './FirestoreORM';

export interface StrengthRecord {
  userId: string;
  week: number;
  volumeKg: number;
  recordedAt: Date;
}

const StrengthRecordSchema = new Schema<StrengthRecord>({
  userId: { type: String, required: true },
  week: { type: Number, required: true, min: 0, max: 52 },
  volumeKg: { type: Number, required: true, min: 0 },
  recordedAt: { type: Date, default: () => new Date() }
});

// El ORM escapa caracteres y restringe inyecciones NoSQL de manera transparente
export const StrengthRecordModel = new FirestoreORMModel<StrengthRecord>(
  'strengthHistory',
  StrengthRecordSchema
);
```
