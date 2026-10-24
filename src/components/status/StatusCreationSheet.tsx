import React, { useState, useRef } from 'react';
import {
  X,
  Type,
  LayoutGrid,
  Mic,
  Camera,
  Upload,
  Image as ImageIcon,
  Play,
  Film,
  Sparkles,
} from 'lucide-react';

interface StatusCreationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: {
    type: 'image' | 'video' | 'text' | 'voice' | 'layout';
    url?: string;
    text?: string;
    backgroundColor?: string;
    voiceBlob?: Blob;
    duration?: number;
    layoutImages?: string[];
  }) => void;
  onOpenLiveCamera: () => void;
}

// Preset library samples matching user's screen in IMG_4780
const RECENT_MEDIA_ITEMS = [
  {
    id: 'rec-1',
    type: 'video' as const,
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-red-smoke-rising-in-the-dark-41586-large.mp4',
    duration: '0:02',
    label: 'Cyber Matrix',
  },
  {
    id: 'rec-2',
    type: 'image' as const,
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80',
    label: 'Portrait',
  },
  {
    id: 'rec-3',
    type: 'image' as const,
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    label: 'Crimson Glow',
  },
  {
    id: 'rec-4',
    type: 'image' as const,
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&auto=format&fit=crop&q=80',
    label: 'Precious Style',
  },
  {
    id: 'rec-5',
    type: 'image' as const,
    thumbnail: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=600&auto=format&fit=crop&q=80',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=1000&auto=format&fit=crop&q=80',
    label: 'Friends & Vibes',
  },
  {
    id: 'rec-6',
    type: 'video' as const,
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fire-flames-in-the-dark-41718-large.mp4',
    duration: '0:04',
    label: 'Red Flames',
  },
];

export const StatusCreationSheet: React.FC<StatusCreationSheetProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  onOpenLiveCamera,
}) => {
  const [activeTab, setActiveTab] = useState<'photos' | 'albums'>('photos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result as string;
      onSelectMedia({
        type: isVideo ? 'video' : 'image',
        url: result,
      });
      onClose();
    };

    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end select-none animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full h-[92vh] max-h-[92vh] bg-[#121216] border-t border-neutral-800 rounded-t-[32px] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Grab Handle */}
        <div className="w-12 h-1.5 bg-neutral-700/80 rounded-full mx-auto mt-2.5 mb-1.5 shrink-0" />

        {/* Top Header Bar matching IMG_4780 */}
        <div className="px-4 py-2 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="text-[16px] font-semibold text-red-500 hover:text-red-400 active:opacity-75 transition cursor-pointer"
          >
            Cancel
          </button>

          {/* Segmented Control: Photos | Albums */}
          <div className="inline-flex items-center p-0.5 rounded-full bg-[#1c1c22] border border-neutral-800 shadow-inner">
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'photos'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/80'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Photos
            </button>
            <button
              onClick={() => setActiveTab('albums')}
              className={`px-4 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'albums'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/80'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Albums
            </button>
          </div>

          <div className="w-12 flex justify-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-neutral-300 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-neutral-800/80 border border-neutral-700/60 cursor-pointer"
              title="Gallery Pick"
            >
              Pick
            </button>
          </div>
        </div>

        {/* Hidden device file picker */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,video/*"
          onChange={handleDeviceFileUpload}
          className="hidden"
        />

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Action Row 1: Kempo Pro Custom Status Creation Cards matching IMG_4780 */}
          <div className="grid grid-cols-3 gap-3">
            {/* 1. Text Status */}
            <button
              onClick={() => {
                onSelectMedia({
                  type: 'text',
                  text: 'Red vibes all day 🔥 #KempoPro',
                  backgroundColor: 'from-red-900 to-black',
                });
                onClose();
              }}
              className="h-28 rounded-2xl bg-[#1c1c22] hover:bg-[#25252e] border border-neutral-800 hover:border-red-500/50 flex flex-col items-center justify-center gap-2 active:scale-95 transition cursor-pointer group shadow-lg"
            >
              <div className="w-10 h-10 rounded-full bg-red-600/20 group-hover:bg-red-600 text-red-500 group-hover:text-white flex items-center justify-center transition shadow-md">
                <span className="text-lg font-black tracking-tight">Aa</span>
              </div>
              <span className="text-xs font-bold text-white group-hover:text-red-400 transition">
                Text Status
              </span>
            </button>

            {/* 2. Layout Grid */}
            <button
              onClick={() => {
                onSelectMedia({
                  type: 'layout',
                  layoutImages: [
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
                  ],
                });
                onClose();
              }}
              className="h-28 rounded-2xl bg-[#1c1c22] hover:bg-[#25252e] border border-neutral-800 hover:border-red-500/50 flex flex-col items-center justify-center gap-2 active:scale-95 transition cursor-pointer group shadow-lg"
            >
              <div className="w-10 h-10 rounded-full bg-red-600/20 group-hover:bg-red-600 text-red-500 group-hover:text-white flex items-center justify-center transition shadow-md">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-red-400 transition">
                Layout Grid
              </span>
            </button>

            {/* 3. Voice Note Status */}
            <button
              onClick={() => {
                onSelectMedia({
                  type: 'voice',
                  duration: 15,
                  text: '🎤 Voice Status Note',
                });
                onClose();
              }}
              className="h-28 rounded-2xl bg-[#1c1c22] hover:bg-[#25252e] border border-neutral-800 hover:border-red-500/50 flex flex-col items-center justify-center gap-2 active:scale-95 transition cursor-pointer group shadow-lg"
            >
              <div className="w-10 h-10 rounded-full bg-red-600/20 group-hover:bg-red-600 text-red-500 group-hover:text-white flex items-center justify-center transition shadow-md">
                <Mic className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-red-400 transition">
                Voice Note Status
              </span>
            </button>
          </div>

          {/* Media Grid Section matching IMG_4780 */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-400">
                Recent Media & Gallery
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Device Upload</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Camera Card in top-left of media grid */}
              <button
                onClick={() => {
                  onClose();
                  onOpenLiveCamera();
                }}
                className="aspect-square rounded-2xl bg-[#18181e] border-2 border-dashed border-red-500/50 hover:border-red-500 hover:bg-[#202028] flex flex-col items-center justify-center gap-2 transition cursor-pointer group shadow-md"
              >
                <div className="w-12 h-12 rounded-full bg-red-600/20 group-hover:bg-red-600 text-red-500 group-hover:text-white flex items-center justify-center transition shadow-lg">
                  <Camera className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-red-400 transition">
                  Live Camera
                </span>
              </button>

              {/* Media items */}
              {RECENT_MEDIA_ITEMS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectMedia({
                      type: item.type,
                      url: item.type === 'video' ? item.videoUrl : item.url,
                    });
                    onClose();
                  }}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-red-500 transition cursor-pointer group shadow-md"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Video Duration Badge */}
                  {item.type === 'video' && item.duration && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 border border-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-md">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>{item.duration}</span>
                    </div>
                  )}

                  {/* Hover indicator */}
                  <div className="absolute inset-0 bg-red-600/20 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
