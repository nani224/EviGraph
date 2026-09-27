import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Cpu, ChevronDown } from 'lucide-react';
import { fetchFIRs } from '../../api/client';
import { SectionHeader } from '../../components/shared';
import { clsx } from 'clsx';

export default function FIRIntel() {
  const [firs, setFirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchFIRs().then(d => setFirs(d.firs || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        title="FIR / NLP Intelligence"
        subtitle="Structured entity and relationship extraction from First Information Reports"
      />
      <div className="space-y-3">
        {loading && [...Array(3)].map((_, i) => <div key={i} className="shimmer h-24 rounded-xl" />)}
        {firs.map((fir: any, i: number) => (
          <motion.div key={fir.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass-card">
            <div className="p-5 cursor-pointer" onClick={() => setExpanded(expanded === fir.id ? null : fir.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-accent-400 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{fir.id}</span>
                      <span className="badge badge-cyan text-xs">{fir.type || 'FIR'}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">{fir.text?.slice(0, 120)}...</div>
                  </div>
                </div>
                <ChevronDown className={clsx('w-4 h-4 text-slate-500 flex-shrink-0 transition-transform', expanded === fir.id && 'rotate-180')} />
              </div>

              {/* NLP extraction summary */}
              {fir.extracted && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="badge badge-blue text-xs">{fir.extracted.persons?.length || 0} persons</span>
                  <span className="badge badge-green text-xs">{fir.extracted.phones?.length || 0} phones</span>
                  <span className="badge badge-yellow text-xs">{fir.extracted.vehicles?.length || 0} vehicles</span>
                  <span className="badge badge-cyan text-xs">{fir.extracted.locations?.length || 0} locations</span>
                </div>
              )}
            </div>

            {expanded === fir.id && fir.extracted && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="border-t border-[rgba(34,211,238,0.08)] p-5"
              >
                <div className="section-header">
                  <Cpu className="w-3.5 h-3.5 text-accent-400" /> Extracted Entities
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {['persons', 'phones', 'vehicles', 'locations'].map(key => (
                    fir.extracted[key]?.length > 0 && (
                      <div key={key}>
                        <div className="text-slate-500 capitalize mb-1">{key}</div>
                        {fir.extracted[key].map((v: string, j: number) => (
                          <div key={j} className="text-slate-300 font-mono">{v}</div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Full text: <span className="text-slate-400">{fir.text}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
        {firs.length === 0 && !loading && (
          <div className="glass-card p-12 text-center text-sm text-slate-500">
            No FIRs loaded. Upload FIR documents via Data Sources to enable NLP extraction.
          </div>
        )}
      </div>
    </div>
  );
}
