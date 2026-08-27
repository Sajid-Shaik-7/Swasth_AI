// AI Medical Triage Service
// Gemini LLM conversational chatbot + offline clinical rules fallback
// Optimized for patient self-care and ASHA worker clinical decision support

import {
  URGENCY_CLASSES,
  NON_NEGOTIABLE_EMERGENCY_TRIGGERS,
  DISEASE_KNOWLEDGE_CARDS,
  GENERIC_DEFAULT_QUESTIONS
} from '../data/triageKnowledgeCards';

const GEMINI_SYSTEM_PROMPT = `You are Swasth AI, an expert, compassionate clinical decision support system for rural Indian healthcare, designed for both villagers and ASHA healthcare workers.
You support bilingual English and natural conversational Telugu (తెలుగు).

SAFETY & CLINICAL RULES:
1. You are an educational triage assistant, providing triage categorization (EMERGENCY / URGENT_HIGH / ROUTINE_LOW).
2. For life-threatening red flags (chest pain, stroke, breathing failure, anaphylaxis, severe bleeding, poison), immediately classify as EMERGENCY (108 / 112).
3. Keep all questions and explanations CONCISE, SIMPLE, and CLEAR so they can be easily spoken by voice synthesizer.
4. When asking questions, always provide 2 to 4 quick answer choices (both English and Telugu) so the ASHA worker or patient can 1-tap respond or speak them.
5. Provide specific practical actions for ASHA workers (e.g. Home care advice, PHC referral within 24-48 hrs, or immediate 108 call).

CONVERSATION PROTOCOL:
- Evaluate the patient's symptoms.
- Ask 2 to 4 targeted, symptom-relevant clinical questions ONE AT A TIME.
- Once you have sufficient information (after 2-4 questions), produce the final assessment.

RESPONSE FORMAT: You MUST return ONLY valid JSON matching one of these two structures (no markdown, no backticks):

When asking a follow-up question:
{
  "done": false,
  "questionEn": "Concise question in English",
  "questionTe": "స్పష్టమైన ప్రశ్న తెలుగులో",
  "options": [
    { "en": "Yes / Severe", "te": "అవును / తీవ్రంగా ఉంది" },
    { "en": "No / Mild", "te": "లేదు / స్వల్పం" },
    { "en": "1 to 2 days", "te": "1-2 రోజులు" }
  ]
}

When providing final assessment:
{
  "done": true,
  "urgency": "EMERGENCY" | "URGENT_HIGH" | "ROUTINE_LOW",
  "conditionEn": "Suspected condition name in English",
  "conditionTe": "సమస్య పేరు తెలుగులో",
  "adviceEn": "Clear advice in English",
  "adviceTe": "స్పష్టమైన సలహా తెలుగులో",
  "precautionsEn": "Precautions in English",
  "precautionsTe": "తీసుకోవాల్సిన జాగ్రత్తలు తెలుగులో",
  "avoidEn": "What to avoid in English",
  "avoidTe": "చేయకూడనివి తెలుగులో",
  "ashaActionEn": "Specific clinical action plan for ASHA worker (e.g. Give ORS, monitor temp, refer to PHC)",
  "ashaActionTe": "ఆశా వర్కర్ చేయవలసిన నిర్దిష్ట పనులు (ఉదా: ఓఆర్ఎస్ ఇవ్వండి, పీహెచ్‌సీకి పంపండి)"
}`;

