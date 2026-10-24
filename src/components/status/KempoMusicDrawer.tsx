import React, { useState, useEffect } from 'react';
import { X, Search, Music, Play, Pause, Check, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { StatusMusicTrack } from '../../types';
import {
  searchKempoMusic,
  playTrackPreview,
  stopTrackPreview,
  subscribeToAudioState,
  getCurrentlyPlayingTrackId,
  CURATED_KEMPO_TRACKS,
} from '../../lib/musicService';

interface KempoMusicDrawerProps {
  isOpen: boolean;
  selectedTrack?: StatusMusicTrack;
  onSelectTrack: (track: StatusMusicTrack) => void;
  onRemoveTrack?: () => void;
  onClose: () => void;
}

const GENRE_CHIPS = ['Trending', 'Afrobeats', 'Kempo Beats', 'Lo-Fi', 'Hip-Hop', 'Pop', 'Acoustic'];

export const KempoMusicDrawer: React.FC<KempoMusicDrawerProps> = ({
  isOpen,
  selectedTrack,
  onSelectTrack,
  onRemoveTrack,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState('Trending');
  const [tracks, setTracks] = useState<StatusMusicTrack[]>(CURATED_KEMPO_TRACKS);
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(getCurrentlyPlayingTrackId());

  // Subscribe to audio state
  useEffect(() => {
    const unsub = subscribeToAudioState((id) => {
      setPlayingId(id);
    });
    return () => {
      unsub();
      stopTrackPreview();
    };
  }, []);

  // Live search effect with debouncing
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const query = searchQuery.trim() || (activeChip === 'Trending' ? '' : activeChip);

    setIsLoading(true);
    const timer = setTimeout(() => {
      searchKempoMusic(query)
        .then((results) => {
          if (isMounted) {
            setTracks(results);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeChip, isOpen]);

  if (!isOpen) return null;

  const handleChipClick = (chip: string) => {
    setActiveChip(chip);
    setSearchQuery('');
  };

  const handleTogglePlay = (e: React.MouseEvent, track: StatusMusicTrack) => {
    e.stopPropagation();
    playTrackPreview(track);
  };

  const handleChoose = (track: StatusMusicTrack) => {
    stopTrackPreview();
    onSelectTrack(track);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in select-none"
      onClick={() => {
        stopTrackPreview();
        onClose();
      }}
    >
      <div
        className="w-full max-h-[85vh] bg-[#121216] border-t border-neutral-800 rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-neutral-700/80 rounded-full mx-auto mt-3 mb-2 shrink-0" />

        {/* Top Header */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/25 border border-red-500/50 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/40">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Kempo Pro Music</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h2>
              <p className="text-[11px] font-medium text-neutral-400">Audio Library & Soundtracks</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopTrackPreview();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Kempo Pro Music Library..."
              className="w-full bg-[#1c1c22] border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-white placeholder-neutral-500 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Genre Chips */}
        <div className="px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {GENRE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                activeChip === chip && !searchQuery
                  ? 'bg-red-600 text-white shadow-md shadow-red-950 border border-red-500'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 border border-neutral-700/50'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Currently selected track banner if any */}
        {selectedTrack && (
          <div className="mx-4 my-2 p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Volume2 className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-red-400 block tracking-wider">
                  Attached to Status
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {selectedTrack.title} • <span className="text-neutral-400 font-normal">{selectedTrack.artist}</span>
                </p>
              </div>
            </div>
            {onRemoveTrack && (
              <button
                onClick={() => {
                  onRemoveTrack();
                  stopTrackPreview();
                }}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-900/30 transition cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-xs font-medium">Searching Kempo Pro Music Library...</span>
            </div>
          ) : tracks.length > 0 ? (
            tracks.map((track) => {
              const isPlaying = playingId === track.id;
              const isCurrentSelection = selectedTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handleChoose(track)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer group ${
                    isCurrentSelection
                      ? 'bg-red-950/20 border-red-500/50 shadow-md'
                      : 'bg-[#18181f]/80 hover:bg-[#202028] border-neutral-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Album Art with Play/Pause button */}
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800 border border-neutral-700/50">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          <Music className="w-5 h-5" />
                        </div>
                      )}

                      {/* Play overlay */}
                      <button
                        onClick={(e) => handleTogglePlay(e, track)}
                        className={`absolute inset-0 flex items-center justify-center transition cursor-pointer ${
                          isPlaying
                            ? 'bg-red-600/85 text-white'
                            : 'bg-black/45 text-white group-hover:bg-black/60'
                        }`}
                        title={isPlaying ? 'Pause preview' : 'Play preview'}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Track info */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-bold text-white truncate group-hover:text-red-400 transition">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {track.artist}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-neutral-500 font-semibold">
                          0:{track.duration || 30}
                        </span>
                        {isPlaying && (
                          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            Streaming audio...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add / Selected button */}
                  <div className="shrink-0">
                    {isCurrentSelection ? (
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-950">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChoose(track);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 text-xs font-bold transition cursor-pointer"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-neutral-400">
              <Music className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-300">No tracks found</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Try searching for another artist or song name in Kempo Pro Music.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
