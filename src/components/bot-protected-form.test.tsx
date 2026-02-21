import { describe, it, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BotProtectedForm } from './bot-protected-form';
import type { ButtonComponentProps } from '../types';

afterEach(() => {
  cleanup();
});

// Mock the hooks to control their behavior in tests
rs.mock('../hooks/use-bot-detection', () => ({
  useBotDetection: rs.fn(() => ({
    botScore: 0,
    detectionReasons: [],
    isBot: false,
    handleFieldFocus: rs.fn(),
    handleFormSubmit: rs.fn(() => ({
      score: 0,
      reasons: [],
    })),
    stats: {
      mouseMovements: 10,
      typingEvents: 20,
      focusEvents: 5,
      timeSpent: 5000,
    },
  })),
}));

rs.mock('../hooks/use-honeypot', () => ({
  useHoneypot: rs.fn(() => ({
    isBotDetected: false,
    HoneypotComponent: () => <div data-testid="honeypot" />,
  })),
}));

// Import mocks after rs.mock declarations
import { useBotDetection } from '../hooks/use-bot-detection';
import { useHoneypot } from '../hooks/use-honeypot';

const mockUseBotDetection = useBotDetection as ReturnType<typeof rs.fn>;
const mockUseHoneypot = useHoneypot as ReturnType<typeof rs.fn>;

