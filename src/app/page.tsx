'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore, ChatMessage } from '@/store/chatStore';
import {
  Send, Sparkles, Bookmark, BookmarkCheck,
  Plus, MessageSquare, ChevronLeft, X, PanelLeftOpen, PanelRightOpen
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
  const [showMainBookmarks, setShowMainBookmarks] = useState(false);
  const [showSubBookmarks, setShowSubBookmarks] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => { store.loadSessions(); }, []);
  useEffect(() => { store.saveSessions(); }, [store.sessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session?.messages]);
  useEffect(() => { subMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeSubId, session?.subChats]);

  const ensureSession = useCallback(() => {
    if (!store.currentSessionId) return store.createSession();
    return store.currentSessionId;
  }, [store]);

  const buildContext = useCallback(() => {
    if (!session) return '';
    return session.messages.map((m) => `Q: ${m.question}\nA: ${m.answer}`).join('\n\n');
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
    const subContext = sub ? sub.parentContext + '\n\n' + sub.messages.map((m) => `Q: ${m.question}\nA: ${m.answer}`).join('\n\n') : '';
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
    pressTimer.current = setTimeout(() => { isLongPress.current = true; }, 500);
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

  const activeSub = session?.subChats.find((s) => s.id === activeSubId && s.isOpen);
  const mainBookmarks = session?.messages.filter((m) => m.bookmarked) || [];
  const subBookmarks = session?.subChats.flatMap((sc) => sc.messages.filter((m) => m.bookmarked).map((m) => ({ ...m, subId: sc.id }))) || [];

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowMainBookmarks(false);
    setShowSubBookmarks(false);
  };

  return (
    <div className="flex h-screen">
      {/* 사이드바 - 채팅 목록 */}
      {showSidebar && (
        <div className="w-64 bg-[#111] border-r border-[#2a2a2a] flex flex-col">
          <div className="p-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <span className="text-sm font-medium">채팅 목록</span>
            <button onClick={() => setShowSidebar(false)} className="text-[#666] hover:text-white"><X size={16} /></button>
          </div>
          <button onClick={() => { store.createSession(); setActiveSubId(null); }} className="m-2 p-2 text-xs bg-[#1e1e1e] rounded-lg hover:bg-[#2a2a2a] flex items-center gap-2 text-[#4a9eff]">
            <Plus size={14} /> 새 채팅
          </button>
          <div className="flex-1 overflow-y-auto">
            {store.sessions.map((ses) => (
              <button key={ses.id} onClick={() => { store.setCurrentSession(ses.id); setActiveSubId(null); setShowSidebar(false); }}
                className={`w-full text-left px-3 py-2 text-xs truncate hover:bg-[#1e1e1e] ${ses.id === store.currentSessionId ? 'bg-[#1e1e1e] text-white' : 'text-[#888]'}`}>
                <MessageSquare size={12} className="inline mr-2" />{ses.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="text-[#666] hover:text-white"><ChevronLeft size={18} /></button>
            <h1 className="font-logo text-lg font-bold">POPchat</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowMainBookmarks(!showMainBookmarks); setShowSubBookmarks(false); }}
              className={`p-1.5 rounded-lg transition-colors ${showMainBookmarks ? 'bg-[#4a9eff]/20 text-[#4a9eff]' : 'text-[#666] hover:text-white'}`}>
              <PanelLeftOpen size={16} />
            </button>
            <button onClick={() => { setShowSubBookmarks(!showSubBookmarks); setShowMainBookmarks(false); }}
              className={`p-1.5 rounded-lg transition-colors ${showSubBookmarks ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#666] hover:text-white'}`}>
              <PanelRightOpen size={16} />
            </button>
          </div>
        </header>

        {/* 북마크 패널 */}
        {showMainBookmarks && mainBookmarks.length > 0 && (
          <div className="bg-[#111] border-b border-[#2a2a2a] px-4 py-2 max-h-32 overflow-y-auto animate-fadeIn">
            <p className="text-[10px] text-[#4a9eff] mb-1">메인 북마크</p>
            {mainBookmarks.map((m) => (
              <button key={m.id} onClick={() => scrollToMessage(m.id)} className="block w-full text-left text-xs text-[#aaa] hover:text-white py-1 truncate">
                📌 {m.question}
              </button>
            ))}
          </div>
        )}
        {showSubBookmarks && subBookmarks.length > 0 && (
          <div className="bg-[#111] border-b border-[#2a2a2a] px-4 py-2 max-h-32 overflow-y-auto animate-fadeIn">
            <p className="text-[10px] text-[#f59e0b] mb-1">팝업 북마크</p>
            {subBookmarks.map((m) => (
              <button key={m.id} onClick={() => { setActiveSubId(m.subId); scrollToMessage(`sub-${m.id}`); }}
                className="block w-full text-left text-xs text-[#aaa] hover:text-white py-1 truncate">
                🔖 {m.question}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* 메인 채팅 */}
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-2xl mx-auto space-y-6">
                {!session || session.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <Sparkles size={24} className="text-[#4a9eff] mb-3" />
                    <h2 className="font-logo text-xl mb-1">POPchat</h2>
                    <p className="text-[#666] text-xs">질문하세요. 꾹 누르면 팝업 채팅이 열려요.</p>
                  </div>
                ) : (
                  session.messages.map((msg) => (
                    <div key={msg.id} id={`msg-${msg.id}`} className="animate-fadeIn">
                      <div className="flex justify-end mb-2">
                        <div className="bg-[#1e1e1e] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                          <p className="text-sm whitespace-pre-wrap">{msg.question}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-1">
                        <Sparkles size={14} className="text-[#4a9eff] mt-1 flex-shrink-0" />
                        <div className="text-sm text-[#ccc] whitespace-pre-wrap">
                          {msg.answer || <span className="flex gap-1"><span className="w-1.5 h-1.5 bg-[#4a9eff] rounded-full animate-pulse-subtle" /><span className="w-1.5 h-1.5 bg-[#4a9eff] rounded-full animate-pulse-subtle [animation-delay:0.3s]" /><span className="w-1.5 h-1.5 bg-[#4a9eff] rounded-full animate-pulse-subtle [animation-delay:0.6s]" /></span>}
                        </div>
                      </div>
                      {msg.answer && (
                        <button onClick={() => store.toggleBookmark(msg.id)} className={`ml-5 ${msg.bookmarked ? 'text-[#4a9eff]' : 'text-[#444] hover:text-[#4a9eff]'}`}>
                          {msg.bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </main>

            {/* 입력 */}
            <div className="px-4 pb-3 pt-1">
              <div className="chat-input-area flex items-end gap-2 px-3 py-2 max-w-2xl mx-auto">
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="메시지 입력... (꾹 누르면 팝업 채팅)" rows={1}
                  className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder:text-[#555] max-h-32" />
                <button onMouseDown={handleSendPress} onMouseUp={handleSendRelease}
                  onTouchStart={handleSendPress} onTouchEnd={handleSendRelease}
                  disabled={!input.trim() || store.isLoading}
                  className="p-1.5 bg-[#4a9eff] rounded-full disabled:opacity-30 select-none">
                  <Send size={14} className="text-white" />
                </button>
              </div>
              <p className="text-center text-[10px] text-[#444] mt-1">꾹 누르면 팝업 채팅</p>
            </div>
          </div>

          {/* 팝업 서브채팅 */}
          {activeSub && (
            <div className="w-80 border-l border-[#2a2a2a] flex flex-col bg-[#0d0d0d] animate-fadeIn">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#111]">
                <span className="text-xs text-[#f59e0b]">팝업 채팅</span>
                <button onClick={() => { store.closeSubChat(activeSub.id); setActiveSubId(null); }} className="text-[#666] hover:text-white"><X size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {activeSub.messages.map((msg) => (
                  <div key={msg.id} id={`sub-${msg.id}`} className="animate-fadeIn">
                    <div className="flex justify-end mb-1.5">
                      <div className="bg-[#1a1a1a] rounded-xl rounded-tr-sm px-2.5 py-1.5 max-w-[85%]">
                        <p className="text-xs whitespace-pre-wrap">{msg.question}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mb-1">
                      <Sparkles size={11} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-[#bbb] whitespace-pre-wrap">
                        {msg.answer || <span className="flex gap-1"><span className="w-1 h-1 bg-[#f59e0b] rounded-full animate-pulse-subtle" /><span className="w-1 h-1 bg-[#f59e0b] rounded-full animate-pulse-subtle [animation-delay:0.3s]" /><span className="w-1 h-1 bg-[#f59e0b] rounded-full animate-pulse-subtle [animation-delay:0.6s]" /></span>}
                      </div>
                    </div>
                    {msg.answer && (
                      <button onClick={() => store.toggleSubBookmark(activeSub.id, msg.id)} className={`ml-4 ${msg.bookmarked ? 'text-[#f59e0b]' : 'text-[#444] hover:text-[#f59e0b]'}`}>
                        {msg.bookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                      </button>
                    )}
                  </div>
                ))}
                <div ref={subMessagesEndRef} />
              </div>
              <div className="px-3 pb-2 pt-1">
                <div className="flex items-end gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-2.5 py-1.5">
                  <textarea value={subInput} onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubSend(); } }}
                    placeholder="서브 질문..." rows={1}
                    className="flex-1 bg-transparent text-white text-xs resize-none outline-none placeholder:text-[#555] max-h-20" />
                  <button onClick={handleSubSend} disabled={!subInput.trim() || !!store.subChatLoading}
                    className="p-1 bg-[#f59e0b] rounded-full disabled:opacity-30">
                    <Send size={11} className="text-black" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
