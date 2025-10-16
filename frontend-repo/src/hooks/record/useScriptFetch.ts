// hooks/useScriptFetch.ts
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCookie } from "@/actions/cookie"; // Assuming this is your server action for cookies

interface ScriptData {
  script: {
    content: string;
    // Add other script properties if needed
  };
}
 
interface UseScriptFetchResult {
  scriptLines: string[];
  isLoading: boolean;
  error: string | null;
  scriptId: string | null;
}

export const useScriptFetch = (): UseScriptFetchResult => {
  const searchParams = useSearchParams();
  const scriptId = searchParams.get("scriptId");

  const [scriptLines, setScriptLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScript = async () => {
      if (!scriptId) {
        setError("No script ID provided.");
        setIsLoading(false);
        setScriptLines([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const session_id = await getCookie("session_id");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/getOne?scriptId=${scriptId}`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${session_id}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch script: ${response.statusText}`);
        }
        const data: ScriptData = await response.json();

        if (data.script && typeof data.script.content === "string") {
          const lines = data.script.content
            .split(/(?<=[.!?])\s+/) // Splits after ., !, or ? followed by one or more spaces, keeping the punctuation
            .filter((line: string) => line.trim() !== "");
          setScriptLines(lines);
        } else {
          setScriptLines([]);
          setError("Script content is missing or not a string.");
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error fetching script:", err);
        setError(`Error loading script: ${err.message}`);
        setScriptLines([]);
      } finally { 
        setIsLoading(false);
      }
    };

    fetchScript();
  }, [scriptId]);

  return { scriptLines, isLoading, error, scriptId };
};
