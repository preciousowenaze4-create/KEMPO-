import React from 'react';
import { Archive } from 'lucide-react';

interface ArchivedRowProps {
  count: number;
  unreadCount?: number;
  onClick: () => void;
}

export const ArchivedRow: React.FC<ArchivedRowProps> = ({
  count,
  unreadCount = 0,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#151518] transition select-none cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* Archive box icon matching the screenshot */}
        <div className="w-8 h-8 flex items-center justify-center text-neutral-400">
          <Archive className="w-5 h-5 text-neutral-300" />
        </div>
        <span className="text-[16px] font-medium text-neutral-200">
          Archived
        </span>
      </div>

      {unreadCount > 0 && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
};
