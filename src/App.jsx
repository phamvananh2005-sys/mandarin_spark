import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  Upload, User, Volume2, Volume1, Download, Star, Award, MessageSquare,
  RefreshCcw, CheckCircle2, Mic, Square, ChevronRight,
  BookOpen, MessageCircle, Eye, EyeOff, ShieldCheck, Sparkles, BookA,
  Lock, LogOut, Plus, Save, X, Info, Trash2, Activity, Globe
} from 'lucide-react';
import { supabase } from './supabase';
import bg from './assets/bg.jpg';

const normalizeShadowingLevel = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  if (/^HSK\s*([1-6])$/.test(raw) || /^HSK[1-6]$/.test(raw)) return raw.replace(/\s+/g, '');
  if (/^[1-6]$/.test(raw)) return `HSK${raw}`;
  if (/^LEVEL\s*([1-6])$/.test(raw)) return `HSK${raw.match(/^LEVEL\s*([1-6])$/)[1]}`;
  return raw;
};

const normalizeShadowingType = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!raw) return '';
  if (['sentence', 'sentences', '句子', 'câu văn', 'cau van', 'cauvan'].includes(raw)) return 'sentence';
  if (['vocab', 'vocabulary', '词汇', 'từ vựng', 'tu vung', 'tuvung'].includes(raw)) return 'vocab';
  return raw;
};

const matchesShadowingType = (itemType, selectedType) => {
  const typeA = normalizeShadowingType(itemType);
  const typeB = normalizeShadowingType(selectedType);
  if (!typeB) return true;
  if (!typeA) return true;
  return typeA === typeB || typeA.includes(typeB) || typeB.includes(typeA);
};

const normalizePublished = (value) => {
  if (value === true || value === 1 || String(value || '').trim().toLowerCase() === 'true' || String(value || '').trim() === '1') return true;
  return false;
};

const normalizeDbItem = (item) => {
  const titleHint = String(item.title || '').toLowerCase();
  const typeFallback = titleHint.includes('từ vựng') || titleHint.includes('词汇') ? 'vocab' : titleHint.includes('câu văn') || titleHint.includes('句子') ? 'sentence' : 'vocab';
  return {
    ...item,
    isPublished: normalizePublished(item.isPublished ?? item.ispublished ?? item.is_published ?? item.published),
    level: normalizeShadowingLevel(item.level || item.Level || item.hskLevel || item.hsk_level || item.levels || ''),
    type: normalizeShadowingType(item.type || item.Type || item.category || item.kind || typeFallback),
    items: typeof item.items === 'string' ? JSON.parse(item.items) : (Array.isArray(item.items) ? item.items : [])
  };
};

const toDbItem = ({ isPublished, ispublished, is_published, published, ...item }) => ({
  ...item,
  ispublished: isPublished ?? ispublished ?? is_published ?? published ?? false
});

// --- PHÁT HIỆN NGÔN NGỮ ---
const detectLanguageViolation = (transcript) => {
  if (!transcript || transcript.trim().length === 0) return null;

  // Regex để kiểm tra ký tự Hán tạo (CJK)
  const chineseRegex = /[\u4E00-\u9FFF\u3400-\u4DBF]/g;
  const chineseChars = transcript.match(chineseRegex) || [];
  const chineseRatio = chineseChars.length / transcript.length;

  // Nếu ít hơn 20% là ký tự Hán, có thể người dùng không nói tiếng Trung
  if (chineseRatio < 0.2) {
    // Kiểm tra xem có chứa từ Việt hoặc tiếng Anh thường gặp
    const vietnamesePatterns = /\b(tôi|bạn|không|được|nói|đây|kia|cái|chiếc|người|có|là|và|hay|hoặc|nhưng|nếu|thì|để|từ|trong|trên|dưới|ngôn|ngữ|tiếng|việt)\b/i;
    const englishPatterns = /\b(i|you|the|and|or|but|is|are|was|were|be|have|has|do|does|can|could|will|would|should|must|hello|hi|thanks|please|sorry|what|where|when|why|how)\b/i;

    const hasVietnamese = vietnamesePatterns.test(transcript);
    const hasEnglish = englishPatterns.test(transcript);

    if (hasVietnamese || hasEnglish) {
      return {
        violated: true,
        language: hasVietnamese ? 'Vietnamese' : 'English',
        ratio: chineseRatio
      };
    }
  }

  return null;
};

// --- HỆ THỐNG ĐA NGÔN NGỮ (i18n) ---
const dict = {
  vi: {
    welcome: "Chào mừng đến với Mandarin Spark",
    subtitle: "Hệ thống luyện nói và phát âm tiếng Trung (Mandarin) thông minh tích hợp AI.",
    step1: "1. Nhập tên của bạn để bắt đầu:",
    namePlaceholder: "Ví dụ: Nguyễn Văn A...",
    received: "Đã nhận",
    step2: "2. Chọn chế độ luyện tập:",
    shadowingTitle: "Shadowing",
    shadowingDesc: "Bắt chước lại theo từ vựng hoặc câu mẫu. Nghe mẫu, thu âm và tự nghe lại để luyện đến khi giống mẫu.",
    topicTitle: "Nói theo chủ đề",
    topicDesc: "Thuyết trình theo chủ đề. Đánh giá đa chiều về độ trôi chảy, bám sát nội dung, từ vựng và ngữ pháp bằng AI.",
    freeTitle: "Nói tự do",
    freeDesc: "Thu âm tự do. Hệ thống AI đánh giá dựa trên độ lưu loát, mạch lạc, phát triển ý và tính tự nhiên.",
    adminLink: "Dành cho Quản trị viên",
    adminMode: "QUẢN TRỊ",
    logout: "Đăng xuất",
    changeMode: "Đổi chế độ",
    adminLoginTitle: "Đăng nhập Admin",
    passPlaceholder: "Nhập mật khẩu...",
    loginBtn: "Đăng nhập",
    backBtn: "Quay lại",
    chooseLevel: "1. Chọn cấp độ:",
    chooseType: "2. Chọn loại luyện tập:",
    vocab: "Từ vựng",
    sentence: "Câu văn",
    chooseLesson: "3. Chọn bài học:",
    noLesson: "Chưa có bài học nào cho phần này.",
    lessonItems: "Gồm {0} hạng mục",
    startPractice: "BẮT ĐẦU LUYỆN TẬP",
    completed: "Hoàn thành bài học!",
    completedDesc: "Tuyệt vời, bạn đã luyện xong bài",
    chooseOther: "Chọn bài khác",
    listenSlow: "Chậm",
    listenNormal: "Chuẩn",
    yourTurn: "Nghe mẫu, thu âm lại và tự nghe bản ghi của mình để so sánh với mẫu.",
    uploadFile: "Tải file lên",
    uploadWarn: "Bạn có thể tải file lên để nghe lại và tự so sánh với mẫu.",
    recDirect: "Thu âm trực tiếp",
    recBtn: "Thu âm bài nói",
    stopRec: "DỪNG THU",
    recommended: "Khuyên dùng",
    aiEvaluating: "AI đang thẩm định và viết nhận xét...",
    waitMsg: "Quá trình đánh giá ngôn ngữ mất vài giây nhé!",
    grading: "Đang xử lý bản ghi...",
    tryAgain: "Thử lại câu này",
    nextItem: "Chuyển tiếp",
    analysis: "Phân tích chi tiết từ AI:",
    selectTopic: "Chọn chủ đề thuyết trình:",
    selectTopicHolder: "-- Bấm để chọn một chủ đề --",
    reqLevel: "Yêu cầu (Mức độ {0}):",
    hintModel: "Gợi ý bài nói mẫu:",
    uploadOrRec: "Tải lên hoặc thu âm bài nói của bạn:",
    startGrading: "Bắt đầu chấm điểm AI",
    cancel: "✕ Hủy",
    aiRecognized: "AI đã nhận diện được giọng nói của bạn.",
    gradeAnother: "Chấm bài khác",
    exportPDF: "XUẤT PHIẾU PDF",
    reportTitle: "PHIẾU ĐÁNH GIÁ KỸ NĂNG NÓI",
    analyzedBy: "Chấm điểm AI",
    student: "Học Viên",
    originalAudio: "Bản ghi âm gốc:",
    avgScore: "Điểm tổng / 10",
    rank: "XẾP LOẠI:",
    estimatedLevel: "TRÌNH ĐỘ TƯƠNG ĐƯƠNG:",
    systemAnalysis: "Nhận xét và góp ý từ hệ thống AI:",
    forgotPwd: "Quên mật khẩu?",
    forgotPwdDesc: "Để đảm bảo bảo mật, hệ thống không tự động cấp lại mật khẩu. Vui lòng gửi email yêu cầu khôi phục mật khẩu về:",
    sendEmail: "Gửi email yêu cầu",
    cPronunciation: "Phát âm",
    cFluency: "Độ trôi chảy",
    cClarity: "Độ rõ ràng",
    cContentAccuracy: "Độ chính xác nội dung",
    cPronunRhythm: "Phát âm & Nhịp điệu",
    cTopicRelevance: "Bám sát chủ đề",
    cCompleteness: "Nội dung đủ ý",
    cGrammar: "Ngữ pháp",
    cVocabRichness: "Từ vựng phong phú",
    cNaturalness: "Độ tự nhiên",
    cVocab: "Từ vựng",
    cIdeaDev: "Khả năng phát triển ý"
  },
  en: {
    welcome: "Welcome to Mandarin Spark",
    subtitle: "Smart Mandarin Chinese speaking and pronunciation training system powered by AI.",
    step1: "1. Enter your name to start:",
    namePlaceholder: "e.g. John Doe...",
    received: "Received",
    step2: "2. Select training mode:",
    shadowingTitle: "Shadowing",
    shadowingDesc: "Imitate vocabulary or sentences. Listen, record, and replay your own voice to compare with the model.",
    topicTitle: "Topic Speaking",
    topicDesc: "Present on a topic. Multi-dimensional AI evaluation of fluency, relevance, and grammar.",
    freeTitle: "Free Speaking",
    freeDesc: "Record freely. AI scoring based on fluency, coherence, idea development, and naturalness.",
    adminLink: "For Administrators",
    adminMode: "ADMIN",
    logout: "Logout",
    changeMode: "Change Mode",
    adminLoginTitle: "Admin Login",
    passPlaceholder: "Enter password...",
    loginBtn: "Login",
    backBtn: "Go Back",
    chooseLevel: "1. Select Level:",
    chooseType: "2. Select Type:",
    vocab: "Vocabulary",
    sentence: "Sentences",
    chooseLesson: "3. Select Lesson:",
    noLesson: "No lessons available for this section.",
    lessonItems: "Contains {0} items",
    startPractice: "START PRACTICING",
    completed: "Lesson Completed!",
    completedDesc: "Great job, you have finished",
    chooseOther: "Choose another lesson",
    listenSlow: "Slow",
    listenNormal: "Normal",
    yourTurn: "Listen to the model, record yourself, then replay your voice to compare.",
    uploadFile: "Upload File",
    uploadWarn: "Upload a file to replay it and compare with the model.",
    recDirect: "Direct Record",
    recBtn: "Record my speech",
    stopRec: "STOP REC",
    recommended: "Recommended",
    aiEvaluating: "AI is evaluating and generating feedback...",
    waitMsg: "Linguistic analysis takes a few seconds!",
    grading: "Processing recording...",
    tryAgain: "Try Again",
    nextItem: "Next",
    analysis: "AI Detailed Analysis:",
    selectTopic: "Select Presentation Topic:",
    selectTopicHolder: "-- Click to select a topic --",
    reqLevel: "Requirement (Level {0}):",
    hintModel: "Suggested Model Speech:",
    uploadOrRec: "Upload or record your speech:",
    startGrading: "Start AI Grading",
    cancel: "✕ Cancel",
    aiRecognized: "AI has successfully recognized your voice.",
    gradeAnother: "Grade Another",
    exportPDF: "EXPORT PDF",
    reportTitle: "SPEAKING SKILL ASSESSMENT",
    analyzedBy: "AI Grading",
    student: "Student",
    originalAudio: "Original Recording:",
    avgScore: "Total Score / 10",
    rank: "RANK:",
    estimatedLevel: "ESTIMATED LEVEL:",
    systemAnalysis: "Feedback and advice from AI Teacher:",
    forgotPwd: "Forgot password?",
    forgotPwdDesc: "For security reasons, the system does not automatically reset passwords. Please send a password recovery request to:",
    sendEmail: "Send request email",
    cPronunciation: "Pronunciation",
    cFluency: "Fluency",
    cClarity: "Clarity",
    cContentAccuracy: "Content Accuracy",
    cPronunRhythm: "Pronunciation & Rhythm",
    cTopicRelevance: "Topic Relevance",
    cCompleteness: "Completeness",
    cGrammar: "Grammar",
    cVocabRichness: "Lexical Richness",
    cNaturalness: "Naturalness",
    cVocab: "Vocabulary",
    cIdeaDev: "Idea Development"
  }
};

const LanguageContext = createContext();

// --- HELPER: Parse pronunciation từ cú pháp [汉字|pinyin] ---
function PronunciationText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\[[^|]+\|[^\]]+\])/g);
  return (
    <span className="leading-loose break-words inline-block max-w-full">
      {parts.map((part, i) => {
        const match = part.match(/\[([^|]+)\|([^\]]+)\]/);
        if (match) {
          return (
            <ruby key={i} className="mx-0.5 whitespace-nowrap">
              {match[1]}<rt className="text-[0.55em] text-[#C8102E] font-medium tracking-tighter">{match[2]}</rt>
            </ruby>
          );
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      })}
    </span>
  );
}

// --- HELPER: Mandarin model audio FREE-only, calm prosody ---
// Nguyên tắc bản miễn phí:
// 1) Không gọi Google Cloud / Azure / backend trả phí.
// 2) Ưu tiên audio mẫu miễn phí đã nhập trong Admin nếu có.
// 3) Nếu không có audio mẫu, dùng browser TTS nhưng chọn voice Mandarin nữ tốt nhất có trên máy.
// 4) Với nút Chậm: dùng slowAudioUrl nếu có; nếu không có thì synthesize chậm bằng browser TTS, KHÔNG kéo chậm file audio chuẩn.
// 5) Chia câu thành cụm ngắn và tạo pause nhẹ để giọng điềm đạm hơn, gần cảm giác Google Dịch hơn trong giới hạn miễn phí.

const MANDARIN_CALM_RATE_BY_LEVEL = {
  HSK1: 0.80,
  HSK2: 0.83,
  HSK3: 0.86,
  HSK4: 0.90,
  HSK5: 0.93,
  HSK6: 0.96
};

