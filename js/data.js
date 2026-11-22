'use strict';
/* Trabaja — datos estáticos del juego */
const KEY = 'trabaja_v1';
const LEGACY_KEY = 'sistema_despertar_v1';

const ATTRS = [
  { key: 'fuerza', name: 'Fuerza', icon: 'sword', desc: 'Potencia y esfuerzo' },
  { key: 'agilidad', name: 'Agilidad', icon: 'bolt', desc: 'Movimiento y coordinación' },
  { key: 'vitalidad', name: 'Vitalidad', icon: 'heart', desc: 'Resistencia y recuperación' },
  { key: 'inteligencia', name: 'Inteligencia', icon: 'brain', desc: 'Aprendizaje y enfoque' },
  { key: 'percepcion', name: 'Percepción', icon: 'eye', desc: 'Atención y conciencia' }
];

const TYPES = ['Personal', 'Salud', 'Estudio', 'Trabajo', 'Disciplina'];
const TYPE_ICON = { Personal: 'star', Salud: 'heart', Estudio: 'book', Trabajo: 'briefcase', Disciplina: 'shield' };
const PRIORITIES = {
  alta: { label: 'Alta', order: 0 },
  media: { label: 'Media', order: 1 },
  baja: { label: 'Baja', order: 2 }
};

/* Banco de misiones: cada día se eligen 3 fijas + 3 al azar (misma semilla por fecha). */
const CORE_MISSIONS = ['exercise', 'water', 'focus'];
const MISSION_POOL = [
  { id: 'exercise', name: 'Actividad física', desc: 'Rutina sugerida o 20 minutos de movimiento.', icon: 'dumbbell', xp: 20, type: 'Salud', stat: 'fuerza' },
  { id: 'water', name: 'Hidratación', desc: 'Bebe agua a lo largo del día.', icon: 'droplet', xp: 10, type: 'Salud', stat: 'vitalidad' },
  { id: 'focus', name: 'Enfoque', desc: 'Completa una tarea sin distracciones.', icon: 'target', xp: 25, type: 'Trabajo', stat: 'inteligencia' },
  { id: 'reading', name: 'Lectura', desc: 'Lee 15 páginas o estudia 20 minutos.', icon: 'book', xp: 20, type: 'Estudio', stat: 'inteligencia' },
  { id: 'order', name: 'Ordena tu espacio', desc: 'Dedica 10 minutos a ordenar.', icon: 'broom', xp: 15, type: 'Disciplina', stat: 'percepcion' },
  { id: 'sleep', name: 'Descanso', desc: 'Prepara una hora de descanso saludable.', icon: 'moon', xp: 20, type: 'Salud', stat: 'vitalidad' },
  { id: 'plan', name: 'Planifica tu día', desc: 'Escribe tus 3 prioridades de hoy.', icon: 'calendar', xp: 15, type: 'Trabajo', stat: 'inteligencia' },
  { id: 'walk', name: 'Caminata', desc: 'Camina 20 minutos al aire libre.', icon: 'run', xp: 20, type: 'Salud', stat: 'agilidad' },
  { id: 'stretch', name: 'Estiramientos', desc: 'Movilidad suave durante 10 minutos.', icon: 'leaf', xp: 10, type: 'Salud', stat: 'agilidad' },
  { id: 'inbox', name: 'Bandeja limpia', desc: 'Responde o archiva pendientes.', icon: 'inbox', xp: 15, type: 'Trabajo', stat: 'percepcion' },
  { id: 'learn', name: 'Aprende algo nuevo', desc: 'Un video, artículo o práctica breve.', icon: 'sparkle', xp: 20, type: 'Estudio', stat: 'inteligencia' },
  { id: 'breathe', name: 'Respira y agradece', desc: '5 minutos de calma y 3 cosas buenas.', icon: 'heart', xp: 10, type: 'Disciplina', stat: 'percepcion' },
  { id: 'food', name: 'Cuida tu comida', desc: 'Una comida sencilla y sin prisa.', icon: 'leaf', xp: 15, type: 'Salud', stat: 'vitalidad' },
  { id: 'goals', name: 'Revisa tus metas', desc: 'Mira tu progreso y ajusta el rumbo.', icon: 'flag', xp: 15, type: 'Disciplina', stat: 'inteligencia' }
];

