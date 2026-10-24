import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface BannerData {
  title: string;
  body: string;
  icon?: string;
  chatId?: string;
}

interface InAppNotificationBannerProps {
  onOpenChatById?: (chatId: string) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  onOpenChatById,
}) => {
  const [banner, setBanner] = useState<BannerData | null>(null);

  useEffect(() => {
    const handleBanner = (e: Event) => {
      const customEvent = e as CustomEvent<BannerData>;
      if (customEvent.detail) {
        setBanner(customEvent.detail);
      }
    };

    window.addEventListener('kempo-inapp-banner', handleBanner);
    return () => {
      window.removeEventListener('kempo-inapp-banner', handleBanner);
    };
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => {
      setBanner(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [banner]);

  if (!banner) return null;

  return (
    <div className="fixed top-2 left-0 right-0 z-50 px-3 flex justify-center pointer-events-none select-none">
      <div
        onClick={() => {
          if (banner.chatId && onOpenChatById) {
            onOpenChatById(banner.chatId);
          }
          setBanner(null);
        }}
        className="pointer-events-auto max-w-sm w-full bg-[#181822]/95 border border-white/15 backdrop-blur-xl shadow-2xl rounded-2xl p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-250 cursor-pointer hover:bg-[#20202c] transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-red-600/30 border border-red-500/40 overflow-hidden flex items-center justify-center shrink-0">
            {banner.icon && banner.icon.startsWith('http') ? (
              <img src={banner.icon} alt={banner.title} className="w-full h-full object-cover" />
            ) : (
              <MessageCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold text-white truncate">{banner.title}</h5>
              <span className="text-[10px] text-neutral-400 shrink-0">now</span>
            </div>
            <p className="text-xs text-neutral-300 truncate mt-0.5">{banner.body}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setBanner(null);
          }}
          className="p-1 rounded-full text-neutral-400 hover:text-white transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