class AiTriageService {
  constructor() {
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('swasth_gemini_api_key') : '') || '';
  }

  hasApiKey() {
    return Boolean(this.geminiApiKey && this.geminiApiKey.trim().length > 0);
  }

  // Step 1: Screen emergency red flags immediately (offline safety)
  checkImmediateEmergency(symptomText) {
    if (!symptomText) return null;

    for (const trigger of NON_NEGOTIABLE_EMERGENCY_TRIGGERS) {
      if (trigger.triggerFn(symptomText)) {
        return {
          isEmergency: true,
          urgency: URGENCY_CLASSES.EMERGENCY,
          category: trigger.category,
          adviceEn: trigger.adviceEn,
          adviceTe: trigger.adviceTe,
          whyEn: `Emergency symptom detected: ${trigger.category}`,
          whyTe: `అత్యవసర లక్షణం గమనించబడింది (${trigger.category})`,
          ashaActionEn: 'Call 108 Ambulance immediately. Keep patient calm, monitor breathing, do not leave patient alone.',
          ashaActionTe: 'వెంటనే 108 అంబులెన్స్‌కు కాల్ చేయండి. రోగిని ఒంటరిగా వదలకండి, శ్వాసను గమనించండి.'
        };
      }
    }
    return null;
  }

  // Step 2 (Offline fallback): Match symptom to disease knowledge card
  getFollowUpQuestions(symptomText) {
    const textLower = (symptomText || '').toLowerCase();

    const emergency = this.checkImmediateEmergency(symptomText);
    if (emergency) {
      return {
        matchedCard: null,
        immediateEmergency: emergency,
        questions: []
      };
    }

    for (const card of DISEASE_KNOWLEDGE_CARDS) {
      const match = card.matchTerms.some(term => textLower.includes(term.toLowerCase()));
      if (match) {
        return {
          matchedCard: card,
          immediateEmergency: null,
          questions: card.questions
        };
      }
    }

    return {
      matchedCard: null,
      immediateEmergency: null,
      questions: GENERIC_DEFAULT_QUESTIONS
    };
  }

  // Step 3 (Offline fallback): Compute triage from MCQ answers
  computeTriageResult({ initialSymptom, matchedCard, answers = {} }) {
    const immediate = this.checkImmediateEmergency(initialSymptom);
    if (immediate) {
      return {
        urgency: URGENCY_CLASSES.EMERGENCY,
        matchedConditionEn: 'Emergency Presentation',
        matchedConditionTe: 'అత్యవసర పరిస్థితి',
        adviceEn: immediate.adviceEn,
        adviceTe: immediate.adviceTe,
        spokenEn: immediate.adviceEn,
        spokenTe: immediate.adviceTe,
        precautionsEn: 'Call 108 emergency services immediately. Sit upright, unlock door.',
        precautionsTe: 'వెంటనే 108కి కాల్ చేయండి. నిటారుగా కూర్చోండి, విశ్రాంతి తీసుకోండి.',
        avoidEn: 'Do not delay, do not drive yourself.',
        avoidTe: 'ఆలస్యం చేయవద్దు, స్వయంగా డ్రైవింగ్ చేయవద్దు.',
        ashaActionEn: immediate.ashaActionEn || 'Call 108 Ambulance immediately. Stay with patient.',
        ashaActionTe: immediate.ashaActionTe || 'వెంటనే 108 అంబులెన్స్‌కు కాల్ చేయండి. రోగి దగ్గరే ఉండండి.'
      };
    }

    let urgencyScore = 0;
    let hasEmergencyAnswer = false;
    const questions = matchedCard ? matchedCard.questions : GENERIC_DEFAULT_QUESTIONS;

    questions.forEach(q => {
      const selectedValue = answers[q.id];
      if (selectedValue) {
        const option = q.options.find(opt => opt.value === selectedValue);
        if (option) {
          urgencyScore += (option.urgencyDelta || 0);
          if (option.urgencyDelta >= 3) {
            hasEmergencyAnswer = true;
          }
        }
      }
    });

    let urgency = URGENCY_CLASSES.ROUTINE_LOW;
    if (hasEmergencyAnswer || urgencyScore >= 3) {
      urgency = URGENCY_CLASSES.EMERGENCY;
    } else if (urgencyScore >= 1) {
      urgency = URGENCY_CLASSES.URGENT_HIGH;
    }

    if (urgency.key === 'EMERGENCY') {
      return {
        urgency: URGENCY_CLASSES.EMERGENCY,
        matchedConditionEn: matchedCard ? matchedCard.conditionEn : 'Concerning Symptoms',
        matchedConditionTe: matchedCard ? matchedCard.conditionTe : 'తీవ్రమైన లక్షణాలు',
        adviceEn: 'Go to the nearest hospital now or call 108. Do not wait.',
        adviceTe: 'వెంటనే దగ్గరలోని ఆసుపత్రికి వెళ్లండి లేదా 108కి కాల్ చేయండి. ఆలస్యం చేయవద్దు.',
        spokenEn: 'Emergency alert. Please visit the nearest hospital or call 108 immediately.',
        spokenTe: 'అత్యవసర హెచ్చరిక! వెంటనే దగ్గరలోని ఆసుపత్రికి వెళ్లండి లేదా 108కి కాల్ చేయండి.',
        precautionsEn: matchedCard?.precautionsEn || 'Stop exertion, call emergency services immediately.',
        precautionsTe: matchedCard?.precautionsTe || 'వెంటనే విశ్రాంతి తీసుకోండి మరియు 108కి కాల్ చేయండి.',
        avoidEn: matchedCard?.avoidEn || 'Do not drive yourself, do not delay.',
        avoidTe: matchedCard?.avoidTe || 'ఆలస్యం చేయవద్దు, మీరే డ్రైవింగ్ చేయవద్దు.',
        ashaActionEn: 'Arrange immediate 108 transport to Community Health Centre / District Hospital.',
        ashaActionTe: 'వెంటనే 108 వాహనం ఏర్పాటు చేసి ఆసుపత్రికి తరలించండి.'
      };
    } else if (urgency.key === 'URGENT_HIGH') {
      return {
        urgency: URGENCY_CLASSES.URGENT_HIGH,
        matchedConditionEn: matchedCard ? matchedCard.conditionEn : 'Moderate Symptoms',
        matchedConditionTe: matchedCard ? matchedCard.conditionTe : 'మధ్యస్థ లక్షణాలు',
        adviceEn: 'See a doctor or ASHA worker within 1–2 days. Rest and drink fluids.',
        adviceTe: '1-2 రోజుల్లో డాక్టర్‌ని లేదా ఆశా వర్కర్‌ని సంప్రదించండి. విశ్రాంతి తీసుకోండి.',
        spokenEn: 'See a doctor or health worker within one to two days. Take rest and plenty of fluids.',
        spokenTe: 'ఒకటి లేదా రెండు రోజుల్లో డాక్టర్‌ని సంప్రదించండి. విశ్రాంతి తీసుకోండి, నీళ్లు ఎక్కువగా తాగండి.',
        precautionsEn: matchedCard?.precautionsEn || 'Stay well hydrated, rest, monitor fever and symptoms.',
        precautionsTe: matchedCard?.precautionsTe || 'నీళ్లు బాగా తాగండి, విశ్రాంతి తీసుకోండి, లక్షణాలను గమనించండి.',
        avoidEn: matchedCard?.avoidEn || 'Avoid self-medication without professional advice.',
        avoidTe: matchedCard?.avoidTe || 'డాక్టర్ సలహా లేకుండా ఇతర మందులు వాడవద్దు.',
        ashaActionEn: 'Issue PHC referral slip. Follow up in 24 hours. Advise fluids and rest.',
        ashaActionTe: 'పీహెచ్‌సీకి రెఫరల్ ఇవ్వండి. 24 గంటల తర్వాత మళ్ళీ రోగి పరిస్థితిని తనిఖీ చేయండి.'
      };
    } else {
      return {
        urgency: URGENCY_CLASSES.ROUTINE_LOW,
        matchedConditionEn: matchedCard ? matchedCard.conditionEn : 'Mild Symptoms',
        matchedConditionTe: matchedCard ? matchedCard.conditionTe : 'స్వల్ప లక్షణాలు',
        adviceEn: 'No urgent concern. Home care, fluids, and rest advised.',
        adviceTe: 'ఆందోళన లేదు. ఇంటి వద్దనే విశ్రాంతి తీసుకుని, నీళ్లు బాగా తాగండి.',
        spokenEn: 'No urgent concern. Take rest and drink warm water. Consult ASHA worker if symptoms increase.',
        spokenTe: 'ఆందోళన అవసరం లేదు. తగినంత విశ్రాంతి తీసుకోండి, కాచి చల్లార్చిన నీళ్లు తాగండి.',
        precautionsEn: matchedCard?.precautionsEn || 'Rest, drink safe boiled water, monitor condition.',
        precautionsTe: matchedCard?.precautionsTe || 'విశ్రాంతి తీసుకోండి, కాచి చల్లార్చిన నీళ్లు తాగండి.',
        avoidEn: matchedCard?.avoidEn || 'Avoid heavy exertion or unprescribed medicines.',
        avoidTe: matchedCard?.avoidTe || 'ఎక్కువ శ్రమ పడవద్దు, అవసరం లేని మందులు వేసుకోవద్దు.',
        ashaActionEn: 'Advise home care and ORS/fluids. Instruct family to call if fever/symptoms worsen.',
        ashaActionTe: 'ఇంటి సంరక్షణ మరియు ద్రవాలు సూచించండి. సమస్య పెరిగితే తెలియజేయమని చెప్పండి.'
      };
    }
  }

  // ──────────────────────────────────────────────
  // Gemini LLM Conversational Chatbot
  // ──────────────────────────────────────────────

  /**
   * Send a conversational message to Gemini and get the next question or final result.
   * @param {Array} conversationHistory - Array of { role: 'user'|'model', text }
   * @param {string} initialSymptom - The initial symptom description
   * @param {Object} patientContext - Metadata like role, patientName, patientAge, vitals
   * @returns {Object} Parsed JSON response from Gemini
   */
  async chatWithGemini(conversationHistory, initialSymptom, patientContext = {}) {
    if (!this.geminiApiKey) {
      throw new Error('No Gemini API key configured');
    }

    const contextPrefix = patientContext.userRole === 'asha'
      ? `[ASHA Worker Assisting Patient: ${patientContext.patientName || 'Unknown'}, Village: ${patientContext.patientVillage || 'Rural area'}, Age: ${patientContext.patientAge || 'Adult'}, Vitals/Notes: ${patientContext.vitals || 'None'}]`
      : `[Patient Self-Check]`;

    const contents = [];

    // System prompt with context
    contents.push({
      role: 'user',
      parts: [{
        text: `${GEMINI_SYSTEM_PROMPT}\n\nContext: ${contextPrefix}\nInitial Symptom Description: "${initialSymptom}"\n\nAsk your first follow-up question in the requested JSON format with 2-4 quick response options.`
      }]
    });

    if (conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      }
    }

    // Fallback models in priority order
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
                maxOutputTokens: 1024
              }
            })
          }
        );

        if (!res.ok) {
          const errorBody = await res.text();
          console.warn(`Model ${model} returned ${res.status}, trying fallback...`, errorBody);
          lastError = new Error(`Gemini API error ${res.status}: ${errorBody}`);
          continue;
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error('Empty response from Gemini');
        }

        // Safe JSON parsing
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (err) {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          } else {
            throw err;
          }
        }

        // If done, map urgency
        if (parsed.done) {
          const urgencyObj = URGENCY_CLASSES[parsed.urgency] || URGENCY_CLASSES.ROUTINE_LOW;
          return {
            done: true,
            urgency: urgencyObj,
            matchedConditionEn: parsed.conditionEn || 'Assessment Complete',
            matchedConditionTe: parsed.conditionTe || 'సమగ్ర అంచనా',
            adviceEn: parsed.adviceEn,
            adviceTe: parsed.adviceTe,
            spokenEn: parsed.adviceEn,
            spokenTe: parsed.adviceTe,
            precautionsEn: parsed.precautionsEn || '',
            precautionsTe: parsed.precautionsTe || '',
            avoidEn: parsed.avoidEn || '',
            avoidTe: parsed.avoidTe || '',
            ashaActionEn: parsed.ashaActionEn || 'Follow standard village health protocol and refer if symptoms persist.',
            ashaActionTe: parsed.ashaActionTe || 'గ్రామ ఆరోగ్య నియమాలను పాటించండి మరియు అవసరమైతే పీహెచ్‌సీకి పంపండి.',
            rawResponse: rawText
          };
        }

        // Not done — return question with options
        const defaultOptions = [
          { en: 'Yes / Severe', te: 'అవును / తీవ్రంగా ఉంది' },
          { en: 'No / Mild', te: 'లేదు / స్వల్పం' },
          { en: 'Not sure', te: 'ఖచ్చితంగా తెలియదు' }
        ];

        return {
          done: false,
          questionEn: parsed.questionEn,
          questionTe: parsed.questionTe,
          options: (Array.isArray(parsed.options) && parsed.options.length > 0) ? parsed.options : defaultOptions,
          rawResponse: rawText
        };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }
}

export const aiTriageService = new AiTriageService();
