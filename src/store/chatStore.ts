import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  bookmarked: boolean;
}

export interface SubChat {
  id: string;
  parentContext: string;
  messages: ChatMessage[];
  isOpen: boolean;
  initialQuestion: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  subChats: SubChat[];
  createdAt: number;
}

const genId = () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

interface AppStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  subChatLoading: string | null;

  createSession: () => string;
  setCurrentSession: (id: string) => void;
  getCurrentSession: () => ChatSession | null;

  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  toggleBookmark: (id: string) => void;
  setLoading: (v: boolean) => void;

  openSubChat: (parentContext: string, initialQuestion: string) => string;
  closeSubChat: (subId: string) => void;
  addSubMessage: (subId: string, msg: ChatMessage) => void;
  updateSubMessage: (subId: string, msgId: string, updates: Partial<ChatMessage>) => void;
  toggleSubBookmark: (subId: string, msgId: string) => void;
  setSubChatLoading: (v: string | null) => void;

  saveSessions: () => void;
  loadSessions: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  isLoading: false,
  subChatLoading: null,

  createSession: () => {
    const id = genId();
    const session: ChatSession = { id, title: '새 채팅', messages: [], subChats: [], createdAt: Date.now() };
    set((s) => ({ sessions: [session, ...s.sessions], currentSessionId: id }));
    return id;
  },

  setCurrentSession: (id) => set({ currentSessionId: id }),

  getCurrentSession: () => {
    const { sessions, currentSessionId } = get();
    return sessions.find((s) => s.id === currentSessionId) || null;
  },

  addMessage: (msg) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId ? { ...ses, messages: [...ses.messages, msg] } : ses
      ),
    })),

  updateMessage: (id, updates) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId
          ? { ...ses, messages: ses.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
              title: updates.question && ses.messages.length === 0 ? updates.question.slice(0, 30) : ses.title }
          : ses
      ),
    })),

  toggleBookmark: (id) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId
          ? { ...ses, messages: ses.messages.map((m) => (m.id === id ? { ...m, bookmarked: !m.bookmarked } : m)) }
          : ses
      ),
    })),

  setLoading: (v) => set({ isLoading: v }),

  openSubChat: (parentContext, initialQuestion) => {
    const subId = genId();
    const sub: SubChat = { id: subId, parentContext, messages: [], isOpen: true, initialQuestion };
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId ? { ...ses, subChats: [...ses.subChats, sub] } : ses
      ),
    }));
    return subId;
  },

  closeSubChat: (subId) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId
          ? { ...ses, subChats: ses.subChats.map((sc) => (sc.id === subId ? { ...sc, isOpen: false } : sc)) }
          : ses
      ),
    })),

  addSubMessage: (subId, msg) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId
          ? { ...ses, subChats: ses.subChats.map((sc) => (sc.id === subId ? { ...sc, messages: [...sc.messages, msg] } : sc)) }
          : ses
      ),
    })),

  updateSubMessage: (subId, msgId, updates) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId
          ? { ...ses, subChats: ses.subChats.map((sc) =>
              sc.id === subId ? { ...sc, messages: sc.messages.map((m) => (m.id === msgId ? { ...m, ...updates } : m)) } : sc
            ) }
          : ses
      ),
    })),

  toggleSubBookmark: (subId, msgId) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === s.currentSessionId
          ? { ...ses, subChats: ses.subChats.map((sc) =>
              sc.id === subId ? { ...sc, messages: sc.messages.map((m) => (m.id === msgId ? { ...m, bookmarked: !m.bookmarked } : m)) } : sc
            ) }
          : ses
      ),
    })),

  setSubChatLoading: (v) => set({ subChatLoading: v }),

  saveSessions: () => {
    const { sessions } = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem('popchat_sessions', JSON.stringify(sessions));
    }
  },

  loadSessions: () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('popchat_sessions');
      if (data) {
        try {
          const sessions = JSON.parse(data);
          set({ sessions, currentSessionId: sessions[0]?.id || null });
        } catch {}
      }
    }
  },
}));
