import React, { useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { MonthGroup } from '../components/MonthGroup';
import { MaterialDetailModal } from '../components/MaterialDetailModal';
import { SearchResponse, SearchResultItem, MaterialDetailRecord } from '../types';
import {
  Search,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Lightbulb,
  Tag as TagIcon,
  PlusCircle,
} from 'lucide-react';

interface SearchResultsPageProps {
  searchResponse: SearchResponse | null;
  query: string;
  tags: string[];
  onSearch: (query: string, options?: { tags?: string[]; useAi?: boolean }) => void;
  onNavigate: (route: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry') => void;
  isLoading: boolean;
  error?: string | null;
  onRecordUpdated?: () => void;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  searchResponse,
  query,
  tags,
  onSearch,
  onNavigate,
  isLoading,
  error,
  onRecordUpdated,
}) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);

  const handleSelectResult = (item: SearchResultItem) => {
    setSelectedMaterialId(item.id);
  };

  const totalResults = searchResponse?.total ?? 0;
  const groups = searchResponse?.groupedByMonth ?? [];
  const didYouMean = searchResponse?.didYouMean ?? [];
  const interpreted = searchResponse?.interpretedQuery;
  const aiExplanation = searchResponse?.aiExplanation;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Search Header Bar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="shrink-0 flex items-center justify-between">
            <button
              onClick={() => onNavigate('home')}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium sm:hidden"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <div className="grow max-w-2xl">
            <SearchBar
              initialQuery={query}
              initialTags={tags}
              onSearch={onSearch}
              isLoading={isLoading}
              size="normal"
            />
          </div>

          <div className="shrink-0 hidden md:flex items-center gap-2">
            <button
              onClick={() => onNavigate('new-entry')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ NEW ENTRY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600">
              Searching master QC records...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Search service error</h4>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results Header Summary */}
        {!isLoading && !error && searchResponse && (
          <div className="space-y-6">
            <div className="border-b border-slate-200/70 pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Search results {query ? `for "${query}"` : ''}
                  {tags.length > 0 && (
                    <span className="text-blue-600 ml-2 font-normal text-base">
                      with tags [{tags.join(', ')}]
                    </span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {totalResults === 0
                    ? 'No matching material records found'
                    : `${totalResults} ${
                        totalResults === 1 ? 'matching record' : 'matching records'
                      } found`}
                </p>
              </div>

              {interpreted?.isAiInterpreted && (
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Interpreted as: <strong>{interpreted.materialQuery}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* AI EXPLANATION BANNER (Requirement 14: short 2-4 lines above database results) */}
            {aiExplanation && (
              <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white border border-blue-200/80 rounded-xl p-4 sm:p-5 shadow-2xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 font-mono">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>AI Pharmaceutical Context</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {aiExplanation}
                </p>
              </div>
            )}

            {/* No Results Found View */}
            {totalResults === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center space-y-5 shadow-2xs">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800">
                    No exact material match found
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    We could not find QC records matching your query and tags in the persistent master database.
                  </p>
                </div>

                {/* Did You Mean Suggestions */}
                {didYouMean.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 max-w-md mx-auto text-left">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 font-mono">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>Did you mean?</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {didYouMean.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => onSearch(suggestion, { tags: [] })}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors font-medium cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Month-Grouped Result Cards List */}
            {totalResults > 0 && (
              <div className="space-y-8">
                {groups.map((group) => (
                  <MonthGroup
                    key={`${group.year}-${group.month}`}
                    group={group}
                    onSelectResult={handleSelectResult}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Record Detail Modal */}
      {selectedMaterialId !== null && (
        <MaterialDetailModal
          materialId={selectedMaterialId}
          onClose={() => setSelectedMaterialId(null)}
          onRecordUpdated={() => {
            if (onRecordUpdated) onRecordUpdated();
          }}
          onRecordDeleted={() => {
            if (onRecordUpdated) onRecordUpdated();
          }}
        />
      )}
    </div>
  );
};
