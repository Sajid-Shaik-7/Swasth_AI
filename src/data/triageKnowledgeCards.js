// Swasth AI Clinical Knowledge Cards & Triage Matrix
// Bilingual: English and Telugu (తెలుగు)

export const URGENCY_CLASSES = {
  EMERGENCY: {
    key: 'EMERGENCY',
    labelEn: 'Emergency',
    labelTe: 'అత్యవసరం',
    tier: 'red',
    icon: '✚',
    badgeClass: 'tier-red',
    emergencyCall: '108',
    descriptionEn: 'Possible immediate threat to life, organ function, or safety. Immediate emergency care required.',
    descriptionTe: 'ప్రాణాపాయం లేదా తీవ్రమైన ప్రమాదం ఉండే అవకాశం ఉంది. ఆలస్యం చేయకుండా వెంటనే ఆసుపత్రికి వెళ్లండి.'
  },
  URGENT_HIGH: {
    key: 'URGENT_HIGH',
    labelEn: 'Medium / Urgent',
    labelTe: 'మధ్యస్థం / తక్షణ వైద్యం',
    tier: 'amber',
    icon: '⚠️',
    badgeClass: 'tier-amber',
    descriptionEn: 'Needs same-day or prompt clinical assessment. Contact a doctor or health worker.',
    descriptionTe: '1-2 రోజుల్లో లేదా ఈరోజే డాక్టర్‌ని లేదా ఆశా వర్కర్‌ని సంప్రదించండి. విశ్రాంతి తీసుకోండి.'
  },
  ROUTINE_LOW: {
    key: 'ROUTINE_LOW',
    labelEn: 'Normal / Mild',
    labelTe: 'సాధారణం / స్వల్పం',
    tier: 'green',
    icon: '🌿',
    badgeClass: 'tier-green',
    descriptionEn: 'Mild, stable symptoms without red flags. Conservative home care & monitoring advised.',
    descriptionTe: 'ఆందోళన లేదు. ఇంటి సంరక్షణ, తగినంత విశ్రాంతి మరియు నీళ్లు తాగడం సరిపోతాయి.'
  },
  INSUFFICIENT_INFORMATION: {
    key: 'INSUFFICIENT_INFORMATION',
    labelEn: 'More Info Needed',
    labelTe: 'మరింత సమాచారం అవసరం',
    tier: 'amber',
    icon: '❓',
    badgeClass: 'tier-amber',
    descriptionEn: 'Available information is limited. Please answer the short follow-up questions.',
    descriptionTe: 'సరైన సలహా ఇవ్వడానికి దయచేసి క్రింది ప్రశ్నలకు సమాధానం ఇవ్వండి.'
  }
};

