/**
 * AI Supply Chain Analyst Copilot Drawer
 *
 * A floating chat interface that sits on top of all existing platform pages.
 * Uses deterministic backend intent routing — no external LLMs.
 *
 * Features:
 * - Floating brain/AI button (bottom-right)
 * - Sliding drawer with glass-morphism design
 * - Conversation history with markdown-style rendering
 * - Suggested prompts from backend
 * - Loading states, empty states, error handling
 * - Mobile responsive
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { copilotApi, type CopilotMessage, type StarterPrompt } from '@/services/copilotApi';
import { useAppStore } from '@/stores/appStore';

// ── Types ──────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  suggested_followups?: string[];
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}

// ── Markdown-lite renderer ─────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-ds-text-primary mb-2 mt-3">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg font-bold text-ds-text-primary mb-2 mt-3">
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-ds-text-secondary my-0.5 leading-relaxed">
          <span className="text-ds-blue mt-0.5 flex-shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-ds-text-secondary leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }
  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="text-ds-text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="bg-ds-surface-sunken text-ds-blue-text text-xs px-1.5 py-0.5 rounded font-mono border border-ds-hairline">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ── Intent badge ───────────────────────────────────────────────────

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  executive_summary: { label: 'Executive Summary', color: 'bg-indigo-500/20 text-indigo-300' },
  forecast: { label: 'Forecast', color: 'bg-blue-500/20 text-blue-300' },
  forecast_explain: { label: 'SHAP Analysis', color: 'bg-purple-500/20 text-purple-300' },
  anomaly: { label: 'Anomalies', color: 'bg-orange-500/20 text-orange-300' },
  alert: { label: 'Alerts', color: 'bg-red-500/20 text-red-300' },
  inventory: { label: 'Inventory', color: 'bg-emerald-500/20 text-emerald-300' },
  scenario: { label: 'Scenarios', color: 'bg-cyan-500/20 text-cyan-300' },
  unknown: { label: 'General', color: 'bg-surface-500/20 text-surface-300' },
};

// ── Loading dots ────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

// ── Message bubble ──────────────────────────────────────────────────

function MessageBubble({
  message,
  onFollowup,
}: {
  message: ChatMessage;
  onFollowup: (text: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-ds-blue-surface border border-ds-hairline flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <span className="text-xs">🧠</span>
        </div>
      )}

      <div className={`max-w-[90%] ${isUser ? 'max-w-[75%]' : 'w-full'}`}>
        {/* Intent badge */}
        {!isUser && message.intent && message.intent !== 'unknown' && (
          <div className="mb-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-ds-blue-surface text-ds-blue-on-surface border border-ds-hairline">
              {INTENT_LABELS[message.intent]?.label || message.intent}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-ds-blue-action text-white rounded-tr-sm ml-auto shadow-sm'
              : message.isError
              ? 'bg-ds-red-surface border border-ds-red/30 text-ds-red-text rounded-tl-sm shadow-sm'
              : 'bg-ds-surface border border-ds-hairline text-ds-text-primary rounded-tl-sm shadow-sm'
          }`}
        >
          {message.isLoading ? (
            <LoadingDots />
          ) : isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-sm space-y-0 text-ds-text-primary">
              {renderMarkdown(message.content)}
            </div>
          )}
        </div>

        {/* Suggested follow-ups */}
        {!isUser && !message.isLoading && message.suggested_followups && message.suggested_followups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.suggested_followups.slice(0, 3).map((followup, idx) => (
              <button
                key={idx}
                onClick={() => onFollowup(followup)}
                className="text-xs px-3 py-1 rounded-full border border-ds-hairline bg-ds-surface text-ds-text-secondary hover:bg-ds-blue-surface hover:text-ds-blue-on-surface transition-all duration-150 shadow-sm"
              >
                {followup.length > 45 ? followup.slice(0, 45) + '…' : followup}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs mt-1 text-ds-text-muted ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-ds-ink text-ds-text-inverse flex items-center justify-center flex-shrink-0 ml-2 mt-1">
          <span className="text-xs">👤</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Starter prompt card ─────────────────────────────────────────────

function PromptCard({ prompt, onClick }: { prompt: StarterPrompt; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 w-full text-left p-3 rounded-xl border border-ds-hairline bg-ds-surface-sunken hover:bg-ds-surface hover:border-ds-blue/40 transition-all duration-150 group shadow-sm"
    >
      <span className="text-lg flex-shrink-0">{prompt.icon}</span>
      <div>
        <p className="text-xs font-semibold text-ds-text-primary group-hover:text-ds-blue transition-colors">{prompt.label}</p>
        <p className="text-xs text-ds-text-muted mt-0.5 leading-relaxed">{prompt.prompt}</p>
      </div>
    </button>
  );
}

// ── Main Drawer ─────────────────────────────────────────────────────

export function AICopilotDrawer() {
  const { isAuthenticated } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [starterPrompts, setStarterPrompts] = useState<StarterPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load starter prompts when drawer opens
  useEffect(() => {
    if (isOpen && starterPrompts.length === 0 && !promptsLoading) {
      setPromptsLoading(true);
      copilotApi
        .getPrompts()
        .then((res) => setStarterPrompts(res.prompts))
        .catch(() => {/* silent fail */})
        .finally(() => setPromptsLoading(false));
    }
  }, [isOpen, starterPrompts.length, promptsLoading]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    const loadingMsg: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await copilotApi.chat({ message: trimmed });
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        intent: response.intent,
        suggested_followups: response.suggested_followups,
        timestamp: new Date(),
      };
      // Replace loading message
      setMessages((prev) => [...prev.slice(0, -1), assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          '⚠️ **Connection Error** — Could not reach the analyst service. Please ensure the backend is running and try again.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev.slice(0, -1), errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const clearChat = () => setMessages([]);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <motion.button
        id="ai-copilot-trigger"
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
          bg-ds-blue-action text-white
          shadow-ds-float-2 border border-ds-hairline
          flex items-center justify-center
          hover:bg-ds-blue-strong
          transition-all duration-200
          ${isOpen ? 'hidden' : 'flex'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="AI Supply Chain Analyst"
        aria-label="Open AI Copilot"
      >
        <span className="text-2xl" role="img" aria-label="AI">🧠</span>
      </motion.button>

      {/* ── Backdrop ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-ds-canvas/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ── Drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`
              fixed right-0 top-0 bottom-0 z-50
              w-full sm:w-[420px] lg:w-[460px]
              flex flex-col
              bg-ds-surface backdrop-blur-2xl
              border-l border-ds-hairline
              shadow-ds-float-3
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-ds-hairline flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ds-blue-surface border border-ds-hairline flex items-center justify-center shadow-sm">
                  <span className="text-lg">🧠</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ds-text-primary">AI Supply Chain Analyst</h2>
                  <p className="text-xs text-ds-blue-text font-medium">Powered by Platform Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-xs text-ds-text-muted hover:text-ds-text-primary px-3 py-1 rounded-full border border-ds-hairline hover:bg-ds-surface transition-all"
                    title="Clear conversation"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-ds-text-muted hover:text-ds-text-primary hover:bg-ds-surface transition-all"
                  aria-label="Close AI Copilot"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
              {messages.length === 0 ? (
                /* Empty state with prompts */
                <div className="h-full flex flex-col">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <span className="text-3xl">🧠</span>
                    </div>
                    <h3 className="text-base font-semibold text-ds-text-primary mb-1">Supply Chain Analyst</h3>
                    <p className="text-xs text-ds-text-muted max-w-xs mx-auto leading-relaxed">
                      Ask me about forecasts, anomalies, alerts, inventory health, or scenario simulations.
                      I use your live platform data to provide accurate, real-time insights.
                    </p>
                  </div>

                  {/* Starter prompts */}
                  {promptsLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-ds-text-muted uppercase tracking-wide mb-3">
                        Suggested questions
                      </p>
                      {starterPrompts.map((prompt, idx) => (
                        <PromptCard
                          key={idx}
                          prompt={prompt}
                          onClick={() => sendMessage(prompt.prompt)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Conversation */
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onFollowup={(text) => sendMessage(text)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-ds-hairline px-4 py-4 flex-shrink-0">
              {/* Quick prompts when conversation is active */}
              {messages.length > 0 && starterPrompts.length > 0 && (
                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
                  {starterPrompts.slice(0, 4).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(prompt.prompt)}
                      disabled={isLoading}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-ds-hairline bg-ds-surface text-ds-text-secondary hover:border-ds-blue/40 hover:text-ds-blue-text hover:bg-ds-blue-surface transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      <span>{prompt.icon}</span>
                      <span>{prompt.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  id="copilot-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about forecast, anomalies, inventory…"
                  disabled={isLoading}
                  rows={1}
                  className={`
                    flex-1 resize-none bg-ds-surface-sunken border border-ds-hairline
                    rounded-2xl px-4 py-2.5 text-sm text-ds-text-primary placeholder:text-ds-text-muted
                    focus:outline-none focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20
                    transition-all duration-150 leading-relaxed
                    disabled:opacity-50 disabled:cursor-not-allowed
                    min-h-[42px] max-h-[120px]
                  `}
                  style={{
                    height: Math.min(120, Math.max(42, inputValue.split('\n').length * 24 + 18)) + 'px',
                  }}
                />
                <motion.button
                  id="copilot-send"
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  whileTap={{ scale: 0.92 }}
                  className={`
                    w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
                    transition-all duration-150
                    ${inputValue.trim() && !isLoading
                      ? 'bg-ds-blue-action hover:bg-ds-blue-strong text-white shadow-md'
                      : 'bg-ds-surface-sunken text-ds-text-muted cursor-not-allowed border border-ds-hairline'
                    }
                  `}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </motion.button>
              </div>

              <p className="text-xs text-ds-text-muted mt-2 text-center">
                Responses use live data from your platform • Press Enter to send
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
