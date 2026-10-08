import React from 'react';
import { SahilLogo } from '../components/SahilLogo';
import { ArrowLeft, Clock, FileText, CheckCircle2 } from 'lucide-react';

interface BmrPageProps {
  onNavigate: (route: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry') => void;
}

export const BmrPage: React.FC<BmrPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full text-center space-y-8 my-auto">
        {/* SAHIL Brand */}
        <SahilLogo size="md" showSubtitle={true} onClick={() => onNavigate('home')} />

        {/* BMR Module Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 shadow-xs space-y-6 text-center">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              SEARCH FROM BMR
            </h1>
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-mono text-xs font-bold uppercase rounded-md tracking-wider">
              WORK IN PROGRESS
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            This module is currently under development. Batch Manufacturing Record (BMR) material reconciliation and batch issuance mapping will be available in Version 2.
          </p>

          <div className="pt-4 border-t border-slate-100 text-left space-y-2.5 text-xs text-slate-500">
            <p className="font-semibold text-slate-700 uppercase tracking-wider font-mono">
              Planned Capabilities:
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Multi-material BMR batch bill-of-materials ingestion</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Automated cross-checking against master QC release logs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Line clearance & batch dispensing verification</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to QC Search</span>
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400">
        SAHIL QC NUMBER SEARCH ENGINE • Version 1.0 Production
      </footer>
    </div>
  );
};