export const NON_NEGOTIABLE_EMERGENCY_TRIGGERS = [
  {
    category: 'Breathing & Circulation',
    keywords: ['breathing', 'breathless', 'gasping', 'choking', 'blue lips', 'chest pain', 'chest pressure', 'heart', 'collapse', 'fainting', 'గుండెనొప్పి', 'శ్వాస', 'దగ్గుతో ఆయాసం', 'నీలి పెదవులు', 'స్పృహ తప్పడం'],
    triggerFn: (text) => /(chest pain|chest pressure|crushing|radiat|gasping|cannot speak|blue lips|faint|collapse|గుండెనొప్పి|ఛాతీ నొప్పి|శ్వాస ఆడకపోవడం|స్పృహ తప్పి)/i.test(text),
    adviceEn: 'Possible heart or breathing emergency. Stop exertion, sit upright, and call 108 / 112 immediately.',
    adviceTe: 'గుండె లేదా శ్వాస సంబంధిత అత్యవసర పరిస్థితి. వెంటనే 108కి కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్లండి.'
  },
  {
    category: 'Neurological / Stroke',
    keywords: ['stroke', 'face droop', 'weakness', 'paralysis', 'slurred speech', 'seizure', 'fits', 'thunderclap headache', 'పక్షవాతం', 'ముఖం వంకర', 'మాట తడబడటం', 'ఫిట్స్', 'తీవ్రమైన తలనొప్పి'],
    triggerFn: (text) => /(stroke|face droop|one.sided|speech difficulty|slurred|seizure|convulsion|paralysis|పక్షవాతం|ముఖం వంకర|మాట ముద్ద|ఫిట్స్|మూర్ఛ)/i.test(text),
    adviceEn: 'Possible stroke or neurological emergency (FAST). Note time and call 108 emergency immediately.',
    adviceTe: 'పక్షవాతం లేదా మెదడు సంబంధిత అత్యవసరం కావచ్చు. సమయం గమనించి వెంటనే 108కి కాల్ చేయండి.'
  },
  {
    category: 'Allergy / Anaphylaxis',
    keywords: ['allergy', 'tongue swelling', 'throat tight', 'wheezing', 'hives', 'కీటకం కుట్టడం', 'నాలుక వాపు', 'గొంతు బిగుతు'],
    triggerFn: (text) => /(tongue swell|throat tight|anaphylaxis|swollen throat|నాలుక వాపు|గొంతు వాపు|ఊపిరి ఆడకపోవడం)/i.test(text),
    adviceEn: 'Severe allergic reaction (Anaphylaxis). Use epinephrine if prescribed and get immediate emergency care.',
    adviceTe: 'తీవ్రమైన అలెర్జీ సమస్య. ఆలస్యం చేయకుండా వెంటనే ఎమర్జెన్సీ ఆసుపత్రికి వెళ్లండి.'
  },
  {
    category: 'Severe Systemic / Mental Health',
    keywords: ['poison', 'chemical', 'bleeding heavy', 'suicide', 'self harm', 'విషం', 'పురుగుల మందు', 'తీవ్ర రక్తస్రావం', 'ఆత్మహత్య ఆలోచనలు'],
    triggerFn: (text) => /(poison|overdose|heavy bleed|suicid|harm myself|విషం|పురుగుల మందు|రక్తం ఆగడం లేదు|ఆత్మహత్య)/i.test(text),
    adviceEn: 'Immediate danger. Contact emergency services or crisis helpline immediately. Do not stay alone.',
    adviceTe: 'అత్యంత ప్రమాదకరం. వెంటనే 108 లేదా హెల్ప్‌లైన్‌కు కాల్ చేయండి. ఒంటరిగా ఉండవద్దు.'
  }
];

