import React from 'react';
import { MonthGroupedResults, SearchResultItem } from '../types';
import { ResultCard } from './ResultCard';
import { Calendar } from 'lucide-react';

interface MonthGroupProps {
  group: MonthGroupedResults;
  onSelectResult: (item: SearchResultItem) => void;
}

export const MonthGroup: React.FC<MonthGroupProps> = ({ group, onSelectResult }) => {
  return (
    <section className="space-y-3">
      {/* Month Section Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-xs sm:text-sm font-mono">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{group.monthYear}</span>
        </div>
        <div className="h-px bg-slate-200 grow" />
        <span className="text-xs text-slate-400 font-medium">
          {group.records.length} {group.records.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Cards in this month */}
      <div className="grid grid-cols-1 gap-2.5">
        {group.records.map((item) => (
          <ResultCard key={item.id} item={item} onClick={onSelectResult} />
        ))}
      </div>
    </section>
  );
};
