import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const STORAGE_KEY = 'aurum-ai-store'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Config ──────────────────────────────────────────
      model: 'llama-3.3-70b-versatile',
      sidebarOpen: true,

      // ── Conversations ────────────────────────────────────
      conversations: [],          // [{ id, title, messages, createdAt, updatedAt, pinned }]
      activeConversationId: null,

      // ── Actions: Config ──────────────────────────────────
      setModel: (model) => set({ model }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // ── Actions: Conversations ───────────────────────────
      newConversation: () => {
        const id = crypto.randomUUID()
        const conv = {
          id,
          title: 'New Conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pinned: false,
          mode: 'chat'
        }
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeConversationId: id
        }))
        return id
      },

      deleteConversation: (id) =>
        set((s) => {
          const convs = s.conversations.filter((c) => c.id !== id)
          const activeId = s.activeConversationId === id
            ? (convs[0]?.id || null)
            : s.activeConversationId
          return { conversations: convs, activeConversationId: activeId }
        }),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      pinConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c
          )
        })),

      renameConversation: (id, title) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, title } : c
          )
        })),

      addMessage: (conversationId, message) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c
            const msgs = [...c.messages, { ...message, id: crypto.randomUUID(), ts: Date.now() }]
            const title = c.title === 'New Conversation' && message.role === 'user'
              ? message.content.slice(0, 50).trim()
              : c.title
            return { ...c, messages: msgs, title, updatedAt: Date.now() }
          })
        })),

      updateLastAssistantMessage: (conversationId, content) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c
            const msgs = [...c.messages]
            const lastIdx = msgs.map((m) => m.role).lastIndexOf('assistant')
            if (lastIdx !== -1) msgs[lastIdx] = { ...msgs[lastIdx], content }
            return { ...c, messages: msgs, updatedAt: Date.now() }
          })
        })),

      deleteMessage: (conversationId, messageId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== conversationId ? c
              : { ...c, messages: c.messages.filter((m) => m.id !== messageId) }
          )
        })),

      clearHistory: () => set({ conversations: [], activeConversationId: null }),

      // ── Getters ──────────────────────────────────────────
      getActiveConversation: () => {
        const s = get()
        return s.conversations.find((c) => c.id === s.activeConversationId) || null
      }
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        conversations: s.conversations,
        activeConversationId: s.activeConversationId,
        model: s.model
      })
    }
  )
)
