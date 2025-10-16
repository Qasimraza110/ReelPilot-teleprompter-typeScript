// public/sw-utils.js

// --- Configuration Constants (MUST MATCH YOUR MAIN APP'S IDB CONFIG) ---
const AUTH_DB_NAME = "ReelPilotAuthDB";
const AUTH_DB_VERSION = 1; // Increment if you change auth DB structure
const AUTH_STORE_NAME = "auth";

const MAIN_DB_NAME = "ReelPilotDB";
const MAIN_DB_VERSION = 1; // Make sure this matches your app's main DB version
const SCRIPTS_STORE_NAME = "scripts";
const SYNC_QUEUE_STORE_NAME = "sync-queue";

// --- IndexedDB Helper Functions for Service Worker Context ---

// Auth DB Helpers
const openAuthDbSW = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUTH_DB_NAME, AUTH_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
        db.createObjectStore(AUTH_STORE_NAME, { keyPath: "key" });
      }
      console.log(`SW: Auth DB upgraded to version ${AUTH_DB_VERSION}`);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("SW: Error opening Auth IndexedDB:", event.target.error);
      reject("Failed to open SW Auth IndexedDB");
    };
  });
};

export const getAuthTokenSW = async () => {
  const db = await openAuthDbSW();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUTH_STORE_NAME], "readonly");
    const store = transaction.objectStore(AUTH_STORE_NAME);
    const request = store.get("session_id");

    request.onsuccess = (event) => {
      resolve(event.target.result?.value || null);
    };
    request.onerror = (event) => {
      console.error(
        "SW: Error getting auth token from DB:",
        event.target.error
      );
      reject(event.target.error);
    };
  });
};

// Main App DB Helpers (for sync queue)
const openMainDbSW = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MAIN_DB_NAME, MAIN_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Re-create object stores if they don't exist (important for upgrades)
      if (!db.objectStoreNames.contains(SCRIPTS_STORE_NAME)) {
        db.createObjectStore(SCRIPTS_STORE_NAME, { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE_NAME)) {
        db.createObjectStore(SYNC_QUEUE_STORE_NAME, { autoIncrement: true });
      }
      console.log(`SW: Main DB upgraded to version ${MAIN_DB_VERSION}`);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("SW: Error opening Main IndexedDB:", event.target.error);
      reject("Failed to open SW Main IndexedDB");
    };
  });
};

export const getSyncQueueSW = async () => {
  const db = await openMainDbSW();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE_NAME], "readonly");
    const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
    const request = store.openCursor();
    const items = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        items.push({ key: cursor.key, item: cursor.value });
        cursor.continue();
      } else {
        resolve(items);
      }
    };
    request.onerror = (event) => {
      console.error("SW: Error getting sync queue:", event.target.error);
      reject(event.target.error);
    };
  });
};

export const removeFromSyncQueueSW = async (key) => {
  const db = await openMainDbSW();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE_NAME], "readwrite");
    const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = (event) => {
      console.error("SW: Error removing from sync queue:", event.target.error);
      reject(event.target.error);
    };
  });
};

export const updateScriptInDbSW = async (script) => {
  const db = await openMainDbSW();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SCRIPTS_STORE_NAME], "readwrite");
    const store = transaction.objectStore(SCRIPTS_STORE_NAME);
    const request = store.put(script); // 'put' updates or adds

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error(
        "SW: Error updating script in main DB:",
        event.target.error
      );
      reject(event.target.error);
    };
  });
};
