import React, { useState } from 'react';
import { SahilLogo } from '../components/SahilLogo';
import { SearchBar } from '../components/SearchBar';
import { DatabaseStatus } from '../types';
import { ArrowRight, PlusCircle, Tag as TagIcon, Sparkles } from 'lucide-react';

interface HomePageProps {
  onSearch: (query: string, options?: { tags?: string[]; useAi?: boolean }) => void;
  onNavigate: (route: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry') => void;
  status: DatabaseStatus | null;
  isLoading?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSearch,
  onNavigate,
  status,
  isLoading = false,
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const sampleKeywords = [
    { label: 'APS', tags: [], hint: 'Anhydrous Polysaccharide' },
    { label: 'Label', tags: ['Biotin'], hint: 'Label with tag Biotin' },
    { label: 'Label', tags: ['High Science'], hint: 'Label with tag High Science' },
    { label: 'Paracetamol', tags: [], hint: 'Analgesic API' },
    { label: 'MCC', tags: [], hint: 'Microcrystalline Cellulose' },
    { label: 'Curcuma Longa', tags: [], hint: 'Botanical Extract' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between px-4 sm:px-6">
      <div className="grow flex flex-col items-center justify-center -mt-8 sm:-mt-12 max-w-3xl mx-auto w-full">
        {/* Main Branding Wordmark: SAAHIL */}
        <div className="mb-8 sm:mb-10 text-center animate-in fade-in zoom-in-95 duration-200">
          <SahilLogo size="lg" showSubtitle={true} />
        </div>

        {/* Central Search Box with Tag Support */}
        <div className="w-full max-w-2xl px-2">
          <SearchBar
            initialQuery={queryInput}
            initialTags={activeTags}
            onSearch={onSearch}
            isLoading={isLoading}
            size="large"
            autoFocus={true}
          />
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
          <button
            onClick={() => {
              if (queryInput.trim() || activeTags.length > 0) {
                onSearch(queryInput.trim(), { tags: activeTags });
              } else {
                onSearch('APS', { tags: [] });
              }
            }}
            className="px-6 py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            Search
          </button>

          <button
            onClick={() => onNavigate('bmr')}
            className="px-6 py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Search from BMR</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => onNavigate('new-entry')}
            className="px-5 py-2.5 rounded-md bg-white hover:bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-200 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>+ New Entry</span>
          </button>
        </div>

        {/* Quick Sample Queries with Tags */}
        <div className="mt-8 text-center max-w-xl">
          <p className="text-xs text-slate-400 font-medium mb-2.5 uppercase tracking-wider font-mono">
            Sample Queries & Tag Combinations:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {sampleKeywords.map((item) => (
              <button
                key={`${item.label}-${item.tags.join('-')}`}
                onClick={() => onSearch(item.label, { tags: item.tags })}
                title={item.hint}
                className="text-xs px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <span>{item.label}</span>
                {item.tags.length > 0 && (
                  <span className="font-semibold text-blue-600 bg-blue-100/70 px-1 py-0.2 rounded-xs text-[10px]">
                    +{item.tags.join(', ')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle Status Footer */}
      <footer className="py-4 border-t border-slate-200/60 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.connected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>
              Master database: <strong>{status?.connected ? 'Connected' : 'Connecting...'}</strong>
            </span>
          </div>

          {status && (
            <>
              <span className="text-slate-300">•</span>
              <span>
                Records: <strong>{status.totalRecords.toLocaleString()}</strong>
              </span>
            </>
          )}

          {status?.lastImported && (
            <>
              <span className="text-slate-300 hidden md:inline">•</span>
              <span className="hidden md:inline">
                Last updated: <strong>{status.lastImported}</strong>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('new-entry')}
            className="hover:text-blue-600 transition-colors font-medium cursor-pointer"
          >
            + New Entry
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate('admin')}
            className="hover:text-blue-600 transition-colors font-medium cursor-pointer"
          >
            Master Data Import
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate('bmr')}
            className="hover:text-blue-600 transition-colors font-medium cursor-pointer"
          >
            BMR Module
          </button>
        </div>
      </footer>
    </div>
  );
};
