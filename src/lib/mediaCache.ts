// IndexedDB-based High Capacity Offline Media Cache
// Bypasses 5MB localStorage limits for video files and high-res photos
// Works offline across all browsers (including iOS Safari WebKit and Android Chrome)

const DB_NAME = 'kempo_media_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory object URL cache so we don't recreate object URLs continuously
const activeObjectUrls = new Map<string, string>();

/**
 * Save a media Blob, File, or Data URL to IndexedDB
 */
export async function saveMediaToOfflineCache(key: string, data: Blob | File | string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // If data is a string data URL, convert to Blob for efficient binary storage
      let recordToStore: Blob | string = data;
      if (typeof data === 'string' && data.startsWith('data:')) {
        try {
          const parts = data.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
          const binary = atob(parts[1]);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          recordToStore = new Blob([array], { type: mime });
        } catch {
          recordToStore = data;
        }
      }

      const req = store.put(recordToStore, key);
      req.onsuccess = () => {
        // Also revoke previous object url if any
        if (activeObjectUrls.has(key)) {
          try {
            URL.revokeObjectURL(activeObjectUrls.get(key)!);
          } catch {}
          activeObjectUrls.delete(key);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB offline cache:', err);
  }
}

/**
 * Retrieve a media item from offline cache as a playable/displayable URL
 */
export async function getMediaFromOfflineCache(key: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result;
        if (!result) {
          resolve(null);
          return;
        }

        if (result instanceof Blob) {
          // If we already have a valid object URL, return it
          if (activeObjectUrls.has(key)) {
            resolve(activeObjectUrls.get(key)!);
            return;
          }
          try {
            const objectUrl = URL.createObjectURL(result);
            activeObjectUrls.set(key, objectUrl);
            resolve(objectUrl);
          } catch {
            resolve(null);
          }
        } else if (typeof result === 'string') {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB retrieval error:', err);
    return null;
  }
}

/**
 * Remove an item from IndexedDB offline cache
 */
export async function removeMediaFromOfflineCache(key: string): Promise<void> {
  try {
    if (activeObjectUrls.has(key)) {
      try {
        URL.revokeObjectURL(activeObjectUrls.get(key)!);
      } catch {}
      activeObjectUrls.delete(key);
    }
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Safe localStorage setter that avoids QuotaExceededError by omitting large payloads
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // If string is larger than ~300KB, don't store raw string in localStorage
    if (value.length > 300 * 1024) {
      // Store a placeholder pointing to IndexedDB
      localStorage.setItem(key, `indexeddb://${key}`);
      return true;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage quota exceeded for ${key}, falling back safely:`, err);
    try {
      localStorage.setItem(key, `indexeddb://${key}`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Safe localStorage getter that resolves references
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(key);
    if (!val || val.startsWith('indexeddb://')) {
      return null;
    }
    return val;
  } catch {
    return null;
  }
}