const RECUR = [
  { id: 'water-repeat', name: 'Bebe un vaso de agua', desc: 'Pausa de hidratación, sin forzar cantidades.', icon: 'droplet', xp: 4, interval: 120, max: 5, setting: 'waterInterval' },
  { id: 'stretch-repeat', name: 'Pausa activa', desc: 'Camina un poco y estira suavemente.', icon: 'leaf', xp: 5, interval: 180, max: 4, setting: 'stretchInterval' }
];

const ROUTINES = {
  A: [
    { id: 'squat', name: 'Sentadilla a silla o libre', reps: 8, unit: 'reps', sets: 2, desc: 'Rango cómodo y controla la bajada.' },
    { id: 'push', name: 'Flexión inclinada', reps: 6, unit: 'reps', sets: 2, desc: 'Manos en pared o mesa firme.' },
    { id: 'row', name: 'Remo con mancuerna/mochila', reps: 8, unit: 'por lado', sets: 2, desc: 'Apoya una mano; espalda neutra.' },
    { id: 'bridge', name: 'Puente de glúteos', reps: 10, unit: 'reps', sets: 2, desc: 'Sin hiperextender la espalda.' },
    { id: 'deadbug', name: 'Dead bug', reps: 6, unit: 'por lado', sets: 2, desc: 'Lento, con espalda baja controlada.' }
  ],
  B: [
    { id: 'lunge', name: 'Zancada atrás asistida', reps: 6, unit: 'por lado', sets: 2, desc: 'Sujétate de una silla; opción sentadilla a silla.' },
    { id: 'press', name: 'Press de pecho en suelo', reps: 8, unit: 'reps', sets: 2, desc: 'Carga ligera o flexión inclinada.' },
    { id: 'hinge', name: 'Bisagra de cadera', reps: 8, unit: 'reps', sets: 2, desc: 'Peso muerto rumano ligero o practica sin peso.' },
    { id: 'shoulder', name: 'Press de hombros', reps: 8, unit: 'reps', sets: 2, desc: 'Sin peso o mancuernas ligeras.' },
    { id: 'birddog', name: 'Bird dog', reps: 6, unit: 'por lado', sets: 2, desc: 'Extiende brazo y pierna opuestos.' },
    { id: 'march', name: 'Marcha en el sitio', reps: 30, unit: 'segundos', sets: 2, desc: 'Ritmo cómodo, sin saltos.' }
  ]
};

