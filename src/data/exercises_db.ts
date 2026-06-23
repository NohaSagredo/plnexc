export interface Exercise {
  id: string;
  title: string;
  muscleGroup: 'Pecho' | 'Espalda' | 'Hombros' | 'Bíceps' | 'Tríceps' | 'Cuádriceps' | 'Femorales' | 'Glúteos' | 'Pantorrillas' | 'Core' | 'Cuello' | 'Cardio';
  equipment: 'Barra' | 'Mancuerna' | 'Peso Corporal' | 'Polea/Cable' | 'Banda' | 'Otro';
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
  description: string;
  instructions?: string[];
  image?: string;
  nameEs?: string;
  nameEn?: string;
  secondaryMuscleGroups?: ('Pecho' | 'Espalda' | 'Hombros' | 'Bíceps' | 'Tríceps' | 'Cuádriceps' | 'Femorales' | 'Glúteos' | 'Pantorrillas' | 'Core')[];
}

export function isTimeBasedExercise(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('plank') ||
    t.includes('plancha') ||
    t.includes('side bridge') ||
    t.includes('dead hang') ||
    t.includes('hollow hold') ||
    t.includes('hollow body hold') ||
    t.includes('l-sit') ||
    t.includes('wall sit') ||
    t.includes('lsit') ||
    t.includes('front lever') ||
    t.includes('back lever') ||
    t.includes('planche') ||
    t.includes('handstand hold')
  );
}

