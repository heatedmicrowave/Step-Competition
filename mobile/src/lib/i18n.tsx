// Every word the app shows, in each language. Written to sound like each language, not translated
// word for word. The app follows the phone's language; Settings can override it (Napoletano is only
// reachable there, since iPhones don't offer it as a system language). English, Italian, Napoletano,
// Spanish, Japanese.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { NativeModules } from 'react-native';
import { errorText } from './supabase';

export type Lang = 'en' | 'it' | 'nap' | 'es' | 'ja';
export const LANGS: Lang[] = ['en', 'it', 'nap', 'es', 'ja'];
export type LangChoice = Lang | 'auto';

const en = {
  // Home
  stepsToday: 'Steps today',
  synced: (time: string) => `Synced ${time}`,
  notConnectedHealth: 'Not connected to Apple Health',
  syncFailed: (why: string) => `Sync failed: ${why}`,
  profileFailed: "Couldn't load your profile. Pull down to retry.",
  noHealth: "Apple Health isn't available on this device.",
  fitbitReconnectBody: 'Google needs you to sign in again so your steps keep counting.',
  reconnectFitbit: 'Reconnect Fitbit',
  startOne: 'Start one',
  join: 'Join',
  running: 'Running',
  finished: 'Finished',
  nothingRunning: 'Nothing running. Start one and send your friends the code.',
  startsOn: (date: string) => `Starts ${date}`,
  lastDay: 'Last day',
  daysLeft: (n: number) => `${n} days left`,

  // Screen titles
  titleNew: 'NEW COMPETITION',
  titleJoin: 'JOIN',
  titleYou: 'YOU',

  // Join
  inviteCode: 'Invite code',

  // New competition
  name: 'Name',
  compNamePlaceholder: 'November showdown',
  starts: 'Starts',
  today: 'Today',
  tomorrow: 'Tomorrow',
  length: 'Length',
  lengths: ['1 day', '2 days', '1 week', '2 weeks', '1 month', '3 months'],
  startBtn: 'Start',

  // Settings
  nameOnBoard: 'Name on the leaderboard',
  namePlaceholder: 'e.g. Heated microwave',
  save: 'Save',
  saved: 'Saved.',
  yourDevice: 'Your device',
  notConnectedYet: 'Not connected yet',
  changeDevice: 'Change device',
  websiteBefore: 'Used the website before?',
  websiteBody: 'Paste your old secret key to bring over your history and competitions.',
  secretKey: 'Secret key',
  link: 'Link',
  linked: 'Linked. Your website history and competitions are now on this account.',
  language: 'Language',
  langAuto: 'Same as phone',
  done: 'Done',
  signOut: 'Sign out',

  // Sign in
  tagline: 'Steps against your friends, whatever watch they wear.',
  linkSent: (email: string) => `Link sent to ${email}`,
  signIn: 'Sign in',
  email: 'Email',
  emailMe: 'Email me a link',
  openEmail: 'Open the email on this phone and tap the link. It brings you straight back here.',
  differentEmail: 'Different email',

  // First run
  stepOf: (n: number, of: number) => `${n} of ${of}`,
  whatName: 'What should we call you?',
  addName: 'Add a name first.',
  next: 'Next',
  whatWear: 'What do you wear?',
  tapAllow: "Tap it, then Allow. That's it.",
  connecting: 'Connecting…',
  keepDevice: 'Keep my current device',
  oneMore: 'One more thing',
  checkAgain: 'I did it, check again',
  tryAgain: 'Try again',
  pickDifferent: 'Pick a different device',
  noHealthPhone: "This phone doesn't have Apple Health. The Android version is coming.",
  justIphone: 'Just my iPhone',
  fixShare: (app: string) => `Open ${app}, find Apple Health in its settings, and turn on sharing for Steps. Then come back here.`,
  fixAndroidOnly: 'Galaxy Watches only pair with Android phones. The Android version of this app is coming.',
  fixGeneric: (device: string) => `Make sure your ${device} app shares steps with Apple Health.`,

  // Fitbit sign-in
  fitbitErrors: {
    access_denied: 'Google sign-in was cancelled.',
    closed: 'Google sign-in was closed before finishing.',
    not_linked: "Your Fitbit isn't on a Google account yet. Open the Fitbit app, follow its prompt to move your account to Google, then come back and tap Try again.",
    expired: 'That took too long. Try again.',
    no_refresh_token: "Google didn't give us lasting access. Try again.",
  } as Record<string, string>,
  fitbitUnknown: (code: string) => `Couldn't connect Fitbit (${code}).`,

  // Leaderboard
  justNow: 'just now',
  minAgo: (n: number) => `${n}m ago`,
  hAgo: (n: number) => `${n}h ago`,
  dAgo: (n: number) => `${n}d ago`,
  leaveQ: 'Leave this competition?',
  cancel: 'Cancel',
  leave: 'Leave',
  finalResults: 'Final results',
  dayOf: (n: number, of: number) => `Day ${n} of ${of}`,
  you: 'you',
  todaySteps: (n: string) => `${n} today`,
  noData: 'no data yet',
  sendFriend: 'Send to a friend',
  shareMsg: (comp: string, code: string) => `Join "${comp}" in Pass1. Code: ${code}`,

  // Challenges
  tabToday: 'Today', tabChallenges: 'Challenges', tabAccount: 'Account',
  yourChallenges: 'Your challenges', startNew: 'Start a new one', moreChallenges: 'More challenges', joinCode: 'Join with code',
  oldSite: 'Used the old website?',
  garminHint: 'Not updating? Open Garmin Connect for a second so it syncs.',
  pickCourse: 'Where are we going?',
  kinds: ['Climbs', 'Routes', 'Classic'],
  courseNames: {
    vesuvius: ['Vesuvius', 'Naples, Italy'],
    half_dome: ['Half Dome', 'Yosemite, California'],
    matterhorn: ['Matterhorn', 'Zermatt, Switzerland'],
    big_sur: ['Big Sur', 'Carmel to San Simeon, Highway 1'],
    classic: ['Most steps', 'Whoever walks the most wins'],
  } as Record<string, [string, string]>,
  toGo: (v: string) => `${v} to go`,
  atTop: 'At the top!',
  stepsWord: 'steps',
  atEnd: 'Made it!',
  top: (v: string) => `Top ${v}`,
  routeLen: (v: string) => `${v} of coast`,

  // Messages from the server, by their exact English text
  server: {
    'no competition with that code': 'No competition with that code.',
    'key not found or already linked': 'That key is wrong or already linked to an account.',
    'this account already has its own steps': 'This account already has its own steps, so it can’t take over a website player.',
    'email rate limit exceeded': 'Too many sign-in emails right now. Wait a few minutes and try again.',
  } as Record<string, string>,
};