const MANDARIN_SLOW_RATE_BY_LEVEL = {
  HSK1: 0.70,
  HSK2: 0.72,
  HSK3: 0.74,
  HSK4: 0.76,
  HSK5: 0.78,
  HSK6: 0.80
};

const MANDARIN_FEMALE_VOICE_PRIORITY_KEYWORDS = [
  // Google / Chrome voices
  'google 普通话', 'google 普通話', 'google 中文', 'google chinese', 'google mandarin',
  '普通话', '普通話', 'putonghua', 'mandarin', 'zh-cn', 'cmn-hans-cn',

  // Microsoft / Windows female Mandarin voices
  'xiaoxiao', '晓晓', '曉曉',
  'xiaoyi', '晓伊', '曉伊',
  'xiaohan', '晓涵', '曉涵',
  'xiaomo', '晓墨', '曉墨',
  'xiaorui', '晓睿', '曉睿',
  'xiaoshuang', '晓双', '曉雙',
  'huihui', '慧慧',
  'yaoyao', '瑶瑶', '瑤瑤',
  'tingting', '婷婷',

  // Apple / generic female markers
  'mei-jia', 'meijia', 'sin-ji',
  'female', 'woman', 'girl', '女'
];

const MANDARIN_MALE_OR_NON_STANDARD_PENALTY_KEYWORDS = [
  // Male voices
  'yunjian', '云健', '雲健',
  'yunxi', '云希', '雲希',
  'yunyang', '云扬', '雲揚',
  'yunhao', '云皓', '雲皓',
  'male', 'man', 'boy', '男',

  // Avoid non-Mainland Mandarin when the course target is Putonghua
  'cantonese', 'yue', '粤', '粵',
  'hong kong', 'hongkong', 'hk',
  'taiwan', '台灣', '台湾', 'tw'
];

let cachedSpeechVoices = [];
let activeModelAudio = null;
let activeMandarinSpeechRun = 0;

const refreshSpeechVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length) cachedSpeechVoices = voices;
  return voices.length ? voices : cachedSpeechVoices;
};

const preloadMandarinVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  refreshSpeechVoices();
  const previousHandler = window.speechSynthesis.onvoiceschanged;
  window.speechSynthesis.onvoiceschanged = (event) => {
    refreshSpeechVoices();
    if (typeof previousHandler === 'function') previousHandler.call(window.speechSynthesis, event);
  };
};

const scoreMandarinFemaleVoice = (voice) => {
  const lang = String(voice?.lang || '').toLowerCase();
  const name = String(voice?.name || '').toLowerCase();
  let score = 0;

  // Target: Mainland Mandarin / Putonghua.
  if (lang === 'zh-cn' || lang === 'cmn-hans-cn') score += 160;
  else if (lang.startsWith('zh-cn') || lang.includes('hans-cn')) score += 140;
  else if (lang === 'zh-sg' || lang.includes('hans-sg')) score += 80;
  else if (lang.startsWith('zh') || lang.startsWith('cmn')) score += 45;

  // Prefer Google-like voices first when they exist on Chrome.
  if (name.includes('google') && (name.includes('普通') || name.includes('chinese') || name.includes('mandarin') || lang.includes('zh-cn'))) score += 70;

  MANDARIN_FEMALE_VOICE_PRIORITY_KEYWORDS.forEach((keyword, index) => {
    if (name.includes(keyword.toLowerCase()) || lang.includes(keyword.toLowerCase())) {
      score += Math.max(8, 54 - index);
    }
  });

  MANDARIN_MALE_OR_NON_STANDARD_PENALTY_KEYWORDS.forEach(keyword => {
    if (name.includes(keyword.toLowerCase()) || lang.includes(keyword.toLowerCase())) score -= 95;
  });

  if (name.includes('microsoft')) score += 14;
  if (name.includes('google')) score += 12;
  if (voice?.localService) score += 2;

  return score;
};

