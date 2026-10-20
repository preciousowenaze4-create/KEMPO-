import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Phone,
  Video,
  Plus,
  Camera,
  Mic,
  Send,
  Smile,
  Check,
  CheckCheck,
  Image as ImageIcon,
  User,
  X,
  Play,
  Pause,
  Paperclip,
} from 'lucide-react';
import { Chat, Message } from '../types';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { realtimeService } from '../lib/realtimeService';

interface ChatRoomProps {
  chat: Chat;
  myId?: string;
  onBack: () => void;
  onSendMessage: (chatId: string, text: string, mediaType?: 'image' | 'audio' | 'sticker', mediaUrl?: string) => void;
  onStartCall?: (chat: Chat, isVideo: boolean) => void;
  onMarkRead?: (chatId: string) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  chat,
  myId = 'me',
  onBack,
  onSendMessage,
  onStartCall,
  onMarkRead,
}) => {
  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedReactionMessageId, setSelectedReactionMessageId] = useState<string | null>(null);

  // Advanced Voice Note recorder active state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Audio playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, isTyping]);

  // Subscribe to real-time chat messages and read receipts between both participants
  useEffect(() => {
    if (!chat.id) return;

    const partnerId = chat.phoneNumber || chat.about?.replace('KEMPO ID: ', '') || chat.id;

    // Notify that we have opened and read this chat
    onMarkRead?.(chat.id);
    realtimeService.sendReadReceipt(myId, partnerId);

    const unsub = realtimeService.subscribeToChatRoom(
      myId,
      partnerId,
      (incomingMsg) => {
        onSendMessage(chat.id, incomingMsg.text || '', incomingMsg.mediaType, incomingMsg.mediaUrl);
      },
      () => {
        // Partner has seen our messages -> turns ticks to double blue mark!
        onMarkRead?.(chat.id);
      }
    );

    return () => {
      unsub();
    };
  }, [chat.id, myId]);

  // Handle Text Message Send
  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    setShowAttachMenu(false);

    onSendMessage(chat.id, text);

    const partnerId = chat.phoneNumber || chat.about?.replace('KEMPO ID: ', '') || chat.id;
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    realtimeService.sendMessage(myId, partnerId, {
      id: `msg-${Date.now()}`,
      senderId: myId,
      text,
      timestamp: `${hours}:${minutes} ${ampm}`,
      status: 'sent',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Handle sending a recorded voice note
  const handleSendRecordedVoiceNote = (audioBlob: Blob, durationSeconds: number) => {
    setShowVoiceRecorder(false);

    const durationStr = `0:${durationSeconds.toString().padStart(2, '0')}`;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const text = `🎤 Voice Message (${durationStr})`;

      onSendMessage(chat.id, text, 'audio', base64Audio);

      const partnerId = chat.phoneNumber || chat.about?.replace('KEMPO ID: ', '') || chat.id;
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      realtimeService.sendMessage(myId, partnerId, {
        id: `msg-${Date.now()}`,
        senderId: myId,
        text,
        mediaType: 'audio',
        mediaUrl: base64Audio,
        timestamp: `${hours}:${minutes} ${ampm}`,
        status: 'sent',
      });
    };
    reader.readAsDataURL(audioBlob);
  };

  // Play / Pause Voice Message in chat bubble
  const handleTogglePlayAudio = (msg: Message) => {
    if (playingMessageId === msg.id) {
      audioPlayerRef.current?.pause();
      setPlayingMessageId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (msg.mediaUrl) {
        const audio = new Audio(msg.mediaUrl);
        audioPlayerRef.current = audio;
        audio.play().catch(() => {});
        audio.onended = () => setPlayingMessageId(null);
      }
      setPlayingMessageId(msg.id);
      setTimeout(() => setPlayingMessageId(null), 5000);
    }
  };

  // Photo Attachment upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const imgUrl = reader.result as string;
        onSendMessage(chat.id, '📸 Photo', 'image', imgUrl);
        setShowAttachMenu(false);

        const partnerId = chat.phoneNumber || chat.about?.replace('KEMPO ID: ', '') || chat.id;
        realtimeService.sendMessage(myId, partnerId, {
          id: `msg-${Date.now()}`,
          senderId: myId,
          text: '📸 Photo',
          mediaType: 'image',
          mediaUrl: imgUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e] flex flex-col select-none overflow-hidden animate-in fade-in slide-in-from-right duration-200">
      {/* Top WhatsApp Chat Navigation Bar */}
      <div className="pt-[max(env(safe-area-inset-top),8px)] pb-2 bg-[#161619]/95 backdrop-blur-md border-b border-neutral-800/80 px-3 flex items-center justify-between z-10 shrink-0">
        {/* Left: Back button + Avatar + Name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center text-red-500 hover:text-red-400 -ml-1 py-1 pr-1 active:opacity-70 transition cursor-pointer"
          >
            <ChevronLeft className="w-7 h-7 -mr-1" />
            <span className="text-[15px] font-medium hidden sm:inline">Chats</span>
          </button>

          {/* Contact Avatar */}
          <div className="relative shrink-0 ml-1">
            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-neutral-800">
              {chat.avatarType === 'photo' && chat.avatarUrl ? (
                <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: chat.avatarBg || '#1c1c1e' }}
                >
                  {chat.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {chat.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black"></span>
            )}
          </div>

          {/* Contact info */}
          <div className="ml-2 min-w-0">
            <h2 className="text-[15.5px] font-semibold text-white truncate tracking-tight">
              {chat.name}
            </h2>
            <p className="text-[11.5px] text-neutral-400 truncate">
              {isTyping ? (
                <span className="text-red-400 font-medium">typing...</span>
              ) : chat.online ? (
                <span className="text-emerald-400">online</span>
              ) : (
                `last seen ${chat.timestamp}`
              )}
            </p>
          </div>
        </div>

        {/* Right: Real Video Call and Voice Call Action Buttons */}
        <div className="flex items-center gap-4 text-red-500">
          <button
            onClick={() => onStartCall?.(chat, true)}
            aria-label="Real-time Video Call"
            title="Start Video Call"
            className="p-1 hover:text-red-400 active:scale-95 transition cursor-pointer"
          >
            <Video className="w-5 h-5 stroke-[2.2]" />
          </button>
          <button
            onClick={() => onStartCall?.(chat, false)}
            aria-label="Real Voice Call"
            title="Start Voice Call"
            className="p-1 hover:text-red-400 active:scale-95 transition cursor-pointer"
          >
            <Phone className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Messages Canvas with WhatsApp dark doodle wallpaper */}
      <div
        className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 relative"
        style={{
          backgroundColor: '#0a0a0d',
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.04) 0%, transparent 80%)`,
        }}
      >
        {/* End-to-End Encryption Banner */}
        <div className="flex justify-center my-2">
          <div className="max-w-[85%] px-3 py-1.5 rounded-lg bg-[#18181b]/90 border border-neutral-800 text-center shadow-sm">
            <span className="text-[11px] text-neutral-400 leading-tight">
              🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
            </span>
          </div>
        </div>

        {/* Empty state */}
        {chat.messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto min-h-[220px]">
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center font-bold text-xl mb-3 shadow-inner">
              {chat.name ? chat.name.charAt(0).toUpperCase() : <User className="w-7 h-7 text-neutral-400" />}
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">
              Say hello to {chat.name}
            </h4>
            <p className="text-xs text-neutral-500 max-w-xs">
              No messages here yet. Send a real-time message, voice note, or place an encrypted video call.
            </p>
          </div>
        )}

        {/* Messages List */}
        {chat.messages.map((msg) => {
          const isMe = msg.senderId === 'me' || msg.senderId === myId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative animate-in fade-in`}
            >
              <div
                onClick={() => setSelectedReactionMessageId(selectedReactionMessageId === msg.id ? null : msg.id)}
                className={`relative max-w-[82%] sm:max-w-[65%] px-3 py-2 rounded-2xl shadow-sm text-[15px] cursor-pointer transition ${
                  isMe
                    ? 'bg-gradient-to-br from-red-700 to-red-800 text-white rounded-br-xs shadow-red-950/40'
                    : 'bg-[#1f2225] text-neutral-100 rounded-bl-xs'
                }`}
              >
                {/* Voice Message Note Card */}
                {msg.mediaType === 'audio' ? (
                  <div className="flex items-center gap-3 py-1 min-w-[200px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlayAudio(msg);
                      }}
                      className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0 transition cursor-pointer"
                    >
                      {playingMessageId === msg.id ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1 flex flex-col justify-center">
                      {/* Audio waveform simulator */}
                      <div className="flex items-center gap-0.5 h-6">
                        {[40, 70, 90, 60, 30, 80, 100, 50, 75, 45, 95, 60, 35, 70, 85].map((h, i) => (
                          <span
                            key={i}
                            className={`w-0.5 rounded-full transition-all ${
                              playingMessageId === msg.id ? 'bg-white animate-pulse' : 'bg-white/60'
                            }`}
                            style={{ height: `${(h * 20) / 100}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-white/80 font-mono mt-0.5">
                        {msg.text?.replace('🎤 ', '') || '0:05'}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Photo Media content */}
                {msg.mediaType === 'image' && msg.mediaUrl && (
                  <div className="rounded-xl overflow-hidden mb-1 max-w-xs">
                    <img src={msg.mediaUrl} alt="Attached Media" className="w-full h-auto object-cover max-h-64" />
                  </div>
                )}

                {/* Text content */}
                {msg.text && msg.mediaType !== 'audio' && (
                  <div className="leading-relaxed break-words pr-2">
                    {msg.text}
                  </div>
                )}

                {/* Reaction pill on message */}
                {msg.reaction && (
                  <div className="absolute -bottom-2.5 right-2 px-1.5 py-0.5 rounded-full bg-[#18181b] border border-neutral-700 text-xs shadow-md">
                    {msg.reaction}
                  </div>
                )}

                {/* Time & WhatsApp double tick marks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10.5px] opacity-75">
                  <span className={`${isMe ? 'text-red-100' : 'text-neutral-400'}`}>
                    {msg.timestamp}
                  </span>
                  {isMe && (
                    <span className="inline-flex">
                      {msg.status === 'sent' && <Check className="w-3.5 h-3.5 stroke-[2.2]" />}
                      {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />}
                      {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-sky-300 stroke-[2.4]" />}
                    </span>
                  )}
                </div>
              </div>

              {/* Reaction quick-bar popup */}
              {selectedReactionMessageId === msg.id && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1e24] border border-neutral-700 shadow-xl my-1 animate-in zoom-in-95 z-20">
                  {['👍', '❤️', '🔥', '😂', '😮', '🙏'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        msg.reaction = emoji;
                        setSelectedReactionMessageId(null);
                      }}
                      className="text-lg hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedReactionMessageId(null)}
                    className="text-neutral-400 hover:text-white ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden Image File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Attach Popup Menu */}
      {showAttachMenu && (
        <div className="bg-[#18181c] border-t border-neutral-850 px-4 py-3 grid grid-cols-4 gap-4 animate-in slide-in-from-bottom-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="text-[12px] text-neutral-300">Photos</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[12px] text-neutral-300">Camera</span>
          </button>
          <button
            onClick={() => {
              onSendMessage(chat.id, '📍 Current Location: London, UK');
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[12px] text-neutral-300">Location</span>
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Paperclip className="w-6 h-6" />
            </div>
            <span className="text-[12px] text-neutral-300">Document</span>
          </button>
        </div>
      )}

      {/* Bottom Message Input Bar or Advanced Voice Note Recorder */}
      <div className="bg-[#161619] border-t border-neutral-800/80 px-2.5 py-2 flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),10px)]">
        {showVoiceRecorder ? (
          /* WhatsApp Voice Note Recorder with Pause, Play Review, Delete, and Send */
          <VoiceNoteRecorder
            onSendVoiceNote={handleSendRecordedVoiceNote}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <>
            {/* '+' attachment button */}
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              aria-label="Attachments"
              className="w-9 h-9 rounded-full text-red-500 hover:text-red-400 hover:bg-neutral-800/60 flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className={`w-6 h-6 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} />
            </button>

            {/* Input box */}
            <div className="flex-1 bg-[#1f2024] rounded-2xl px-3.5 py-1.5 flex items-center gap-2 border border-neutral-800/80 focus-within:border-red-600/70">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message"
                className="w-full bg-transparent text-[15px] text-white placeholder-neutral-400 focus:outline-none"
              />
              <button
                onClick={() => {
                  const stickers = ['🔥', '👍', '💯', '🚀', '❤️'];
                  const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
                  setInputText((prev) => prev + ' ' + randomSticker);
                }}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Action button: Send if text exists, else Camera & Voice Note */}
            {inputText.trim() ? (
              <button
                onClick={handleSend}
                aria-label="Send message"
                className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-950 transition active:scale-95 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 shrink-0 text-red-500">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-neutral-800/60 flex items-center justify-center transition active:scale-95 cursor-pointer"
                  title="Take or select photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="w-9 h-9 rounded-full hover:bg-neutral-800/60 flex items-center justify-center transition active:scale-95 cursor-pointer"
                  title="Record voice note"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
