import React from 'react';
import { Plus } from 'lucide-react';
import { FilterType } from '../types';

interface FilterBarProps {
  activeFilter: FilterType;
  unreadCount: number;
  onSelectFilter: (filter: FilterType) => void;
  onAddCustomList: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  unreadCount,
  onSelectFilter,
  onAddCustomList,
}) => {
  return (
    <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar select-none">
      {/* 'All' filter pill */}
      <button
        onClick={() => onSelectFilter('all')}
        className={`px-3.5 py-1.5 rounded-full text-[13.5px] font-medium transition duration-150 cursor-pointer ${
          activeFilter === 'all'
            ? 'bg-red-600 text-white shadow-md shadow-red-950/40 font-semibold'
            : 'bg-[#1c1c1e] text-neutral-300 hover:text-white hover:bg-neutral-800'
        }`}
      >
        All
      </button>

      {/* 'Unread 3' filter pill */}
      <button
        onClick={() => onSelectFilter('unread')}
        className={`px-3.5 py-1.5 rounded-full text-[13.5px] font-medium transition duration-150 cursor-pointer flex items-center gap-1.5 ${
          activeFilter === 'unread'
            ? 'bg-red-600 text-white shadow-md shadow-red-950/40 font-semibold'
            : 'bg-[#1c1c1e] text-neutral-300 hover:text-white hover:bg-neutral-800'
        }`}
      >
        <span>Unread</span>
        {unreadCount > 0 && (
          <span className={`${activeFilter === 'unread' ? 'text-white' : 'text-neutral-300'}`}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* 'Favorites' filter pill */}
      <button
        onClick={() => onSelectFilter('favorites')}
        className={`px-3.5 py-1.5 rounded-full text-[13.5px] font-medium transition duration-150 cursor-pointer ${
          activeFilter === 'favorites'
            ? 'bg-red-600 text-white shadow-md shadow-red-950/40 font-semibold'
            : 'bg-[#1c1c1e] text-neutral-300 hover:text-white hover:bg-neutral-800'
        }`}
      >
        Favorites
      </button>

      {/* Groups filter pill */}
      <button
        onClick={() => onSelectFilter('groups')}
        className={`px-3.5 py-1.5 rounded-full text-[13.5px] font-medium transition duration-150 cursor-pointer ${
          activeFilter === 'groups'
            ? 'bg-red-600 text-white shadow-md shadow-red-950/40 font-semibold'
            : 'bg-[#1c1c1e] text-neutral-300 hover:text-white hover:bg-neutral-800'
        }`}
      >
        Groups
      </button>

      {/* '+' custom list filter button */}
      <button
        onClick={onAddCustomList}
        aria-label="Add list filter"
        className="w-8 h-8 rounded-full bg-[#1c1c1e] text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