export const EXERCISES_DB: Exercise[] = [
  // === 47 HISTORICAL CSV EXERCISES ===
  {
    id: 'shoulder_warmup_7times',
    title: '7times M O Shoulder Warmup',
    muscleGroup: 'Hombros',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Rutina de calentamiento de hombros de 7 movimientos continuos con carga muy ligera.'
  },
  {
    id: 'ab_wheel',
    title: 'Ab Wheel',
    muscleGroup: 'Core',
    equipment: 'Otro',
    difficulty: 'Avanzado',
    description: 'Despliegue de abdomen con rueda desde rodillas o de pie. Alta demanda de estabilidad de columna.'
  },
  {
    id: 'behind_back_bicep_wrist_curl',
    title: 'Behind the Back Bicep Wrist Curl (Barbell)',
    muscleGroup: 'Bíceps',
    equipment: 'Barra',
    difficulty: 'Principiante',
    description: 'Flexión de muñeca con barra por detrás de la espalda de pie para activar antebrazos.'
  },
  {
    id: 'bench_press_barbell',
    title: 'Bench Press (Barbell)',
    muscleGroup: 'Pecho',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Press de banca clásico con barra. Ejercicio compuesto básico para fuerza de empuje.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps'],
    instructions: [
      'Acuéstate en el banco con los ojos directamente debajo de la barra.',
      'Retrae activamente las escápulas (junta los omóplatos) y apoya firmemente los pies en el suelo para habilitar el leg drive.',
      'Sujeta la barra con un agarre ligeramente más ancho que los hombros y sácala del soporte.',
      'Baja la barra de forma controlada hacia la parte inferior del pecho (línea de los pezones) manteniendo los codos a unos 45 grados respecto al torso.',
      'Empuja la barra verticalmente hacia arriba con fuerza hasta bloquear los brazos, manteniendo los hombros pegados al banco.'
    ],
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'bench_press_dumbbell',
    title: 'Bench Press (Dumbbell)',
    muscleGroup: 'Pecho',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Press de banca con mancuernas. Permite mayor rango y rotación libre del hombro.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'bent_over_row_barbell',
    title: 'Bent Over Row (Barbell)',
    muscleGroup: 'Espalda',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Remo inclinado con barra. Ejercicio compuesto de tracción para densidad de espalda.',
    secondaryMuscleGroups: ['Bíceps'],
    instructions: [
      'Párate con los pies al ancho de hombros frente a una barra cargada.',
      'Realiza una bisagra de cadera (empuja la cadera hacia atrás) manteniendo la espalda neutra y el torso casi paralelo al suelo.',
      'Sujeta la barra con agarre prono ligeramente más ancho que los hombros.',
      'Manteniendo el core rígido, tira de la barra hacia la parte baja de tu esternón/ombligo, guiando el movimiento con los codos y juntando los omóplatos al final.',
      'Extiende los brazos de forma controlada para volver a la posición inicial sin perder la postura del torso.'
    ],
    image: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'bicep_curl_barbell',
    title: 'Bicep Curl (Barbell)',
    muscleGroup: 'Bíceps',
    equipment: 'Barra',
    difficulty: 'Principiante',
    description: 'Curl de bíceps clásico de pie utilizando una barra recta o barra Z.'
  },
  {
    id: 'bicep_curl_dumbbell',
    title: 'Bicep Curl (Dumbbell)',
    muscleGroup: 'Bíceps',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Curl de bíceps de pie con mancuernas alternado o simultáneo.',
    instructions: [
      'Sostén dos mancuernas a los costados del cuerpo con un agarre neutro (palmas hacia adentro) y los hombros relajados.',
      'Con los codos pegados al cuerpo, inicia la flexión rotando las muñecas hacia arriba (supinación) a mitad del recorrido.',
      'Contrae los bíceps con fuerza arriba sin balancear el torso ni adelantar los codos.',
      'Baja las mancuernas lentamente resistiendo el peso hasta que los brazos queden extendidos en posición neutra.'
    ],
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'cars_shoulders',
    title: 'CARs',
    muscleGroup: 'Hombros',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Rotaciones articulares controladas (Controlled Articular Rotations) para salud articular.'
  },
  {
    id: 'chest_fly_dumbbell',
    title: 'Chest Fly (Dumbbell)',
    muscleGroup: 'Pecho',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Aperturas de pecho con mancuernas en banco plano para estiramiento pectoral.',
    secondaryMuscleGroups: ['Hombros']
  },
  {
    id: 'chin_up',
    title: 'Chin Up',
    muscleGroup: 'Espalda',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Dominadas con agarre supino (palmas hacia ti). Enfatiza dorsales y bíceps.',
    secondaryMuscleGroups: ['Bíceps']
  },
  {
    id: 'concentration_curl',
    title: 'Concentration Curl',
    muscleGroup: 'Bíceps',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Curl concentrado sentado apoyando el codo en la parte interna del muslo.'
  },
  {
    id: 'dead_hang',
    title: 'Dead Hang',
    muscleGroup: 'Espalda',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Colgarse pasivamente de la barra. Excelente para descomprimir hombros y entrenar agarre.'
  },
  {
    id: 'deadlift_barbell',
    title: 'Deadlift (Barbell)',
    muscleGroup: 'Femorales',
    equipment: 'Barra',
    difficulty: 'Avanzado',
    description: 'Peso muerto convencional con barra. Ejercicio de cadena posterior y fuerza absoluta.',
    secondaryMuscleGroups: ['Espalda', 'Glúteos'],
    instructions: [
      'Colócate frente a la barra con los pies separados al ancho de las caderas, de modo que la barra quede a la mitad de tus pies (1 pulgada de tus espinillas).',
      'Inclínate y sujeta la barra con un agarre prono o mixto al ancho de los hombros sin mover la barra.',
      'Dobla las rodillas hasta que tus espinillas toquen la barra. No empujes la barra hacia adelante.',
      'Saca el pecho, contrae la espalda dorsal y "tira de la barra" para eliminar el juego libre, asegurando una columna lumbar completamente rígida y neutral.',
      'Empuja el suelo con las piernas para iniciar el levantamiento, manteniendo la barra en contacto con el cuerpo durante todo el recorrido.',
      'Extiende caderas e rodillas por completo arriba, sin hiperextender la columna lumbar.'
    ],
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'decline_push_up',
    title: 'Decline Push Up',
    muscleGroup: 'Pecho',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Flexiones con pies elevados. Transfiere más carga a la porción superior del pectoral.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'flexion_antebrazo',
    title: 'Flexión Antebrazo',
    muscleGroup: 'Bíceps',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Curl de muñeca concentrado con peso ligero para flexores del antebrazo.'
  },
  {
    id: 'hammer_curl_dumbbell',
    title: 'Hammer Curl (Dumbbell)',
    muscleGroup: 'Bíceps',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Curl de martillo con mancuernas. Enfatiza el braquiorradial y es amigable con codos.'
  },
  {
    id: 'hanging_leg_raise',
    title: 'Hanging Leg Raise',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Avanzado',
    description: 'Elevación de piernas colgado de la barra hasta tocar la barra o a 90 grados.'
  },
  {
    id: 'heel_taps',
    title: 'Heel Taps',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Tocado de talones acostado de espaldas contrayendo los oblicuos de forma controlada.'
  },
  {
    id: 'lateral_raise_dumbbell',
    title: 'Lateral Raise (Dumbbell)',
    muscleGroup: 'Hombros',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Elevaciones laterales con mancuernas para aislamiento de la cabeza lateral del deltoides.'
  },
  {
    id: 'lying_neck_curls',
    title: 'Lying Neck Curls (Weighted)',
    muscleGroup: 'Cuello',
    equipment: 'Otro',
    difficulty: 'Intermedio',
    description: 'Flexión de cuello tumbado boca arriba con disco en la frente sobre una toalla.',
    instructions: [
      'Acuéstate boca arriba en un banco plano, de modo que tu cabeza sobresalga libremente del borde.',
      'Coloca un disco de peso ligero envuelto en una toalla limpia directamente sobre tu frente. Sujétalo suavemente con tus manos para mantener el equilibrio.',
      'Baja lentamente la cabeza hacia atrás por debajo de la línea del banco, logrando un estiramiento suave y controlado de la musculatura del cuello.',
      'Realiza una flexión de cuello levantando la cabeza para llevar la barbilla hacia el pecho, contrayendo firmemente los flexores cervicales.',
      'Mantén la contracción durante 1 segundo arriba y regresa controladamente.'
    ],
    image: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lying_neck_extension',
    title: 'Lying Neck Extension (Weighted)',
    muscleGroup: 'Cuello',
    equipment: 'Otro',
    difficulty: 'Intermedio',
    description: 'Extensión de cuello tumbado boca abajo con disco detrás de la cabeza.',
    instructions: [
      'Acuéstate boca abajo en un banco plano, de modo que tu cabeza y cuello sobresalgan libremente por el borde.',
      'Coloca un disco ligero envuelto en una toalla detrás de tu cabeza (porción occipital), sosteniéndolo ligeramente con las manos para estabilidad.',
      'Baja la cabeza de forma controlada hacia el suelo sintiendo un estiramiento suave en la parte posterior del cuello.',
      'Eleva la cabeza hacia arriba extendiendo el cuello hasta la posición neutra o ligeramente por encima. Evita movimientos balísticos o tirones rápidos.',
      'Desciende pausadamente controlando el peso en todo momento.'
    ],
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'neck_rotations',
    title: 'Neck Rotations',
    muscleGroup: 'Cuello',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Rotación articular controlada del cuello para movilidad y descarga cervical.'
  },
  {
    id: 'oblique_crunch',
    title: 'Oblique Crunch',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Encogimiento abdominal cruzado tumbado en el suelo para activación oblicua.'
  },
  {
    id: 'overhead_press_barbell',
    title: 'Overhead Press (Barbell)',
    muscleGroup: 'Hombros',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Press militar de pie con barra. Exige buena extensión torácica y estabilidad.',
    secondaryMuscleGroups: ['Tríceps'],
    instructions: [
      'Coloca la barra en los soportes a la altura del pecho. Sujétala con un agarre ligeramente superior al ancho de hombros.',
      'Posiciónate debajo de la barra con los antebrazos completamente verticales y los codos ligeramente delante de la barra.',
      'Contrae fuertemente los glúteos, cuádriceps y abdomen para crear una base rígida.',
      'Retira la barra e inicia el empuje vertical hacia arriba, retirando ligeramente la cabeza hacia atrás para dar paso a la barra.',
      'Empuja la barra en línea recta y, una vez supere la frente, vuelve a meter la cabeza hacia adelante para bloquear los brazos directamente sobre los hombros.',
      'Baja la barra de forma controlada hasta la parte superior del pecho.'
    ],
    image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'plank',
    title: 'Plank',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Plancha abdominal isométrica apoyado en antebrazos y puntas de pies.'
  },
  {
    id: 'pull_up',
    title: 'Pull Up',
    muscleGroup: 'Espalda',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Dominada clásica con agarre prono abierto. Ejercicio rey de tracción vertical.',
    secondaryMuscleGroups: ['Bíceps'],
    instructions: [
      'Sujétate de la barra de dominadas con las palmas orientadas hacia adelante (agarre prono) a una anchura ligeramente mayor que los hombros.',
      'Cuelga por completo con los brazos extendidos y realiza una retracción y depresión escapular (aleja los hombros de las orejas).',
      'Inicia la tracción tirando de los codos hacia abajo y hacia atrás, llevando el pecho activamente hacia la barra.',
      'Supera la barra con la barra de la barbilla sin estirar el cuello.',
      'Desciende de forma controlada hasta la posición inicial de extensión completa del brazo.'
    ],
    image: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'rack_pull',
    title: 'Rack Pull',
    muscleGroup: 'Espalda',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Peso muerto parcial desde soportes altos (a nivel de rodilla) para enfatizar trapecios y lumbares.',
    secondaryMuscleGroups: ['Femorales', 'Glúteos']
  },
  {
    id: 'rear_delt_reverse_fly',
    title: 'Rear Delt Reverse Fly (Dumbbell)',
    muscleGroup: 'Hombros',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Pájaros con mancuernas inclinado para aislamiento del deltoides posterior.'
  },
  {
    id: 'reverse_curl_dumbbell',
    title: 'Reverse Curl (Dumbbell)',
    muscleGroup: 'Bíceps',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Curl inverso con mancuernas para fortalecer el antebrazo y los flexores del brazo.'
  },
  {
    id: 'romanian_deadlift_barbell',
    title: 'Romanian Deadlift (Barbell)',
    muscleGroup: 'Femorales',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Peso muerto rumano con barra. Enfoque excéntrico en femorales e isquiotibiales.',
    secondaryMuscleGroups: ['Espalda', 'Glúteos']
  },
  {
    id: 'rotacion_externa_hombro',
    title: 'Rotacion Externa Hombro',
    muscleGroup: 'Hombros',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Rotación externa de hombro tumbado o con polea para fortalecer el manguito rotador.'
  },
  {
    id: 'running',
    title: 'Running',
    muscleGroup: 'Cardio',
    equipment: 'Otro',
    difficulty: 'Principiante',
    description: 'Carrera o trote para desarrollo de capacidad aeróbica y resistencia cardiovascular.'
  },
  {
    id: 'scapular_pull_ups',
    title: 'Scapular Pull Ups',
    muscleGroup: 'Espalda',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Depresión escapular colgado de la barra sin flexionar los codos. Excelente para calentamiento.'
  },
  {
    id: 'seated_palms_up_wrist_curl',
    title: 'Seated Palms Up Wrist Curl',
    muscleGroup: 'Bíceps',
    equipment: 'Barra',
    difficulty: 'Principiante',
    description: 'Curl de muñeca sentado apoyando antebrazos en banco con agarre supino.'
  },
  {
    id: 'seated_wrist_extension_barbell',
    title: 'Seated Wrist Extension (Barbell)',
    muscleGroup: 'Bíceps',
    equipment: 'Barra',
    difficulty: 'Principiante',
    description: 'Extensión de muñeca sentado con barra apoyando antebrazos en banco (agarre prono).'
  },
  {
    id: 'shoulder_press_dumbbell',
    title: 'Shoulder Press (Dumbbell)',
    muscleGroup: 'Hombros',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Press militar sentado con mancuernas para deltoides anterior.',
    secondaryMuscleGroups: ['Tríceps']
  },
  {
    id: 'shrug_barbell',
    title: 'Shrug (Barbell)',
    muscleGroup: 'Espalda',
    equipment: 'Barra',
    difficulty: 'Principiante',
    description: 'Encojimientos de hombros con barra para el desarrollo de los trapecios.'
  },
  {
    id: 'side_bend_dumbbell',
    title: 'Side Bend (Dumbbell)',
    muscleGroup: 'Core',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Inclinaciones laterales con mancuerna de pie para fuerza lateral del core (oblicuos).'
  },
  {
    id: 'single_arm_cable_row',
    title: 'Single Arm Cable Row',
    muscleGroup: 'Espalda',
    equipment: 'Polea/Cable',
    difficulty: 'Intermedio',
    description: 'Remo unilateral en polea baja, excelente para controlar desbalances musculares.',
    secondaryMuscleGroups: ['Bíceps']
  },
  {
    id: 'single_arm_tricep_extension_dumbbell',
    title: 'Single Arm Tricep Extension (Dumbbell)',
    muscleGroup: 'Tríceps',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Copa de tríceps unilateral por detrás de la cabeza con mancuerna.'
  },
  {
    id: 'single_leg_calf_raise_barbell',
    title: 'Single Leg Standing Calf Raise (Barbell)',
    muscleGroup: 'Pantorrillas',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Elevación de talones unilateral de pie sujetando barra o mancuernas para equilibrio.'
  },
  {
    id: 'sit_up_weighted',
    title: 'Sit Up (Weighted)',
    muscleGroup: 'Core',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Abdominales clásicos con peso al pecho para sobrecarga progresiva.'
  },
  {
    id: 'skullcrusher_barbell',
    title: 'Skullcrusher (Barbell)',
    muscleGroup: 'Tríceps',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Rompecráneos con barra Z acostado en banco plano para tríceps.'
  },
  {
    id: 'squat_barbell',
    title: 'Squat (Barbell)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Barra',
    difficulty: 'Avanzado',
    description: 'Sentadilla clásica trasera con barra. El ejercicio rey de fuerza inferior.',
    secondaryMuscleGroups: ['Glúteos', 'Core'],
    instructions: [
      'Coloca la barra en los trapecios (barra alta) o deltoides posterior (barra baja). Junta las escápulas para crear una "plataforma" muscular.',
      'Coloca los pies aproximadamente al ancho de los hombros, con las puntas apuntando ligeramente hacia afuera.',
      'Toma una respiración profunda diafragmática y aprieta el abdomen (maniobra de Valsalva).',
      'Inicia el movimiento empujando las caderas hacia atrás y doblando las rodillas, empujándolas activamente hacia afuera para evitar que colapsen hacia adentro (valgo).',
      'Desciende hasta que las caderas pasen por debajo del nivel de las rodillas (rompiendo el paralelo), manteniendo la columna neutral.',
      'Empuja con fuerza a través de todo el pie para volver a la posición inicial.'
    ],
    image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'standing_calf_raise_barbell',
    title: 'Standing Calf Raise (Barbell)',
    muscleGroup: 'Pantorrillas',
    equipment: 'Barra',
    difficulty: 'Principiante',
    description: 'Elevaciones de gemelos de pie con barra en los hombros.'
  },
  {
    id: 'triceps_extension_barbell',
    title: 'Triceps Extension (Barbell)',
    muscleGroup: 'Tríceps',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Extensión de tríceps tumbado con barra recta o barra Z.'
  },

  // === 20+ ADDITIONAL EXERCISES (GYM, CALISTHENICS & REHAB) ===
  {
    id: 'dips_chest',
    title: 'Dips (Chest Focus)',
    muscleGroup: 'Pecho',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Fondos en paralelas inclinando el torso hacia adelante para cargar el pectoral inferior.',
    secondaryMuscleGroups: ['Tríceps', 'Hombros']
  },
  {
    id: 'dips_triceps',
    title: 'Dips (Tricep Focus)',
    muscleGroup: 'Tríceps',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Fondos en paralelas manteniendo el torso lo más erguido posible para enfatizar los tríceps.',
    secondaryMuscleGroups: ['Pecho', 'Hombros']
  },
  {
    id: 'pushup_normal',
    title: 'Push Up (Normal)',
    muscleGroup: 'Pecho',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Flexión clásica en el suelo con manos al ancho de hombros.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'pushup_diamond',
    title: 'Push Up (Diamond)',
    muscleGroup: 'Tríceps',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Flexión formando un diamante con las manos para enfocar el esfuerzo en los tríceps.',
    secondaryMuscleGroups: ['Pecho', 'Hombros']
  },
  {
    id: 'bulgarian_split_squat',
    title: 'Bulgarian Split Squat (Dumbbell)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Sentadilla búlgara con un pie apoyado atrás en un banco. Alta demanda de estabilidad de cadera.',
    secondaryMuscleGroups: ['Glúteos']
  },
  {
    id: 'walking_lunge_dumbbell',
    title: 'Walking Lunge (Dumbbell)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Zancadas caminando sujetando mancuernas al costado.',
    secondaryMuscleGroups: ['Glúteos']
  },
  {
    id: 'incline_bench_press_dumbbell',
    title: 'Incline Bench Press (Dumbbell)',
    muscleGroup: 'Pecho',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Press inclinado con mancuernas a 30° para la porción clavicular del pectoral.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'incline_bench_press_barbell',
    title: 'Incline Bench Press (Barbell)',
    muscleGroup: 'Pecho',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Press inclinado con barra para fuerza pectoral alta.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'lat_pulldown_cable',
    title: 'Lat Pulldown (Cable)',
    muscleGroup: 'Espalda',
    equipment: 'Polea/Cable',
    difficulty: 'Principiante',
    description: 'Jalón en polea alta con barra ancha para desarrollo de dorsales.',
    secondaryMuscleGroups: ['Bíceps']
  },
  {
    id: 'cable_face_pull',
    title: 'Cable Face Pull',
    muscleGroup: 'Hombros',
    equipment: 'Polea/Cable',
    difficulty: 'Principiante',
    description: 'Tirón de cuerda hacia la cara rotando los hombros hacia afuera. Ideal para salud postural.'
  },
  {
    id: 'cable_pushdown_triceps',
    title: 'Tricep Pushdown (Cable)',
    muscleGroup: 'Tríceps',
    equipment: 'Polea/Cable',
    difficulty: 'Principiante',
    description: 'Extensión de tríceps en polea alta con barra recta o cuerda.'
  },
  {
    id: 'leg_press_machine',
    title: 'Leg Press',
    muscleGroup: 'Cuádriceps',
    equipment: 'Otro',
    difficulty: 'Principiante',
    description: 'Prensa de piernas inclinada. Permite cargar las piernas con mínimo estrés lumbar.',
    secondaryMuscleGroups: ['Glúteos']
  },
  {
    id: 'leg_extension_machine',
    title: 'Leg Extension (Machine)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Otro',
    difficulty: 'Principiante',
    description: 'Extensión de rodilla en máquina para aislamiento de cuádriceps.'
  },
  {
    id: 'lying_leg_curl_machine',
    title: 'Lying Leg Curl (Machine)',
    muscleGroup: 'Femorales',
    equipment: 'Otro',
    difficulty: 'Principiante',
    description: 'Flexión de rodilla tumbado para aislar femorales.'
  },
  {
    id: 'mcgill_curlup_rehab',
    title: 'McGill Curl-up',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Fase 1 McGill para dolor lumbar. Co-contracción de abdomen sin flexionar la columna.'
  },
  {
    id: 'side_bridge_rehab',
    title: 'Side Bridge / Plancha Lateral',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Fase 1 McGill. Plancha lateral de rodillas para activación segura de oblicuos.'
  },
  {
    id: 'bird_dog_rehab',
    title: 'Bird Dog',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Fase 1 McGill. Co-contracción de glúteos y hombros contrarios manteniendo core rígido.'
  },
  {
    id: 'spanish_squat_rehab',
    title: 'Spanish Squat (Banded)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Banda',
    difficulty: 'Principiante',
    description: 'Fase 1 PLNEXC para rodilla. Sentadilla isométrica asistida por banda detrás de rodillas para tendones.'
  },
  {
    id: 'slant_board_squat_rehab',
    title: 'Slant Board Squat',
    muscleGroup: 'Cuádriceps',
    equipment: 'Otro',
    difficulty: 'Intermedio',
    description: 'Fase 3 PLNEXC. Sentadilla con talones elevados en plano inclinado para aislar el cuádriceps de forma vertical.'
  },
  {
    id: 'banded_ankle_distraction_rehab',
    title: 'Banded Ankle Distraction',
    muscleGroup: 'Pantorrillas',
    equipment: 'Banda',
    difficulty: 'Principiante',
    description: 'Fase 2 PLNEXC. Movilización de tobillo bajo distracción de banda para mejorar dorsiflexión.'
  },
  {
    id: 'clamshells_banded_rehab',
    title: 'Clamshells (Banded)',
    muscleGroup: 'Glúteos',
    equipment: 'Banda',
    difficulty: 'Principiante',
    description: 'Fase 2 PLNEXC. Rotación externa de cadera con banda en rodillas para activar glúteo medio.'
  },
  {
    id: 'hip_airplane_rehab',
    title: 'Hip Airplane',
    muscleGroup: 'Glúteos',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Fase 2 PLNEXC. Rotaciones internas y externas de cadera en apoyo unipodal.'
  },
  {
    id: 'russian_twist',
    title: 'Russian Twist',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Giro de torso sentado con pies elevados para fuerza oblicua rotacional.'
  },
  {
    id: 'pec_deck_machine',
    title: 'Pec Deck / Aperturas en Máquina',
    muscleGroup: 'Pecho',
    equipment: 'Otro',
    difficulty: 'Principiante',
    description: 'Aislamiento de pectoral en máquina. Ideal para aprender el patrón de aducción horizontal de hombro.',
    secondaryMuscleGroups: ['Hombros']
  },
  {
    id: 'incline_chest_press_machine',
    title: 'Incline Chest Press (Machine)',
    muscleGroup: 'Pecho',
    equipment: 'Otro',
    difficulty: 'Principiante',
    description: 'Press de pecho inclinado guiado en máquina para enfocar la porción clavicular del pectoral.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'cable_crossover_chest',
    title: 'Cable Crossover (Chest Focus)',
    muscleGroup: 'Pecho',
    equipment: 'Polea/Cable',
    difficulty: 'Intermedio',
    description: 'Cruces de poleas de pie para aislamiento pectoral con tensión constante en todo el rango.',
    secondaryMuscleGroups: ['Hombros']
  },
  {
    id: 'pushup_archer',
    title: 'Archer Push Up',
    muscleGroup: 'Pecho',
    equipment: 'Peso Corporal',
    difficulty: 'Avanzado',
    description: 'Flexiones laterales de alta dificultad donde un brazo realiza la mayor parte del empuje.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'decline_bench_press_barbell',
    title: 'Decline Bench Press (Barbell)',
    muscleGroup: 'Pecho',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Press de banca declinado con barra para enfocar las fibras inferiores del pectoral.',
    secondaryMuscleGroups: ['Hombros', 'Tríceps']
  },
  {
    id: 'chest_supported_row_dumbbell',
    title: 'Chest Supported Row (Dumbbell)',
    muscleGroup: 'Espalda',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Remo apoyando el pecho en un banco inclinado para eliminar el impulso y proteger la espalda baja.',
    secondaryMuscleGroups: ['Bíceps']
  },
  {
    id: 't_bar_row_barbell',
    title: 'T-Bar Row (Barbell)',
    muscleGroup: 'Espalda',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Remo en barra T apoyado o libre. Excelente para desarrollar grosor en la espalda alta y dorsal.',
    secondaryMuscleGroups: ['Bíceps']
  },
  {
    id: 'preacher_curl_barbell',
    title: 'Preacher Curl (Barbell)',
    muscleGroup: 'Bíceps',
    equipment: 'Barra',
    difficulty: 'Principiante',
    description: 'Curl de bíceps en banco Scott apoyando los tríceps para aislar por completo la flexión de codo.'
  },
  {
    id: 'cable_bicep_curl',
    title: 'Cable Bicep Curl',
    muscleGroup: 'Bíceps',
    equipment: 'Polea/Cable',
    difficulty: 'Principiante',
    description: 'Curl de bíceps en polea baja con barra recta, barra Z o cuerda para tensión continua.'
  },
  {
    id: 'overhead_cable_tricep_extension',
    title: 'Overhead Tricep Extension (Cable)',
    muscleGroup: 'Tríceps',
    equipment: 'Polea/Cable',
    difficulty: 'Principiante',
    description: 'Extensión de tríceps por encima de la cabeza en polea para trabajar la cabeza larga del tríceps en estiramiento.'
  },
  {
    id: 'bench_dips_arms',
    title: 'Bench Dips / Fondos en Banco',
    muscleGroup: 'Tríceps',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Fondos apoyando las manos en un banco detrás del cuerpo. Ejercicio básico de empuje para tríceps.',
    secondaryMuscleGroups: ['Pecho', 'Hombros']
  },
  {
    id: 'hip_thrust_barbell',
    title: 'Hip Thrust (Barbell)',
    muscleGroup: 'Glúteos',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Extensión de cadera con barra apoyando la espalda alta en banco. Ejercicio rey para activar glúteos.',
    secondaryMuscleGroups: ['Femorales']
  },
  {
    id: 'hack_squat_machine',
    title: 'Hack Squat (Machine)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Otro',
    difficulty: 'Intermedio',
    description: 'Sentadilla Hack en máquina. Permite gran profundidad y enfoque en cuádriceps reduciendo carga axial.',
    secondaryMuscleGroups: ['Glúteos']
  },
  {
    id: 'goblet_squat_dumbbell',
    title: 'Goblet Squat (Dumbbell)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    description: 'Sentadilla sosteniendo una mancuerna o kettlebell frente al pecho. Excelente para aprender profundidad.',
    secondaryMuscleGroups: ['Glúteos', 'Core']
  },
  {
    id: 'romanian_deadlift_dumbbell',
    title: 'Romanian Deadlift (Dumbbell)',
    muscleGroup: 'Femorales',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Peso muerto rumano con mancuernas. Permite estirar isquiotibiales de forma simétrica.',
    secondaryMuscleGroups: ['Espalda', 'Glúteos']
  },
  {
    id: 'seated_calf_raise_machine',
    title: 'Seated Calf Raise (Machine)',
    muscleGroup: 'Pantorrillas',
    equipment: 'Otro',
    difficulty: 'Principiante',
    description: 'Elevación de talones sentado en máquina. Enfoca el músculo sóleo del gemelo.'
  },
  {
    id: 'arnold_press_dumbbell',
    title: 'Arnold Press (Dumbbell)',
    muscleGroup: 'Hombros',
    equipment: 'Mancuerna',
    difficulty: 'Intermedio',
    description: 'Press militar de hombros con rotación de muñecas iniciado desde posición frontal. Trabajo deltoide completo.',
    secondaryMuscleGroups: ['Tríceps']
  },
  {
    id: 'upright_row_barbell',
    title: 'Upright Row (Barbell)',
    muscleGroup: 'Hombros',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Remo al mentón con barra para deltoides lateral y trapecio superior.',
    secondaryMuscleGroups: ['Espalda']
  },
  {
    id: 'pike_push_up_shoulders',
    title: 'Pike Push Up',
    muscleGroup: 'Hombros',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Flexiones inclinando el cuerpo en forma de V invertida para enfocar el esfuerzo en los hombros.',
    secondaryMuscleGroups: ['Tríceps']
  },
  {
    id: 'face_pull_banded',
    title: 'Banded Face Pull',
    muscleGroup: 'Hombros',
    equipment: 'Banda',
    difficulty: 'Principiante',
    description: 'Face pull utilizando banda elástica. Fortalece deltoides posterior, manguito rotador y trapecios.'
  },
  {
    id: 'hanging_knee_raise_core',
    title: 'Hanging Knee Raise',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Elevación de rodillas colgado de una barra. Gran trabajo para abdomen inferior y flexores de cadera.'
  },
  {
    id: 'ab_wheel_feet',
    title: 'Ab Wheel Rollout (From Feet)',
    muscleGroup: 'Core',
    equipment: 'Otro',
    difficulty: 'Avanzado',
    description: 'Despliegue de abdomen con rueda desde posición de pie. Exigencia física extrema del core.'
  },
  {
    id: 'side_plank_rotation',
    title: 'Side Plank with Rotation',
    muscleGroup: 'Core',
    equipment: 'Peso Corporal',
    difficulty: 'Intermedio',
    description: 'Plancha lateral activa rotando el torso para pasar el brazo libre por debajo. Fuerza oblicua rotacional.'
  },
  {
    id: 'glute_bridge_rehab',
    title: 'Glute Bridge / Puente de Glúteo',
    muscleGroup: 'Glúteos',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Elevación de pelvis tumbado boca arriba con rodillas flexionadas. Ejercicio de activación básica.'
  },
  {
    id: 'tke_banded_rehab',
    title: 'Banded TKE (Terminal Knee Extension)',
    muscleGroup: 'Cuádriceps',
    equipment: 'Banda',
    difficulty: 'Principiante',
    description: 'Extensión terminal de rodilla de pie resistida por banda elástica. Excelente para tendón rotuliano y vasto medial.'
  },
  {
    id: 'single_leg_squat',
    title: 'Single-Leg Squat',
    muscleGroup: 'Cuádriceps',
    equipment: 'Peso Corporal',
    difficulty: 'Avanzado',
    description: 'Sentadilla a una sola pierna manteniendo la otra pierna extendida o flexionada. Alta demanda de estabilidad y fuerza unilateral.',
    nameEs: 'Sentadilla a una Pierna',
    nameEn: 'Single-Leg Squat',
    secondaryMuscleGroups: ['Glúteos', 'Core']
  },
  {
    id: 'pistol_squat',
    title: 'Pistol Squat',
    muscleGroup: 'Cuádriceps',
    equipment: 'Peso Corporal',
    difficulty: 'Avanzado',
    description: 'Sentadilla de pistola a rango completo con una pierna estirada al frente. Exige fuerza, equilibrio y movilidad de tobillo excelentes.',
    nameEs: 'Sentadilla Pistola',
    nameEn: 'Pistol Squat',
    secondaryMuscleGroups: ['Glúteos', 'Core']
  },
  {
    id: 'bodyweight_squat',
    title: 'Bodyweight Squat',
    muscleGroup: 'Cuádriceps',
    equipment: 'Peso Corporal',
    difficulty: 'Principiante',
    description: 'Sentadilla básica libre con el propio peso corporal. Ejercicio elemental de movimiento inferior.',
    nameEs: 'Sentadilla con Peso Corporal',
    nameEn: 'Bodyweight Squat',
    secondaryMuscleGroups: ['Glúteos', 'Core']
  }
];

