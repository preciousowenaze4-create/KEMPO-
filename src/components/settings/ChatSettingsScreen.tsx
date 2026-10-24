import React, { useState } from 'react';
import {
  ChevronLeft,
  MessageCircle,
  Image as ImageIcon,
  HardDrive,
  Download,
  Trash2,
  Check,
  Sparkles,
  Cloud,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { UserProfileData, AppPreferences, Chat } from '../../types';
import { saveFullUserProfile } from '../../lib/supabase';

interface ChatSettingsScreenProps {
  userProfile?: UserProfileData | null;
  onBack: () => void;
  onUpdatePreferences?: (prefs: AppPreferences) => void;
  onUpdateProfile?: (profile: UserProfileData) => void;
  chats?: Chat[];
  onClearChats?: () => void;
}

const WALLPAPERS = [
  { id: 'doodle', name: 'Dark Doodle', preview: 'bg-[#0f1117] border-white/20' },
  { id: 'crimson', name: 'Crimson Glow', preview: 'bg-gradient-to-br from-red-950 to-black border-red-500/40' },
  { id: 'amoled', name: 'Pitch Black', preview: 'bg-black border-white/10' },
  { id: 'cyber', name: 'Cyber Matrix', preview: 'bg-gradient-to-br from-neutral-900 to-[#121a1f] border-sky-500/30' },
];

export const ChatSettingsScreen: React.FC<ChatSettingsScreenProps> = ({
  userProfile,
  onBack,
  onUpdatePreferences,
  onUpdateProfile,
  chats = [],
  onClearChats,
}) => {
  const prefs = userProfile?.preferences || {
    inAppSounds: true,
    messageTones: true,
    gamingIntegration: true,
    darkTheme: true,
    chatWallpaper: 'doodle',
    enterIsSend: true,
    fontSize: 'medium',
    mediaAutoDownload: true,
  };

  const [selectedWallpaper, setSelectedWallpaper] = useState(prefs.chatWallpaper || 'doodle');
  const [enterIsSend, setEnterIsSend] = useState(prefs.enterIsSend !== false);
  const [mediaAutoDownload, setMediaAutoDownload] = useState(prefs.mediaAutoDownload !== false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(prefs.fontSize || 'medium');
  const [lastBackup, setLastBackup] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kempo_last_chat_backup') || 'Today at 04:00 AM';
    }
    return 'Today at 04:00 AM';
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSavePreferences = async (newWallpaper = selectedWallpaper, newEnter = enterIsSend, newMedia = mediaAutoDownload, newFont = fontSize) => {
    const updatedPrefs: AppPreferences = {
      ...prefs,
      chatWallpaper: newWallpaper,
      enterIsSend: newEnter,
      mediaAutoDownload: newMedia,
      fontSize: newFont,
    };

    onUpdatePreferences?.(updatedPrefs);

    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        preferences: updatedPrefs,
      };
      await saveFullUserProfile(updatedProfile);
      onUpdateProfile?.(updatedProfile);
    }
  };

  const handleBackupNow = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      const timeStr = `Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      setLastBackup(timeStr);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kempo_last_chat_backup', timeStr);
      }
      setIsBackingUp(false);
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 2500);
    }, 1200);
  };

  const handleExportChats = () => {
    const exportData = {
      app: 'Kempo Pro',
      exportDate: new Date().toISOString(),
      chatsCount: chats.length,
      chats: chats.map((c) => ({
        id: c.id,
        name: c.name,
        kempoId: c.kempoId,
        messagesCount: c.messages.length,
        messages: c.messages,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kempo-chats-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d12] text-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur-md sticky top-0 z-10 pt-[max(env(safe-area-inset-top),14px)]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 active:scale-95 transition cursor-pointer font-medium text-sm"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Settings</span>
        </button>
        <h2 className="text-base font-bold text-white tracking-tight">Chats</h2>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Wallpaper Picker */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Chat Wallpaper
          </h4>
          <div className="p-4 rounded-2xl bg-[#15151e] border border-white/10 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {WALLPAPERS.map((w) => (
                <div
                  key={w.id}
                  onClick={() => {
                    setSelectedWallpaper(w.id);
                    handleSavePreferences(w.id);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    selectedWallpaper === w.id
                      ? 'border-red-500 bg-red-600/20'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg ${w.preview}`} />
                    <span className="text-xs font-semibold text-white">{w.name}</span>
                  </div>
                  {selectedWallpaper === w.id && <Check className="w-4 h-4 text-red-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Settings Group */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Chat Settings
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {/* Enter is Send */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white">Enter is Send</span>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Enter key will instantly send your message
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={enterIsSend}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setEnterIsSend(val);
                    handleSavePreferences(selectedWallpaper, val);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* Media Auto-Download */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white">Media Auto-Download</span>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Automatically cache incoming photos and voice notes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={mediaAutoDownload}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setMediaAutoDownload(val);
                    handleSavePreferences(selectedWallpaper, enterIsSend, val);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* Font Size */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white">Chat Font Size</span>
                <p className="text-xs text-neutral-400 mt-0.5">Adjust text readability in message bubbles</p>
              </div>
              <div className="flex items-center gap-1.5 ml-3 shrink-0">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setFontSize(size);
                      handleSavePreferences(selectedWallpaper, enterIsSend, mediaAutoDownload, size);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
                      fontSize === size
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Backup */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Backup & Export
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">Encrypted Cloud Vault</h5>
                  <p className="text-xs text-neutral-400">Last backup: {lastBackup}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBackupNow}
                disabled={isBackingUp}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isBackingUp ? 'Backing up...' : 'Back Up Now'}
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={handleExportChats}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/15 active:scale-98 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-neutral-300" />
                <span>Export Chat History</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {backupSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4" />
          <span>Chat backup completed successfully!</span>
        </div>
      )}

      {exportSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <Download className="w-4 h-4" />
          <span>Chat history export downloaded!</span>
        </div>
      )}
    </div>
  );
};
