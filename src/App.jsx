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
    shadowingDesc: "Bắt chước lại theo từ vựng hoặc câu mẫu. AI đánh giá chi tiết độ chính xác âm tiết. Luyện đến khi đạt chuẩn.",
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
    yourTurn: "Sử dụng nút Thu âm trực tiếp và bắt chước lại để AI đánh giá độ chính xác.",
    uploadFile: "Tải file lên",
    uploadWarn: "Hệ thống sẽ không thể nhận diện lỗi phát âm chi tiết bằng cách này.",
    recDirect: "Thu âm trực tiếp",
    recBtn: "Chấm điểm bằng giọng nói",
    stopRec: "DỪNG THU",
    recommended: "Khuyên dùng",
    aiEvaluating: "AI đang thẩm định và viết nhận xét...",
    waitMsg: "Quá trình đánh giá ngôn ngữ mất vài giây nhé!",
    grading: "AI đang phân tích độ chính xác...",
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
    avgScore: "Điểm trung bình / 10",
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
    shadowingDesc: "Imitate vocabulary or sentences. Get detailed AI evaluation of your accuracy.",
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
    yourTurn: "Use Direct Record and imitate the sample for AI accuracy check.",
    uploadFile: "Upload File",
    uploadWarn: "System cannot provide detailed pronunciation errors via file upload.",
    recDirect: "Direct Record",
    recBtn: "Grade my speech",
    stopRec: "STOP REC",
    recommended: "Recommended",
    aiEvaluating: "AI is evaluating and generating feedback...",
    waitMsg: "Linguistic analysis takes a few seconds!",
    grading: "AI is analyzing accuracy...",
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
    avgScore: "Average Score / 10",
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
  const [shadowItems, setShadowItems] = useState([{ cn: '', pinyin: '', vi: '', en: '' }]);

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
      .filter(item => item.cn?.trim() || item.pinyin?.trim() || item.vi?.trim() || item.en?.trim())
      .map(item => ({
        cn: item.cn || '',
        pinyin: item.pinyin || '',
        vi: item.vi || '',
        en: item.en || ''
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
      setShadowItems([{ cn: '', pinyin: '', vi: '', en: '' }]);
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
          en: item.en || ''
        }))
      : [{ cn: '', pinyin: '', vi: '', en: '' }];
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
                    <button onClick={() => setEditingTopic({ id: 't_' + Date.now(), title: '', level: 'HSK3', req: '', isPublished: false, hint: { cn: '', pinyin: '', vi: '', en: '' } })} className="bg-[#C8102E] text-white hover:bg-[#9b111e] px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md"><Plus size={18} /> Thêm mới</button>
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
                    <button onClick={() => { setEditingShadow({ id: 's_' + Date.now(), title: '', level: 'HSK1', type: 'sentence', isPublished: false, items: [] }); setShadowItems([{ cn: '', pinyin: '', vi: '', en: '' }]); }} className="bg-[#C8102E] text-white px-4 py-2 rounded-lg font-bold text-sm"><Plus size={18} className="inline" /> Thêm mới</button>
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
                                  setShadowItems([{ cn: '', pinyin: '', vi: '', en: '' }]);
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
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShadowItems([...shadowItems, { cn: '', pinyin: '', vi: '', en: '' }])}
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