const getBestMandarinFemaleVoice = () => {
  const voices = refreshSpeechVoices();
  if (!voices.length) return null;

  const ranked = voices
    .map(voice => ({ voice, score: scoreMandarinFemaleVoice(voice) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice || null;
};

const cleanMandarinTextForSpeech = (textRaw) => {
  let text = String(textRaw || '')
    // [汉字|pinyin] => chỉ đọc phần chữ Hán, không đọc pinyin.
    .replace(/\[([^|]+)\|([^\]]+)\]/g, '$1')
    .trim();

  // Nếu giáo viên lỡ paste cả dòng kiểu "你好 / nǐ hǎo / Xin chào / Hello",
  // TTS chỉ đọc phần tiếng Trung trước dấu /.
  if (text.includes('/')) text = text.split('/')[0];

  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s*([，。！？、；：,.!?;:])\s*/g, '$1')
    .trim();
};

const getMandarinSpeechRate = (speedMode = 'normal', level = 'HSK3') => {
  const normalizedLevel = normalizeShadowingLevel(level || 'HSK3') || 'HSK3';
  if (speedMode === 'slow') return MANDARIN_SLOW_RATE_BY_LEVEL[normalizedLevel] || 0.74;
  return MANDARIN_CALM_RATE_BY_LEVEL[normalizedLevel] || 0.86;
};

const getMandarinSpeechPitch = () => {
  // Hạ rất nhẹ để giọng nữ bớt gắt, nghe điềm đạm hơn.
  return 0.96;
};

const getAudioField = (source, fieldNames = []) => {
  if (!source || typeof source !== 'object') return '';
  for (const field of fieldNames) {
    const value = source[field];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
};

const getNativeModelAudioUrl = (source, speedMode = 'normal') => {
  if (!source || typeof source !== 'object') return '';

  const normalUrl = getAudioField(source, [
    'audioUrl', 'audio_url',
    'modelAudioUrl', 'model_audio_url',
    'nativeAudioUrl', 'native_audio_url',
    'femaleAudioUrl', 'female_audio_url',
    'audio'
  ]);

  if (speedMode === 'slow') {
    const slowUrl = getAudioField(source, [
      'slowAudioUrl', 'slow_audio_url',
      'modelSlowAudioUrl', 'model_slow_audio_url',
      'nativeSlowAudioUrl', 'native_slow_audio_url',
      'femaleSlowAudioUrl', 'female_slow_audio_url',
      'audioSlowUrl', 'audio_slow_url',
      'slowAudio', 'slow_audio'
    ]);
    return slowUrl || '';
  }

  return normalUrl;
};

const getMandarinTextFromSource = (source) => {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (typeof source === 'object') {
    return source.cn || source.chinese || source.text || source.sentence || source.word || '';
  }
  return String(source || '');
};

const cancelCurrentModelAudio = () => {
  activeMandarinSpeechRun += 1;

  if (activeModelAudio) {
    try {
      activeModelAudio.pause();
      activeModelAudio.currentTime = 0;
    } catch (_) {}
    activeModelAudio = null;
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

const playAudioElement = ({ audioUrl, onStart, onEnd }) => {
  if (!audioUrl || typeof Audio === 'undefined') return false;

  try {
    cancelCurrentModelAudio();
    const runId = activeMandarinSpeechRun;

    const audio = new Audio(audioUrl);
    activeModelAudio = audio;

    // Không dùng playbackRate để tạo bản chậm cho tiếng Trung.
    // Nếu muốn chậm mà không méo thanh điệu, nhập slowAudioUrl riêng trong Admin.
    audio.playbackRate = 1.0;
    audio.preservesPitch = true;
    audio.mozPreservesPitch = true;
    audio.webkitPreservesPitch = true;

    let finished = false;
    const finish = () => {
      if (finished || runId !== activeMandarinSpeechRun) return;
      finished = true;
      if (activeModelAudio === audio) activeModelAudio = null;
      if (typeof onEnd === 'function') onEnd();
    };

    audio.onended = finish;
    audio.onerror = finish;
    audio.onpause = () => {
      if (audio.ended) finish();
    };

    if (typeof onStart === 'function') onStart(true);
    audio.play().catch(finish);
    return true;
  } catch (error) {
    console.warn('Cannot play Mandarin model audio:', error);
    if (typeof onEnd === 'function') onEnd();
    return false;
  }
};

const shouldUseSingleChunk = (text) => {
  const clean = String(text || '').replace(/[，。！？、；：,.!?;:\s]/g, '');
  return clean.length <= 8;
};

const splitMandarinIntoCalmChunks = (textRaw, speedMode = 'normal') => {
  const text = cleanMandarinTextForSpeech(textRaw);
  if (!text) return [];
  if (shouldUseSingleChunk(text)) return [text];

  const chunks = [];
  let buffer = '';
  const hardBreaks = new Set(['。', '！', '？', '!', '?', ';', '；']);
  const softBreaks = new Set(['，', ',', '、', '：', ':']);
  const maxLen = speedMode === 'slow' ? 10 : 14;

  for (const char of text) {
    buffer += char;

    const isHardBreak = hardBreaks.has(char);
    const isSoftBreak = softBreaks.has(char);
    const isLongEnough = buffer.replace(/[，。！？、；：,.!?;:\s]/g, '').length >= maxLen;

    if (isHardBreak || isSoftBreak || isLongEnough) {
      const cleaned = buffer.trim();
      if (cleaned) chunks.push(cleaned);
      buffer = '';
    }
  }

  if (buffer.trim()) chunks.push(buffer.trim());

  // Tránh chia quá vụn: ghép các mảnh 1-2 chữ với mảnh sau.
  const merged = [];
  for (const chunk of chunks) {
    const bareLen = chunk.replace(/[，。！？、；：,.!?;:\s]/g, '').length;
    if (bareLen <= 2 && merged.length) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}${chunk}`;
    } else {
      merged.push(chunk);
    }
  }

  return merged.length ? merged : [text];
};

const speakMandarinBrowserCalm = ({ textRaw, speedMode = 'normal', level = 'HSK3', onStart, onEnd, onUnsupported }) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (typeof onUnsupported === 'function') onUnsupported();
    return false;
  }

  const chunks = splitMandarinIntoCalmChunks(textRaw, speedMode);
  if (!chunks.length) return false;

  cancelCurrentModelAudio();
  const runId = activeMandarinSpeechRun;
  const selectedVoice = getBestMandarinFemaleVoice();
  const rate = getMandarinSpeechRate(speedMode, level);
  const pitch = getMandarinSpeechPitch();
  const pauseMs = speedMode === 'slow' ? 260 : 150;

  let index = 0;
  let hasStarted = false;

  const finishAll = () => {
    if (runId !== activeMandarinSpeechRun) return;
    if (typeof onEnd === 'function') onEnd();
  };

  const speakNext = () => {
    if (runId !== activeMandarinSpeechRun) return;

    if (index >= chunks.length) {
      finishAll();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = 'zh-CN';
    utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (!hasStarted) {
        hasStarted = true;
        if (typeof onStart === 'function') onStart(true);
      }
    };

    utterance.onend = () => {
      index += 1;
      window.setTimeout(speakNext, pauseMs);
    };

    utterance.onerror = () => {
      index += 1;
      window.setTimeout(speakNext, pauseMs);
    };

    window.speechSynthesis.speak(utterance);
  };

  speakNext();
  return true;
};

const speakMandarinModelAudio = async ({ modelSource, textRaw, audioUrl, speedMode = 'normal', level = 'HSK3', onStart, onEnd, onUnsupported }) => {
  const source = modelSource ?? textRaw;
  const textForSpeech = getMandarinTextFromSource(source);
  const explicitUrlFromArg = String(audioUrl || '').trim();
  const speedSpecificAudioUrl = explicitUrlFromArg || getNativeModelAudioUrl(source, speedMode);

  // Nếu Admin đã nhập audio mẫu, ưu tiên phát audio đó.
  // Với nút Chậm, chỉ dùng slowAudioUrl riêng; không kéo chậm audio chuẩn để tránh méo thanh điệu.
  if (speedSpecificAudioUrl) {
    const ok = playAudioElement({
      audioUrl: speedSpecificAudioUrl,
      onStart,
      onEnd
    });
    if (ok) return;
  }

  // Bản FREE-only: không gọi Cloud/Backend TTS trả phí.
  // Fallback miễn phí: browser TTS, chọn voice Mandarin nữ tốt nhất và chia cụm để giọng điềm đạm hơn.
  const spoken = speakMandarinBrowserCalm({
    textRaw: textForSpeech,
    speedMode,
    level,
    onStart,
    onEnd,
    onUnsupported
  });

  if (!spoken && typeof onEnd === 'function') onEnd();
};

// --- MOCK DATABASE ---
// Removed initialTopics and initialShadowing, now using Supabase

export default function App() {
  const [lang, setLang] = useState('vi'); // 'vi' or 'en'
  const t = (key) => dict[lang][key] || dict['vi'][key] || key;

  const [role, setRole] = useState('user');
  const [activeMode, setActiveMode] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [isForgotPwd, setIsForgotPwd] = useState(false);

  const [dbTopics, setDbTopics] = useState([]);
  const [dbShadowing, setDbShadowing] = useState([]);

  // Lưu trữ và lấy mật khẩu Admin từ localStorage
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('mandarin_admin_pwd') || 'admin123';
  });

  useEffect(() => {
    preloadMandarinVoices();
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body { background: white !important; }
        body * { visibility: hidden; }
        #printable-report, #printable-report * { visibility: visible; }
        #printable-report { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
        .no-print { display: none !important; }
      }
      .fuji-bg {
        /* Chinese ink-wash background: one single image, no tiling/repeating */
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        color: #2f2723;
        background:
          radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.64) 0%, rgba(255, 255, 255, 0.32) 28%, rgba(255, 255, 255, 0.06) 55%, rgba(255, 255, 255, 0) 74%),
          linear-gradient(180deg, rgba(255, 250, 241, 0.78) 0%, rgba(245, 233, 217, 0.38) 48%, rgba(236, 219, 198, 0.56) 100%),
          url("${bg}");
        background-size: cover, cover, cover;
        background-position: center center, center center, center center;
        background-repeat: no-repeat, no-repeat, no-repeat;
        background-attachment: fixed, fixed, fixed;
      }
      .fuji-bg::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background:
          linear-gradient(90deg, rgba(255, 247, 235, 0.62) 0%, rgba(255, 247, 235, 0.18) 28%, rgba(255, 255, 255, 0.04) 58%, rgba(255, 247, 235, 0.50) 100%),
          radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.55), transparent 34%);
      }
      .fuji-bg::after {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        background-image:
          radial-gradient(circle at 18% 32%, rgba(190, 52, 47, 0.32) 0 2px, transparent 3px),
          radial-gradient(circle at 82% 42%, rgba(190, 52, 47, 0.20) 0 2px, transparent 3px),
          radial-gradient(circle at 62% 78%, rgba(190, 52, 47, 0.18) 0 2px, transparent 3px);
        background-size: 100% 100%;
        background-repeat: no-repeat;
      }
      .app-content { position: relative; z-index: 10; }
      .ink-card {
        background: rgba(255, 250, 242, 0.76);
        border: 1px solid rgba(158, 118, 76, 0.24);
        box-shadow: 0 22px 60px rgba(72, 49, 31, 0.13);
        backdrop-filter: blur(10px);
      }
      .ink-card:hover {
        background: rgba(255, 252, 247, 0.88);
        border-color: rgba(190, 52, 47, 0.42);
        box-shadow: 0 28px 70px rgba(72, 49, 31, 0.18);
      }
      @keyframes sway { 0%,100% { transform: translateX(0px) rotate(0deg); } 25% { transform: translateX(-6px) rotate(-3deg); } 50% { transform: translateX(0px) rotate(0deg); } 75% { transform: translateX(6px) rotate(3deg); } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: topicsData, error: topicsError } = await supabase
          .from('topics')
          .select('*');

        if (topicsError) throw topicsError;
        setDbTopics((topicsData || []).map(item => ({
          ...item,
          isPublished: item.isPublished ?? item.ispublished
        })));

        const { data: shadowingData, error: shadowingError } = await supabase
          .from('shadowing')
          .select('*');

        console.log('Supabase shadowing fetch returned', { shadowingData, shadowingError });
        if (shadowingError) throw shadowingError;
        setDbShadowing((shadowingData || []).map(normalizeDbItem));
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
        alert('Lỗi khi tải dữ liệu từ cơ sở dữ liệu. Vui lòng thử lại.');
      }
    };

    fetchData();
  }, []);

  const handleAdminLogin = (password) => {
    if (password === adminPassword) { setRole('admin'); setActiveMode(null); }
    else { alert(lang === 'en' ? 'Wrong admin password!' : 'Sai mật khẩu quản trị!'); }
  };

  const handleModeSelect = (mode) => {
    if (!studentName.trim()) {
      alert(lang === 'en' ? "Please enter your name first!" : "Vui lòng nhập tên học viên trước khi bắt đầu!");
      document.getElementById('student-name-input')?.focus();
      return;
    }
    setActiveMode(mode);
  };

  const renderHome = () => (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto mt-14 px-4 pb-20">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-[#2f2723] mb-4 tracking-tight">{t('welcome')}</h2>
        <p className="text-[#6f625b] font-semibold flex items-center justify-center gap-2">
          {t('subtitle')} <Sparkles size={16} className="text-[#C8102E]" />
        </p>
      </div>

      <div className="mb-10 max-w-md mx-auto">
        <label className="block text-center font-bold text-[#2f2723] mb-3">{t('step1')}</label>
        <div className="bg-[#fffaf2]/85 backdrop-blur-md p-2 pl-5 rounded-2xl shadow-xl border border-[#d8b98d]/40 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#C8102E]/40 transition-all">
          <User className={studentName.trim() ? "text-green-500 transition-colors" : "text-[#C8102E] transition-colors"} />
          <input
            id="student-name-input"
            type="text"
            placeholder={t('namePlaceholder')}
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            className="flex-1 bg-transparent outline-none font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium py-2"
          />
          {studentName.trim() && (
            <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold animate-in zoom-in flex items-center gap-1">
              <CheckCircle2 size={14} /> {t('received')}
            </span>
          )}
        </div>
      </div>

      <div className="text-center mb-6">
        <label className="block font-bold text-[#2f2723]">{t('step2')}</label>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <button onClick={() => handleModeSelect('shadowing')} className="ink-card rounded-3xl p-8 transition-all group text-left relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#b94a48]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <MessageCircle size={40} className="text-[#C8102E] mb-6 relative z-10" />
          <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">{t('shadowingTitle')}</h3>
          <p className="text-slate-700 text-sm relative z-10 leading-relaxed">{t('shadowingDesc')}</p>
        </button>

        <button onClick={() => handleModeSelect('topic')} className="ink-card rounded-3xl p-8 transition-all group text-left relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#3d6b55]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <BookOpen size={40} className="text-[#3d6b55] mb-6 relative z-10" />
          <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">{t('topicTitle')}</h3>
          <p className="text-slate-700 text-sm relative z-10 leading-relaxed">{t('topicDesc')}</p>
        </button>

        <button onClick={() => handleModeSelect('free')} className="ink-card rounded-3xl p-8 transition-all group text-left relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#5b6f82]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <Mic size={40} className="text-[#5b6f82] mb-6 relative z-10" />
          <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">{t('freeTitle')}</h3>
          <p className="text-slate-700 text-sm relative z-10 leading-relaxed">{t('freeDesc')}</p>
        </button>
      </div>

      <div className="mt-16 text-center">
        <button onClick={() => setActiveMode('adminLogin')} className="text-xs text-[#6f625b] hover:text-[#C8102E] transition-colors underline decoration-dotted">
          {t('adminLink')}
        </button>
      </div>
    </div>
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div className="fuji-bg font-sans selection:bg-[#C8102E] selection:text-white">

        {/* PHỤ KIỆN LỒNG ĐÈN
        <div className="absolute left-4 top-32 w-16 h-28 z-0 pointer-events-none" style={{ animation: 'sway 3.5s ease-in-out infinite' }}>
          <svg viewBox="0 0 80 140" className="w-full h-full">
            <defs>
              <linearGradient id="lanternGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f8c2b8" />
                <stop offset="100%" stopColor="#c8102e" />
              </linearGradient>
            </defs>
            <rect x="18" y="18" width="44" height="80" rx="18" fill="url(#lanternGrad)" stroke="#8b0000" strokeWidth="3" />
            <path d="M 18 18 Q 40 0 62 18" fill="#a50f26" />
            <line x1="40" y1="98" x2="40" y2="122" stroke="#f3d1b1" strokeWidth="3" />
            <circle cx="40" cy="124" r="6" fill="#f3d1b1" />
          </svg>
        </div> */}

        {/* Single non-repeating Chinese ink-wash background is handled by .fuji-bg above. */}

        <header className="bg-[#fffaf2]/82 backdrop-blur-xl shadow-sm border-b border-[#d8b98d]/30 sticky top-0 z-50 app-content no-print">
          <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveMode(null); }}>
              {!logoError ? (
                <img src="171045151_1082518945577423_933278627676106455_n (4).png" alt="MVA Logo" className="h-8 w-auto object-contain" onError={() => setLogoError(true)} />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" fill="none" stroke="#ff6000" strokeWidth="12" strokeLinecap="butt" strokeLinejoin="miter" className="w-full h-full">
                    <path d="M 15 90 L 15 15 L 50 50 L 85 15 L 85 90" />
                    <path d="M 85 90 L 50 50" />
                  </svg>
                </div>
              )}
              <div className="flex items-center gap-2">

                <h1 className="font-bold text-xl tracking-tight hidden sm:flex uppercase">
                  <span className="text-[#C8102E]">MANDARIN</span>
                  <span className="text-slate-800">&nbsp;SPARK</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Switch */}
              <div className="flex bg-slate-100/80 rounded-full p-1 border border-slate-200">
                <button onClick={() => setLang('vi')} className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${lang === 'vi' ? 'bg-white shadow text-[#C8102E]' : 'text-slate-500'}`}>VI</button>
                <button onClick={() => setLang('en')} className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${lang === 'en' ? 'bg-white shadow text-[#C8102E]' : 'text-slate-500'}`}>EN</button>
              </div>

              {role === 'admin' ? (
                <div className="flex items-center gap-3">
                  <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md hidden sm:flex">
                    <ShieldCheck size={14} /> {t('adminMode')}
                  </span>
                  <button onClick={() => { setRole('user'); setActiveMode(null); }} className="text-sm font-bold text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <LogOut size={16} className="sm:hidden" /><span className="hidden sm:block">{t('logout')}</span>
                  </button>
                </div>
              ) : (
                activeMode && activeMode !== 'adminLogin' && (
                  <button onClick={() => setActiveMode(null)} className="text-sm font-bold text-slate-500 hover:text-[#C8102E] flex items-center gap-1 transition-colors">
                    <RefreshCcw size={14} /> <span className="hidden sm:block">{t('changeMode')}</span>
                  </button>
                )
              )}
            </div>
          </div>
        </header>

        <main className="app-content min-h-[calc(100vh-64px)]">
          {activeMode === 'adminLogin' && (
            <div className="max-w-sm mx-auto mt-20 bg-white p-8 rounded-3xl shadow-xl border border-slate-200 animate-in fade-in zoom-in text-slate-900">
              <Lock className="text-[#C8102E] mx-auto mb-4" size={40} />
              <h2 className="text-xl font-bold text-center text-slate-800 mb-6">{isForgotPwd ? t('forgotPwd') : t('adminLoginTitle')}</h2>

              {isForgotPwd ? (
                <div className="text-center animate-in fade-in">
                  <p className="text-sm text-slate-600 mb-4">{t('forgotPwdDesc')}</p>
                  <p className="font-bold text-[#C8102E] mb-6">vananh.pham@minhvietacademy.org</p>
                  <a href="mailto:vananh.pham@minhvietacademy.org?subject=Yêu cầu khôi phục mật khẩu Admin - Mandarin Spark" className="block w-full bg-[#C8102E] text-white font-bold py-3 rounded-xl shadow hover:bg-[#9b111e] mb-3 transition-colors">
                    {t('sendEmail')}
                  </a>
                  <button onClick={() => setIsForgotPwd(false)} className="w-full mt-2 text-sm text-slate-500 hover:text-slate-800">{t('backBtn')}</button>
                </div>
              ) : (
                <div className="animate-in fade-in">
                  <input
                    type="password" id="adminPwd" placeholder={t('passPlaceholder')}
                    className="w-full p-3 border border-slate-300 rounded-xl mb-4 focus:outline-none focus:border-[#C8102E] text-slate-900 placeholder:text-slate-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(document.getElementById('adminPwd').value) }}
                  />
                  <button onClick={() => handleAdminLogin(document.getElementById('adminPwd').value)} className="w-full bg-[#C8102E] text-white font-bold py-3 rounded-xl shadow hover:bg-[#9b111e] mb-3 transition-colors">
                    {t('loginBtn')}
                  </button>
                  <div className="flex justify-between items-center mt-3 px-1">
                    <button onClick={() => { setActiveMode(null); setIsForgotPwd(false); }} className="text-sm text-slate-500 hover:text-slate-800">{t('backBtn')}</button>
                    <button onClick={() => setIsForgotPwd(true)} className="text-sm text-[#C8102E] hover:underline font-medium">{t('forgotPwd')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {role === 'admin' && !activeMode ? (
            <AdminPanel
              dbTopics={dbTopics} setDbTopics={setDbTopics}
              dbShadowing={dbShadowing} setDbShadowing={setDbShadowing}
              adminPassword={adminPassword} setAdminPassword={setAdminPassword}
            />
          ) : role === 'user' ? (
            <>
              {!activeMode && renderHome()}
              {activeMode === 'free' && <FreeAndTopicMode type="free" studentName={studentName} onRequireName={() => setActiveMode(null)} dbTopics={dbTopics} />}
              {activeMode === 'topic' && <FreeAndTopicMode type="topic" studentName={studentName} onRequireName={() => setActiveMode(null)} dbTopics={dbTopics} />}
              {activeMode === 'shadowing' && <ShadowingMode studentName={studentName} onRequireName={() => setActiveMode(null)} dbShadowing={dbShadowing} />}
            </>
          ) : null}
        </main>
      </div>
    </LanguageContext.Provider>
  );
}

// ---------------------------------------------------------
// COMPONENT: ADMIN PANEL
// ---------------------------------------------------------
function AdminPanel({ dbTopics, setDbTopics, dbShadowing, setDbShadowing, adminPassword, setAdminPassword }) {
  const [tab, setTab] = useState('topics');
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingShadow, setEditingShadow] = useState(null);
  const [shadowItems, setShadowItems] = useState([{ cn: '', pinyin: '', vi: '', en: '', audioUrl: '', slowAudioUrl: '' }]);

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const handleChangePassword = () => {
    if (!newPwd || !confirmPwd) return alert("Vui lòng nhập đầy đủ mật khẩu mới!");
    if (newPwd !== confirmPwd) return alert("Mật khẩu xác nhận không khớp!");
    setAdminPassword(newPwd);
    localStorage.setItem('mandarin_admin_pwd', newPwd);
    alert("Đổi mật khẩu thành công!");
    setNewPwd('');
    setConfirmPwd('');
  };

  const saveTopic = async (isPublished) => {
    if (!editingTopic.title) { alert("Nhập tên chủ đề!"); return; }
    const newTopic = { ...editingTopic, isPublished };
    if (!newTopic.id) newTopic.id = 't_' + Date.now();

    try {
      const { error } = await supabase
        .from('topics')
        .upsert(toDbItem(newTopic));

      if (error) throw error;

      // Refresh data
      const { data: topicsData, error: fetchError } = await supabase
        .from('topics')
        .select('*');

      if (fetchError) throw fetchError;
      setDbTopics((topicsData || []).map(normalizeDbItem));

      setEditingTopic(null);
      alert("Lưu thành công!");
    } catch (error) {
      console.error('Error saving topic:', error);
      alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
    }
  };

  const saveShadow = async (isPublished) => {
    if (!editingShadow.title) { alert("Nhập tên bài học!"); return; }

    const parsedItems = shadowItems
      .filter(item => item.cn?.trim() || item.pinyin?.trim() || item.vi?.trim() || item.en?.trim() || item.audioUrl?.trim() || item.slowAudioUrl?.trim())
      .map(item => ({
        cn: item.cn || '',
        pinyin: item.pinyin || '',
        vi: item.vi || '',
        en: item.en || '',
        audioUrl: item.audioUrl || item.audio_url || item.modelAudioUrl || item.model_audio_url || '',
        slowAudioUrl: item.slowAudioUrl || item.slow_audio_url || item.modelSlowAudioUrl || item.model_slow_audio_url || item.nativeSlowAudioUrl || item.native_slow_audio_url || ''
      }));

    if (parsedItems.length === 0) { alert("Vui lòng thêm ít nhất 1 hạng mục!"); return; }

    const newShadow = { ...editingShadow, items: JSON.stringify(parsedItems), isPublished };
    if (!newShadow.id) newShadow.id = 's_' + Date.now();

    try {
      const { error } = await supabase
        .from('shadowing')
        .upsert(toDbItem(newShadow));

      if (error) throw error;

      // Refresh data
      const { data: shadowingData, error: fetchError } = await supabase
        .from('shadowing')
        .select('*');

      if (fetchError) throw fetchError;
      setDbShadowing((shadowingData || []).map(normalizeDbItem));

      setEditingShadow(null);
      setShadowItems([{ cn: '', pinyin: '', vi: '', en: '', audioUrl: '', slowAudioUrl: '' }]);
      alert("Lưu thành công!");
    } catch (error) {
      console.error('Error saving shadowing:', error);
      alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
    }
  };

  const toggleTopicPublish = async (id) => {
    const topic = dbTopics.find(t => t.id === id);
    if (!topic) return;

    try {
      const { error } = await supabase
        .from('topics')
        .update({ ispublished: !topic.isPublished })
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      const { data: topicsData, error: fetchError } = await supabase
        .from('topics')
        .select('*');

      if (fetchError) throw fetchError;
      setDbTopics((topicsData || []).map(normalizeDbItem));
    } catch (error) {
      console.error('Error toggling topic publish:', error);
      alert("Lỗi khi cập nhật trạng thái. Vui lòng thử lại.");
    }
  };

  const toggleShadowPublish = async (id) => {
    const shadow = dbShadowing.find(s => s.id === id);
    if (!shadow) return;

    try {
      const { error } = await supabase
        .from('shadowing')
        .update({ ispublished: !shadow.isPublished })
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      const { data: shadowingData, error: fetchError } = await supabase
        .from('shadowing')
        .select('*');

      if (fetchError) throw fetchError;
      setDbShadowing((shadowingData || []).map(normalizeDbItem));
    } catch (error) {
      console.error('Error toggling shadowing publish:', error);
      alert("Lỗi khi cập nhật trạng thái. Vui lòng thử lại.");
    }
  };

  const handleDeleteTopic = async (id) => {
    if (!window.confirm("Xóa vĩnh viễn?")) return;

    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      const { data: topicsData, error: fetchError } = await supabase
        .from('topics')
        .select('*');

      if (fetchError) throw fetchError;
      setDbTopics((topicsData || []).map(normalizeDbItem));
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert("Lỗi khi xóa dữ liệu. Vui lòng thử lại.");
    }
  };

  const handleDeleteShadow = async (id) => {
    if (!window.confirm("Xóa vĩnh viễn?")) return;

    try {
      const { error } = await supabase
        .from('shadowing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      const { data: shadowingData, error: fetchError } = await supabase
        .from('shadowing')
        .select('*');

      if (fetchError) throw fetchError;
      setDbShadowing((shadowingData || []).map(normalizeDbItem));
    } catch (error) {
      console.error('Error deleting shadowing:', error);
      alert("Lỗi khi xóa dữ liệu. Vui lòng thử lại.");
    }
  };

  const startEditTopic = (t) => { setEditingTopic({ ...t }); };
  const startEditShadow = (s) => {
    setEditingShadow({ ...s });
    const existingItems = Array.isArray(s.items) && s.items.length > 0
      ? s.items.map(item => ({
          cn: item.cn || '',
          pinyin: item.pinyin || '',
          vi: item.vi || '',
          en: item.en || '',
          audioUrl: item.audioUrl || item.audio_url || item.modelAudioUrl || item.model_audio_url || '',
          slowAudioUrl: item.slowAudioUrl || item.slow_audio_url || item.modelSlowAudioUrl || item.model_slow_audio_url || item.nativeSlowAudioUrl || item.native_slow_audio_url || ''
        }))
      : [{ cn: '', pinyin: '', vi: '', en: '', audioUrl: '', slowAudioUrl: '' }];
    setShadowItems(existingItems);
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 animate-in fade-in duration-500 px-4 pb-20 text-slate-900">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border border-slate-200 text-slate-900">
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
          <button onClick={() => { setTab('topics'); setEditingTopic(null); }} className={`flex-1 py-4 font-bold text-center border-b-2 ${tab === 'topics' ? 'border-[#C8102E] text-[#C8102E] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Quản lý Chủ đề</button>
          <button onClick={() => { setTab('shadowing'); setEditingShadow(null); }} className={`flex-1 py-4 font-bold text-center border-b-2 ${tab === 'shadowing' ? 'border-[#C8102E] text-[#C8102E] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Quản lý Shadowing</button>
          <button onClick={() => setTab('settings')} className={`flex-1 py-4 font-bold text-center border-b-2 ${tab === 'settings' ? 'border-[#C8102E] text-[#C8102E] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Cài đặt</button>
        </div>
        <div className="p-8">

          {tab === 'settings' && (
            <div className="max-w-md mx-auto py-8 animate-in fade-in">
              <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2"><Lock className="text-[#C8102E]" /> Đổi mật khẩu Admin</h3>
              <div className="space-y-4">
                <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm font-medium mb-4 border border-red-200">
                  Mật khẩu sẽ được lưu trên trình duyệt hiện tại.
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu mới</label>
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#C8102E] outline-none text-slate-900 placeholder:text-slate-500" placeholder="Nhập mật khẩu mới..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#C8102E] outline-none text-slate-900 placeholder:text-slate-500" placeholder="Nhập lại mật khẩu..." />
                </div>
                <button onClick={handleChangePassword} className="w-full bg-[#C8102E] text-white font-bold py-3 rounded-xl hover:bg-[#9b111e] shadow-md mt-4 transition-colors">
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}

          {tab === 'topics' && (
            <div>
              {!editingTopic ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-slate-800">Kho Chủ đề</h3>
                    <button onClick={() => setEditingTopic({ id: 't_' + Date.now(), title: '', level: 'HSK3', req: '', isPublished: false, hint: { cn: '', pinyin: '', vi: '', en: '', audioUrl: '', slowAudioUrl: '' } })} className="bg-[#C8102E] text-white hover:bg-[#9b111e] px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md"><Plus size={18} /> Thêm mới</button>
                  </div>
                  <div className="space-y-4">
                    {dbTopics.map(topic => (
                      <div key={topic.id} className={`p-5 rounded-2xl border ${topic.isPublished ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                          <div>
                            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded mr-2">{topic.level}</span>
                            <h4 className="font-bold text-lg text-[#C8102E] inline-block">{topic.title}</h4>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => toggleTopicPublish(topic.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${topic.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{topic.isPublished ? <><Eye size={14} /> Công khai</> : <><EyeOff size={14} /> Nháp</>}</button>
                            <button onClick={() => startEditTopic(topic)} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">Sửa</button>
                            <button onClick={() => handleDeleteTopic(topic.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center gap-1"><Trash2 size={14} /> Xóa</button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2 truncate">{topic.req}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="font-bold text-xl text-slate-800">Soạn thảo Chủ đề</h3>
                    <button onClick={() => setEditingTopic(null)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Tên chủ đề</label><input type="text" value={editingTopic.title} onChange={e => setEditingTopic({ ...editingTopic, title: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500" /></div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Cấp độ</label>
                      <select value={editingTopic.level} onChange={e => setEditingTopic({ ...editingTopic, level: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900">
                        <option value="HSK1">HSK1</option><option value="HSK2">HSK2</option><option value="HSK3">HSK3</option><option value="HSK4">HSK4</option><option value="HSK5">HSK5</option><option value="HSK6">HSK6</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4"><label className="block text-sm font-bold text-slate-700 mb-1">Yêu cầu</label><textarea value={editingTopic.req} onChange={e => setEditingTopic({ ...editingTopic, req: e.target.value })} className="w-full p-3 border rounded-xl h-20 text-slate-900 placeholder:text-slate-500" /></div>
                  <div className="p-4 border rounded-xl bg-slate-50 space-y-3">
                    <label className="block text-sm font-bold text-slate-800 border-b pb-2">Bài nói mẫu</label>
                    <div className="bg-red-50 text-red-800 p-3 rounded-lg text-xs font-medium border border-red-200">
                      Cú pháp Pinyin: <code>[汉字|pinyin]</code> (Ví dụ: <code>[你|nǐ]</code>)
                    </div>
                    <div><label className="block text-xs font-bold mb-1">Tiếng Trung (Hỗ trợ Pinyin)</label><textarea value={editingTopic.hint.cn} onChange={e => setEditingTopic({ ...editingTopic, hint: { ...editingTopic.hint, cn: e.target.value } })} className="w-full p-2 border rounded-lg h-24 text-slate-900 placeholder:text-slate-500" placeholder="VD: [学|xué]校 / xuéxiào / Trường học / School" /></div>
                    <div><label className="block text-xs font-bold mb-1">Pinyin</label><input type="text" value={editingTopic.hint.pinyin} onChange={e => setEditingTopic({ ...editingTopic, hint: { ...editingTopic.hint, pinyin: e.target.value } })} className="w-full p-2 border rounded-lg text-slate-900 placeholder:text-slate-500" /></div>
                    <div><label className="block text-xs font-bold mb-1">Tiếng Việt</label><input type="text" value={editingTopic.hint.vi} onChange={e => setEditingTopic({ ...editingTopic, hint: { ...editingTopic.hint, vi: e.target.value } })} className="w-full p-2 border rounded-lg text-slate-900 placeholder:text-slate-500" /></div>
                    <div><label className="block text-xs font-bold mb-1">Tiếng Anh (Cho giao diện EN)</label><input type="text" value={editingTopic.hint.en || ''} onChange={e => setEditingTopic({ ...editingTopic, hint: { ...editingTopic.hint, en: e.target.value } })} className="w-full p-2 border rounded-lg text-slate-900 placeholder:text-slate-500" /></div>
                    <div><label className="block text-xs font-bold mb-1">Link audio mẫu miễn phí / giọng nữ bản địa MP3 — tốc độ chuẩn</label><input type="text" value={editingTopic.hint.audioUrl || editingTopic.hint.audio_url || ''} onChange={e => setEditingTopic({ ...editingTopic, hint: { ...editingTopic.hint, audioUrl: e.target.value } })} className="w-full p-2 border rounded-lg text-slate-900 placeholder:text-slate-500" placeholder="VD: https://.../nihao_normal_female.mp3" /></div>
                    <div><label className="block text-xs font-bold mb-1">Link audio mẫu miễn phí / giọng nữ bản địa MP3 — bản chậm không méo chữ</label><input type="text" value={editingTopic.hint.slowAudioUrl || editingTopic.hint.slow_audio_url || ''} onChange={e => setEditingTopic({ ...editingTopic, hint: { ...editingTopic.hint, slowAudioUrl: e.target.value } })} className="w-full p-2 border rounded-lg text-slate-900 placeholder:text-slate-500" placeholder="VD: https://.../nihao_slow_female.mp3 — nên là file được thu/synthesize chậm riêng, không phải file chuẩn bị kéo chậm" /></div>
                    <p className="text-[11px] text-slate-500">Muốn giọng ổn định nhất mà vẫn miễn phí, hãy dùng file MP3 do giáo viên/native speaker nữ thu sẵn. Bản chậm nên là file chậm riêng để không làm bẹt thanh điệu.</p>
                  </div>
                  <div className="flex gap-4 mt-8 pt-4 border-t"><button onClick={() => saveTopic(false)} className="flex-1 bg-slate-200 py-3 rounded-xl font-bold">Lưu Nháp</button><button onClick={() => saveTopic(true)} className="flex-1 bg-[#C8102E] text-white py-3 rounded-xl font-bold">Lưu & Public</button></div>
                </div>
              )}
            </div>
          )}

          {tab === 'shadowing' && (
            <div>
              {!editingShadow ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-slate-800">Kho Shadowing</h3>
                    <button onClick={() => { setEditingShadow({ id: 's_' + Date.now(), title: '', level: 'HSK1', type: 'sentence', isPublished: false, items: [] }); setShadowItems([{ cn: '', pinyin: '', vi: '', en: '', audioUrl: '', slowAudioUrl: '' }]); }} className="bg-[#C8102E] text-white px-4 py-2 rounded-lg font-bold text-sm"><Plus size={18} className="inline" /> Thêm mới</button>
                  </div>
                  <div className="space-y-4">
                    {dbShadowing.map(shadow => (
                      <div key={shadow.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${shadow.isPublished ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                        <div>
                          <span className="text-xs font-bold bg-slate-200 px-2 py-1 rounded mr-2">{shadow.level}</span>
                          <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded mr-2">{shadow.type === 'vocab' ? 'Từ vựng' : 'Câu'}</span>
                          <h4 className="font-bold text-lg inline">{shadow.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">{shadow.items.length} hạng mục</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => toggleShadowPublish(shadow.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${shadow.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{shadow.isPublished ? 'Public' : 'Nháp'}</button>
                          <button onClick={() => startEditShadow(shadow)} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">Sửa</button>
                          <button onClick={() => handleDeleteShadow(shadow.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-xs font-bold"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="font-bold text-xl text-slate-800">Soạn thảo Bài học Shadowing</h3>
                    <button onClick={() => setEditingShadow(null)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div><label className="block text-sm font-bold mb-1">Cấp độ</label><select value={editingShadow.level} onChange={e => setEditingShadow({ ...editingShadow, level: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900"><option value="HSK1">HSK1</option><option value="HSK2">HSK2</option><option value="HSK3">HSK3</option><option value="HSK4">HSK4</option><option value="HSK5">HSK5</option><option value="HSK6">HSK6</option></select></div>
                    <div><label className="block text-sm font-bold mb-1">Loại</label><select value={editingShadow.type} onChange={e => setEditingShadow({ ...editingShadow, type: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900"><option value="sentence">Câu văn</option><option value="vocab">Từ vựng</option></select></div>
                    <div><label className="block text-sm font-bold mb-1">Tên bài học</label><input type="text" value={editingShadow.title} onChange={e => setEditingShadow({ ...editingShadow, title: e.target.value })} className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500" /></div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Danh sách Từ vựng / Câu</label>
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium mb-4 border border-blue-200 shadow-inner">
                      <p className="mb-2"><strong>Nhập từng hạng mục bằng các ô riêng:</strong> Tiếng Trung, Pinyin, Tiếng Việt, Tiếng Anh.</p>
                      <p><strong>Chú thích Pinyin trong ô Tiếng Trung:</strong> <code>[汉字|pinyin]</code> — ví dụ <code>[学|xué]校</code>.</p>
                    </div>

                    <div className="space-y-4">
                      {shadowItems.map((item, index) => (
                        <div key={index} className="p-4 border rounded-xl bg-slate-50 space-y-3">
                          <div className="flex justify-between items-center gap-3">
                            <p className="font-bold text-sm text-slate-700">Hạng mục {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => {
                                if (shadowItems.length === 1) {
                                  setShadowItems([{ cn: '', pinyin: '', vi: '', en: '', audioUrl: '', slowAudioUrl: '' }]);
                                  return;
                                }
                                setShadowItems(shadowItems.filter((_, i) => i !== index));
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1"
                            >
                              <Trash2 size={14} /> Xóa
                            </button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-700">Tiếng Trung</label>
                              <input
                                type="text"
                                value={item.cn}
                                onChange={e => {
                                  const updated = [...shadowItems];
                                  updated[index] = { ...updated[index], cn: e.target.value };
                                  setShadowItems(updated);
                                }}
                                className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500"
                                placeholder="VD: [学|xué]校 hoặc [你|nǐ]好。"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-700">Pinyin</label>
                              <input
                                type="text"
                                value={item.pinyin}
                                onChange={e => {
                                  const updated = [...shadowItems];
                                  updated[index] = { ...updated[index], pinyin: e.target.value };
                                  setShadowItems(updated);
                                }}
                                className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500"
                                placeholder="VD: xuéxiào / nǐ hǎo"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-700">Tiếng Việt</label>
                              <input
                                type="text"
                                value={item.vi}
                                onChange={e => {
                                  const updated = [...shadowItems];
                                  updated[index] = { ...updated[index], vi: e.target.value };
                                  setShadowItems(updated);
                                }}
                                className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500"
                                placeholder="VD: Trường học / Xin chào"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-700">Tiếng Anh</label>
                              <input
                                type="text"
                                value={item.en}
                                onChange={e => {
                                  const updated = [...shadowItems];
                                  updated[index] = { ...updated[index], en: e.target.value };
                                  setShadowItems(updated);
                                }}
                                className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500"
                                placeholder="VD: School / Hello"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-700">Link audio mẫu miễn phí / giọng nữ bản địa MP3 — tốc độ chuẩn</label>
                              <input
                                type="text"
                                value={item.audioUrl || ''}
                                onChange={e => {
                                  const updated = [...shadowItems];
                                  updated[index] = { ...updated[index], audioUrl: e.target.value };
                                  setShadowItems(updated);
                                }}
                                className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500"
                                placeholder="VD: https://.../xuexiao_normal_female.mp3"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-700">Link audio mẫu miễn phí / giọng nữ bản địa MP3 — bản chậm không méo chữ</label>
                              <input
                                type="text"
                                value={item.slowAudioUrl || ''}
                                onChange={e => {
                                  const updated = [...shadowItems];
                                  updated[index] = { ...updated[index], slowAudioUrl: e.target.value };
                                  setShadowItems(updated);
                                }}
                                className="w-full p-3 border rounded-xl text-slate-900 placeholder:text-slate-500"
                                placeholder="VD: https://.../xuexiao_slow_female.mp3"
                              />
                              <p className="text-[11px] text-slate-500 mt-1">Bản chậm phải được thu/synthesize chậm riêng. App không kéo chậm file chuẩn bằng playbackRate để tránh méo thanh điệu.</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShadowItems([...shadowItems, { cn: '', pinyin: '', vi: '', en: '', audioUrl: '', slowAudioUrl: '' }])}
                      className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold text-sm flex items-center gap-2"
                    >
                      <Plus size={16} /> Thêm hạng mục
                    </button>
                  </div>
                  <div className="flex gap-4 mt-8 pt-4 border-t"><button onClick={() => saveShadow(false)} className="flex-1 bg-slate-200 py-3 rounded-xl font-bold">Lưu Nháp</button><button onClick={() => saveShadow(true)} className="flex-1 bg-[#C8102E] text-white py-3 rounded-xl font-bold">Lưu & Public</button></div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// ENGINE CHẤM ĐIỂM GENERATIVE AI (THÔNG MINH)
// ---------------------------------------------------------

const isShadowingMode = (mode) => mode === 'vocab' || mode === 'sentence';

const getTaskTypeLabel = (mode) => {
  if (isShadowingMode(mode)) return 'Shadowing';
  if (mode === 'topic') return 'Nói theo chủ đề';
  return 'Nói tự do';
};


const clampScore10 = (value) => Math.min(10.0, Math.max(0.0, parseFloat(value) || 0.0));
const roundScore10 = (value) => Number(clampScore10(value).toFixed(1));

const CHINESE_RUBRICS = {
  vocab: {
    label: 'Shadowing theo từ',
    criteria: [
      ['initials_finals', 'Thanh mẫu & vận mẫu', 4],
      ['tone_accuracy', 'Thanh điệu', 3.5],
      ['tone_sandhi', 'Biến điệu', 1],
      ['difficult_sounds', 'Âm khó đặc trưng', 1],
      ['naturalness', 'Độ tự nhiên', 0.5]
    ]
  },
  sentence: {
    label: 'Shadowing theo câu',
    criteria: [
      ['pronunciation', 'Phát âm', 2.5],
      ['tone_accuracy', 'Thanh điệu', 3],
      ['sandhi_intonation', 'Biến điệu & ngữ điệu', 1.5],
      ['rhythm', 'Rhythm', 1],
      ['similarity', 'Similarity', 2]
    ]
  },
  topic: {
    label: 'Nói theo chủ đề mẫu',
    criteria: [
      ['pronunciation', 'Phát âm', 2],
      ['grammar', 'Ngữ pháp', 2],
      ['topic_vocabulary', 'Từ vựng đúng chủ đề', 1.5],
      ['content_completeness', 'Nội dung đủ ý', 2],
      ['fluency', 'Trôi chảy', 1.5],
      ['task_relevance', 'Liên quan đề bài', 1]
    ]
  },
  free: {
    label: 'Free Speaking',
    criteria: [
      ['pronunciation', 'Phát âm', 2.5],
      ['fluency', 'Trôi chảy', 2.5],
      ['grammar', 'Ngữ pháp', 2],
      ['vocabulary', 'Từ vựng', 1.5],
      ['idea_development', 'Phát triển ý', 1.5]
    ]
  }
};

const getRubricForMode = (mode) => CHINESE_RUBRICS[mode] || CHINESE_RUBRICS.free;

const score10ToRank = (score, lang = 'vi') => {
  const n = parseFloat(score) || 0;
  if (lang === 'en') {
    if (n >= 9) return 'Excellent';
    if (n >= 8) return 'Good';
    if (n >= 6) return 'Fair';
    if (n >= 4) return 'Needs Practice';
    return 'Needs Intensive Practice';
  }
  if (n >= 9) return 'Xuất sắc';
  if (n >= 8) return 'Tốt';
  if (n >= 6) return 'Khá';
  if (n >= 4) return 'Cần luyện thêm';
  return 'Cần hỗ trợ nhiều';
};

const buildCriteriaScores = (criteriaPairs) => {
  const criteria_scores = {};
  criteriaPairs.forEach(([key, name, score, maxScore = 10]) => {
    const safeMax = parseFloat(maxScore) || 10;
    criteria_scores[key] = {
      name,
      score: Number(Math.min(safeMax, Math.max(0, parseFloat(score) || 0)).toFixed(1)),
      max_score: safeMax
    };
  });
  return criteria_scores;
};

const totalCriteriaScore10 = (criteria_scores) => {
  const values = Object.values(criteria_scores || {});
  if (!values.length) return 0.0;
  const total = values.reduce((sum, item) => sum + (parseFloat(item?.score) || 0), 0);
  return roundScore10(total);
};

const makeDefaultCriteriaScores = (mode, ratio = 0.55) => {
  const rubric = getRubricForMode(mode);
  return buildCriteriaScores(rubric.criteria.map(([key, name, maxScore]) => [
    key,
    name,
    Number((maxScore * ratio).toFixed(1)),
    maxScore
  ]));
};

const feedbackObjectToText = (feedback) => {
  if (!feedback) return '';
  if (typeof feedback === 'string') return feedback;

  const lines = [];
  if (Array.isArray(feedback.strengths) && feedback.strengths.length > 0) {
    lines.push('Điểm mạnh');
    feedback.strengths.forEach(item => lines.push(`✓ ${item}`));
  } else if (feedback.praise) {
    lines.push('Điểm mạnh');
    lines.push(`✓ ${feedback.praise}`);
  }

  if (Array.isArray(feedback.errors_found) && feedback.errors_found.length > 0) {
    lines.push('\nLỗi cần sửa');
    feedback.errors_found.forEach((error) => {
      const original = error.original ? ` "${error.original}"` : '';
      const correction = error.correction ? ` → ${error.correction}` : '';
      const explanation = error.explanation ? ` — ${error.explanation}` : '';
      lines.push(`✗ ${error.error_type || 'Lỗi'}${original}${correction}${explanation}`);
    });
  } else {
    lines.push('\nLỗi cần sửa');
    lines.push('Không có lỗi đáng kể được phát hiện từ transcript.');
  }

  if (Array.isArray(feedback.practice_suggestions) && feedback.practice_suggestions.length > 0) {
    lines.push('\nGợi ý luyện tập');
    feedback.practice_suggestions.forEach(item => lines.push(`→ ${item}`));
  } else if (feedback.native_suggestion) {
    lines.push('\nGợi ý luyện tập');
    lines.push(`→ ${feedback.native_suggestion}`);
  }

  return lines.join('\n').trim();
};

const stripChineseMarkup = (text) => String(text || '')
  .replace(/\[([^|]+)\|([^\]]+)\]/g, '$1')
  .replace(/[，。！？、,.!?\s]/g, '');

const estimateShadowingMatchRatio = (transcript, expectedText) => {
  const expected = stripChineseMarkup(expectedText);
  const heard = stripChineseMarkup(transcript);
  if (!expected || !heard) return 0;
  let matched = 0;
  for (const char of heard) {
    if (expected.includes(char)) matched += 1;
  }
  return Math.min(1, matched / Math.max(1, expected.length));
};

const normalizeChineseAssessmentResult = (raw, mode, lang = 'vi', context = {}) => {
  if (!raw || typeof raw !== 'object') return null;

  const rubric = getRubricForMode(mode);
  const criteria_scores = {};

  if (raw.criteria_scores && typeof raw.criteria_scores === 'object') {
    rubric.criteria.forEach(([key, defaultName, maxScore], index) => {
      const item = raw.criteria_scores[key] || raw.criteria_scores[`criterion_${index + 1}`] || {};
      const rawScore = item?.score ?? item;
      const parsed = parseFloat(rawScore);

      // Mỗi criterion.score phải là điểm đạt được trong giới hạn max_score.
      // Nếu AI lỡ trả điểm /10 cho từng tiêu chí, quy đổi về điểm theo trọng số thay vì clamp thô.
      let score = Number.isFinite(parsed) ? parsed : 0;
      if (score > maxScore && score <= 10) {
        score = (score / 10) * maxScore;
      }

      criteria_scores[key] = {
        name: item?.name || defaultName,
        score: Number(Math.min(maxScore, Math.max(0, score)).toFixed(1)),
        max_score: parseFloat(item?.max_score || maxScore)
      };
    });
  } else {
    const legacyTotal = parseFloat(raw.total_score || raw.overall_score || raw.score || 0);
    const ratio = legacyTotal > 5 ? legacyTotal / 10 : legacyTotal > 0 ? legacyTotal / 5 : 0.45;
    Object.assign(criteria_scores, makeDefaultCriteriaScores(mode, ratio));
  }

  const criteriaTotal = totalCriteriaScore10(criteria_scores);
  const rawTotal = parseFloat(raw.total_score ?? raw.overall_score ?? raw.score ?? NaN);

  // Lỗi cũ: tin tuyệt đối raw.total_score khiến AI trả nhầm average 2.0/2.0 thì tổng bị rơi về 2.0,
  // dù criteria và feedback cho thấy bài tốt. Luôn ưu tiên tổng theo rubric, chỉ dùng rawTotal nếu hợp lý.
  let total_score = criteriaTotal;
  if (Number.isFinite(rawTotal)) {
    const looksLikeAverageOnSmallScale = rawTotal <= 3 && criteriaTotal >= 5;
    const tooFarFromCriteria = Math.abs(rawTotal - criteriaTotal) > 2;
    if (!looksLikeAverageOnSmallScale && !tooFarFromCriteria) {
      total_score = rawTotal;
    }
  }

  // Guardrail cho Shadowing: nếu transcript STT khớp hoàn toàn/gần hoàn toàn câu mẫu,
  // không để điểm tụt xuống quá thấp chỉ vì model lỡ bịa lỗi không có bằng chứng âm thanh.
  if (isShadowingMode(mode) && context?.expectedText && context?.transcript) {
    const ratio = estimateShadowingMatchRatio(context.transcript, context.expectedText);
    const minGoodScore = mode === 'vocab' ? 8.0 : 7.5;
    if (ratio >= 0.95 && total_score < minGoodScore) {
      total_score = minGoodScore;
    } else if (ratio >= 0.75 && total_score < 6.0) {
      total_score = 6.0;
    }
  }

  total_score = roundScore10(total_score);

  return {
    ...raw,
    total_score,
    score: total_score.toFixed(1),
    level: raw.level || score10ToRank(total_score, lang),
    estimated_hsk: raw.estimated_hsk || '',
    criteria_scores,
    criteria: Object.fromEntries(Object.entries(criteria_scores).map(([_, item]) => [
      `${item.name} (${item.max_score}đ)`,
      item.score.toFixed(1)
    ])),
    feedback: feedbackObjectToText(raw.feedback),
    feedback_json: raw.feedback
  };
};

function generateGradingResultFallback(transcript, expectedRawText, level, mode, lang, t) {
  const cleanExpected = expectedRawText ? expectedRawText.replace(/\[([^|]+)\|([^\]]+)\]/g, '$1').replace(/[，。！？、\s]/g, '') : '';
  const cleanTranscript = transcript ? transcript.replace(/[，。！？、\s]/g, '') : '';

  let ratio = 0.45;
  let strengths = ['Bạn đã cố gắng hoàn thành bài nói.'];
  let practice = [];

  if (isShadowingMode(mode)) {
    let matchCount = 0;
    for (let char of cleanTranscript) if (cleanExpected.includes(char)) matchCount++;
    ratio = Math.min(1, Math.max(0.2, matchCount / Math.max(1, cleanExpected.length)));
    strengths = ratio >= 0.8
      ? ['Đọc đúng phần lớn nội dung mẫu.', 'Người nghe có thể hiểu dễ dàng.']
      : ['Người nghe vẫn nhận ra được một phần nội dung chính.'];
    practice = mode === 'vocab'
      ? ['Luyện thanh điệu riêng trước khi tăng tốc độ.', 'Ôn các cặp âm zh/z, ch/c, sh/s, j/q/x.']
      : ['Shadowing theo cụm ngắn thay vì đọc từng từ rời rạc.', 'Đánh dấu thanh điệu và cụm ngắt trước khi nói.'];
  } else if (mode === 'topic') {
    ratio = cleanTranscript.length < 10 ? 0.35 : cleanTranscript.length < 30 ? 0.55 : cleanTranscript.length < 80 ? 0.75 : 0.85;
    strengths = ['Trả lời có liên quan đến chủ đề.', 'Đã truyền đạt được một số ý chính.'];
    practice = ['Kiểm tra danh sách ý bắt buộc trước khi nói.', 'Dùng thêm 因为、所以、但是、然后 để nối ý.'];
  } else {
    ratio = cleanTranscript.length < 10 ? 0.35 : cleanTranscript.length < 40 ? 0.6 : cleanTranscript.length < 100 ? 0.75 : 0.85;
    strengths = ['Diễn đạt được ý cơ bản trong phần nói tự do.'];
    practice = ['Mỗi ý nên có 观点、原因、例子.', 'Nói thành câu hoàn chỉnh thay vì các từ đơn lẻ.'];
  }

  const criteria_scores = makeDefaultCriteriaScores(mode, ratio);
  return normalizeChineseAssessmentResult({
    total_score: totalCriteriaScore10(criteria_scores),
    criteria_scores,
    feedback: {
      strengths,
      errors_found: [],
      practice_suggestions: practice,
      native_suggestion: practice.join(' ')
    }
  }, mode, lang);
}



const normalizePronunciationEvidence = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, (ch) => ({
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    'ǖ': 'u', 'ǘ': 'u', 'ǚ': 'u', 'ǜ': 'u', 'ü': 'u'
  }[ch] || ch))
  .replace(/[^a-z0-9\u4e00-\u9fff]/g, '');

const SHADOWING_FORBIDDEN_FEEDBACK_PATTERNS = [
  /nên\s+nói\s+dài\s+hơn/i,
  /nên\s+mở\s+rộng\s+ý/i,
  /nên\s+thêm\s+lý\s+do/i,
  /nên\s+thêm\s+ví\s+dụ/i,
  /nên\s+mô\s+tả\s+chi\s+tiết\s+hơn/i,
  /câu\s+trả\s+lời\s+còn\s+ngắn/i,
  /phát\s+triển\s+nội\s+dung\s+phong\s+phú\s+hơn/i,
  /say\s+more/i,
  /speak\s+longer/i,
  /expand\s+(your\s+)?idea/i,
  /add\s+(a\s+)?reason/i,
  /add\s+(an\s+)?example/i,
  /describe\s+in\s+more\s+detail/i,
  /too\s+short/i,
  /develop\s+(the\s+)?content/i,
  /more\s+details/i
];

const containsShadowingForbiddenFeedback = (value) => {
  const text = String(value || '');
  return SHADOWING_FORBIDDEN_FEEDBACK_PATTERNS.some(pattern => pattern.test(text));
};

const sanitizeShadowingApiResult = (apiRes, lang) => {
  if (!apiRes || typeof apiRes !== 'object') return apiRes;
  const clean = { ...apiRes };

  const filterForbiddenItems = (items) => Array.isArray(items)
    ? items.filter(item => !containsShadowingForbiddenFeedback(JSON.stringify(item)))
    : [];

  clean.weaknesses = filterForbiddenItems(clean.weaknesses);
  clean.next_practice_targets = filterForbiddenItems(clean.next_practice_targets)
    .filter(item => /phát âm|thanh điệu|âm|nhịp|lưu loát|pronunciation|tone|sound|rhythm|fluency|accuracy/i.test(String(item || '')));

  clean.content_analysis = null;

  clean.errors = Array.isArray(clean.errors)
    ? clean.errors.filter(error => {
        const heard = normalizePronunciationEvidence(error?.heard);
        const expected = normalizePronunciationEvidence(error?.expected);
        if (heard && expected && heard === expected) return false;
        if (containsShadowingForbiddenFeedback(JSON.stringify(error))) return false;
        return Boolean(error?.word || error?.heard || error?.expected || error?.issue);
      })
    : [];

  if (containsShadowingForbiddenFeedback(clean.teacher_comment)) {
    clean.teacher_comment = '';
  }

  if (!clean.errors.length && (!clean.weaknesses || !clean.weaknesses.length)) {
    clean.teacher_comment = lang === 'en'
      ? 'The pronunciation is acceptable based on the recognized speech. The learner matched the sample well enough, with no clear pronunciation error detected. Keep focusing on accurate tones, natural rhythm, and smooth delivery when repeating the model sentence.'
      : 'Phát âm đạt yêu cầu dựa trên phần hệ thống nhận diện được. Học viên đã đọc khá khớp với câu mẫu và không phát hiện lỗi phát âm rõ ràng. Tiếp tục giữ thanh điệu chính xác, nhịp đọc tự nhiên và độ lưu loát khi nhắc lại câu mẫu.';
  }

  return clean;
};

const buildEvidenceBasedFeedbackText = (apiRes, lang, mode = '') => {
  const isEn = lang === 'en';
  const shadowing = isShadowingMode(mode);
  apiRes = shadowing ? sanitizeShadowingApiResult(apiRes, lang) : apiRes;
  const lines = [];

  const addSection = (title, items, formatter) => {
    if (!items || !Array.isArray(items) || items.length === 0) return;
    lines.push(`\n${title}`);
    items.forEach((item, index) => {
      if (typeof item === 'string') {
        lines.push(`${index + 1}. ${item}`);
      } else {
        lines.push(`${index + 1}. ${formatter(item)}`);
      }
    });
  };

  if (apiRes.spoken_transcript) {
    lines.push(isEn ? `What the learner said: "${apiRes.spoken_transcript}"` : `Học viên đã nói: "${apiRes.spoken_transcript}"`);
  }

  addSection(
    isEn ? 'Strengths based on the speech:' : 'Điểm tốt bám sát bài nói:',
    apiRes.strengths,
    item => {
      const quote = item.quote || item.text || item.phrase || '';
      const reason = item.reason || item.comment || '';
      return quote ? `"${quote}" — ${reason}` : reason;
    }
  );

  addSection(
    isEn ? 'Specific points to improve:' : 'Điểm cần sửa cụ thể:',
    apiRes.weaknesses,
    item => {
      const quote = item.quote || item.text || item.phrase || '';
      const issue = item.issue || item.reason || '';
      const suggestion = item.suggestion || '';
      return `${quote ? `"${quote}" — ` : ''}${issue}${suggestion ? ` ${isEn ? 'Suggestion:' : 'Gợi ý:'} ${suggestion}` : ''}`;
    }
  );

  if (!shadowing && apiRes.content_analysis) {
    const ca = apiRes.content_analysis;
    lines.push(isEn ? '\nContent analysis:' : '\nPhân tích nội dung:');

    if (Array.isArray(ca.main_ideas_detected) && ca.main_ideas_detected.length > 0) {
      lines.push(isEn ? `- Ideas covered: ${ca.main_ideas_detected.join('; ')}` : `- Ý đã nói được: ${ca.main_ideas_detected.join('; ')}`);
    }

    if (Array.isArray(ca.missing_ideas) && ca.missing_ideas.length > 0) {
      lines.push(isEn ? `- Missing ideas: ${ca.missing_ideas.join('; ')}` : `- Ý còn thiếu: ${ca.missing_ideas.join('; ')}`);
    }

    if (ca.topic_relevance_comment) {
      lines.push(isEn ? `- Relevance: ${ca.topic_relevance_comment}` : `- Mức độ bám đề: ${ca.topic_relevance_comment}`);
    }

    if (Array.isArray(ca.expansion_suggestions) && ca.expansion_suggestions.length > 0) {
      lines.push(isEn ? `- Ways to expand: ${ca.expansion_suggestions.join('; ')}` : `- Có thể mở rộng thêm: ${ca.expansion_suggestions.join('; ')}`);
    }
  }

  addSection(
    isEn ? 'Pronunciation / language errors:' : 'Lỗi phát âm / ngôn ngữ cụ thể:',
    apiRes.errors,
    item => {
      const word = item.word || item.quote || '';
      const heard = item.heard ? `${isEn ? 'heard' : 'nghe thành'} "${item.heard}"` : '';
      const expected = item.expected ? `${isEn ? 'expected' : 'đúng là'} "${item.expected}"` : '';
      const issue = item.issue || '';
      const suggestion = item.suggestion || '';
      const parts = [heard, expected, issue].filter(Boolean).join('; ');
      return `${word ? `"${word}" — ` : ''}${parts}${suggestion ? ` ${isEn ? 'Suggestion:' : 'Cách sửa:'} ${suggestion}` : ''}`;
    }
  );

  if (!shadowing && Array.isArray(apiRes.next_practice_targets) && apiRes.next_practice_targets.length > 0) {
    lines.push(isEn ? '\nNext practice targets:' : '\nMục tiêu luyện tiếp:');
    apiRes.next_practice_targets.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  }

  if (apiRes.teacher_comment) {
    lines.push(isEn ? `\nTeacher comment:\n${apiRes.teacher_comment}` : `\nNhận xét của giáo viên:\n${apiRes.teacher_comment}`);
  } else if (Array.isArray(apiRes.feedback) && apiRes.feedback.length > 0) {
    lines.push(isEn ? '\nOverall feedback:' : '\nNhận xét tổng quát:');
    apiRes.feedback.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  } else if (typeof apiRes.feedback === 'string' && apiRes.feedback.trim()) {
    lines.push(apiRes.feedback.trim());
  }

  return lines.join('\n').trim();
};

const evaluateWithOpenAI = async (transcript, expectedText, level, mode, lang, requirement = '') => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const taskType = getTaskTypeLabel(mode);
  const promptTarget = mode === 'topic' ? (requirement || expectedText || 'None') : (expectedText || requirement || 'None');

  const rubric = getRubricForMode(mode);
  const rubricJson = JSON.stringify(
    Object.fromEntries(rubric.criteria.map(([key, name, maxScore]) => [key, { name, max_score: maxScore }])),
    null,
    2
  );

  const systemPrompt = `Bạn là AI Chuyên gia Khảo thí & Giám khảo Tiếng Trung có 15 năm kinh nghiệm. Hãy chấm bài nói theo rubric tiếng Trung mới của Mandarin Spark và trả về JSON hợp lệ bằng tiếng Việt.

THÔNG TIN BÀI LÀM:
- Dạng bài: ${rubric.label}
- Mode kỹ thuật: ${mode}
- Đề bài/Câu mẫu/Yêu cầu: "${promptTarget}"
- Transcript STT của học sinh: "${transcript}"
- Trình độ mục tiêu: ${level || 'HSK1-HSK3 Beginner'}

MỤC TIÊU TỪNG LOẠI BÀI:
- Shadowing theo từ: phát âm + thanh điệu chính xác.
- Shadowing theo câu: phát âm + thanh điệu + ngữ điệu câu.
- Nói theo chủ đề mẫu: khả năng tái tạo ngôn ngữ. Học sinh có bài mẫu tham khảo nhưng KHÔNG bắt buộc lặp lại bài mẫu; được dùng cách diễn đạt riêng, thêm trải nghiệm cá nhân và mở rộng nội dung.
- Nói tự do: năng lực giao tiếp thực sự. KHÔNG đánh giá chủ đề đúng/sai, KHÔNG chấm giống bài mẫu hay bám đề; chỉ đánh giá khả năng sử dụng tiếng Trung.

RUBRIC CẦN DÙNG CHO BÀI NÀY:
${rubricJson}

Bạn PHẢI trả về đủ đúng các key sau trong criteria_scores: ${rubric.criteria.map(([key]) => key).join(', ')}.

GIẢI THÍCH TIÊU CHÍ:
1. Shadowing theo từ:
- initials_finals: thanh mẫu 声母, vận mẫu 韵母, không thiếu/thêm âm, không đọc theo tiếng Việt/Anh.
- tone_accuracy: thanh 1, 2, 3, 4, thanh nhẹ. Đây là tiêu chí rất quan trọng.
- tone_sandhi: biến điệu thanh 3+3, 一, 不 nếu xuất hiện. Không phạt nếu từ không có biến điệu.
- difficult_sounds: zh/ch/sh/r, j/q/x, z/zh, c/ch, s/sh, l/n.
- naturalness: không đánh vần từng âm, không ngắt bất thường, nghe tự nhiên. Beginner chấm nhẹ.

2. Shadowing theo câu:
- pronunciation: đọc đúng từng từ.
- tone_accuracy: giữ thanh điệu trong cả câu, không mất thanh khi nói nhanh.
- sandhi_intonation: biến điệu và ngữ điệu câu tự nhiên, ví dụ 是不是? lên giọng cuối câu.
- rhythm: ngắt cụm hợp lý.
- similarity: so với câu mẫu về phát âm, thanh điệu, tốc độ, ngữ điệu, nhịp câu.

3. Nói theo chủ đề mẫu:
- pronunciation: thanh mẫu, vận mẫu, thanh điệu, độ dễ hiểu.
- grammar: trật tự từ, 是, 有, lượng từ, trợ từ cơ bản. Ví dụ 我妈妈老师 → 我妈妈是老师.
- topic_vocabulary: từ vựng đúng chủ đề và có sự đa dạng.
- content_completeness: đủ các ý yêu cầu trong đề.
- fluency: ít ngập ngừng, nói thành cụm câu, có kết nối ý.
- task_relevance: có liên quan đề bài. Không bắt buộc lặp lại bài mẫu.

4. Free Speaking:
- pronunciation: độ rõ, thanh điệu, biến điệu cơ bản, âm khó.
- fluency: nói liên tục, ít ngập ngừng, tốc độ phù hợp.
- grammar: trật tự từ, lượng từ, cấu trúc câu, trợ từ cơ bản.
- vocabulary: đa dạng và phù hợp.
- idea_development: có giải thích, ví dụ, liên kết ý.

QUY TẮC CHẤM ĐIỂM:
1. Chỉ trả về một JSON object hợp lệ. Không markdown, không lời dẫn.
2. total_score dùng thang 10, là tổng điểm các tiêu chí theo max_score ở rubric trên.
3. Mỗi criterion.score là điểm đạt được trong giới hạn criterion.max_score, không phải điểm /10 riêng lẻ.
4. Chỉ ghi lỗi khi có bằng chứng trong transcript hoặc có thể so với câu mẫu/yêu cầu. Không bịa lỗi.
5. Phải chỉ ra lỗi cụ thể: học sinh nói gì, nên sửa thành gì, vì sao sai.
6. Nếu transcript rỗng/không nhận diện được, cho điểm thấp và nói rõ.
7. Nếu học sinh nói chủ yếu tiếng Việt/Anh hoặc không phải tiếng Trung, cho điểm thấp.
8. Với Shadowing, KHÔNG nhận xét “nên nói dài hơn”, “thiếu ý”, “cần mở rộng nội dung”. Chỉ nhận xét phát âm, thanh điệu, biến điệu, ngữ điệu, nhịp, similarity.
9. Vì transcript STT có thể tự sửa lỗi phát âm/thanh điệu, hãy thận trọng: nếu không đủ bằng chứng, dùng các câu như “chưa có đủ bằng chứng âm thanh để kết luận lỗi thanh điệu cụ thể từ transcript”.
10. Với Beginner, chấm nhẹ lỗi nhỏ nhưng vẫn cần phân biệt thanh điệu cơ bản.
11. Với câu/ngữ đoạn rất ngắn như 你好, 中国人, 学生: KHÔNG bịa lỗi rhythm hoặc ngữ điệu cuối câu nếu câu mẫu không có dấu hỏi/吗/呢/是不是. Nếu transcript khớp câu mẫu, điểm thường phải từ 7.5 trở lên, trừ khi có bằng chứng lỗi phát âm/thanh điệu rõ ràng.
12. Tuyệt đối không trả total_score là điểm trung bình 2.0/2.5/3.0. total_score phải là TỔNG các criterion.score theo trọng số, tối đa 10.

ĐẦU RA JSON BẮT BUỘC:
{
  "total_score": 8.5,
  "criteria_scores": {
    "criterion_key_from_rubric": { "name": "Tên tiêu chí", "score": 1.7, "max_score": 2 }
  },
  "note": "total_score phải bằng tổng tất cả criterion.score, không phải điểm trung bình",
  "feedback": {
    "strengths": [
      "Điểm mạnh cụ thể, bám vào bài nói."
    ],
    "errors_found": [
      {
        "error_type": "Ví dụ: Thanh điệu / Thanh mẫu-vận mẫu / Biến điệu / Ngữ pháp / Lượng từ / Trật tự từ",
        "original": "Phần học sinh nói sai hoặc phần đáng chú ý",
        "correction": "Cách sửa đúng, kèm pinyin nếu cần",
        "explanation": "Giải thích ngắn gọn, cụ thể."
      }
    ],
    "practice_suggestions": [
      "Gợi ý luyện tập cụ thể, có ví dụ tiếng Trung/pinyin nếu phù hợp."
    ],
    "native_suggestion": "Một gợi ý diễn đạt tự nhiên hơn, kèm pinyin và nghĩa tiếng Việt nếu phù hợp."
  }
}`;

  if (!apiKey) {
    console.warn('OpenAI API key is missing. Falling back to local evaluation.');
    return null;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Hãy chấm bài nói tiếng Trung theo đúng JSON schema đã yêu cầu. Chỉ trả về JSON hợp lệ.' }
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: 'gpt-4.1-nano', messages, temperature: 0.2, max_tokens: 900 })
    });

    if (!res.ok) {
      console.warn(`OpenAI chat completion returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const textRes = data.choices?.[0]?.message?.content;
    if (!textRes) return null;

    const match = textRes.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : textRes;
    try {
      return normalizeChineseAssessmentResult(JSON.parse(jsonText), mode, lang, { transcript, expectedText });
    } catch (err) {
      console.warn('OpenAI response is not valid JSON:', err, textRes);
      return null;
    }
  } catch (err) {
    console.warn('OpenAI request error:', err);
    return null;
  }
};

// ---------------------------------------------------------
// COMPONENT: THU ÂM (TÍCH HỢP SPEECH RECOGNITION + OPENAI )
// ---------------------------------------------------------
function AudioInput({ onAudioReady, disableTranscription = false, simplePractice = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  // ❌ vẫn giữ nhưng KHÔNG dùng cho transcript nữa
  const recognitionRef = useRef(null);

  // ✅ Detect SpeechRecognition (chỉ để future nếu cần)
  const isSpeechSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // 🔥 Ưu tiên mp4 để tránh lỗi nhận sai ngôn ngữ
  const getMimeType = () => {
    if (typeof MediaRecorder === "undefined") return '';

    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mpeg')) return 'audio/mpeg';

    return '';
  };

  // (giữ lại nhưng không ảnh hưởng gì)
  useEffect(() => {
    if (!isSpeechSupported) {
      recognitionRef.current = null;
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognitionRef.current = recognition;
  }, []);

  // 🔥 OpenAI auto multi-language
  const transcribeWithOpenAI = async (file) => {
    console.log("🚀 Calling OpenAI transcription...");

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) return null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'gpt-4o-mini-transcribe');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.text;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onAudioReady(file, URL.createObjectURL(file), null, true);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = getMimeType();
      console.log("🎤 MIME:", mimeType);

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : {}
      );

      const chunks = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, {
          type: mimeType || 'audio/mp4'
        });

        const file = new File(
          [blob],
          `recorded.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`,
          { type: blob.type }
        );

        let transcript = null;

        if (!disableTranscription) {
          try {
            // 🔥 LUÔN dùng OpenAI cho Topic/Free Speaking
            transcript = await transcribeWithOpenAI(file);
            console.log("✅ FINAL AI TRANSCRIPT:", transcript);
          } catch (e) {
            console.log("❌ OpenAI error:", e);
          }
        }

        onAudioReady(
          file,
          URL.createObjectURL(blob),
          transcript,
          false
        );

        clearInterval(timerRef.current);
        setRecordingTime(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      alert("Không thể truy cập Microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();

      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div onClick={() => !isRecording && document.getElementById('file-upload').click()} className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group bg-white border-slate-300 hover:border-[#C8102E]/50 ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
        <input id="file-upload" type="file" accept="audio/*,video/*" className="hidden" onChange={handleFileChange} />
        <Upload size={28} className="text-[#C8102E] mb-3 group-hover:-translate-y-1 transition-transform" />
        <h3 className="font-bold text-slate-800">Tải file lên</h3>
        <p className="text-xs text-slate-500 mt-1">{simplePractice ? "Nghe lại bản ghi" : "Hệ thống sẽ giả lập chấm điểm"}</p>
      </div>

      <div className={`border-2 rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-200 ${isRecording ? 'border-[#C8102E] bg-[#fff0f5] shadow-inner' : 'border-[#C8102E]/30 bg-red-50/30 relative overflow-hidden'}`}>
        {!isRecording && !simplePractice && <div className="absolute top-0 right-0 bg-[#C8102E] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">Khuyên dùng AI</div>}

        {isRecording ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-lg font-bold text-[#C8102E]">
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center gap-2 px-6 font-bold text-sm transition-transform active:scale-95">
              <Square size={16} fill="currentColor" /> DỪNG THU
            </button>
          </>
        ) : (
          <>
            <Mic size={28} className="text-[#C8102E] mb-3" />
            <h3 className="font-bold text-slate-800 mb-2">Thu âm trực tiếp</h3>
            <button onClick={startRecording} className="bg-[#C8102E] hover:bg-[#9b111e] text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
              {simplePractice ? 'Bắt đầu thu âm' : 'Chấm điểm bằng giọng nói'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}



// ---------------------------------------------------------
// COMPONENT: NÓI TỰ DO & NÓI THEO CHỦ ĐỀ
// ---------------------------------------------------------
function FreeAndTopicMode({ type, studentName, onRequireName, dbTopics }) {
  const { lang, t } = useContext(LanguageContext);
  const [step, setStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [isFileUpload, setIsFileUpload] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState('');

  const [isPlayingModel, setIsPlayingModel] = useState(false);

  const publishedTopics = dbTopics.filter(t => {
    if (t.isPublished === undefined || t.isPublished === null) return true;
    return t.isPublished === true || t.isPublished === 'true' || t.isPublished === 1 || t.isPublished === '1';
  });
  const currentTopic = publishedTopics.find(t => t.id === selectedTopicId);

  useEffect(() => { if (!studentName) onRequireName(); }, []);

  const playModelAudio = (modelSource, speedMode = 'normal') => {
    speakMandarinModelAudio({
      modelSource,
      speedMode,
      level: currentTopic?.level || 'HSK3',
      onStart: setIsPlayingModel,
      onEnd: () => setIsPlayingModel(false),
      onUnsupported: () => alert("TTS/audio playback is not supported in your browser.")
    });
  };

  const handleAudioReady = (file, url, text, isFile) => {
    setSelectedFile(file);
    setFileUrl(url);
    setTranscript(text);
    setIsFileUpload(isFile);
  };

  const startGrading = async () => {
    if (type === 'topic' && !selectedTopicId) { alert(lang === 'en' ? "Please select a topic!" : "Vui lòng chọn một chủ đề!"); return; }
    if (!selectedFile) { alert(lang === 'en' ? "Please provide audio!" : "Vui lòng tải lên hoặc thu âm bài nói!"); return; }

    setStep(1); // Cập nhật state để hiển thị màn hình loading

    try {
      // Đợi 0.5s để React ưu tiên hiển thị UI màn hình Đang Tải trước khi khối lệnh chấm điểm chạy
      await new Promise(r => setTimeout(r, 500));

      let finalResult;
      if (isFileUpload) {
        const criteria_scores = makeDefaultCriteriaScores(type, 0.65);
        finalResult = normalizeChineseAssessmentResult({
          total_score: totalCriteriaScore10(criteria_scores),
          criteria_scores,
          feedback: {
            strengths: ['Bạn đã nộp được file âm thanh để hệ thống ghi nhận bài nói.'],
            errors_found: [],
            practice_suggestions: ['Dùng nút Thu âm trực tiếp để AI có thể phân tích sát hơn theo rubric 10 điểm.', 'Khi luyện, chú ý thanh điệu, lượng từ và trật tự từ trong câu tiếng Trung.'],
            native_suggestion: 'Hãy thu âm trực tiếp để nhận phản hồi cụ thể hơn về phát âm, thanh điệu và lỗi ngữ pháp.'
          }
        }, type, lang);
      } else {
        const expectedText = type === 'topic' ? currentTopic?.hint?.cn || '' : '';
        const topicRequirement = type === 'topic' ? currentTopic?.req || '' : '';
        const levelTarget = type === 'topic' ? currentTopic?.level || 'HSK3' : 'HSK3';

        // SỬA LỖI: Cho phép nhận diện cả những từ có 1 ký tự (độ dài === 0 mới báo lỗi)
        if (!transcript || transcript.trim().length === 0) {
          finalResult = {
            score: '2.0', level: lang === 'en' ? 'Needs Practice' : 'Cần luyện tập thêm',
            criteria: { [t('cPronunciation')]: '2.0', [t('cFluency')]: '2.0' },
            feedback: lang === 'en' ? 'The system could not clearly recognize what you said. Please check your microphone and speak louder.' : 'Hệ thống không nhận diện rõ bạn nói gì. Vui lòng kiểm tra Micro và thử nói lớn hơn nhé.'
          };
        } else {
          // 🔥 KIỂM TRA NGÔN NGỮ: Nếu không phải tiếng Trung thì cảnh báo
          const langViolation = detectLanguageViolation(transcript);
          if (langViolation && langViolation.violated) {
            finalResult = {
              score: '1.0',
              level: lang === 'en' ? 'Invalid Language' : 'Sai Ngôn Ngữ',
              criteria: { [t('cPronunciation')]: '1.0', [t('cFluency')]: '1.0' },
              feedback: lang === 'en'
                ? `⚠️ ERROR: You spoke ${langViolation.language} instead of Mandarin Chinese! Please repeat in Mandarin.`
                : `⚠️ LỖI: Bạn nói tiếng ${langViolation.language} thay vì tiếng Trung Quốc! Vui lòng nhập lại bằng tiếng Trung.`
            };
          } else {
            const apiRes = await evaluateWithOpenAI(transcript, expectedText, levelTarget, type, lang, topicRequirement);
            if (apiRes) {
              finalResult = apiRes;
            } else {
              // Fallback an toàn nếu API quá tải
              finalResult = generateGradingResultFallback(transcript, expectedText, levelTarget, type, lang, t);
            }
          }
        }
      }

      setResult(finalResult);
      setStep(2);
    } catch (error) {
      console.error("Lỗi khi đánh giá:", error);
      const expectedText = type === 'topic' ? currentTopic?.hint?.cn || '' : '';
      const levelTarget = type === 'topic' ? currentTopic?.level || 'HSK3' : 'HSK3';
      setResult(generateGradingResultFallback(transcript, expectedText, levelTarget, type, lang, t));
      setStep(2);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 animate-in fade-in duration-500 px-4 pb-20">
      {step === 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-[#f0e0d8]">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            {type === 'topic' ? <BookOpen className="text-[#C8102E]" /> : <Mic className="text-[#C8102E]" />}
            {type === 'topic' ? t('topicTitle') : t('freeTitle')}
          </h2>

          {type === 'topic' && (
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">{t('selectTopic')}</label>
              <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} className="w-full p-4 rounded-xl border border-slate-300 bg-white focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/20 outline-none font-medium text-slate-800 transition-all cursor-pointer shadow-sm">
                <option value="">{t('selectTopicHolder')}</option>
                {publishedTopics.map(tData => <option key={tData.id} value={tData.id}>[{tData.level}] {tData.title}</option>)}
              </select>

              {publishedTopics.length === 0 && (
                <div className="mt-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                  Hiện chưa có chủ đề nào được công khai. Vui lòng kiểm tra dữ liệu topic trong Supabase hoặc bật trường <strong>isPublished</strong>.
                </div>
              )}

              {currentTopic && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-slate-700">
                    <span className="font-bold text-[#C8102E] flex items-center gap-1 mb-1"><Star size={14} /> {t('reqLevel').replace('{0}', currentTopic.level)}</span>
                    <p className="leading-relaxed">{currentTopic.req}</p>
                  </div>

                  <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm relative">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4 border-b pb-3">
                      <span className="font-bold text-slate-800 flex items-center gap-2">
                        <BookA size={16} className="text-blue-500" /> {t('hintModel')}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => playModelAudio(currentTopic.hint, 'slow')} disabled={isPlayingModel !== false} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all flex items-center gap-1 ${isPlayingModel === 'slow' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-300 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-600'}`}>
                          <Volume1 size={14} /> {t('listenSlow')}
                        </button>
                        <button onClick={() => playModelAudio(currentTopic.hint, 'normal')} disabled={isPlayingModel !== false} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all flex items-center gap-1 ${isPlayingModel === 'normal' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-300 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-600'}`}>
                          <Volume2 size={14} /> {t('listenNormal')}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-lg font-medium text-slate-900 tracking-wide break-words">
                        <PronunciationText text={currentTopic.hint.cn} />
                      </div>
                      <p className="text-sm font-mono text-[#C8102E] leading-relaxed mt-2 pt-2 border-t border-slate-100">{currentTopic.hint.pinyin}</p>
                      <p className="text-sm text-slate-600 italic border-l-2 border-slate-300 pl-3 leading-relaxed mt-2">{currentTopic.hint[lang] || currentTopic.hint.vi}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 mt-8 pt-6 border-t border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-3">{t('uploadOrRec')}</label>
            {!selectedFile ? (
              <AudioInput onAudioReady={handleAudioReady} />
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col items-center justify-center relative shadow-sm">
                <button onClick={() => { setSelectedFile(null); setFileUrl(null); setTranscript(null) }} className="absolute top-3 right-4 text-sm text-slate-500 hover:text-red-500 font-bold transition-colors">{t('cancel')}</button>
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 shadow-sm"><CheckCircle2 size={24} /></div>
                <p className="font-medium text-slate-800 text-center mb-1 px-8 truncate w-full">{selectedFile.name}</p>
                {!isFileUpload && transcript && <p className="text-xs text-green-700 italic mb-3">{t('aiRecognized')}</p>}
                <audio controls src={fileUrl} className="w-full max-w-sm rounded-lg" />
              </div>
            )}
          </div>

          <button onClick={startGrading} className="w-full mt-6 bg-[#C8102E] hover:bg-[#9b111e] text-white font-black tracking-wide py-4 rounded-xl shadow-lg shadow-red-500/30 transition-all flex justify-center items-center gap-2">
            <Sparkles size={18} /> {t('startGrading')}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col items-center justify-center py-32 bg-white/90 backdrop-blur-md rounded-3xl border border-[#f0e0d8] shadow-xl">
          <Activity size={64} className="text-[#C8102E] animate-bounce mb-4" />
          <h2 className="font-bold text-xl text-slate-800">{t('aiEvaluating')}</h2>
          <p className="text-slate-500 text-sm mt-2">{t('waitMsg')}</p>
        </div>
      )}

      {step === 2 && result && (
        <ReportCard result={result} studentName={studentName} fileUrl={fileUrl} onReset={() => { setStep(0); setSelectedFile(null); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: SHADOWING 
// ---------------------------------------------------------
function ShadowingMode({ studentName, onRequireName, dbShadowing }) {
  const { lang, t } = useContext(LanguageContext);
  const [setupStep, setSetupStep] = useState(true);
  const [level, setLevel] = useState('HSK1');
  const [type, setType] = useState('sentence');

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [recordedFile, setRecordedFile] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [isPlayingModel, setIsPlayingModel] = useState(false);

  useEffect(() => { if (!studentName) onRequireName(); }, []);

  useEffect(() => {
    const normalizedLevel = String(level || '').trim().toUpperCase();
    const normalizedType = String(type || '').trim().toLowerCase();
    const levelLessons = dbShadowing.filter(item => {
      const published = item.isPublished ?? item.ispublished ?? item.is_published ?? item.published;
      const itemLevel = String(item.level || '').trim().toUpperCase();
      const isPublished = published === true || published === 'true' || published === 1 || published === '1';
      return isPublished && itemLevel === normalizedLevel;
    });

    console.log('ShadowingMode filter debug', {
      selectedLevel: level,
      selectedType: type,
      normalizedLevel,
      normalizedType,
      dbShadowingCount: dbShadowing.length,
      levelLessonsCount: levelLessons.length,
      levelLessons
    });

    const selectedTypeExists = levelLessons.some(item => matchesShadowingType(item.type, normalizedType));
    if (!selectedTypeExists && levelLessons.length > 0) {
      setType(normalizeShadowingType(levelLessons[0].type) || 'vocab');
    }
  }, [level, dbShadowing, type]);

  const lessons = dbShadowing.filter(item => {
    const published = item.isPublished ?? item.ispublished ?? item.is_published ?? item.published;
    const itemLevel = normalizeShadowingLevel(item.level);
    const itemType = normalizeShadowingType(item.type);
    const normalizedLevel = normalizeShadowingLevel(level);
    const normalizedType = normalizeShadowingType(type);
    const isPublished = published === true || published === 'true' || published === 1 || published === '1';
    return isPublished && (itemLevel === normalizedLevel || itemLevel.includes(normalizedLevel) || normalizedLevel.includes(itemLevel)) && matchesShadowingType(itemType, normalizedType);
  });

  console.log('ShadowingMode lessons debug', { level, type, lessonsCount: lessons.length, lessons });

  const startPractice = (lesson) => {
    setSelectedLesson(lesson);
    setCurrentIndex(0);
    setSetupStep(false);
  };

  const playModelAudio = (modelSource, speedMode = 'normal') => {
    speakMandarinModelAudio({
      modelSource,
      speedMode,
      level,
      onStart: setIsPlayingModel,
      onEnd: () => setIsPlayingModel(false)
    });
  };

  const handleAudioReady = async (file, url) => {
    setRecordedFile(file);
    setRecordedUrl(url);
    setIsProcessingRecording(true);

    // Shadowing chỉ dùng để luyện nghe - nhắc lại - nghe lại, không gọi AI chấm điểm.
    await new Promise(r => setTimeout(r, 200));
    setIsProcessingRecording(false);
  };

  const nextItem = () => {
    setRecordedFile(null);
    setRecordedUrl(null);
    setCurrentIndex(prev => prev + 1);
  };

  if (setupStep) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-[#f0e0d8] animate-in fade-in pb-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <MessageCircle className="text-[#C8102E]" /> {t('shadowingTitle')}
        </h2>

        <div className="mb-6">
          <label className="block font-bold text-slate-700 mb-2">{t('chooseLevel')}</label>
          <div className="flex gap-2 flex-wrap">
            {['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'].map(lvl => (
              <button key={lvl} onClick={() => setLevel(lvl)} className={`flex-1 py-3 rounded-xl font-bold border transition-all ${level === lvl ? 'bg-[#C8102E] text-white border-[#C8102E] shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:border-[#C8102E]'}`}>
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="block font-bold text-slate-700 mb-2">{t('chooseType')}</label>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setType('vocab')} className={`py-4 rounded-xl font-bold border flex flex-col items-center justify-center gap-2 transition-all ${type === 'vocab' ? 'bg-red-50 border-[#C8102E] text-[#C8102E]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#C8102E]'}`}>
              <span className="text-2xl">词汇</span>{t('vocab')}
            </button>
            <button onClick={() => setType('sentence')} className={`py-4 rounded-xl font-bold border flex flex-col items-center justify-center gap-2 transition-all ${type === 'sentence' ? 'bg-red-50 border-[#C8102E] text-[#C8102E]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#C8102E]'}`}>
              <span className="text-2xl">句子</span>{t('sentence')}
            </button>
          </div>
        </div>

        <div className="mb-8">
          <label className="block font-bold text-slate-700 mb-2">{t('chooseLesson')}</label>
          {lessons.length === 0 ? (
            <p className="text-sm text-red-500 italic">{t('noLesson')}</p>
          ) : (
            <div className="space-y-3">
              {lessons.map(lesson => (
                <button key={lesson.id} onClick={() => startPractice(lesson)} className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-[#C8102E] hover:shadow-md transition-all flex justify-between items-center group">
                  <div>
                    <h4 className="font-bold text-slate-800">{lesson.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{t('lessonItems').replace('{0}', lesson.items.length)}</p>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-[#C8102E]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentIndex >= selectedLesson.items.length) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white/95 rounded-3xl p-10 text-center shadow-xl border border-[#f0e0d8]">
        <Award size={64} className="text-[#C8102E] mx-auto mb-4" />
        <h2 className="text-3xl font-black text-slate-800 mb-2">{t('completed')}</h2>
        <p className="text-slate-600 mb-8">{t('completedDesc')} "{selectedLesson.title}".</p>
        <button onClick={() => setSetupStep(true)} className="bg-[#C8102E] text-white px-8 py-3 rounded-xl font-bold shadow-lg">{t('chooseOther')}</button>
      </div>
    );
  }

  const currentItem = selectedLesson.items[currentIndex];

  return (
    <div className="max-w-4xl mx-auto mt-8 animate-in fade-in duration-500 px-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle className="text-[#C8102E]" /> {selectedLesson.title} ({level})
        </h2>
        <span className="bg-white px-4 py-1.5 rounded-full font-bold text-[#C8102E] shadow-sm text-sm border border-[#f0e0d8]">
          {currentIndex + 1} / {selectedLesson.items.length}
        </span>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-[#f0e0d8]">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 relative shadow-sm">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C8102E] rounded-l-2xl"></div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="w-full min-w-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-medium text-slate-900 mb-4 font-serif tracking-wide leading-relaxed break-words">
                <PronunciationText text={currentItem.cn} />
              </div>
              <p className="text-base font-mono text-[#C8102E] mb-1 break-words">{currentItem.pinyin}</p>
              <p className="text-sm text-slate-500 italic break-words">{currentItem[lang] || currentItem.vi}</p>
            </div>

            <div className="flex gap-2 shrink-0 self-start mt-2 sm:mt-0">
              <button onClick={() => playModelAudio(currentItem, 'slow')} disabled={isPlayingModel !== false} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-md transition-all border-2 ${isPlayingModel === 'slow' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-200 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-700'}`} title="Nghe đọc chậm">
                <Volume1 size={20} className={isPlayingModel === 'slow' ? "opacity-50" : ""} />
                <span className="text-[9px] font-bold mt-0.5 uppercase">{t('listenSlow')}</span>
              </button>
              <button onClick={() => playModelAudio(currentItem, 'normal')} disabled={isPlayingModel !== false} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-md transition-all border-2 ${isPlayingModel === 'normal' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-200 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-700'}`} title="Nghe đọc chuẩn">
                <Volume2 size={20} className={isPlayingModel === 'normal' ? "opacity-50" : ""} />
                <span className="text-[9px] font-bold mt-0.5 uppercase">{t('listenNormal')}</span>
              </button>
            </div>
          </div>
        </div>

        {!recordedFile && !isProcessingRecording && (
          <div className="animate-in fade-in">
            <div className="bg-red-50 text-red-800 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">
              <Info size={16} className="inline mr-1" />
              {t('yourTurn')}
            </div>
            <AudioInput onAudioReady={handleAudioReady} disableTranscription simplePractice />
          </div>
        )}

        {isProcessingRecording && (
          <div className="py-8 flex flex-col items-center">
            <Activity size={48} className="text-[#C8102E] animate-bounce mb-4" />
            <p className="font-medium text-slate-600">{t('grading')}</p>
          </div>
        )}

        {recordedFile && !isProcessingRecording && (
          <div className="animate-in slide-in-from-bottom-4">
            <div className="p-6 rounded-2xl border shadow-sm bg-green-50 border-green-200 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={24} />
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 text-lg">
                    {lang === 'en' ? 'Recording ready' : 'Đã ghi âm xong'}
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {lang === 'en'
                      ? 'Listen to your recording again, compare it with the sample, then practice it again or move on to the next item.'
                      : 'Hãy nghe lại bản thu của mình, so sánh với mẫu, rồi luyện lại hoặc chuyển sang mục tiếp theo.'}
                  </p>
                </div>
              </div>
              <div className="bg-white/70 p-2 rounded-lg w-full">
                <audio controls src={recordedUrl} className="h-10 w-full rounded" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-slate-200">
              <button onClick={() => { setRecordedFile(null); setRecordedUrl(null); }} className="flex-1 py-4 bg-white border border-slate-300 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                <RefreshCcw size={18} /> {t('tryAgain')}
              </button>
              <button onClick={nextItem} className="flex-1 py-4 bg-[#C8102E] hover:bg-[#9b111e] text-white font-black tracking-wide rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/30">
                {t('nextItem')} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: PHIẾU BÁO CÁO (CHUNG)
// ---------------------------------------------------------
function ReportCard({ result, studentName, fileUrl, onReset }) {
  const { t } = useContext(LanguageContext);
  const criteriaKeys = Object.keys(result.criteria || {});

  return (
    <>
      <div className="flex justify-between items-center mb-6 no-print">
        <button onClick={onReset} className="flex items-center gap-2 text-slate-600 hover:text-[#C8102E] font-bold bg-white/80 px-5 py-2.5 rounded-xl shadow-sm border border-slate-200">
          <RefreshCcw size={18} /> {t('gradeAnother')}
        </button>
        <button onClick={() => window.print()} className="bg-[#C8102E] hover:bg-[#9b111e] text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95">
          <Download size={18} /> {t('exportPDF')}
        </button>
      </div>

      <div id="printable-report" className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-[#f0e0d8]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] bg-[#fffcf9]">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-[#C8102E] rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
              <Star size={28} fill="currentColor" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-slate-800 leading-tight">{t('reportTitle')}</h2>
              <p className="text-xs text-[#C8102E] font-bold tracking-widest mt-2 uppercase">{t('analyzedBy')}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          <div className="bg-[#fff0f5] border border-[#ffe4e1] rounded-2xl p-3 text-center min-w-[120px]">
            <p className="text-[10px] font-bold text-[#C8102E] tracking-widest uppercase mb-1">{t('student')}</p>
            <p className="font-bold text-slate-800 text-lg">{studentName}</p>
          </div>
        </div>

        <div className="p-8">
          {fileUrl && (
            <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100 no-print flex items-center gap-4">
              <Volume2 size={24} className="text-[#C8102E] shrink-0" />
              <div className="flex-1 w-full">
                <p className="text-sm font-bold text-slate-700 mb-2">{t('originalAudio')}</p>
                <audio controls src={fileUrl} className="w-full h-10" />
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-[#fff0f5] flex items-center justify-center bg-white shadow-inner relative z-10">
                <span className="text-5xl font-black text-[#C8102E]">{result.score || Number(result.total_score || 0).toFixed(1)}</span>
              </div>
              <div className="absolute inset-[-4px] rounded-full border border-[#ffe4e1] z-0"></div>
              <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20">
                <Award size={20} />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase mt-4">{t('avgScore')}</p>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <div className="px-6 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-black tracking-wide uppercase border border-green-200 shadow-sm">
                {t('rank')} {result.level}
              </div>
              {result.estimated_hsk && result.estimated_hsk.trim() !== '' && (
                <div className="px-6 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-black tracking-wide uppercase border border-blue-200 shadow-sm animate-in zoom-in">
                  {t('estimatedLevel')} {result.estimated_hsk}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            {criteriaKeys.map(key => (
              <CriteriaBar key={key} label={key} score={result.criteria[key]} />
            ))}
          </div>

          <div className="bg-red-50/50 rounded-2xl p-6 md:p-8 relative border border-red-100 shadow-sm mt-8">
            <div className="absolute -top-4 left-6 bg-white p-1.5 rounded-lg shadow-sm text-[#C8102E] border border-red-100">
              <MessageSquare size={20} fill="currentColor" />
            </div>
            <h3 className="font-bold text-slate-800 mb-4 text-lg border-b border-red-200/50 pb-3">{t('systemAnalysis')}</h3>
            <p className="text-slate-800 leading-relaxed text-sm whitespace-pre-line font-medium">
              {result.feedback}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function CriteriaBar({ label, score }) {
  const maxMatch = String(label || '').match(/\((\d+(?:\.\d+)?)đ\)/);
  const maxScore = maxMatch ? parseFloat(maxMatch[1]) : 10;
  const numericScore = parseFloat(score) || 0;
  const percentage = Math.max(0, Math.min(100, (numericScore / maxScore) * 100));
  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-sm text-slate-600">{label}</span>
        <span className="font-black text-[#C8102E] text-base">{numericScore.toFixed(1)}/{maxScore}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-red-400 to-[#C8102E]" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

