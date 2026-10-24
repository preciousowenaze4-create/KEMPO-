import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Send,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { UserProfileData, AppPreferences } from '../../types';
import {
  getNotificationPermission,
  requestDeviceNotificationPermission,
  dispatchDeviceNotification,
  playNotificationChime,
} from '../../lib/deviceNotifications';
import { saveFullUserProfile } from '../../lib/supabase';

interface NotificationSettingsScreenProps {
  userProfile?: UserProfileData | null;
  onBack: () => void;
  onUpdatePreferences?: (prefs: AppPreferences) => void;
  onUpdateProfile?: (profile: UserProfileData) => void;
}

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({
  userProfile,
  onBack,
  onUpdatePreferences,
  onUpdateProfile,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  const [testSent, setTestSent] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Preference state
  const prefs = userProfile?.preferences || {
    inAppSounds: true,
    messageTones: true,
    gamingIntegration: true,
    darkTheme: true,
    deviceNotifications: true,
    groupAlerts: true,
    soundEffects: true,
    inAppBanners: true,
    lockScreenPreviews: true,
    vibrate: true,
  };

  const [deviceNotifications, setDeviceNotifications] = useState(prefs.deviceNotifications !== false);
  const [groupAlerts, setGroupAlerts] = useState(prefs.groupAlerts !== false);
  const [soundEffects, setSoundEffects] = useState(prefs.soundEffects !== false && prefs.messageTones !== false);
  const [inAppBanners, setInAppBanners] = useState(prefs.inAppBanners !== false);
  const [lockScreenPreviews, setLockScreenPreviews] = useState(prefs.lockScreenPreviews !== false);
  const [vibrate, setVibrate] = useState(prefs.vibrate !== false);

  useEffect(() => {
    const state = getNotificationPermission();
    setIsSupported(state.isSupported);
    setPermission(state.permission);
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestDeviceNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      dispatchDeviceNotification('Kempo Pro Notifications Active', {
        body: 'Real device push notifications are now enabled!',
        badgeCount: 1,
      });
    }
  };

  const handleSendTestNotification = () => {
    playNotificationChime('message');
    dispatchDeviceNotification('Kempo Pro Message', {
      body: 'Incoming message from Kempo Pro: Real device alert verified!',
      badgeCount: 1,
      silentSound: !soundEffects,
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
  };

  const handleSave = async () => {
    const updatedPrefs: AppPreferences = {
      ...prefs,
      deviceNotifications,
      groupAlerts,
      soundEffects,
      messageTones: soundEffects,
      inAppSounds: soundEffects,
      inAppBanners,
      lockScreenPreviews,
      vibrate,
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

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
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
        <h2 className="text-base font-bold text-white tracking-tight">Notifications</h2>
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold rounded-full transition shadow-md shadow-red-900/40 cursor-pointer"
        >
          Save
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Device Permission Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#181822] to-[#121218] border border-white/10 shadow-xl space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  permission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : permission === 'denied'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {permission === 'granted' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : permission === 'denied' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Device Push Permission</span>
                  <span
                    className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                      permission === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : permission === 'denied'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {permission}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {permission === 'granted'
                    ? 'Native device banners and sound alerts are enabled.'
                    : permission === 'denied'
                    ? 'Notifications are blocked in your browser settings. Enable them to get alerts.'
                    : 'Allow device notifications to receive alerts when outside the app.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {permission !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-500 active:scale-98 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 cursor-pointer"
              >
                <BellRing className="w-4 h-4" />
                <span>Request Device Permission</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={testSent}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/15 active:scale-98 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-white/15 cursor-pointer"
              >
                {testSent ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Alert Dispatched!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-red-400" />
                    <span>Send Test Notification Banner</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Message Notifications Group */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2">
            Message Alerts
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {/* Show Notifications */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Message Notifications</span>
                  <p className="text-xs text-neutral-400">Show notification banners for new direct messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={deviceNotifications}
                  onChange={(e) => setDeviceNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* Group Alerts */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Group Alerts</span>
                  <p className="text-xs text-neutral-400">Notifications for community and group messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupAlerts}
                  onChange={(e) => setGroupAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* In-App Banners */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">In-App Banners</span>
                  <p className="text-xs text-neutral-400">Slide-down previews while chatting in other tabs</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={inAppBanners}
                  onChange={(e) => setInAppBanners(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Audio & Haptic Feedback */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2">
            Sound & Haptics
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {/* Sound Effects */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  {soundEffects ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Sound Effects</span>
                  <p className="text-xs text-neutral-400">Authentic audio chimes for incoming messages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playNotificationChime('message')}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white/10 hover:bg-white/20 text-neutral-200 transition cursor-pointer"
                  title="Test Sound"
                >
                  Play
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundEffects}
                    onChange={(e) => setSoundEffects(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>

            {/* Vibrate */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Vibrate / Haptics</span>
                  <p className="text-xs text-neutral-400">Vibration pattern on mobile devices</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={vibrate}
                  onChange={(e) => setVibrate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* Lock Screen Previews */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Show Previews</span>
                  <p className="text-xs text-neutral-400">Display sender and message text in notifications</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockScreenPreviews}
                  onChange={(e) => setLockScreenPreviews(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-98 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-red-950/70 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Notification Preferences</span>
          </button>
        </div>
      </div>

      {/* Save Success Toast */}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4" />
          <span>Notification settings saved!</span>
        </div>
      )}
    </div>
  );
};
