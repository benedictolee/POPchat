'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/chatStore';
import {
  Send, Sparkles, Bookmark, BookmarkCheck, Plus, MessageSquare,
  X, Menu, PanelLeftOpen, PanelRightOpen, ChevronDown, Trash2,
  Settings, Search, User, ChevronLeft, Moon, Sun, Globe, MessageCircle
} from 'lucide-react';

const genId = () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
const langNames: Record<string, string> = { ko: '한국어', en: 'English', zh: '中文', ja: '日本語' };

export default function Home() {
  const store = useAppStore();
  const session = store.getCurrentSession();
  const { settings } = store;
  const dark = settings.theme === 'dark';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subMessagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [subInput, setSubInput] = useState('');
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMainBM, setShowMainBM] = useState(false);
  const [showSubBM, setShowSubBM] = useState(false);
  const [subSheetHeight, setSubSheetHeight] = useState(50);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(50);

  useEffect(() => { store.loadSessions(); }, []);
  useEffect(() => { store.saveSessions(); }, [store.sessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session?.messages]);
  useEffect(() => { setTimeout(() => subMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, [activeSubId, session?.subChats]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';
    document.body.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';
    document.body.style.color = dark ? '#ffffff' : '#1a1a1a';
  }, [dark]);

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

  const handleSend = async () => {
    if (!input.trim() || store.isLoading) return;
    ensureSession();
    const msgId = genId();
    const question = input.trim();
    setInput('');
    store.addMessage({ id: msgId, question, answer: '', bookmarked: false });
    store.updateMessage(msgId, { question });
    store.setLoading(true);
    try {
      const data = await sendToApi(question);
      store.updateMessage(msgId, { answer: data.error ? `⚠️ ${data.error}` : data.answer });
    } catch { store.updateMessage(msgId, { answer: '⚠️ 네트워크 오류' }); }
    finally { store.setLoading(false); }
  };

  const handleSubSend = async () => {
    if (!subInput.trim() || !activeSubId || store.subChatLoading) return;
    const msgId = genId();
    const question = subInput.trim();
    setSubInput('');
    store.addSubMessage(activeSubId, { id: msgId, question, answer: '', bookmarked: false });
    store.setSubChatLoading(activeSubId);
    const sub = session?.subChats.find((s) => s.id === activeSubId);
    const subContext = sub ? sub.parentContext + '\n\n' + sub.messages.slice(-4).map((m) => `Q: ${m.question}\nA: ${m.answer}`).join('\n\n') : '';
    try {
      const data = await sendToApi(question, subContext);
      store.updateSubMessage(activeSubId, msgId, { answer: data.error ? `⚠️ ${data.error}` : data.answer });
    } catch { store.updateSubMessage(activeSubId, msgId, { answer: '⚠️ 네트워크 오류' }); }
    finally { store.setSubChatLoading(null); }
  };

  const handleSendPress = () => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => { isLongPress.current = true; if (navigator.vibrate) navigator.vibrate(30); }, 500);
  };

  const handleSendRelease = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (isLongPress.current && input.trim()) {
      ensureSession();
      const context = buildContext();
      const subId = store.openSubChat(context, input.trim());
      const msgId = genId();
      const question = input.trim();
      setInput('');
      setActiveSubId(subId);
      store.addSubMessage(subId, { id: msgId, question, answer: '', bookmarked: false });
      store.setSubChatLoading(subId);
      sendToApi(question, context).then((data) => {
        store.updateSubMessage(subId, msgId, { answer: data.error ? `⚠️ ${data.error}` : data.answer });
      }).catch(() => {
        store.updateSubMessage(subId, msgId, { answer: '⚠️ 네트워크 오류' });
      }).finally(() => store.setSubChatLoading(null));
    } else { handleSend(); }
  };

  const handleDragStart = (e: React.TouchEvent) => { dragStartY.current = e.touches[0].clientY; dragStartH.current = subSheetHeight; };
  const handleDragMove = (e: React.TouchEvent) => {
    const dvh = ((dragStartY.current - e.touches[0].clientY) / window.innerHeight) * 100;
    setSubSheetHeight(Math.max(25, Math.min(85, dragStartH.current + dvh)));
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) { store.deleteSession(id); setConfirmDelete(null); setActiveSubId(null); }
    else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 3000); }
  };

  const activeSub = session?.subChats.find((s) => s.id === activeSubId && s.isOpen);
  const mainBMs = session?.messages.filter((m) => m.bookmarked) || [];
  const subBMs = session?.subChats.flatMap((sc) => sc.messages.filter((m) => m.bookmarked).map((m) => ({ ...m, subId: sc.id }))) || [];
  const filteredSessions = searchQuery ? store.sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.messages.some((m) => m.question.toLowerCase().includes(searchQuery.toLowerCase()))) : store.sessions;

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setShowMainBM(false); setShowSubBM(false); };

  const bg = dark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bg2 = dark ? 'bg-[#111]' : 'bg-[#fafafa]';
  const bg3 = dark ? 'bg-[#1e1e1e]' : 'bg-[#f0f0f0]';
  const border = dark ? 'border-[#2a2a2a]' : 'border-[#e5e5e5]';
  const text1 = dark ? 'text-white' : 'text-[#1a1a1a]';
  const text2 = dark ? 'text-[#ccc]' : 'text-[#333]';
  const text3 = dark ? 'text-[#666]' : 'text-[#999]';
  const text4 = dark ? 'text-[#444]' : 'text-[#ccc]';
  const inputBg = dark ? 'bg-[#1a1a1a]' : 'bg-[#f7f7f8]';

  // ========== 설정 화면 ==========
  if (showSettings) {
    return (
      <div className={`min-h-screen ${bg} ${text1} px-4 py-4`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setShowSettings(false)} className={`${text3} p-1`}><ChevronLeft size={20} /></button>
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
              <label className="text-sm font-medium mb-2 flex items-center gap-1"><MessageCircle size={14} /> 커스텀 프롬프트</label>
              <p className={`text-xs ${text3} mb-2`}>AI 답변 스타일을 조정해요. 예: "간결하게 답변해줘", "초등학생도 이해할 수 있게 설명해줘"</p>
              <textarea value={settings.customPrompt} onChange={(e) => store.updateSettings({ customPrompt: e.target.value })}
                placeholder="AI에게 줄 기본 지시사항을 입력하세요..."
                rows={4} className={`w-full ${inputBg} border ${border} rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4a9eff] resize-none ${text1}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== 메인 ==========
  return (
    <div className={`flex h-screen h-[100dvh] overflow-hidden ${bg}`}>
      {showSidebar && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setShowSidebar(false); setConfirmDelete(null); setShowSearch(false); }} />}

      {/* 사이드바 */}
      <div className={`fixed top-0 left-0 h-full w-72 ${bg2} border-r ${border} z-50 transition-transform duration-200 flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`p-3 border-b ${border} flex items-center justify-between`}>
          <span className={`text-sm font-medium ${text1}`}>채팅 목록</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(!showSearch)} className={`${text3} p-1 rounded-lg ${showSearch ? 'bg-[#4a9eff]/10 text-[#4a9eff]' : ''}`}><Search size={15} /></button>
            <button onClick={() => { setShowSidebar(false); setConfirmDelete(null); setShowSearch(false); }} className={`${text3} p-1`}><X size={16} /></button>
          </div>
        </div>

        {showSearch && (
          <div className={`px-2 py-2 border-b ${border}`}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="채팅 검색..." autoFocus
              className={`w-full ${inputBg} border ${border} rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4a9eff] ${text1}`} />
          </div>
        )}

        <button onClick={() => { store.createSession(); setActiveSubId(null); setShowSidebar(false); setShowSearch(false); }}
          className={`m-2 p-2.5 text-xs ${bg} border ${border} rounded-lg flex items-center gap-2 text-[#4a9eff] w-[calc(100%-16px)]`}>
          <Plus size={14} /> 새 채팅
        </button>

        <div className="flex-1 overflow-y-auto">
          {filteredSessions.map((ses) => (
            <div key={ses.id} className={`flex items-center group ${ses.id === store.currentSessionId ? bg3 : ''}`}>
              <button onClick={() => { store.setCurrentSession(ses.id); setActiveSubId(null); setShowSidebar(false); setConfirmDelete(null); setShowSearch(false); }}
                className={`flex-1 text-left px-3 py-2.5 text-xs truncate ${text3}`}>
                <MessageSquare size={12} className="inline mr-2" />{ses.title}
              </button>
              <button onClick={() => handleDelete(ses.id)}
                className={`mr-2 p-1 rounded ${confirmDelete === ses.id ? 'bg-red-500/10 text-red-500' : `${text4} opacity-0 group-hover:opacity-100 active:opacity-100`}`}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {filteredSessions.length === 0 && searchQuery && (
            <p className={`text-center text-xs ${text3} mt-4`}>검색 결과 없음</p>
          )}
        </div>

        <div className={`p-2 border-t ${border} flex items-center justify-between`}>
          <button className={`flex items-center gap-2 px-3 py-2 text-xs ${text3} rounded-lg`}>
            <User size={14} /> 로그인
          </button>
          <button onClick={() => { setShowSettings(true); setShowSidebar(false); }} className={`p-2 ${text3} rounded-lg`}>
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`flex items-center justify-between px-3 py-2 border-b ${border} ${bg} z-10`}>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className={`${text3} p-1`}><Menu size={18} /></button>
            <h1 className={`font-logo text-base font-bold ${text1}`}>POPchat</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowMainBM(!showMainBM); setShowSubBM(false); }}
              className={`p-1.5 rounded-lg ${showMainBM ? 'bg-[#4a9eff]/10 text-[#4a9eff]' : text4}`}>
              <PanelLeftOpen size={15} />
            </button>
            <button onClick={() => { setShowSubBM(!showSubBM); setShowMainBM(false); }}
              className={`p-1.5 rounded-lg ${showSubBM ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : text4}`}>
              <PanelRightOpen size={15} />
            </button>
          </div>
        </header>

        {showMainBM && mainBMs.length > 0 && (
          <div className={`${dark ? 'bg-[#111]' : 'bg-[#f8faff]'} border-b ${border} px-3 py-2 max-h-28 overflow-y-auto animate-fadeIn`}>
            <p className="text-[10px] text-[#4a9eff] mb-1">메인 북마크</p>
            {mainBMs.map((m) => (
              <button key={m.id} onClick={() => scrollTo(`msg-${m.id}`)} className={`block w-full text-left text-xs ${text3} py-1 truncate`}>📌 {m.question}</button>
            ))}
          </div>
        )}
        {showSubBM && subBMs.length > 0 && (
          <div className={`${dark ? 'bg-[#111]' : 'bg-[#fffbf0]'} border-b ${border} px-3 py-2 max-h-28 overflow-y-auto animate-fadeIn`}>
            <p className="text-[10px] text-[#f59e0b] mb-1">팝업 북마크</p>
            {subBMs.map((m) => (
              <button key={m.id} onClick={() => { setActiveSubId(m.subId); scrollTo(`sub-${m.id}`); }}
                className={`block w-full text-left text-xs ${text3} py-1 truncate`}>🔖 {m.question}</button>
            ))}
          </div>
        )}

        <main className={`flex-1 overflow-y-auto px-3 py-4 ${bg}`}>
          <div className="max-w-2xl mx-auto space-y-5">
            {!session || session.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[55vh] text-center">
                <Sparkles size={22} className="text-[#4a9eff] mb-3" />
                <h2 className={`font-logo text-xl mb-1 ${text1}`}>POPchat</h2>
                <p className={`${text3} text-xs leading-relaxed`}>질문하세요.<br />전송 버튼을 꾹 누르면<br />팝업 채팅이 열려요.</p>
              </div>
            ) : (
              session.messages.map((msg) => (
                <div key={msg.id} id={`msg-${msg.id}`} className="animate-fadeIn">
                  <div className="flex justify-end mb-2">
                    <div className="bg-[#4a9eff] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <p className="text-[13px] text-white whitespace-pre-wrap">{msg.question}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-1">
                    <Sparkles size={13} className="text-[#4a9eff] mt-0.5 flex-shrink-0" />
                    <div className={`text-[13px] ${text2} whitespace-pre-wrap leading-relaxed`}>
                      {msg.answer || (
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-[#4a9eff] rounded-full animate-pulse-subtle" />
                          <span className="w-1.5 h-1.5 bg-[#4a9eff] rounded-full animate-pulse-subtle [animation-delay:0.3s]" />
                          <span className="w-1.5 h-1.5 bg-[#4a9eff] rounded-full animate-pulse-subtle [animation-delay:0.6s]" />
                        </span>
                      )}
                    </div>
                  </div>
                  {msg.answer && (
                    <button onClick={() => store.toggleBookmark(msg.id)}
                      className={`ml-5 ${msg.bookmarked ? 'text-[#4a9eff]' : `${text4} active:text-[#4a9eff]`}`}>
                      {msg.bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    </button>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className={`px-3 pb-3 pt-1 ${bg}`}>
          <div className="chat-input-area flex items-end gap-2 px-3 py-2 max-w-2xl mx-auto">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="메시지 입력..." rows={1}
              className={`flex-1 bg-transparent ${text1} text-[13px] resize-none outline-none placeholder:${text4} max-h-28`} />
            <button onMouseDown={handleSendPress} onMouseUp={handleSendRelease}
              onTouchStart={handleSendPress} onTouchEnd={handleSendRelease}
              disabled={!input.trim() || store.isLoading}
              className="p-2 bg-[#4a9eff] rounded-full disabled:opacity-30 select-none active:scale-95 transition-transform">
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className={`text-center text-[9px] ${text4} mt-1`}>꾹 누르면 팝업 채팅</p>
        </div>

        {activeSub && (
          <>
            <div className="fixed inset-0 bg-black/10 z-30" onClick={() => { store.closeSubChat(activeSub.id); setActiveSubId(null); }} />
            <div className={`fixed bottom-0 left-0 right-0 z-40 ${bg} border-t border-[#f59e0b]/30 rounded-t-2xl flex flex-col animate-fadeIn shadow-2xl`}
              style={{ height: `${subSheetHeight}vh` }}>
              <div className="flex justify-center pt-2 pb-1" onTouchStart={handleDragStart} onTouchMove={handleDragMove}>
                <div className={`w-10 h-1 ${dark ? 'bg-[#333]' : 'bg-[#e0e0e0]'} rounded-full`} />
              </div>
              <div className={`flex items-center justify-between px-3 py-1.5 border-b ${border}`}>
                <span className="text-xs text-[#f59e0b] font-medium">팝업 채팅</span>
                <button onClick={() => { store.closeSubChat(activeSub.id); setActiveSubId(null); }} className={`${text3} p-1`}><ChevronDown size={16} /></button>
              </div>
              <div className={`flex-1 overflow-y-auto px-3 py-2 space-y-3 ${dark ? 'bg-[#0d0d0d]' : 'bg-[#fffdf8]'}`}>
                {activeSub.messages.map((msg) => (
                  <div key={msg.id} id={`sub-${msg.id}`} className="animate-fadeIn">
                    <div className="flex justify-end mb-1">
                      <div className="bg-[#f59e0b] rounded-xl rounded-tr-sm px-2.5 py-1.5 max-w-[85%]">
                        <p className="text-xs text-white whitespace-pre-wrap">{msg.question}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mb-0.5">
                      <Sparkles size={11} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
                      <div className={`text-xs ${dark ? 'text-[#bbb]' : 'text-[#444]'} whitespace-pre-wrap leading-relaxed`}>
                        {msg.answer || (
                          <span className="flex gap-1">
                            <span className="w-1 h-1 bg-[#f59e0b] rounded-full animate-pulse-subtle" />
                            <span className="w-1 h-1 bg-[#f59e0b] rounded-full animate-pulse-subtle [animation-delay:0.3s]" />
                            <span className="w-1 h-1 bg-[#f59e0b] rounded-full animate-pulse-subtle [animation-delay:0.6s]" />
                          </span>
                        )}
                      </div>
                    </div>
                    {msg.answer && (
                      <button onClick={() => store.toggleSubBookmark(activeSub.id, msg.id)}
                        className={`ml-4 ${msg.bookmarked ? 'text-[#f59e0b]' : `${text4} active:text-[#f59e0b]`}`}>
                        {msg.bookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                      </button>
                    )}
                  </div>
                ))}
                <div ref={subMessagesEndRef} />
              </div>
              <div className={`px-3 pb-3 pt-1 ${bg}`}>
                <div className={`flex items-end gap-1.5 ${inputBg} border ${border} rounded-xl px-2.5 py-1.5`}>
                  <textarea value={subInput} onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubSend(); } }}
                    placeholder="서브 질문..." rows={1}
                    className={`flex-1 bg-transparent ${text1} text-xs resize-none outline-none placeholder:${text4} max-h-20`} />
                  <button onClick={handleSubSend} disabled={!subInput.trim() || !!store.subChatLoading}
                    className="p-1.5 bg-[#f59e0b] rounded-full disabled:opacity-30 active:scale-95 transition-transform">
                    <Send size={11} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
