// AI Medical Triage Service
// Implements the clinical triage algorithm with Telugu & English support

import {
  URGENCY_CLASSES,
  NON_NEGOTIABLE_EMERGENCY_TRIGGERS,
  DISEASE_KNOWLEDGE_CARDS,
  GENERIC_DEFAULT_QUESTIONS
} from '../data/triageKnowledgeCards';

class AiTriageService {
  constructor() {
    this.geminiApiKey = localStorage.getItem('swasth_gemini_api_key') || '';
  }

  setApiKey(key) {
    this.geminiApiKey = key;
    localStorage.setItem('swasth_gemini_api_key', key);
  }

  getApiKey() {
    return this.geminiApiKey;
  }

  // Step 1: Screen emergency red flags immediately
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
          whyEn: `Emergency symptom detected in category: ${trigger.category}`,
          whyTe: `అత్యవసర లక్షణం గమనించబడింది (${trigger.category})`
        };
      }
    }
    return null;
  }

  // Step 2: Match symptom to disease knowledge card or return generic questions
  getFollowUpQuestions(symptomText) {
    const textLower = (symptomText || '').toLowerCase();

    // Check emergency first
    const emergency = this.checkImmediateEmergency(symptomText);
    if (emergency) {
      return {
        matchedCard: null,
        immediateEmergency: emergency,
        questions: []
      };
    }

    // Match against knowledge cards
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

    // Fallback to generic follow-up
    return {
      matchedCard: null,
      immediateEmergency: null,
      questions: GENERIC_DEFAULT_QUESTIONS
    };
  }

  // Step 3: Compute final triage result based on answered follow-up questions
  computeTriageResult({ initialSymptom, matchedCard, answers = {} }) {
    // 1. Double check emergency red flags
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
        avoidTe: 'ఆలస్యం చేయవద్దు, స్వయంగా డ్రైవింగ్ చేయవద్దు.'
      };
    }

    // 2. Calculate score from answer options
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

    // 3. Classify tier
    let urgency = URGENCY_CLASSES.ROUTINE_LOW;
    if (hasEmergencyAnswer || urgencyScore >= 3) {
      urgency = URGENCY_CLASSES.EMERGENCY;
    } else if (urgencyScore >= 1) {
      urgency = URGENCY_CLASSES.URGENT_HIGH;
    }

    // 4. Formulate condition advice
    if (urgency.key === 'EMERGENCY') {
      return {
        urgency: URGENCY_CLASSES.EMERGENCY,
        matchedConditionEn: matchedCard ? matchedCard.conditionEn : 'Concerning Symptoms',
        matchedConditionTe: matchedCard ? matchedCard.conditionTe : 'తీవ్రమైన లక్షణాలు',
        adviceEn: 'Go to the nearest hospital now or call 108. Do not wait.',
        adviceTe: 'వెంటనే దగ్గరలోని ఆసుపత్రికి వెళ్లండి లేదా 108కి కాల్ చేయండి. ఆలస్యం చేయవద్దు.',
        spokenEn: 'Emergency alert. Please visit the nearest hospital or call 108 immediately. Do not delay.',
        spokenTe: 'అత్యవసర హెచ్చరిక! వెంటనే దగ్గరలోని ఆసుపత్రికి వెళ్లండి లేదా 108కి కాల్ చేయండి. ఆలస్యం చేయవద్దు.',
        precautionsEn: matchedCard?.precautionsEn || 'Stop exertion, call emergency services immediately.',
        precautionsTe: matchedCard?.precautionsTe || 'వెంటనే విశ్రాంతి తీసుకోండి మరియు 108కి కాల్ చేయండి.',
        avoidEn: matchedCard?.avoidEn || 'Do not drive yourself, do not delay.',
        avoidTe: matchedCard?.avoidTe || 'ఆలస్యం చేయవద్దు, మీరే డ్రైవింగ్ చేయవద్దు.'
      };
    } else if (urgency.key === 'URGENT_HIGH') {
      return {
        urgency: URGENCY_CLASSES.URGENT_HIGH,
        matchedConditionEn: matchedCard ? matchedCard.conditionEn : 'Moderate Symptoms',
        matchedConditionTe: matchedCard ? matchedCard.conditionTe : 'మధ్యస్థ లక్షణాలు',
        adviceEn: 'See a doctor or ASHA worker within 1–2 days. Rest and drink fluids until then.',
        adviceTe: '1-2 రోజుల్లో డాక్టర్‌ని లేదా ఆశా వర్కర్‌ని సంప్రదించండి. విశ్రాంతి తీసుకోండి, నీళ్లు ఎక్కువ తాగండి.',
        spokenEn: 'See a doctor or health worker within one to two days. Take rest and plenty of fluids.',
        spokenTe: 'ఒకటి లేదా రెండు రోజుల్లో డాక్టర్‌ని సంప్రదించండి. అప్పటివరకు విశ్రాంతి తీసుకోండి, నీళ్లు ఎక్కువగా తాగండి.',
        precautionsEn: matchedCard?.precautionsEn || 'Stay well hydrated, rest, monitor fever and symptoms.',
        precautionsTe: matchedCard?.precautionsTe || 'నీళ్లు బాగా తాగండి, విశ్రాంతి తీసుకోండి, లక్షణాలను గమనించండి.',
        avoidEn: matchedCard?.avoidEn || 'Avoid self-medication without professional advice.',
        avoidTe: matchedCard?.avoidTe || 'డాక్టర్ సలహా లేకుండా ఇతర మందులు వాడవద్దు.'
      };
    } else {
      return {
        urgency: URGENCY_CLASSES.ROUTINE_LOW,
        matchedConditionEn: matchedCard ? matchedCard.conditionEn : 'Mild Symptoms',
        matchedConditionTe: matchedCard ? matchedCard.conditionTe : 'స్వల్ప లక్షణాలు',
        adviceEn: 'No urgent concern. Home care, fluids, and rest advised. Escalate if symptoms worsen.',
        adviceTe: 'ఆందోళన లేదు. ఇంటి వద్దనే విశ్రాంతి తీసుకుని, నీళ్లు బాగా తాగండి. లక్షణాలు పెరిగితే డాక్టర్‌ని కలవండి.',
        spokenEn: 'No urgent concern. Take rest, drink warm water and fluids. Consult a health worker if symptoms worsen.',
        spokenTe: 'ఆందోళన అవసరం లేదు. తగినంత విశ్రాంతి తీసుకోండి, మంచి నీళ్లు తాగండి. ఇబ్బంది ఎక్కువైతే ఆశా వర్కర్‌ని కలవండి.',
        precautionsEn: matchedCard?.precautionsEn || 'Rest, drink safe boiled water, monitor condition.',
        precautionsTe: matchedCard?.precautionsTe || 'విశ్రాంతి తీసుకోండి, కాచి చల్లార్చిన నీళ్లు తాగండి.',
        avoidEn: matchedCard?.avoidEn || 'Avoid heavy exertion or unprescribed medicines.',
        avoidTe: matchedCard?.avoidTe || 'ఎక్కువ శ్రమ పడవద్దు, అవసరం లేని మందులు వేసుకోవద్దు.'
      };
    }
  }

  // Step 4: Optional Gemini API cloud triage call
  async callGeminiTriage({ symptom, answers = [] }) {
    if (!this.geminiApiKey) return null;

    try {
      const prompt = `You are Swasth AI, an educational clinical triage assistant for rural Indian health.
Follow this safety policy strictly:
1. Urgency classes: EMERGENCY, URGENT_HIGH, ROUTINE_LOW.
2. In India, emergency is 108 / 112.
3. User Symptom: "${symptom}".
4. Follow-up answers: ${JSON.stringify(answers)}.

Respond in JSON format only with this schema:
{
  "urgency": "EMERGENCY" | "URGENT_HIGH" | "ROUTINE_LOW",
  "conditionEn": string,
  "conditionTe": string,
  "adviceEn": string,
  "adviceTe": string,
  "precautionsEn": string,
  "precautionsTe": string,
  "avoidEn": string,
  "avoidTe": string
}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(text);

      const urgencyObj = URGENCY_CLASSES[parsed.urgency] || URGENCY_CLASSES.ROUTINE_LOW;

      return {
        urgency: urgencyObj,
        matchedConditionEn: parsed.conditionEn,
        matchedConditionTe: parsed.conditionTe,
        adviceEn: parsed.adviceEn,
        adviceTe: parsed.adviceTe,
        spokenEn: parsed.adviceEn,
        spokenTe: parsed.adviceTe,
        precautionsEn: parsed.precautionsEn,
        precautionsTe: parsed.precautionsTe,
        avoidEn: parsed.avoidEn,
        avoidTe: parsed.avoidTe
      };
    } catch (e) {
      console.warn('Gemini cloud triage failed, falling back to clinical rules engine:', e);
      return null;
    }
  }
}

export const aiTriageService = new AiTriageService();
