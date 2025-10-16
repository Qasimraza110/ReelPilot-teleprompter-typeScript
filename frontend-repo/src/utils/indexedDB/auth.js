const AUTH_STORE_NAME = 'auth';

// Extend openDb if auth store doesn't exist
export const openAuthDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ReelPilotAuthDB', 1); // Separate DB for auth for clarity/security

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
        db.createObjectStore(AUTH_STORE_NAME, { keyPath: 'key' }); // Store key-value pairs
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Auth error:', (event.target).error);
      reject('Failed to open IndexedDB Auth');
    };
  });
};

export const saveAuthToken = async (token) => {
  const db = await openAuthDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUTH_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(AUTH_STORE_NAME);
    const request = store.put({ key: 'session_id', value: token }); // Store the token

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target).error);
  });
};

export const getAuthToken = async () => {
  const db = await openAuthDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUTH_STORE_NAME], 'readonly');
    const store = transaction.objectStore(AUTH_STORE_NAME);
    const request = store.get('session_id');

    request.onsuccess = (event) => resolve((event.target).result?.value || null);
    request.onerror = (event) => reject((event.target).error);
  });
};

export const removeAuthToken = async () => {
  const db = await openAuthDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUTH_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(AUTH_STORE_NAME);
    const request = store.delete('session_id');

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target).error);
  });
};