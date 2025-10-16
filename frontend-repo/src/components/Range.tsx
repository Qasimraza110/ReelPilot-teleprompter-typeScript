"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface CustomRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
  fillClassName?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  "aria-label"?: string;
}

export default function Range({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  disabled = false,
  className = "",
  trackClassName = "",
  thumbClassName = "",
  fillClassName = "",
  showValue = false,
  formatValue = (val) => val.toString(),
  "aria-label": ariaLabel = "Range slider",
}: CustomRangeSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; value: number } | null>(null);

  // Calculate percentage based on value
  const percentage = ((value - min) / (max - min)) * 100;

  // Handle value change with step precision
  const updateValue = useCallback(
    (newValue: number) => {
      if (disabled) return;

      // Clamp value within bounds
      const clampedValue = Math.max(min, Math.min(max, newValue));

      // Round to nearest step
      const steppedValue = Math.round(clampedValue / step) * step;

      // Ensure precision for decimal steps
      const finalValue = parseFloat(steppedValue.toFixed(10));

      if (Math.abs(finalValue - value) > Number.EPSILON) {
        onChange(finalValue);
      }
    },
    [min, max, step, value, onChange, disabled]
  );

  // Convert mouse/touch position to value
  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return value;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      return min + percentage * (max - min);
    },
    [min, max, value]
  );

  // Start dragging
  const startDrag = useCallback(
    (clientX: number, updateImmediately = false) => {
      if (disabled) return;

      setIsDragging(true);
      dragStartRef.current = { x: clientX, value };

      if (updateImmediately) {
        updateValue(getValueFromPosition(clientX));
      }
    },
    [disabled, value, getValueFromPosition, updateValue]
  );

  // Handle drag movement
  const handleDrag = useCallback(
    (clientX: number) => {
      if (!isDragging || !dragStartRef.current || disabled) return;

      updateValue(getValueFromPosition(clientX));
    },
    [isDragging, disabled, getValueFromPosition, updateValue]
  );

  // End dragging
  const endDrag = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();

      const rect = sliderRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX;
      const thumbElement = thumbRef.current;

      if (thumbElement) {
        const thumbRect = thumbElement.getBoundingClientRect();
        const isThumbClick =
          clickX >= thumbRect.left && clickX <= thumbRect.right;

        if (isThumbClick) {
          // Clicked on thumb - start dragging without updating value
          startDrag(clickX, false);
          thumbElement.focus();
        } else {
          // Clicked on track - jump to position and start dragging
          startDrag(clickX, true);
        }
      }
    },
    [disabled, startDrag]
  );

  //   const handleMouseMove = useCallback(
  //     (e: MouseEvent) => {
  //       if (!isDragging || disabled) return;
  //       e.preventDefault();
  //       handleDrag(e.clientX);
  //     },
  //     [isDragging, disabled, handleDrag]
  //   );
  //   const handleMouseUp = useCallback(
  //     (e: MouseEvent) => {
  //       if (!isDragging) return;
  //       e.preventDefault();
  //       endDrag();
  //     },
  //     [isDragging, endDrag]
  //   );

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();

      const touch = e.touches[0];
      const rect = sliderRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;

      const touchX = touch.clientX;
      const thumbElement = thumbRef.current;

      if (thumbElement) {
        const thumbRect = thumbElement.getBoundingClientRect();
        const isThumbTouch =
          touchX >= thumbRect.left && touchX <= thumbRect.right;

        if (isThumbTouch) {
          startDrag(touchX, false);
        } else {
          startDrag(touchX, true);
        }
      }
    },
    [disabled, startDrag]
  );

  // const handleTouchMove = useCallback(
  //     (e: TouchEvent) => {
  //       if (!isDragging || disabled) return;
  //       e.preventDefault();
  //       const touch = e.touches[0];
  //       if (touch) {
  //         handleDrag(touch.clientX);
  //     }
  //     },
  //     [isDragging, disabled, handleDrag]
  //   );
  //   const handleTouchEnd = useCallback(

  //     (e: TouchEvent) => {
  //       if (!isDragging) return;
  //       e.preventDefault();
  //       endDrag();
  //     },
  //     [isDragging, endDrag]
  // );

  // Keyboard events

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      let newValue = value;
      const largeStep = (max - min) / 10;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          newValue = value + step;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          newValue = value - step;
          break;
        case "PageUp":
          newValue = value + largeStep;
          break;
        case "PageDown":
          newValue = value - largeStep;
          break;
        case "Home":
          newValue = min;
          break;
        case "End":
          newValue = max;
          break;
        default:
          return;
      }

      e.preventDefault();
      updateValue(newValue);
    },
    [disabled, value, step, min, max, updateValue]
  );

  // Global event listeners for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDrag(e.clientX);
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      endDrag();
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleDrag(touch.clientX);
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endDrag();
    };

    // Add event listeners
    document.addEventListener("mousemove", handleGlobalMouseMove, {
      passive: false,
    });
    document.addEventListener("mouseup", handleGlobalMouseUp, {
      passive: false,
    });
    document.addEventListener("touchmove", handleGlobalTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleGlobalTouchEnd, {
      passive: false,
    });

    // Prevent text selection
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    // Cleanup
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalTouchEnd);

      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [isDragging, handleDrag, endDrag]);

  return (
    <div
      className={`relative w-full ${className}`}
      style={{ cursor: isDragging ? "grabbing" : "auto" }}
    >
      {/* Slider track */}
      <div
        ref={sliderRef}
        className={`
          relative h-2 rounded-lg bg-white/10 cursor-pointer
          transition-all duration-200 ease-out
          ${isHovered && !disabled ? "bg-white/15" : ""}
          ${disabled ? "cursor-not-allowed opacity-50" : ""}
          ${isDragging ? "cursor-grabbing" : ""}
          ${trackClassName}
        `}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseEnter={() => !isDragging && setIsHovered(true)}
        onMouseLeave={() => !isDragging && setIsHovered(false)}
      >
        {/* Filled portion */}
        <div
          className={`
            absolute left-0 top-0 h-full rounded-lg bg-purple-500
            transition-all duration-200 ease-out
            ${isDragging ? "bg-purple-400" : ""}
            ${fillClassName}
          `}
          style={{ width: `${percentage}%` }}
        />

        {/* Thumb */}
        <div
          ref={thumbRef}
          className={`
            absolute top-1/2 w-5 h-5 -translate-y-1/2 -translate-x-1/2
            bg-purple-500 rounded-full shadow-lg
            transition-all duration-200 ease-out
            transform-gpu select-none
            focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50
            ${
              isDragging
                ? "scale-110 bg-purple-400 shadow-xl cursor-grabbing"
                : "cursor-grab"
            }
            ${
              isHovered && !disabled && !isDragging ? "scale-105 shadow-lg" : ""
            }
            ${disabled ? "cursor-not-allowed opacity-50" : ""}
            ${thumbClassName}
          `}
          style={{
            left: `${percentage}%`,
            cursor: isDragging ? "grabbing" : disabled ? "not-allowed" : "grab",
          }}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Value display */}
      {showValue && (
        <div
          className="absolute -top-8 left-0 px-2 py-1 bg-gray-800 text-white text-xs rounded transition-all duration-200 pointer-events-none"
          style={{
            left: `${percentage}%`,
            transform: "translateX(-50%)",
            opacity: isDragging || isHovered ? 1 : 0,
          }}
        >
          {formatValue(value)}
        </div>
      )}
    </div>
  );
}
