// Kempo Pro Native Device Push Notifications & Sound Dispatcher

export interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
}

export function getNotificationPermission(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { isSupported: false, permission: 'denied' };
  }
  return {
    isSupported: true,
    permission: Notification.permission,
  };
}

export async function requestDeviceNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Play authentic Kempo Pro notification sound chime via Web Audio API
 */
export function playNotificationChime(type: 'message' | 'alert' | 'success' = 'message') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'message') {
      // Pleasant two-tone chime (F#5 to A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(740, ctx.currentTime); // F#5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1108, ctx.currentTime + 0.18); // C#6

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime + 0.05);
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } else if (type === 'alert') {
      // Urgent triple pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Success soft chord
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn('Audio chime playback note:', e);
  }
}

/**
 * Trigger a real native device push notification alert with badge, sound, and vibration
 */
export async function dispatchDeviceNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    badgeCount?: number;
    silentSound?: boolean;
    vibrate?: boolean;
    chatId?: string;
  }
) {
  if (typeof window === 'undefined') return;

  // 1. Play in-app audio chime if allowed
  if (!options?.silentSound) {
    playNotificationChime('message');
  }

  // 2. Hardware vibration if on mobile device
  if (options?.vibrate !== false && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {}
  }

  // 3. Update browser app badge if supported (PWA on desktop & mobile)
  if (options?.badgeCount !== undefined && 'setAppBadge' in navigator) {
    try {
      if (options.badgeCount > 0) {
        (navigator as any).setAppBadge(options.badgeCount);
      } else {
        (navigator as any).clearAppBadge();
      }
    } catch {}
  }

  // 4. Update document title for background tabs
  if (typeof document !== 'undefined') {
    const originalTitle = document.title.replace(/^\(\d+\)\s*/, '');
    if (options?.badgeCount && options.badgeCount > 0) {
      document.title = `(${options.badgeCount}) ${originalTitle}`;
    }
  }

  // 5. In-app floating banner event for when user is actively inside the app
  try {
    const event = new CustomEvent('kempo-inapp-banner', {
      detail: {
        title,
        body: options?.body || 'New message on Kempo Pro',
        icon: options?.icon || '/pwa-192x192.png',
        chatId: options?.chatId,
      },
    });
    window.dispatchEvent(event);
  } catch {}

  // 6. Trigger real system / native device push notification banner
  if ('Notification' in window && Notification.permission === 'granted') {
    const notifOptions = {
      body: options?.body || 'New message on Kempo Pro',
      icon: options?.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: options?.tag || 'kempo-message',
      silent: false,
    };

    // If service worker is active, use service worker showNotification for superior background delivery
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, notifOptions);
          return;
        }
      } catch (e) {
        console.warn('SW notification fallback to Notification constructor:', e);
      }
    }

    // Direct Notification API
    try {
      const notification = new Notification(title, notifOptions);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.warn('Notification display note:', err);
    }
  }
}
