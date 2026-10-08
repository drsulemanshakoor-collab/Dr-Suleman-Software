import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, ArrowRight, Tag as TagIcon, Plus } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  initialTags?: string[];
  onSearch: (query: string, options?: { tags?: string[]; useAi?: boolean }) => void;
  isLoading?: boolean;
  size?: 'normal' | 'large';
  placeholder?: string;
  autoFocus?: boolean;
  showAiToggle?: boolean;
  showTagsOption?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  initialTags = [],
  onSearch,
  isLoading = false,
  size = 'large',
  placeholder = 'Search raw material name (e.g. APS, Paracetamol, Label)...',
  autoFocus = false,
  showAiToggle = true,
  showTagsOption = true,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [useAi, setUseAi] = useState(false);
  const [showTagBar, setShowTagBar] = useState(initialTags.length > 0);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setTags(initialTags);
    if (initialTags.length > 0) {
      setShowTagBar(true);
    }
  }, [initialTags]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || tags.length > 0) {
      onSearch(query.trim(), { tags, useAi });
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  const handleAddTag = (tagText: string) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...tags, trimmed];
      setTags(updated);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    const updated = tags.filter((_, i) => i !== index);
    setTags(updated);
  };

  const isLarge = size === 'large';

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      {/* Primary Rounded Search Bar */}
      <div
        className={`relative flex items-center bg-white rounded-full border border-slate-300 shadow-xs hover:shadow-md focus-within:shadow-md focus-within:border-blue-500 transition-all ${
          isLarge ? 'h-13 sm:h-14 px-4 sm:px-5' : 'h-11 px-3 sm:px-4'
        }`}
      >
        <Search
          className={`shrink-0 text-slate-400 ${
            isLarge ? 'w-5 h-5 sm:w-6 sm:h-6 mr-3' : 'w-4 h-4 mr-2.5'
          }`}
        />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-hidden ${
            isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
          }`}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors mr-1"
            title="Clear text"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Tags Toggle Button */}
        {showTagsOption && (
          <button
            type="button"
            onClick={() => setShowTagBar(!showTagBar)}
            title="Filter by metadata tags (e.g. Biotin, High Science)"
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mr-1.5 transition-all ${
              tags.length > 0 || showTagBar
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>Tags {tags.length > 0 ? `(${tags.length})` : ''}</span>
          </button>
        )}

        {/* AI Assist Toggle Button */}
        {showAiToggle && (
          <button
            type="button"
            onClick={() => setUseAi(!useAi)}
            title={useAi ? 'Gemini AI assistant active' : 'Enable Gemini AI interpretation'}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mr-2 transition-all ${
              useAi
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${useAi ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>AI Assist</span>
          </button>
        )}

        <button
          type="submit"
          disabled={(!query.trim() && tags.length === 0) || isLoading}
          className={`shrink-0 rounded-full flex items-center justify-center transition-all ${
            isLarge ? 'w-10 h-10' : 'w-8 h-8'
          } ${
            (query.trim() || tags.length > 0) && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          title="Search"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Interactive Tag Bar (Shown when tags exist or user clicked Tags) */}
      {(showTagBar || tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs shadow-2xs animate-in fade-in">
          <span className="text-slate-400 font-semibold font-mono flex items-center gap-1 text-[11px] uppercase">
            <TagIcon className="w-3 h-3 text-blue-500" />
            <span>Tags:</span>
          </span>

          {tags.map((tag, idx) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold bg-white text-blue-700 border border-blue-200 shadow-2xs"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(idx)}
                className="text-slate-400 hover:text-blue-900 rounded-full p-0.5 transition-colors"
                title="Remove tag"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Quick Tag Creator */}
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag(newTagInput);
                }
              }}
              placeholder="Add tag (e.g. Biotin)..."
              className="px-2 py-0.5 text-xs text-slate-800 placeholder:text-slate-400 bg-white border border-slate-200 rounded-md outline-hidden focus:border-blue-500 w-36"
            />
            {newTagInput.trim() && (
              <button
                type="button"
                onClick={() => handleAddTag(newTagInput)}
                className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[11px] font-semibold hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            )}
          </div>

          {/* Quick clickable tag suggestions */}
          <div className="hidden sm:flex items-center gap-1 ml-auto text-[11px] text-slate-500">
            <span>Examples:</span>
            {['Biotin', 'High Science', 'Label'].map((exampleTag) => (
              <button
                key={exampleTag}
                type="button"
                onClick={() => handleAddTag(exampleTag)}
                disabled={tags.includes(exampleTag)}
                className={`px-1.5 py-0.5 rounded-sm border ${
                  tags.includes(exampleTag)
                    ? 'opacity-40 cursor-default bg-slate-100 border-slate-200'
                    : 'bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200 text-slate-600 cursor-pointer'
                }`}
              >
                +{exampleTag}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
};
