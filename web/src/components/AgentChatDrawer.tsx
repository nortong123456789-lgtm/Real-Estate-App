'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Loader2, Sparkles, ChevronDown, CheckCircle2, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  toolOutput?: Record<string, any>;
  timestamp: string;
}

interface AgentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentChatDrawer({ isOpen, onClose }: AgentChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'agent',
      text: 'Hello! I am your ApnaGhar Real Estate Agent Assistant. How can I help you manage listings, search locations, or process media dumps today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat feed
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle Visual Viewport API for Mobile Keyboards on Android/iOS
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport && isOpen) {
        const drawer = document.getElementById('agent-chat-drawer');
        if (drawer) {
          drawer.style.height = `${viewport.height}px`;
        }
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;

    // Trigger lightweight haptic vibration feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch (e) {
        // ignore
      }
    }

    const userMessageText = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Simulate Agent Tool Execution Pipeline
    setTimeout(() => {
      let agentReply = "I have processed your query for " + userMessageText + ".";
      let toolData: Record<string, any> | undefined = undefined;

      if (userMessageText.toLowerCase().includes('draft') || userMessageText.toLowerCase().includes('ingest')) {
        agentReply = "I searched the pending drafts queue. Found active media dumps ready for geocoding and completion.";
        toolData = { tool: "fetch_drafts", total_pending: 2, status: "healthy" };
      } else if (userMessageText.toLowerCase().includes('map') || userMessageText.toLowerCase().includes('location')) {
        agentReply = "Auto-centered vector map over searched Bengaluru landmark.";
        toolData = { tool: "nominatim_geocode", query: userMessageText, lat: 12.9716, lng: 77.5946 };
      } else {
        agentReply = "ApnaGhar Real Estate Pipeline is active and synced with Telegram JSON storage.";
        toolData = { tool: "health_check", database: "Telegram Bot API (Zero External DB)", status: "online" };
      }

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: agentReply,
        toolOutput: toolData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, agentMsg]);
      setIsProcessing(false);

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([30, 50, 30]);
        } catch (e) {
          // ignore
        }
      }
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-darkNav/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
      <div
        id="agent-chat-drawer"
        className="w-full sm:max-w-md bg-white h-full flex flex-col shadow-2xl safe-area-pt safe-area-pb"
      >
        {/* Header Bar - Min 44px Touch Targets */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white leading-tight">ApnaGhar Agent UI</h3>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Streaming Agent</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors touch-target"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversational Feed - Auto Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Bubble (Max Width 85% of Viewport) */}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm font-medium shadow-2xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-brand-500 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                }`}
              >
                <p>{msg.text}</p>

                {/* Tool Execution Accordion (<details><summary>) */}
                {msg.toolOutput && (
                  <details className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <summary className="font-extrabold text-brand-600 cursor-pointer hover:underline flex items-center gap-1 select-none">
                      <Sparkles className="w-3 h-3 text-brand-500" />
                      <span>Executed Tool: {msg.toolOutput.tool}</span>
                    </summary>
                    <pre className="mt-1.5 p-2 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[10px] font-mono leading-tight">
                      {JSON.stringify(msg.toolOutput, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {/* Skeleton Loader for Active Tool Execution */}
          {isProcessing && (
            <div className="flex flex-col items-start">
              <div className="max-w-[85%] bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-2xs flex items-center gap-2 text-xs font-bold text-slate-600">
                <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                <span>Agent executing backend tool...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sticky Input Area with 44px Hit Targets */}
        <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask agent assistant..."
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="w-11 h-11 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition-all shadow-md shadow-brand-500/25 touch-target flex-shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
