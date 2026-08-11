import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedPrompt {
  id: string;
  name: string;
  content: string;
}

export interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface SettingsState {
  language: string;
  autoConnectServerId: string;
  showLivePreviews: boolean;
  showBuiltInWorkflows: boolean;
  expandPromptField: boolean;
  useInMemoryCache: boolean;
  disableMediaCache: boolean;
  enableDebugLogging: boolean;
  savedPrompts: SavedPrompt[];
  debugLogs: DebugLog[];

  // Actions
  setLanguage: (lang: string) => void;
  setAutoConnectServerId: (id: string) => void;
  setShowLivePreviews: (show: boolean) => void;
  setShowBuiltInWorkflows: (show: boolean) => void;
  setExpandPromptField: (expand: boolean) => void;
  setUseInMemoryCache: (use: boolean) => void;
  setDisableMediaCache: (disable: boolean) => void;
  setEnableDebugLogging: (enable: boolean) => void;
  
  // Prompt Actions
  addSavedPrompt: (name: string, content: string) => void;
  removeSavedPrompt: (id: string) => void;
  
  // Debug Log Actions
  addLog: (level: DebugLog['level'], message: string) => void;
  clearLogs: () => void;
  
  // Reset
  resetSettings: () => void;
}

const initialSettings = {
  language: 'en',
  autoConnectServerId: '',
  showLivePreviews: true,
  showBuiltInWorkflows: true,
  expandPromptField: false,
  useInMemoryCache: true,
  disableMediaCache: false,
  enableDebugLogging: false,
  savedPrompts: [],
  debugLogs: [],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialSettings,

      setLanguage: (language) => set({ language }),
      setAutoConnectServerId: (autoConnectServerId) => set({ autoConnectServerId }),
      setShowLivePreviews: (showLivePreviews) => set({ showLivePreviews }),
      setShowBuiltInWorkflows: (showBuiltInWorkflows) => set({ showBuiltInWorkflows }),
      setExpandPromptField: (expandPromptField) => set({ expandPromptField }),
      setUseInMemoryCache: (useInMemoryCache) => set({ useInMemoryCache }),
      setDisableMediaCache: (disableMediaCache) => set({ disableMediaCache }),
      setEnableDebugLogging: (enableDebugLogging) => set({ enableDebugLogging, debugLogs: [] }),

      addSavedPrompt: (name, content) => set((state) => ({
        savedPrompts: [...state.savedPrompts, { id: Math.random().toString(36).substring(7), name, content }]
      })),
      removeSavedPrompt: (id) => set((state) => ({
        savedPrompts: state.savedPrompts.filter((p) => p.id !== id)
      })),

      addLog: (level, message) => set((state) => {
        if (!state.enableDebugLogging) return {};
        const newLog = { timestamp: new Date().toISOString(), level, message };
        // Limit to last 500 logs to prevent memory overflow
        return { debugLogs: [newLog, ...state.debugLogs].slice(0, 500) };
      }),
      clearLogs: () => set({ debugLogs: [] }),

      resetSettings: () => set(initialSettings),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function logDebug(level: DebugLog['level'], message: string) {
  try {
    useSettingsStore.getState().addLog(level, message);
  } catch (e) {
    // Fail-safe
  }
}
