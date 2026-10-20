import React from 'react';
import { Users, Radio, Laptop, Star, Settings, Download, X } from 'lucide-react';

interface ActionMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: string) => void;
}

export const ActionMenuModal: React.FC<ActionMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  const options = [
    { id: 'new_group', label: 'New group', icon: Users },
    { id: 'broadcast', label: 'New broadcast', icon: Radio },
    { id: 'linked', label: 'Linked devices', icon: Laptop },
    { id: 'starred', label: 'Starred messages', icon: Star },
    { id: 'install', label: 'Install / Home Screen', icon: Download, highlight: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-start p-4 pt-16 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-60 bg-[#1e1e24] rounded-2xl border border-neutral-750 shadow-2xl overflow-hidden divide-y divide-neutral-800"
      >
        <div className="p-2 space-y-0.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectOption(opt.id);
                  onClose();
                }}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition cursor-pointer ${
                  opt.highlight
                    ? 'text-red-400 hover:bg-red-950/40 font-semibold'
                    : 'text-neutral-200 hover:bg-neutral-800/80 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${opt.highlight ? 'text-red-500' : 'text-neutral-400'}`} />
                <span className="text-[14px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
