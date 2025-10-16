// src/lib/indexedDB.ts

const DB_NAME = "teleprompterRecordingsDB";
const DB_VERSION = 1; // Increment this when you change your object store structure
const STORE_NAME = "recordings";

// Helper to open the database
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject("Failed to open IndexedDB");
    };
  });
};

// Helper to add a recording
export const addRecording = async (recording) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(recording);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Error adding recording:", event.target.error);
      reject("Failed to add recording");
    };
  });
};

// Helper to get all recordings
export const getAllRecordings = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Error getting recordings:", event.target.error);
      reject("Failed to get recordings");
    };
  });
};

// Helper to delete a recording by ID
export const deleteRecording = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error deleting recording:", event.target.error);
      reject("Failed to delete recording");
    };
  });
};
