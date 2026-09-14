window.MAURO_CONFIG = Object.freeze({
  appName: "Academia Mauro",
  appVersion: "2.0.0",
  curriculumSize: 293,
  topic: {
    id: 1,
    slug: "que-es-el-ajedrez",
    name: "¿Qué es el ajedrez?",
    totalSteps: 21,
    url: "tema-1-que-es-el-ajedrez-v2.html",
    canonical: "https://web-2022.github.io/Mauro-Chess-Academy/tema-1-que-es-el-ajedrez.html",
    nextUrl: "tema-2-el-tablero-de-ajedrez.html"
  },

  // Para activar Google Sheets:
  // 1) despliega google-apps-script.gs como Web App;
  // 2) pega aquí la URL terminada en /exec.
  googleSheetsWebAppUrl: "https://script.google.com/macros/s/AKfycbwMII06Sm70qSjqKVxKuE27Y42U3O43tol2Ze6XnuCWqXDYh37EC7TxQgmc6Xx4mpRcvQ/exec",

  storage: {
    profile: "mauro_chess_profile_v1",
    global: "mauro_chess_global_v2",
    topicProgress: "mauro_chess_topic1_v2_progress",
    lastSession: "mauro_chess_last_session",
    analyticsQueue: "mauro_chess_analytics_queue_v1",
    activityHistory: "mauro_chess_activity_history_v1",
    reviewErrors: "mauro_chess_review_errors_v1"
  },

  analytics: {
    maxLocalEvents: 250,
    maxQueueEvents: 180,
    flushBatchSize: 30
  }
});