const G = 'assets/img/guardians/';
const WARRIORS = [
  { id: 'first', name: 'Sistema iniciado', title: 'Primer despertar', desc: 'La primera misión completada activa el Sistema y revela tu inicio.', legend: 'Una señal aparece ante ti. No es el final ni una recompensa por ser perfecto: es el recordatorio de que ya comenzaste. Cada misión será una nueva página de tu despertar.', image: G + '00-sistema.webp', rarity: 'Común', condition: 'Completa tu primera misión.' },
  { id: 'missions3', name: 'Killo', title: 'Capibara paladín', desc: 'Un paladín capibara amistoso que protege a todos sin juzgar.', legend: 'Killo es el amigo de todos: tranquilo, noble y firme cuando alguien necesita ayuda. Su escudo recuerda que la amabilidad también es una forma de fuerza.', image: G + '01-killo.webp', rarity: 'Común', condition: 'Completa 3 misiones.' },
  { id: 'minos5', name: 'Minos', title: 'Bárbaro', desc: 'Minos, el bárbaro de corazón noble, abre camino con fuerza y lealtad.', legend: 'Minos parece torpe y ruidoso, pero su corazón es más grande que su hacha. Si te levantas para intentarlo, él estará a tu lado rompiendo cualquier obstáculo.', image: G + '02-minos.webp', rarity: 'Común', condition: 'Completa 5 misiones.' },
  { id: 'level5', name: 'Mephisto', title: 'Pícaro', desc: 'El gato maleante que domina los tejados y las sombras.', legend: 'Mephisto desaparece entre sombras antes de que el enemigo parpadee. Ama los techos, los atajos y las victorias silenciosas.', image: G + '04-mephisto.webp', rarity: 'Épico', condition: 'Alcanza nivel 5.' },
  { id: 'ten', name: 'Virgilio', title: 'Malandro', desc: 'El líder callejero que convierte la astucia y la constancia en ventaja.', legend: 'Virgilio conoce cada callejón y cada salida. Lidera a su banda con ingenio, y siempre guarda una ruta secreta para quien no abandona sus órdenes.', image: G + '06-virgilio.webp', rarity: 'Raro', condition: 'Completa 10 misiones.' },
  { id: 'streak3', name: 'Mapache', title: 'Tanuki chismoso', desc: 'Un tanuki barrigón que ama la basura, los bocadillos y el chisme.', legend: 'Mapache siempre aparece con algún tesoro rescatado de la basura y una historia exagerada. Puede distraerte con chismes, pero nunca deja solo a su grupo.', image: G + '07-mapache.webp', rarity: 'Raro', condition: 'Consigue una racha de 3 días.' },
  { id: 'streak7', name: 'Gatino', title: 'Hechicero supremo', desc: 'Un sabio arcano que estudió hasta dominar magia antigua.', legend: 'Gatino estudió estrellas y runas hasta dominar una magia antigua. Su familiar felino vigila tu camino y convierte la perseverancia en poder arcano.', image: G + '08-gatino.webp', rarity: 'Épico', condition: 'Consigue una racha de 7 días.' },
  { id: 'workout10', name: 'Maribel', title: 'Coneja guerrera', desc: 'Una pequeña guerrera coneja blanca, poderosa y valiente.', legend: 'Maribel demuestra que el tamaño no decide una batalla. Con disciplina, coraje y una voluntad inquebrantable, se abre paso incluso ante enemigos enormes.', image: G + '09-maribel.webp', rarity: 'Épico', condition: 'Completa 10 entrenamientos.' },
  { id: 'workout5', name: 'Fausto', title: 'Caballero', desc: 'Un noble caballero que aprendió a reír incluso ante la desgracia.', legend: 'Fausto juró proteger a quienes se levantan tras cada caída. Su escudo no promete una vida sin golpes: promete que no enfrentarás tus desafíos sin valor.', image: G + '10-fausto.webp', rarity: 'Raro', condition: 'Completa 5 entrenamientos.' },
  { id: 'xp500', name: 'JoserBlood', title: 'Señor del pan del Beni', desc: 'El soberano del pan beniano, capaz de convertir una merienda en una celebración.', legend: 'JoserBlood protege el sagrado pan del Beni y recompensa a quienes acumulan esfuerzo. Su lema es sencillo: ningún cazador pelea con el estómago vacío.', image: G + '11-joserblood-pan.webp', rarity: 'Épico', condition: 'Acumula 500 XP.' },
  { id: 'missions15', name: 'Chanco espectral', title: 'Herrero del inframundo', desc: 'Un herrero espectral que abandonó un mundo podrido para desafiar a los dioses.', legend: 'Chanco dejó atrás un mundo que ya no soportaba y descendió al inframundo con su martillo. Forja armas para quienes tienen el valor de enfrentarse a lo imposible.', image: G + '12-chanco-espectral.webp', rarity: 'Legendario', condition: 'Completa 15 misiones.' },
  { id: 'xp2500', name: 'JoserBlood · Señor del inframundo', title: 'Boss secreto', desc: 'La forma definitiva del señor del pan: soberano del inframundo.', legend: 'Tras dominar el reino del pan, JoserBlood conquistó el inframundo. Su presencia es una prueba de que tu voluntad ya supera los límites de un cazador ordinario.', image: G + '13-joserblood-inframundo.webp', rarity: 'Mítico', condition: 'Acumula 2.500 XP.' }
];

