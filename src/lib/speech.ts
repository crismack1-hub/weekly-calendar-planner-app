/**
 * Web Speech API wrapper. Falls back to "unsupported" reporting on browsers
 * that don't ship a recognition implementation (e.g. Firefox).
 *
 * Behavior:
 *   • emits interim transcripts while you speak (so the modal can show live text)
 *   • emits a final transcript when recognition decides you've stopped
 *   • calls onEnd whether stopped manually or via timeout/silence
 *
 * Browsers expose this under two names — `SpeechRecognition` (standard) and
 * `webkitSpeechRecognition` (Safari, older Chrome). We pick whichever exists.
 */
type AnyWindow = Window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as AnyWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface SpeechSession {
  /** Stop listening and run onEnd. Safe to call multiple times. */
  stop: () => void;
  /** Abort immediately without firing the final-transcript handler. */
  abort: () => void;
}

export interface SpeechHandlers {
  /** Called repeatedly with the running transcript. */
  onInterim?: (transcript: string) => void;
  /** Called once when recognition finalizes. May fire before onEnd. */
  onFinal?: (transcript: string) => void;
  /** Called when the session ends for any reason. */
  onEnd?: () => void;
  /** Called on errors (no permission, no microphone, network, etc.). */
  onError?: (message: string) => void;
}

export function startSpeechSession(handlers: SpeechHandlers): SpeechSession {
  const w = window as AnyWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    handlers.onError?.('Speech recognition is not supported in this browser.');
    handlers.onEnd?.();
    return { stop: () => {}, abort: () => {} };
  }

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || 'en-US';

  let stopped = false;
  let finalText = '';
  let interimText = '';

  rec.onresult = (event: any) => {
    interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? '';
      if (result.isFinal) finalText += (finalText ? ' ' : '') + text.trim();
      else interimText += text;
    }
    const composite = (finalText + ' ' + interimText).trim();
    handlers.onInterim?.(composite);
  };

  rec.onerror = (event: any) => {
    if (stopped) return;
    const msg = event?.error
      ? humanizeError(event.error)
      : 'Speech recognition error.';
    handlers.onError?.(msg);
  };

  rec.onend = () => {
    if (stopped) return;
    stopped = true;
    const composite = (finalText + ' ' + interimText).trim();
    if (composite) handlers.onFinal?.(composite);
    handlers.onEnd?.();
  };

  try {
    rec.start();
  } catch (e) {
    handlers.onError?.((e as Error).message);
    handlers.onEnd?.();
    return { stop: () => {}, abort: () => {} };
  }

  return {
    stop: () => {
      if (stopped) return;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
    abort: () => {
      if (stopped) return;
      stopped = true;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      handlers.onEnd?.();
    },
  };
}

function humanizeError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Allow it in your browser settings.';
    case 'no-speech':
      return "Didn't catch anything. Try again.";
    case 'audio-capture':
      return 'No microphone detected.';
    case 'network':
      return 'Network error during recognition.';
    case 'aborted':
      return 'Recording cancelled.';
    default:
      return `Speech error: ${code}`;
  }
}
