export interface ScreenTest {
  id: string;
  name: string;
  instruction: string;
  criteria: string;
}

export interface CorrectiveExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  description: string;
  instructions?: string[];
  image?: string;
}

export interface JointRehabProtocol {
  joint: string;
  displayName: string;
  screens: ScreenTest[];
  phases: {
    [phaseNum: number]: {
      name: string;
      goal: string;
      exercises: CorrectiveExercise[];
    };
  };
}

export interface SubstitutionRule {
  originalExercise: string;
  substitutedExercise: string;
  reason: string;
  rehabTips: string;
}

export const MILO_REHAB_PROTOCOLS: { [jointId: string]: JointRehabProtocol } = {
  back: {
    joint: 'back',
    displayName: 'Espalda Baja (Lumbar)',
    screens: [
      {
        id: 'flexion_tolerance',
        name: 'Prueba de Flexión Espinal (McGill)',
        instruction: 'Sentado en una silla, inclínate hacia adelante curvando la espalda como si fueras a tocar tus pies. Mantén por 5 segundos.',
        criteria: '¿Produce dolor en la espalda baja? Si es así, eres INTOLERANTE a la flexión (común en problemas de disco).'
      },
      {
        id: 'extension_tolerance',
        name: 'Prueba de Extensión Espinal',
        instruction: 'De pie, coloca tus manos en las caderas e inclínate suavemente hacia atrás, arqueando la espalda alta y baja.',
        criteria: '¿Produce dolor o pellizco en la columna? Si es así, eres INTOLERANTE a la extensión (común en problemas de facetas articulares).'
      },
      {
        id: 'shear_tolerance',
        name: 'Prueba de Tracción/Compresión (McGill)',
        instruction: 'Siéntate sobre tus manos en la silla y tira de la silla hacia arriba para comprimir tu columna. Luego, relájate y empuja el suelo.',
        criteria: '¿La compresión aumenta el dolor? Si es así, necesitas desarrollar rigidez muscular (estabilidad) mediante el McGill Big 3.'
      }
    ],
    phases: {
      1: {
        name: 'Fase 1: Control de Dolor y Rigidez',
        goal: 'Desensibilizar la columna y crear estabilidad usando los patrones de Stuart McGill.',
        exercises: [
          {
            id: 'mcgill_curlup',
            name: 'McGill Curl-up (Abdominales modificados)',
            sets: '3',
            reps: '10s de isométrico x 5',
            description: 'Tendido boca arriba, una pierna doblada, manos bajo la zona lumbar (mantener curva neutra). Eleva cabeza y hombros levemente.',
            instructions: [
              'Acuéstate boca arriba en el suelo. Coloca una pierna flexionada a 90 grados (pie plano) y la otra pierna extendida en el suelo.',
              'Coloca las palmas de tus manos debajo de tu zona lumbar para soportar y mantener la curva lumbar neutra natural.',
              'Levanta la cabeza y los hombros apenas unos centímetros del suelo de forma controlada. Imagina que tu cuello y cabeza son un bloque rígido sobre una balanza.',
              'Sostén esta contracción isométrica durante 10 segundos respirando normalmente.',
              'Regresa lentamente a la posición inicial. Completa las repeticiones indicadas y luego alterna la posición de las piernas.'
            ],
            image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80'
          },
          {
            id: 'side_plank',
            name: 'Side Bridge (Plancha Lateral)',
            sets: '3',
            reps: '10s de isométrico x 4 por lado',
            description: 'De lado apoyado en el codo y rodillas (o pies si es fácil). Eleva caderas alineando el cuerpo.',
            instructions: [
              'Acuéstate de lado apoyado en el antebrazo. Asegúrate de que tu codo esté directamente debajo de tu hombro.',
              'Apoya las rodillas (nivel principiante) o los bordes externos de tus pies (nivel avanzado) uno encima del otro.',
              'Eleva las caderas del suelo hasta que tu cuerpo forme una línea completamente recta desde la cabeza hasta los talones.',
              'Sostén la posición de forma estática por 10 segundos, asegurando que tu pelvis no gire hacia adelante ni caiga al suelo.',
              'Desciende despacio y repite por el lado opuesto.'
            ],
            image: 'https://images.unsplash.com/photo-1566241477600-ac026ad43874?w=600&auto=format&fit=crop&q=80'
          },
          {
            id: 'bird_dog',
            name: 'Bird Dog',
            sets: '3',
            reps: '10s de isométrico x 5 por lado',
            description: 'En cuadrupedia, extiende brazo izquierdo y pierna derecha alternando. Mantén la columna rígida y neutral.',
            instructions: [
              'Colócate en cuadrupedia (en cuatro puntos) sobre el suelo, alineando tus rodillas con tus caderas y tus manos con tus hombros.',
              'Mantén la columna en una posición neutral e involucra el core metiendo ligeramente el abdomen.',
              'Levanta y extiende de forma coordinada el brazo izquierdo hacia el frente y la pierna derecha hacia atrás, hasta alinearlos horizontalmente con tu torso.',
              'Mantén la posición por 10 segundos sin curvar la espalda ni rotar las caderas.',
              'Regresa lentamente a la posición de inicio y realiza el movimiento con el brazo derecho y la pierna izquierda.'
            ],
            image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80'
          }
        ]
      },
      2: {
        name: 'Fase 2: Movilidad de Cadera y Estabilidad Lumbar',
        goal: 'Aumentar el rango de movimiento de las caderas para que la lumbar no tenga que compensar.',
        exercises: [
          {
            id: 'hip_airplane',
            name: 'Hip Airplanes',
            sets: '3',
            reps: '8 por lado',
            description: 'Apoyado en un pie, inclina el torso hacia adelante y rota la pelvis abriéndola y cerrándola sobre la cadera de apoyo.',
            instructions: [
              'Ponte de pie apoyado en una sola pierna con la rodilla ligeramente flexionada.',
              'Inclina el torso hacia adelante manteniendo la espalda recta y extendiendo la otra pierna hacia atrás (posición de avión).',
              'Rota externamente tu pelvis (abriendo la cadera) de modo que tu pecho apunte hacia el costado.',
              'Mantén el control durante 1-2 segundos y luego rota internamente la pelvis (cerrando la cadera hacia el pie de apoyo).',
              'Regresa lentamente a la posición neutra y completa las repeticiones antes de cambiar de pie.'
            ],
            image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&auto=format&fit=crop&q=80'
          },
          {
            id: 'cat_camel',
            name: 'Cat-Camel (Movilidad suave)',
            sets: '2',
            reps: '10 a 15 de forma fluida',
            description: 'En cuadrupedia, arquea y curva suavemente la columna sin forzar el rango final. Movimiento pasivo de desensibilización.',
            instructions: [
              'Colócate en cuadrupedia con los hombros alineados sobre las manos y las caderas sobre las rodillas.',
              'Inicia el movimiento de "gato" empujando la columna hacia el techo, metiendo la barbilla hacia el pecho y contrayendo el abdomen.',
              'Pasa suavemente a la posición de "camello" arqueando la espalda, elevando el coxis y levantando la cabeza de forma natural.',
              'Realiza la transición de forma lenta y fluida sin forzar los rangos finales de movimiento para desensibilizar las vértebras.'
            ],
            image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80'
          }
        ]
      },
      3: {
        name: 'Fase 3: Carga Rígida e Integración',
        goal: 'Reintroducir cargas axiales controladas manteniendo la espalda rígida.',
        exercises: [
          {
            id: 'suitcase_carry',
            name: 'Suitcase Carries (Caminata de Maleta)',
            sets: '3',
            reps: '20 metros por lado',
            description: 'Sujeta una mancuerna pesada en una sola mano y camina erguido sin inclinarte hacia los lados.',
            instructions: [
              'Sujeta una mancuerna o kettlebell pesada con una sola mano, manteniéndola al costado de tu muslo.',
              'Mantén los hombros alineados, el pecho erguido y el core activamente contraído para evitar inclinarte hacia el lado con peso.',
              'Camina a paso lento y firme en línea recta, manteniendo una postura perfectamente erguida y estable.',
              'Realiza el recorrido indicado, cambia la pesa de mano y repite el proceso para trabajar el core anti-lateral.'
            ],
            image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'
          },
          {
            id: 'goblet_squat_box',
            name: 'Goblet Squat a Caja',
            sets: '3',
            reps: '8 a 10',
            description: 'Sentadilla con mancuerna al pecho bajando a tocar un banco/caja. Evita el "butt wink" (redondeo lumbar al bajar).',
            instructions: [
              'Sujeta una mancuerna o kettlebell verticalmente contra tu pecho (estilo goblet) con los codos apuntando hacia el suelo.',
              'Párate frente a una caja o banco a unos pasos de distancia, con los pies al ancho de hombros.',
              'Desciende empujando las caderas hacia atrás hasta tocar suavemente el banco con los glúteos, manteniendo el pecho erguido y la columna lumbar neutral.',
              'No permitas que el peso se relaje sobre el banco.',
              'Empuja los pies firmemente contra el suelo para ponerte de pie con fuerza explosiva.'
            ],
            image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80'
          }
        ]
      }
    }
  },
  shoulder: {
    joint: 'shoulder',
    displayName: 'Hombro',
    screens: [
      {
        id: 'impingement_test',
        name: 'Prueba de Pinzamiento (Neer / Hawkins)',
        instruction: 'Eleva el brazo dolorido hacia adelante por encima de tu cabeza. O bien, dobla el codo a 90 grados frente a ti y rota el antebrazo hacia el suelo con la ayuda de la otra mano.',
        criteria: '¿Produce dolor en la parte frontal o lateral del hombro? Si es así, hay posible pinzamiento subacromial.'
      },
      {
        id: 'internal_rotation',
        name: 'Movilidad de Rotación Interna',
        instruction: 'Lleva tu mano por detrás de tu espalda e intenta subirla para tocar tu omóplato opuesto.',
        criteria: '¿Hay dolor o una diferencia de más de 3 vértebras en altura en comparación con el brazo sano? Indica déficit de rotación interna (GIRD).'
      },
      {
        id: 'external_rotation_strength',
        name: 'Prueba de Fuerza de Rotadores Externos',
        instruction: 'Codos pegados al cuerpo doblados a 90 grados. Con el brazo doloroso, intenta empujar hacia afuera contra la otra mano que hace resistencia.',
        criteria: '¿Debilidad o dolor al resistir la fuerza? Tus rotadores externos necesitan activación urgente para estabilizar la cabeza del húmero.'
      }
    ],
    phases: {
      1: {
        name: 'Fase 1: Activación Escapular e Isometría',
        goal: 'Eliminar el dolor acromial activando serratos y rotadores.',
        exercises: [
          { id: 'scapular_pushups', name: 'Flexión Escapular (Scapular Push-ups)', sets: '3', reps: '12 a 15', description: 'En posición de plancha de manos, junta y separa tus omóplatos sin doblar los codos. Excelente para activar el serrato anterior.' },
          { id: 'external_rotation_band', name: 'Rotación Externa con Banda (Pegado a pared)', sets: '3', reps: '15 lentas', description: 'Codos pegados al cuerpo a 90°, abre la banda hacia afuera manteniendo los omóplatos firmes atrás.' }
        ]
      },
      2: {
        name: 'Fase 2: Movilidad Torácica y Rotadores Dinámicos',
        goal: 'Restablecer la extensión torácica y la movilidad glenohumeral.',
        exercises: [
          { id: 't_spine_extension', name: 'Extensión Torácica en Rodillo de Espuma', sets: '3', reps: '10 extensiones', description: 'Coloca el rodillo de espuma en la espalda media. Manos tras la cabeza y deja caer los codos hacia el suelo arqueando la columna torácica (no la lumbar).' },
          { id: 'shoulder_cars', name: 'CARs de Hombro (Controlled Articular Rotations)', sets: '2', reps: '5 círculos lentos por lado', description: 'Haz círculos completos y controlados con el brazo bloqueado, rotando internamente al ir hacia atrás. No archives la espalda.' }
        ]
      },
      3: {
        name: 'Fase 3: Estabilización Dinámica con Carga',
        goal: 'Fortalecer el hombro bajo tensión en rangos funcionales amplios.',
        exercises: [
          { id: 'kettlebell_bottoms_up', name: 'Prensa Invertida de Mancuerna (Bottoms-Up)', sets: '3', reps: '8 a 10', description: 'Sujeta una mancuerna/kettlebell al revés (la base hacia arriba). Mantén el puño alineado y presiona hacia arriba para activar el manguito rotador.' },
          { id: 'shoulder_warmup_7times', name: '7times Hombro Modificado', sets: '2', reps: '1 serie completa', description: 'Secuencia de 7 movimientos de hombro con pesas muy ligeras para fatiga estabilizadora.' }
        ]
      }
    }
  },
  hip: {
    joint: 'hip',
    displayName: 'Cadera',
    screens: [
      {
        id: 'fadir_test',
        name: 'Prueba FADIR (Choque Fémoroacetabular)',
        instruction: 'Túmbate boca arriba. Flexiona la cadera y la rodilla dolorida a 90°. Lleva la rodilla hacia adentro (cruza la línea media) y rota el pie hacia afuera.',
        criteria: '¿Sientes un dolor agudo o pellizco profundo en la parte interna de la ingle? Indica pinzamiento femoroacetabular (FAI).'
      },
      {
        id: 'hip_extension_test',
        name: 'Prueba de Thomas (Flexores de Cadera)',
        instruction: 'Siéntate al borde de una mesa estable. Túmbate hacia atrás abrazando fuerte la rodilla no afectada contra el pecho. Deja que la pierna afectada cuelgue libremente.',
        criteria: '¿El muslo de la pierna que cuelga queda por encima de la horizontal paralela al suelo? Indica acortamiento de psoas o flexores de cadera.'
      }
    ],
    phases: {
      1: {
        name: 'Fase 1: Desensibilización y Activación Glútea',
        goal: 'Estabilizar la pelvis y disminuir el pinzamiento anterior activando los rotadores externos.',
        exercises: [
          { id: 'glute_bridge_banded', name: 'Puente de Glúteo con Banda', sets: '3', reps: '15 reps (2s aguante arriba)', description: 'Tumbado boca arriba con banda sobre las rodillas. Eleva caderas empujando las rodillas hacia afuera.' },
          { id: 'side_plank_clam', name: 'Plancha Lateral con Apertura (Clamshell)', sets: '3', reps: '10 reps por lado', description: 'Plancha lateral corta apoyado sobre rodilla y codo. Abre las rodillas manteniendo los talones pegados.' }
        ]
      },
      2: {
        name: 'Fase 2: Movilidad de Cadera en Tres Planos',
        goal: 'Restaurar la rotación y flexión profunda de cadera liberando restricciones articulares.',
        exercises: [
          { id: 'pigeon_stretch_active', name: 'Estiramiento de Paloma Activo', sets: '3', reps: '8 por lado (5s retención)', description: 'Adopta la postura de paloma. Empuja activamente la rodilla y el pie contra el suelo para activar el glúteo en estiramiento.' },
          { id: 'hip_90_90_transitions', name: 'Transiciones de Cadera 90/90', sets: '2', reps: '10 transiciones fluidas', description: 'Sentado en el suelo con piernas a 90°. Rota las caderas de izquierda a derecha de forma controlada.' }
        ]
      },
      3: {
        name: 'Fase 3: Fuerza Unipodal e Integración Funcional',
        goal: 'Fortalecer el patrón de bisagra de cadera y la estabilidad lumbo-pélvica.',
        exercises: [
          { id: 'single_leg_rdl_dumbbell', name: 'Peso Muerto Rumano a una Pierna', sets: '3', reps: '8 a 10 por lado', description: 'Sostén una mancuerna ligera con la mano opuesta al pie de apoyo. Inclina el torso adelante manteniendo la espalda rígida.' },
          { id: 'cop_lunge', name: 'Sentadilla Búlgara enfocada en Glúteo', sets: '3', reps: '8 por lado (bajada controlada)', description: 'Pie trasero en un banco. Desciende con el torso levemente inclinado al frente para enfatizar el trabajo de cadera.' }
        ]
      }
    }
  },
  ankle: {
    joint: 'ankle',
    displayName: 'Tobillo',
    screens: [
      {
        id: 'ankle_dorsiflexion_test',
        name: 'Test de Rodilla a la Pared (Dorsiflexión)',
        instruction: 'Coloca el pie descalzo a 10cm de la pared. Intenta llevar la rodilla adelante hasta tocar la pared sin despegar el talón del suelo.',
        criteria: '¿La rodilla no llega a la pared o sientes un pellizco/bloqueo óseo duro al frente del tobillo? Tienes restricción de dorsiflexión.'
      },
      {
        id: 'ankle_instability_test',
        name: 'Estabilidad en Apoyo Unipodal (Ojos Cerrados)',
        instruction: 'Párate descalzo sobre una sola pierna. Cierra los ojos e intenta mantener el equilibrio durante 20 segundos.',
        criteria: '¿Pierdes el equilibrio constantemente o tu tobillo oscila y colapsa hacia los lados? Indica debilidad/inestabilidad neuromuscular.'
      }
    ],
    phases: {
      1: {
        name: 'Fase 1: Movilidad Articular y Descompresión',
        goal: 'Desbloquear el astrágalo y restaurar la flexión del tobillo.',
        exercises: [
          { id: 'banded_ankle_distraction_deep', name: 'Movilidad con Banda y Peso Corporal', sets: '3', reps: '15 reps', description: 'Banda gruesa atada al tobillo tirando hacia atrás y abajo. Avanza la rodilla superando la punta del pie.' },
          { id: 'weighted_dorsiflexion_stretch', name: 'Estiramiento de Dorsiflexión con Carga', sets: '3', reps: '45 segundos por lado', description: 'Pie sobre un cajón. Apoya una mancuerna sobre tu rodilla y empuja el torso adelante manteniendo el talón firme.' }
        ]
      },
      2: {
        name: 'Fase 2: Fortalecimiento y Control Excéntrico',
        goal: 'Desarrollar fuerza y grosor en el tendón de Aquiles y flexores.',
        exercises: [
          { id: 'eccentric_heel_drops', name: 'Descenso Excéntrico de Talones', sets: '3', reps: '12 reps (3s de bajada)', description: 'Sube con dos pies al borde de un escalón, retira el pie sano y baja lentamente el talón del pie lesionado por debajo del nivel.' },
          { id: 'tibialis_raise', name: 'Elevación de Tibial Anterior contra Pared', sets: '3', reps: '20 reps', description: 'Espalda apoyada en la pared con talones a 30cm. Eleva las puntas de los pies con fuerza y baja despacio.' }
        ]
      },
      3: {
        name: 'Fase 3: Estabilidad Reactiva y Pliometría',
        goal: 'Acondicionar el tobillo para fuerzas pliométricas y rebotes.',
        exercises: [
          { id: 'single_leg_balance_pad', name: 'Equilibrio Unipodal en Almohadilla/Bosu', sets: '3', reps: '45 segundos por lado', description: 'Mantén el equilibrio sobre un pie encima de un cojín inestable con las rodillas ligeramente debolqueadas.' },
          { id: 'pogo_hops_banded', name: 'Pogo Hops (Saltos Cortos Reactivos)', sets: '3', reps: '20 rebotes rápidos', description: 'Saltos cortos y rápidos sin doblar apenas las rodillas, impulsándote y rebotando solo con los tobillos.' }
        ]
      }
    }
  },
  elbow: {
    joint: 'elbow',
    displayName: 'Codo',
    screens: [
      {
        id: 'cozens_test',
        name: 'Prueba de Cozen (Epicondilitis Lateral)',
        instruction: 'Extiende el codo por completo. Cierra el puño, gira el antebrazo hacia adentro (pronación). Intenta extender la muñeca (tirar la mano hacia arriba) contra la resistencia de tu otra mano.',
        criteria: '¿Produce dolor agudo localizado en la cara externa de tu codo? Indica tendinopatía o codo de tenista.'
      },
      {
        id: 'golfers_elbow_test',
        name: 'Prueba de Epicondilitis Medial (Codo de Golfista)',
        instruction: 'Dobla el codo a 90°. Gira la palma hacia arriba (supinación). Intenta flexionar la muñeca (llevar la palma hacia ti) contra la resistencia de tu otra mano.',
        criteria: '¿Sientes dolor agudo localizado en la cara interna del codo? Indica tendinopatía o codo de golfista.'
      }
    ],
    phases: {
      1: {
        name: 'Fase 1: Carga Isométrica y Agarre Estático',
        goal: 'Disminuir el dolor del tendón mediante contracciones estáticas analgésicas.',
        exercises: [
          { id: 'wrist_extension_isometric', name: 'Isométrico de Muñeca (Extensión/Flexión)', sets: '3', reps: '45 segundos', description: 'Sostén una mancuerna ligera con la muñeca en línea recta. Mantén la contracción estática resistiendo el peso.' },
          { id: 'grip_squeezer', name: 'Presión de Agarre (Pelota / Handgripper)', sets: '3', reps: '30 segundos', description: 'Aprieta una pelota de goma o un gripper de forma constante con una intensidad moderada sin dolor.' }
        ]
      },
      2: {
        name: 'Fase 2: Trabajo Excéntrico y Rotaciones',
        goal: 'Reconstruir las fibras de colágeno del tendón mediante cargas excéntricas controladas.',
        exercises: [
          { id: 'eccentric_wrist_extension', name: 'Extensión Excéntrica de Muñeca', sets: '3', reps: '12 reps (4s bajada)', description: 'Eleva la mancuerna con ayuda de la mano sana. Baja la mancuerna lentamente usando solo la fuerza del antebrazo afectado.' },
          { id: 'hammer_pronation_supination', name: 'Pronación/Supinación con Martillo', sets: '3', reps: '10 reps lentas por lado', description: 'Sujeta un martillo o barra por un extremo. Rota el antebrazo de lado a lado despacio.' }
        ]
      },
      3: {
        name: 'Fase 3: Tracción y Fuerza Compuesta',
        goal: 'Integrar el antebrazo en ejercicios de tracción compuestos.',
        exercises: [
          { id: 'reverse_grip_curl_dumbbell', name: 'Bíceps Curl Invertido con Mancuerna', sets: '3', reps: '10 reps', description: 'Realiza flexiones de bíceps con agarre prono (palmas hacia abajo) para cargar extensores y braquiorradial.' },
          { id: 'towel_hangs', name: 'Colgado de Barra con Toallas', sets: '3', reps: '20 a 30 segundos', description: 'Pasa dos toallas por una barra de dominadas y cuélgate de ellas sujetando firmemente la tela.' }
        ]
      }
    }
  },
  knee: {
    joint: 'knee',
    displayName: 'Rodilla',
    screens: [
      {
        id: 'valgus_check',
        name: 'Prueba de Sentadilla Unipodal (Control de Cadera)',
        instruction: 'Párate sobre una sola pierna y realiza una sentadilla parcial controlada (unos 30-45 grados). Observa el movimiento de la rodilla en un espejo.',
        criteria: '¿Tu rodilla se colapsa hacia adentro (valgo) o tiembla excesivamente? Esto indica debilidad en los rotadores externos y abductores de la cadera.'
      },
      {
        id: 'ankle_restriction',
        name: 'Test de Flexión de Tobillo (Rodilla a la Pared)',
        instruction: 'Coloca el pie descalzo a 10 cm de la pared y trata de tocar la pared con la rodilla sin levantar el talón.',
        criteria: '¿No logras tocar la pared o sientes un bloqueo rígido al frente del tobillo? Una mala movilidad de tobillo transfiere el impacto y sobrecarga a la rodilla.'
      },
      {
        id: 'patellar_load',
        name: 'Prueba de Carga del Tendón (Sentadilla Unipodal)',
        instruction: 'Realiza una sentadilla profunda en una sola pierna (puedes inclinar el talón en una rampa). Presta atención al dolor debajo o encima de la rótula.',
        criteria: '¿Sientes un dolor punzante en el tendón rotuliano o cuadricipital al descender? Indica falta de tolerancia a la carga (tendinopatía).'
      }
    ],
    phases: {
      1: {
        name: 'Fase 1: Activación y control isométrico',
        goal: 'Controlar el dolor inicial y activar el cuádriceps sin irritar el tendón.',
        exercises: [
          {
            id: 'spanish_squat_isometric',
            name: 'Sentadilla Española Isométrica',
            sets: '3',
            reps: '45 segundos',
            description: 'Con una banda elástica gruesa detrás de las rodillas, apóyate contra un poste y mantén la sentadilla a 90 grados.',
            instructions: [
              'Pasa una banda de resistencia gruesa detrás de ambas rodillas (justo debajo de la rótula) y ancla el otro extremo a un poste o rack seguro.',
              'Da un paso hacia atrás hasta crear una gran tensión en la banda. Coloca los pies al ancho de hombros.',
              'Desciende lentamente a una posición de media sentadilla (aproximadamente a 90 grados), manteniendo la tibia completamente vertical y el torso recto.',
              'Empuja las rodillas hacia atrás activamente contra la resistencia de la banda para mantener la contracción en los cuádriceps.',
              'Sostén esta posición isométrica estable durante 45 segundos.'
            ],
            image: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=600&auto=format&fit=crop&q=80'
          },
          {
            id: 'quad_set_isomeric',
            name: 'Isometría de Cuádriceps (Extensión)',
            sets: '3',
            reps: '10 reps (5s de contracción)',
            description: 'Tumbado boca arriba, coloca una toalla enrollada bajo la rodilla y empuja hacia abajo contrayendo el cuádriceps.',
            instructions: [
              'Acuéstate boca arriba o siéntate en el suelo con la pierna afectada extendida al frente.',
              'Coloca una toalla enrollada de forma firme o un pequeño rodillo de espuma directamente debajo de la rodilla lesionada.',
              'Contrae activamente el cuádriceps (muslo anterior) empujando la parte posterior de la rodilla con fuerza hacia abajo contra la toalla.',
              'Mantén los dedos del pie apuntando hacia arriba y el talón puede levantarse ligeramente del suelo.',
              'Sostén la contracción máxima durante 5 segundos, relájate por completo y repite.'
            ],
            image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80'
          }
        ]
      },
      2: {
        name: 'Fase 2: Movilidad e Integración de Cadera y Tobillo',
        goal: 'Liberar las restricciones de tobillo y activar los abductores de cadera para estabilizar la rodilla.',
        exercises: [
          { id: 'banded_joint_mobilization_ankle', name: 'Movilización con Banda para Tobillo', sets: '3', reps: '15 reps por lado', description: 'Coloca una banda elástica en la parte frontal del tobillo y empuja la rodilla hacia adelante de forma dinámica superando el pie.' },
          { id: 'banded_monster_walks', name: 'Monster Walks con Banda (Glúteo Medio)', sets: '3', reps: '15 pasos por lado', description: 'Coloca una mini-banda alrededor de tus tobillos, flexiona ligeramente las rodillas y camina lateralmente manteniendo la tensión.' },
          { id: 'peterson_step_up', name: 'Step-Up de Peterson (Control de Vasto Medial)', sets: '3', reps: '15 reps por lado', description: 'Párate en el borde de un escalón bajo. Desciende el talón libre lentamente al suelo manteniendo el talón de apoyo elevado, y sube concentrando la fuerza en el cuádriceps.' }
        ]
      },
      3: {
        name: 'Fase 3: Fuerza Dinámica Excéntrica e Integración',
        goal: 'Fortalecer el aparato extensor del cuádriceps mediante cargas excéntricas controladas.',
        exercises: [
          { id: 'eccentric_bulgarian_split_squat', name: 'Sentadilla Búlgara Excéntrica', sets: '3', reps: '8 reps por lado (4s bajada)', description: 'Coloca el pie trasero en un banco. Baja muy lentamente durante 4 segundos hasta que la rodilla trasera casi toque el suelo, y sube de forma explosiva.' },
          { id: 'sl_box_squat', name: 'Sentadilla Unipodal a Caja/Banco', sets: '3', reps: '8 reps por lado', description: 'De pie sobre una sola pierna frente a un banco. Siéntate controladamente empujando la cadera atrás y vuelve a subir sin impulsarte.' }
        ]
      }
    }
  }
};

