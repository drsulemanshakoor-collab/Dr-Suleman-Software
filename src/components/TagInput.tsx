import React, { useState } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestedTags?: string[];
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add tag (e.g. Biotin, High Science, Label)...',
  suggestedTags = ['Biotin', 'High Science', 'Label', 'API', 'Excipient', 'Packing Material'],
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed) return;
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, tags.length - 1));
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const unusedSuggestions = suggestedTags.filter(
    (st) => !tags.some((t) => t.toLowerCase() === st.toLowerCase())
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Active Tags and Input Container */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50/80 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <div className="flex items-center gap-1 text-slate-400 pl-1">
          <TagIcon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono uppercase font-semibold text-slate-500">
            Tags:
          </span>
        </div>

        {tags.map((tag, idx) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs animate-in fade-in"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(idx)}
              className="hover:text-blue-900 hover:bg-blue-200/50 rounded-full p-0.5 transition-colors"
              title={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) {
              handleAddTag(inputValue);
            }
          }}
          placeholder={tags.length === 0 ? placeholder : 'Add more...'}
          className="grow min-w-[140px] text-xs text-slate-800 placeholder:text-slate-400 bg-transparent outline-hidden px-1 py-0.5"
        />
      </div>

      {/* Quick Suggested Tags */}
      {unusedSuggestions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-slate-400 font-medium">Quick suggestions:</span>
          {unusedSuggestions.slice(0, 5).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleAddTag(st)}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-sm bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5 text-slate-400" />
              <span>{st}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
