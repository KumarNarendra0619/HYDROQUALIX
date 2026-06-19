import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '../utils/cn';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface AiAssistantProps {
  contextData?: any;
  isOpen: boolean;
  onClose: () => void;
}

export function AiAssistant({ contextData, isOpen, onClose }: AiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    const newHistory: ChatMessage[] = [
      ...messages,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    setMessages(newHistory);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          message: userMessage,
          // Only send context data on the first message to save tokens if we have a lot of data, 
          // but since WQI scores might update, let's send current contextData
          contextData: contextData
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to connect to AI Assistant.';
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
        } else {
            const textResponse = await response.text();
            // Fallback for HTML error pages
            if (textResponse.toLowerCase().includes("<!doctype")) {
                 errorMessage = "An error occurred with the AI assistant. Please try again.";
            } else {
                 errorMessage = textResponse || errorMessage;
            }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { role: 'model', parts: [{ text: data.text }] }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Basic markdown-like rendering for the final output
  const renderMessageContent = (text: string) => {
    // This is a simple renderer. In a real app we might use react-markdown.
    // For now we just split by double newline for paragraphs, handle bolding (**) and lists (-).
    const blocks = text.split('\n\n');
    return (
      <div className="space-y-3 text-sm">
        {blocks.map((block, i) => {
          if (block.startsWith('## ') || block.startsWith('# ')) {
            return <h3 key={i} className="font-bold text-gray-900 border-b pb-1 mt-2">{block.replace(/^#+\s/, '')}</h3>;
          }
          if (block.includes('\n- ') || block.startsWith('- ')) {
            const lines = block.split('\n');
            if (lines[0] && !lines[0].startsWith('- ')) {
               return (
                  <div key={i}>
                    <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lines[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) }}></p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {lines.slice(1).map((l, j) => <li key={j} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(l.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) }} />)}
                    </ul>
                  </div>
               );
            }
            return (
              <ul key={i} className="list-disc pl-5 space-y-1">
                {lines.map((l, j) => <li key={j} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(l.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')) }} />)}
              </ul>
            )
          }

          // Handle inline bolding
          const html = block.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <p key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-[400px] h-[600px] max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex-col flex">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0a485c] to-[#04667a] border-b border-cyan-800/40 text-white p-4 flex items-center justify-between shadow-md z-10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg border border-white/20">
                <Bot className="w-5 h-5 text-cyan-200" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-cyan-50">Water Intelligence AI</h3>
                <p className="text-[10px] text-cyan-200/80">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-md transition-colors text-cyan-100 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-70">
                <div className="w-16 h-16 bg-cyan-100/50 text-cyan-700 rounded-2xl flex items-center justify-center mb-4 transform -rotate-6 shadow-sm border border-cyan-200">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="font-medium text-slate-800 mb-1">Water Quality Expert</h4>
                <p className="text-sm text-slate-500">Ask me anything about the current WQI analysis, site comparisons, or water parameters.</p>
                
                <div className="mt-6 flex flex-col gap-2 w-full">
                   <button onClick={() => setInput("Can you summarize the current water quality across all sites?")} className="text-xs bg-white border border-slate-200 p-2 rounded-lg text-slate-600 hover:bg-cyan-50 hover:border-cyan-200 text-left transition-colors shadow-sm">
                     "Summarize the current water quality across all sites"
                   </button>
                   <button onClick={() => setInput("Which parameters are primarily affecting the critical sites?")} className="text-xs bg-white border border-slate-200 p-2 rounded-lg text-slate-600 hover:bg-cyan-50 hover:border-cyan-200 text-left transition-colors shadow-sm">
                     "Which parameters are primarily affecting the critical sites?"
                   </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm",
                  msg.role === 'user'
                    ? "bg-[#0a485c] text-white ml-auto rounded-br-sm border border-[#04667a]"
                    : "bg-white border border-slate-200 text-slate-800 mr-auto rounded-tl-sm"
                )}
              >
                 {msg.role === 'user' ? (
                   <p className="text-sm whitespace-pre-wrap">{msg.parts[0].text}</p>
                 ) : (
                   renderMessageContent(msg.parts[0].text)
                 )}
              </div>
            ))}
            
            {isLoading && (
              <div className="bg-white border border-slate-200 text-slate-800 mr-auto rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0a485c]" />
                <span className="text-xs text-slate-500 font-medium">Analyzing environmental data...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 mr-auto rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-start gap-2 max-w-[85%]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs">{error}</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about water quality..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a485c]/50 focus:border-[#0a485c] transition-all resize-none overflow-hidden text-slate-800"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 rounded-lg text-[#0a485c] hover:bg-cyan-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