export function getExerciseImage(exercise: any): string {
  if (exercise?.image) return exercise.image;
  const dbMatch = EXERCISES_DB.find(ex => ex.title.toLowerCase() === (exercise?.title || exercise?.originalTitle || '').toLowerCase() || ex.id === exercise?.id);
  if (dbMatch?.image) return dbMatch.image;

  const muscle = exercise?.muscleGroup || dbMatch?.muscleGroup || 'Pecho';
  const fallbackImages: Record<string, string> = {
    'Pecho': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&auto=format&fit=crop&q=60',
    'Espalda': 'https://images.unsplash.com/photo-1605296867304-46d5465a25f1?w=200&auto=format&fit=crop&q=60',
    'Hombros': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=200&auto=format&fit=crop&q=60',
    'Bíceps': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&auto=format&fit=crop&q=60',
    'Tríceps': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=60',
    'Cuádriceps': 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=200&auto=format&fit=crop&q=60',
    'Femorales': 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=200&auto=format&fit=crop&q=60',
    'Glúteos': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200&auto=format&fit=crop&q=60',
    'Pantorrillas': 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=200&auto=format&fit=crop&q=60',
    'Core': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=60',
    'Cuello': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=200&auto=format&fit=crop&q=60',
    'Cardio': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&auto=format&fit=crop&q=60'
  };

  return fallbackImages[muscle] || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=60';
}
