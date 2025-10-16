importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.0/workbox-sw.js" // Use the version you prefer
);
import {
  getAuthTokenSW,
  getSyncQueueSW,
  removeFromSyncQueueSW,
  updateScriptInDbSW,
} from "./sw-utils.js"; // Adjust path if sw-utils.js is elsewhere

// This is the place where workbox will inject the precache manifest.
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Google Fonts Cache
workbox.routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

// Static Image Assets Cache
workbox.routing.registerRoute(
  /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-image-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

// API Cache
workbox.routing.registerRoute(
  /\/api\/.*$/i,
  new NetworkFirst({
    cacheName: "apis",
    networkTimeoutSeconds: 10, // This is specific to NetworkFirst
    plugins: [
      new ExpirationPlugin({
        maxEntries: 16,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

// ------------------------------------------------------------------------
// SYNC SCRIPT UPDATES
// ------------------------------------------------------------------------

// IMPORTANT: Define your API base URL for the Service Worker
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`; // <--- !!! CHANGE FOR PRODUCTION !!!

// Listener for the `sync` event, typically triggered by `register.sync.register()`
// in your main app when `navigator.onLine` status changes from offline to online.
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-script-updates") {
    console.log(
      "SW: Caught sync-script-updates event. Starting background sync."
    );
    // `waitUntil` ensures the Service Worker stays alive until the promise resolves
    event.waitUntil(syncScriptUpdates());
  }
});

/**
 * Processes the sync queue, sending updates to the API.
 */
async function syncScriptUpdates() {
  console.log("SW: Executing syncScriptUpdates function.");
  const authToken = await getAuthTokenSW();

  if (!authToken) {
    console.warn(
      "SW: No authentication token found in IndexedDB. Cannot sync updates. Waiting for token."
    );
    // If no token, we can't authenticate. Let the items stay in queue to retry later.
    // Optionally, if this is a critical app, you might notify the user in the main app.
    return; // Exit, will retry on next sync event
  }

  const itemsToSync = await getSyncQueueSW();
  console.log(`SW: Found ${itemsToSync.length} items in sync queue.`);

  if (itemsToSync.length === 0) {
    console.log("SW: Sync queue is empty. No updates to send.");
    return;
  }

  for (const { key, item } of itemsToSync) {
    try {
      if (item.type === "UPDATE_SCRIPT") {
        console.log(
          `SW: Attempting to sync script update for ID: ${item.data._id}`
        );
        const response = await fetch(`${API_BASE_URL}/scripts/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`, // Use the token from Auth IndexedDB
          },
          body: JSON.stringify(item.data),
        });

        if (!response.ok) {
          // If the network request itself was fine but the server returned an error status
          // e.g., 401 Unauthorized (token expired), 400 Bad Request, 500 Internal Server Error
          // Don't remove from queue; it might be a temporary server issue or expired token.
          // You might add retry logic/error handling to the 'item' in the queue here.
          const errorText = await response.text();
          console.error(
            `SW: Sync failed for script ${item.data._id}. Status: ${response.status}. Error: ${errorText}`
          );
          // Consider checking for specific status codes like 401/403 to invalidate token/notify user
          // For now, let it stay in the queue for retry.
          // Break the loop to avoid overwhelming the server if one request fails (e.g., token expired)
          // All subsequent requests would likely also fail.
          break;
        }

        // Assuming data.success property is checked on the main thread for immediate feedback
        // The Service Worker primarily ensures network delivery.
        const responseData = await response.json();
        if (responseData.success) {
          console.log(
            `SW: Successfully synced script update for ID: ${item.data._id}. Removing from queue.`
          );
          await removeFromSyncQueueSW(key); // Remove from queue only on successful API response
          // Optionally, update the main script cache here with the server's definitive version
          // This ensures data consistency if the server applies transformations.
          await updateScriptInDbSW(responseData.script || item.data); // Use server's data if provided, else queued data
        } else {
          console.error(
            `SW: API returned success:false for script ${
              item.data._id
            }. Message: ${responseData.message || "Unknown"}. Leaving in queue.`
          );
          // Server-side logic dictates this is not a 'success'
          // Keep in queue for retry or manual intervention.
          break; // Break if server signals failure
        }
      }
      // Add more `if (item.type === 'CREATE_SCRIPT')` or `DELETE_SCRIPT` blocks here
      // with their respective API calls.
    } catch (error) {
      console.error(
        `SW: Network error or unexpected error during sync for item ${key}:`,
        error
      );
      // This catch block handles actual network errors (e.g., cannot reach server).
      // Do NOT remove from queue; it will retry on the next sync event.
      break; // Break the loop to avoid continuous failures in a bad network state
    }
  }
  console.log("SW: Script updates sync process completed.");
}