function generateGradingResultFallback(transcript, expectedRawText, level, mode, lang, t) {
  const clamp = (val) => Math.min(10.0, Math.max(0.0, parseFloat(val) || 0)).toFixed(1);

  // Fallback cho tiếng Trung: trích xuất Hán tự và Pinyin để so khớp (phòng trường hợp STT trả về phiên âm)
  const cleanExpectedChars = expectedRawText ? expectedRawText.replace(/\[([^|]+)\|([^\]]+)\]/g, '$1').replace(/[，。！？、\s]/g, '') : '';
  const cleanExpectedPinyin = expectedRawText ? expectedRawText.replace(/\[([^|]+)\|([^\]]+)\]/g, '$2').replace(/[，。！？、\s]/g, '') : '';
  const cleanTranscript = transcript ? transcript.replace(/[，。！？、\s]/g, '') : '';

  let finalScore = 5.0;
  let criteriaObj = {};
  let estimatedLevel = '';

  if (mode === 'vocab' || mode === 'sentence') {
    let matchCount = 0;
    // Gộp Hán tự và Pinyin lại để kiểm tra xem STT trả về dạng nào cũng bắt được
    const targetString = cleanExpectedChars + cleanExpectedPinyin;
    for (let char of cleanTranscript) { if (targetString.includes(char)) matchCount++; }

    const denom = Math.max(1, cleanExpectedChars.length || cleanExpectedPinyin.length);
    const matchRate = Math.min(1.0, matchCount / denom);
    finalScore = matchRate * 10;
    criteriaObj = {
      [t('cPronunciation')]: clamp(finalScore),
      [t('cFluency')]: clamp(finalScore + 0.5)
    };
  } else if (mode === 'topic') {
    if (cleanTranscript.length < 15) {
      finalScore = 4.0;
    } else {
      finalScore = Math.min(9.5, 6.0 + (cleanTranscript.length / 40));
    }
    criteriaObj = {
      [t('cPronunciation')]: clamp(finalScore - 0.5),
      [t('cTopicRelevance')]: clamp(finalScore + 0.2),
      [t('cCompleteness')]: clamp(finalScore),
      [t('cFluency')]: clamp(finalScore + 0.4),
      [t('cGrammar')]: clamp(finalScore - 0.3),
      [t('cVocabRichness')]: clamp(finalScore + 0.3),
      [t('cNaturalness')]: clamp(finalScore - 0.4)
    };
  } else {
    finalScore = Math.min(9.5, 5.0 + (cleanTranscript.length / 50));
    criteriaObj = {
      [t('cPronunciation')]: clamp(finalScore - 0.5),
      [t('cFluency')]: clamp(finalScore),
      [t('cGrammar')]: clamp(finalScore - 0.3)
    };
    if (cleanTranscript.length > 200) estimatedLevel = 'HSK6';
    else if (cleanTranscript.length > 120) estimatedLevel = 'HSK5';
    else if (cleanTranscript.length > 80) estimatedLevel = 'HSK4';
    else if (cleanTranscript.length > 50) estimatedLevel = 'HSK3';
    else if (cleanTranscript.length > 30) estimatedLevel = 'HSK2';
    else estimatedLevel = 'HSK1';
  }

  return {
    score: clamp(finalScore),
    level: lang === 'en' ? (finalScore > 8 ? 'Good' : 'Needs Practice') : (finalScore > 8 ? 'Giỏi' : 'Cần luyện thêm'),
    estimated_hsk: estimatedLevel,
    criteria: criteriaObj,
    feedback: isShadowingMode(mode)
      ? (lang === 'en'
          ? "Basic shadowing evaluation: the score reflects how closely the learner matched the sample in pronunciation, tones, vocabulary accuracy, and fluency. No content expansion is required in this mode."
          : "Đánh giá shadowing cơ bản: điểm số phản ánh mức độ học viên đọc khớp với câu mẫu về phát âm, thanh điệu, độ chính xác từ vựng và độ lưu loát. Chế độ này không yêu cầu mở rộng nội dung.")
      : (lang === 'en' ? "This is a basic evaluation. Please connect to internet for full AI Analysis." : "Đây là đánh giá cơ bản. Hãy kết nối mạng để AI Phân tích chi tiết lỗi ngữ pháp và phát âm.")
  };
}