export type Strings = typeof en;

const it: Strings = {
  stepsToday: 'Passi di oggi',
  synced: (time) => `Aggiornato alle ${time}`,
  notConnectedHealth: 'Non collegato a Salute',
  syncFailed: (why) => `Aggiornamento non riuscito: ${why}`,
  profileFailed: 'Non riesco a caricare il tuo profilo. Scorri verso il basso per riprovare.',
  noHealth: 'Salute non è disponibile su questo dispositivo.',
  fitbitReconnectBody: 'Google ti chiede di accedere di nuovo, così i tuoi passi continuano a contare.',
  reconnectFitbit: 'Ricollega Fitbit',
  startOne: 'Nuova sfida',
  join: 'Partecipa',
  running: 'In corso',
  finished: 'Concluse',
  nothingRunning: 'Nessuna sfida in corso. Creane una e manda il codice ai tuoi amici.',
  startsOn: (date) => `Inizia il ${date}`,
  lastDay: 'Ultimo giorno',
  daysLeft: (n) => `Mancano ${n} giorni`,

  titleNew: 'NUOVA SFIDA',
  titleJoin: 'PARTECIPA',
  titleYou: 'TU',

  inviteCode: 'Codice invito',

  name: 'Nome',
  compNamePlaceholder: 'Sfida di novembre',
  starts: 'Inizio',
  today: 'Oggi',
  tomorrow: 'Domani',
  length: 'Durata',
  lengths: ['1 giorno', '2 giorni', '1 settimana', '2 settimane', '1 mese', '3 mesi'],
  startBtn: 'Via!',

  nameOnBoard: 'Nome in classifica',
  namePlaceholder: 'es. Heated microwave',
  save: 'Salva',
  saved: 'Salvato.',
  yourDevice: 'Il tuo dispositivo',
  notConnectedYet: 'Non ancora collegato',
  changeDevice: 'Cambia dispositivo',
  websiteBefore: 'Usavi già il sito?',
  websiteBody: 'Incolla la tua vecchia chiave segreta per portare qui lo storico e le sfide.',
  secretKey: 'Chiave segreta',
  link: 'Collega',
  linked: 'Fatto. Lo storico e le sfide del sito ora sono su questo account.',
  language: 'Lingua',
  langAuto: 'Come il telefono',
  done: 'Fatto',
  signOut: 'Esci',

  tagline: 'Sfida i tuoi amici a colpi di passi, qualunque orologio abbiano.',
  linkSent: (email) => `Link inviato a ${email}`,
  signIn: 'Accedi',
  email: 'Email',
  emailMe: 'Mandami un link',
  openEmail: "Apri l'email su questo telefono e tocca il link. Ti riporta subito qui.",
  differentEmail: "Usa un'altra email",

  stepOf: (n, of) => `${n} di ${of}`,
  whatName: 'Come ti chiamiamo?',
  addName: 'Prima scrivi un nome.',
  next: 'Avanti',
  whatWear: 'Con cosa conti i passi?',
  tapAllow: 'Toccalo, poi tocca Consenti. Tutto qui.',
  connecting: 'Collegamento…',
  keepDevice: 'Tengo quello attuale',
  oneMore: "Un'ultima cosa",
  checkAgain: 'Fatto, ricontrolla',
  tryAgain: 'Riprova',
  pickDifferent: 'Scegli un altro dispositivo',
  noHealthPhone: 'Questo telefono non ha Salute. La versione per Android arriva presto.',
  justIphone: 'Solo iPhone',
  fixShare: (app) => `Apri ${app}, cerca Salute nelle sue impostazioni e attiva la condivisione dei Passi. Poi torna qui.`,
  fixAndroidOnly: 'I Galaxy Watch si collegano solo ai telefoni Android. La versione Android di questa app arriva presto.',
  fixGeneric: (device) => `Controlla che l'app ${device} condivida i passi con Salute.`,

  fitbitErrors: {
    access_denied: "Hai annullato l'accesso con Google.",
    closed: "L'accesso con Google si è chiuso prima della fine.",
    not_linked: "Il tuo Fitbit non è ancora su un account Google. Apri l'app Fitbit, segui le istruzioni per passare a Google, poi torna qui e tocca Riprova.",
    expired: 'Ci hai messo troppo. Riprova.',
    no_refresh_token: 'Google non ci ha dato un accesso permanente. Riprova.',
  },
  fitbitUnknown: (code) => `Non riesco a collegare Fitbit (${code}).`,

  justNow: 'adesso',
  minAgo: (n) => `${n} min fa`,
  hAgo: (n) => `${n} h fa`,
  dAgo: (n) => `${n} g fa`,
  leaveQ: 'Vuoi lasciare questa sfida?',
  cancel: 'Annulla',
  leave: 'Lascia',
  finalResults: 'Risultati finali',
  dayOf: (n, of) => `Giorno ${n} di ${of}`,
  you: 'tu',
  todaySteps: (n) => `${n} oggi`,
  noData: 'ancora nessun dato',
  sendFriend: 'Invita un amico',
  shareMsg: (comp, code) => `Unisciti alla sfida "${comp}" su Pass1. Codice: ${code}`,

  // Sfide
  tabToday: 'Oggi', tabChallenges: 'Sfide', tabAccount: 'Account',
  yourChallenges: 'Le tue sfide', startNew: 'Inizia una nuova', moreChallenges: 'Altre sfide', joinCode: 'Entra con un codice',
  oldSite: 'Usavi il vecchio sito?',
  garminHint: 'Non si aggiorna? Apri Garmin Connect un attimo per sincronizzare.',
  pickCourse: 'Dove si va?',
  kinds: ['Scalate', 'Percorsi', 'Classica'],
  courseNames: {
    vesuvius: ['Vesuvio', 'Napoli'],
    half_dome: ['Half Dome', 'Yosemite, California'],
    matterhorn: ['Cervino', 'Zermatt, Svizzera'],
    big_sur: ['Big Sur', 'Da Carmel a San Simeon, Highway 1'],
    classic: ['Chi fa più passi', 'Vince chi cammina di più'],
  },
  toGo: (v: string) => `ancora ${v}`,
  atTop: 'In vetta!',
  stepsWord: 'passi',
  atEnd: 'Traguardo!',
  top: (v: string) => `Vetta ${v}`,
  routeLen: (v: string) => `${v} di costa`,

  server: {
    'no competition with that code': 'Nessuna sfida con questo codice.',
    'key not found or already linked': 'Chiave sbagliata o già collegata a un account.',
    'this account already has its own steps': 'Questo account ha già i suoi passi, quindi non si può collegare a un giocatore del sito.',
    'email rate limit exceeded': 'Troppe email di accesso in questo momento. Aspetta qualche minuto e riprova.',
  },
};

