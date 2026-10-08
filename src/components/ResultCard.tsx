import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SearchResultItem } from '../types';

interface ResultCardProps {
  item: SearchResultItem;
  onClick: (item: SearchResultItem) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item, onClick }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
      className="group bg-white border border-slate-200/90 hover:border-blue-400 rounded-xl p-4 sm:p-5 transition-all shadow-2xs hover:shadow-sm cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          {/* 1. Material Name */}
          <h3 className="text-base sm:text-lg font-semibold text-blue-700 group-hover:text-blue-800 transition-colors truncate">
            {item.materialName}
          </h3>

          {/* 2. QC Number & 3. Date */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-700">
            <div>
              <span className="text-slate-500 font-medium">QC Number: </span>
              <span className="font-mono font-semibold text-slate-900 bg-slate-100/80 px-1.5 py-0.5 rounded-sm">
                {item.qcNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Date: </span>
              <span className="font-medium text-slate-800">{item.date}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-slate-300 group-hover:text-blue-600 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
