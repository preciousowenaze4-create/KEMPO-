import React, { useState, useEffect } from 'react';
import { Clock, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getLocalMedia, getLocalMediaSync } from '../lib/mediaStorage';

interface ChatMessageMediaProps {
  messageId: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'sticker' | 'audio' | 'document';
  status?: 'pending' | 'sent' | 'delivered' | 'read';
  caption?: string;
  isMe?: boolean;
}

export const ChatMessageMedia: React.FC<ChatMessageMediaProps> = ({
  messageId,
  mediaUrl,
  status,
  isMe,
}) => {
  // Synchronous lookup first so local preview renders in the exact same render cycle (0ms)
  const initialUrl = mediaUrl || getLocalMediaSync(messageId) || '';
  const [displayUrl, setDisplayUrl] = useState<string>(initialUrl);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    if (mediaUrl) {
      setDisplayUrl(mediaUrl);
    } else {
      const syncUrl = getLocalMediaSync(messageId);
      if (syncUrl) {
        setDisplayUrl(syncUrl);
      } else {
        getLocalMedia(messageId).then((cached) => {
          if (!isCancelled && cached) {
            setDisplayUrl(cached);
          }
        });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [messageId, mediaUrl]);

  return (
    <div className="relative rounded-xl overflow-hidden mb-1.5 max-w-[280px] sm:max-w-[320px] bg-neutral-900/80 shadow-md">
      {displayUrl && !hasError ? (
        <div className="relative group">
          <img
            src={displayUrl}
            alt=""
            loading="eager"
            onLoad={() => setIsLoaded(true)}
            onError={async () => {
              // Try fetching from local storage / IndexedDB cache before showing error
              const fallback = await getLocalMedia(messageId);
              if (fallback && fallback !== displayUrl) {
                setDisplayUrl(fallback);
              } else {
                setHasError(true);
              }
            }}
            className={`w-full max-h-72 object-cover transition-opacity duration-200 select-none ${
              isLoaded ? 'opacity-100' : 'opacity-85'
            }`}
          />

          {/* Pending Sync Overlay (WhatsApp style subtle clock icon in center or corner) */}
          {status === 'pending' && isMe && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white flex items-center gap-1.5 shadow-lg">
              <Clock className="w-3 h-3 text-white/80 animate-pulse" />
              <span>Pending</span>
            </div>
          )}
        </div>
      ) : (
        /* Clean fallback container if media is still being prepared locally */
        <div className="w-64 h-44 bg-neutral-900 flex flex-col items-center justify-center text-neutral-400 p-4">
          <Loader2 className="w-6 h-6 animate-spin text-red-500 mb-2" />
          <span className="text-xs text-neutral-300">Loading Photo...</span>
        </div>
      )}
    </div>
  );
};