// Napoletano: written for Naples, to be read by a native speaker before shipping.
const nap: Strings = {
  stepsToday: "Passe 'e ogge",
  synced: (time) => `Aggiurnato ê ${time}`,
  notConnectedHealth: 'Nun è cullegato a Salute',
  syncFailed: (why) => `Nun s'è aggiurnato: ${why}`,
  profileFailed: "Nun se carica 'o prufilo. Tira abbascio pe' riprovà.",
  noHealth: "Ncopp' a stu telefono nun ce sta Salute.",
  fitbitReconnectBody: "Google vo' ca trase n'ata vota, accussì 'e passe tuoje se contano ancora.",
  reconnectFitbit: 'Torna a cullegà Fitbit',
  startOne: 'Nova sfida',
  join: 'Trase',
  running: 'Mo se joca',
  finished: 'Fernute',
  nothingRunning: "Nun ce sta nisciuna sfida. Fanne una e manna 'o codice a ll'amice tuoje.",
  startsOn: (date) => `Accummencia 'o ${date}`,
  lastDay: 'Ultimo juorno',
  daysLeft: (n) => `Mancano ${n} juorne`,

  titleNew: 'NOVA SFIDA',
  titleJoin: 'TRASE',
  titleYou: 'TU',

  inviteCode: "Codice d'invito",

  name: 'Nomme',
  compNamePlaceholder: "'A sfida 'e nuvembre",
  starts: 'Accummencia',
  today: 'Ogge',
  tomorrow: 'Dimane',
  length: 'Quanto dura',
  lengths: ['1 juorno', '2 juorne', '1 semmana', '2 semmane', '1 mese', '3 mise'],
  startBtn: 'Jamme!',

  nameOnBoard: "Nomme ncopp' â classifica",
  namePlaceholder: "p'esempio Heated microwave",
  save: 'Sarva',
  saved: 'Sarvato.',
  yourDevice: "'O dispositivo tuojo",
  notConnectedYet: 'Nun è ancora cullegato',
  changeDevice: 'Cagna dispositivo',
  websiteBefore: "Ausave già 'o sito?",
  websiteBody: "Miette 'a chiave segreta vecchia pe' te purtà ccà tutto 'o storico e 'e sfide.",
  secretKey: 'Chiave segreta',
  link: 'Cullega',
  linked: "Fatto. 'O storico e 'e sfide d'o sito mo stanno ccà.",
  language: 'Lengua',
  langAuto: "Comme 'o telefono",
  done: 'Fatto',
  signOut: 'Jesce',

  tagline: "Sfida ll'amice a chi cammina 'e cchiù, cu qualunque rilorgio.",
  linkSent: (email) => `Link mannato a ${email}`,
  signIn: 'Trase',
  email: 'Email',
  emailMe: 'Mannàmme nu link',
  openEmail: "Arape l'email ncopp' a stu telefono e tocca 'o link. Te porta dritto ccà.",
  differentEmail: "N'ata email",

  stepOf: (n, of) => `${n} 'e ${of}`,
  whatName: 'Comme te chiammammo?',
  addName: 'Primma miette nu nomme.',
  next: 'Annanze',
  whatWear: "Cu che cunte 'e passe?",
  tapAllow: "Tuccalo, po' tocca Consenti. E basta.",
  connecting: 'Cullegamento…',
  keepDevice: "Tengo chillo 'e mo",
  oneMore: "N'ata cosa",
  checkAgain: 'Fatto, ricuntrolla',
  tryAgain: 'Riprova',
  pickDifferent: "Sceglie n'atu dispositivo",
  noHealthPhone: "Stu telefono nun tene Salute. 'A versione pe' Android arriva ambressa.",
  justIphone: "Sulo l'iPhone",
  fixShare: (app) => `Arape ${app}, cerca Apple Salute dint'ê mpustaziune e appiccia 'a cundivisione d'e Passe. Po' torna ccà.`,
  fixAndroidOnly: "'E Galaxy Watch vanno sulo cu 'e telefone Android. 'A versione Android arriva ambressa.",
  fixGeneric: (device) => `Vide si l'app ${device} cundivide 'e passe cu Salute.`,

  fitbitErrors: {
    access_denied: "Hê annullato l'accesso cu Google.",
    closed: "Hê chiuso Google primma 'e fernì.",
    not_linked: "'O Fitbit tuojo nun sta ancora ncopp' a n'account Google. Arape l'app Fitbit, fa' comme te dice pe' passà a Google, po' torna ccà e tocca Riprova.",
    expired: "Ce hê miso troppo. Riprova.",
    no_refresh_token: "Google nun ce ha dato l'accesso pe' sempe. Riprova.",
  },
  fitbitUnknown: (code) => `Nun se cullega Fitbit (${code}).`,

  justNow: 'mo mo',
  minAgo: (n) => `${n} min fa`,
  hAgo: (n) => `${n} h fa`,
  dAgo: (n) => `${n} g fa`,
  leaveQ: "Vuò lassà sta sfida?",
  cancel: 'Lassa sta',
  leave: 'Lassa',
  finalResults: 'Risultate finale',
  dayOf: (n, of) => `Juorno ${n} 'e ${of}`,
  you: 'tu',
  todaySteps: (n) => `${n} ogge`,
  noData: 'ancora niente',
  sendFriend: "Mannalo a n'amico",
  shareMsg: (comp, code) => `Viene dint'â sfida "${comp}" ncopp' a Pass1. Codice: ${code}`,

  // Sfide
  tabToday: 'Ogge', tabChallenges: 'Sfide', tabAccount: 'Account',
  yourChallenges: "'E sfide toje", startNew: 'Accumencia na nova', moreChallenges: 'Ati sfide', joinCode: 'Trase cu nu codice',
  oldSite: "Usave 'o sito viecchio?",
  garminHint: "Nun s'aggiorna? Arape Garmin Connect nu mumento, accussì se sincronizza.",
  pickCourse: 'Addò jammo?',
  kinds: ['Sagliute', 'Strade', 'Classica'],
  courseNames: {
    vesuvius: ["'O Vesuvio", 'Napule'],
    half_dome: ['Half Dome', 'Yosemite, California'],
    matterhorn: ['Cervino', 'Zermatt, Svizzera'],
    big_sur: ['Big Sur', 'Da Carmel a San Simeon'],
    classic: ['Chi fa cchiù passe', "Vence chi cammina 'e cchiù"],
  },
  toGo: (v: string) => `ancora ${v}`,
  atTop: "'Ncoppa â vetta!",
  stepsWord: 'passe',
  atEnd: 'Traguardo!',
  top: (v: string) => `Vetta ${v}`,
  routeLen: (v: string) => `${v} 'e costa`,

  server: {
    'no competition with that code': "Nun ce sta nisciuna sfida cu stu codice.",
    'key not found or already linked': "'A chiave è sbagliata o è già cullegata.",
    'this account already has its own steps': "Stu account tene già 'e passe suoje, nun se po' cullegà a nu jucatore d'o sito.",
    'email rate limit exceeded': "Troppe email pe' trasì mo. Aspetta quacche minuto e riprova.",
  },
};

