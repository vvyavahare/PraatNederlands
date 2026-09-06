// Browser SpeechRecognition interface augmentation
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class DutchSpeechService {
  private recognition: any = null;
  private isListening = false;
  private userWantsRecording = false;

  // Finalized text from previous sessions (if restarted)
  private previousSessionsText = '';
  // Finalized text from the CURRENT recognition session
  private currentSessionFinal = '';
  // Current interim (in-progress) text from the CURRENT recognition session
  private currentSessionInterim = '';

  private synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private restartTimeout: any = null;
  private onTranscriptCallback: ((fullLiveTranscript: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindow;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.lang = 'nl-NL'; // Netherlands Dutch
          this.recognition.continuous = true; // Continuous listening
          this.recognition.interimResults = true; // Real-time feedback
          this.recognition.maxAlternatives = 1;
        } catch (e) {
          console.warn('SpeechRecognition init error:', e);
        }
      }

      this.initVoice();
      if (this.synth && this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer Dutch voices: nl-NL, nl-BE
    const dutchVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('nl') ||
        v.name.toLowerCase().includes('dutch') ||
        v.name.toLowerCase().includes('nederlands')
    );
    this.selectedVoice = dutchVoice || null;
  }

  public isSpeechSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Deduplicate immediate consecutive repeated words caused by SpeechRecognition artifacts
   */
  public cleanConsecutiveDuplicates(text: string): string {
    if (!text) return '';
    const words = text.trim().replace(/\s+/g, ' ').split(' ');
    const deduped: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const current = words[i];
      const prev = deduped[deduped.length - 1];
      // Compare words without punctuation
      const currentClean = current.toLowerCase().replace(/[.,!?;:]/g, '');
      const prevClean = prev ? prev.toLowerCase().replace(/[.,!?;:]/g, '') : '';
      if (prev && currentClean && currentClean === prevClean) {
        continue;
      }
      deduped.push(current);
    }
    return deduped.join(' ');
  }

  /**
   * Seamlessly merge previous text with newly recognized text, preventing overlap
   */
  private mergeTranscripts(prev: string, next: string): string {
    const p = prev.trim();
    const n = next.trim();
    if (!p) return n;
    if (!n) return p;

    // If next is already identical to prev, return prev
    if (p.toLowerCase() === n.toLowerCase()) {
      return p;
    }

    // Check if next is entirely contained at the end of prev
    if (p.toLowerCase().endsWith(n.toLowerCase())) {
      return p;
    }

    // Check for word-level overlap at the boundary (up to 4 words)
    const pWords = p.split(/\s+/);
    const nWords = n.split(/\s+/);
    const maxOverlap = Math.min(pWords.length, nWords.length, 4);

    for (let len = maxOverlap; len > 0; len--) {
      const pSlice = pWords.slice(pWords.length - len).map(w => w.toLowerCase()).join(' ');
      const nSlice = nWords.slice(0, len).map(w => w.toLowerCase()).join(' ');
      if (pSlice === nSlice) {
        return `${pWords.join(' ')} ${nWords.slice(len).join(' ')}`.trim();
      }
    }

    return `${p} ${n}`.trim();
  }

  /**
   * Compose the current total transcript from previous sessions and current session
   */
  public composeCurrentTranscript(): string {
    const currentCombined = `${this.currentSessionFinal} ${this.currentSessionInterim}`.trim();
    const merged = this.mergeTranscripts(this.previousSessionsText, currentCombined);
    return this.cleanConsecutiveDuplicates(merged);
  }

  public getCurrentTranscript(): string {
    return this.composeCurrentTranscript();
  }

  /**
   * Start manual recording:
   * Continues listening without stopping on pauses until the user explicitly stops.
   */
  public startListening(
    onTranscriptUpdate: (fullLiveTranscript: string) => void,
    onError: (errorMsg: string) => void,
    onEnded: (finalTranscript: string) => void
  ): boolean {
    if (!this.recognition) {
      onError('Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Chrome, Edge of typ uw bericht.');
      return false;
    }

    // Reset all session accumulators for a new user recording
    this.previousSessionsText = '';
    this.currentSessionFinal = '';
    this.currentSessionInterim = '';
    this.userWantsRecording = true;
    this.onTranscriptCallback = onTranscriptUpdate;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.recognition.onresult = (event: any) => {
      let sessionFinal = '';
      let sessionInterim = '';

      // CRITICAL FIX: In Web Speech API with continuous: true, event.results contains
      // ALL results for the current session. NEVER accumulate incrementally with += on each event!
      // Re-read event.results from 0 to length - 1 deterministically.
      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item && item[0]) {
          if (item.isFinal) {
            sessionFinal += item[0].transcript + ' ';
          } else {
            sessionInterim += item[0].transcript;
          }
        }
      }

      this.currentSessionFinal = sessionFinal.trim();
      this.currentSessionInterim = sessionInterim.trim();

      const total = this.composeCurrentTranscript();
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(total);
      }
    };

    this.recognition.onerror = (event: any) => {
      // If the browser reports 'no-speech', do NOT stop recording!
      // The user is just thinking or taking a breath in Dutch.
      if (event.error === 'no-speech') {
        return;
      }

      if (event.error === 'not-allowed') {
        this.userWantsRecording = false;
        this.isListening = false;
        onError('Microfoontoegang geweigerd. Geef microfoontoestemming in de browserbalk.');
        return;
      }

      if (event.error === 'audio-capture') {
        this.userWantsRecording = false;
        this.isListening = false;
        onError('Geen microfoon gevonden. Controleer uw audio-instellingen.');
        return;
      }

      console.warn('SpeechRecognition error:', event.error);
    };

    this.recognition.onend = () => {
      // If the user is still in recording mode, automatically restart!
      // This solves the problem where Chrome stops recording after random pauses.
      if (this.userWantsRecording) {
        // Commit whatever was final in this session to previousSessionsText
        if (this.currentSessionFinal) {
          this.previousSessionsText = this.mergeTranscripts(
            this.previousSessionsText,
            this.currentSessionFinal
          );
          this.currentSessionFinal = '';
          this.currentSessionInterim = '';
        }

        this.restartTimeout = setTimeout(() => {
          if (this.userWantsRecording) {
            try {
              this.recognition.start();
            } catch (err) {
              console.warn('Could not auto-restart recognition:', err);
            }
          }
        }, 150);
        return;
      }

      this.isListening = false;
      const finalResult = this.composeCurrentTranscript();
      onEnded(finalResult);
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        this.isListening = true;
        return true;
      }
      this.isListening = false;
      this.userWantsRecording = false;
      onError('Kan microfoon niet starten. Probeer opnieuw.');
      return false;
    }
  }

  /**
   * Stop manual recording:
   * Called only when the user clicks the Stop button or submits.
   */
  public stopListening(): string {
    this.userWantsRecording = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    const finalResult = this.composeCurrentTranscript();

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }

    // Reset session accumulators
    this.previousSessionsText = '';
    this.currentSessionFinal = '';
    this.currentSessionInterim = '';
    this.onTranscriptCallback = null;

    return finalResult;
  }

  public cancelListening() {
    this.userWantsRecording = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.previousSessionsText = '';
    this.currentSessionFinal = '';
    this.currentSessionInterim = '';
    this.onTranscriptCallback = null;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.isListening = false;
  }

  public speakDutch(text: string, rate: number = 0.95, onEnd?: () => void) {
    if (!this.synth) return;

    this.synth.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = rate; // Slightly slower for language learners
    utterance.pitch = 1.0;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = () => onEnd();
    }

    this.synth.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const dutchSpeech = new DutchSpeechService();
