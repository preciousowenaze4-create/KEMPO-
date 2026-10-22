/**
 * Kempo Pro - Resilient Local Media Storage & Offline Cache
 * 
 * Provides:
 * - Instant full-quality local previews for images/voice/media (even without internet)
 * - IndexedDB persistent storage so large photos never crash localStorage or get truncated
 * - Client-side image compression ensuring crisp high-fidelity display while keeping storage lightweight
 */

const DB_NAME = 'kempo_media_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

// Fast in-memory cache to guarantee synchronous 0ms immediate local previews
const inMemoryCache = new Map<string, string>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('IndexedDB open warning:', req.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB init error:', err);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/**
 * Compress an image file to maintain crisp high quality (up to 1280px)
 * while keeping file size small (~80KB - 250KB) so it loads instantly offline.
 */
export async function compressImage(file: File | Blob, maxDim = 1280, quality = 0.85): Promise<{
  blob: Blob;
  dataUrl: string;
}> {
  return new Promise((resolve) => {
    // If it's already small SVG or GIF, preserve directly
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          blob: file,
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            resolve({
              blob: blob || file,
              dataUrl,
            });
          },
          'image/jpeg',
          quality
        );
      } else {
        // Fallback to reading raw file
        const r = new FileReader();
        r.onload = () => resolve({ blob: file, dataUrl: r.result as string });
        r.readAsDataURL(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const r = new FileReader();
      r.onload = () => resolve({ blob: file, dataUrl: r.result as string });
      r.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

/**
 * Save full media payload in memory + IndexedDB keyed by message ID.
 * This guarantees the user sees the media instantly without waiting for upload.
 */
export async function saveLocalMedia(messageId: string, dataUrlOrBlob: string | Blob): Promise<void> {
  if (!messageId) return;

  if (typeof dataUrlOrBlob === 'string') {
    inMemoryCache.set(messageId, dataUrlOrBlob);
  } else {
    // Generate object URL for immediate viewing
    try {
      const url = URL.createObjectURL(dataUrlOrBlob);
      inMemoryCache.set(messageId, url);
    } catch {}
  }

  try {
    const db = await getDb();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(dataUrlOrBlob, messageId);
  } catch (err) {
    console.warn('saveLocalMedia IDB error:', err);
  }
}

/**
 * Retrieve local media for a message (from in-memory cache or IndexedDB)
 */
export async function getLocalMedia(messageId: string): Promise<string | null> {
  if (!messageId) return null;

  // 1. Check in-memory cache first (0ms)
  if (inMemoryCache.has(messageId)) {
    return inMemoryCache.get(messageId)!;
  }

  // 2. Check IndexedDB
  try {
    const db = await getDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(messageId);
      req.onsuccess = () => {
        const val = req.result;
        if (!val) {
          resolve(null);
          return;
        }
        if (typeof val === 'string') {
          inMemoryCache.set(messageId, val);
          resolve(val);
        } else if (val instanceof Blob) {
          const url = URL.createObjectURL(val);
          inMemoryCache.set(messageId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('getLocalMedia IDB error:', err);
    return null;
  }
}

/**
 * Synchronous memory lookup for immediate rendering in React
 */
export function getLocalMediaSync(messageId: string): string | undefined {
  return inMemoryCache.get(messageId);
}
