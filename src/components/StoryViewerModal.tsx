import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, Music, Volume2, VolumeX, Play, Pause, Sparkles } from 'lucide-react';
import { StatusStory } from '../types';

interface StoryViewerModalProps {
  story: StatusStory | null;
  onClose: () => void;
  onReply: (userName: string, replyText: string) => void;
}

const FILTER_CSS: Record<string, string> = {
  normal: 'none',
  crimson: 'contrast(1.25) saturate(1.5) hue-rotate(330deg)',
  neon: 'contrast(1.3) saturate(1.8) hue-rotate(85deg)',
  vivid: 'contrast(1.2) saturate(1.4)',
  noir: 'grayscale(1) contrast(1.3)',
  retro: 'sepia(0.4) contrast(1.1) brightness(1.05)',
  cool: 'contrast(1.15) hue-rotate(180deg)',
};

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose,
  onReply,
}) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-progress bar and timer
  useEffect(() => {
    if (!story) return;
    setProgress(0);

    // If story has video, length can be 8s, otherwise 5s
    const totalDuration = story.videoUrl ? 8000 : 5000;
    const intervalTime = 100;
    const increment = (intervalTime / totalDuration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [story, onClose]);

  // Audio track playback synchronization
  useEffect(() => {
    if (story?.musicTrack?.previewUrl) {
      const audio = new Audio(story.musicTrack.previewUrl);
      audio.volume = 0.8;
      audio.play().catch(() => {});
      audioRef.current = audio;

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [story?.musicTrack]);

  if (!story) return null;

  const filterStyle = story.filter ? FILTER_CSS[story.filter] || 'none' : 'none';

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply(story.userName, replyText);
    setReplyText('');
    onClose();
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 select-none animate-in fade-in">
      {/* Top Progress bar and Header */}
      <div className="w-full z-20 space-y-3">
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
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-red-500 shadow-md">
              {story.userAvatar ? (
                <img src={story.userAvatar} alt={story.userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-red-950 flex items-center justify-center font-bold text-white">
                  {story.userName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{story.userName}</span>
                {story.audience === 'contacts' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-900/40 text-red-400 border border-red-500/30">
                    Contacts
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-400">{story.timestamp}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {story.videoUrl && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-neutral-800 transition cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-900/80 text-white flex items-center justify-center hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Attached Music Track Badge */}
        {story.musicTrack && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 border border-red-500/40 backdrop-blur-md shadow-lg">
            <Music className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {story.musicTrack.title} • <span className="text-neutral-400 font-normal">{story.musicTrack.artist}</span>
            </span>
          </div>
        )}
      </div>

      {/* Main Story Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-auto overflow-hidden">
        {story.videoUrl ? (
          <div className="relative max-h-[72vh] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              src={story.videoUrl}
              autoPlay
              loop={Boolean(story.isGif)}
              muted={isMuted}
              playsInline
              style={{ filter: filterStyle }}
              className="w-full h-full object-contain max-h-[72vh] rounded-2xl cursor-pointer"
              onClick={handleTogglePlay}
            />
            {!isPlaying && (
              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-white/80 text-black flex items-center justify-center pl-1 shadow-2xl">
                  <Play className="w-8 h-8 fill-black" />
                </div>
              </div>
            )}
          </div>
        ) : story.imageUrl ? (
          <div className="w-full max-h-[72vh] rounded-2xl overflow-hidden relative shadow-2xl flex items-center justify-center">
            <img
              src={story.imageUrl}
              alt="Story"
              style={{ filter: filterStyle }}
              className="w-full h-full object-contain max-h-[72vh] mx-auto rounded-2xl"
            />
          </div>
        ) : (
          <div
            className={`w-full max-w-sm h-80 rounded-3xl bg-gradient-to-br ${
              story.textBackgroundColor || 'from-red-900 via-rose-950 to-black'
            } p-6 flex items-center justify-center text-center text-white text-2xl font-black shadow-2xl border border-red-500/30 leading-relaxed`}
          >
            {story.textContent || story.caption || 'Red vibes all day 🔥 #KempoPro'}
          </div>
        )}

        {/* Text Overlays if present */}
        {story.textOverlays?.map((overlay) => (
          <div
            key={overlay.id}
            style={{
              position: 'absolute',
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: 'translate(-50%, -50%)',
              color: overlay.color,
            }}
            className="font-black text-xl px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-xs border border-white/20 shadow-2xl pointer-events-none"
          >
            {overlay.text}
          </div>
        ))}

        {/* Caption with clickable @mentions */}
        {story.caption && (story.imageUrl || story.videoUrl) && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md text-white text-sm font-medium text-center max-w-sm border border-white/10 shadow-xl">
            {story.caption.split(' ').map((word, i) =>
              word.startsWith('@') ? (
                <span key={i} className="text-red-400 font-bold">
                  {word}{' '}
                </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </div>
        )}
      </div>

      {/* Bottom Reply Box */}
      <div className="w-full flex items-center gap-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] z-20">
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
            className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-500 transition cursor-pointer shadow-lg"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        ) : (
          <button
            onClick={() => handleSendReply()}
            className="w-11 h-11 rounded-full bg-[#1c1c1f] text-red-500 flex items-center justify-center hover:bg-neutral-800 transition cursor-pointer shadow-lg"
          >
            <Heart className="w-5 h-5 fill-red-500" />
          </button>
        )}
      </div>
    </div>
  );
};
