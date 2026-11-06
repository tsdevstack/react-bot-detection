'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BotDetectionResult, BotDetectionStats } from '../types';
import {
  MAX_POINTER_MOVES,
  MIN_FOCUS_EVENTS,
  MIN_POINTER_MOVES,
} from '../constants';

interface TypingPattern {
  key: string;
  timestamp: number;
  timeSinceLastKey: number;
}

export interface AnalyzeBehaviorOptions {
  /**
   * Number of fields in the form. A one-field form needs one focus
   * event; any other form needs two (default: 2).
   */
  fieldCount?: number;
}

export interface UseBotDetectionReturn {
  botScore: number;
  detectionReasons: string[];
  isBot: boolean;
  analyzeBehavior: (options?: AnalyzeBehaviorOptions) => BotDetectionResult;
  handleFieldFocus: () => void;
  handleFormSubmit: (options?: AnalyzeBehaviorOptions) => BotDetectionResult;
  stats: BotDetectionStats;
}

/**
 * Hook for behavioral bot detection.
 *
 * Tracks pointer activity (mouse, touch, pen), typing patterns, and form
 * interactions to detect automated form submissions.
 *
 * @example
 * ```tsx
 * const { handleFormSubmit, isBot } = useBotDetection();
 *
 * const onSubmit = () => {
 *   const result = handleFormSubmit({ fieldCount: 1 });
 *   if (result.isBot) {
 *     console.log('Bot detected:', result.reasons);
 *     return;
 *   }
 *   // Proceed with submission
 * };
 * ```
 */
export function useBotDetection(): UseBotDetectionReturn {
  const [botScore, setBotScore] = useState(0);
  const [detectionReasons, setDetectionReasons] = useState<string[]>([]);
  const [formStartTime] = useState(Date.now());

  // Pointer tracking: moves of a mouse, and touches or pen taps (phones
  // and tablets send no mouse moves)
  const pointerMoves = useRef(0);
  const hasTouch = useRef(false);

  // Typing tracking
  const typingPatterns = useRef<TypingPattern[]>([]);
  const lastKeyTime = useRef<number>(0);

  // Form interaction tracking
  const [focusEvents, setFocusEvents] = useState(0);

  const trackPointerMove = useCallback(() => {
    pointerMoves.current = Math.min(
      pointerMoves.current + 1,
      MAX_POINTER_MOVES,
    );
  }, []);

  const trackPointerDown = useCallback((e: PointerEvent) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      hasTouch.current = true;
    }
  }, []);

  // Typing pattern detection
  const trackKeyPress = useCallback((e: KeyboardEvent) => {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime.current;

    const pattern: TypingPattern = {
      key: e.key,
      timestamp: now,
      timeSinceLastKey,
    };

    typingPatterns.current.push(pattern);
    lastKeyTime.current = now;

    // Keep only last 100 keystrokes
    if (typingPatterns.current.length > 100) {
      typingPatterns.current.shift();
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    document.addEventListener('pointermove', trackPointerMove);
    document.addEventListener('pointerdown', trackPointerDown);
    document.addEventListener('keydown', trackKeyPress);

    return () => {
      document.removeEventListener('pointermove', trackPointerMove);
      document.removeEventListener('pointerdown', trackPointerDown);
      document.removeEventListener('keydown', trackKeyPress);
    };
  }, [trackPointerMove, trackPointerDown, trackKeyPress]);

  // Analyze bot behavior
  const analyzeBehavior = useCallback(
    (options: AnalyzeBehaviorOptions = {}): BotDetectionResult => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Check pointer activity: a mouse that moved, or a touch or pen
      if (!hasTouch.current && pointerMoves.current < MIN_POINTER_MOVES) {
        score += 30;
        reasons.push('No natural pointer activity detected');
      }

      // 2. Check typing patterns
      if (typingPatterns.current.length > 10) {
        const intervals = typingPatterns.current
          .slice(-20)
          .map((p) => p.timeSinceLastKey)
          .filter((t) => t > 0 && t < 1000); // Filter reasonable intervals

        if (intervals.length > 5) {
          const avgInterval =
            intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const variance =
            intervals.reduce((acc, interval) => {
              return acc + Math.pow(interval - avgInterval, 2);
            }, 0) / intervals.length;

          // Very consistent typing (low variance) is suspicious
          if (variance < 100) {
            score += 15;
            reasons.push('Unnaturally consistent typing pattern');
          }

          // Extremely fast typing (under 50ms average) is suspicious
          if (avgInterval < 50) {
            score += 20;
            reasons.push('Superhuman typing speed detected');
          }
        }
      }

      // 3. Check form filling speed
      const currentTime = Date.now();
      const totalTime = currentTime - formStartTime;

      if (totalTime < 2000) {
        // Less than 2 seconds
        score += 40;
        reasons.push('Form filled too quickly');
      }

      // 4. Check focus events: one per field, up to two (a person focuses
      // the field they fill)
      const fieldCount = options.fieldCount ?? MIN_FOCUS_EVENTS;
      const requiredFocusEvents = Math.max(
        1,
        Math.min(fieldCount, MIN_FOCUS_EVENTS),
      );
      if (focusEvents < requiredFocusEvents) {
        score += 15;
        reasons.push('Insufficient focus interactions');
      }

      // 5. Check browser features
      if (typeof navigator !== 'undefined' && navigator.webdriver === true) {
        score += 25;
        reasons.push('Automated browser detected');
      }

      // 6. Check for headless browser indicators
      if (
        typeof window !== 'undefined' &&
        (window.outerWidth === 0 || window.outerHeight === 0)
      ) {
        score += 35;
        reasons.push('Headless browser indicators');
      }

      return {
        score,
        reasons,
        isBot: score >= 50,
        stats: {
          mouseMovements: pointerMoves.current,
          typingEvents: typingPatterns.current.length,
          focusEvents,
          timeSpent: Date.now() - formStartTime,
        },
        honeypotTriggered: false,
      };
    },
    [focusEvents, formStartTime],
  );

  // Form field handlers
  const handleFieldFocus = useCallback(() => {
    setFocusEvents((prev) => prev + 1);
  }, []);

  const handleFormSubmit = useCallback(
    (options?: AnalyzeBehaviorOptions) => {
      const result = analyzeBehavior(options);
      setBotScore(result.score);
      setDetectionReasons(result.reasons);
      return result;
    },
    [analyzeBehavior],
  );

  return {
    botScore,
    detectionReasons,
    isBot: botScore >= 50,
    analyzeBehavior,
    handleFieldFocus,
    handleFormSubmit,
    stats: {
      mouseMovements: pointerMoves.current,
      typingEvents: typingPatterns.current.length,
      focusEvents,
      timeSpent: Date.now() - formStartTime,
    },
  };
}