const isShadowingMode = (mode) => mode === 'vocab' || mode === 'sentence';

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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY; // Use VITE_OPENAI_API_KEY in .env

  const systemPrompt = `Bạn là giáo viên tiếng Trung chuyên chấm phát âm và khẩu ngữ cho người học ngoại ngữ. Bạn phải chấm theo ĐÚNG FORMAT CỐ ĐỊNH dưới đây. Không tự đổi tiêu chí, không thêm tiêu chí mới, không bỏ tiêu chí, không đổi tên field JSON.

Ngôn ngữ phản hồi: ${lang === 'en' ? 'English' : 'Vietnamese'}.
Task Mode: ${mode} (vocab = WORD SHADOWING, sentence = SENTENCE SHADOWING, topic = TOPIC SPEAKING, free = FREE SPEAKING).
HSK target: ${level}.
Yêu cầu chủ đề: "${requirement || 'None'}".
Mẫu/đáp án tham chiếu: "${expectedText || 'None'}".
Bản ghi lời nói của học viên: "${transcript}"

==================================================
A. QUY TẮC BẮT BUỘC CHUNG
==================================================
1. Chỉ trả về 01 JSON object hợp lệ. Không markdown. Không giải thích ngoài JSON.
2. Tất cả điểm là số từ 0.0 đến 10.0, được làm tròn 1 chữ số thập phân.
3. Mọi nhận xét phải dựa trên transcript và/hoặc mẫu tham chiếu. Không bịa lỗi khi không đủ bằng chứng.
4. Nếu transcript rỗng hoặc gần như không nhận diện được, cho overall_score tối đa 2.0.
5. Nếu học viên nói sai ngôn ngữ, cho overall_score tối đa 1.5.
6. Không tạo lỗi mâu thuẫn. Nếu heard và expected giống nhau sau khi chuẩn hóa, KHÔNG đưa lỗi đó vào errors.
7. teacher_comment phải thân thiện, cụ thể, nhưng không được phá format.

==================================================
B. FORMAT CỐ ĐỊNH CHO SHADOWING
==================================================
Áp dụng khi mode là vocab hoặc sentence.

Shadowing KHÔNG phải là nói theo chủ đề. Shadowing chỉ là đọc nhắc lại mẫu. Vì vậy:
- KHÔNG chấm linh động theo nội dung mở rộng.
- KHÔNG chấm khả năng sáng tạo, phát triển ý, độ dài câu trả lời, lý do, ví dụ, mô tả thêm.
- KHÔNG yêu cầu học viên nói dài hơn, thêm ý, thêm ví dụ, thêm lý do.
- KHÔNG trừ điểm vì câu ngắn nếu mẫu vốn ngắn.
- content_analysis luôn phải là:
  {
    "main_ideas_detected": [],
    "missing_ideas": [],
    "topic_relevance_comment": "",
    "expansion_suggestions": []
  }
- topic_relevance luôn là 0.0.
- idea_development luôn là 0.0.
- grammar không phải tiêu chí chính; chỉ chấm grammar = 10.0 nếu học viên đọc đúng mẫu, hoặc giảm nhẹ nếu transcript cho thấy học viên thay đổi cấu trúc câu mẫu.

B1. TIÊU CHÍ CỐ ĐỊNH CHO WORD SHADOWING / mode = vocab
Chấm đúng 05 tiêu chí sau, theo trọng số cố định:
1. pronunciation_accuracy: 30%
   - phụ âm đầu / initials
   - vận mẫu / finals
   - âm khó: zh/ch/sh/r, j/q/x, z/c/s, ü nếu có
2. tone_accuracy: 30%
   - thanh 1/2/3/4/neutral
   - thanh phải rõ khi đọc từ riêng lẻ
3. word_accuracy: 20%
   - học viên có đọc đúng từ mẫu không
   - có thêm/bớt/đổi âm tiết không
4. fluency: 10%
   - đọc liền mạch, không ngập ngừng quá nhiều
5. intonation_rhythm: 10%
   - nhịp đọc tự nhiên ở cấp độ từ/cụm ngắn

Cách tính bắt buộc cho vocab:
overall_score = pronunciation_accuracy*0.30 + tone_accuracy*0.30 + word_accuracy*0.20 + fluency*0.10 + intonation_rhythm*0.10

Sau khi tính:
- naturalness = intonation_rhythm
- comprehensibility = trung bình của pronunciation_accuracy, tone_accuracy, word_accuracy
- vocabulary = word_accuracy
- grammar = 10.0 nếu không có bằng chứng sai cấu trúc; nếu không chắc, để 10.0
- topic_relevance = 0.0
- idea_development = 0.0

B2. TIÊU CHÍ CỐ ĐỊNH CHO SENTENCE SHADOWING / mode = sentence
Chấm đúng 05 tiêu chí sau, theo trọng số cố định:
1. pronunciation_accuracy: 25%
   - phụ âm, vận mẫu, âm tiết khó
2. tone_accuracy: 25%
   - thanh điệu chính xác trong câu
   - cho phép điều chỉnh nhẹ do nối âm và ngữ điệu tự nhiên, nhưng lỗi thanh làm đổi nghĩa phải trừ điểm
3. sentence_accuracy: 25%
   - mức độ khớp với mẫu
   - có bỏ từ, thêm từ, đổi từ, đảo thứ tự không
4. fluency: 15%
   - đọc trôi chảy, không dừng quá lâu, không đọc rời rạc từng chữ
5. intonation_rhythm: 10%
   - nhịp câu tự nhiên, ngữ điệu phù hợp

Cách tính bắt buộc cho sentence:
overall_score = pronunciation_accuracy*0.25 + tone_accuracy*0.25 + sentence_accuracy*0.25 + fluency*0.15 + intonation_rhythm*0.10

Sau khi tính:
- naturalness = intonation_rhythm
- comprehensibility = trung bình của pronunciation_accuracy, tone_accuracy, sentence_accuracy
- vocabulary = sentence_accuracy
- grammar = 10.0 nếu học viên giữ đúng cấu trúc mẫu; giảm nếu transcript cho thấy đổi sai cấu trúc
- topic_relevance = 0.0
- idea_development = 0.0

B3. THANG ĐIỂM CỐ ĐỊNH CHO TỪNG TIÊU CHÍ SHADOWING
Dùng cùng một thang cho mọi tiêu chí shadowing:
- 9.0-10.0: Gần như chính xác; lỗi rất nhỏ, không ảnh hưởng hiểu.
- 8.0-8.9: Tốt; có 1-2 lỗi nhỏ về âm/thanh/nhịp nhưng vẫn dễ hiểu.
- 7.0-7.9: Đạt; có vài lỗi rõ nhưng người nghe vẫn hiểu được.
- 6.0-6.9: Tạm; lỗi âm/thanh/nhịp xuất hiện nhiều, cần luyện lại.
- 5.0-5.9: Yếu; nhiều lỗi làm giảm khả năng nhận diện từ/câu.
- Dưới 5.0: Khó hiểu hoặc lệch đáng kể so với mẫu.

B4. FORMAT NHẬN XÉT CỐ ĐỊNH CHO SHADOWING
teacher_comment phải gồm đúng 4 câu:
Câu 1: Nhận xét mức độ khớp với mẫu.
Câu 2: Nhận xét phát âm/thanh điệu cụ thể.
Câu 3: Nhận xét độ lưu loát/nhịp điệu.
Câu 4: Gợi ý luyện tiếp, chỉ liên quan đến phát âm, thanh điệu, nhịp đọc hoặc độ lưu loát.

weaknesses chỉ được gồm lỗi thuộc các nhóm:
- pronunciation
- tone
- word_accuracy hoặc sentence_accuracy
- fluency
- intonation_rhythm

next_practice_targets chỉ được gồm 2 mục, đúng format:
1. "Luyện lại [âm/thanh/từ/cụm cụ thể] ..."
2. "Đọc lại mẫu với nhịp ..."

errors chỉ ghi lỗi khi có bằng chứng rõ ràng. Mỗi lỗi phải có:
- word
- heard
- expected
- issue
- severity
- suggestion

==================================================
C. FORMAT CỐ ĐỊNH CHO TOPIC/FREE
==================================================
Áp dụng khi mode là topic hoặc free.
Chấm các tiêu chí:
- pronunciation_accuracy
- fluency
- naturalness
- intonation_rhythm
- comprehensibility
- grammar
- vocabulary
- topic_relevance
- idea_development

Với topic/free, có thể nhận xét về độ dài, thiếu ý, cần mở rộng nội dung. Quy tắc này KHÔNG áp dụng cho shadowing.

==================================================
D. JSON SCHEMA BẮT BUỘC
==================================================
{
  "overall_score": 8.2,
  "level": "Khá",
  "estimated_hsk": "HSK2",
  "pronunciation_accuracy": 8.0,
  "tone_accuracy": 8.0,
  "word_accuracy": 8.0,
  "sentence_accuracy": 8.0,
  "fluency": 8.2,
  "naturalness": 8.1,
  "intonation_rhythm": 7.8,
  "comprehensibility": 8.5,
  "grammar": 7.9,
  "vocabulary": 7.8,
  "topic_relevance": 8.0,
  "idea_development": 7.5,
  "severity": "minor",
  "spoken_transcript": "trích lại chính xác câu học viên đã nói",
  "strengths": [
    {
      "quote": "trích cụm/câu học viên nói tốt",
      "reason": "giải thích cụ thể vì sao tốt"
    }
  ],
  "weaknesses": [
    {
      "quote": "trích cụm/câu cần sửa",
      "issue": "vấn đề cụ thể",
      "suggestion": "cách sửa cụ thể, dễ làm"
    }
  ],
  "content_analysis": {
    "main_ideas_detected": [],
    "missing_ideas": [],
    "topic_relevance_comment": "",
    "expansion_suggestions": []
  },
  "errors": [
    {
      "word": "từ/cụm có lỗi",
      "heard": "nếu có thể suy đoán học viên nói nghe thành gì",
      "expected": "cách nói đúng hoặc âm đúng",
      "issue": "pronunciation|tone|word_accuracy|sentence_accuracy|fluency|intonation_rhythm|grammar|vocabulary",
      "severity": "minor|moderate|major",
      "suggestion": "cách sửa cụ thể"
    }
  ],
  "next_practice_targets": [
    "mục tiêu luyện tập cụ thể 1",
    "mục tiêu luyện tập cụ thể 2"
  ],
  "teacher_comment": "Nhận xét đúng format yêu cầu."
}

==================================================
E. KIỂM TRA CUỐI TRƯỚC KHI TRẢ JSON
==================================================
Nếu mode là vocab hoặc sentence, tự kiểm tra:
1. teacher_comment có đúng 4 câu không?
2. Có câu nào yêu cầu mở rộng nội dung, nói dài hơn, thêm lý do, thêm ví dụ không? Nếu có, xóa.
3. content_analysis đã rỗng đúng format chưa?
4. topic_relevance và idea_development đã là 0.0 chưa?
5. next_practice_targets có đúng 2 mục và chỉ liên quan phát âm/thanh/nhịp/lưu loát không?
6. errors có lỗi nào heard giống expected không? Nếu có, xóa.
7. overall_score đã tính theo đúng trọng số cố định chưa?

Chỉ sau khi kiểm tra xong mới trả JSON.`;

  if (!apiKey) {
    console.warn('OpenAI API key is missing. Falling back to local evaluation.');
    return null;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Evaluate the learner speech. Return only one valid JSON object following the schema exactly. Do not include markdown.' }
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: 'gpt-4.1-nano', messages, temperature: 0.2 })
    });

    if (!res.ok) {
      console.warn(`OpenAI chat completion returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const textRes = data.choices?.[0]?.message?.content;

    if (textRes) {
      const match = textRes.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (parseErr) {
          console.warn('OpenAI JSON parse failed:', parseErr);
          try {
            return JSON.parse(textRes);
          } catch (err) {
            console.warn('OpenAI response is not valid JSON:', err);
            return null;
          }
        }
      }
      console.warn('OpenAI response did not contain parsable JSON', textRes);
      return null;
    }

    console.warn('OpenAI response was empty or malformed.');
    return null;
  } catch (err) {
    console.warn('OpenAI request error:', err);
    return null;
  }
};

// ---------------------------------------------------------
// COMPONENT: THU ÂM (TÍCH HỢP SPEECH RECOGNITION + OPENAI )
// ---------------------------------------------------------
function AudioInput({ onAudioReady }) {
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

        try {
          // 🔥 LUÔN dùng OpenAI
          transcript = await transcribeWithOpenAI(file);
          console.log("✅ FINAL AI TRANSCRIPT:", transcript);
        } catch (e) {
          console.log("❌ OpenAI error:", e);
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
        <p className="text-xs text-slate-500 mt-1">Hệ thống sẽ giả lập chấm điểm</p>
      </div>

      <div className={`border-2 rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-200 ${isRecording ? 'border-[#C8102E] bg-[#fff0f5] shadow-inner' : 'border-[#C8102E]/30 bg-red-50/30 relative overflow-hidden'}`}>
        {!isRecording && <div className="absolute top-0 right-0 bg-[#C8102E] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">Khuyên dùng AI</div>}

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
              Chấm điểm bằng giọng nói
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

  const playModelAudio = (textRaw, speedMode = 'normal') => {
    if (!('speechSynthesis' in window)) { alert("TTS not supported in your browser."); return; }

    // Đọc mẫu bằng Hán tự: chỉ bỏ phần chú thích pinyin trong cú pháp [汉字|pinyin]
    const cleanText = textRaw.replace(/\[([^|]+)\|([^\]]+)\]/g, '$1');
    setIsPlayingModel(speedMode);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';

    if (speedMode === 'slow') {
      utterance.rate = 0.35;
    } else {
      const rateMap = { 'HSK1': 0.8, 'HSK2': 0.9, 'HSK3': 1.0, 'HSK4': 1.05, 'HSK5': 1.1, 'HSK6': 1.15 };
      utterance.rate = currentTopic ? (rateMap[currentTopic.level] || 1.0) : 1.0;
    }

    utterance.onend = () => setIsPlayingModel(false);
    utterance.onerror = () => setIsPlayingModel(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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
        const baseScore = 6.0 + Math.random() * 3.0;
        const clamp = (val) => Math.min(10.0, Math.max(0.0, parseFloat(val) || 0)).toFixed(1);
        finalResult = {
          score: clamp(baseScore),
          level: lang === 'en' ? (baseScore >= 8 ? 'Good' : 'Fair') : (baseScore >= 8 ? 'Giỏi' : 'Khá'),
          criteria: {
            [t('cPronunciation')]: clamp(baseScore - 0.2),
            [t('cFluency')]: clamp(baseScore)
          },
          feedback: lang === 'en'
            ? `[AUDIO FILE UPLOAD MODE]\nDue to browser limits, detailed pronunciation errors cannot be extracted from uploaded files. Use "Direct Record" for full AI capabilities.`
            : `[CHÚ Ý: BẠN ĐANG TẢI FILE ÂM THANH]\nDo hạn chế của trình duyệt, hệ thống không thể bóc tách từng lỗi ngữ âm chính xác từ file có sẵn. Hãy dùng nút "Thu âm trực tiếp" để AI đọc chính xác từng từ bạn nói nhé!`
        };
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
              finalResult = {
                score: apiRes.overall_score || apiRes.score || "0.0",
                level: apiRes.level,
                estimated_hsk: apiRes.estimated_hsk || '',
                criteria: {
                  [t('cPronunciation')]: (apiRes.pronunciation_accuracy || apiRes.pronunciation_score || "0.0").toString(),
                  [t('cFluency')]: (apiRes.fluency || apiRes.fluency_score || "0.0").toString(),
                },
                feedback: buildEvidenceBasedFeedbackText(apiRes, lang, type)
              };
              if (type === 'topic') {
                finalResult.criteria[t('cGrammar')] = (apiRes.grammar || "0.0").toString();
                finalResult.criteria[t('cVocabRichness')] = (apiRes.comprehensibility || "0.0").toString();
                finalResult.criteria[t('cTopicRelevance')] = (apiRes.naturalness || "0.0").toString();
              } else {
                finalResult.criteria[t('cGrammar')] = (apiRes.comprehensibility || "0.0").toString();
                finalResult.criteria[t('cIdeaDev')] = (apiRes.intonation_rhythm || "0.0").toString();
              }
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
                        <button onClick={() => playModelAudio(currentTopic.hint.cn, 'slow')} disabled={isPlayingModel !== false} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all flex items-center gap-1 ${isPlayingModel === 'slow' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-300 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-600'}`}>
                          <Volume1 size={14} /> {t('listenSlow')}
                        </button>
                        <button onClick={() => playModelAudio(currentTopic.hint.cn, 'normal')} disabled={isPlayingModel !== false} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all flex items-center gap-1 ${isPlayingModel === 'normal' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-300 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-600'}`}>
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
  const [sentenceResult, setSentenceResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
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

  const playModelAudio = (textRaw, speedMode = 'normal') => {
    if (!('speechSynthesis' in window)) { return; }

    // Đọc mẫu bằng Hán tự: chỉ bỏ phần chú thích pinyin trong cú pháp [汉字|pinyin]
    const cleanText = textRaw.replace(/\[([^|]+)\|([^\]]+)\]/g, '$1');
    setIsPlayingModel(speedMode);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';

    if (speedMode === 'slow') {
      utterance.rate = 0.35;
    } else {
      const rateMap = { 'HSK1': 0.8, 'HSK2': 0.9, 'HSK3': 1.0, 'HSK4': 1.05, 'HSK5': 1.1, 'HSK6': 1.15 };
      utterance.rate = rateMap[level] || 1.0;
    }

    utterance.onend = () => setIsPlayingModel(false);
    utterance.onerror = () => setIsPlayingModel(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleAudioReady = async (file, url, transcriptStr, isFile) => {
    setRecordedFile(file);
    setRecordedUrl(url);
    setIsEvaluating(true);

    try {
      // Đợi 0.5s để UI "Đang phân tích" kịp hiển thị trước khi gọi AI
      await new Promise(r => setTimeout(r, 500));

      let res;
      if (isFile) {
        res = {
          score: '7.5', level: lang === 'en' ? 'Fair' : 'Khá',
          criteria: { [t('cPronunciation')]: '7.5', [t('cFluency')]: '7.5' },
          feedback: lang === 'en' ? "Use Direct Record for accurate evaluation." : "[CHẾ ĐỘ TẢI FILE]\nHệ thống không thể bóc tách lỗi chi tiết từ file ghi âm tải lên. Hãy dùng Thu âm trực tiếp."
        };
      } else {
        const currentItem = selectedLesson.items[currentIndex];

        // SỬA LỖI: Cho phép nhận diện cả những từ vựng có 1 chữ Hán (length === 0 mới báo lỗi)
        if (!transcriptStr || transcriptStr.trim().length === 0) {
          res = {
            score: '2.0', level: lang === 'en' ? 'Needs Practice' : 'Cần luyện tập thêm',
            criteria: { [t('cPronunciation')]: '2.0', [t('cFluency')]: '2.0' },
            feedback: lang === 'en' ? 'The system could not clearly recognize what you said. Please check your microphone and speak louder.' : 'Hệ thống không nhận diện rõ bạn nói gì. Vui lòng kiểm tra Micro và thử nói lớn hơn nhé.'
          };
        } else {
          // 🔥 KIỂM TRA NGÔN NGỮ: Nếu không phải tiếng Trung thì cảnh báo
          const langViolation = detectLanguageViolation(transcriptStr);
          if (langViolation && langViolation.violated) {
            res = {
              score: '1.0',
              level: lang === 'en' ? 'Wrong Language' : 'Sai Ngôn Ngữ',
              criteria: { [t('cPronunciation')]: '1.0', [t('cFluency')]: '1.0', [t('cContentAccuracy')]: '1.0' },
              feedback: lang === 'en'
                ? `⚠️ ERROR: You spoke ${langViolation.language} instead of Mandarin Chinese! The target was:\n${currentItem.cn} (${currentItem.pinyin})\n\nPlease try again in Mandarin.`
                : `⚠️ LỖI: Bạn nói tiếng ${langViolation.language} thay vì tiếng Trung Quốc! Bạn cần nói:\n${currentItem.cn} (${currentItem.pinyin})\n\nVui lòng thử lại bằng tiếng Trung.`
            };
          } else {
            const apiRes = await evaluateWithOpenAI(transcriptStr, currentItem.cn, level, type, lang);
            if (apiRes) {
              res = {
                score: apiRes.overall_score || apiRes.score || "0.0",
                level: apiRes.level,
                criteria: {
                  [t('cPronunciation')]: (apiRes.pronunciation_accuracy || apiRes.pronunciation_score || "0.0").toString(),
                  [lang === 'en' ? 'Tone Accuracy' : 'Độ chính xác thanh điệu']: (apiRes.tone_accuracy || "0.0").toString(),
                  [type === 'vocab'
                    ? (lang === 'en' ? 'Word Accuracy' : 'Độ chính xác từ')
                    : (lang === 'en' ? 'Sentence Accuracy' : 'Độ khớp câu mẫu')
                  ]: (type === 'vocab'
                    ? (apiRes.word_accuracy || apiRes.comprehensibility || "0.0")
                    : (apiRes.sentence_accuracy || apiRes.comprehensibility || "0.0")
                  ).toString(),
                  [t('cFluency')]: (apiRes.fluency || apiRes.fluency_score || "0.0").toString(),
                  [lang === 'en' ? 'Intonation & Rhythm' : 'Ngữ điệu & nhịp đọc']: (apiRes.intonation_rhythm || "0.0").toString()
                },
                feedback: buildEvidenceBasedFeedbackText(apiRes, lang, type)
              };
            } else {
              // Fallback an toàn nếu API quá tải
              res = generateGradingResultFallback(transcriptStr, currentItem.cn, level, type, lang, t);
            }
          }
        }
      }
      setSentenceResult(res);
    } catch (error) {
      console.error("Shadowing Error:", error);
      const currentItem = selectedLesson.items[currentIndex];
      setSentenceResult(generateGradingResultFallback(transcriptStr, currentItem.cn, level, type, lang, t));
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextItem = () => {
    setRecordedFile(null); setRecordedUrl(null); setSentenceResult(null);
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
              <button onClick={() => playModelAudio(currentItem.cn, 'slow')} disabled={isPlayingModel !== false} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-md transition-all border-2 ${isPlayingModel === 'slow' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-200 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-700'}`} title="Nghe đọc chậm">
                <Volume1 size={20} className={isPlayingModel === 'slow' ? "opacity-50" : ""} />
                <span className="text-[9px] font-bold mt-0.5 uppercase">{t('listenSlow')}</span>
              </button>
              <button onClick={() => playModelAudio(currentItem.cn, 'normal')} disabled={isPlayingModel !== false} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-md transition-all border-2 ${isPlayingModel === 'normal' ? 'bg-blue-50 border-blue-400 text-blue-600 animate-pulse' : 'bg-white border-slate-200 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-700'}`} title="Nghe đọc chuẩn">
                <Volume2 size={20} className={isPlayingModel === 'normal' ? "opacity-50" : ""} />
                <span className="text-[9px] font-bold mt-0.5 uppercase">{t('listenNormal')}</span>
              </button>
            </div>
          </div>
        </div>

        {!recordedFile && !isEvaluating && (
          <div className="animate-in fade-in">
            <div className="bg-red-50 text-red-800 p-3 rounded-lg mb-4 text-sm font-medium border border-red-200">
              <Info size={16} className="inline mr-1" />
              {t('yourTurn')}
            </div>
            <AudioInput onAudioReady={handleAudioReady} />
          </div>
        )}

        {isEvaluating && (
          <div className="py-8 flex flex-col items-center">
            <Activity size={48} className="text-[#C8102E] animate-bounce mb-4" />
            <p className="font-medium text-slate-600">{t('grading')}</p>
          </div>
        )}

        {sentenceResult && !isEvaluating && (
          <div className="animate-in slide-in-from-bottom-4">
            <div className={`p-6 rounded-2xl border shadow-sm ${parseFloat(sentenceResult.score) >= 8.0 ? 'bg-green-50 border-green-200' : parseFloat(sentenceResult.score) >= 6.0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} mb-6 flex flex-col md:flex-row gap-6 items-center md:items-start`}>

              <div className={`w-24 h-24 rounded-full flex items-center justify-center flex-col shadow-inner shrink-0 ${parseFloat(sentenceResult.score) >= 8.0 ? 'bg-green-500 text-white' : parseFloat(sentenceResult.score) >= 6.0 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                <span className="font-black text-3xl">{sentenceResult.score}</span>
              </div>

              <div className="flex-1 w-full text-center md:text-left">
                <h4 className="font-bold text-slate-800 mb-2 text-lg">{t('analysis')}</h4>
                <p className="text-sm text-slate-700 mb-4 leading-relaxed font-medium">{sentenceResult.feedback}</p>
                <div className="bg-white/50 p-2 rounded-lg inline-block w-full">
                  <audio controls src={recordedUrl} className="h-10 w-full rounded" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-slate-200">
              <button onClick={() => { setRecordedFile(null); setSentenceResult(null); }} className="flex-1 py-4 bg-white border border-slate-300 hover:border-[#C8102E] hover:text-[#C8102E] text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
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
  const criteriaKeys = Object.keys(result.criteria);

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
                <span className="text-5xl font-black text-[#C8102E]">{result.score}</span>
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
  const percentage = (parseFloat(score) / 10) * 100;
  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-sm text-slate-600">{label}</span>
        <span className="font-black text-[#C8102E] text-base">{score}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-red-400 to-[#C8102E]" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

