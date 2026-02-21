# @tsdevstack/react-bot-detection

React hooks and components for client-side bot detection using behavioral analysis and honeypot fields.

## Features

- **Behavioral Analysis** - Tracks mouse movements, typing patterns, and form interactions
- **Honeypot Fields** - Hidden fields that bots typically fill out
- **Zero Dependencies** - Only requires React as a peer dependency
- **TypeScript** - Full type definitions included
- **SSR Safe** - Works with Next.js and other SSR frameworks

## Installation

```bash
npm install @tsdevstack/react-bot-detection
```

## Quick Start

The simplest way to add bot protection to your forms:

```tsx
import { BotProtectedForm } from '@tsdevstack/react-bot-detection';

function ContactForm() {
  const handleSubmit = async (formData: FormData, botResult) => {
    // botResult contains detection info you can send to your backend
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        message: formData.get('message'),
        botScore: botResult.score,
        isBot: botResult.isBot,
      }),
    });
  };

  return (
    <BotProtectedForm onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" />
      <textarea name="message" placeholder="Message" />
    </BotProtectedForm>
  );
}
```

## API Reference

### `<BotProtectedForm>`

A form wrapper that combines behavioral analysis and honeypot detection.

```tsx
import { BotProtectedForm } from '@tsdevstack/react-bot-detection';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Form content (inputs, labels, etc.) |
| `onSubmit` | `(data: FormData, result: BotDetectionResult) => Promise<void>` | required | Called on valid submission |
| `onBotDetected` | `(result: BotDetectionResult) => void` | - | Called when bot is detected |
| `submitButtonText` | `string` | `"Submit"` | Button text |
| `loadingButtonText` | `string` | `"Processing"` | Button text while submitting |
| `className` | `string` | - | CSS class for form element |
| `ButtonComponent` | `ComponentType<ButtonComponentProps>` | - | Custom button component |
| `showDebugPanel` | `boolean` | `false` | Show debug info (dev only) |

#### Custom Button Component

Integrate with your design system:

```tsx
import { BotProtectedForm } from '@tsdevstack/react-bot-detection';
import { Button } from '@/components/ui/button';

<BotProtectedForm
  onSubmit={handleSubmit}
  ButtonComponent={({ children, disabled, type }) => (
    <Button type={type} disabled={disabled}>
      {children}
    </Button>
  )}
>
  {/* form fields */}
</BotProtectedForm>
```

---

### `useBotDetection()`

Hook for behavioral analysis. Use this for custom form implementations.

```tsx
import { useBotDetection } from '@tsdevstack/react-bot-detection';
```

#### Returns

```ts
interface UseBotDetectionReturn {
  botScore: number;           // Current score (0-100+)
  detectionReasons: string[]; // Human-readable reasons
  isBot: boolean;             // true if score >= 50
  handleFieldFocus: () => void;  // Call on field focus
  handleFormSubmit: () => BotDetectionResult;  // Call before submit
  stats: BotDetectionStats;   // Raw statistics
}
```

#### Example

```tsx
import { useBotDetection } from '@tsdevstack/react-bot-detection';

function CustomForm() {
  const { handleFieldFocus, handleFormSubmit, isBot } = useBotDetection();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    const result = handleFormSubmit();
    if (result.isBot) {
      console.log('Bot detected:', result.reasons);
      return;
    }

    // Proceed with form submission
  };

  return (
    <form onSubmit={onSubmit}>
      <input onFocus={handleFieldFocus} name="email" />
      <button type="submit" disabled={isBot}>Submit</button>
    </form>
  );
}
```

---

### `useHoneypot()`

Hook for honeypot-based detection. Use alongside `useBotDetection` for custom forms.

```tsx
import { useHoneypot } from '@tsdevstack/react-bot-detection';
```

#### Returns

```ts
interface UseHoneypotReturn {
  isBotDetected: boolean;      // true if honeypot was filled
  botScore: number;            // Score contribution (50 if triggered)
  handleBotDetected: () => void;  // Manual trigger
  resetDetection: () => void;  // Reset state
  HoneypotComponent: () => ReactElement;  // Pre-configured component
}
```

#### Example

```tsx
import { useHoneypot, useBotDetection } from '@tsdevstack/react-bot-detection';

function CustomForm() {
  const { HoneypotComponent, isBotDetected } = useHoneypot();
  const { handleFormSubmit } = useBotDetection();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (isBotDetected) {
      return; // Silently reject
    }

    const result = handleFormSubmit();
    // Combine honeypot + behavioral results
  };

  return (
    <form onSubmit={onSubmit}>
      <HoneypotComponent />
      <input name="email" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

### `<Honeypot>`

Standalone honeypot component for full control.

```tsx
import { Honeypot } from '@tsdevstack/react-bot-detection';

<Honeypot onBotDetected={() => setIsBot(true)} />
```

---

## Types

### `BotDetectionResult`

```ts
interface BotDetectionResult {
  score: number;              // Combined score (0-100+)
  reasons: string[];          // Detection reasons
  isBot: boolean;             // true if score >= 50
  stats: BotDetectionStats;   // Raw statistics
  honeypotTriggered: boolean; // true if honeypot filled
}
```

### `BotDetectionStats`

```ts
interface BotDetectionStats {
  mouseMovements: number;  // Mouse events tracked
  typingEvents: number;    // Keystrokes tracked
  focusEvents: number;     // Focus events tracked
  timeSpent: number;       // Time on form (ms)
}
```

### `ButtonComponentProps`

```ts
interface ButtonComponentProps {
  type: 'submit';
  disabled: boolean;
  className?: string;
  children: React.ReactNode;
}
```

---

## How Detection Works

### Behavioral Analysis

The `useBotDetection` hook tracks:

| Signal | Score | Description |
|--------|-------|-------------|
| No mouse movement | +30 | Bots often don't move the mouse |
| Unnatural mouse patterns | +20 | Perfectly straight lines, no variation |
| Consistent typing speed | +15 | Humans have variable typing rhythm |
| Superhuman typing | +20 | < 50ms between keystrokes |
| Fast form completion | +40 | < 2 seconds total time |
| Few focus events | +15 | < 2 field interactions |
| WebDriver detected | +25 | `navigator.webdriver === true` |
| Headless browser | +35 | Window size is 0 |

**Threshold:** Score >= 50 is considered a bot.

### Honeypot Detection

Hidden fields styled to be invisible to humans but visible to bots that parse HTML. When filled, adds +100 to score.

---

## Best Practices

### 1. Always Validate Server-Side

Client-side detection can be bypassed. Always validate the `botScore` on your backend:

```ts
// API route
export async function POST(req: Request) {
  const { botScore, isBot, ...formData } = await req.json();

  if (isBot || botScore >= 50) {
    // Log for analysis, but don't reveal detection
    return new Response('OK', { status: 200 });
  }

  // Process legitimate submission
}
```

### 2. Don't Block Immediately

Silently accept bot submissions but don't process them. This prevents bots from learning your detection methods.

### 3. Use Debug Panel in Development

```tsx
<BotProtectedForm onSubmit={handleSubmit} showDebugPanel={process.env.NODE_ENV === 'development'}>
```

### 4. Combine with Rate Limiting

Bot detection is one layer. Also implement:
- Rate limiting per IP
- CAPTCHA for suspicious scores (30-49)
- Email verification for signups

---

## License

MIT