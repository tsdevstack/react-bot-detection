'use client';

import { describe, it, expect } from '@rstest/core';
import { renderHook, act } from '@testing-library/react';
import { render } from '@testing-library/react';
import { useHoneypot } from './use-honeypot';

describe('useHoneypot', () => {
  describe('initial state', () => {
    it('should not detect bot initially', () => {
      const { result } = renderHook(() => useHoneypot());
      expect(result.current.isBotDetected).toBe(false);
    });

    it('should have initial bot score of 0', () => {
      const { result } = renderHook(() => useHoneypot());
      expect(result.current.botScore).toBe(0);
    });
  });

  describe('handleBotDetected', () => {
    it('should set isBotDetected to true', () => {
      const { result } = renderHook(() => useHoneypot());

      act(() => {
        result.current.handleBotDetected();
      });

      expect(result.current.isBotDetected).toBe(true);
    });

    it('should add 50 to bot score', () => {
      const { result } = renderHook(() => useHoneypot());

      act(() => {
        result.current.handleBotDetected();
      });

      expect(result.current.botScore).toBe(50);
    });

    it('should accumulate bot score on multiple calls', () => {
      const { result } = renderHook(() => useHoneypot());

      act(() => {
        result.current.handleBotDetected();
        result.current.handleBotDetected();
      });

      expect(result.current.botScore).toBe(100);
    });
  });

  describe('resetDetection', () => {
    it('should reset isBotDetected to false', () => {
      const { result } = renderHook(() => useHoneypot());

      act(() => {
        result.current.handleBotDetected();
      });
      expect(result.current.isBotDetected).toBe(true);

      act(() => {
        result.current.resetDetection();
      });
      expect(result.current.isBotDetected).toBe(false);
    });

    it('should reset bot score to 0', () => {
      const { result } = renderHook(() => useHoneypot());

      act(() => {
        result.current.handleBotDetected();
      });
      expect(result.current.botScore).toBe(50);

      act(() => {
        result.current.resetDetection();
      });
      expect(result.current.botScore).toBe(0);
    });
  });

  describe('HoneypotComponent', () => {
    it('should render a component', () => {
      const { result } = renderHook(() => useHoneypot());

      const { container } = render(<result.current.HoneypotComponent />);

      expect(container.firstChild).not.toBeNull();
    });

    it('should render honeypot fields with aria-hidden', () => {
      const { result } = renderHook(() => useHoneypot());

      render(<result.current.HoneypotComponent />);

      const hiddenWrapper = document.querySelector('[aria-hidden="true"]');
      expect(hiddenWrapper).not.toBeNull();
    });
  });
});
