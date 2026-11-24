import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Caché en memoria de acceso instantáneo para documentos binarios / Base64
const memoryDocCache = new Map<string, string>();

const QUOTA_SESSION_KEY = 'assetflow_fs_quota_exceeded_at';
const QUOTA_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos de enfriamiento si se alcanza el límite diario gratuito
let inMemoryQuotaExceeded = false;
let activeFirestoreUnsubs: (() => void)[] = [];

export function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  const code = (error as any)?.code ? String((error as any).code) : '';
  return (
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('resource-exhausted') ||
    code.includes('resource-exhausted')
  );
}

export function isFirestoreQuotaExceeded(): boolean {
  if (inMemoryQuotaExceeded) return true;
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(QUOTA_SESSION_KEY) : null;
    if (raw) {
      const ts = Number(raw);
      if (!isNaN(ts) && Date.now() - ts < QUOTA_COOLDOWN_MS) {
        inMemoryQuotaExceeded = true;
        return true;
      }
    }
  } catch {}
  return false;
}

export function registerFirestoreUnsubscribers(unsubs: (() => void)[]): void {
  activeFirestoreUnsubs = unsubs;
}

export function markFirestoreQuotaExceeded(): void {
  const wasAlreadyMarked = inMemoryQuotaExceeded;
  inMemoryQuotaExceeded = true;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(QUOTA_SESSION_KEY, String(Date.now()));
    }
  } catch {}
  if (activeFirestoreUnsubs.length > 0) {
    const toUnsub = [...activeFirestoreUnsubs];
    activeFirestoreUnsubs = [];
    toUnsub.forEach((u) => {
      try {
        u();
      } catch {}
    });
  }
  if (!wasAlreadyMarked) {
    console.info('[Storage] Cuota diaria gratuita de lectura en nube alcanzada. Operando 100% en Bóveda Local IndexedDB sin interrupción.');
  }
}

const DOC_CACHE_DB_NAME = 'AssetFlow_Document_Blobs_v1';
const DOC_CACHE_STORE = 'blobs';
let blobDbPromise: Promise<IDBDatabase> | null = null;

function getBlobDb(): Promise<IDBDatabase> {
  if (blobDbPromise) return blobDbPromise;
  blobDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(DOC_CACHE_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const idb = (e.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains(DOC_CACHE_STORE)) {
        idb.createObjectStore(DOC_CACHE_STORE);
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => {
      blobDbPromise = null;
      reject(e);
    };
  });
  return blobDbPromise;
}

export async function saveLocalBlobCache(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl) return;
  memoryDocCache.set(key, dataUrl);
  try {
    const idb = await getBlobDb();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction([DOC_CACHE_STORE], 'readwrite');
      tx.objectStore(DOC_CACHE_STORE).put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    // Fallback silencioso a memoria si IndexedDB está restringido
  }
}

