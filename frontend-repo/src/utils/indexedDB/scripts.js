// utils/indexedDB.js

const DB_NAME = "ReelPilotDB";
const DB_VERSION = 1; // Keep this as 1 for now, or increment if you've had other schema changes
const SCRIPTS_STORE_NAME = "scripts";

const SYNC_QUEUE_STORE_NAME = 'sync-queue'; // NEW STORE NAME

/**
 * Opens the IndexedDB database.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
export const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SCRIPTS_STORE_NAME)) {
        db.createObjectStore(SCRIPTS_STORE_NAME, { keyPath: '_id' });
      }
      // CREATE THE NEW SYNC QUEUE OBJECT STORE
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE_NAME)) {
        db.createObjectStore(SYNC_QUEUE_STORE_NAME, { autoIncrement: true }); // No keyPath needed, IndexedDB generates keys
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target).error);
      reject('Failed to open IndexedDB');
    };
  });
};


/**
 * Adds or updates scripts in the IndexedDB object store.
 * @param {Array<Object>} scripts - An array of script objects to store.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */

export const saveScriptsToDb = async (scripts) => {
  const db = await openDb();
  const transaction = db.transaction(SCRIPTS_STORE_NAME, "readwrite");
  const store = transaction.objectStore(SCRIPTS_STORE_NAME);

  const clearRequest = store.clear();
  clearRequest.onsuccess = () => {
    scripts.forEach((script) => {
      store.put(script); // Use put to add or update
    });
  };

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = (event) => {
      console.error(
        "Error saving scripts to IndexedDB:",
        // @ts-expect-error idk
        event.target.errorCode
      );
      reject("Failed to save scripts");
    };
  });
};

/**
 * Retrieves all scripts from the IndexedDB object store.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of script objects.
 */
export const getScriptsFromDb = async () => {
  const db = await openDb();
  const transaction = db.transaction(SCRIPTS_STORE_NAME, "readonly");
  const store = transaction.objectStore(SCRIPTS_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      // @ts-expect-error idk
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      console.error(
        "Error retrieving scripts from IndexedDB:",
        // @ts-expect-error idk
        event.target.errorCode
      );
      reject("Failed to retrieve scripts");
    };
  });
};

/**
 * Clears all scripts from the IndexedDB object store.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export const clearScriptsFromDb = async () => {
  const db = await openDb();
  const transaction = db.transaction(SCRIPTS_STORE_NAME, "readwrite");
  const store = transaction.objectStore(SCRIPTS_STORE_NAME);
  const request = store.clear();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = (event) => {
      console.error(
        "Error clearing scripts from IndexedDB:",
        // @ts-expect-error idk
        event.target.errorCode
      );
      reject("Failed to clear scripts");
    };
  });
};

/**
 * Retrieves a single script from IndexedDB by its _id.
 * @param {string} scriptId The _id of the script to retrieve.
 * @returns {Promise<Script | undefined>} A promise that resolves with the script object, or undefined if not found.
 */
export const getScriptFromDb = async (scriptId) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SCRIPTS_STORE_NAME], "readonly");
    const store = transaction.objectStore(SCRIPTS_STORE_NAME);
    const request = store.get(scriptId); // Get by keyPath (_id)

    request.onsuccess = (event) => {
      resolve((event.target ).result);
    };

    request.onerror = (event) => {
      console.error('Error getting script from DB:', (event.target).error);
      reject((event.target).error);
    };
  });
};

/**
 * Adds or updates a single script in IndexedDB.
 * This is used for saving/updating individual scripts.
 * @param {any} script The script object to save or update. Must contain the _id property.
 * @returns {Promise<void>} A promise that resolves when the script is saved.
 */
export const saveScriptToDb = async (script) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SCRIPTS_STORE_NAME], "readwrite");
    const store = transaction.objectStore(SCRIPTS_STORE_NAME);
    const request = store.put(script); // 'put' will add if not exists, update if exists

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error saving script to DB:', (event.target ).error);
      reject((event.target).error);
    };
  });
};


export const updateScriptInDb = async (script) => {
  return saveScriptToDb(script);
};

/**
 * Adds an item to the sync queue.
 * @param {object} item The item representing a pending operation (e.g., { type: 'UPDATE_SCRIPT', data: { _id, title, content } })
 * @returns {Promise<number>} A promise that resolves with the key of the added item.
 */
export const addToSyncQueue = async (item) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
    const request = store.add(item); // Add to the queue

    request.onsuccess = (event) => {
      resolve((event.target).result);
    };

    request.onerror = (event) => {
      console.error('Error adding to sync queue:', (event.target ).error);
      reject((event.target).error);
    };
  });
};

/**
 * Retrieves all items from the sync queue.
 * @returns {Promise<Array<{ key: number, item: any }>>} A promise that resolves with an array of queued items.
 */
export const getSyncQueue = async () => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
    const request = store.openCursor(); // Use cursor to get all items and their keys
    const items = [];

    request.onsuccess = (event) => {
      const cursor = (event.target ).result;
      if (cursor) {
        items.push({ key: cursor.key, item: cursor.value });
        cursor.continue();
      } else {
        resolve(items);
      }
    };

    request.onerror = (event) => {
      console.error('Error getting sync queue:', (event.target ).error);
      reject((event.target).error);
    };
  });
};

/**
 * Removes an item from the sync queue by its key.
 * @param {number} key The key of the item to remove.
 * @returns {Promise<void>} A promise that resolves when the item is removed.
 */
export const removeFromSyncQueue = async (key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error removing from sync queue:', (event.target).error);
      reject((event.target).error);
    };
  });
};
