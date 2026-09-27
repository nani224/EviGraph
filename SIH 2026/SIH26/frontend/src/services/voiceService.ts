/**
 * Voice & Text-to-Speech (TTS) Service — SIH 2026 Criminal Network Intelligence System
 * Provides browser Web Speech API SpeechSynthesis integration with:
 * - Natural language sanitization (strips markdown, UI symbols, button artifacts)
 * - Playback state management (Play, Pause, Resume, Stop, Replay)
 * - Single-instance concurrency control (stops previous speech before starting new)
 * - Voice customization (speed, pitch, volume, voice selection)
 * - Robust error handling for unsupported browsers or interrupted speech
 */

export type PlaybackState = 'idle' | 'speaking' | 'paused' | 'finished' | 'error';

export interface VoiceSettings {
  rate: number;      // 0.8 to 1.5 (default 1.0)
  pitch: number;     // 0.8 to 1.2 (default 1.0)
  volume: number;    // 0.0 to 1.0 (default 1.0)
  voiceURI?: string; // Selected voice URI
}

type StateListener = (state: PlaybackState, messageId?: string) => void;
type ErrorListener = (errorMsg: string) => void;

class VoiceService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentText: string = '';
  private currentMessageId: string = '';
  private state: PlaybackState = 'idle';
  private settings: VoiceSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  private stateListeners: Set<StateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
      // Safety cleanup on navigation or window unload
      window.addEventListener('beforeunload', () => this.stop());
    }
  }

  /** Check if browser supports Web Speech API SpeechSynthesis */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  private loadVoices() {
    if (!this.isSupported()) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      this.availableVoices = voices;
      // If no custom voice set, pick a natural English voice
      if (!this.settings.voiceURI && voices.length > 0) {
        const preferred = voices.find(v => 
          (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('India')))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        
        if (preferred) {
          this.settings.voiceURI = preferred.voiceURI;
        }
      }
    } catch (e) {
      console.warn('[VoiceService] Failed to load voices:', e);
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && this.isSupported()) {
      this.loadVoices();
    }
    return this.availableVoices.filter(v => v.lang.startsWith('en'));
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public getCurrentMessageId(): string {
    return this.currentMessageId;
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state, this.currentMessageId);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public subscribeError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  private setState(newState: PlaybackState) {
    this.state = newState;
    this.stateListeners.forEach(l => l(this.state, this.currentMessageId));
  }

  private notifyError(msg: string) {
    this.setState('error');
    this.errorListeners.forEach(l => l(msg));
  }

  /**
   * Sanitizes raw markdown/AI text for natural spoken delivery.
   * - Strips Markdown headers, bold, bullet points, and code fences.
   * - Converts arrows (→, ->) to "connected to".
   * - Normalizes acronyms and statutory terms for clear voice comprehension.
   * - Strips UI artifacts (buttons like [ VIEW PATH ], timestamps, markdown tables).
   */
  public cleanTextForSpeech(rawText: string): string {
    if (!rawText) return '';

    let text = rawText;

    // 1. Remove UI Button patterns like [ VIEW PATH ], [ OPEN EVIDENCE ], [ INSPECT ]
    text = text.replace(/\[\s*(VIEW|OPEN|INSPECT|CHECK|DOWNLOAD|FIND|REPLAY|LISTEN|RUN|SHOW)[^\]]*\]/gi, '');

    // 2. Remove standard markdown links [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 3. Remove markdown headers (### Discovered Connection -> Discovered Connection)
    text = text.replace(/^#{1,6}\s+/gm, '');

    // 4. Remove bold & italics (**word** -> word, *word* -> word, _word_ -> word)
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');

    // 5. Remove code blocks and backticks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');

    // 6. Convert directional arrows to natural language
    text = text.replace(/\s*(?:→|->|-->|=>)\s*/g, ' connected to ');

    // 7. Remove bullet symbols and blockquotes
    text = text.replace(/^\s*[-*•]\s+/gm, '');
    text = text.replace(/^\s*>\s+/gm, '');

    // 8. Expand or normalize statutory & domain terms for audio clarity
    text = text.replace(/\bFIR\b/g, 'F I R');
    text = text.replace(/\bCDR\b/g, 'C D R');
    text = text.replace(/\bANPR\b/g, 'A N P R');
    text = text.replace(/\bCCTV\b/g, 'C C T V');
    text = text.replace(/\bKYC\b/g, 'K Y C');
    text = text.replace(/\bIPC\b/g, 'I P C');
    text = text.replace(/\bSec\.\s*(\d+)/gi, 'Section $1');
    text = text.replace(/₹\s*([\d,]+)/g, '$1 Rupees');
    text = text.replace(/\bINR\s*([\d,]+)/gi, '$1 Rupees');

    // 9. Remove decorative separators (---, ===, ***)
    text = text.replace(/^[-=*_]{3,}\s*$/gm, '');

    // 10. Clean multiple spaces and newlines into natural conversational sentences
    text = text.replace(/\n+/g, '. ');
    text = text.replace(/\s{2,}/g, ' ');
    text = text.replace(/\.{2,}/g, '.');
    text = text.replace(/\.\s*\./g, '.');

    return text.trim();
  }

  /**
   * Reads the provided AI response aloud using SpeechSynthesis.
   * Cancels any prior speech before starting.
   */
  public speak(rawText: string, messageId: string = 'default'): boolean {
    if (!this.isSupported()) {
      this.notifyError('Voice playback is unavailable in this browser. You can continue viewing the text answer.');
      return false;
    }

    if (!rawText || !rawText.trim()) {
      this.notifyError('No text available to read aloud.');
      return false;
    }

    // Stop any current speech
    this.stop();

    const spokenText = this.cleanTextForSpeech(rawText);
    if (!spokenText) {
      this.notifyError('No spoken content could be extracted.');
      return false;
    }

    this.currentText = rawText;
    this.currentMessageId = messageId;

    try {
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = this.settings.volume;

      // Match voice
      if (this.settings.voiceURI && this.availableVoices.length > 0) {
        const matchedVoice = this.availableVoices.find(v => v.voiceURI === this.settings.voiceURI);
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => {
        this.setState('speaking');
      };

      utterance.onpause = () => {
        this.setState('paused');
      };

      utterance.onresume = () => {
        this.setState('speaking');
      };

      utterance.onend = () => {
        this.setState('finished');
        this.currentUtterance = null;
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        // 'canceled' or 'interrupted' occurs when user clicks Stop or switches speech — not a fatal error
        if (event.error === 'canceled' || event.error === 'interrupted') {
          this.setState('idle');
          return;
        }
        console.warn('[VoiceService] SpeechSynthesis error:', event.error);
        this.notifyError('Voice playback was interrupted. You can continue viewing the text answer.');
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err: any) {
      console.error('[VoiceService] Speak exception:', err);
      this.notifyError('Voice playback is unavailable. You can continue viewing the text answer.');
      return false;
    }
  }

  /** Pause ongoing speech */
  public pause(): void {
    if (!this.isSupported()) return;
    try {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        this.setState('paused');
      }
    } catch (e) {
      console.warn('[VoiceService] Pause error:', e);
    }
  }

  /** Resume paused speech */
  public resume(): void {
    if (!this.isSupported()) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        this.setState('speaking');
      }
    } catch (e) {
      console.warn('[VoiceService] Resume error:', e);
    }
  }

  /** Stop speech synthesis completely */
  public stop(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[VoiceService] Stop error:', e);
    } finally {
      this.currentUtterance = null;
      this.setState('idle');
    }
  }

  /** Replay the current message */
  public replay(): void {
    if (this.currentText) {
      this.speak(this.currentText, this.currentMessageId);
    }
  }
}

export const voiceService = new VoiceService();