const es: Strings = {
  stepsToday: 'Pasos de hoy',
  synced: (time) => `Actualizado a las ${time}`,
  notConnectedHealth: 'Sin conexión con Salud',
  syncFailed: (why) => `No se pudo actualizar: ${why}`,
  profileFailed: 'No pudimos cargar tu perfil. Desliza hacia abajo para reintentar.',
  noHealth: 'Salud no está disponible en este dispositivo.',
  fitbitReconnectBody: 'Google te pide iniciar sesión de nuevo para que tus pasos sigan contando.',
  reconnectFitbit: 'Reconectar Fitbit',
  startOne: 'Nuevo reto',
  join: 'Unirme',
  running: 'En curso',
  finished: 'Terminados',
  nothingRunning: 'No hay ningún reto en curso. Crea uno y comparte el código con tus amigos.',
  startsOn: (date) => `Empieza el ${date}`,
  lastDay: 'Último día',
  daysLeft: (n) => `Quedan ${n} días`,

  titleNew: 'NUEVO RETO',
  titleJoin: 'UNIRME',
  titleYou: 'TÚ',

  inviteCode: 'Código de invitación',

  name: 'Nombre',
  compNamePlaceholder: 'Reto de noviembre',
  starts: 'Empieza',
  today: 'Hoy',
  tomorrow: 'Mañana',
  length: 'Duración',
  lengths: ['1 día', '2 días', '1 semana', '2 semanas', '1 mes', '3 meses'],
  startBtn: '¡Vamos!',

  nameOnBoard: 'Nombre en la clasificación',
  namePlaceholder: 'p. ej. Heated microwave',
  save: 'Guardar',
  saved: 'Guardado.',
  yourDevice: 'Tu dispositivo',
  notConnectedYet: 'Aún sin conectar',
  changeDevice: 'Cambiar dispositivo',
  websiteBefore: '¿Usabas la web antes?',
  websiteBody: 'Pega tu antigua clave secreta para traerte tu historial y tus retos.',
  secretKey: 'Clave secreta',
  link: 'Vincular',
  linked: 'Listo. Tu historial y tus retos de la web ya están en esta cuenta.',
  language: 'Idioma',
  langAuto: 'Como el teléfono',
  done: 'Listo',
  signOut: 'Cerrar sesión',

  tagline: 'Pasos contra tus amigos, lleven el reloj que lleven.',
  linkSent: (email) => `Enlace enviado a ${email}`,
  signIn: 'Iniciar sesión',
  email: 'Correo',
  emailMe: 'Envíame un enlace',
  openEmail: 'Abre el correo en este teléfono y toca el enlace. Te devuelve directamente aquí.',
  differentEmail: 'Usar otro correo',

  stepOf: (n, of) => `${n} de ${of}`,
  whatName: '¿Cómo te llamamos?',
  addName: 'Primero escribe un nombre.',
  next: 'Siguiente',
  whatWear: '¿Con qué cuentas tus pasos?',
  tapAllow: 'Tócalo y luego Permitir. Listo.',
  connecting: 'Conectando…',
  keepDevice: 'Seguir con el que tengo',
  oneMore: 'Una cosa más',
  checkAgain: 'Ya está, comprobar de nuevo',
  tryAgain: 'Reintentar',
  pickDifferent: 'Elegir otro dispositivo',
  noHealthPhone: 'Este teléfono no tiene Salud. La versión para Android está en camino.',
  justIphone: 'Solo mi iPhone',
  fixShare: (app) => `Abre ${app}, busca Apple Salud en sus ajustes y activa compartir Pasos. Luego vuelve aquí.`,
  fixAndroidOnly: 'Los Galaxy Watch solo funcionan con teléfonos Android. La versión para Android está en camino.',
  fixGeneric: (device) => `Asegúrate de que la app de ${device} comparta los pasos con Salud.`,

  fitbitErrors: {
    access_denied: 'Cancelaste el inicio de sesión con Google.',
    closed: 'El inicio de sesión con Google se cerró antes de terminar.',
    not_linked: 'Tu Fitbit aún no está en una cuenta de Google. Abre la app de Fitbit, sigue sus pasos para pasarte a Google y luego vuelve y toca Reintentar.',
    expired: 'Tardaste demasiado. Inténtalo de nuevo.',
    no_refresh_token: 'Google no nos dio acceso permanente. Inténtalo de nuevo.',
  },
  fitbitUnknown: (code) => `No se pudo conectar Fitbit (${code}).`,

  justNow: 'ahora',
  minAgo: (n) => `hace ${n} min`,
  hAgo: (n) => `hace ${n} h`,
  dAgo: (n) => `hace ${n} d`,
  leaveQ: '¿Salir de este reto?',
  cancel: 'Cancelar',
  leave: 'Salir',
  finalResults: 'Resultados finales',
  dayOf: (n, of) => `Día ${n} de ${of}`,
  you: 'tú',
  todaySteps: (n) => `${n} hoy`,
  noData: 'sin datos aún',
  sendFriend: 'Invitar a un amigo',
  shareMsg: (comp, code) => `Únete a "${comp}" en Pass1. Código: ${code}`,

  // Retos
  tabToday: 'Hoy', tabChallenges: 'Retos', tabAccount: 'Cuenta',
  yourChallenges: 'Tus retos', startNew: 'Empieza uno nuevo', moreChallenges: 'Más retos', joinCode: 'Unirme con código',
  oldSite: '¿Usabas la web antigua?',
  garminHint: '¿No se actualiza? Abre Garmin Connect un momento para que sincronice.',
  pickCourse: '¿A dónde vamos?',
  kinds: ['Cumbres', 'Rutas', 'Clásico'],
  courseNames: {
    vesuvius: ['Vesubio', 'Nápoles, Italia'],
    half_dome: ['Half Dome', 'Yosemite, California'],
    matterhorn: ['Cervino', 'Zermatt, Suiza'],
    big_sur: ['Big Sur', 'De Carmel a San Simeon, Highway 1'],
    classic: ['Más pasos', 'Gana quien más camine'],
  },
  toGo: (v: string) => `faltan ${v}`,
  atTop: '¡En la cima!',
  stepsWord: 'pasos',
  atEnd: '¡Llegaste!',
  top: (v: string) => `Cima ${v}`,
  routeLen: (v: string) => `${v} de costa`,

  server: {
    'no competition with that code': 'No hay ningún reto con ese código.',
    'key not found or already linked': 'Esa clave no es correcta o ya está vinculada a una cuenta.',
    'this account already has its own steps': 'Esta cuenta ya tiene sus propios pasos, así que no se puede vincular a un jugador de la web.',
    'email rate limit exceeded': 'Demasiados correos de acceso ahora mismo. Espera unos minutos y vuelve a intentarlo.',
  },
};

