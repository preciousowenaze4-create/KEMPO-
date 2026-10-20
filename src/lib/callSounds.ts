// WhatsApp Call Sound Synthesizer using Web Audio API
// Generates authentic WhatsApp dialing, ringing, incoming call melody, and end-call tones

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export class WhatsAppRingtoneManager {
  private intervalId: any = null;
  private isPlaying = false;

  // Play authentic WhatsApp outgoing call tone (425Hz beep... beep...)
  startOutgoingTone() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const playBeep = () => {
      try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.35);
      } catch (e) {}
    };

    playBeep();
    this.intervalId = setInterval(playBeep, 3200);
  }

  // Play authentic WhatsApp incoming call ringtone melody
  startIncomingRingtone() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([400, 250, 400, 250, 800, 400]);
    }

    const notes = [
      { f: 523.25, d: 0.12, t: 0 },    // C5
      { f: 659.25, d: 0.12, t: 0.14 }, // E5
      { f: 783.99, d: 0.14, t: 0.28 }, // G5
      { f: 1046.5, d: 0.22, t: 0.44 }, // C6
      { f: 880.00, d: 0.16, t: 0.72 }, // A5
      { f: 783.99, d: 0.24, t: 0.92 }, // G5
      { f: 659.25, d: 0.18, t: 1.20 }, // E5
      { f: 523.25, d: 0.28, t: 1.42 }, // C5
    ];

    const playPattern = () => {
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        notes.forEach(({ f, d, t }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle'; // Rich marimba-like acoustic chime
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0, now + t);
          gain.gain.linearRampToValueAtTime(0.28, now + t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + d + 0.05);
        });
      } catch (e) {}
    };

    playPattern();
    this.intervalId = setInterval(playPattern, 2400);
  }

  // Play call connected chime
  playConnectedTone() {
    this.stop();
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // Play call ended tone
  playEndCallTone() {
    this.stop();
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const ringtoneManager = new WhatsAppRingtoneManager();
