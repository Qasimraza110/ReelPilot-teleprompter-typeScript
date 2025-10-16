export type GuidanceEvent = {
  type: "lighting" | "framing";
  classification?: string;
  message?: string | null;
  ts: number;
};

// Stub: replace with real Appwrite client if needed
export async function sendGuidanceEvent(_event: GuidanceEvent): Promise<void> {
  // Intentionally no-op for now; wire actual Appwrite Database insertion here
  return;
}


