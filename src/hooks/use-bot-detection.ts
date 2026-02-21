'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BotDetectionResult, BotDetectionStats } from '../types';

interface MouseMovement {
  x: number;
  y: number;
  timestamp: number;
}

interface TypingPattern {
  key: string;
  timestamp: number;
  timeSinceLastKey: number;
}

export interface UseBotDetectionReturn {
  botScore: number;
  detectionReasons: string[];
  isBot: boolean;
  analyzeBehavior: () => BotDetectionResult;
  handleFieldFocus: () => void;
  handleFormSubmit: () => BotDetectionResult;
  stats: BotDetectionStats;
}

/**
 * Hook for behavioral bot detection.
 *
 * Tracks mouse movements, typing patterns, and form interactions
 * to detect automated form submissions.
 *
 * @example
 * ```tsx
 * const { handleFormSubmit, isBot } = useBotDetection();
 *
 * const onSubmit = () => {
 *   const result = handleFormSubmit();
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

  // Mouse tracking
  const mouseMovements = useRef<MouseMovement[]>([]);
  const [hasMouseMovement, setHasMouseMovement] = useState(false);

  // Typing tracking
  const typingPatterns = useRef<TypingPattern[]>([]);
  const lastKeyTime = useRef<number>(0);

  // Form interaction tracking
  const [focusEvents, setFocusEvents] = useState(0);

  // Mouse movement detection
  const trackMouseMovement = useCallback((e: MouseEvent) => {
    const movement: MouseMovement = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
    };

    mouseMovements.current.push(movement);
    setHasMouseMovement(true);

    // Keep only last 50 movements
    if (mouseMovements.current.length > 50) {
      mouseMovements.current.shift();
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
    document.addEventListener('mousemove', trackMouseMovement);
    document.addEventListener('keydown', trackKeyPress);

    return () => {
      document.removeEventListener('mousemove', trackMouseMovement);
      document.removeEventListener('keydown', trackKeyPress);
    };
  }, [trackMouseMovement, trackKeyPress]);

  // Analyze bot behavior
  const analyzeBehavior = useCallback((): BotDetectionResult => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Check mouse movements
    if (!hasMouseMovement || mouseMovements.current.length < 5) {
      score += 30;
      reasons.push('No natural mouse movement detected');
    } else {
      // Check for unnatural mouse patterns (perfectly straight lines, etc.)
      const movements = mouseMovements.current.slice(-20);
      const variations = movements.map((m, i) => {
        if (i === 0) return 0;
        const prev = movements[i - 1];
        return Math.abs(m.x - prev.x) + Math.abs(m.y - prev.y);
      });

      const avgVariation =
        variations.reduce((a, b) => a + b, 0) / variations.length;
      if (avgVariation < 5) {
        score += 20;
        reasons.push('Unnatural mouse movement patterns');
      }
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

    // 4. Check focus events (humans typically focus multiple times)
    if (focusEvents < 2) {
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
        mouseMovements: mouseMovements.current.length,
        typingEvents: typingPatterns.current.length,
        focusEvents,
        timeSpent: Date.now() - formStartTime,
      },
      honeypotTriggered: false,
    };
  }, [hasMouseMovement, focusEvents, formStartTime]);

  // Form field handlers
  const handleFieldFocus = useCallback(() => {
    setFocusEvents((prev) => prev + 1);
  }, []);

  const handleFormSubmit = useCallback(() => {
    const result = analyzeBehavior();
    setBotScore(result.score);
    setDetectionReasons(result.reasons);
    return result;
  }, [analyzeBehavior]);

  return {
    botScore,
    detectionReasons,
    isBot: botScore >= 50,
    analyzeBehavior,
    handleFieldFocus,
    handleFormSubmit,
    stats: {
      mouseMovements: mouseMovements.current.length,
      typingEvents: typingPatterns.current.length,
      focusEvents,
      timeSpent: Date.now() - formStartTime,
    },
  };
}