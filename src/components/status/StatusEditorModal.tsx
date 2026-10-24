import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Music,
  Crop,
  Smile,
  Type,
  Edit2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  Send,
  Plus,
  AtSign,
  Check,
  RotateCw,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { StatusStory, StatusMusicTrack, StatusTextOverlay } from '../../types';
import { KempoMusicDrawer } from './KempoMusicDrawer';

interface StatusEditorModalProps {
  isOpen: boolean;
  media: {
    type: 'image' | 'video' | 'text' | 'voice' | 'layout';
    url?: string;
    text?: string;
    backgroundColor?: string;
    voiceBlob?: Blob;
    duration?: number;
    layoutImages?: string[];
  } | null;
  contacts?: Array<{ id: string; name: string; kempoId?: string }>;
  onClose: () => void;
  onPublish: (storyData: {
    mediaType: 'image' | 'video' | 'text' | 'voice' | 'layout';
    url?: string;
    caption: string;
    musicTrack?: StatusMusicTrack;
    filter?: string;
    isGif?: boolean;
    trimStart?: number;
    trimEnd?: number;
    rotation?: number;
    textOverlays?: StatusTextOverlay[];
    taggedContacts?: string[];
    audience: 'contacts' | 'everyone';
    textContent?: string;
    textBackgroundColor?: string;
  }) => void;
}

const FILTER_PRESETS = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'crimson', name: 'Cyber Crimson', css: 'contrast(1.25) saturate(1.5) hue-rotate(330deg)' },
  { id: 'neon', name: 'Neon Green', css: 'contrast(1.3) saturate(1.8) hue-rotate(85deg)' },
  { id: 'vivid', name: 'Vivid', css: 'contrast(1.2) saturate(1.4)' },
  { id: 'noir', name: 'Noir B&W', css: 'grayscale(1) contrast(1.3)' },
  { id: 'retro', name: 'Retro Warm', css: 'sepia(0.4) contrast(1.1) brightness(1.05)' },
  { id: 'cool', name: 'Teal & Cool', css: 'contrast(1.15) hue-rotate(180deg)' },
];

