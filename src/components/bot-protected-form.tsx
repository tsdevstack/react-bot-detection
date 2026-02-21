'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useBotDetection } from '../hooks/use-bot-detection';
import { useHoneypot } from '../hooks/use-honeypot';
import type { BotDetectionResult, ButtonComponentProps } from '../types';

/**
 * Default button component - a simple styled HTML button.
 */
function DefaultButton({
  children,
  disabled,
  className,
  type,
}: ButtonComponentProps): React.ReactElement {
  return (
    <button
      type={type}
      disabled={disabled}
      className={className}
      style={{
        padding: '0.5rem 1rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export interface BotProtectedFormProps {
  /** Form content (input fields, etc.) */
  children: React.ReactNode;
  /** Called on form submission with FormData and bot detection result */
  onSubmit: (data: FormData, botDetection: BotDetectionResult) => Promise<void>;
  /** Called when bot is detected (optional) */
  onBotDetected?: (result: BotDetectionResult) => void;
  /** Text for submit button (default: "Submit") */
  submitButtonText?: string;
  /** Text while submitting (default: "Processing") */
  loadingButtonText?: string;
  /** CSS class for the form element */
  className?: string;
  /** Custom button component to match your design system */
  ButtonComponent?: React.ComponentType<ButtonComponentProps>;
  /** Show debug panel with detection stats (default: false) */
  showDebugPanel?: boolean;
}

/**
 * Form wrapper with integrated bot detection.
 *
 * Combines behavioral analysis and honeypot detection to protect forms
 * from automated submissions.
 *
 * @example
 * ```tsx
 * import { BotProtectedForm } from '@tsdevstack/react-bot-detection';
 * import { Button } from '@/components/ui/button';
 *
 * <BotProtectedForm
 *   onSubmit={async (formData, botResult) => {
 *     // Send formData and botResult to your API
 *   }}
 *   ButtonComponent={Button}
 * >
 *   <input name="email" type="email" />
 * </BotProtectedForm>
 * ```
 */
export function BotProtectedForm({
  children,
  onSubmit,
  onBotDetected,
  submitButtonText = 'Submit',
  loadingButtonText = 'Processing',
  className = '',
  ButtonComponent = DefaultButton,
  showDebugPanel = false,
}: BotProtectedFormProps): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const {
    botScore,
    detectionReasons,
    isBot,
    handleFieldFocus,
    handleFormSubmit,
    stats,
  } = useBotDetection();

  const { isBotDetected: honeypotTriggered, HoneypotComponent } = useHoneypot();

  // Track if we're on the client to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        // Run behavioral analysis
        const behaviorResult = handleFormSubmit();

        // Check all bot detection methods
        const finalBotScore =
          behaviorResult.score + (honeypotTriggered ? 100 : 0);
        const allReasons = [
          ...behaviorResult.reasons,
          ...(honeypotTriggered ? ['Honeypot field filled'] : []),
        ];

        const botDetectionResult: BotDetectionResult = {
          score: finalBotScore,
          reasons: allReasons,
          isBot: finalBotScore >= 50 || honeypotTriggered,
          stats,
          honeypotTriggered,
        };

        // If definitely a bot, handle it
        if (botDetectionResult.isBot) {
          onBotDetected?.(botDetectionResult);
          setIsSubmitting(false);
          return;
        }

        // Proceed with form submission
        const formData = new FormData(e.currentTarget);
        await onSubmit(formData, botDetectionResult);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [handleFormSubmit, honeypotTriggered, onBotDetected, onSubmit, stats]
  );

  return (
    <form onSubmit={handleSubmit} className={className}>
      {/* Honeypot fields */}
      <HoneypotComponent />

      {/* Enhanced form fields with focus tracking */}
      <div onFocus={handleFieldFocus}>{children}</div>

      {/* Submit button */}
      <ButtonComponent
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? loadingButtonText : submitButtonText}
      </ButtonComponent>

      {/* Debug panel - only render on client to prevent hydration mismatch */}
      {showDebugPanel && isClient && (
        <div
          style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: '#666',
          }}
        >
          <details>
            <summary style={{ cursor: 'pointer' }}>Bot Detection Debug</summary>
            <pre
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(
                {
                  botScore,
                  detectionReasons,
                  isBot,
                  honeypotTriggered,
                  stats,
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </form>
  );
}