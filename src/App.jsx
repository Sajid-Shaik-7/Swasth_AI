import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { voiceEngine } from './services/voiceEngine';
import { aiTriageService } from './services/aiTriageService';
import { URGENCY_CLASSES } from './data/triageKnowledgeCards';
import confetti from 'canvas-confetti';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  PhoneCall, 
  Check, 
  ChevronLeft, 
  Mic, 
  MicOff, 
  Keyboard, 
  PlusCircle, 
  Sparkles,
  RefreshCw,
  Home,
  CheckCircle2,
  Radio,
  Send,
  Share2,
  ClipboardCheck,
  Activity,
  User,
  MapPin,
  HeartPulse
} from 'lucide-react';

const QUICK_PATIENT_SYMPTOMS = [
  { en: 'Fever & headache', te: 'జ్వరం, తలనొప్పి' },
  { en: 'Severe cough & cold', te: 'దగ్గు, జలుబు' },
  { en: 'Stomach pain & loose motions', te: 'కడుపునొప్పి, విరేచనాలు' },
  { en: 'Migraine / Head pain', te: 'తీవ్ర తలనొప్పి' },
  { en: 'Heavy chest pain & left arm pain', te: 'తీవ్రమైన ఛాతీ నొప్పి (Emergency)' }
];

const ASHA_COMMON_CONDITIONS = [
  { id: 'fever', icon: '🌡️', en: 'Fever / Chills', te: 'జ్వరం / చలి' },
  { id: 'cough', icon: '🫁', en: 'Cough & Breathless', te: 'దగ్గు & ఆయాసం' },
  { id: 'diarrhea', icon: '🤢', en: 'Vomiting / Diarrhea', te: 'వాంతులు / విరేచనాలు' },
  { id: 'maternal', icon: '🤰', en: 'Pregnancy Discomfort', te: 'గర్భిణీ సమస్యలు' },
  { id: 'child', icon: '👶', en: 'Child / Infant Fever', te: 'పిల్లల ఆరోగ్యం' },
  { id: 'bp', icon: '🩸', en: 'High BP / Dizziness', te: 'బీపీ / కళ్లు తిరగడం' },
  { id: 'chest', icon: '💔', en: 'Chest Pain (Alert)', te: 'ఛాతీ నొప్పి (అత్యవసరం)' },
  { id: 'headache', icon: '🤕', en: 'Severe Headache', te: 'తీవ్ర తలనొప్పి' },
  { id: 'injury', icon: '🩹', en: 'Wound / Insect Bite', te: 'గాయం / కీటకం కాటు' }
];

const ASHA_KEY_OBSERVATIONS = [
  { id: 'high_fever', en: 'High Fever (>101°F)', te: 'అధిక జ్వరం (>101°F)' },
  { id: 'fast_breath', en: 'Fast Breathing / Gasps', te: 'వేగంగా శ్వాస' },
  { id: 'dehydration', en: 'Severe Weakness / Thirst', te: 'తీవ్ర నీరసం / దాహం' },
  { id: 'cannot_drink', en: 'Unable to drink liquids', te: 'నీళ్లు తాగలేకపోతున్నారు' },
  { id: 'swelling', en: 'Leg / Face Swelling', te: 'కాళ్లు / ముఖం వాపు' }
];

