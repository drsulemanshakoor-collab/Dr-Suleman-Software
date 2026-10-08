import React from 'react';
import { Database, Search, FlaskConical, Settings2, PlusCircle } from 'lucide-react';
import { SahilLogo } from './SahilLogo';

interface HeaderProps {
  currentRoute: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry';
  onNavigate: (route: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry') => void;
  compactLogo?: boolean;
  totalRecords?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  compactLogo = false,
  totalRecords,
}) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-xs sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {compactLogo ? (
            <SahilLogo
              size="sm"
              showSubtitle={false}
              onClick={() => onNavigate('home')}
            />
          ) : (
            <button
              onClick={() => onNavigate('home')}
              className="text-left font-bold text-slate-800 text-sm hover:text-blue-600 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FlaskConical className="w-5 h-5 text-blue-600" />
              <span>Pharma QC Master</span>
            </button>
          )}

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentRoute === 'home' || currentRoute === 'search'
                  ? 'text-blue-600 bg-blue-50/70 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => onNavigate('bmr')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentRoute === 'bmr'
                  ? 'text-blue-600 bg-blue-50/70 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Search from BMR
            </button>
            <button
              onClick={() => onNavigate('new-entry')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                currentRoute === 'new-entry'
                  ? 'text-blue-600 bg-blue-50/70 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ New Entry</span>
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentRoute === 'admin'
                  ? 'text-blue-600 bg-blue-50/70 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Admin / Master Data
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {totalRecords !== undefined && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{totalRecords.toLocaleString()} Master Records</span>
            </div>
          )}

          <button
            onClick={() => onNavigate('new-entry')}
            className="md:hidden p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Create New Entry"
          >
            <PlusCircle className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigate('admin')}
            title="Database & Excel Management"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
