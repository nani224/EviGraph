import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, ChevronDown, Activity, Wifi, Shield, X, FolderPlus, Eye, Mic, MicOff, Database, LogOut, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { searchEntities, fetchCases } from '../../api/client';
import NewInvestigationModal from '../shared/NewInvestigationModal';
import ManualObservationModal from '../shared/ManualObservationModal';
import DatasetEntryModal from '../modals/DatasetEntryModal';
import { clsx } from 'clsx';

export default function TopBar() {
  const { searchQuery, setSearchQuery, activeCase, setActiveCase, notifications, clearNotification, dataMode, setDataMode } = useAppStore();
  const { user, logout } = useAuthStore();
  const [casesList, setCasesList] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCases, setShowCases] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date());

  // Modals state
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const navigate = useNavigate();

  // Load cases from backend API
  const refreshCases = () => {
    fetchCases().then(data => {
      const list = (data.cases || []).map((c: any) => ({
        id: c.id,
        label: `${c.case_number} • ${c.title}`,
        color: c.priority === 'high' || c.priority === 'critical' ? 'text-accent-300' : 'text-slate-300',
        raw: c
      }));
      setCasesList(list);
      if (data.cases && data.cases.length > 0) {
        if (!activeCase || !data.cases.some((c: any) => c.id === activeCase.id)) {
          setActiveCase(data.cases[0]);
        }
      }
    }).catch(console.error);
  };

  useEffect(() => {
    refreshCases();
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await searchEntities(searchQuery);
        setSearchResults(data.results?.slice(0, 6) || []);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Voice recognition init
  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice speech recognition is not supported in this browser. Please type your query in the AI Assistant.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        navigate(`/assistant?q=${encodeURIComponent(transcript)}&voice=true`);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const typeColors: Record<string, string> = {
    person: 'text-blue-400', phone: 'text-emerald-400',
    vehicle: 'text-yellow-400', account: 'text-purple-400',
    location: 'text-cyan-400',
  };

  return (
    <>
      <header className="h-16 bg-navy-900/95 backdrop-blur-sm border-b border-[rgba(34,211,238,0.08)] flex items-center justify-between gap-2 px-3 xl:px-4 flex-shrink-0 z-20 relative w-full overflow-visible">
        {/* Left Section: Status, Search, Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink">
          {/* System status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 flex-shrink-0">
            <Wifi className="w-3 h-3" />
            <span>LIVE</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Global Search Input */}
          <div className="w-36 md:w-48 lg:w-60 relative flex-shrink">
            <div className={clsx(
              'flex items-center gap-2 field-input transition-all py-1 px-2.5',
              searchFocused && 'border-accent-500/50 ring-1 ring-accent-500/30'
            )}>
              <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Search..."
                className="bg-transparent outline-none text-xs text-slate-200 placeholder-slate-500 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Search results dropdown */}
            <AnimatePresence>
              {searchFocused && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full mt-1 left-0 right-0 glass-card py-1 z-50 shadow-2xl"
                >
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onMouseDown={() => { navigate(`/search?q=${encodeURIComponent(r.label)}`); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left text-xs"
                    >
                      <span className={clsx('font-mono uppercase w-16 flex-shrink-0 text-[10px]', typeColors[r.type] || 'text-slate-400')}>
                        {r.type}
                      </span>
                      <span className="text-slate-300 truncate">{r.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Voice Query Button */}
          <button
            onClick={handleToggleVoice}
            className={clsx(
              'flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all flex-shrink-0',
              isListening
                ? 'bg-red-500 text-white border-red-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            )}
            title="Speak natural language investigation query"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-accent-400" />}
            <span className="hidden 2xl:inline">{isListening ? 'Listening...' : 'Voice'}</span>
          </button>

          {/* Action: New Investigation */}
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="btn-primary flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold flex-shrink-0"
            title="New Investigation"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">New Investigation</span>
          </button>

          {/* Action: Add Observation */}
          <button
            onClick={() => setShowObservationModal(true)}
            className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-orange-300 border-orange-500/30 hover:bg-orange-500/10 flex-shrink-0"
            title="Add Observation"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Observation</span>
          </button>

          {/* Action: Add Dataset Entry */}
          <button
            onClick={() => setShowDatasetModal(true)}
            className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 font-semibold flex-shrink-0"
            title="Add new entry into any dataset"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden 2xl:inline">+ Entry</span>
          </button>
        </div>

        {/* Right Section: Mode, Case, Profile, Logout */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {/* DATA MODE TOGGLE */}
          <div className="hidden sm:flex items-center gap-1 bg-navy-950/80 border border-[rgba(34,211,238,0.15)] rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => setDataMode('synthetic_investigation')}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                dataMode === 'synthetic_investigation'
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              )}
              title="Complete multi-source criminal network investigation universe."
            >
              <Shield className="w-3 h-3 text-accent-400" />
              <span className="hidden lg:inline">Synthetic</span>
            </button>

            <button
              onClick={() => setDataMode('public_research')}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                dataMode === 'public_research'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              )}
              title="Legitimate public research datasets for module-by-module validation."
            >
              <Activity className="w-3 h-3 text-blue-400" />
              <span className="hidden lg:inline">Research</span>
            </button>
          </div>

          {/* Case selector */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowCases(!showCases)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(34,211,238,0.15)] bg-navy-800/50 hover:bg-navy-700 text-xs text-slate-300 transition-all"
            >
              <Shield className="w-3 h-3 text-accent-400 flex-shrink-0" />
              <span className="max-w-[100px] truncate">{activeCase?.case_number || 'Select Case'}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
            <AnimatePresence>
              {showCases && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full right-0 mt-1 glass-card py-1 w-64 z-50 shadow-2xl divide-y divide-white/5"
                >
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowNewCaseModal(true);
                        setShowCases(false);
                      }}
                      className="w-full btn-primary text-xs py-1 flex items-center justify-center gap-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5" /> + New Investigation
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {casesList.length === 0 ? (
                      <div className="p-2 text-center text-xs text-slate-500">No cases found</div>
                    ) : (
                      casesList.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setActiveCase(c.raw); setShowCases(false); }}
                          className={clsx('w-full text-left px-3 py-2 hover:bg-white/5 text-xs transition-colors rounded', c.color)}
                        >
                          {c.label}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin Panel Quick Access */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all flex-shrink-0"
              title="Open Administrative Command Center"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Admin</span>
            </button>
          )}

          {/* Authenticated User Profile & Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
              title="Account Menu"
            >
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0',
                user?.role === 'ADMIN'
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-accent-gradient text-white shadow-[0_0_10px_rgba(34,211,238,0.3)]'
              )}>
                {user?.full_name ? user.full_name[0].toUpperCase() : (user?.username?.[0]?.toUpperCase() || 'U')}
              </div>
              <div className="hidden xl:block text-left pr-1">
                <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[110px]">
                  {user?.full_name || user?.username || 'Investigator'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={clsx(
                    'text-[9px] font-mono uppercase px-1 py-0.2 rounded border font-semibold tracking-wider',
                    user?.role === 'ADMIN'
                      ? 'text-purple-300 bg-purple-500/10 border-purple-500/30'
                      : 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30'
                  )}>
                    {user?.role || 'INVESTIGATOR'}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden xl:block" />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full right-0 mt-1 glass-card py-2 w-56 z-50 shadow-2xl divide-y divide-white/5"
                >
                  <div className="px-3 py-2">
                    <div className="text-xs font-bold text-white truncate">
                      {user?.full_name || user?.username}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user?.email || 'officer@evigraph.gov.in'}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={clsx(
                        'text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold',
                        user?.role === 'ADMIN'
                          ? 'text-purple-300 bg-purple-500/15 border-purple-500/30'
                          : 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'
                      )}>
                        {user?.role}
                      </span>
                      {user?.badge_number && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {user.badge_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/admin');
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10 flex items-center gap-2"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Admin Control Center
                      </button>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={async () => {
                        setShowProfileMenu(false);
                        await logout();
                        navigate('/login');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DEDICATED PROMINENT LOGOUT BUTTON */}
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white border border-red-500/40 text-xs font-semibold transition-all shadow-sm flex-shrink-0"
            title="Sign Out of EviGraph"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Modals */}
      <NewInvestigationModal
        isOpen={showNewCaseModal}
        onClose={() => setShowNewCaseModal(false)}
        onCreated={() => {
          refreshCases();
          navigate('/cases');
        }}
      />

      <ManualObservationModal
        isOpen={showObservationModal}
        onClose={() => setShowObservationModal(false)}
        caseId={activeCase?.id}
      />

      <DatasetEntryModal
        isOpen={showDatasetModal}
        onClose={() => setShowDatasetModal(false)}
      />
    </>
  );
}
