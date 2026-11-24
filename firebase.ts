
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import config from './firebase-applet-config.json';

// Configuración por defecto para evitar errores si el archivo está vacío
const firebaseConfig = {
  apiKey: config.apiKey || "placeholder",
  authDomain: config.authDomain || "placeholder",
  projectId: config.projectId || "placeholder",
  storageBucket: config.storageBucket || "placeholder",
  messagingSenderId: config.messagingSenderId || "placeholder",
  appId: config.appId || "placeholder"
};

const isConfigValid = firebaseConfig.apiKey !== "placeholder" && firebaseConfig.projectId !== "placeholder";

let firebaseApp;

if (!getApps().length) {
  // Solo inicializamos si la config parece válida, de lo contrario usamos una app mínima
  // para evitar que el SDK lance excepciones fatales en el arranque
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

export const db = getFirestore(firebaseApp, (config as any).firestoreDatabaseId || undefined);

// Safely initialize Auth with fallback persistence for iframe sandbox compatibility
let authInstance;
try {
  authInstance = initializeAuth(firebaseApp, {
    persistence: [browserLocalPersistence, inMemoryPersistence]
  });
} catch (error) {
  // Fallback if already initialized
  authInstance = getAuth(firebaseApp);
}

export const auth = authInstance;
export const storage = getStorage(firebaseApp);
export { isConfigValid };

// Connection verification logic (Deferred non-blocking check with timeout)
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  if (!isConfigValid || typeof window === 'undefined') return;
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection check timeout")), 2000)
    );
    await Promise.race([
      getDocFromServer(doc(db, '_internal_', 'connection_test')),
      timeoutPromise
    ]);
    console.log("[Firebase] Connection verified successfully.");
  } catch (error: any) {
    if (error?.message === "Connection check timeout") {
      console.warn("[Firebase] Background connection probe timed out (client operating in local-first mode).");
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firebase] Client operating in local offline mode.");
    } else {
      console.warn("[Firebase] Connection probe completed:", error?.message || error);
    }
  }
}

// Run connection probe only in background after initial render has settled
if (typeof window !== 'undefined' && isConfigValid) {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 2500);
}
