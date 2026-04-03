import { create } from 'zustand';
import { supabase } from '@/utils/supabase';

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

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'ko' | 'en' | 'zh' | 'ja';
  customPrompt: string;
  popupPosition: 'bottom' | 'left' | 'right';
  popupShortcut: string;
}

const genId = () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'ko',
  customPrompt: '',
  popupPosition: 'bottom',
  popupShortcut: '\\',
};

interface AppStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  subChatLoading: string | null;
  settings: AppSettings;

  createSession: () => string;
  setCurrentSession: (id: string) => void;
  getCurrentSession: () => ChatSession | null;
  deleteSession: (id: string) => void;
  deleteAllSessions: () => void;

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

  updateSettings: (s: Partial<AppSettings>) => void;
  saveSessions: () => void;
  loadSessions: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  isLoading: false,
  subChatLoading: null,
  settings: defaultSettings,

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

  deleteSession: async (id) => {
    set((s) => {
      const filtered = s.sessions.filter((ses) => ses.id !==
 
