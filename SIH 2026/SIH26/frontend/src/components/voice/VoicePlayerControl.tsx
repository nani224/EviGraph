import React, { useEffect, useState } from 'react';
import {
  Volume2, VolumeX, Pause, Play, Square, RotateCcw,
  Settings2, AlertCircle, Sparkles, Check
} from 'lucide-react';
import { voiceService, type PlaybackState, type VoiceSettings } from '../../services/voiceService';
import { clsx } from 'clsx';

interface VoicePlayerControlProps {
  /** Unique message identifier */
  messageId: string;
  /** Exact AI response text to read aloud */
  rawText: string;
  /** Whether the message is currently in Text or Voice mode */
  defaultMode?: 'text' | 'voice';
  /** Optional callback when mode toggles */
  onModeChange?: (mode: 'text' | 'voice') => void;
  /** Custom extra styling */
  className?: string;
}

export const VoicePlayerControl: React.FC<VoicePlayerControlProps> = ({
  messageId,
  rawText,
  defaultMode = 'text',
  onModeChange,
  className
}) => {
  const [answerMode, setAnswerMode] = useState<'text' | 'voice'>(defaultMode);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [activeMessageId, setActiveMessageId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<VoiceSettings>(() => voiceService.getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Is this specific message actively controlling the speech synthesis?
  const isCurrentTarget = activeMessageId === messageId;
  const isSpeaking = isCurrentTarget && playbackState === 'speaking';
  const isPaused = isCurrentTarget && playbackState === 'paused';
  const isFinished = isCurrentTarget && playbackState === 'finished';

  useEffect(() => {
    // Subscribe to global speech state
    const unsubscribeState = voiceService.subscribeState((state, msgId) => {
      setPlaybackState(state);
      setActiveMessageId(msgId || '');
    });

    const unsubscribeError = voiceService.subscribeError((err) => {
      if (activeMessageId === messageId || !activeMessageId) {
        setErrorMessage(err);
      }
    });

    setVoices(voiceService.getVoices());

    return () => {
      unsubscribeState();
      unsubscribeError();
    };
  }, [activeMessageId, messageId]);

  // Clean up if component unmounts while speaking
  useEffect(() => {
    return () => {
      if (activeMessageId === messageId && voiceService.getState() === 'speaking') {
        voiceService.stop();
      }
    };
  }, [activeMessageId, messageId]);

  const handleSelectMode = (mode: 'text' | 'voice') => {
    setAnswerMode(mode);
    onModeChange?.(mode);

    if (mode === 'voice') {
      setErrorMessage(null);
      voiceService.speak(rawText, messageId);
    } else {
      // Switching to text: if this message was speaking, stop audio
      if (isCurrentTarget) {
        voiceService.stop();
      }
    }
  };

  const handlePlayOrResume = () => {
    setErrorMessage(null);
    if (isPaused) {
      voiceService.resume();
    } else {
      setAnswerMode('voice');
      voiceService.speak(rawText, messageId);
    }
  };

  const handlePause = () => {
    voiceService.pause();
  };

  const handleStop = () => {
    voiceService.stop();
  };

  const handleReplay = () => {
    setErrorMessage(null);
    setAnswerMode('voice');
    voiceService.speak(rawText, messageId);
  };

  const handleSpeedChange = (rate: number) => {
    const updated = { ...settings, rate };
    setSettings(updated);
    voiceService.updateSettings(updated);
  };

  const handleVoiceChange = (voiceURI: string) => {
    const updated = { ...settings, voiceURI };
    setSettings(updated);
    voiceService.updateSettings(updated);
  };

  return (
    <div className={clsx('space-y-2 pt-2 border-t border-white/10 text-xs', className)}>
      {/* ─── Mode Selector & Voice Controls Bar ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-black/30 p-2 rounded-xl border border-white/5">
        {/* Toggle Option: [ Text ✓ ] [ 🔊 Listen ] */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1 select-none">
            Answer Mode:
          </span>

          {/* Text Answer Button */}
          <button
            type="button"
            onClick={() => handleSelectMode('text')}
            className={clsx(
              'px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-xs',
              answerMode === 'text' && !isSpeaking && !isPaused
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent'
            )}
            title="View evidence-backed text response"
          >
            <span>Text Answer</span>
            {answerMode === 'text' && !isSpeaking && !isPaused && (
              <Check className="w-3 h-3 text-cyan-400" />
            )}
          </button>

          {/* Voice Answer / Listen Button */}
          <button
            type="button"
            onClick={() => handlePlayOrResume()}
            className={clsx(
              'px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-xs',
              isSpeaking || isPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-500/10'
                : answerMode === 'voice'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300 bg-white/5 hover:bg-white/10 border border-transparent'
            )}
            title="Listen to investigation response aloud"
          >
            <Volume2 className={clsx('w-3.5 h-3.5', (isSpeaking || isPaused) ? 'text-amber-400' : 'text-slate-400')} />
            <span>{isSpeaking ? 'Listening...' : 'Voice Answer'}</span>
          </button>
        </div>

        {/* Compact Voice Player Controls (Active State) */}
        <div className="flex items-center gap-1.5">
          {isSpeaking && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {/* Subtle animated speech waveform */}
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-1 bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-2.5" />
                <span className="w-1 bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-3.5" />
                <span className="w-1 bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-2" />
              </div>
              <span className="text-[11px] font-medium font-mono text-amber-300">Speaking...</span>

              <button
                type="button"
                onClick={handlePause}
                className="p-1 rounded hover:bg-amber-500/20 text-amber-300 transition-colors"
                title="Pause Speech"
              >
                <Pause className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors"
                title="Stop Speech"
              >
                <Square className="w-3 h-3" />
              </button>
            </div>
          )}

          {isPaused && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
              <Pause className="w-3 h-3 text-yellow-400" />
              <span className="text-[11px] font-medium font-mono">Paused</span>

              <button
                type="button"
                onClick={handlePlayOrResume}
                className="p-1 rounded hover:bg-yellow-500/20 text-yellow-300 transition-colors flex items-center gap-1 text-[10px]"
                title="Resume Speech"
              >
                <Play className="w-3 h-3" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors"
                title="Stop Speech"
              >
                <Square className="w-3 h-3" />
              </button>
            </div>
          )}

          {isFinished && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-white/10 text-slate-300">
              <span className="text-[11px] text-slate-400">Speech Completed</span>
              <button
                type="button"
                onClick={handleReplay}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition-colors border border-cyan-500/30"
                title="Replay Spoken Response"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Replay</span>
              </button>
            </div>
          )}

          {/* Settings Popover Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={clsx(
              'p-1.5 rounded-lg border transition-colors',
              showSettings
                ? 'bg-white/15 text-white border-white/30'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
            )}
            title="Voice Playback Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Unobtrusive Secondary Voice Settings Popover ─────── */}
      {showSettings && (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-white/15 shadow-xl space-y-2.5 animate-fade-in text-[11px]">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-white/10 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-3 h-3 text-cyan-400" />
              Speech Accessibility Settings
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Web Speech API</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Speed Rate Control */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Speaking Rate:</span>
                <span className="font-mono text-cyan-300 font-bold">{settings.rate}x</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0.8, 1.0, 1.25, 1.5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSpeedChange(r)}
                    className={clsx(
                      'flex-1 py-1 rounded text-center font-mono text-[10px] border transition-all',
                      settings.rate === r
                        ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50 font-bold'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                    )}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Model Selector */}
            {voices.length > 0 && (
              <div className="space-y-1">
                <span className="text-slate-400">Synthesis Voice:</span>
                <select
                  value={settings.voiceURI || ''}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-cyan-500/50 font-sans"
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI} className="bg-slate-900 text-white">
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Non-Blocking Error Banner ──────────────────────────── */}
      {errorMessage && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
