// Web Notification & Audio Alert Engine for Desktop Browsers & Mobile Devices (PWA)

export type SoundType = 'notification' | 'message' | 'cartable' | 'alert' | 'success';

class NotificationSoundEngine {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('anbarmeh_sound_enabled');
      this.soundEnabled = stored !== null ? stored === 'true' : true;
    } catch {
      this.soundEnabled = true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('anbarmeh_sound_enabled', String(enabled));
    } catch {}
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Synthesize a pristine, crystal acoustic chime without relying on external mp3 assets
   */
  public play(type: SoundType = 'notification') {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'message') {
        // Soft double chirp for incoming chat message (D6 -> F#6)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1174.66, now); // D6
        osc1.frequency.exponentialRampToValueAtTime(1479.98, now + 0.08); // F#6

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(587.33, now);
        osc2.frequency.exponentialRampToValueAtTime(739.99, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
      } else if (type === 'cartable' || type === 'notification') {
        // Pleasant triple chime for cartable & system events (C6 -> E6 -> G6)
        const frequencies = [1046.50, 1318.51, 1567.98];
        frequencies.forEach((freq, idx) => {
          const startTime = now + (idx * 0.08);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.22, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.38);
        });
      } else if (type === 'alert') {
        // Warm dual-pulse alert for low stock or warnings
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(370, now + 0.12);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'success') {
        // Bright upward chime
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const startTime = now + (idx * 0.06);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }
}

export const soundEngine = new NotificationSoundEngine();

export interface BrowserNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  linkTab?: string;
  soundType?: SoundType;
  vibrate?: number[];
  silent?: boolean;
}

/**
 * Check if the current browser environment supports the Web Notification API
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission status ('granted', 'denied', 'default', or 'unsupported')
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      soundEngine.play('success');
      // Fire a welcome test notification
      sendNativeBrowserNotification('اعلان‌های AnbarMeh فعال شدند', {
        body: 'از این پس کلیه رویدادهای کارتابل، درخواست‌ها و پیام‌ها در مرورگر و موبایل شما اعلان خواهند شد.',
        soundType: 'success'
      });
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

// Global listener for tab navigation on notification click
let onNotificationClickCallback: ((tabId: string) => void) | null = null;

export function registerNotificationNavigationHandler(callback: (tabId: string) => void) {
  onNotificationClickCallback = callback;
}

/**
 * Send a native notification to the OS desktop / mobile notification center
 */
export function sendNativeBrowserNotification(
  title: string,
  options: BrowserNotificationOptions
): Notification | null {
  // 1. Always play audio chime if sound is enabled
  if (options.soundType !== undefined) {
    soundEngine.play(options.soundType);
  } else {
    soundEngine.play('notification');
  }

  // 2. Check if browser notification is supported and allowed
  if (!isBrowserNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notifOptions: NotificationOptions = {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || `anbarmeh-${Date.now()}`,
      silent: true, // we handle our own Web Audio chime
      data: {
        linkTab: options.linkTab,
        timestamp: Date.now()
      }
    };

    // Mobile vibration pattern if supported
    if (options.vibrate && 'vibrate' in navigator) {
      navigator.vibrate(options.vibrate);
    } else if ('vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    const notification = new Notification(title, notifOptions);

    notification.onclick = function (event) {
      event.preventDefault();
      try {
        window.focus();
      } catch {}

      if (options.linkTab && onNotificationClickCallback) {
        onNotificationClickCallback(options.linkTab);
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn('Native notification dispatch failed, fallback active:', err);
    return null;
  }
}
