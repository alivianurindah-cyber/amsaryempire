import { MusicTrack } from '../types';

const DB_NAME = 'GeoAttendMusicDB';
const STORE_NAME = 'music_tracks';
const DB_VERSION = 1;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const addTrackToDB = async (track: MusicTrack, file?: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const trackToStore = { ...track };
    if (file) {
      // Store the blob directly and clear the base64 URL to save space
      // We use a separate property 'blob' that isn't in the MusicTrack interface
      // but IndexedDB allows storing arbitrary objects
      (trackToStore as any).blob = file;
      trackToStore.url = ''; 
    }

    const request = store.put(trackToStore);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getAllTracksFromDB = async (): Promise<MusicTrack[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const tracks = request.result.map((t: any) => {
        if (t.blob instanceof Blob) {
          // Recreate the URL from the stored blob
          t.url = URL.createObjectURL(t.blob);
        }
        return t as MusicTrack;
      });
      resolve(tracks);
    };
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const deleteTrackFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};
