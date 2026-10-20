import React, { useState, useEffect } from 'react';
import { X, Heart, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusStory } from '../types';

interface StoryViewerModalProps {
  story: StatusStory | null;
  onClose: () => void;
  onReply: (userName: string, replyText: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose,
  onReply,
}) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [story, onClose]);

  if (!story) return null;

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply(story.userName, replyText);
    setReplyText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 select-none animate-in fade-in">
      {/* Top Progress bar and Header */}
      <div className="w-full z-10 space-y-3">
        {/* Progress bar line */}
        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* User bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-red-500">
              {story.userAvatar ? (
                <img src={story.userAvatar} alt={story.userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-red-950 flex items-center justify-center font-bold text-white">
                  {story.userName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{story.userName}</h3>
              <p className="text-[11px] text-neutral-400">{story.timestamp}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900/80 text-white flex items-center justify-center hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Story Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4">
        {story.imageUrl ? (
          <div className="w-full max-h-[68vh] rounded-2xl overflow-hidden relative shadow-2xl">
            <img
              src={story.imageUrl}
              alt="Story"
              className="w-full h-full object-contain max-h-[68vh] mx-auto rounded-2xl"
            />
          </div>
        ) : (
          <div className="w-full max-w-sm h-64 rounded-3xl bg-gradient-to-br from-red-900 to-rose-950 p-6 flex items-center justify-center text-center text-white text-xl font-bold shadow-2xl">
            {story.caption || "Red vibes all day 🔥"}
          </div>
        )}

        {story.caption && story.imageUrl && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md text-white text-sm font-medium text-center max-w-xs">
            {story.caption}
          </div>
        )}
      </div>

      {/* Bottom Reply Box */}
      <div className="w-full flex items-center gap-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] z-10">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={`Reply to ${story.userName}...`}
          className="flex-1 h-11 px-4 rounded-full bg-[#1c1c1f]/90 border border-neutral-700/80 text-white text-sm focus:outline-none focus:border-red-500"
        />
        {replyText ? (
          <button
            onClick={handleSendReply}
            className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-500 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => handleSendReply()}
            className="w-11 h-11 rounded-full bg-[#1c1c1f] text-red-500 flex items-center justify-center hover:bg-neutral-800 transition"
          >
            <Heart className="w-5 h-5 fill-red-500" />
          </button>
        )}
      </div>
    </div>
  );
};
