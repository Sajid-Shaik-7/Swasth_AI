// Ultra-Smooth Voice Engine: Web Speech STT & TTS in Telugu (te-IN) and English (en-IN)
// Optimized for zero lag, seamless utterance chaining, and robust cancellation.

class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isListening = false;
    this.isSpeaking = false;
    this.selectedVoice = null;
    this.voicesLoaded = false;
    this.activeSessionId = 0;
    this._speechId = 0;

    this.initVoices();
  }

  initVoices() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      try {
        const voices = this.synthesis.getVoices() || [];
        if (voices.length > 0) {
          this.voicesLoaded = true;
        }
      } catch (e) {
        console.warn('Voice initialization notice:', e);
      }
    };

    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  getBestVoice(lang) {
    if (!this.synthesis) return null;
    const voices = this.synthesis.getVoices() || [];
    if (voices.length === 0) return null;

    const isTelugu = lang === 'te' || lang === 'te-IN' || lang.startsWith('te');

    if (isTelugu) {
      // 1. Direct Telugu voice
      const teluguVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase().includes('te-in') || v.lang.toLowerCase().includes('te_in') || v.lang.toLowerCase() === 'te')) ||
        (v.name && v.name.toLowerCase().includes('telugu'))
      );
      if (teluguVoice) return teluguVoice;

      // 2. Indian voices that handle Telugu script decently (Hindi / Indian English)
      const indianVoice = voices.find(v => 
        (v.lang && (v.lang.includes('IN') || v.lang.includes('hi') || v.lang.includes('ta') || v.lang.includes('kn'))) ||
        (v.name && (v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('mohan') || v.name.toLowerCase().includes('ravi') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('shweta') || v.name.toLowerCase().includes('neerja')))
      );
      if (indianVoice) return indianVoice;
    } else {
      // English (India)
      const enInVoice = voices.find(v => 
        v.lang && (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in'))
      );
      if (enInVoice) return enInVoice;

      const anyEnVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      if (anyEnVoice) return anyEnVoice;
    }

    return voices[0] || null;
  }

  // Sanitize text for crisp, lag-free speech synthesis
  cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/[*_~`#>\\[\](){}]/g, '') // remove markdown
      .replace(/https?:\/\/\S+/g, '') // remove links
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // remove emojis
      .replace(/\s+/g, ' ')
      .trim();
  }

  startListening({ lang = 'te-IN', onResult, onError, onEnd }) {
    this.stopSpeaking(); // Immediately stop active speech

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return false;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {}
        this.recognition = null;
      }

      this.activeSessionId += 1;
      const currentSession = this.activeSessionId;

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = lang === 'te' ? 'te-IN' : (lang === 'en' ? 'en-IN' : lang);

      rec.onresult = (event) => {
        if (currentSession !== this.activeSessionId) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (onResult) {
          onResult({
            final: finalTranscript.trim(),
            interim: interimTranscript.trim(),
            text: (finalTranscript || interimTranscript).trim()
          });
        }
      };

      rec.onerror = (event) => {
        if (currentSession !== this.activeSessionId) return;
        this.isListening = false;
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          if (onError) onError(event.error);
        }
      };

      rec.onend = () => {
        if (currentSession === this.activeSessionId) {
          this.isListening = false;
          if (onEnd) onEnd();
        }
      };

      rec.start();
      this.recognition = rec;
      this.isListening = true;
      return true;
    } catch (e) {
      this.isListening = false;
      if (onError) onError(e.message);
      return false;
    }
  }

  stopListening() {
    this.activeSessionId += 1;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  speak({ text, lang = 'te-IN', onStart, onEnd, onError, rate = 0.96, pitch = 1.0 }) {
    if (!this.synthesis) {
      if (onError) onError('Speech synthesis is not supported.');
      return;
    }

    try {
      this.stopSpeaking();
      const cleaned = this.cleanTextForSpeech(text);
      if (!cleaned) {
        if (onEnd) onEnd();
        return;
      }

      this._speechId += 1;
      const currentSpeechId = this._speechId;
      const resolvedLang = (lang === 'te' || lang === 'te-IN') ? 'te-IN' : 'en-IN';

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = resolvedLang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voice = this.getBestVoice(resolvedLang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (currentSpeechId !== this._speechId) return;
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        if (currentSpeechId !== this._speechId) return;
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      utterance.onerror = (err) => {
        if (currentSpeechId !== this._speechId) return;
        this.isSpeaking = false;
        // Ignore normal intentional cancellations
        if (err.error !== 'canceled' && err.error !== 'interrupted') {
          if (onError) onError(err);
        } else {
          if (onEnd) onEnd();
        }
      };

      this.isSpeaking = true;
      
      // Ensure synthesis state is clean in Chrome
      if (this.synthesis.paused) {
        this.synthesis.resume();
      }

      this.synthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis exception:', err);
      this.isSpeaking = false;
      if (onError) onError(err);
    }
  }

  stopSpeaking() {
    this._speechId += 1;
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
    }
    this.isSpeaking = false;
  }
}

export const voiceEngine = new VoiceEngine();
