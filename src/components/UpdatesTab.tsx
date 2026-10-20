import React from 'react';
import { Camera, Plus, Sparkles, MessageCircle } from 'lucide-react';
import { StatusStory } from '../types';

interface UpdatesTabProps {
  stories: StatusStory[];
  onViewStory: (story: StatusStory) => void;
  onAddStatus: () => void;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({
  stories,
  onViewStory,
  onAddStatus,
}) => {
  const myStatus = stories.find((s) => s.id === 's_my');
  const recentStories = stories.filter((s) => s.id !== 's_my');

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),10px)] select-none space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Updates</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddStatus}
            aria-label="Add status"
            className="w-10 h-10 rounded-full bg-[#1c1c1e] text-neutral-200 hover:text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Status</h2>

        {/* My Status */}
        <div
          onClick={onAddStatus}
          className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#161619] transition cursor-pointer"
        >
          <div className="relative">
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-neutral-700 bg-neutral-800 flex items-center justify-center">
              {myStatus?.imageUrl ? (
                <img
                  src={myStatus.imageUrl}
                  alt="My Status"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl text-neutral-400">👤</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center ring-2 ring-black">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold text-white">My Status</h3>
            <p className="text-[13px] text-neutral-400">
              {myStatus ? 'View or add update' : 'Add to my status'}
            </p>
          </div>
        </div>

        {/* Recent updates */}
        <div className="mt-5">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-400 px-2">
            Recent updates
          </span>

          {recentStories.length > 0 ? (
            <div className="mt-2 space-y-1">
              {recentStories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => onViewStory(story)}
                  className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#161619] transition cursor-pointer"
                >
                  <div className="relative">
                    <div
                      className={`w-14 h-14 rounded-full p-[2px] ${
                        story.viewed
                          ? 'ring-2 ring-neutral-600'
                          : 'ring-2 ring-red-500 ring-offset-2 ring-offset-black'
                      }`}
                    >
                      {story.userAvatar ? (
                        <img
                          src={story.userAvatar}
                          alt={story.userName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold text-lg">
                          {story.userName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-white">
                      {story.userName}
                    </h3>
                    <p className="text-[13px] text-neutral-400">
                      {story.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 px-4 rounded-2xl bg-[#161619] border border-neutral-800/60 text-center my-2">
              <p className="text-sm font-semibold text-neutral-300 mb-1">No status updates</p>
              <p className="text-xs text-neutral-500">
                Tap the camera or "My Status" above to share your first photo or video update.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Channels Section */}
      <div className="border-t border-neutral-900 pt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white">Channels</h2>
        </div>
        <p className="text-[13px] text-neutral-400 mb-4">
          Stay updated on topics you care about. Channels you follow will appear here.
        </p>

        <div className="p-5 rounded-2xl bg-[#161619] border border-neutral-800/80 text-center">
          <p className="text-sm font-semibold text-white mb-1">No channels followed yet</p>
          <p className="text-xs text-neutral-400">Follow official channels to get updates right in your feed.</p>
        </div>
      </div>
    </div>
  );
};