/* Tienda */
const THEMES = [
  { id: 'violet', name: 'Violeta', price: 0, swatch: ['#9c72ff', '#54d9ff'] },
  { id: 'ocean', name: 'Océano', price: 60, swatch: ['#4cc3ff', '#7c8cff'] },
  { id: 'emerald', name: 'Esmeralda', price: 80, swatch: ['#3fd98f', '#38bdf8'] },
  { id: 'crimson', name: 'Carmesí', price: 100, swatch: ['#ff5479', '#ffb86b'] },
  { id: 'amber', name: 'Ámbar', price: 120, swatch: ['#f3c66e', '#ff8a5c'] }
];
const FRAMES = [
  { id: 'none', name: 'Sin marco', price: 0, color: '' },
  { id: 'gold', name: 'Marco dorado', price: 50, color: '#f3c66e' },
  { id: 'cyan', name: 'Marco cian', price: 50, color: '#54d9ff' },
  { id: 'ruby', name: 'Marco rubí', price: 70, color: '#ff5479' }
];
const TITLES = [
  { id: '', name: 'Sin título', price: 0 },
  { id: 'aprendiz', name: 'Aprendiz del Sistema', price: 30 },
  { id: 'disciplinado', name: 'Mente disciplinada', price: 60 },
  { id: 'veterano', name: 'Veterano del Despertar', price: 100 }
];
const CONSUMABLES = [
  { id: 'shield', name: 'Escudo de racha', desc: 'Protege tu racha si fallas un día. Máximo 3.', price: 80, icon: 'shield' },
  { id: 'boost', name: 'Elixir de XP', desc: '+50% de XP durante 24 horas.', price: 120, icon: 'bolt' }
];

/* Retos semanales y jefes */
const WEEKLY_POOL = [
  { id: 'missions', name: 'Completa {n} misiones', stat: 'missions', targets: [12, 15, 18], xp: 120, coins: 30, icon: 'list' },
  { id: 'workouts', name: 'Termina {n} entrenamientos', stat: 'workouts', targets: [2, 3], xp: 100, coins: 25, icon: 'dumbbell' },
  { id: 'focus', name: 'Haz {n} sesiones de enfoque', stat: 'focus', targets: [4, 6, 8], xp: 130, coins: 35, icon: 'timer' },
  { id: 'xp', name: 'Gana {n} XP', stat: 'xp', targets: [300, 400, 500], xp: 100, coins: 25, icon: 'bolt' },
  { id: 'days', name: 'Sé activo {n} días', stat: 'days', targets: [4, 5, 6], xp: 110, coins: 30, icon: 'calendar' },
  { id: 'water', name: 'Bebe agua {n} veces', stat: 'water', targets: [12, 16], xp: 80, coins: 20, icon: 'droplet' }
];
const BOSSES = [
  { name: 'Sombra de la Procrastinación', icon: 'skull', desc: 'Susurra «mañana» y se alimenta de tu tiempo.' },
  { name: 'Gólem de la Pereza', icon: 'castle', desc: 'Pesa una tonelada, pero cae con pequeños golpes constantes.' },
  { name: 'Hidra del Desorden', icon: 'flame', desc: 'Por cada tarea pendiente le crece otra cabeza.' },
  { name: 'Espectro de la Distracción', icon: 'eye', desc: 'Te llama desde el teléfono justo cuando empiezas.' },
  { name: 'Coloso del Agotamiento', icon: 'moon', desc: 'Se debilita cuando descansas bien y avanzas a tu ritmo.' }
];

const FOCUS_PRESETS = [15, 25, 45, 60];
const BREAK_PRESETS = [5, 10];
const FOCUS_XP_PER_MIN = 0.8;
const FOCUS_XP_DAY_CAP = 120;
const SOUND_LABELS = { menu: 'Menús', select: 'Selección', complete: 'Completar', fail: 'Error', level: 'Subida de nivel', unlock: 'Despertar' };
