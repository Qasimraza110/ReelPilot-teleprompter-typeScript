// utils/debugLogger.ts
let subscribers: ((msg: string) => void)[] = [];

export function debugLog(message: string, scriptTokens: (string | number)[]) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
  const logMsg = `[${timestamp}] ${message}`;

  console.log(logMsg); // still logs to console if available
  subscribers.forEach((cb) => cb(logMsg));
  
}


export function subscribeToLogs(cb: (msg: string) => void) {
  subscribers.push(cb);
  return () => {
    subscribers = subscribers.filter((s) => s !== cb);
  };
}