export const MILO_SUBSTITUTIONS: SubstitutionRule[] = [
  {
    originalExercise: 'Bench Press (Barbell)',
    substitutedExercise: 'Bench Press (Dumbbell) con Agarre Neutro',
    reason: 'El Press de Banca con barra bloquea los hombros en rotación interna, aumentando la compresión en el espacio subacromial.',
    rehabTips: 'Usa mancuernas con las palmas mirándose entre sí en un ángulo de 45° (agarre semineutro) para permitir que los omóplatos se muevan libremente.'
  },
  {
    originalExercise: 'Bench Press (Dumbbell)',
    substitutedExercise: 'Dumbbell Floor Press (Prensa desde el Suelo)',
    reason: 'Al tumbarte en el suelo, el suelo frena los codos impidiendo que vayan por detrás del cuerpo, lo que elimina el estrés por extensión extrema del hombro.',
    rehabTips: 'Baja de forma controlada hasta que tus tríceps toquen suavemente el suelo, mantén 1 segundo en el suelo y empuja.'
  },
  {
    originalExercise: 'Squat (Barbell)',
    substitutedExercise: 'Goblet Squat a Banco / Caja',
    reason: 'Colocar el peso en el pecho (Goblet) fuerza una postura del torso más vertical, aliviando la carga de cizalla en la columna lumbar.',
    rehabTips: 'Usa un banco o caja como objetivo. Baja empujando las caderas atrás, toca suavemente el banco con los glúteos sin relajarte y vuelve a subir.'
  },
  {
    originalExercise: 'Deadlift (Barbell)',
    substitutedExercise: 'Rack Pulls (Desde Bloques / Soporte)',
    reason: 'Levantar desde el suelo requiere gran movilidad de caderas. Si te falta, redondearás la columna lumbar para compensar.',
    rehabTips: 'Coloca los soportes del rack justo por debajo de tus rodillas. Esto te permite entrenar la extensión de cadera de forma mucho más segura para tu espalda.'
  },
  {
    originalExercise: 'Overhead Press (Barbell)',
    substitutedExercise: 'Landmine Press a una Mano',
    reason: 'El empuje vertical puro requiere una movilidad impecable de columna torácica y hombros. El empuje inclinado (Landmine) es mucho más amigable.',
    rehabTips: 'Coloca la barra en un anclaje landmine (esquina). Empuja la barra en diagonal hacia adelante y arriba, manteniendo el abdomen rígido.'
  },
  {
    originalExercise: 'Bicep Curl (Barbell)',
    substitutedExercise: 'Hammer Curl (Dumbbell)',
    reason: 'La barra recta fuerza una supinación total que puede inflamar los tendones del codo (epicondilitis/epitrocleitis).',
    rehabTips: 'Sujeta las mancuernas con agarre de martillo (palmas mirándose). Esto distribuye el peso de forma más uniforme en el antebrazo.'
  },
  {
    originalExercise: 'Pull Up',
    substitutedExercise: 'Lat Pulldown con Agarre Neutro (Mano Semipronada/Supinada)',
    reason: 'Las dominadas con agarre prono o supino completo colocan gran tensión en los tendones del codo cuando hay epicondilitis.',
    rehabTips: 'Usa una barra de agarre paralelo (palmas mirándose) o anillas para reducir la tensión de torsión en la articulación del codo.'
  },
  {
    originalExercise: 'Leg Extension',
    substitutedExercise: 'Sentadilla Española Isométrica (con banda) o Sentadilla Isométrica contra Pared',
    reason: 'Las extensiones de piernas en máquina ejercen una tensión cizallante muy alta en la rótula en los últimos grados de extensión.',
    rehabTips: 'Utiliza la sentadilla española o la sentadilla isométrica recostando tu peso en la pared a 90 grados para cargar el tendón de forma analgésica.'
  }
];

export function getSubstitutedExercise(exerciseName: string): SubstitutionRule | undefined {
  return MILO_SUBSTITUTIONS.find(s => exerciseName.toLowerCase().includes(s.originalExercise.toLowerCase()));
}

