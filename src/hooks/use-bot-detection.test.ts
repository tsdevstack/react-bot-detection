'use client';

import { describe, it, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { renderHook, act } from '@testing-library/react';
import { useBotDetection } from './use-bot-detection';

describe('useBotDetection', () => {
  beforeEach(() => {
    rs.useFakeTimers();
  });

  afterEach(() => {
    rs.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial bot score of 0', () => {
      const { result } = renderHook(() => useBotDetection());
      expect(result.current.botScore).toBe(0);
    });

    it('should return empty detection reasons', () => {
      const { result } = renderHook(() => useBotDetection());
      expect(result.current.detectionReasons).toEqual([]);
    });

    it('should not flag as bot initially', () => {
      const { result } = renderHook(() => useBotDetection());
      expect(result.current.isBot).toBe(false);
    });

    it('should return initial stats', () => {
      const { result } = renderHook(() => useBotDetection());
      expect(result.current.stats.focusEvents).toBe(0);
    });
  });

  describe('handleFieldFocus', () => {
    it('should increment focus events', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        result.current.handleFieldFocus();
      });

      expect(result.current.stats.focusEvents).toBe(1);
    });

    it('should accumulate focus events', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
      });

      expect(result.current.stats.focusEvents).toBe(3);
    });
  });

  describe('analyzeBehavior', () => {
    it('should detect fast form submission', () => {
      const { result } = renderHook(() => useBotDetection());

      // Submit immediately (less than 2 seconds)
      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain('Form filled too quickly');
      expect(analysisResult.score).toBeGreaterThanOrEqual(40);
    });

    it('should detect insufficient focus interactions', () => {
      const { result } = renderHook(() => useBotDetection());

      // Advance time to avoid fast submission penalty
      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain(
        'Insufficient focus interactions',
      );
    });

    it('should need one focus event on a one-field form', () => {
      const { result } = renderHook(() => useBotDetection());

      rs.advanceTimersByTime(3000);
      act(() => {
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior({ fieldCount: 1 });

      expect(analysisResult.reasons).not.toContain(
        'Insufficient focus interactions',
      );
    });

    it('should need two focus events on a form with more fields', () => {
      const { result } = renderHook(() => useBotDetection());

      rs.advanceTimersByTime(3000);
      act(() => {
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior({ fieldCount: 4 });

      expect(analysisResult.reasons).toContain(
        'Insufficient focus interactions',
      );
    });

    it('should need two focus events when the field count is unknown', () => {
      const { result } = renderHook(() => useBotDetection());

      rs.advanceTimersByTime(3000);
      act(() => {
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain(
        'Insufficient focus interactions',
      );
    });

    it('should detect no pointer activity', () => {
      const { result } = renderHook(() => useBotDetection());

      // Advance time to avoid fast submission penalty
      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain(
        'No natural pointer activity detected',
      );
    });

    it('should return isBot true when score >= 50', () => {
      const { result } = renderHook(() => useBotDetection());

      // Fast submission + no mouse + no focus = high score
      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.isBot).toBe(true);
      expect(analysisResult.score).toBeGreaterThanOrEqual(50);
    });
  });

  describe('handleFormSubmit', () => {
    it('should update botScore state', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        result.current.handleFormSubmit();
      });

      expect(result.current.botScore).toBeGreaterThan(0);
    });

    it('should update detectionReasons state', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        result.current.handleFormSubmit();
      });

      expect(result.current.detectionReasons.length).toBeGreaterThan(0);
    });

    it('should return analysis result', () => {
      const { result } = renderHook(() => useBotDetection());

      let submitResult: ReturnType<typeof result.current.handleFormSubmit>;
      act(() => {
        submitResult = result.current.handleFormSubmit();
      });

      expect(submitResult!).toHaveProperty('score');
      expect(submitResult!).toHaveProperty('reasons');
      expect(submitResult!).toHaveProperty('isBot');
      expect(submitResult!).toHaveProperty('stats');
    });
  });

  describe('event listeners', () => {
    it('should set up pointer listeners (mouse, touch and pen)', () => {
      const addEventListenerSpy = rs.spyOn(document, 'addEventListener');
      renderHook(() => useBotDetection());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'pointerdown',
        expect.any(Function),
      );
      addEventListenerSpy.mockRestore();
    });

    it('should set up keydown listener', () => {
      const addEventListenerSpy = rs.spyOn(document, 'addEventListener');
      renderHook(() => useBotDetection());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      );
      addEventListenerSpy.mockRestore();
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = rs.spyOn(document, 'removeEventListener');
      const { unmount } = renderHook(() => useBotDetection());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'pointerdown',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      );
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('pointer tracking', () => {
    it('should track mouse movements and update stats', () => {
      const { result } = renderHook(() => useBotDetection());

      // Simulate mouse movements
      for (let i = 0; i < 10; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: i * 50,
              clientY: i * 30,
            }),
          );
        });
      }

      // Stats from refs are read at analyzeBehavior() call time
      const analysisResult = result.current.analyzeBehavior();
      expect(analysisResult.stats.mouseMovements).toBe(10);
    });

    it('should not flag bot when sufficient natural mouse movement', () => {
      const { result } = renderHook(() => useBotDetection());

      // Simulate natural mouse movements with variation
      for (let i = 0; i < 10; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: i * 50 + Math.random() * 20,
              clientY: i * 30 + Math.random() * 20,
            }),
          );
        });
      }

      // Advance time to avoid fast submission penalty
      rs.advanceTimersByTime(3000);

      // Add focus events
      act(() => {
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).not.toContain(
        'No natural pointer activity detected',
      );
    });

    it('should accept small, slow mouse steps (a careful hand)', () => {
      const { result } = renderHook(() => useBotDetection());

      for (let i = 0; i < 10; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: 100 + i,
              clientY: 100 + i,
            }),
          );
        });
      }

      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.score).toBe(15);
      expect(analysisResult.reasons).toEqual([
        'Insufficient focus interactions',
      ]);
    });

    it('should count a touch as pointer activity (phones send no mouse moves)', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerdown', { pointerType: 'touch' }),
        );
      });
      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).not.toContain(
        'No natural pointer activity detected',
      );
    });

    it('should count a pen tap as pointer activity', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerdown', { pointerType: 'pen' }),
        );
      });
      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).not.toContain(
        'No natural pointer activity detected',
      );
    });

    it('should not count a mouse click without moves as pointer activity', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerdown', { pointerType: 'mouse' }),
        );
      });
      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain(
        'No natural pointer activity detected',
      );
    });

    it('should cap mouse movements at 50', () => {
      const { result } = renderHook(() => useBotDetection());

      // Simulate more than 50 mouse movements
      for (let i = 0; i < 60; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: i * 10,
              clientY: i * 10,
            }),
          );
        });
      }

      // Stats from refs are read at analyzeBehavior() call time
      const analysisResult = result.current.analyzeBehavior();
      expect(analysisResult.stats.mouseMovements).toBe(50);
    });
  });

  describe('typing pattern tracking', () => {
    it('should track keystrokes and update stats', () => {
      const { result } = renderHook(() => useBotDetection());

      // Simulate typing
      for (let i = 0; i < 15; i++) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        });
        rs.advanceTimersByTime(100); // 100ms between keys
      }

      // Stats from refs are read at analyzeBehavior() call time
      const analysisResult = result.current.analyzeBehavior();
      expect(analysisResult.stats.typingEvents).toBe(15);
    });

    it('should detect unnaturally consistent typing', () => {
      const { result } = renderHook(() => useBotDetection());

      // Advance time to avoid fast submission
      rs.advanceTimersByTime(3000);

      // Simulate very consistent typing (exactly 50ms intervals)
      for (let i = 0; i < 20; i++) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        });
        rs.advanceTimersByTime(50);
      }

      // Add mouse movement and focus to isolate typing test
      for (let i = 0; i < 10; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: i * 50 + Math.random() * 30,
              clientY: i * 30 + Math.random() * 30,
            }),
          );
        });
      }
      act(() => {
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain(
        'Unnaturally consistent typing pattern',
      );
    });

    it('should detect superhuman typing speed', () => {
      const { result } = renderHook(() => useBotDetection());

      // Advance time to avoid fast submission
      rs.advanceTimersByTime(3000);

      // Simulate very fast typing (30ms intervals)
      for (let i = 0; i < 20; i++) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        });
        rs.advanceTimersByTime(30);
      }

      // Add mouse movement and focus to isolate typing test
      for (let i = 0; i < 10; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: i * 50 + Math.random() * 30,
              clientY: i * 30 + Math.random() * 30,
            }),
          );
        });
      }
      act(() => {
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain(
        'Superhuman typing speed detected',
      );
    });

    it('should cap typing patterns at 100', () => {
      const { result } = renderHook(() => useBotDetection());

      // Simulate more than 100 keystrokes
      for (let i = 0; i < 110; i++) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        });
        rs.advanceTimersByTime(100);
      }

      // Stats from refs are read at analyzeBehavior() call time
      const analysisResult = result.current.analyzeBehavior();
      expect(analysisResult.stats.typingEvents).toBe(100);
    });

    it('should not flag typing when natural variation exists', () => {
      const { result } = renderHook(() => useBotDetection());

      // Advance time to avoid fast submission
      rs.advanceTimersByTime(3000);

      // Simulate natural typing with variable intervals
      const intervals = [
        120, 80, 150, 90, 200, 100, 180, 70, 130, 110, 160, 95,
      ];
      for (const interval of intervals) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        });
        rs.advanceTimersByTime(interval);
      }

      // Add mouse movement and focus
      for (let i = 0; i < 10; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: i * 50 + Math.random() * 30,
              clientY: i * 30 + Math.random() * 30,
            }),
          );
        });
      }
      act(() => {
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).not.toContain(
        'Unnaturally consistent typing pattern',
      );
      expect(analysisResult.reasons).not.toContain(
        'Superhuman typing speed detected',
      );
    });
  });

  describe('browser detection', () => {
    it('should detect webdriver automation', () => {
      const { result } = renderHook(() => useBotDetection());

      // Mock navigator.webdriver
      const originalNavigator = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, webdriver: true },
        writable: true,
        configurable: true,
      });

      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain('Automated browser detected');
      expect(analysisResult.score).toBeGreaterThanOrEqual(25);

      // Restore
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('should detect headless browser indicators', () => {
      const { result } = renderHook(() => useBotDetection());

      // Mock window dimensions
      const originalOuterWidth = window.outerWidth;
      const originalOuterHeight = window.outerHeight;
      Object.defineProperty(window, 'outerWidth', {
        value: 0,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'outerHeight', {
        value: 0,
        writable: true,
        configurable: true,
      });

      rs.advanceTimersByTime(3000);

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.reasons).toContain('Headless browser indicators');
      expect(analysisResult.score).toBeGreaterThanOrEqual(35);

      // Restore
      Object.defineProperty(window, 'outerWidth', {
        value: originalOuterWidth,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'outerHeight', {
        value: originalOuterHeight,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('legitimate user behavior', () => {
    it('should pass legitimate user with all natural behaviors', () => {
      const { result } = renderHook(() => useBotDetection());

      // Wait reasonable time
      rs.advanceTimersByTime(5000);

      // Natural mouse movements
      for (let i = 0; i < 15; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: i * 40 + Math.random() * 50,
              clientY: i * 25 + Math.random() * 40,
            }),
          );
        });
      }

      // Natural typing with variable intervals
      const intervals = [
        120, 80, 150, 90, 200, 100, 180, 70, 130, 110, 160, 95,
      ];
      for (const interval of intervals) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        });
        rs.advanceTimersByTime(interval);
      }

      // Multiple focus events
      act(() => {
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
        result.current.handleFieldFocus();
      });

      const analysisResult = result.current.analyzeBehavior();

      expect(analysisResult.isBot).toBe(false);
      expect(analysisResult.score).toBeLessThan(50);
    });

    it('should pass a person who pastes an email and submits within a second', () => {
      const { result } = renderHook(() => useBotDetection());

      // Small, slow mouse steps towards the field
      for (let i = 0; i < 18; i++) {
        act(() => {
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: 300 + i * 2,
              clientY: 200 + i,
            }),
          );
        });
      }
      act(() => {
        result.current.handleFieldFocus();
      });
      // Cmd+V
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
      });
      rs.advanceTimersByTime(1068);

      const analysisResult = result.current.analyzeBehavior({ fieldCount: 1 });

      expect(analysisResult.reasons).toEqual(['Form filled too quickly']);
      expect(analysisResult.score).toBe(40);
      expect(analysisResult.isBot).toBe(false);
    });

    it('should pass a phone user who taps an autofilled email and submits', () => {
      const { result } = renderHook(() => useBotDetection());

      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerdown', { pointerType: 'touch' }),
        );
        result.current.handleFieldFocus();
      });
      rs.advanceTimersByTime(900);

      const analysisResult = result.current.analyzeBehavior({ fieldCount: 1 });

      expect(analysisResult.score).toBe(40);
      expect(analysisResult.isBot).toBe(false);
    });
  });

  describe('automated submissions', () => {
    it('should block a script that fills a one-field form instantly', () => {
      const { result } = renderHook(() => useBotDetection());

      const analysisResult = result.current.analyzeBehavior({ fieldCount: 1 });

      expect(analysisResult.reasons).toEqual([
        'No natural pointer activity detected',
        'Form filled too quickly',
        'Insufficient focus interactions',
      ]);
      expect(analysisResult.score).toBe(85);
      expect(analysisResult.isBot).toBe(true);
    });
  });
});
