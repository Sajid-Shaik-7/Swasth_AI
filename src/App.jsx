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
  Settings, 
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
  Radio
} from 'lucide-react';

const QUICK_SYMPTOMS = [
  { en: 'Fever & headache', te: 'జ్వరం, తలనొప్పి' },
  { en: 'Severe cough & cold', te: 'దగ్గు, జలుబు' },
  { en: 'Stomach pain & loose motions', te: 'కడుపునొప్పి, విరేచనాలు' },
  { en: 'Migraine / Head pain', te: 'తీవ్ర తలనొప్పి' },
  { en: 'Heavy chest pain & left arm pain', te: 'తీవ్రమైన ఛాతీ నొప్పి (Emergency)' }
];

export default function App() {
  // Navigation & Language
  const [lang, setLang] = useState('te'); // 'te' (Telugu) or 'en' (English)
  const [currentScreen, setCurrentScreen] = useState('lang'); // 'lang', 'role', 'input_choice', 'patient_input', 'asha_input', 'followup', 'result'
  const [userRole, setUserRole] = useState('patient'); // 'patient' or 'asha'
  const [autoVoiceMode, setAutoVoiceMode] = useState(false); // Seamless Hands-free Voice AI mode
  
  // ASHA Metadata
  const [patientName, setPatientName] = useState('');
  const [patientVillage, setPatientVillage] = useState('');
  
  // Symptom Description State
  const [symptomText, setSymptomText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  // Follow-up Question Flow
  const [matchedCard, setMatchedCard] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOptionTemp, setSelectedOptionTemp] = useState(null);
  const [isFollowupListening, setIsFollowupListening] = useState(false);
  const [followupSpokenText, setFollowupSpokenText] = useState('');
  
  // Triage Outcome State
  const [triageResult, setTriageResult] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(aiTriageService.getApiKey());
  const [savedKeyMsg, setSavedKeyMsg] = useState(false);

  // Reference to track active question in callbacks without closure stale state
  const questionsListRef = useRef(questionsList);
  questionsListRef.current = questionsList;
  const currentQIndexRef = useRef(currentQuestionIndex);
  currentQIndexRef.current = currentQuestionIndex;
  const autoVoiceModeRef = useRef(autoVoiceMode);
  autoVoiceModeRef.current = autoVoiceMode;
  const langRef = useRef(lang);
  langRef.current = lang;

  // Auto Voice Agent Lifecycle
  useEffect(() => {
    if (currentScreen === 'patient_input' && autoVoiceMode) {
      // Step 1 on Symptom Input: Speak welcoming prompt, then immediately auto-listen
      const welcomePrompt = lang === 'te' 
        ? 'మీకు ఏమి ఇబ్బందిగా ఉందో స్పష్టంగా చెప్పండి.' 
        : 'Please tell us what health problem you are experiencing.';
      
      voiceEngine.speak({
        text: welcomePrompt,
        lang: lang === 'te' ? 'te-IN' : 'en-IN',
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => {
          setIsPlayingAudio(false);
          // Automatically start microphone to listen to patient
          setTimeout(() => {
            handleStartListeningAuto();
          }, 300);
        },
        onError: () => setIsPlayingAudio(false)
      });
    } else if (currentScreen === 'followup' && questionsList.length > 0) {
      // Step 2 on Questions: Speak the question in Telugu, then immediately auto-listen for answer
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
              // Automatically open mic to capture patient's answer
              setTimeout(() => {
                handleStartFollowupListeningAuto();
              }, 300);
            }
          },
          onError: () => setIsPlayingAudio(false)
        });
      }
    } else if (currentScreen === 'result' && triageResult) {
      // Step 3 on Result: Automatically speak out the clinical advice in Telugu
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

  // Automatic & Manual Voice Recognition for Follow-up Question Answer
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
          // Match against options
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

  // Submit Initial Symptom -> Trigger Clinical Engine
  const handleAnalyzeSymptom = async () => {
    if (!symptomText.trim()) return;
    voiceEngine.stopListening();
    voiceEngine.stopSpeaking();
    setIsListening(false);

    // 1. Check for immediate emergency triggers
    const emergencyCheck = aiTriageService.checkImmediateEmergency(symptomText);
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
        avoidTe: 'ఆలస్యం చేయవద్దు, స్వయంగా డ్రైవింగ్ చేయవద్దు.'
      };
      setTriageResult(emergencyResult);
      setPlayCount(0);
      setCurrentScreen('result');
      return;
    }

    // 2. Fetch matched follow-up questions
    const followUpData = aiTriageService.getFollowUpQuestions(symptomText);
    setMatchedCard(followUpData.matchedCard);
    setQuestionsList(followUpData.questions || []);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptionTemp(null);
    setFollowupSpokenText('');
    setCurrentScreen('followup');
  };

  // Select follow-up question answer with smooth feedback transition
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
        // Calculate final triage result
        const localResult = aiTriageService.computeTriageResult({
          initialSymptom: symptomText,
          matchedCard: matchedCard,
          answers: updatedAnswers
        });

        if (aiTriageService.getApiKey()) {
          const cloudResult = await aiTriageService.callGeminiTriage({
            symptom: symptomText,
            answers: updatedAnswers
          });
          setTriageResult(cloudResult || localResult);
        } else {
          setTriageResult(localResult);
        }

        setPlayCount(0);
        setCurrentScreen('result');
      }
    }, 450);
  };

  // Next Patient in ASHA Mode
  const handleNextPatient = () => {
    voiceEngine.stopSpeaking();
    voiceEngine.stopListening();
    setPatientName('');
    setPatientVillage('');
    setSymptomText('');
    setInterimText('');
    setAnswers({});
    setTriageResult(null);
    setPlayCount(0);
    setCurrentScreen('asha_input');
  };

  // Restart Checkup
  const handleRestart = () => {
    voiceEngine.stopSpeaking();
    voiceEngine.stopListening();
    setSymptomText('');
    setInterimText('');
    setAnswers({});
    setTriageResult(null);
    setPlayCount(0);
    setCurrentScreen('role');
  };

  // Save Settings
  const handleSaveApiKey = () => {
    aiTriageService.setApiKey(apiKeyInput.trim());
    setSavedKeyMsg(true);
    setTimeout(() => {
      setSavedKeyMsg(false);
      setShowSettings(false);
    }, 1200);
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
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="AI Settings">
            <Settings size={18} />
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
            One task per screen. Big buttons. Speaks the answer in Telugu.
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
            Whole app text switches instantly. No account, no sign-up.
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
            Two different journeys — patient self-check, or worker-assisted check.
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

      {/* Screen 4: First Symptom Description */}
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
              {QUICK_SYMPTOMS.map((symp, i) => (
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
                <span>Continue</span>
                <span className="te">కొనసాగించండి</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Screen 4b: ASHA Worker Input Mode */}
      {currentScreen === 'asha_input' && (
        <div className="screen-body">
          <div className="back-row">
            <button className="back-chip" onClick={() => setCurrentScreen('role')}>
              <ChevronLeft size={20} />
            </button>
          </div>

          <div className="asha-header">
            <span className="av">A</span>
            <div className="meta">
              <b>ASHA mode</b>
              <div>Entering for a patient / రోగి వివరాలు</div>
            </div>
          </div>

          <div className="field">
            <label>Patient name / village (రోగి పేరు / గ్రామం)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Lakshmi / లక్ష్మి" 
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                style={{ flex: 1 }}
              />
              <input 
                type="text" 
                placeholder="Kondapalli / కొండపల్లి" 
                value={patientVillage}
                onChange={(e) => setPatientVillage(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="field">
            <label>Symptoms / లక్షణాలు</label>
            <div style={{ position: 'relative' }}>
              <textarea 
                rows={3}
                placeholder="fever 3 days, not eating well / 3 రోజులుగా జ్వరం, నీరసం..."
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
              />
              <button 
                className={`icon-btn ${isListening ? 'listening' : ''}`}
                onClick={handleToggleListening}
                style={{
                  position: 'absolute',
                  right: '10px',
                  bottom: '12px',
                  background: isListening ? 'var(--red)' : 'var(--teal)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px'
                }}
                title="Speak Telugu"
              >
                <Mic size={16} />
              </button>
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--ink-soft)' }}>
            AI will ask 2–4 follow-up questions next, same as patient mode.
            <span className="te" style={{ display: 'block', marginTop: '2px' }}>తర్వాత AI 2-4 ప్రశ్నలు అడుగుతుంది.</span>
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
                <span>Continue to questions</span>
                <span className="te">ప్రశ్నలకు కొనసాగించండి</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Screen 5: AI Asks Follow-ups (Questions Flow) */}
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

          {/* Spoken Question Box with Speaker Audio Control */}
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

          {/* Quick Choice Selection Pills */}
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

          {/* Confirmed Selection Feedback */}
          {selectedOptionTemp && (
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <div className="confirmed-chip">
                <CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Confirmed / నమోదు చేయబడింది
              </div>
            </div>
          )}

          {/* Voice Answer Mic */}
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
          </div>

          {userRole === 'asha' && (patientName || patientVillage) && (
            <div className="asha-header">
              <span className="av">A</span>
              <div className="meta">
                <b>Patient: {patientName || 'Anonymous'}</b>
                <div>{patientVillage ? `Village: ${patientVillage}` : 'Rural visit record'}</div>
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

          {/* Unlimited Replay Button with Play Counter */}
          <button 
            className="big-btn ghost" 
            style={{ marginTop: '14px', minHeight: '62px' }}
            onClick={() => handlePlayVoice(lang === 'te' ? triageResult.spokenTe : triageResult.spokenEn)}
          >
            <span className="ic"><RotateCcw size={20} /></span>
            <span className="txt">
              <span>Play again (మళ్లీ వినండి)</span>
              <span className="te" style={{ fontSize: '12px' }}>
                Played {playCount} times · tap as many times as you like
              </span>
            </span>
          </button>

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

      {/* Settings Modal (Gemini API Configuration) */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>⚙️ Swasth AI Settings</h2>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '14px' }}>
              Swasth AI operates with the <strong>Built-in Offline Clinical Decision Engine</strong> by default. You can optionally connect a free Google Gemini API Key for cloud triage.
            </p>

            <div className="field">
              <label>Google Gemini API Key (Optional)</label>
              <input 
                type="password" 
                placeholder="AIzaSy..." 
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>

            {savedKeyMsg && (
              <div style={{ color: 'var(--green)', fontSize: '13px', marginTop: '8px', fontWeight: 'bold' }}>
                ✓ Settings saved successfully!
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button 
                className="big-btn mustard" 
                style={{ padding: '10px 16px', fontSize: '15px' }}
                onClick={handleSaveApiKey}
              >
                Save Settings
              </button>
              <button 
                className="big-btn ghost" 
                style={{ padding: '10px 16px', fontSize: '15px' }}
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
