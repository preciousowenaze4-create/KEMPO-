import React from 'react';
import { Phone, Users, MessageSquareQuote } from 'lucide-react';
import { TabType } from '../types';

interface BottomTabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unreadCount?: number;
  userAvatarUrl?: string;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  userAvatarUrl = '',
}) => {
  return (
    <div className="w-full bg-[#161618]/95 backdrop-blur-xl border-t border-[#262628] select-none z-30 pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="flex items-center justify-around h-14 pt-1 px-1">
        {/* Tab 1: Updates */}
        <button
          onClick={() => onSelectTab('updates')}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer group"
        >
          <div className="relative">
            <svg
              className={`w-6 h-6 transition ${
                activeTab === 'updates' ? 'text-red-500 stroke-[2.2]' : 'text-neutral-400 group-hover:text-neutral-200'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 10 10" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
          <span
            className={`text-[10px] mt-1 font-medium transition ${
              activeTab === 'updates' ? 'text-red-500 font-semibold' : 'text-neutral-400'
            }`}
          >
            Updates
          </span>
        </button>

        {/* Tab 2: Calls */}
        <button
          onClick={() => onSelectTab('calls')}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer group"
        >
          <Phone
            className={`w-6 h-6 transition ${
              activeTab === 'calls' ? 'text-red-500 stroke-[2.2]' : 'text-neutral-400 group-hover:text-neutral-200'
            }`}
          />
          <span
            className={`text-[10px] mt-1 font-medium transition ${
              activeTab === 'calls' ? 'text-red-500 font-semibold' : 'text-neutral-400'
            }`}
          >
            Calls
          </span>
        </button>

        {/* Tab 3: Communities */}
        <button
          onClick={() => onSelectTab('communities')}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer group"
        >
          <Users
            className={`w-6 h-6 transition ${
              activeTab === 'communities' ? 'text-red-500 stroke-[2.2]' : 'text-neutral-400 group-hover:text-neutral-200'
            }`}
          />
          <span
            className={`text-[10px] mt-1 font-medium transition ${
              activeTab === 'communities' ? 'text-red-500 font-semibold' : 'text-neutral-400'
            }`}
          >
            Communities
          </span>
        </button>

        {/* Tab 4: Chats (With Red Badge '3') */}
        <button
          onClick={() => onSelectTab('chats')}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer group"
        >
          <div className="relative">
            {/* Custom WhatsApp chat bubble glyph */}
            <svg
              className={`w-6 h-6 transition ${
                activeTab === 'chats' ? 'text-red-500 fill-red-500/10' : 'text-neutral-400 group-hover:text-neutral-200'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>

            {/* Red Badge '3' matching screenshot */}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4.5 h-4.5 px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md shadow-red-950">
                {unreadCount}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] mt-1 font-medium transition ${
              activeTab === 'chats' ? 'text-red-500 font-semibold' : 'text-neutral-400'
            }`}
          >
            Chats
          </span>
        </button>

        {/* Tab 5: You */}
        <button
          onClick={() => onSelectTab('you')}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer group"
        >
          <div className="relative">
            <div
              className={`w-6.5 h-6.5 rounded-full p-[1px] flex items-center justify-center bg-neutral-800 transition ${
                activeTab === 'you' ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-black' : 'ring-1 ring-neutral-600'
              }`}
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt="You"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-neutral-300 font-bold">U</span>
              )}
            </div>
            {/* Small status indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-black"></span>
          </div>
          <span
            className={`text-[10px] mt-1 font-medium transition ${
              activeTab === 'you' ? 'text-red-500 font-semibold' : 'text-neutral-400'
            }`}
          >
            You
          </span>
        </button>
      </div>
    </div>
  );
};