export default function App() {
  // Navigation & Language
  const [lang, setLang] = useState('te'); // 'te' (Telugu) or 'en' (English)
  const [currentScreen, setCurrentScreen] = useState('lang'); // 'lang', 'role', 'input_choice', 'patient_input', 'asha_input', 'followup', 'chat', 'result'
  const [userRole, setUserRole] = useState('patient'); // 'patient' or 'asha'
  const [autoVoiceMode, setAutoVoiceMode] = useState(false); // Seamless Hands-free Voice AI mode
  
  // ASHA Metadata
  const [patientName, setPatientName] = useState('');
  const [patientVillage, setPatientVillage] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientCategory, setPatientCategory] = useState('adult'); // 'adult', 'child', 'pregnant', 'elderly'
  const [selectedVitals, setSelectedVitals] = useState([]);
  
  // Symptom Description State
  const [symptomText, setSymptomText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  // Follow-up Question Flow (Offline MCQ fallback)
  const [matchedCard, setMatchedCard] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOptionTemp, setSelectedOptionTemp] = useState(null);
  const [isFollowupListening, setIsFollowupListening] = useState(false);
  const [followupSpokenText, setFollowupSpokenText] = useState('');
  
  // Gemini Chat State
  const [chatMessages, setChatMessages] = useState([]); // { role: 'ai'|'user', textEn, textTe?, options: [], text }
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatError, setChatError] = useState('');
  const [isChatListening, setIsChatListening] = useState(false);
  const [geminiHistory, setGeminiHistory] = useState([]);
  const [copiedRecord, setCopiedRecord] = useState(false);
  const chatEndRef = useRef(null);
  
  // Triage Outcome State
  const [triageResult, setTriageResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  // References for reliable callbacks
  const questionsListRef = useRef(questionsList);
  questionsListRef.current = questionsList;
  const currentQIndexRef = useRef(currentQuestionIndex);
  currentQIndexRef.current = currentQuestionIndex;
  const autoVoiceModeRef = useRef(autoVoiceMode);
  autoVoiceModeRef.current = autoVoiceMode;
  const langRef = useRef(lang);
  langRef.current = lang;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiTyping]);

  // Auto Voice Agent Lifecycle
  useEffect(() => {
    if (currentScreen === 'patient_input' && autoVoiceMode) {
      const welcomePrompt = lang === 'te' 
        ? 'మీకు ఏమి ఇబ్బందిగా ఉందో స్పష్టంగా చెప్పండి.' 
        : 'Please tell us what health problem you are experiencing.';
      
      voiceEngine.speak({
        text: welcomePrompt,
        lang: lang === 'te' ? 'te-IN' : 'en-IN',
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => {
          setIsPlayingAudio(false);
          setTimeout(() => {
            handleStartListeningAuto();
          }, 250);
        },
        onError: () => setIsPlayingAudio(false)
      });
    } else if (currentScreen === 'followup' && questionsList.length > 0) {
      const q = questionsList[currentQuestionIndex];
      if (q) {
        const questionPrompt = lang === 'te' ? q.qTe : q.qEn;
        voiceEngine.speak({
          text: questionPrompt,
          lang: lang === 'te' ? 'te-IN' : 'en-IN',
          onStart: () => setIsPlayingAudio(true),
          onEnd: () => {
            setIsPlayingAudio(false);
            if (autoVoiceModeRef.current) {
              setTimeout(() => {
                handleStartFollowupListeningAuto();
              }, 250);
            }
          },
          onError: () => setIsPlayingAudio(false)
        });
      }
    } else if (currentScreen === 'result' && triageResult) {
      const resultPrompt = lang === 'te' ? triageResult.spokenTe : triageResult.spokenEn;
      handlePlayVoice(resultPrompt);
      if (triageResult.urgency.key === 'ROUTINE_LOW') {
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        } catch (e) {}
      }
    }
  }, [currentScreen, currentQuestionIndex]);

  // Clean up audio on screen transitions
  useEffect(() => {
    return () => {
      voiceEngine.stopListening();
      voiceEngine.stopSpeaking();
    };
  }, [currentScreen]);

  // Language Toggle
  const toggleLanguage = () => {
    const nextLang = lang === 'te' ? 'en' : 'te';
    setLang(nextLang);
    voiceEngine.stopSpeaking();
  };

  // Automatic & Manual Voice Recognition for Initial Symptom
  const handleStartListeningAuto = () => {
    setInterimText('');
    const started = voiceEngine.startListening({
      lang: langRef.current === 'te' ? 'te-IN' : 'en-IN',
      onResult: ({ final, interim, text }) => {
        setInterimText(interim);
        if (final || text) {
          setSymptomText(text || final);
        }
      },
      onError: (err) => {
        console.warn('STT Status:', err);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
    setIsListening(started);
  };

  const handleToggleListening = () => {
    if (isListening) {
      voiceEngine.stopListening();
      setIsListening(false);
    } else {
      handleStartListeningAuto();
    }
  };

  // Automatic & Manual Voice Recognition for Follow-up Question Answer (Offline MCQ)
  const handleStartFollowupListeningAuto = () => {
    setFollowupSpokenText('');
    const qList = questionsListRef.current;
    const qIdx = currentQIndexRef.current;
    const currentQ = qList[qIdx];
    if (!currentQ) return;

    const started = voiceEngine.startListening({
      lang: langRef.current === 'te' ? 'te-IN' : 'en-IN',
      onResult: ({ final, interim, text }) => {
        const spoken = (final || interim || text).trim();
        setFollowupSpokenText(spoken);

        if (final || text) {
          const spokenLower = (final || text).toLowerCase();
          let matched = null;
          for (const opt of currentQ.options) {
            const enMatch = spokenLower.includes(opt.en.toLowerCase()) || spokenLower.includes(opt.value);
            const teWords = opt.te.split(' ');
            const teMatch = teWords.some(w => spokenLower.includes(w)) || spokenLower.includes(opt.te);
            if (enMatch || teMatch) {
              matched = opt;
              break;
            }
          }

          if (matched) {
            handleSelectAnswer(currentQ.id, matched.value, matched);
          }
        }
      },
      onEnd: () => setIsFollowupListening(false),
      onError: () => setIsFollowupListening(false)
    });
    setIsFollowupListening(started);
  };

  const handleToggleFollowupListening = () => {
    if (isFollowupListening) {
      voiceEngine.stopListening();
      setIsFollowupListening(false);
    } else {
      handleStartFollowupListeningAuto();
    }
  };

  // Spoken audio handler
  const handlePlayVoice = (text) => {
    if (!text) return;
    voiceEngine.stopSpeaking();
    setIsPlayingAudio(true);
    voiceEngine.speak({
      text: text,
      lang: lang === 'te' ? 'te-IN' : 'en-IN',
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => {
        setIsPlayingAudio(false);
        setPlayCount(prev => prev + 1);
      },
      onError: () => setIsPlayingAudio(false)
    });
  };

  const handleStopVoice = () => {
    voiceEngine.stopSpeaking();
    setIsPlayingAudio(false);
  };

  // Toggle ASHA vitals tag
  const handleToggleVital = (vitalId) => {
    setSelectedVitals(prev => 
      prev.includes(vitalId) ? prev.filter(id => id !== vitalId) : [...prev, vitalId]
    );
  };

  // ─── Submit Initial Symptom -> Route to Chat or MCQ ───
  const handleAnalyzeSymptom = async () => {
    if (!symptomText.trim()) return;
    voiceEngine.stopListening();
    voiceEngine.stopSpeaking();
    setIsListening(false);

    // Build comprehensive symptom payload including vitals if ASHA mode
    let fullSymptomDescription = symptomText.trim();
    if (userRole === 'asha') {
      const vitalsText = selectedVitals.map(vId => {
        const item = ASHA_KEY_OBSERVATIONS.find(v => v.id === vId);
        return item ? item.en : vId;
      }).join(', ');
      
      if (vitalsText) {
        fullSymptomDescription += ` | Observations: ${vitalsText}`;
      }
      if (patientCategory !== 'adult') {
        fullSymptomDescription += ` | Category: ${patientCategory}`;
      }
    }

    // 1. Check for immediate emergency triggers (offline instant check)
    const emergencyCheck = aiTriageService.checkImmediateEmergency(fullSymptomDescription);
    if (emergencyCheck) {
      const emergencyResult = {
        urgency: URGENCY_CLASSES.EMERGENCY,
        matchedConditionEn: emergencyCheck.category,
        matchedConditionTe: emergencyCheck.whyTe,
        adviceEn: emergencyCheck.adviceEn,
        adviceTe: emergencyCheck.adviceTe,
        spokenEn: emergencyCheck.adviceEn,
        spokenTe: emergencyCheck.adviceTe,
        precautionsEn: 'Call 108 emergency immediately. Sit upright, do not exert yourself.',
        precautionsTe: 'వెంటనే 108కి కాల్ చేయండి. నిటారుగా కూర్చోండి, శ్రమ పడవద్దు.',
        avoidEn: 'Do not delay, do not drive yourself.',
        avoidTe: 'ఆలస్యం చేయవద్దు, స్వయంగా డ్రైవింగ్ చేయవద్దు.',
        ashaActionEn: emergencyCheck.ashaActionEn,
        ashaActionTe: emergencyCheck.ashaActionTe
      };
      setTriageResult(emergencyResult);
      setPlayCount(0);
      setCurrentScreen('result');
      return;
    }

    // 2. Start Gemini Chat
    if (aiTriageService.hasApiKey()) {
      setChatMessages([]);
      setGeminiHistory([]);
      setChatInput('');
      setChatError('');
      setIsChatListening(false);
      setIsAiTyping(true);
      setCurrentScreen('chat');

      const patientContext = {
        userRole,
        patientName,
        patientVillage,
        patientAge,
        patientCategory,
        vitals: selectedVitals.join(', ')
      };

      try {
        const response = await aiTriageService.chatWithGemini([], fullSymptomDescription, patientContext);
        
        if (response.done) {
          setTriageResult(response);
          setPlayCount(0);
          setCurrentScreen('result');
          return;
        }

        // Add AI's first question with quick response options
        const aiMsg = {
          role: 'ai',
          textEn: response.questionEn,
          textTe: response.questionTe,
          options: response.options || [],
          text: response.rawResponse
        };
        setChatMessages([aiMsg]);
        setGeminiHistory([{ role: 'ai', text: response.rawResponse }]);
        setIsAiTyping(false);

        // Crisp audio playback
        if (autoVoiceMode) {
          const speakText = lang === 'te' ? response.questionTe : response.questionEn;
          voiceEngine.speak({
            text: speakText,
            lang: lang === 'te' ? 'te-IN' : 'en-IN',
            onStart: () => setIsPlayingAudio(true),
            onEnd: () => {
              setIsPlayingAudio(false);
              setTimeout(() => handleStartChatListening(), 250);
            },
            onError: () => setIsPlayingAudio(false)
          });
        }
      } catch (err) {
        console.error('Gemini init error:', err);
        setChatError(lang === 'te' 
          ? 'AI సర్వర్‌తో కనెక్ట్ కాలేదు. ఆఫ్‌లైన్ మోడ్‌కు మారుతోంది...' 
          : 'Could not connect to AI. Switching to offline mode...');
        setIsAiTyping(false);
        setTimeout(() => {
          fallbackToOfflineMCQ();
        }, 1500);
      }
    } else {
      fallbackToOfflineMCQ();
    }
  };

  const fallbackToOfflineMCQ = () => {
    const followUpData = aiTriageService.getFollowUpQuestions(symptomText);
    setMatchedCard(followUpData.matchedCard);
    setQuestionsList(followUpData.questions || []);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptionTemp(null);
    setFollowupSpokenText('');
    setCurrentScreen('followup');
  };

  // ─── CHAT: Send user message to Gemini ───
  const handleSendChatMessage = async (messageText) => {
    const text = (messageText || chatInput).trim();
    if (!text || isAiTyping) return;

    voiceEngine.stopSpeaking();
    voiceEngine.stopListening();
    setIsChatListening(false);

    // Add user message
    const userMsg = { role: 'user', text };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatError('');

    // Build history for API
    const updatedHistory = [...geminiHistory, { role: 'user', text }];
    setGeminiHistory(updatedHistory);
    setIsAiTyping(true);

    const patientContext = {
      userRole,
      patientName,
      patientVillage,
      patientAge,
      patientCategory
    };

    try {
      const response = await aiTriageService.chatWithGemini(updatedHistory, symptomText, patientContext);

      if (response.done) {
        const aiMsg = {
          role: 'ai',
          textEn: response.adviceEn,
          textTe: response.adviceTe,
          text: JSON.stringify(response),
          isFinal: true
        };
        setChatMessages(prev => [...prev, aiMsg]);
        setIsAiTyping(false);

        setTimeout(() => {
          setTriageResult(response);
          setPlayCount(0);
          setCurrentScreen('result');
        }, 1200);
      } else {
        const aiMsg = {
          role: 'ai',
          textEn: response.questionEn,
          textTe: response.questionTe,
          options: response.options || [],
          text: response.rawResponse
        };
        setChatMessages(prev => [...prev, aiMsg]);
        setGeminiHistory(prev => [...prev, { role: 'ai', text: response.rawResponse }]);
        setIsAiTyping(false);

        if (autoVoiceMode) {
          const speakText = lang === 'te' ? response.questionTe : response.questionEn;
          voiceEngine.speak({
            text: speakText,
            lang: lang === 'te' ? 'te-IN' : 'en-IN',
            onStart: () => setIsPlayingAudio(true),
            onEnd: () => {
              setIsPlayingAudio(false);
              setTimeout(() => handleStartChatListening(), 250);
            },
            onError: () => setIsPlayingAudio(false)
          });
        }
      }
    } catch (err) {
      console.error('Gemini chat error:', err);
      setIsAiTyping(false);
      setChatError(lang === 'te'
        ? 'AI నుండి సమాధానం రాలేదు. మళ్ళీ ప్రయత్నించండి.'
        : 'Failed to get AI response. Please try again.');
    }
  };

  // ─── CHAT: Voice input ───
  const handleStartChatListening = () => {
    const started = voiceEngine.startListening({
      lang: langRef.current === 'te' ? 'te-IN' : 'en-IN',
      onResult: ({ final, interim, text }) => {
        if (final || text) {
          const spoken = (final || text).trim();
          setChatInput(spoken);
          setTimeout(() => {
            handleSendChatMessage(spoken);
          }, 350);
        } else if (interim) {
          setChatInput(interim);
        }
      },
      onEnd: () => setIsChatListening(false),
      onError: (err) => {
        console.warn('Chat STT:', err);
        setIsChatListening(false);
      }
    });
    setIsChatListening(started);
  };

  const handleToggleChatListening = () => {
    if (isChatListening) {
      voiceEngine.stopListening();
      setIsChatListening(false);
    } else {
      handleStartChatListening();
    }
  };

  // Offline MCQ Answer Selector
  const handleSelectAnswer = (questionId, value, optionObj = null) => {
    voiceEngine.stopSpeaking();
    voiceEngine.stopListening();
    setIsFollowupListening(false);

    setSelectedOptionTemp(value);
    const updatedAnswers = { ...answers, [questionId]: value };
    setAnswers(updatedAnswers);

    setTimeout(async () => {
      setSelectedOptionTemp(null);
      setFollowupSpokenText('');

      if (currentQuestionIndex + 1 < questionsList.length) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        const localResult = aiTriageService.computeTriageResult({
          initialSymptom: symptomText,
          matchedCard: matchedCard,
          answers: updatedAnswers
        });

        setTriageResult(localResult);
        setPlayCount(0);
        setCurrentScreen('result');
      }
    }, 400);
  };

  // Copy ASHA Case Record to Clipboard / WhatsApp Share format
  const handleCopyRecord = () => {
    if (!triageResult) return;
    
    const recordText = `🏥 *Swasth AI - ASHA Triage Report*
👤 *Patient:* ${patientName || 'Anonymous'} (${patientCategory.toUpperCase()})
📍 *Village:* ${patientVillage || 'Not specified'}
🤒 *Symptoms:* ${symptomText}
📊 *Urgency Level:* ${triageResult.urgency.labelEn} / ${triageResult.urgency.labelTe}
🩺 *Condition Assessment:* ${triageResult.matchedConditionEn} (${triageResult.matchedConditionTe})
📋 *ASHA Action Protocol:* ${triageResult.ashaActionEn || triageResult.adviceEn}
🌿 *Advice:* ${triageResult.adviceEn}
---
Generated via Swasth AI Rural Healthcare Assistant`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(recordText);
      setCopiedRecord(true);
      setTimeout(() => setCopiedRecord(false), 2500);
    }
  };

  // Reset for Next Patient in ASHA Mode
  const handleNextPatient = () => {
    voiceEngine.stopSpeaking();
    voiceEngine.stopListening();
    setPatientName('');
    setPatientVillage('');
    setPatientAge('');
    setPatientCategory('adult');
    setSelectedVitals([]);
    setSymptomText('');
    setInterimText('');
    setAnswers({});
    setTriageResult(null);
    setChatMessages([]);
    setGeminiHistory([]);
    setPlayCount(0);
    setCurrentScreen('asha_input');
  };

  // Restart Checkup
  const handleRestart = () => {
    voiceEngine.stopSpeaking();
    voiceEngine.stopListening();
    setPatientName('');
    setPatientVillage('');
    setPatientAge('');
    setPatientCategory('adult');
    setSelectedVitals([]);
    setSymptomText('');
    setInterimText('');
    setAnswers({});
    setTriageResult(null);
    setChatMessages([]);
    setGeminiHistory([]);
    setPlayCount(0);
    setCurrentScreen('role');
  };

  return (
    <div className="app-viewport">
      {/* Top Application Bar */}
      <header className="app-topbar">
        <div className="brand-badge" onClick={handleRestart} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">S</div>
          <div className="brand-text">
            <span className="name">Swasth AI</span>
            <span className="tagline">గ్రామీణ ఆరోగ్య సహాయకుడు</span>
          </div>
        </div>

        <div className="topbar-actions">
          {autoVoiceMode && (
            <div className="voice-indicator-badge" title="Auto Voice Assistant Active">
              <Radio size={14} className="pulse-icon" />
              <span>Voice AI</span>
            </div>
          )}
          <button className="lang-toggle-btn" onClick={toggleLanguage} title="Switch Language">
            <span>🌐</span>
            <span>{lang === 'te' ? 'English' : 'తెలుగు'}</span>
          </button>
        </div>
      </header>

      {/* Screen 1: Language Selection */}
      {currentScreen === 'lang' && (
        <div className="screen-body">
          <h2 className="top-title">
            Choose your language
            <span className="te">మీ భాషను ఎంచుకోండి</span>
          </h2>
          <p className="sub-desc">
            Fast, voice-guided healthcare decision support.
            <span className="te">ప్రతి స్క్రీన్ సులభంగా ఉంటుంది. తెలుగులో వాయిస్ ద్వారా సమాధానం వినవచ్చు.</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
            <button 
              className="big-btn mustard"
              onClick={() => { setLang('te'); setCurrentScreen('role'); }}
            >
              <span className="ic" style={{ fontFamily: 'Noto Sans Telugu', fontWeight: 800 }}>తె</span>
              <span className="txt">
                <span style={{ fontSize: '18px' }}>తెలుగు (Telugu)</span>
                <span className="te">వాయిస్ మరియు టెక్స్ట్ సహాయం</span>
              </span>
            </button>

            <button 
              className="big-btn ghost"
              onClick={() => { setLang('en'); setCurrentScreen('role'); }}
            >
              <span className="ic">A</span>
              <span className="txt">
                <span>English</span>
                <span className="te">Bilingual health assistant</span>
              </span>
            </button>
          </div>

          <div className="footer-note">
            Powered by Gemini AI · No account required.
            <span className="te" style={{ display: 'block', marginTop: '2px' }}>ఖాతా లేదా రిజిస్ట్రేషన్ అవసరం లేదు.</span>
          </div>
        </div>
      )}

      {/* Screen 2: Who is using it (Role) */}
      {currentScreen === 'role' && (
        <div className="screen-body">
          <div className="back-row">
            <button className="back-chip" onClick={() => setCurrentScreen('lang')}>
              <ChevronLeft size={20} />
            </button>
          </div>

          <h2 className="top-title">
            Who is checking today?
            <span className="te">ఈరోజు ఎవరు వాడుతున్నారు?</span>
          </h2>
          <p className="sub-desc">
            Choose whether you are checking for yourself or assisting as an ASHA worker.
            <span className="te">మీ కోసం చూసుకుంటున్నారా లేదా ఆశా వర్కర్ గా నమోదు చేస్తున్నారా?</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <button 
              className="big-btn" 
              style={{ minHeight: '94px', justifyContent: 'flex-start' }}
              onClick={() => {
                setUserRole('patient');
                setCurrentScreen('input_choice');
              }}
            >
              <span className="ic" style={{ fontSize: '24px' }}>🧑</span>
              <span className="txt">
                <span>I am checking myself</span>
                <span className="te">నేను స్వయంగా చూసుకుంటున్నాను</span>
              </span>
            </button>

            <button 
              className="big-btn mustard" 
              style={{ minHeight: '94px', justifyContent: 'flex-start' }}
              onClick={() => {
                setUserRole('asha');
                setAutoVoiceMode(false);
                setCurrentScreen('asha_input');
              }}
            >
              <span className="ic" style={{ fontSize: '24px' }}>🩺</span>
              <span className="txt">
                <span>I am an ASHA worker</span>
                <span className="te">నేను ఆశా వర్కర్‌ని (ASHA Mode)</span>
              </span>
            </button>
          </div>

          <div className="footer-note">
            Specialized clinical decision workflows for rural health workers.
            <span className="te" style={{ display: 'block', marginTop: '2px' }}>గ్రామీణ ప్రజలు మరియు ఆశా కార్యకర్తల కోసం.</span>
          </div>
        </div>
      )}

      {/* Screen 3: Input Mode Choice (Text or Voice) */}
      {currentScreen === 'input_choice' && (
        <div className="screen-body">
          <div className="back-row">
            <button className="back-chip" onClick={() => setCurrentScreen('role')}>
              <ChevronLeft size={20} />
            </button>
          </div>

          <h2 className="top-title">
            How do you want to tell us?
            <span className="te">మీరు ఎలా చెప్పాలనుకుంటున్నారు?</span>
          </h2>
          <p className="sub-desc">
            Choose Voice for complete hands-free spoken AI assistance.
            <span className="te">వాయిస్ ఎంచుకుంటే AI స్వయంగా మాట్లాడి ప్రశ్నలు అడుగుతుంది.</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <button 
              className="big-btn mustard" 
              style={{ minHeight: '92px' }}
              onClick={() => {
                setAutoVoiceMode(true);
                setCurrentScreen('patient_input');
              }}
            >
              <span className="ic"><Mic size={26} /></span>
              <span className="txt">
                <span>Speak it (Automatic Telugu Voice 🎙️)</span>
                <span className="te">మాట్లాడండి — ఆటోమేటిక్ తెలుగు వాయిస్</span>
              </span>
            </button>

            <button 
              className="big-btn ghost" 
              style={{ minHeight: '92px' }}
              onClick={() => {
                setAutoVoiceMode(false);
                setCurrentScreen('patient_input');
              }}
            >
              <span className="ic"><Keyboard size={26} /></span>
              <span className="txt">
                <span>Type it (Manual text / Tap)</span>
                <span className="te">టైప్ చేయండి / మాన్యువల్</span>
              </span>
            </button>
          </div>

          <div className="footer-note">
            Voice mode speaks every question out loud and listens for your answer automatically.
            <span className="te" style={{ display: 'block', marginTop: '2px' }}>వాయిస్ మోడ్‌లో AI స్వయంగా మాట్లాడి మీ సమాధానం వింటుంది.</span>
          </div>
        </div>
      )}

      {/* Screen 4: First Symptom Description (Patient Mode) */}
      {currentScreen === 'patient_input' && (
        <div className="screen-body">
          <div className="back-row">
            <button className="back-chip" onClick={() => setCurrentScreen('input_choice')}>
              <ChevronLeft size={20} />
            </button>
          </div>

          <h2 className="top-title">
            What's bothering you?
            <span className="te">మీకు ఏమి ఇబ్బందిగా ఉంది?</span>
          </h2>

          {/* Unified Voice & Typing Input Card */}
          <div className="mic-circle-wrapper">
            <button 
              className={`mic-circle ${isListening ? 'listening' : ''}`}
              onClick={handleToggleListening}
              title={isListening ? 'Stop Listening' : 'Tap to speak Telugu'}
            >
              {isListening ? <MicOff size={38} /> : <Mic size={38} />}
            </button>
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: 'var(--ink-soft)' }}>
              {isListening ? (
                <span style={{ color: 'var(--red)', fontWeight: 'bold' }}>
                  Listening in Telugu… <span className="te" style={{ display: 'block' }}>వింటోంది… మాట్లాడండి</span>
                </span>
              ) : (
                <span>
                  {autoVoiceMode ? 'Voice active · Tap if needed' : 'Tap to speak in Telugu'} 
                  <span className="te" style={{ display: 'block' }}>మాట్లాడటానికి మైక్ నొక్కండి</span>
                </span>
              )}
            </div>
          </div>

          {/* Interactive Editable Transcript Area */}
          <div className="field" style={{ marginTop: '10px' }}>
            <textarea 
              rows={3}
              className="textarea-mock"
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder={lang === 'te' ? 'జ్వరం, తలనొప్పి, దగ్గు... (మాట్లాడండి లేదా ఇక్కడ టైప్ చేయండి)' : 'Describe symptoms here or speak into microphone...'}
            />
            {interimText && (
              <div style={{ fontSize: '12px', color: 'var(--teal)', marginTop: '4px', fontStyle: 'italic' }}>
                Hearing: {interimText}...
              </div>
            )}
          </div>

          {/* Quick Tap Example Suggestions */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>
              Quick test symptoms / ఉదాహరణ లక్షణాలు:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {QUICK_PATIENT_SYMPTOMS.map((symp, i) => (
                <button 
                  key={i}
                  className="quick-chip"
                  onClick={() => setSymptomText(lang === 'te' ? symp.te : symp.en)}
                >
                  {lang === 'te' ? symp.te : symp.en}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button 
              className="big-btn mustard" 
              disabled={!symptomText.trim()}
              onClick={handleAnalyzeSymptom}
              style={{ opacity: symptomText.trim() ? 1 : 0.5 }}
            >
              <span className="ic"><Check size={22} /></span>
              <span className="txt">
                <span>Continue to AI Analysis</span>
                <span className="te">AI తనిఖీని ప్రారంభించండి</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Screen 4b: ASHA Worker Fast Input Portal
          ═══════════════════════════════════════════ */}
      {currentScreen === 'asha_input' && (
        <div className="screen-body">
          <div className="back-row">
            <button className="back-chip" onClick={() => setCurrentScreen('role')}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ flex: 1, fontWeight: 800, fontSize: '14px', color: 'var(--teal-dark)' }}>
              🩺 ASHA Rural Case Entry / రోగి నమోదు
            </div>
          </div>

          {/* Patient Details Row */}
          <div className="field" style={{ marginTop: '4px' }}>
            <label style={{ fontSize: '12px' }}>Patient & Village (పేరు / గ్రామం)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Name / పేరు" 
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                style={{ flex: 1.2 }}
              />
              <input 
                type="text" 
                placeholder="Village / గ్రామం" 
                value={patientVillage}
                onChange={(e) => setPatientVillage(e.target.value)}
                style={{ flex: 1 }}
              />
              <input 
                type="text" 
                placeholder="Age" 
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                style={{ width: '60px' }}
              />
            </div>
          </div>

          {/* Category Selector Pills */}
          <div className="gender-pills-row">
            {[
              { id: 'adult', en: 'Adult (వయోజనుడు)', icon: '🧑' },
              { id: 'child', en: 'Child (పిల్లలు)', icon: '👶' },
              { id: 'pregnant', en: 'Pregnant (గర్భిణీ)', icon: '🤰' },
              { id: 'elderly', en: 'Elderly (వృద్ధులు)', icon: '👵' }
            ].map(cat => (
              <button 
                key={cat.id}
                className={`gender-pill ${patientCategory === cat.id ? 'on' : ''}`}
                onClick={() => setPatientCategory(cat.id)}
              >
                {cat.icon} {cat.en}
              </button>
            ))}
          </div>

          {/* 1-Tap Quick Common Condition Grid for ASHA */}
          <div className="asha-grid-title">
            <HeartPulse size={15} /> 1-Tap Common Symptoms / ముఖ్య లక్షణాలు:
          </div>
          <div className="asha-symptoms-grid">
            {ASHA_COMMON_CONDITIONS.map(item => {
              const isActive = symptomText.includes(lang === 'te' ? item.te : item.en);
              return (
                <button 
                  key={item.id}
                  className={`asha-symptom-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    const textToAdd = lang === 'te' ? item.te : item.en;
                    if (symptomText) {
                      setSymptomText(prev => `${prev}, ${textToAdd}`);
                    } else {
                      setSymptomText(textToAdd);
                    }
                  }}
                >
                  <span className="sym-icon">{item.icon}</span>
                  <span className="sym-name">{item.en}</span>
                  <span className="sym-te">{item.te}</span>
                </button>
              );
            })}
          </div>

          {/* Observations & Vitals Checklist */}
          <div className="asha-grid-title" style={{ marginTop: '4px' }}>
            <Activity size={15} /> Key Vitals / పరిశీలనలు (Toggles):
          </div>
          <div className="vitals-track-row">
            {ASHA_KEY_OBSERVATIONS.map(obs => {
              const isSelected = selectedVitals.includes(obs.id);
              return (
                <button 
                  key={obs.id}
                  className={`vitals-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => handleToggleVital(obs.id)}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {lang === 'te' ? obs.te : obs.en}
                </button>
              );
            })}
          </div>

          {/* Symptom Text Box with Mic */}
          <div className="field" style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '12px' }}>Detailed Symptoms / ఇతర లక్షణాలు:</label>
            <div style={{ position: 'relative' }}>
              <textarea 
                rows={2}
                placeholder="fever 3 days, body pain / 3 రోజులుగా జ్వరం, నీరసం..."
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                style={{ paddingRight: '46px', minHeight: '60px' }}
              />
              <button 
                className={`icon-btn ${isListening ? 'listening' : ''}`}
                onClick={handleToggleListening}
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '10px',
                  background: isListening ? 'var(--red)' : 'var(--teal)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px'
                }}
                title="Speak Telugu"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
            {interimText && (
              <div style={{ fontSize: '11px', color: 'var(--teal)', marginTop: '2px', fontStyle: 'italic' }}>
                Hearing: {interimText}...
              </div>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <button 
              className="big-btn mustard" 
              disabled={!symptomText.trim()}
              onClick={handleAnalyzeSymptom}
              style={{ opacity: symptomText.trim() ? 1 : 0.5 }}
            >
              <span className="ic"><Check size={22} /></span>
              <span className="txt">
                <span>Start AI Triage Check</span>
                <span className="te">AI తనిఖీని ప్రారంభించండి</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Screen 5a: Gemini AI Chat Consultation
          ═══════════════════════════════════════════ */}
      {currentScreen === 'chat' && (
        <div className="screen-body" style={{ padding: '12px 14px 10px' }}>
          <div className="back-row" style={{ marginBottom: '8px' }}>
            <button 
              className="back-chip" 
              onClick={() => {
                voiceEngine.stopSpeaking();
                voiceEngine.stopListening();
                setCurrentScreen(userRole === 'asha' ? 'asha_input' : 'patient_input');
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div style={{ flex: 1, fontSize: '13px', fontWeight: 800, color: 'var(--teal-dark)' }}>
              <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              {userRole === 'asha' 
                ? (lang === 'te' ? `ASHA తనిఖీ: ${patientName || 'రోగి'}` : `ASHA Triage: ${patientName || 'Patient'}`)
                : (lang === 'te' ? 'Swasth AI సంభాషణ' : 'Swasth AI Consultation')}
            </div>
            {autoVoiceMode && (
              <div className="voice-indicator-badge" style={{ fontSize: '10px', padding: '3px 6px' }}>
                <Radio size={10} className="pulse-icon" />
                <span>Auto</span>
              </div>
            )}
          </div>

          {/* Symptom context chip */}
          <div style={{ 
            background: 'var(--mustard-soft)', 
            padding: '7px 12px', 
            borderRadius: '12px', 
            fontSize: '12px',
            color: '#3a2a05',
            fontWeight: 700,
            marginBottom: '8px'
          }}>
            📋 {lang === 'te' ? 'లక్షణం' : 'Symptom'}: {symptomText}
          </div>

          {/* Chat container */}
          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.map((msg, idx) => {
                const isLatestAiMsg = msg.role === 'ai' && idx === chatMessages.length - 1 && !isAiTyping && !msg.isFinal;
                return (
                  <div key={idx} className={`chat-bubble ${msg.role}`}>
                    {msg.role === 'ai' ? (
                      <>
                        <div className="bubble-label">Swasth AI</div>
                        <div style={{ fontSize: '14.5px', fontWeight: 600 }}>{msg.textEn}</div>
                        {msg.textTe && <span className="te" style={{ fontSize: '14px', fontWeight: 700 }}>{msg.textTe}</span>}
                        
                        {msg.isFinal && (
                          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--green)' }}>
                            ✓ {lang === 'te' ? 'అంచనా పూర్తయింది. ఫలితం చూపిస్తోంది...' : 'Assessment complete. Showing result...'}
                          </div>
                        )}

                        <button 
                          className="chat-speak-btn"
                          onClick={() => handlePlayVoice(lang === 'te' ? (msg.textTe || msg.textEn) : msg.textEn)}
                        >
                          <Volume2 size={13} />
                          {lang === 'te' ? 'వాయిస్ వినండి' : 'Listen'}
                        </button>

                        {/* 1-Tap Quick Response Option Pills from Gemini */}
                        {isLatestAiMsg && msg.options && msg.options.length > 0 && (
                          <div className="chat-quick-options">
                            {msg.options.map((opt, oIdx) => {
                              const optionLabel = lang === 'te' ? (opt.te || opt.en) : opt.en;
                              return (
                                <button 
                                  key={oIdx}
                                  className="chat-option-chip"
                                  onClick={() => handleSendChatMessage(optionLabel)}
                                >
                                  <span>{opt.en}</span>
                                  {opt.te && <span className="chip-te">{opt.te}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontWeight: 600 }}>{msg.text}</div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isAiTyping && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span /><span /><span />
                  </div>
                  <span className="typing-label">
                    {lang === 'te' ? 'Swasth AI ఆలోచిస్తోంది...' : 'Swasth AI is analyzing...'}
                  </span>
                </div>
              )}

              {/* Error message */}
              {chatError && (
                <div className="chat-error">{chatError}</div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat input bar */}
            <div className="chat-input-bar">
              <button 
                className={`chat-mic-btn ${isChatListening ? 'listening' : ''}`}
                onClick={handleToggleChatListening}
                title={isChatListening ? 'Stop' : 'Speak'}
              >
                {isChatListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === 'te' ? 'సమాధానం టైప్ చేయండి లేదా మాట్లాడండి...' : 'Type answer or speak into mic...'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                disabled={isAiTyping}
              />
              <button 
                className="chat-send-btn"
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isAiTyping}
              >
                <Send size={18} />
              </button>
            </div>

            {isChatListening && (
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--red)', fontWeight: 700, padding: '4px 0' }}>
                🎙️ {lang === 'te' ? 'వింటోంది… సమాధానం చెప్పండి' : 'Listening... speak now'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 5b: Offline MCQ Fallback */}
      {currentScreen === 'followup' && questionsList.length > 0 && (
        <div className="screen-body">
          <div className="back-row">
            <button 
              className="back-chip" 
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(prev => prev - 1);
                } else {
                  setCurrentScreen(userRole === 'asha' ? 'asha_input' : 'patient_input');
                }
              }}
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          <div className="progress-header">
            <span className="step-text">
              Question {currentQuestionIndex + 1} of {questionsList.length}
            </span>
            <div className="dots-track">
              {questionsList.map((_, idx) => (
                <span 
                  key={idx} 
                  className={`dot ${idx <= currentQuestionIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '8px' }}>
            <button 
              className="icon-btn" 
              style={{ 
                width: '38px', 
                height: '38px', 
                background: isPlayingAudio ? 'var(--mustard)' : 'var(--teal)', 
                color: isPlayingAudio ? '#3a2a05' : '#fff', 
                borderRadius: '50%',
                flexShrink: 0
              }}
              onClick={() => {
                const q = questionsList[currentQuestionIndex];
                if (isPlayingAudio) {
                  handleStopVoice();
                } else {
                  handlePlayVoice(lang === 'te' ? q.qTe : q.qEn);
                }
              }}
              title="Replay Voice Question"
            >
              <Volume2 size={20} />
            </button>
            <div className="advice-card" style={{ marginTop: 0, flex: 1, fontWeight: 600 }}>
              {questionsList[currentQuestionIndex]?.qEn}
              <span className="te" style={{ fontSize: '15.5px', color: 'var(--teal-dark)', fontWeight: 700 }}>
                {questionsList[currentQuestionIndex]?.qTe}
              </span>
            </div>
          </div>

          <div className="pill-row" style={{ marginTop: '16px' }}>
            {questionsList[currentQuestionIndex]?.options.map((opt) => {
              const isSelected = selectedOptionTemp === opt.value || answers[questionsList[currentQuestionIndex].id] === opt.value;
              return (
                <button 
                  key={opt.value}
                  className={`pill ${isSelected ? 'on' : ''}`}
                  onClick={() => handleSelectAnswer(questionsList[currentQuestionIndex].id, opt.value, opt)}
                >
                  <span style={{ fontSize: '15px' }}>{opt.en}</span>
                  <span className="te" style={{ fontSize: '13.5px' }}>{opt.te}</span>
                </button>
              );
            })}
          </div>

          {selectedOptionTemp && (
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <div className="confirmed-chip">
                <CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Confirmed / నమోదు చేయబడింది
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              className={`mic-circle ${isFollowupListening ? 'listening' : ''}`}
              style={{ width: '80px', height: '80px', background: 'var(--mustard)' }}
              onClick={handleToggleFollowupListening}
              title="Tap to answer with Telugu speech"
            >
              <Mic size={28} color="#3a2a05" />
            </button>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', marginTop: '8px', textAlign: 'center' }}>
              {isFollowupListening ? (
                <span style={{ color: 'var(--red)', fontWeight: 'bold' }}>
                  Listening… / వింటోంది: "{followupSpokenText || '...'}"
                </span>
              ) : (
                <span>
                  {autoVoiceMode ? 'Listening automatically after question' : 'Tap to answer by voice'}
                  <span className="te" style={{ display: 'block' }}>వాయిస్‌తో సమాధానం చెప్పండి</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screen 6: Triage Result (Patient & ASHA View) */}
      {currentScreen === 'result' && triageResult && (
        <div className="screen-body">
          <div className="back-row">
            <button 
              className="back-chip" 
              onClick={() => setCurrentScreen(userRole === 'asha' ? 'asha_input' : 'patient_input')}
            >
              <ChevronLeft size={20} />
            </button>
            <div style={{ flex: 1, fontSize: '14px', fontWeight: 800, color: 'var(--teal-dark)' }}>
              {userRole === 'asha' ? '🩺 ASHA Case Assessment' : 'Clinical Triage Result'}
            </div>
          </div>

          {/* Patient Card Header in ASHA Mode */}
          {userRole === 'asha' && (
            <div className="asha-header">
              <span className="av">A</span>
              <div className="meta">
                <b>Patient: {patientName || 'Anonymous'} ({patientAge || 'Age --'})</b>
                <div>Village: {patientVillage || 'Rural visit'} · {patientCategory.toUpperCase()}</div>
              </div>
            </div>
          )}

          {/* Tier Circular Badge */}
          <div className={`tier-badge ${triageResult.urgency.badgeClass}`}>
            <div className="icon">{triageResult.urgency.icon}</div>
            <div className="label">{triageResult.urgency.labelEn}</div>
            <div className="te">{triageResult.urgency.labelTe}</div>
          </div>

          {/* Spoken Audio Banner with Waveform */}
          <div 
            className={`speak-row ${triageResult.urgency.tier === 'red' ? 'emergency' : ''}`}
            onClick={() => handlePlayVoice(lang === 'te' ? triageResult.spokenTe : triageResult.spokenEn)}
          >
            <Volume2 size={20} />
            {isPlayingAudio ? (
              <>
                <span className="bars">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span>{lang === 'te' ? 'సలహా వినిపిస్తోంది…' : 'Playing advice…'}</span>
              </>
            ) : (
              <span>{lang === 'te' ? 'వాయిస్ సలహా వినండి' : 'Listen to Voice Advice'}</span>
            )}
          </div>

          {/* Specific ASHA Clinical Referral Box */}
          {userRole === 'asha' && (
            <div className={`asha-action-box ${triageResult.urgency.tier === 'red' ? 'emergency' : ''}`}>
              <h3>
                <Activity size={18} />
                {lang === 'te' ? 'ఆశా వర్కర్ చేయవలసిన పనులు (Action Plan)' : 'ASHA Action Protocol'}
              </h3>
              <p>{lang === 'te' ? (triageResult.ashaActionTe || triageResult.adviceTe) : (triageResult.ashaActionEn || triageResult.adviceEn)}</p>
            </div>
          )}

          {/* Spoken Advice Box */}
          <div className="advice-card">
            <strong>{triageResult.adviceEn}</strong>
            <span className="te">{triageResult.adviceTe}</span>
          </div>

          {/* Precautions */}
          <div className="section-box">
            <h3>🌿 {lang === 'te' ? 'తీసుకోవాల్సిన జాగ్రత్తలు (Precautions)' : 'Precautions'}</h3>
            <p>{lang === 'te' ? triageResult.precautionsTe : triageResult.precautionsEn}</p>
          </div>

          {/* Avoidances */}
          <div className="section-box">
            <h3>⚠️ {lang === 'te' ? 'చేయకూడనివి (Avoid)' : 'What to Avoid'}</h3>
            <p>{lang === 'te' ? triageResult.avoidTe : triageResult.avoidEn}</p>
          </div>

          {/* Replay Button with Play Counter */}
          <button 
            className="big-btn ghost" 
            style={{ marginTop: '12px', minHeight: '56px' }}
            onClick={() => handlePlayVoice(lang === 'te' ? triageResult.spokenTe : triageResult.spokenEn)}
          >
            <span className="ic"><RotateCcw size={18} /></span>
            <span className="txt">
              <span>Play again (మళ్లీ వినండి)</span>
              <span className="te" style={{ fontSize: '12px' }}>
                Played {playCount} times · tap as many times as you like
              </span>
            </span>
          </button>

          {/* Copy / WhatsApp Case Record Button for ASHA */}
          {userRole === 'asha' && (
            <button 
              className="share-action-btn"
              onClick={handleCopyRecord}
            >
              {copiedRecord ? <ClipboardCheck size={18} /> : <Share2 size={18} />}
              <span>{copiedRecord ? '✓ Case Record Copied!' : 'Copy / Share ASHA Case Report'}</span>
            </button>
          )}

          {/* Emergency 108 Action for Red Tier */}
          {triageResult.urgency.tier === 'red' && (
            <a href="tel:108" className="emergency-cta">
              <PhoneCall size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Call 108 Ambulance / Emergency
              <span className="te">108 అంబులెన్స్ / ఆశా వర్కర్‌కి కాల్ చేయండి</span>
            </a>
          )}

          {/* ASHA Mode "Next Patient" Loop */}
          {userRole === 'asha' ? (
            <button 
              className="big-btn mustard" 
              style={{ marginTop: '14px' }}
              onClick={handleNextPatient}
            >
              <span className="ic"><PlusCircle size={22} /></span>
              <span className="txt">
                <span>Next patient</span>
                <span className="te">తదుపరి రోగి నమోదు</span>
              </span>
            </button>
          ) : (
            <button 
              className="big-btn ghost" 
              style={{ marginTop: '12px' }}
              onClick={handleRestart}
            >
              <span className="ic"><Home size={20} /></span>
              <span className="txt">
                <span>Start new checkup</span>
                <span className="te">కొత్త తనిఖీని ప్రారంభించండి</span>
              </span>
            </button>
          )}

          <div className="footer-note">
            Safety Notice: Decision-support guidance only, not a doctor diagnosis.
            <span className="te" style={{ display: 'block', marginTop: '2px' }}>ఇది ప్రాథమిక ఆరోగ్య సమాచారం మాత్రమే, వైద్యుని నిర్ధారణ కాదు.</span>
          </div>
        </div>
      )}
    </div>
  );
}
