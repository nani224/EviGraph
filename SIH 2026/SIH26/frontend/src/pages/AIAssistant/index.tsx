import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Mic, MicOff, Shield, ChevronRight, Loader2, Bot, User, Sparkles, Volume2, GitBranch, AlertTriangle, ArrowRight } from 'lucide-react';
import { sendChat, fetchAISuggestions } from '../../api/client';
import { ConfidenceBar, SectionHeader } from '../../components/shared';
import { VoicePlayerControl } from '../../components/voice/VoicePlayerControl';
import { voiceService } from '../../services/voiceService';
import type { ChatMessage } from '../../types';
import { clsx } from 'clsx';

function MessageBubble({ msg, onQuickAction }: { msg: ChatMessage; onQuickAction?: (qa: string) => void }) {
  const isAssistant = msg.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex gap-3', isAssistant ? 'items-start' : 'items-start flex-row-reverse')}
    >
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md',
        isAssistant ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40' : 'bg-slate-700 text-slate-200 border border-slate-600'
      )}>
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Content Box */}
      <div className={clsx('max-w-[85%] space-y-2', !isAssistant && 'items-end flex flex-col')}>
        <div className={clsx(
          'px-5 py-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-lg',
          isAssistant
            ? 'bg-navy-800/90 border border-white/10 text-slate-200 rounded-tl-sm'
            : 'bg-accent-gradient text-white font-medium rounded-tr-sm shadow-[0_0_15px_rgba(34,211,238,0.2)]'
        )}>
          {msg.content}
        </div>

        {/* AI Metadata & Evidence Badges */}
        {isAssistant && (
          <div className="px-1 space-y-2 text-xs w-full">
            <div className="glass-card p-3 space-y-3 border border-white/5">
              {msg.confidence !== undefined && (
                <ConfidenceBar value={msg.confidence} label="Finding Confidence Score" size="sm" />
              )}

              {msg.evidence_ids && msg.evidence_ids.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Evidence Trace:</span>
                  {msg.evidence_ids.map(id => (
                    <span key={id} className="badge badge-cyan text-[10px] font-mono">{id}</span>
                  ))}
                </div>
              )}

              {msg.caveat && (
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>{msg.caveat}</span>
                </div>
              )}

              {msg.quick_actions && msg.quick_actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.quick_actions.map(qa => (
                    <button
                      key={qa}
                      onClick={() => onQuickAction?.(qa)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-accent-500/40 text-accent-300 hover:bg-accent-500/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>{qa.replace(/_/g, ' ').toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* VOICE QUERY → TEXT ANSWER + VOICE ANSWER CONTROLS */}
              <VoicePlayerControl
                messageId={msg.id}
                rawText={msg.content}
                defaultMode={msg.defaultVoice ? 'voice' : 'text'}
              />
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-500 px-1">
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

export default function AIAssistant() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to the E-Crime Graph AI Intelligence Assistant. 

I can help you analyze the knowledge graph, explain multi-hop relationships, investigate anomalous spikes, trace evidence provenance, and summarize suspects.

Every answer is grounded in actual database and graph records with zero hallucination.`,
      timestamp: new Date().toISOString(),
      confidence: 1.0,
      evidence_ids: ['graph-65-nodes', 'ledger-616-edges'],
      caveat: 'AI findings are investigative leads only and require investigator verification.',
      quick_actions: ['find_connection', 'view_anomalies']
    }
  ]);

  const [suggestions, setSuggestions] = useState<string[]>([
    'What is the connection between Ravi Kumar and Arun Sharma?',
    'Who is Suresh Babu and who did he communicate with?',
    'What happened along the Begumpet corridor on 14 August 2026?',
    'Why was Ravi Kumar flagged for unusual activity?',
    'What evidence links Vehicle TS09AB1234 to the shell account?'
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-send query if passed in URL params (e.g. from Voice Query in TopBar)
  useEffect(() => {
    const q = searchParams.get('q');
    const isVoice = searchParams.get('voice') === 'true';
    if (q && q.trim()) {
      sendMessage(q.trim(), isVoice);
    }
  }, [searchParams]);

  // Clean up speech synthesis on component unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  useEffect(() => {
    fetchAISuggestions().then(res => {
      if (res?.suggestions?.length) {
        setSuggestions(res.suggestions);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string, isVoiceInitiated = false) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await sendChat(msg, sessionId);
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: resp?.answer || 'I could not retrieve an evidence-backed answer for that query.',
        timestamp: new Date().toISOString(),
        confidence: resp?.confidence,
        evidence_ids: resp?.evidence_ids,
        quick_actions: resp?.quick_actions,
        caveat: resp?.caveat,
        defaultVoice: isVoiceInitiated,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Unable to reach the investigation engine. Please ensure the backend is active at http://localhost:8000.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice Speech Recognition is not supported by your current browser. Please use keyboard input or Chrome/Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          sendMessage(transcript, true);
        }
      };
      recognition.onerror = (e: any) => {
        console.error('Speech error', e);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleQuickAction = (qa: string) => {
    if (qa === 'find_connection' || qa === 'view_path' || qa === 'open_discovery') {
      navigate('/');
    } else if (qa === 'view_anomalies' || qa === 'show_anomalies') {
      navigate('/anomalies');
    } else if (qa === 'show_map' || qa === 'open_location_page') {
      navigate('/locations');
    } else if (qa === 'open_timeline') {
      navigate('/timeline');
    } else if (qa === 'open_evidence' || qa === 'inspect_records') {
      navigate('/evidence');
    } else {
      sendMessage(qa.replace(/_/g, ' '));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Evidence-Backed AI Assistant & Voice Interface
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Query entities, discover paths, explain evidence, and explore timeline patterns
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Graph Knowledge Engine Ready</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-5">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onQuickAction={handleQuickAction} />
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-500/20 border border-accent-500/40 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-400 animate-spin" />
            </div>
            <div className="bg-navy-800 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-lg">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-300">Searching cross-source knowledge graph & records...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="border-t border-white/10 pt-3 flex-shrink-0 space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent-400" /> Suggested Investigation Questions:
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((qa, i) => (
            <button
              key={i}
              onClick={() => sendMessage(qa)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-accent-500/40 hover:bg-accent-500/10 transition-all whitespace-nowrap"
            >
              {qa}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar with Integrated Microphone */}
      <div className="glass-card p-3 border border-white/15 shadow-2xl flex-shrink-0">
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex items-center gap-2 field-input px-3 py-2 rounded-xl">
            <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={isListening ? 'Listening to voice query...' : 'Ask about suspect connections, vehicles, CDRs, anomalies, or timelines...'}
              className="bg-transparent outline-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 w-full"
            />
          </div>

          {/* Voice Microphone Button */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={clsx(
              'p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-md',
              isListening
                ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-cyan-400'
            )}
            title={isListening ? 'Click to stop listening' : 'Click to speak question'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-accent-400" />}
            <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary px-5 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-500 mt-2 text-center">
          AI responses are investigative leads backed by graph evidence · Never substitutes for official investigative review.
        </div>
      </div>
    </div>
  );
}