export const StatusEditorModal: React.FC<StatusEditorModalProps> = ({
  isOpen,
  media,
  contacts = [],
  onClose,
  onPublish,
}) => {
  const [caption, setCaption] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isGif, setIsGif] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [showFilters, setShowFilters] = useState(false);
  const [showMusicDrawer, setShowMusicDrawer] = useState(false);
  const [musicTrack, setMusicTrack] = useState<StatusMusicTrack | undefined>(undefined);

  // Video Trimming State
  const [videoDuration, setVideoDuration] = useState<number>(media?.duration || 2);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(media?.duration || 2);

  // Overlay Text tool
  const [textOverlays, setTextOverlays] = useState<StatusTextOverlay[]>([]);
  const [activeTextInput, setActiveTextInput] = useState<string>('');
  const [isAddingText, setIsAddingText] = useState(false);
  const [textColor, setTextColor] = useState('#ffffff');

  // Contact tagging (@mention)
  const [showMentions, setShowMentions] = useState(false);
  const [taggedContacts, setTaggedContacts] = useState<string[]>([]);

  // Drawing overlay tool
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#e50914');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPainting, setIsPainting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (media?.duration) {
      setVideoDuration(media.duration);
      setTrimEnd(media.duration);
    }
  }, [media?.duration]);

  if (!isOpen || !media) return null;

  const currentFilterCss = FILTER_PRESETS.find((f) => f.id === selectedFilter)?.css || 'none';

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

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleAddTextOverlay = () => {
    if (!activeTextInput.trim()) {
      setIsAddingText(false);
      return;
    }
    setTextOverlays((prev) => [
      ...prev,
      {
        id: `txt-${Date.now()}`,
        text: activeTextInput.trim(),
        color: textColor,
        x: 50,
        y: 45,
      },
    ]);
    setActiveTextInput('');
    setIsAddingText(false);
  };

  const handleMentionContact = (contactName: string) => {
    setCaption((prev) => `${prev} @${contactName} `);
    setTaggedContacts((prev) => Array.from(new Set([...prev, contactName])));
    setShowMentions(false);
  };

  // Canvas drawing handlers
  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !canvasRef.current) return;
    setIsPainting(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPainting || !isDrawingMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const handleEndDraw = () => {
    setIsPainting(false);
  };

  const handleClearDrawing = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handlePublish = () => {
    onPublish({
      mediaType: media.type,
      url: media.url,
      caption: caption.trim(),
      musicTrack,
      filter: selectedFilter,
      isGif,
      trimStart,
      trimEnd,
      rotation,
      textOverlays,
      taggedContacts,
      audience: 'contacts',
      textContent: media.text,
      textBackgroundColor: media.backgroundColor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden animate-in fade-in">
      {/* 1. Top Action Tools Bar matching IMG_4782 */}
      <div className="z-30 pt-[max(env(safe-area-inset-top),10px)] pb-2 px-3 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
        {/* Close Button on left */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
          title="Cancel"
        >
          <X className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Top Right Tool Icons: Music, Crop, Sticker, Text, Pencil */}
        <div className="flex items-center gap-2">
          {/* Music tool */}
          <button
            onClick={() => setShowMusicDrawer(true)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg ${
              musicTrack ? 'bg-red-600 text-white' : 'bg-black/60 hover:bg-black/80 text-white'
            }`}
            title="Kempo Pro Music"
          >
            <Music className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Crop & Rotate tool */}
          <button
            onClick={handleRotate}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
            title="Rotate & Crop"
          >
            <Crop className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Sticker / Emoji tool */}
          <button
            onClick={() => {
              setTextOverlays((prev) => [
                ...prev,
                { id: `emoji-${Date.now()}`, text: '🔥', color: '#ffffff', x: 50, y: 35 },
              ]);
            }}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
            title="Add Sticker"
          >
            <Smile className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Text Overlay Tool */}
          <button
            onClick={() => setIsAddingText(true)}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg font-bold"
            title="Overlay Text"
          >
            <span className="text-sm font-black">Aa</span>
          </button>

          {/* Pencil Drawing Tool */}
          <button
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg ${
              isDrawingMode ? 'bg-red-600 text-white' : 'bg-black/60 hover:bg-black/80 text-white'
            }`}
            title="Draw"
          >
            <Edit2 className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Drawing mode toolbar */}
      {isDrawingMode && (
        <div className="z-30 px-4 py-2 bg-black/80 backdrop-blur-md flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            {['#e50914', '#ffffff', '#22c55e', '#3b82f6', '#eab308', '#ec4899'].map((c) => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full transition cursor-pointer ring-2 ${
                  drawColor === c ? 'ring-white scale-110' : 'ring-transparent'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleClearDrawing}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-bold hover:text-white cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* 2. Video Trimmer & Controls Bar (Only for Video) matching IMG_4782 */}
      {media.type === 'video' && (
        <div className="z-20 px-3 py-1.5 space-y-2">
          {/* Video Timeline Scrubber */}
          <div className="relative w-full h-10 bg-neutral-900/90 border border-neutral-700/80 rounded-xl overflow-hidden flex items-center px-1 shadow-inner">
            {/* Filmstrip simulation bar */}
            <div className="absolute inset-x-2 inset-y-1 bg-gradient-to-r from-red-950 via-neutral-900 to-red-950 opacity-60 rounded flex items-center justify-around pointer-events-none">
              <span className="w-1.5 h-6 bg-red-600/40 rounded-full" />
              <span className="w-1.5 h-6 bg-red-600/40 rounded-full" />
              <span className="w-1.5 h-6 bg-red-600/40 rounded-full" />
              <span className="w-1.5 h-6 bg-red-600/40 rounded-full" />
              <span className="w-1.5 h-6 bg-red-600/40 rounded-full" />
            </div>

            {/* Left Handle */}
            <div className="absolute left-1 z-10 w-4 h-8 bg-neutral-800 border border-white/40 rounded flex items-center justify-center text-white font-bold text-[10px] cursor-ew-resize">
              &lt;
            </div>

            {/* Right Handle */}
            <div className="absolute right-1 z-10 w-4 h-8 bg-neutral-800 border border-white/40 rounded flex items-center justify-center text-white font-bold text-[10px] cursor-ew-resize">
              &gt;
            </div>
          </div>

          {/* Info Sub-bar: Mute, Duration • Size, and Video/GIF toggle */}
          <div className="flex items-center justify-between">
            {/* Left: Mute button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Center: Duration & Size badge */}
            <div className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-xs font-mono font-bold text-white shadow-md">
              0:0{videoDuration} • 317 KB
            </div>

            {/* Right: Video / GIF segmented toggle */}
            <div className="inline-flex p-0.5 rounded-full bg-black/70 border border-white/20 shadow-md">
              <button
                onClick={() => setIsGif(false)}
                className={`px-3 py-0.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  !isGif ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Video</span>
              </button>
              <button
                onClick={() => setIsGif(true)}
                className={`px-3 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  isGif ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                GIF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Center Media Viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-auto">
        <div
          className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-200"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {media.type === 'video' ? (
            <video
              ref={videoRef}
              src={media.url}
              autoPlay
              loop
              muted={isMuted || isGif}
              playsInline
              style={{ filter: currentFilterCss }}
              className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain cursor-pointer"
              onClick={handleTogglePlay}
            />
          ) : media.type === 'image' ? (
            <img
              src={media.url}
              alt="Status preview"
              style={{ filter: currentFilterCss }}
              className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain"
            />
          ) : media.type === 'text' ? (
            <div
              className={`w-80 h-96 rounded-3xl bg-gradient-to-br ${
                media.backgroundColor || 'from-red-900 to-black'
              } p-6 flex items-center justify-center text-center shadow-2xl border border-red-500/40`}
            >
              <p className="text-2xl font-black text-white leading-relaxed drop-shadow-md">
                {caption || media.text || 'Red vibes all day 🔥 #KempoPro'}
              </p>
            </div>
          ) : media.type === 'layout' ? (
            <div className="grid grid-cols-2 gap-2 w-80 h-96 rounded-3xl overflow-hidden bg-neutral-900 p-2 border border-neutral-800">
              {(media.layoutImages || []).map((img, idx) => (
                <img key={idx} src={img} alt="layout" className="w-full h-full object-cover rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="w-80 h-72 rounded-3xl bg-gradient-to-br from-[#16161c] to-black p-6 flex flex-col items-center justify-center gap-4 border border-red-500/30 text-center">
              <div className="w-16 h-16 rounded-full bg-red-600/30 text-red-500 flex items-center justify-center animate-pulse">
                <Play className="w-8 h-8 fill-red-500 ml-1" />
              </div>
              <span className="text-base font-bold text-white">Voice Note Status (0:15)</span>
            </div>
          )}

          {/* Canvas for Drawing Layer */}
          <canvas
            ref={canvasRef}
            width={380}
            height={520}
            onMouseDown={handleStartDraw}
            onMouseMove={handleDraw}
            onMouseUp={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleDraw}
            onTouchEnd={handleEndDraw}
            className={`absolute inset-0 w-full h-full rounded-2xl ${
              isDrawingMode ? 'pointer-events-auto cursor-crosshair z-25' : 'pointer-events-none'
            }`}
          />

          {/* Center Play Button Overlay for Video */}
          {media.type === 'video' && !isPlaying && (
            <div
              onClick={handleTogglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer z-10"
            >
              <div className="w-16 h-16 rounded-full bg-white/80 text-black flex items-center justify-center shadow-2xl shadow-black pl-1">
                <Play className="w-8 h-8 fill-black" />
              </div>
            </div>
          )}

          {/* Render Text Overlays */}
          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              style={{
                position: 'absolute',
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: 'translate(-50%, -50%)',
                color: overlay.color,
              }}
              className="font-black text-xl px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-xs border border-white/20 shadow-2xl select-none cursor-move z-20"
            >
              {overlay.text}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Music Track Floating Badge */}
      {musicTrack && (
        <div className="z-30 mx-4 mb-2 p-2 rounded-2xl bg-black/75 border border-red-500/40 backdrop-blur-md flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-red-600/30 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                Kempo Pro Music
              </span>
              <p className="text-xs font-bold text-white truncate">
                {musicTrack.title} • <span className="text-neutral-400 font-normal">{musicTrack.artist}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setMusicTrack(undefined)}
            className="text-neutral-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Swipe Up for Filters indicator matching IMG_4782 */}
      <div className="z-20 flex flex-col items-center">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-white text-xs font-bold flex flex-col items-center gap-0.5 pb-2 drop-shadow cursor-pointer hover:text-red-400 transition"
        >
          <ChevronUp className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          <span>Swipe up for filters</span>
        </button>

        {/* Filter Tray drawer */}
        {showFilters && (
          <div className="w-full bg-[#16161c]/95 border-t border-neutral-800 py-3 px-4 flex items-center gap-3 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
            {FILTER_PRESETS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`flex flex-col items-center gap-1.5 shrink-0 cursor-pointer ${
                  selectedFilter === f.id ? 'scale-105' : 'opacity-70'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition ${
                    selectedFilter === f.id ? 'border-red-500 shadow-lg shadow-red-950' : 'border-neutral-700'
                  }`}
                >
                  <img
                    src={media.url || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200'}
                    alt={f.name}
                    style={{ filter: f.css }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-bold text-white whitespace-nowrap">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mention Tagging Dropdown */}
      {showMentions && (
        <div className="z-30 mx-4 mb-2 p-2 rounded-2xl bg-[#1c1c24] border border-neutral-800 shadow-2xl max-h-40 overflow-y-auto">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 block mb-1">
            Tag a Contact
          </span>
          {contacts.map((c) => (
            <div
              key={c.id}
              onClick={() => handleMentionContact(c.name)}
              className="p-2 rounded-xl hover:bg-neutral-800 flex items-center justify-between text-xs font-bold text-white cursor-pointer"
            >
              <span>{c.name}</span>
              <span className="text-[10px] text-neutral-400 font-mono">{c.kempoId || 'Contact'}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Bottom Caption & Send Bar matching IMG_4782 */}
      <div className="z-30 px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-2 space-y-2 bg-gradient-to-t from-black via-black/90 to-transparent">
        {/* Caption Input Box */}
        <div className="relative flex items-center bg-[#1c1c22]/95 border border-neutral-700/80 focus-within:border-red-500 rounded-full px-3 py-1.5 shadow-xl">
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-neutral-800/80 text-white flex items-center justify-center shrink-0 mr-2 cursor-pointer hover:bg-neutral-700"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-neutral-400 outline-none"
          />

          <button
            type="button"
            onClick={() => setShowMentions(!showMentions)}
            className="w-8 h-8 rounded-full text-neutral-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
            title="Mention contact"
          >
            <AtSign className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Bottom Row: Status Audience Pill + Circular Send Button */}
        <div className="flex items-center justify-between pt-1">
          {/* Audience Pill matching IMG_4782 */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1c1c22]/90 border border-neutral-700/80 text-xs font-bold text-white shadow-md">
            <span className="w-3 h-3 rounded-full border-2 border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <span>Status (Contacts)</span>
          </div>

          {/* Send Button matching IMG_4782 */}
          <button
            onClick={handlePublish}
            className="w-12 h-12 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-xl active:scale-95 transition cursor-pointer"
            title="Publish Status"
          >
            <Send className="w-5 h-5 fill-black ml-0.5" />
          </button>
        </div>
      </div>

      {/* Overlay Text Input Modal */}
      {isAddingText && (
        <div className="fixed inset-0 z-60 bg-black/90 flex flex-col justify-center items-center p-4">
          <input
            type="text"
            autoFocus
            value={activeTextInput}
            onChange={(e) => setActiveTextInput(e.target.value)}
            placeholder="Type text..."
            style={{ color: textColor }}
            className="w-full text-center text-3xl font-black bg-transparent outline-none mb-6"
          />
          <div className="flex items-center gap-3 mb-6">
            {['#ffffff', '#e50914', '#eab308', '#22c55e', '#3b82f6', '#ec4899'].map((c) => (
              <button
                key={c}
                onClick={() => setTextColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full cursor-pointer ring-2 ${
                  textColor === c ? 'ring-white scale-110' : 'ring-transparent'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleAddTextOverlay}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm cursor-pointer shadow-lg"
          >
            Done
          </button>
        </div>
      )}

      {/* Music Drawer */}
      <KempoMusicDrawer
        isOpen={showMusicDrawer}
        selectedTrack={musicTrack}
        onSelectTrack={(track) => setMusicTrack(track)}
        onRemoveTrack={() => setMusicTrack(undefined)}
        onClose={() => setShowMusicDrawer(false)}
      />
    </div>
  );
};
