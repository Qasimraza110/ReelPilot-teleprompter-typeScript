import React, { useRef, useEffect } from "react";

interface TeleprompterSettings {
  fontSize: "small" | "medium" | "large";
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
  scrollSpeed: number;
  showWordCount: boolean;
}

interface TeleprompterDisplayProps {
  scriptLines: string[];
  currentLineIndex: number;
  isRecording: boolean;
  settings: TeleprompterSettings;
}

const fontSizeMap: Record<string, string> = {
  small: "1.25rem",
  medium: "1.75rem",
  large: "2.25rem",
};

export const TeleprompterDisplay: React.FC<TeleprompterDisplayProps> = ({
  scriptLines,
  currentLineIndex,
  isRecording,
  settings,
}) => {
  const centerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (centerRef.current) {
      centerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentLineIndex]);

  // Ensure text color is never black or too dark
  let textColor = settings.textColor?.trim() || "#ffffff";
  if (textColor === "#000000" || textColor === "#000" || textColor === "black") {
    textColor = "#ffffff"; // Force white if black is set
  }
  
  const lineHeight = settings.lineHeight || 1.5;
  const fontSize = fontSizeMap[settings.fontSize] || "1.75rem";

  // Line progression logic:
  // At start (nothing spoken yet): show lines 0, 1 sharp (center), line 2 blurred (bottom)
  // After line 0 spoken: show line 0 blurred (top), lines 1, 2 sharp (center), line 3 blurred (bottom)
  const currentLine = scriptLines[currentLineIndex];
  const nextLine = scriptLines[currentLineIndex + 1];
  const nextNextLine = scriptLines[currentLineIndex + 2];

  if (!currentLine) return null;

  // Show previous line (blurred) only if we've moved past the first line
  const showPrevLine = currentLineIndex > 0;
  const prevLine = showPrevLine ? scriptLines[currentLineIndex - 1] : null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-20 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 pointer-events-none" />
      
      <div 
        className="relative w-full max-w-5xl rounded-2xl"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: 'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.65) 100%)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '3rem 2rem',
        }}
      >
        {prevLine && (
          <p
            className="mb-4 transition-all duration-700 ease-out text-center px-8"
            style={{
              opacity: 0.3,
              filter: "blur(3px)",
              fontSize: `calc(${fontSize} * 0.85)`,
              lineHeight,
              color: textColor,
              textShadow: `
                0 2px 12px rgba(0,0,0,0.95),
                0 4px 24px rgba(0,0,0,0.8),
                0 0 40px rgba(0,0,0,0.6)
              `,
              fontWeight: 400,
            }}
          >
            {prevLine}
          </p>
        )}

        <div ref={centerRef} className="space-y-5 px-6">
          <p
            className="transition-all duration-500 ease-out text-center leading-relaxed"
            style={{
              fontSize,
              lineHeight,
              color: textColor,
              textShadow: `
                0 2px 16px rgba(0,0,0,1),
                0 4px 32px rgba(0,0,0,0.9),
                0 0 60px rgba(0,0,0,0.7),
                2px 2px 4px rgba(0,0,0,0.8)
              `,
              fontWeight: 600,
              letterSpacing: '0.02em',
              transform: "scale(1.02)",
            }}
          >
            {currentLine}
          </p>

          {nextLine && (
            <p
              className="transition-all duration-500 ease-out text-center leading-relaxed"
              style={{
                opacity: 0.85,
                fontSize: `calc(${fontSize} * 0.95)`,
                lineHeight,
                color: textColor,
                textShadow: `
                  0 2px 12px rgba(0,0,0,0.95),
                  0 4px 24px rgba(0,0,0,0.8),
                  0 0 40px rgba(0,0,0,0.6)
                `,
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}
            >
              {nextLine}
            </p>
          )}
        </div>

        {nextNextLine && (
          <p
            className="mt-4 transition-all duration-700 ease-out text-center px-8"
            style={{
              opacity: 0.35,
              // filter: "blur(2.5px)",
              fontSize: `calc(${fontSize} * 0.85)`,
              lineHeight,
              color: textColor,
              textShadow: `
                0 2px 12px rgba(0,0,0,0.95),
                0 4px 24px rgba(0,0,0,0.8),
                0 0 40px rgba(0,0,0,0.6)
              `,
              fontWeight: 400,
            }}
          >
            {nextNextLine}
          </p>
        )}

        {settings.showWordCount && (
          <div 
            className="absolute -bottom-16 right-4 text-xs font-medium backdrop-blur-md bg-black/60 px-4 py-2 rounded-full border border-white/20 pointer-events-none"
            style={{
              color: textColor,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            Line {currentLineIndex + 1} / {scriptLines.length}
          </div>
        )}
      </div>
    </div>
  );
};