describe('BotProtectedForm', () => {
  const mockOnSubmit = rs.fn();

  beforeEach(() => {
    rs.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);

    // Reset to default mock implementations
    mockUseBotDetection.mockReturnValue({
      botScore: 0,
      detectionReasons: [],
      isBot: false,
      handleFieldFocus: rs.fn(),
      handleFormSubmit: rs.fn(() => ({
        score: 0,
        reasons: [],
      })),
      stats: {
        mouseMovements: 10,
        typingEvents: 20,
        focusEvents: 5,
        timeSpent: 5000,
      },
    });

    mockUseHoneypot.mockReturnValue({
      isBotDetected: false,
      HoneypotComponent: () => <div data-testid="honeypot" />,
    });
  });

  describe('Rendering', () => {
    it('should render children and submit button', () => {
      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" data-testid="email" />
        </BotProtectedForm>,
      );

      expect(screen.getByTestId('email')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeNull();
    });

    it('should render honeypot component', () => {
      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" />
        </BotProtectedForm>,
      );

      expect(screen.getByTestId('honeypot')).not.toBeNull();
    });

    it('should use custom submit button text', () => {
      render(
        <BotProtectedForm onSubmit={mockOnSubmit} submitButtonText="Send">
          <input name="email" />
        </BotProtectedForm>,
      );

      expect(screen.getByRole('button', { name: 'Send' })).not.toBeNull();
    });

    it('should apply className to form', () => {
      render(
        <BotProtectedForm onSubmit={mockOnSubmit} className="my-form-class">
          <input name="email" />
        </BotProtectedForm>,
      );

      const form = screen.getByRole('button').closest('form');
      expect(form?.classList.contains('my-form-class')).toBe(true);
    });
  });

  describe('Custom Button Component', () => {
    it('should use custom ButtonComponent', () => {
      const CustomButton = ({
        children,
        disabled,
        type,
      }: ButtonComponentProps) => (
        <button type={type} disabled={disabled} data-testid="custom-button">
          Custom: {children}
        </button>
      );

      render(
        <BotProtectedForm
          onSubmit={mockOnSubmit}
          ButtonComponent={CustomButton}
        >
          <input name="email" />
        </BotProtectedForm>,
      );

      expect(screen.getByTestId('custom-button')).not.toBeNull();
      expect(screen.getByText('Custom: Submit')).not.toBeNull();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with FormData and bot detection result', async () => {
      const user = userEvent.setup();
      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" defaultValue="test@example.com" />
        </BotProtectedForm>,
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const [formData, botResult] = mockOnSubmit.mock.calls[0];
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('email')).toBe('test@example.com');
      expect(botResult).toMatchObject({
        score: 0,
        reasons: [],
        isBot: false,
        honeypotTriggered: false,
      });
    });

    it('should show loading text while submitting', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      mockOnSubmit.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      render(
        <BotProtectedForm
          onSubmit={mockOnSubmit}
          submitButtonText="Submit"
          loadingButtonText="Processing..."
        >
          <input name="email" />
        </BotProtectedForm>,
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Processing...' }),
        ).not.toBeNull();
      });

      resolveSubmit!();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit' })).not.toBeNull();
      });
    });
  });

  describe('Bot Detection Blocking', () => {
    it('should not call onSubmit when behavioral bot detection triggers', async () => {
      const user = userEvent.setup();
      mockUseBotDetection.mockReturnValue({
        botScore: 100,
        detectionReasons: ['Suspicious behavior'],
        isBot: true,
        handleFieldFocus: rs.fn(),
        handleFormSubmit: rs.fn(() => ({
          score: 100,
          reasons: ['Suspicious behavior'],
        })),
        stats: {
          mouseMovements: 0,
          typingEvents: 0,
          focusEvents: 0,
          timeSpent: 100,
        },
      });

      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" />
        </BotProtectedForm>,
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should not call onSubmit when honeypot is triggered', async () => {
      const user = userEvent.setup();
      mockUseHoneypot.mockReturnValue({
        isBotDetected: true,
        HoneypotComponent: () => <div data-testid="honeypot" />,
      });

      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" />
        </BotProtectedForm>,
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should not disable submit button based on stale bot detection state', () => {
      // Button should remain enabled even if hook state shows isBot: true
      // This allows users to retry after fixing validation errors
      // Bot detection is checked fresh on each submission
      mockUseBotDetection.mockReturnValue({
        botScore: 100,
        detectionReasons: ['Suspicious behavior'],
        isBot: true,
        handleFieldFocus: rs.fn(),
        handleFormSubmit: rs.fn(),
        stats: {
          mouseMovements: 0,
          typingEvents: 0,
          focusEvents: 0,
          timeSpent: 100,
        },
      });

      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" />
        </BotProtectedForm>,
      );

      const button = screen.getByRole('button', {
        name: 'Submit',
      }) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe('onBotDetected callback', () => {
    it('should call onBotDetected when form detects a bot during submission', async () => {
      const user = userEvent.setup();
      const mockOnBotDetected = rs.fn();

      // Allow behavioral analysis to proceed, but make it detect a bot
      mockUseBotDetection.mockReturnValue({
        botScore: 0, // Not detected before form submit
        detectionReasons: [],
        isBot: false,
        handleFieldFocus: rs.fn(),
        handleFormSubmit: rs.fn(() => ({
          score: 80, // High score when submitted
          reasons: ['Too fast submission'],
        })),
        stats: {
          mouseMovements: 0,
          typingEvents: 0,
          focusEvents: 0,
          timeSpent: 100,
        },
      });

      render(
        <BotProtectedForm
          onSubmit={mockOnSubmit}
          onBotDetected={mockOnBotDetected}
        >
          <input name="email" />
        </BotProtectedForm>,
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(mockOnBotDetected).toHaveBeenCalledWith(
          expect.objectContaining({
            score: 80,
            isBot: true,
            reasons: expect.arrayContaining(['Too fast submission']),
          }),
        );
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Debug Panel', () => {
    it('should not render debug panel by default', () => {
      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" />
        </BotProtectedForm>,
      );

      expect(screen.queryByText('Bot Detection Debug')).toBeNull();
    });

    it('should render debug panel when showDebugPanel is true', async () => {
      render(
        <BotProtectedForm onSubmit={mockOnSubmit} showDebugPanel>
          <input name="email" />
        </BotProtectedForm>,
      );

      // Wait for useEffect to set isClient to true
      await waitFor(() => {
        expect(screen.getByText('Bot Detection Debug')).not.toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleError = rs
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockOnSubmit.mockRejectedValue(new Error('Network error'));

      render(
        <BotProtectedForm onSubmit={mockOnSubmit}>
          <input name="email" />
        </BotProtectedForm>,
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Form submission error:',
          expect.any(Error),
        );
      });

      // Button should be re-enabled after error
      await waitFor(() => {
        const button = screen.getByRole('button', {
          name: 'Submit',
        }) as HTMLButtonElement;
        expect(button.disabled).toBe(false);
      });

      consoleError.mockRestore();
    });
  });
});