export const DISEASE_KNOWLEDGE_CARDS = [
  {
    id: 'fever_infection',
    conditionEn: 'Fever or Infection',
    conditionTe: 'జ్వరం లేదా ఇన్ఫెక్షన్',
    aliases: ['fever', 'temperature', 'chills', 'cold', 'infection', 'జ్వరం', 'చలి జ్వరం', 'ఒళ్లు నొప్పులు'],
    matchTerms: ['fever', 'temp', 'chills', 'shivering', 'జ్వరం', 'వేడిగా ఉంది', 'చలి'],
    questions: [
      {
        id: 'fever_days',
        qEn: 'Since how many days do you have the fever?',
        qTe: 'జ్వరం ఎన్ని రోజులుగా ఉంది?',
        options: [
          { en: '1 day', te: '1 రోజు', value: '1_day', urgencyDelta: 0 },
          { en: '2-3 days', te: '2-3 రోజులు', value: '2_3_days', urgencyDelta: 1 },
          { en: '4+ days (High)', te: '4+ రోజులు (ఎక్కువ)', value: '4_plus_days', urgencyDelta: 2 }
        ]
      },
      {
        id: 'fever_breathing',
        qEn: 'Do you have difficulty breathing, stiff neck, or vomiting?',
        qTe: 'శ్వాస తీసుకోవడంలో ఇబ్బంది లేదా వాంతులు ఉన్నాయా?',
        options: [
          { en: 'No, none of these', te: 'లేదు, ఏమీ లేవు', value: 'none', urgencyDelta: 0 },
          { en: 'Mild cough only', te: 'స్వల్ప దగ్గు మాత్రమే', value: 'mild_cough', urgencyDelta: 0 },
          { en: 'Yes, severe / stiff neck', te: 'అవును, తీవ్రంగా ఉంది', value: 'severe', urgencyDelta: 3 }
        ]
      },
      {
        id: 'fever_fluid',
        qEn: 'Are you able to drink water and liquids normally?',
        qTe: 'నీళ్లు మరియు ద్రవపదార్థాలు సరిగ్గా తీసుకోగలుగుతున్నారా?',
        options: [
          { en: 'Yes, drinking well', te: 'అవును, బాగానే తాగుతున్నాను', value: 'good_fluid', urgencyDelta: 0 },
          { en: 'Low intake / dry mouth', te: 'తక్కువగా తాగుతున్నాను', value: 'low_fluid', urgencyDelta: 1 },
          { en: 'Unable to keep fluids down', te: 'ఏమీ తాగలేకపోతున్నాను', value: 'cannot_drink', urgencyDelta: 2 }
        ]
      }
    ],
    precautionsEn: 'Take plenty of fluids (ORS, coconut water, clean boiled water), rest well, monitor temperature.',
    precautionsTe: 'ఎక్కువగా నీళ్లు, ఓఆర్ఎస్ (ORS), కొబ్బరినీళ్లు తాగండి. బాగా విశ్రాంతి తీసుకోండి.',
    avoidEn: 'Do not self-start antibiotics or combine multiple paracetamol/pain relief medicines.',
    avoidTe: 'డాక్టర్ సలహా లేకుండా యాంటీబయాటిక్స్ వాడవద్దు. అధిక మోతాదులో మందులు వేసుకోవద్దు.',
    routineAdviceEn: 'Mild fever. Rest, hydrate, and monitor. See a health worker if fever exceeds 3 days.',
    routineAdviceTe: 'స్వల్ప జ్వరం. విశ్రాంతి తీసుకోండి, నీళ్లు బాగా తాగండి. 3 రోజులు దాటితే ఆశా వర్కర్‌ని కలవండి.',
    urgentAdviceEn: 'Fever persisting or moderate symptoms. Visit Primary Health Centre (PHC) or doctor in 1-2 days.',
    urgentAdviceTe: 'జ్వరం కొనసాగుతోంది. 1-2 రోజుల్లో దగ్గర్లోని ప్రాథమిక ఆరోగ్య కేంద్రం (PHC) లేదా డాక్టర్‌ని సంప్రదించండి.'
  },
  {
    id: 'chest_heart',
    conditionEn: 'Chest Discomfort / Heart Attack Signs',
    conditionTe: 'ఛాతీ నొప్పి / గుండె సంబంధిత లక్షణాలు',
    aliases: ['chest pain', 'heart pain', 'chest tightness', 'sweating pain', 'గుండెనొప్పి', 'ఛాతీలో బరువు'],
    matchTerms: ['chest', 'heart', 'angina', 'left arm pain', 'గుండె', 'ఛాతీ', 'రొమ్ము నొప్పి'],
    questions: [
      {
        id: 'chest_spread',
        qEn: 'Is the pain spreading to your left arm, jaw, neck, or back?',
        qTe: 'నొప్పి ఎడమ చేతికి, దవడకు లేదా వెనుకకు పాకుతోందా?',
        options: [
          { en: 'Yes, spreading', te: 'అవును, పాకుతోంది', value: 'spreading', urgencyDelta: 3 },
          { en: 'No, localized only', te: 'లేదు, ఇక్కడే ఉంది', value: 'localized', urgencyDelta: 1 },
          { en: 'Mild burning / acidity', te: 'తేలికపాటి గ్యాస్ మంట', value: 'acidity', urgencyDelta: 0 }
        ]
      },
      {
        id: 'chest_sweat',
        qEn: 'Are you experiencing cold sweat, dizziness, or shortness of breath?',
        qTe: 'చెమటలు పట్టడం, కళ్లు తిరగడం లేదా ఆయాసం ఉందా?',
        options: [
          { en: 'Yes, heavy sweating/breathless', te: 'అవును, చమటలు / ఆయాసం', value: 'sweating_breathless', urgencyDelta: 3 },
          { en: 'Slight discomfort only', te: 'స్వల్ప అసౌకర్యం మాత్రమే', value: 'mild', urgencyDelta: 1 },
          { en: 'No', te: 'లేదు', value: 'none', urgencyDelta: 0 }
        ]
      }
    ],
    precautionsEn: 'Stop all exertion, sit upright, unlock door, call emergency 108 immediately.',
    precautionsTe: 'నడవడం ఆపండి, నిటారుగా కూర్చోండి, వెంటనే 108 ఎమర్జెన్సీకి కాల్ చేయండి.',
    avoidEn: 'Do not drive yourself. Do not delay waiting to see if severe chest pain passes.',
    avoidTe: 'మీరే స్వయంగా డ్రైవింగ్ చేయవద్దు. నొప్పి తగ్గుతుందేమో అని ఇంట్లోనే వేచి ఉండవద్దు.'
  },
  {
    id: 'respiratory_cough',
    conditionEn: 'Cough, Cold & Breathing Issue',
    conditionTe: 'దగ్గు, జలుబు మరియు శ్వాస సమస్య',
    aliases: ['cough', 'cold', 'sore throat', 'wheezing', 'asthma', 'దగ్గు', 'జలుబు', 'గొంతునొప్పి', 'ఆయాసం'],
    matchTerms: ['cough', 'cold', 'phlegm', 'wheeze', 'breath', 'దగ్గు', 'జలుబు', 'కఫం', 'గొంతు'],
    questions: [
      {
        id: 'breath_speech',
        qEn: 'Can you speak full sentences without gasping for breath?',
        qTe: 'ఆయాసం లేకుండా పూర్తిగా మాట్లాడగలుగుతున్నారా?',
        options: [
          { en: 'Yes, speaking normally', te: 'అవును, మాట్లాడగలుగుతున్నాను', value: 'normal_speech', urgencyDelta: 0 },
          { en: 'Slightly out of breath', te: 'కొద్దిగా ఆయాసం వస్తోంది', value: 'mild_dyspnea', urgencyDelta: 1 },
          { en: 'No, struggling to speak', te: 'లేదు, మాట్లాడలేకపోతున్నాను', value: 'gasping', urgencyDelta: 3 }
        ]
      },
      {
        id: 'cough_duration',
        qEn: 'How long have you had this cough/cold?',
        qTe: 'ఈ దగ్గు లేదా జలుబు ఎన్ని రోజులుగా ఉంది?',
        options: [
          { en: '1 to 3 days', te: '1 నుండి 3 రోజులు', value: 'few_days', urgencyDelta: 0 },
          { en: '1 to 2 weeks', te: '1 నుండి 2 వారాలు', value: 'weeks', urgencyDelta: 1 },
          { en: 'More than 2 weeks', te: '2 వారాల కంటే ఎక్కువ', value: 'chronic', urgencyDelta: 2 }
        ]
      }
    ],
    precautionsEn: 'Drink warm water, take steam inhalation, rest, keep distance from elderly/infants.',
    precautionsTe: 'గోరువెచ్చని నీళ్లు తాగండి, ఆవిరి పట్టండి, మంచి విశ్రాంతి తీసుకోండి.',
    avoidEn: 'Avoid cold beverages, smoking, and lying flat if breathless.',
    avoidTe: 'చల్లని పదార్థాలు తాగవద్దు. పొగత్రాగవద్దు. ఆయాసం ఉన్నప్పుడు వెల్లకిలా పడుకోవద్దు.'
  },
  {
    id: 'stomach_diarrhea',
    conditionEn: 'Stomach Pain, Vomiting & Diarrhea',
    conditionTe: 'కడుపునొప్పి, వాంతులు మరియు విరేచనాలు',
    aliases: ['stomach', 'vomiting', 'diarrhea', 'loose motions', 'belly pain', 'కడుపునొప్పి', 'వాంతులు', 'విరేచనాలు'],
    matchTerms: ['stomach', 'vomit', 'diarrhea', 'loose motion', 'motions', 'కడుపు', 'వాంతి', 'మోషన్స్', 'విరేచనాలు'],
    questions: [
      {
        id: 'stomach_severity',
        qEn: 'Is there blood in stool/vomit or severe rigid stomach pain?',
        qTe: 'వాంతులు లేదా విరేచనాల్లో రక్తం పడుతోందా? కడుపు గట్టిగా బిగుసుకుపోయిందా?',
        options: [
          { en: 'No blood, mild pain', te: 'రక్తం లేదు, మామూలు నొప్పి', value: 'mild', urgencyDelta: 0 },
          { en: 'Frequent loose motions', te: 'ఎక్కువసార్లు విరేచనాలు', value: 'frequent', urgencyDelta: 1 },
          { en: 'Yes, blood or severe pain', te: 'అవును, రక్తం లేదా తీవ్ర నొప్పి', value: 'severe_blood', urgencyDelta: 3 }
        ]
      },
      {
        id: 'dehydration_signs',
        qEn: 'Are you feeling very dizzy, fainting, or having zero urination?',
        qTe: 'కళ్లు తిరగడం లేదా మూత్రం అస్సలు రాకపోవడం జరుగుతోందా?',
        options: [
          { en: 'No, urinating normally', te: 'లేదు, మూత్రం బాగానే వస్తోంది', value: 'normal_urine', urgencyDelta: 0 },
          { en: 'Reduced urine & thirst', te: 'తక్కువ మూత్రం, ఎక్కువ దాహం', value: 'mild_dehyd', urgencyDelta: 1 },
          { en: 'Severe weakness / no urine', te: 'తీవ్ర నీరసం / మూత్రం రాలేదు', value: 'severe_dehyd', urgencyDelta: 2 }
        ]
      }
    ],
    precautionsEn: 'Take small frequent sips of ORS (జీవనజలం), tender coconut water, and rice kanji.',
    precautionsTe: 'తరచుగా ఓఆర్ఎస్ (ORS - జీవనజలం), కొబ్బరినీళ్లు, గంజి కొద్దికొద్దిగా తాగండి.',
    avoidEn: 'Avoid roadside unsafe water, spicy foods, or stopping oral fluids.',
    avoidTe: 'కలుషిత నీరు, మసాలాలు తినవద్దు. నీళ్లు తాగడం ఆపవద్దు.'
  },
  {
    id: 'headache_neuro',
    conditionEn: 'Headache & Neurological Symptoms',
    conditionTe: 'తలనొప్పి మరియు నరాల సంబంధిత సమస్యలు',
    aliases: ['headache', 'migraine', 'dizziness', 'head pain', 'తలనొప్పి', 'తెలనొప్పి', 'తెల తిరగడం'],
    matchTerms: ['headache', 'head pain', 'migraine', 'తలనొప్పి', 'తలకు నొప్పి', 'నరం'],
    questions: [
      {
        id: 'headache_type',
        qEn: 'Is this a sudden "worst-ever" thunderclap headache or sudden weakness?',
        qTe: 'ఇది హఠాత్తుగా వచ్చిన తీవ్రమైన తలనొప్పా లేక చేయి/కాలు బలహీనత ఉందా?',
        options: [
          { en: 'No, normal familiar headache', te: 'లేదు, మామూలు తలనొప్పి', value: 'routine', urgencyDelta: 0 },
          { en: 'Throbbing / one-sided (Migraine)', te: 'ఒకవైపు తీవ్రంగా లాగుతోంది', value: 'migraine', urgencyDelta: 1 },
          { en: 'Yes, sudden unbearable / weakness', te: 'అవును, భరించలేని నొప్పి / బలహీనత', value: 'thunderclap', urgencyDelta: 3 }
        ]
      }
    ],
    precautionsEn: 'Rest in a quiet, dark room, stay hydrated, apply cool compress.',
    precautionsTe: 'చీకటిగా, ప్రశాంతంగా ఉన్న గదిలో విశ్రాంతి తీసుకోండి. నీళ్లు బాగా తాగండి.',
    avoidEn: 'Avoid excessive painkiller overuse, staring at bright screens, or driving when dizzy.',
    avoidTe: 'ఎక్కువ మోతాదులో మాత్రలు వేసుకోవద్దు. మొబైల్ స్క్రీన్ చూడవద్దు.'
  }
];