const ja: Strings = {
  stepsToday: '今日の歩数',
  synced: (time) => `${time} に更新`,
  notConnectedHealth: 'ヘルスケアに未接続',
  syncFailed: (why) => `更新できませんでした：${why}`,
  profileFailed: 'プロフィールを読み込めませんでした。下に引っ張って再読み込みしてください。',
  noHealth: 'このデバイスではヘルスケアを利用できません。',
  fitbitReconnectBody: '歩数のカウントを続けるには、Googleにもう一度ログインしてください。',
  reconnectFitbit: 'Fitbitを再接続',
  startOne: '新規作成',
  join: '参加する',
  running: '開催中',
  finished: '終了',
  nothingRunning: '開催中のチャレンジはありません。作成して、友だちにコードを送りましょう。',
  startsOn: (date) => `${date}開始`,
  lastDay: '最終日',
  daysLeft: (n) => `あと${n}日`,

  titleNew: '新しいチャレンジ',
  titleJoin: '参加',
  titleYou: 'マイページ',

  inviteCode: '招待コード',

  name: '名前',
  compNamePlaceholder: '11月の歩数対決',
  starts: '開始日',
  today: '今日',
  tomorrow: '明日',
  length: '期間',
  lengths: ['1日', '2日', '1週間', '2週間', '1か月', '3か月'],
  startBtn: 'スタート',

  nameOnBoard: 'ランキングに表示する名前',
  namePlaceholder: '例：Heated microwave',
  save: '保存',
  saved: '保存しました。',
  yourDevice: '使用中のデバイス',
  notConnectedYet: '未接続',
  changeDevice: 'デバイスを変更',
  websiteBefore: '以前ウェブ版を使っていましたか？',
  websiteBody: '以前のシークレットキーを貼り付けると、履歴とチャレンジを引き継げます。',
  secretKey: 'シークレットキー',
  link: '引き継ぐ',
  linked: '完了しました。ウェブ版の履歴とチャレンジがこのアカウントに移りました。',
  language: '言語',
  langAuto: '端末の設定に合わせる',
  done: '完了',
  signOut: 'ログアウト',

  tagline: 'どんなウォッチでも、友だちと歩数で勝負。',
  linkSent: (email) => `${email} にリンクを送信しました`,
  signIn: 'ログイン',
  email: 'メールアドレス',
  emailMe: 'ログインリンクを送る',
  openEmail: 'このiPhoneでメールを開き、リンクをタップしてください。そのままアプリに戻ります。',
  differentEmail: '別のメールアドレスを使う',

  stepOf: (n, of) => `${n} / ${of}`,
  whatName: '表示名を決めましょう',
  addName: '名前を入力してください。',
  next: '次へ',
  whatWear: '何で歩数を測っていますか？',
  tapAllow: 'タップして「許可」を選ぶだけ。',
  connecting: '接続中…',
  keepDevice: '今のデバイスのまま',
  oneMore: 'あとひとつだけ',
  checkAgain: '設定したので再確認',
  tryAgain: 'もう一度',
  pickDifferent: '別のデバイスを選ぶ',
  noHealthPhone: 'この端末にはヘルスケアがありません。Android版は準備中です。',
  justIphone: 'iPhoneのみ',
  fixShare: (app) => `${app}を開き、設定から「Appleヘルスケア」を探して「歩数」の共有をオンにしてください。そのあと、ここに戻ってきてください。`,
  fixAndroidOnly: 'Galaxy WatchはAndroidスマートフォンとしか連携できません。Android版は準備中です。',
  fixGeneric: (device) => `${device}のアプリで、歩数をヘルスケアと共有する設定になっているか確認してください。`,

  fitbitErrors: {
    access_denied: 'Googleへのログインがキャンセルされました。',
    closed: 'Googleへのログインが完了する前に閉じられました。',
    not_linked: 'FitbitがまだGoogleアカウントに移行されていません。Fitbitアプリを開いて案内に従って移行してから、ここに戻って「もう一度」をタップしてください。',
    expired: '時間がかかりすぎました。もう一度お試しください。',
    no_refresh_token: 'Googleから継続的なアクセス許可を得られませんでした。もう一度お試しください。',
  },
  fitbitUnknown: (code) => `Fitbitに接続できませんでした（${code}）。`,

  justNow: 'たった今',
  minAgo: (n) => `${n}分前`,
  hAgo: (n) => `${n}時間前`,
  dAgo: (n) => `${n}日前`,
  leaveQ: 'このチャレンジから退出しますか？',
  cancel: 'キャンセル',
  leave: '退出',
  finalResults: '最終結果',
  dayOf: (n, of) => `${n}日目／全${of}日`,
  you: 'あなた',
  todaySteps: (n) => `今日 ${n}歩`,
  noData: 'データなし',
  sendFriend: '友だちを招待',
  shareMsg: (comp, code) => `Pass1の「${comp}」に参加しよう！ 招待コード：${code}`,

  // チャレンジ
  tabToday: '今日', tabChallenges: 'チャレンジ', tabAccount: 'アカウント',
  yourChallenges: '参加中のチャレンジ', startNew: '新しく始める', moreChallenges: 'ほかのチャレンジ', joinCode: 'コードで参加',
  oldSite: '以前のウェブ版を使っていましたか？',
  garminHint: '更新されない？Garmin Connectを少し開くと同期されます。',
  pickCourse: 'どこへ行く？',
  kinds: ['山', 'ルート', 'クラシック'],
  courseNames: {
    vesuvius: ['ヴェスヴィオ山', 'イタリア・ナポリ'],
    half_dome: ['ハーフドーム', 'カリフォルニア・ヨセミテ'],
    matterhorn: ['マッターホルン', 'スイス・ツェルマット'],
    big_sur: ['ビッグサー', 'カーメル〜サンシメオン（ハイウェイ1）'],
    classic: ['歩数バトル', 'いちばん歩いた人の勝ち'],
  },
  toGo: (v: string) => `あと${v}`,
  atTop: '登頂！',
  stepsWord: '歩',
  atEnd: 'ゴール！',
  top: (v: string) => `山頂 ${v}`,
  routeLen: (v: string) => `海岸線 ${v}`,

  server: {
    'no competition with that code': 'このコードのチャレンジは見つかりません。',
    'key not found or already linked': 'キーが間違っているか、すでに別のアカウントに引き継がれています。',
    'this account already has its own steps': 'このアカウントにはすでに歩数データがあるため、ウェブ版のプレイヤーを引き継げません。',
    'email rate limit exceeded': 'ログインメールの送信回数が多すぎます。数分待ってからもう一度お試しください。',
  },
};

