// Voice Engine: Web Speech STT & TTS in Telugu (te-IN) and English (en-IN)

class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isListening = false;
    this.isSpeaking = false;
    this.selectedVoice = null;
    this.voicesLoaded = false;
    this.activeSessionId = 0;

    this.initVoices();
  }

  initVoices() {
    if (!this.synthesis) return;

    const updateVoices = () => {
      try {
        const voices = this.synthesis.getVoices();
        const teluguVoice = voices.find(v => v.lang.includes('te') || v.name.toLowerCase().includes('telugu'));
        const indianVoice = voices.find(v => v.lang.includes('en-IN') || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('hindi'));
        
        this.selectedVoice = teluguVoice || indianVoice || voices[0] || null;
        this.voicesLoaded = true;
      } catch (e) {
        console.warn('Voice loading warning:', e);
      }
    };

    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = updateVoices;
    }
    updateVoices();
  }

  startListening({ lang = 'te-IN', onResult, onError, onEnd }) {
    this.stopSpeaking(); // Stop any active speech before listening

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return false;
    }

    try {
      // Abort existing instance cleanly
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
        // Ignore "aborted" errors from user canceling
        if (event.error !== 'aborted') {
          console.warn('Speech recognition status:', event.error);
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
      console.warn('Speech recognition start safe catch:', e);
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

  speak({ text, lang = 'te-IN', onStart, onEnd, onError, rate = 0.88, pitch = 1.0 }) {
    if (!this.synthesis) {
      if (onError) onError('Speech synthesis is not supported.');
      return;
    }

    try {
      this.stopSpeaking();
      if (!text || text.trim().length === 0) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'te' ? 'te-IN' : (lang === 'en' ? 'en-IN' : lang);
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voices = this.synthesis.getVoices();
      const teluguVoice = voices.find(v => v.lang.includes('te') || v.name.toLowerCase().includes('telugu'));
      if (teluguVoice && (lang === 'te' || lang === 'te-IN')) {
        utterance.voice = teluguVoice;
      } else if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      utterance.onerror = (err) => {
        this.isSpeaking = false;
        if (onError) onError(err);
      };

      this.synthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis exception:', err);
      this.isSpeaking = false;
      if (onError) onError(err);
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
      this.isSpeaking = false;
    }
  }
}

export const voiceEngine = new VoiceEngine();
