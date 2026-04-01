'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore, ChatMessage } from '@/store/chatStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Send, Sparkles, Bookmark, BookmarkCheck, Plus, MessageSquare,
  X, Menu, PanelLeftOpen, PanelRightOpen, Trash2,
  Settings, Search, User, ChevronLeft, Moon, Sun, Globe, MessageCircle, Zap
} from 'lucide-react';

const genId = () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
const langNames: Record<string, string> = { ko: '한국어', en: 'English', zh: '中文', ja: '日本語' };
const posNames: Record<string, string> = { bottom: '아래', left: '왼쪽', right: '오른쪽' };

export default function Home() {
  const store = useAppStore();
  const session = store.getCurrentSession();
  const { settings } = store;
  const dark = settings.theme === 'dark';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subMessagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [popMode, setPopMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMainBM, setShowMainBM] = useState(false);
  const [showSubBM, setShowSubBM] = useState(false);
  const [subPanelSize, setSubPanelSize] = useState(35);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shortcutInput, setShortcutInput] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef(0);
  const dragStartSize = useRef(35);

  useEffect(() => { store.loadSessions(); }, []);
  useEffect(() => { store.saveSessions(); }, [store.sessions]);
  useEffect(() => { if (messagesEndRef.current) { const p = messagesEndRef.current.parentElement; if (p) p.scrollTop = p.scrollHeight; } }, [session?.messages.length]);
  useEffect(() => { if (activeSubId && subMessagesEndRef.current) { const p = subMessagesEndRef.current.parentElement; if (p) p.scrollTop = p.scrollHeight; } }, [activeSubId, session?.subChats]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';
    document.body.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';
    document.body.style.color = dark ? '#ffffff' : '#1a1a1a';
  }, [dark]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (shortcutInput) return;
      if (e.key === settings.popupShortcut) {
        e.preventDefault();
        togglePopMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.popupShortcut, popMode, activeSubId, shortcutInput]);

  const ensureSession = useCallback(() => {
    if (!store.currentSessionId) return store.createSession();
    return store.currentSessionId;
  }, [store]);

  const buildContext = useCallback(() => {
    if (!session) return '';
    return session.messages.slice(-6).map((m) => `Q: ${m.question}\nA: ${m.answer}`).join('\n\n');
  }, [session]);

  const sendToApi = async (message: string, context?: string) => {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, language: settings.language, customPrompt: settings.customPrompt }),
    });
    return res.json();
  };

  const handleSendMain = async (question: string) => {
    ensureSession();
    const msgId = genId();
    store.addMessage({ id: msgId, question, answer: '', bookmarked: false });
    store.updateMessage(msgId, { question });
    store.setLoading(true);
    try {
      const data = await sendToApi(question);
      store.updateMessage(msgId, { answer: data.error ? `⚠️ ${data.error}` : data.answer });
    } catch { store.updateMessage(msgId, { answer: '⚠️ 네트워크 오류' }); }
    finally { store.setLoading(false); }
  };

  const handleSendSub = async (question: string, subId: string) => {
    const msgId = genId();
    store.addSubMessage(subId, { id: msgId, question, answer: '', bookmarked: false });
    store.setSubChatLoading(subId);
    const sub = session?.subChats.find((s) => s.id === subId);
    const subContext = sub ? sub.parentContext + '\n\n' + sub.messages.slice(-4).map((m) => `Q: ${m.question}\nA: ${m.answer}`).join('\n\n') : '';
    try {
      const data = await sendToApi(question, subContext);
      store.updateSubMessage(subId, msgId, { answer: data.error ? `⚠️ ${data.error}` : data.answer });
    } catch { store.updateSubMessage(subId, msgId, { answer: '⚠️ 네트워크 오류' }); }
    finally { store.setSubChatLoading(null); }
  };

  const handleUnifiedSend = () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (popMode && activeSubId) {
      handleSendSub(question, activeSubId);
    } else if (popMode && !activeSubId) {
      ensureSession();
      const context = buildContext();
      const subId = store.openSubChat(context, question);
      setActiveSubId(subId);
      handleSendSub(question, subId);
    } else {
      handleSendMain(question);
    }
  };

  const togglePopMode = () => {
    if (!popMode && !activeSubId) {
      ensureSession();
      const context = buildContext();
      const subId = store.openSubChat(context, '');
      setActiveSubId(subId);
    }
    setPopMode(!popMode);
  };

  const closePopup = () => {
    if (activeSubId) store.closeSubChat(activeSubId);
    setActiveSubId(null);
    setPopMode(false);
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartSize.current = subPanelSize;
  };
  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current) return;
    if ('touches' in e) e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dy = dragStart.current - clientY;
    const dvh = (dy / window.innerHeight) * 100;
    setSubPanelSize(Math.max(10, Math.min(60, dragStartSize.current + dvh)));
  };
  const handleDragEnd = () => { isDragging.current = false; };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) { store.deleteSession(id); setConfirmDelete(null); setActiveSubId(null); setPopMode(false); }
    else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 3000); }
  };

  const activeSub = session?.subChats.find((s) => s.id === activeSubId && s.isOpen);
  const mainBMs = session?.messages.filter((m) => m.bookmarked) || [];
  const subBMs = session?.subChats.flatMap((sc) => sc.messages.filter((m) => m.bookmarked).map((m) => ({ ...m, subId: sc.id }))) || [];
  const filteredSessions = searchQuery ? store.sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.messages.some((m) => m.question.toLowerCase().includes(searchQuery.toLowerCase()))) : store.sessions;
  const showPopup = !!activeSub;

  const bg = dark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bg2 = dark ? 'bg-[#111]' : 'bg-[#fafafa]';
  const bg3 = dark ? 'bg-[#1e1e1e]' : 'bg-[#f0f0f0]';
  const border = dark ? 'border-[#2a2a2a]' : 'border-[#e5e5e5]';
  const text1 = dark ? 'text-white' : 'text-[#1a1a1a]';
  const text2 = dark ? 'text-[#ccc]' : 'text-[#333]';
  const text3 = dark ? 'text-[#666]' : 'text-[#999]';
  const text4 = dark ? 'text-[#444]' : 'text-[#ccc]';
  const inputBg = dark ? 'bg-[#1a1a1a]' : 'bg-[#f7f7f8]';

  // 메시지 렌더링
  const renderMessages = (msgs: ChatMessage[], prefix: string, isSub: boolean) =>
    msgs.map((msg) => (
      <div key={msg.id} id={`${prefix}${msg.id}`} className="animate-fadeIn">
        <div className="flex justify-end mb-2">
          <div className={`${isSub ? 'bg-[#f59e0b]' : 'bg-[#4a9eff]'} rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]`}>
            <p className={`${isSub ? 'text-xs' : 'text-[13px]'} text-white whitespace-pre-wrap`}>{msg.question}</p>
          </div>
        </div>
        <div className="flex gap-2 mb-1">
          <Sparkles size={isSub ? 11 : 13} className={`${isSub ? 'text-[#f59e0b]' : 'text-[#4a9eff]'} mt-0.5 flex-shrink-0`} />
          <div className={`${isSub ? 'text-xs' : 'text-[13px]'} ${text2} leading-relaxed markdown-body`}>
            {msg.answer ? (
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.answer}</ReactMarkdown>
            ) : (
              <span className="flex gap-1">
                <span className={`w-1.5 h-1.5 ${isSub ? 'bg-[#f59e0b]' : 'bg-[#4a9eff]'} rounded-full animate-pulse-subtle`} />
                <span className={`w-1.5 h-1.5 ${isSub ? 'bg-[#f59e0b]' : 'bg-[#4a9eff]'} rounded-full animate-pulse-subtle [animation-delay:0.3s]`} />
                <span className={`w-1.5 h-1.5 ${isSub ? 'bg-[#f59e0b]' : 'bg-[#4a9eff]'} rounded-full animate-pulse-subtle [animation-delay:0.6s]`} />
              </span>
            )}
          </div>
        </div>
        {msg.answer && (
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); isSub && activeSubId ? store.toggleSubBookmark(activeSubId, msg.id) : store.toggleBookmark(msg.id); }}
            className={`ml-5 ${msg.bookmarked ? (isSub ? 'text-[#f59e0b]' : 'text-[#4a9eff]') : text4}`}>
            {msg.bookmarked ? <BookmarkCheck size={isSub ? 12 : 14} /> : <Bookmark size={isSub ? 12 : 14} />}
          </button>
        )}
      </div>
    ));

  // 설정 화면
  if (showSettings) {
    return (
      <div className={`min-h-screen ${bg} ${text1} px-4 py-4`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setShowSettings(false); setShortcutInput(false); }} className={`${text3} p-1`}><ChevronLeft size={20} /></button>
            <h2 className="text-lg font-medium">설정</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">테마</label>
              <div className="flex gap-2">
                <button onClick={() => store.updateSettings({ theme: 'light' })}
                  className={`flex-1 p-3 rounded-xl border text-sm flex items-center justify-center gap-2 ${settings.theme === 'light' ? 'border-[#4a9eff] bg-[#4a9eff]/10 text-[#4a9eff]' : `${border} ${text3}`}`}>
                  <Sun size={16} /> 라이트
                </button>
                <button onClick={() => store.updateSettings({ theme: 'dark' })}
                  className={`flex-1 p-3 rounded-xl border text-sm flex items-center justify-center gap-2 ${settings.theme === 'dark' ? 'border-[#4a9eff] bg-[#4a9eff]/10 text-[#4a9eff]' : `${border} ${text3}`}`}>
                  <Moon size={16} /> 다크
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1"><Globe size={14} /> 기본 언어</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ko', 'en', 'zh', 'ja'] as const).map((lang) => (
                  <button key={lang} onClick={() => store.updateSettings({ language: lang })}
                    className={`p-3 rounded-xl border text-sm ${settings.language === lang ? 'border-[#4a9eff] bg-[#4a9eff]/10 text-[#4a9eff]' : `${border} ${text3}`}`}>
                    {langNames[lang]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1"><Zap size={14} /> 팝업 단축키</label>
              <div className={`${inputBg} border ${border} rounded-xl px-3 py-3 text-sm ${text1} flex items-center justify-between`}>
                <span>현재: <code className={`${dark ? 'bg-[#2a2a2a]' : 'bg-[#e5e5e5]'} px-2 py-0.5 rounded text-xs`}>{settings.popupShortcut === '\\' ? '\\' : settings.popupShortcut}</code></span>
                <button onClick={() => setShortcutInput(true)} className="text-xs text-[#4a9eff]">변경</button>
              </div>
              {shortcutInput && (
                <div className={`mt-2 ${inputBg} border border-[#4a9eff] rounded-xl px-3 py-3 text-center animate-fadeIn`}>
                  <p className="text-xs text-[#4a9eff] mb-1">원하는 키를 누르세요</p>
                  <input type="text" autoFocus className="opacity-0 absolute" onKeyDown={(e) => {
                    e.preventDefault();
                    store.updateSettings({ popupShortcut: e.key });
                    setShortcutInput(false);
                  }} />
                </div>
              )}
            </div>
            {!isMobile && (
              <div>
                <label className="text-sm font-medium mb-2 block">팝업 위치 (태블릿/PC)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bottom', 'left', 'right'] as const).map((pos) => (
                    <button key={pos} onClick={() => store.updateSettings({ popupPosition: pos })}
                      className={`p-3 rounded-xl border text-sm ${settings.popupPosition === pos ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]' : `${border} ${text3}`}`}>
                      {posNames[pos]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1"><MessageCircle size={14} /> 커스텀 프롬프트</label>
              <textarea value={settings.customPrompt} onChange={(e) => store.updateSettings({ customPrompt: e.target.value })}
                placeholder="예: 간결하게 답변해줘" rows={4}
                className={`w-full ${inputBg} border ${border} rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4a9eff] resize-none ${text1}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== 메인 레이아웃 ==========
  const popupPos = isMobile ? 'bottom' : settings.popupPosition;

  return (
    <div className={`flex h-[100dvh] overflow-hidden ${bg}`}>
      {/* 사이드바 오버레이 */}
      {showSidebar && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setShowSidebar(false); setConfirmDelete(null); setShowSearch(false); }} />}

      {/* 사이드바 */}
      <div className={`fixed top-0 left-0 h-full w-72 ${bg2} border-r ${border} z-50 transition-transform duration-200 flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`p-3 border-b ${border} flex items-center justify-between`}>
          <span className={`text-sm font-medium ${text1}`}>채팅 목록</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(!showSearch)} className={`p-1 rounded-lg ${showSearch ? 'bg-[#4a9eff]/10 text-[#4a9eff]' : text3}`}><Search size={15} /></button>
            <button onClick={() => { setShowSidebar(false); setConfirmDelete(null); setShowSearch(false); }} className={`${text3} p-1`}><X size={16} /></button>
          </div>
        </div>
        {showSearch && (
          <div className={`px-2 py-2 border-b ${border}`}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="채팅 검색..." autoFocus
              className={`w-full ${inputBg} border ${border} rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4a9eff] ${text1}`} />
          </div>
        )}
        <button onClick={() => { store.createSession(); setActiveSubId(null); setPopMode(false); setShowSidebar(false); }}
          className={`m-2 p-2.5 text-xs ${bg} border ${border} rounded-lg flex items-center gap-2 text-[#4a9eff] w-[calc(100%-16px)]`}>
          <Plus size={14} /> 새 채팅
        </button>
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.map((ses) => (
            <div key={ses.id} className={`flex items-center group ${ses.id === store.currentSessionId ? bg3 : ''}`}>
              <button onClick={() => { store.setCurrentSession(ses.id); setActiveSubId(null); setPopMode(false); setShowSidebar(false); setConfirmDelete(null); }}
                className={`flex-1 text-left px-3 py-2.5 text-xs truncate ${text3}`}>
                <MessageSquare size={12} className="inline mr-2" />{ses.title}
              </button>
              <button onClick={() => handleDelete(ses.id)}
                className={`mr-2 p-1 rounded ${confirmDelete === ses.id ? 'bg-red-500/10 text-red-500' : `${text4} opacity-0 group-hover:opacity-100 active:opacity-100`}`}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className={`p-2 border-t ${border} flex items-center justify-between`}>
          <button className={`flex items-center gap-2 px-3 py-2 text-xs ${text3}`}><User size={14} /> 로그인</button>
          <button onClick={() => { setShowSettings(true); setShowSidebar(false); }} className={`p-2 ${text3}`}><Settings size={15} /></button>
        </div>
      </div>

      {/* PC 왼쪽 팝업 */}
      {showPopup && popupPos === 'left' && !isMobile && (
        <div className={`w-80 ${bg} flex flex-col flex-shrink-0 border-r border-[#f59e0b]`}>
          <div className={`flex items-center justify-between px-3 py-1.5 border-b border-[#f59e0b] flex-shrink-0`}>
            <span className="text-xs text-[#f59e0b] font-medium">팝업 채팅</span>
            <button onClick={closePopup} className={`${text3} p-1`}><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {renderMessages(activeSub!.messages, 'sub-', true)}
            <div ref={subMessagesEndRef} />
          </div>
        </div>
      )}

      {/* 메인 컬럼: 헤더 → 채팅 → 팝업(모바일/아래) → 입력창 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <header className={`flex items-center justify-between px-3 py-2 border-b ${border} ${bg} z-10 flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className={`${text3} p-1`}><Menu size={18} /></button>
            <h1 className={`font-logo text-base font-bold ${text1}`}>POPchat</h1>
            {showPopup && <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded-full">팝업</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowMainBM(!showMainBM); setShowSubBM(false); }}
              className={`p-1.5 rounded-lg ${showMainBM ? 'bg-[#4a9eff]/10 text-[#4a9eff]' : text4}`}><PanelLeftOpen size={15} /></button>
            <button onClick={() => { setShowSubBM(!showSubBM); setShowMainBM(false); }}
              className={`p-1.5 rounded-lg ${showSubBM ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : text4}`}><PanelRightOpen size={15} /></button>
          </div>
        </header>

        {/* 북마크 패널 */}
        {showMainBM && (
          <div className={`${dark ? 'bg-[#111]' : 'bg-[#f8faff]'} border-b ${border} px-3 py-2 max-h-28 overflow-y-auto flex-shrink-0`}>
            <p className="text-[10px] text-[#4a9eff] mb-1">메인 북마크</p>
            {mainBMs.length === 0 ? <p className={`text-xs ${text3}`}>북마크 없음</p> :
              mainBMs.map((m) => (<button key={m.id} onClick={() => { setShowMainBM(false); setTimeout(() => document.getElementById(`msg-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }}
                className={`block w-full text-left text-xs ${text3} py-1 truncate`}>📌 {m.question}</button>))}
          </div>
        )}
        {showSubBM && (
          <div className={`${dark ? 'bg-[#111]' : 'bg-[#fffbf0]'} border-b ${border} px-3 py-2 max-h-28 overflow-y-auto flex-shrink-0`}>
            <p className="text-[10px] text-[#f59e0b] mb-1">팝업 북마크</p>
            {subBMs.length === 0 ? <p className={`text-xs ${text3}`}>팝업 북마크 없음</p> :
              subBMs.map((m) => (<button key={m.id} onClick={() => { setActiveSubId(m.subId); setPopMode(true); setShowSubBM(false); setTimeout(() => document.getElementById(`sub-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }}
                className={`block w-full text-left text-xs ${text3} py-1 truncate`}>🔖 {m.question}</button>))}
          </div>
        )}

        {/* 메인 채팅 영역 */}
        <main className={`flex-1 overflow-y-auto px-3 py-4 ${bg} min-h-0`}>
          <div className="max-w-2xl mx-auto space-y-5">
            {!session || session.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[40vh] text-center">
                <Sparkles size={22} className="text-[#4a9eff] mb-3" />
                <h2 className={`font-logo text-xl mb-1 ${text1}`}>POPchat</h2>
                <p className={`${text3} text-xs leading-relaxed`}>질문하세요.<br />⚡ 버튼 또는 [ {settings.popupShortcut} ] 키로 팝업 전환</p>
              </div>
            ) : renderMessages(session.messages, 'msg-', false)}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* 모바일/아래 팝업: flex 안에서 일반 div로 (fixed 아님!) */}
        {showPopup && (isMobile || popupPos === 'bottom') && (
          <div className={`${bg} flex-shrink-0 flex flex-col border-t border-[#f59e0b] border-b border-b-[#f59e0b]`}
            style={{ height: `${subPanelSize}vh` }}>
            {/* 드래그 핸들 */}
            <div className="flex justify-center py-1.5 touch-none cursor-row-resize flex-shrink-0"
              onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
              onMouseDown={handleDragStart}>
              <div className={`w-10 h-1 ${dark ? 'bg-[#444]' : 'bg-[#ddd]'} rounded-full`} />
            </div>
            {/* 팝업 헤더 */}
            <div className={`flex items-center justify-between px-3 py-1 flex-shrink-0`}>
              <span className="text-xs text-[#f59e0b] font-medium">팝업 채팅</span>
              <button onClick={closePopup} className={`${text3} p-1`}><X size={13} /></button>
            </div>
            {/* 팝업 메시지 */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
              {renderMessages(activeSub!.messages, 'sub-', true)}
              <div ref={subMessagesEndRef} />
            </div>
          </div>
        )}

        {/* 입력창 (항상 맨 아래) */}
        <div className={`px-3 pb-1 pt-2 ${bg} flex-shrink-0`}>
          <div className={`flex flex-col px-3 py-2 max-w-2xl mx-auto border ${popMode ? 'border-[#f59e0b]' : `${border}`} rounded-2xl ${bg} transition-colors`}>
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUnifiedSend(); } }}
              placeholder={popMode ? '팝업 질문...' : '메시지 입력...'} rows={2}
              className={`w-full bg-transparent ${text1} text-[13px] resize-none outline-none placeholder:text-[#bbb] min-h-[48px] max-h-[120px]`} />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#e5e5e5]/30">
              <div className="flex items-center gap-3">
                <button onClick={togglePopMode}
                  className={`p-2 rounded-full transition-colors ${popMode ? 'bg-[#f59e0b] text-white' : `${dark ? 'bg-[#2a2a2a]' : 'bg-[#f0f0f0]'} ${text3}`}`}>
                  <Zap size={15} />
                </button>
                <button onClick={() => alert('파일 첨부 기능은 준비 중입니다.')}
                  className={`p-2 rounded-full ${dark ? 'bg-[#2a2a2a]' : 'bg-[#f0f0f0]'} ${text3} active:scale-95`}>
                  <Plus size={15} />
                </button>
              </div>
              <button onClick={handleUnifiedSend}
                disabled={!input.trim() || store.isLoading || !!store.subChatLoading}
                className={`p-2.5 ${popMode ? 'bg-[#f59e0b]' : 'bg-[#4a9eff]'} rounded-full disabled:opacity-30 select-none active:scale-95 transition-all`}>
                <Send size={15} className="text-white" />
              </button>
            </div>
          </div>
          <p className={`text-center text-[9px] mt-0.5 ${popMode ? 'text-[#f59e0b]' : text4}`}>
            {popMode ? '⚡ 팝업 모드' : `⚡ 탭 또는 [ ${settings.popupShortcut} ] 키`}
          </p>
        </div>
      </div>

      {/* PC 오른쪽 팝업 */}
      {showPopup && popupPos === 'right' && !isMobile && (
        <div className={`w-80 ${bg} flex flex-col flex-shrink-0 border-l border-[#f59e0b]`}>
          <div className={`flex items-center justify-between px-3 py-1.5 border-b border-[#f59e0b] flex-shrink-0`}>
            <span className="text-xs text-[#f59e0b] font-medium">팝업 채팅</span>
            <button onClick={closePopup} className={`${text3} p-1`}><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {renderMessages(activeSub!.messages, 'sub-', true)}
            <div ref={subMessagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
