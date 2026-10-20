import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onChange: (query: string) => void;
  onOpenAiAssistant?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChange,
  onOpenAiAssistant,
}) => {
  return (
    <div className="px-4 pb-2.5">
      <div className="relative flex items-center w-full h-10 px-3.5 rounded-xl bg-[#1c1c1e] text-white focus-within:ring-1 focus-within:ring-red-500/80 transition-all">
        <Search className="w-4 h-4 text-neutral-400 mr-2.5 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask Meta AI or Search"
          className="w-full bg-transparent text-[15px] text-neutral-100 placeholder-neutral-400 focus:outline-none"
        />
        {query ? (
          <button
            onClick={() => onChange('')}
            className="p-1 rounded-full text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        ) : onOpenAiAssistant ? (
          <button
            onClick={onOpenAiAssistant}
            title="Ask Kempo AI"
            className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-red-950/70 border border-red-700/60 text-red-300 hover:bg-red-900 transition flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            AI
          </button>
        ) : null}
      </div>
    </div>
  );
};
