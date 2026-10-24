import React from 'react';
import { Camera, Plus, Sparkles, Music, Play, Film, MessageCircle } from 'lucide-react';
import { StatusStory } from '../types';

interface UpdatesTabProps {
  stories: StatusStory[];
  currentUserAvatar?: string;
  onViewStory: (story: StatusStory) => void;
  onAddStatus: () => void;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({
  stories,
  currentUserAvatar,
  onViewStory,
  onAddStatus,
}) => {
  // Find user's active status
  const myStatus = stories.find(
    (s) => s.id === 's_my' || s.userName === 'My Status' || s.userId === 'me'
  );
  const recentStories = stories.filter(
    (s) => s.id !== 's_my' && s.userName !== 'My Status' && s.userId !== 'me'
  );

  return (
    <div className="relative flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),10px)] select-none space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
          Updates
        </h1>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onAddStatus}
            aria-label="Add status"
            className="w-10 h-10 rounded-full bg-[#1c1c22] hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white flex items-center justify-center active:scale-95 transition cursor-pointer shadow-lg"
            title="Post a Status"
          >
            <Camera className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Status Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Status</h2>

        {/* My Status Row */}
        <div className="flex items-center gap-3.5 p-2 rounded-2xl bg-[#141418]/60 border border-neutral-800/60 hover:bg-[#1a1a20] transition">
          {/* Avatar Ring */}
          <div
            onClick={() => {
              if (myStatus) {
                onViewStory(myStatus);
              } else {
                onAddStatus();
              }
            }}
            className="relative cursor-pointer shrink-0"
          >
            <div
              className={`w-14 h-14 rounded-full overflow-hidden p-[2px] ${
                myStatus
                  ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black'
                  : 'ring-2 ring-neutral-700'
              } bg-neutral-900 flex items-center justify-center`}
            >
              {myStatus?.imageUrl || myStatus?.videoUrl ? (
                <img
                  src={myStatus.imageUrl || myStatus.videoUrl}
                  alt="My Status"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : currentUserAvatar ? (
                <img
                  src={currentUserAvatar}
                  alt="My Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold text-xl">
                  K
                </div>
              )}
            </div>

            {/* Small Plus button on avatar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddStatus();
              }}
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center ring-2 ring-black shadow-lg active:scale-90 transition cursor-pointer"
              title="Add to my status"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          {/* Info & Tap action */}
          <div
            onClick={() => {
              if (myStatus) {
                onViewStory(myStatus);
              } else {
                onAddStatus();
              }
            }}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
              <span>My Status</span>
              {myStatus?.musicTrack && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
                  <Music className="w-3 h-3 text-red-500 animate-pulse" />
                  <span className="truncate max-w-[110px]">{myStatus.musicTrack.title}</span>
                </span>
              )}
            </h3>
            <p className="text-[13px] text-neutral-400">
              {myStatus ? (
                <span className="text-red-400 font-medium">Tap to view • {myStatus.timestamp}</span>
              ) : (
                'Tap to add status update'
              )}
            </p>
          </div>
        </div>

        {/* Recent updates */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-400">
              Recent updates (Contacts Only)
            </span>
            <span className="text-[11px] font-semibold text-red-500">24h Lifespan</span>
          </div>

          {recentStories.length > 0 ? (
            <div className="mt-1 space-y-1">
              {recentStories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => onViewStory(story)}
                  className="flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-[#16161c] transition cursor-pointer group"
                >
                  <div className="relative shrink-0">
                    <div
                      className={`w-14 h-14 rounded-full p-[2px] transition ${
                        story.viewed
                          ? 'ring-2 ring-neutral-600'
                          : 'ring-2 ring-red-500 ring-offset-2 ring-offset-black group-hover:scale-102'
                      }`}
                    >
                      {story.userAvatar ? (
                        <img
                          src={story.userAvatar}
                          alt={story.userName}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/pwa-512x512.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold text-lg">
                          {story.userName.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Video / GIF indicator */}
                    {story.mediaType === 'video' && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center ring-1 ring-black">
                        <Play className="w-2 h-2 fill-white" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15.5px] font-bold text-white group-hover:text-red-400 transition truncate flex items-center gap-2">
                      <span>{story.userName}</span>
                      {story.musicTrack && (
                        <span className="flex items-center gap-1 text-[10.5px] text-red-400 font-normal">
                          <Music className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[100px]">{story.musicTrack.title}</span>
                        </span>
                      )}
                    </h3>
                    <p className="text-[12.5px] text-neutral-400 mt-0.5">
                      {story.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 px-4 rounded-2xl bg-[#141418]/70 border border-neutral-800/60 text-center my-2">
              <Sparkles className="w-6 h-6 text-red-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-neutral-200 mb-1">No contact status updates</p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Status updates from your saved contacts auto-expire after 24 hours. Tap the camera or "+" to share your first status!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Status Creation */}
      <div className="fixed bottom-20 right-5 z-20 flex flex-col items-center gap-2.5">
        <button
          onClick={onAddStatus}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-950 ring-4 ring-black/40 active:scale-95 transition cursor-pointer"
          title="Create Status"
        >
          <Camera className="w-6 h-6 stroke-[2.2]" />
        </button>
      </div>
    </div>
  );
};