export async function loadLocalBlobCache(key: string): Promise<string | null> {
  if (!key) return null;
  if (memoryDocCache.has(key)) {
    return memoryDocCache.get(key) || null;
  }
  try {
    const idb = await getBlobDb();
    return await new Promise<string | null>((resolve) => {
      const tx = idb.transaction([DOC_CACHE_STORE], 'readonly');
      const req = tx.objectStore(DOC_CACHE_STORE).get(key);
      req.onsuccess = () => {
        const res = req.result || null;
        if (res) memoryDocCache.set(key, res);
        resolve(res);
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Convierte un archivo a DataURL Base64 de forma inmediata y confiable,
 * guardando además una copia en la bóveda IndexedDB local para persistencia instantánea.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const toBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(f);
    });

  const dataUrl = await toBase64(file);
  await saveLocalBlobCache(path, dataUrl);
  return dataUrl;
};

const CHUNK_PREFIX = '__CHUNKED_DOC__:';
const SAME_AS_DOC_URL_TOKEN = '__SAME_AS_DOCUMENT_URL__';
const MAX_INLINE_CHARS = 550000; // ~550 KB seguro bajo el límite de 1 MiB de Firestore
const CHUNK_SIZE_CHARS = 500000; // 500 KB por fragmento

/**
 * Limpia valores undefined o instancias File/Blob no serializables por Firestore,
 * deduplica attachments/documentUrl y particiona automáticamente cualquier Base64 > 550 KB
 * en la colección 'document_chunks' para que Firestore jamás rechace un documento por límite de 1 MB.
 */
export async function prepareRecordForFirestore(
  arg1: any,
  arg2?: string,
  arg3?: any
): Promise<any> {
  const isFirstArgRecord = typeof arg1 === 'object' && arg1 !== null;
  const rawData = isFirstArgRecord ? arg1 : arg3;
  const collectionName = isFirstArgRecord ? (arg2 || 'records') : String(arg1 || 'records');
  const recordId = isFirstArgRecord ? String(arg3 || rawData?.id || 'doc') : String(arg2 || rawData?.id || 'doc');
  if (!rawData || typeof rawData !== 'object') return rawData;

  const sanitizeDeep = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof File !== 'undefined' && obj instanceof File) return undefined;
    if (typeof Blob !== 'undefined' && obj instanceof Blob) return undefined;
    if (Array.isArray(obj)) {
      return obj.map(sanitizeDeep).filter((v) => v !== undefined);
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([k, v]) => v !== undefined && k !== 'originalFile' && k !== 'fileUrl')
          .map(([k, v]) => [k, sanitizeDeep(v)])
      );
    }
    return obj;
  };

  const cloned = sanitizeDeep(rawData);

  // Eliminar duplicación de fileBase64 dentro de extractedData si ya existe en documentUrl
  if (cloned.extractedData && typeof cloned.extractedData === 'object') {
    const { fileBase64, originalFile, fileUrl, ...restExtracted } = cloned.extractedData;
    cloned.extractedData = restExtracted;
  }

  // Si documentUrl no está definido pero hay attachments[0], sincronizarlo
  if (!cloned.documentUrl && Array.isArray(cloned.attachments) && cloned.attachments.length > 0 && typeof cloned.attachments[0] === 'string') {
    cloned.documentUrl = cloned.attachments[0];
  }

  // Deduplicar si attachments[0] es idéntico a documentUrl para no duplicar el peso en Firestore
  if (
    typeof cloned.documentUrl === 'string' &&
    cloned.documentUrl.length > 1000 &&
    Array.isArray(cloned.attachments) &&
    cloned.attachments.length === 1 &&
    cloned.attachments[0] === cloned.documentUrl
  ) {
    cloned.attachments = [SAME_AS_DOC_URL_TOKEN];
  }

  const chunkFieldIfNeeded = async (fieldName: string, value: string): Promise<string> => {
    if (typeof value !== 'string' || value.startsWith(CHUNK_PREFIX)) return value;
    const cacheKey = `${collectionName}__${recordId}__${fieldName}`;
    if (value.startsWith('data:') || value.length > 2000) {
      await saveLocalBlobCache(cacheKey, value);
    }
    if (value.length <= MAX_INLINE_CHARS) {
      return value;
    }

    if (isFirestoreQuotaExceeded()) {
      return `${CHUNK_PREFIX}${collectionName}:${recordId}:${fieldName}:0`;
    }

    const totalChunks = Math.ceil(value.length / CHUNK_SIZE_CHARS);
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const slice = value.slice(i * CHUNK_SIZE_CHARS, (i + 1) * CHUNK_SIZE_CHARS);
      const chunkDocId = `${collectionName}__${recordId}__${fieldName}__${i}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const chunkRef = doc(db, 'document_chunks', chunkDocId);
      chunkPromises.push(
        setDoc(chunkRef, {
          id: chunkDocId,
          collectionName,
          recordId,
          fieldName,
          chunkIndex: i,
          totalChunks,
          data: slice,
          timestamp: Date.now()
        }).catch((err) => {
          if (isQuotaError(err)) markFirestoreQuotaExceeded();
        })
      );
    }
    await Promise.all(chunkPromises);
    return `${CHUNK_PREFIX}${collectionName}:${recordId}:${fieldName}:${totalChunks}`;
  };

  if (typeof cloned.documentUrl === 'string') {
    cloned.documentUrl = await chunkFieldIfNeeded('documentUrl', cloned.documentUrl);
  }

  if (typeof cloned.appraisalDocumentUrl === 'string') {
    cloned.appraisalDocumentUrl = await chunkFieldIfNeeded('appraisalDocumentUrl', cloned.appraisalDocumentUrl);
  }

  if (cloned.insurancePolicy && typeof cloned.insurancePolicy.documentUrl === 'string') {
    cloned.insurancePolicy = {
      ...cloned.insurancePolicy,
      documentUrl: await chunkFieldIfNeeded('insurancePolicy_documentUrl', cloned.insurancePolicy.documentUrl)
    };
  }

  if (Array.isArray(cloned.attachments)) {
    const processedAttachments: string[] = [];
    for (let idx = 0; idx < cloned.attachments.length; idx++) {
      const att = cloned.attachments[idx];
      if (att === SAME_AS_DOC_URL_TOKEN) {
        processedAttachments.push(SAME_AS_DOC_URL_TOKEN);
      } else if (typeof att === 'string') {
        processedAttachments.push(await chunkFieldIfNeeded(`att_${idx}`, att));
      }
    }
    cloned.attachments = processedAttachments;
  }

  return cloned;
}

/**
 * Reconstruye de forma transparente cualquier campo particionado (__CHUNKED_DOC__)
 * o deduplicado (__SAME_AS_DOCUMENT_URL__) al leer desde Firestore.
 */
export async function hydrateRecordFromFirestore<T = any>(
  arg1: any,
  arg2?: string,
  arg3?: any
): Promise<T> {
  const isFirstArgRecord = typeof arg1 === 'object' && arg1 !== null;
  const rawData = isFirstArgRecord ? arg1 : arg3;
  const collectionName = isFirstArgRecord ? (arg2 || 'records') : String(arg1 || 'records');
  const recordId = isFirstArgRecord ? String(arg3 || rawData?.id || 'doc') : String(arg2 || rawData?.id || 'doc');
  if (!rawData || typeof rawData !== 'object') return rawData as T;
  const cloned = { ...rawData };

  const resolveFieldIfNeeded = async (fieldName: string, value: any): Promise<any> => {
    if (typeof value !== 'string') return value;
    const cacheKey = `${collectionName}__${recordId}__${fieldName}`;

    if (!value.startsWith(CHUNK_PREFIX)) {
      if (value.startsWith('data:') && value.length > 2000) {
        memoryDocCache.set(cacheKey, value);
      }
      return value;
    }

    // 1. Intentar recuperar instantáneamente desde caché en memoria o IndexedDB
    const cached = await loadLocalBlobCache(cacheKey);
    if (cached && cached.startsWith('data:')) {
      return cached;
    }

    if (isFirestoreQuotaExceeded()) {
      return value;
    }

    // 2. Reensamblar fragmentos desde la colección document_chunks de Firestore
    try {
      const parts = value.slice(CHUNK_PREFIX.length).split(':');
      const col = parts[0] || collectionName;
      const recId = parts[1] || recordId;
      const fld = parts[2] || fieldName;
      const totalChunks = parseInt(parts[3] || '0', 10);
      if (totalChunks <= 0) return value;

      const chunkReads: Promise<string>[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkDocId = `${col}__${recId}__${fld}__${i}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const chunkRef = doc(db, 'document_chunks', chunkDocId);
        chunkReads.push(
          getDoc(chunkRef).then((snap) => (snap.exists() ? (snap.data()?.data || '') : ''))
        );
      }
      const chunks = await Promise.all(chunkReads);
      const fullDataUrl = chunks.join('');
      if (fullDataUrl && fullDataUrl.length > 0) {
        await saveLocalBlobCache(cacheKey, fullDataUrl);
        return fullDataUrl;
      }
    } catch (err) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
    }
    return value;
  };

  if (typeof cloned.documentUrl === 'string') {
    cloned.documentUrl = await resolveFieldIfNeeded('documentUrl', cloned.documentUrl);
  }

  if (typeof cloned.appraisalDocumentUrl === 'string') {
    cloned.appraisalDocumentUrl = await resolveFieldIfNeeded('appraisalDocumentUrl', cloned.appraisalDocumentUrl);
  }

  if (cloned.insurancePolicy && typeof cloned.insurancePolicy.documentUrl === 'string') {
    cloned.insurancePolicy = {
      ...cloned.insurancePolicy,
      documentUrl: await resolveFieldIfNeeded('insurancePolicy_documentUrl', cloned.insurancePolicy.documentUrl)
    };
  }

  if (Array.isArray(cloned.attachments)) {
    const hydratedAttachments: string[] = [];
    for (let idx = 0; idx < cloned.attachments.length; idx++) {
      const att = cloned.attachments[idx];
      if (att === SAME_AS_DOC_URL_TOKEN) {
        if (typeof cloned.documentUrl === 'string' && !cloned.documentUrl.startsWith(CHUNK_PREFIX)) {
          hydratedAttachments.push(cloned.documentUrl);
        }
      } else if (typeof att === 'string') {
        const resolved = await resolveFieldIfNeeded(`att_${idx}`, att);
        if (resolved && !resolved.startsWith(CHUNK_PREFIX)) {
          hydratedAttachments.push(resolved);
        }
      }
    }
    cloned.attachments = hydratedAttachments;
  }

  // Asegurar coherencia bidireccional entre documentUrl y attachments en OfficialDocuments
  if (!cloned.documentUrl && Array.isArray(cloned.attachments) && cloned.attachments.length > 0) {
    cloned.documentUrl = cloned.attachments[0];
  } else if (cloned.documentUrl && (!Array.isArray(cloned.attachments) || cloned.attachments.length === 0) && collectionName === 'official_docs') {
    cloned.attachments = [cloned.documentUrl];
  }

  return cloned;
}

