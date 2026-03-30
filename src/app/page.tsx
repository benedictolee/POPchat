'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/chatStore';
import {
  Send, Sparkles, Bookmark, BookmarkCheck,
  Plus, MessageSquare, X, Menu, PanelLeftOpen, PanelRightOpen, ChevronDown, Trash2
} from 'lucide-react';

const genId = () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

export default function Home() {
  const store = useAppStore();
  const session = store.getCurrentSession();
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
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(50);

  useEffect(() => { store.loadSessions(); }, []);
  useEffect(() => { store.saveSessions(); }, [store.sessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session?.messages]);
  useEffect(() => {
    setTimeout(() => subMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [activeSubId, session?.subChats]);

  const ensureSession = useCallback(() => {
    if (!store.currentSessionId) return store.createSession();
    return store.currentSessionId;
  }, [store]);

  const buildContext = useCallback(() => {
    if (!session) return '';
    return session.messages.slice(-6).map((m) => `Q: ${m.question}\nA: ${m.answer}`).join('\n\n');
  }, [session]);

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
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
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
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, context: subContext }),
      });
      const data = await res.json();
      store.updateSubMessage(activeSubId, msgId, { answer: data.error ? `⚠️ ${data.error}` : data.answer });
    } catch { store.updateSubMessage(activeSubId, msgId, { answer: '⚠️ 네트워크 오류' }); }
    finally { store.setSubChatLoading(null); }
  };

  const handleSendPress = () => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
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
      fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, context }),
      }).then((r) => r.json()).then((data) => {
        store.updateSubMessage(subId, msgId, { answer: data.error ? `⚠️ ${data.error}` : data.answer });
      }).catch(() => {
        store.updateSubMessage(subId, msgId, { answer: '⚠️ 네트워크 오류' });
      }).finally(() => store.setSubChatLoading(null));
    } else { handleSend(); }
  };

  const handleDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartH.current = subSheetHeight;
  };
  const handleDragMove = (e: React.TouchEvent) => {
    const dy = dragStartY.current - e.touches[0].clientY;
    const dvh = (dy / window.innerHeight) * 100;
    setSubSheetHeight(Math.max(25, Math.min(85, dragStartH.current + dvh)));
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      store.deleteSession(id);
      setConfirmDelete(null);
      setActiveSubId(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const activeSub = session?.subChats.find((s) => s.id === activeSubId && s.isOpen);
  const mainBMs = session?.messages.filter((m) => m.bookmarked) || [];
  const subBMs = session?.subChats.flatMap((sc) => sc.messages.filter((m) => m.bookmarked).map((m) => ({ ...m, subId: sc.id }))) || [];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowMainBM(false); setShowSubBM(false);
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden">
      {showSidebar && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowSidebar(false); setConfirmDelete(null); }} />}

      <div className={`fixed top-0 left-0 h-full w-72 bg-[#111] border-r border-[#2a2a2a] z-50 transition-transform duration-200 flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-3 border-b border-[#2a2a2a] flex items-center justify-between">
          <span className="text-sm font-medium">채팅 목록</span>
          <button onClick={() => { setShowSidebar(false); setConfirmDelete(null); }} className="text-[#666] hover:text-white"><X size={16} /></button>
        </div>
        <button onClick={() => { store.createSession(); setActiveSubId(null); setShowSidebar(false); }}
          className="m-2 p-2.5 text-xs bg-[#1e1e1e] rounded-lg hover:bg-[#2a2a2a] flex items-center gap-2 text-[#4a9eff] w-[calc(100%-16px)]">
          <Plus size={14} /> 새 채팅
        </button>
        <div className="flex-1 overflow-y-auto">
          {store.sessions.map((ses) => (
            <div key={ses.id} className={`flex items-center group ${ses.id === store.currentSessionId ? 'bg-[#1e1e1e]' : 'hover:bg-[#1a1a1a]'}`}>
              <button onClick={() => { store.setCurrentSession(ses.id); setActiveSubId(null); setShowSidebar(false); setConfirmDelete(null); }}
                className="flex-1 text-left px-3 py-2.5 text-xs truncate text-[#888]">
                <MessageSquare size={12} className="inline mr-2" />{ses.title}
              </button>
              <button onClick={() => handleDelete(ses.id)}
                className={`mr-2 p-1 rounded transition-colors ${confirmDelete === ses.id ? 'bg-red-500/20 text-red-400' : 'text-[#444] opacity-0 group-hover:opacity-100 active:opacity-100'}`}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {store.sessions.length > 1 && (
          <div className="p-2 border-t border-[#2a2a2a]">
            <button onClick={() => { if (confirm('모든 채팅을 삭제할까요?')) { store.deleteAllSessions(); setActiveSubId(null); } }}
              className="w-full p-2 text-xs text-[#666] hover:text-red-400 rounded-lg hover:bg-[#1a1a1a] flex items-center justify-center gap-1">
              <Trash2 size={12} /> 전체 삭제
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#0a0a0a] z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className="text-[#666] hover:text-white p-1"><Menu size={18} /></button>
            <h1 className="font-logo text-base font-bold">POPchat</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowMainBM(!showMainBM); setShowSubBM(false); }}
              className={`p-1.5 rounded-lg ${showMainBM ? 'bg-[#4a9eff]/20 text-[#4a9eff]' : 'text-[#666]'}`}>
              <PanelLeftOpen size={15} />
            </button>
            <button onClick={() => { setShowSubBM(!showSubBM); setShowMainBM(false); }}
              className={`p-1.5 rounded-lg ${showSubBM ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#666]'}`}>
              <PanelRightOpen size={15} />
            </button>
          </div>
        </header>

        {showMainBM && mainBMs.length > 0 && (
          <div className="bg-[#111] border-b border-[#2a2a2a] px-3 py-2 max-h-28 overflow-y-auto animate-fadeIn">
            <p className="text-[10px] text-[#4a9eff] mb-1">메인 북마크</p>
            {mainBMs.map((m) => (
              <button key={m.id} onClick={() => scrollTo(`msg-${m.id}`)} className="block w-full text-left text-xs text-[#aaa] hover:text-white py-1 truncate">📌 {m.question}</button>
            ))}
          </div>
        )}
        {showSubBM && subBMs.length > 0 && (
          <div className="bg-[#111] border-b border-[#2a2a2a] px-3 py-2 max-h-28 overflow-y-auto animate-fadeIn">
            <p className="text-[10px] text-[#f59e0b] mb-1">팝업 북마크</p>
            {subBMs.map((m) => (
              <button key={m.id} onClick={() => { setActiveSubId(m.subId); scrollTo(`sub-${m.id}`); }}
                className="block w-full text-left text-xs text-[#aaa] hover:text-white py-1 truncate">🔖 {m.question}</button>
            ))}
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-3 py-4">
          <div className="max-w-2xl mx-auto space-y-5">
            {!session || session.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[55vh] text-center">
                <Sparkles size={22} className="text-[#4a9eff] mb-3" />
                <h2 className="font-logo text-xl mb-1">POPchat</h2>
                <p className="text-[#555] text-xs leading-relaxed">질문하세요.<br />전송 버튼을 꾹 누르면<br />팝업 채팅이 열려요.</p>
              </div>
            ) : (
              session.messages.map((msg) => (
                <div key={msg.id} id={`msg-${msg.id}`} className="animate-fadeIn">
                  <div className="flex justify-end mb-2">
                    <div className="bg-[#1e1e1e] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <p className="text-[13px] whitespace-pre-wrap">{msg.question}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-1">
                    <Sparkles size={13} className="text-[#4a9eff] mt-0.5 flex-shrink-0" />
                    <div className="text-[13px] text-[#ccc] whitespace-pre-wrap leading-relaxed">
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
                      className={`ml-5 ${msg.bookmarked ? 'text-[#4a9eff]' : 'text-[#333] active:text-[#4a9eff]'}`}>
                      {msg.bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    </button>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="px-3 pb-3 pt-1 bg-[#0a0a0a]">
          <div className="chat-input-area flex items-end gap-2 px-3 py-2 max-w-2xl mx-auto">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="메시지 입력..." rows={1}
              className="flex-1 bg-transparent text-white text-[13px] resize-none outline-none placeholder:text-[#555] max-h-28" />
            <button onMouseDown={handleSendPress} onMouseUp={handleSendRelease}
              onTouchStart={handleSendPress} onTouchEnd={handleSendRelease}
              disabled={!input.trim() || store.isLoading}
              className="p-2 bg-[#4a9eff] rounded-full disabled:opacity-30 select-none active:scale-95 transition-transform">
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className="text-center text-[9px] text-[#444] mt-1">꾹 누르면 팝업 채팅</p>
        </div>

        {activeSub && (
          <>
            <div className="fixed inset-0 bg-black/30 z-30" onClick={() => { store.closeSubChat(activeSub.id); setActiveSubId(null); }} />
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d] border-t border-[#f59e0b]/30 rounded-t-2xl flex flex-col animate-fadeIn"
              style={{ height: `${subSheetHeight}vh` }}>
              <div className="flex justify-center pt-2 pb-1" onTouchStart={handleDragStart} onTouchMove={handleDragMove}>
                <div className="w-10 h-1 bg-[#333] rounded-full" />
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2a2a]">
                <span className="text-xs text-[#f59e0b] font-medium">팝업 채팅</span>
                <button onClick={() => { store.closeSubChat(activeSub.id); setActiveSubId(null); }} className="text-[#666] active:text-white p-1">
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
                {activeSub.messages.map((msg) => (
                  <div key={msg.id} id={`sub-${msg.id}`} className="animate-fadeIn">
                    <div className="flex justify-end mb-1">
                      <div className="bg-[#1a1a1a] rounded-xl rounded-tr-sm px-2.5 py-1.5 max-w-[85%]">
                        <p className="text-xs whitespace-pre-wrap">{msg.question}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mb-0.5">
                      <Sparkles size={11} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-[#bbb] whitespace-pre-wrap leading-relaxed">
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
                        className={`ml-4 ${msg.bookmarked ? 'text-[#f59e0b]' : 'text-[#333] active:text-[#f59e0b]'}`}>
                        {msg.bookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                      </button>
                    )}
                  </div>
                ))}
                <div ref={subMessagesEndRef} />
              </div>
              <div className="px-3 pb-3 pt-1">
                <div className="flex items-end gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-2.5 py-1.5">
                  <textarea value={subInput} onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubSend(); } }}
                    placeholder="서브 질문..." rows={1}
                    className="flex-1 bg-transparent text-white text-xs resize-none outline-none placeholder:text-[#555] max-h-20" />
                  <button onClick={handleSubSend} disabled={!subInput.trim() || !!store.subChatLoading}
                    className="p-1.5 bg-[#f59e0b] rounded-full disabled:opacity-30 active:scale-95 transition-transform">
                    <Send size={11} className="text-black" />
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