const STRINGS: Record<Lang, Strings> = { en, it, nap, es, ja };

/** Names shown in the language picker, each in its own language. */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', it: 'Italiano', nap: 'Napulitano', es: 'Español', ja: '日本語' };

function phoneLang(): Lang {
  let tag = '';
  try {
    tag = NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ?? '';
  } catch {}
  if (!tag) {
    try { tag = Intl.DateTimeFormat().resolvedOptions().locale; } catch {}
  }
  const code = tag.toLowerCase().slice(0, 2);
  return code === 'it' || code === 'es' || code === 'ja' ? code : 'en';
}

const KEY = 'lang';

type Ctx = { t: Strings; lang: Lang; choice: LangChoice; locale: string | undefined; setChoice: (c: LangChoice) => void };
const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<LangChoice>('auto');
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (LANGS.includes(v as Lang)) setChoiceState(v as Lang); });
  }, []);
  const setChoice = (c: LangChoice) => {
    setChoiceState(c);
    if (c === 'auto') AsyncStorage.removeItem(KEY); else AsyncStorage.setItem(KEY, c);
  };
  const lang = choice === 'auto' ? phoneLang() : choice;
  // Dates and times: the chosen language's formats (Napoletano uses Italian ones); English follows the phone.
  const locale = { en: undefined, it: 'it-IT', nap: 'it-IT', es: 'es-ES', ja: 'ja-JP' }[lang];
  return <LangContext.Provider value={{ t: STRINGS[lang], lang, choice, locale, setChoice }}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useT outside LanguageProvider');
  return ctx;
}

/** An error from the server or the network, in the current language when we know it. */
export function errorIn(t: Strings, e: unknown) {
  const text = errorText(e);
  return t.server[text] ?? text;
}