export const GENERIC_DEFAULT_QUESTIONS = [
  {
    id: 'gen_duration',
    qEn: 'Since how many days are you experiencing this?',
    qTe: 'ఈ సమస్య ఎన్ని రోజులుగా ఉంది?',
    options: [
      { en: 'Just started today', te: 'ఈరోజే మొదలైంది', value: 'today', urgencyDelta: 0 },
      { en: '2 to 3 days', te: '2 నుండి 3 రోజులు', value: '2_3_days', urgencyDelta: 1 },
      { en: 'More than a week', te: 'వారం కంటే ఎక్కువ', value: 'chronic', urgencyDelta: 1 }
    ]
  },
  {
    id: 'gen_severity',
    qEn: 'How severe is the discomfort right now?',
    qTe: 'ఇబ్బంది ఎంత తీవ్రంగా ఉంది?',
    options: [
      { en: 'Mild, able to do routine work', te: 'స్వల్పం, పనులు చేసుకోగలుగుతున్నాను', value: 'mild', urgencyDelta: 0 },
      { en: 'Moderate, need bed rest', te: 'మధ్యస్థం, విశ్రాంతి అవసరం', value: 'moderate', urgencyDelta: 1 },
      { en: 'Severe / Unbearable', te: 'చాలా తీవ్రం / భరించలేకపోతున్నాను', value: 'severe', urgencyDelta: 3 }
    ]
  }
];