/**
 * Abre o descarga de manera segura documentos almacenados tanto en formato URL tradicional (http/https)
 * como en formato DataURL Base64 (data:application/pdf;base64,... o imágenes), evitando el bloqueo de Chrome/Edge
 * en iframes.
 */
export const openDocumentSecurely = (url: string | undefined, fileName: string = 'Documento_Soporte') => {
  if (!url || url.trim() === '' || url === '#') {
    return;
  }

  // Interceptar informe psicolaboral para descargar siempre como .docx binario nativo
  if (url === '#informe-psicolaboral-sgc' || url.includes('informe-psicolaboral') || fileName.toLowerCase().includes('psicolaboral') || fileName.toLowerCase().includes('psi-009')) {
    import('./psychologicalProfileExport').then(mod => {
      mod.downloadPsychologicalProfileWord();
    }).catch(err => {
      console.error('Error al cargar módulo de exportación psicolaboral:', err);
    });
    return;
  }

  // Si la URL es un ancla local o hash interno, no intentar descargar el documento HTML de la aplicación
  if (url.startsWith('#')) {
    console.warn('openDocumentSecurely: Intento de descarga de ancla interna ignorado para evitar descarga errónea de HTML:', url);
    return;
  }

  try {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      if (parts.length < 2) {
        window.open(url, '_blank');
        return;
      }
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const newWin = window.open(blobUrl, '_blank');

      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        const link = document.createElement('a');
        link.href = blobUrl;
        const ext = mime.includes('pdf') ? '.pdf' : mime.includes('png') ? '.png' : mime.includes('jpeg') || mime.includes('jpg') ? '.jpg' : '';
        const cleanName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        link.download = cleanName.endsWith(ext) ? cleanName : `${cleanName}${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      const newWin = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWin) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  } catch (err) {
    console.error('Error al abrir el documento de forma segura:', err);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'respaldo_digital';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
