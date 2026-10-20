import React, { useState, useRef, useEffect } from 'react';
import { Mic, Pause, Play, Trash2, Send, RotateCcw } from 'lucide-react';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
}) => {
  // Mode: 'recording' | 'paused' | 'review'
  const [mode, setMode] = useState<'recording' | 'paused' | 'review'>('recording');
  const [seconds, setSeconds] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Start recording on mount
  useEffect(() => {
    let streamRef: MediaStream | null = null;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewAudioUrl(url);
          setMode('review');
        };

        mediaRecorder.start(100);
        setMode('recording');

        timerRef.current = setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.warn('Microphone recording error:', err);
        onCancel();
      }
    };

    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef) {
        streamRef.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Pause / Resume recording
  const handleTogglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (mode === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setMode('paused');
    } else if (mode === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
      setMode('recording');
    }
  };

  // Stop recording and switch to Preview / Review mode
  const handleFinishRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  // Play / Pause preview audio
  const handleTogglePlayPreview = () => {
    if (!previewAudioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(previewAudioUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPreviewProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewProgress(0);
      };
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().catch(() => {});
      setIsPlayingPreview(true);
    }
  };

  // Discard & Delete Voice Note
  const handleDelete = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    onCancel();
  };

  // Send Voice Note
  const handleSend = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    if (recordedBlob) {
      onSendVoiceNote(recordedBlob, Math.max(1, seconds));
    } else if (mediaRecorderRef.current) {
      // If user tapped send directly while still recording
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onSendVoiceNote(blob, Math.max(1, seconds));
      };
      handleFinishRecording();
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex items-center justify-between bg-[#161619] border border-red-700/60 rounded-2xl px-3 py-2 animate-in slide-in-from-bottom-2 shadow-xl shadow-red-950/40">
      {/* Review Mode: User can play, pause, test sound, delete, or send */}
      {mode === 'review' ? (
        <div className="flex-1 flex items-center justify-between gap-3">
          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete voice note"
            className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-red-400 flex items-center justify-center transition active:scale-90 cursor-pointer"
            title="Delete voice note"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Audio Preview Player */}
          <div className="flex-1 flex items-center gap-2.5 px-2 py-1 rounded-xl bg-neutral-900 border border-neutral-800">
            <button
              type="button"
              onClick={handleTogglePlayPreview}
              className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md transition active:scale-90 cursor-pointer"
            >
              {isPlayingPreview ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
            </button>

            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${previewProgress}%` }}
              />
            </div>

            <span className="text-[11px] font-mono font-bold text-neutral-300">
              {formatTime(seconds)}
            </span>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            aria-label="Send voice note"
            className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-950 transition active:scale-95 cursor-pointer"
            title="Send voice note"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      ) : (
        /* Recording / Paused Mode */
        <div className="flex-1 flex items-center justify-between gap-3">
          {/* Left: Delete & Recording Status */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDelete}
              className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-red-400 flex items-center justify-center transition active:scale-90 cursor-pointer"
              title="Cancel & Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${mode === 'recording' ? 'bg-red-500 animate-ping' : 'bg-amber-400'}`} />
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                {formatTime(seconds)}
              </span>
              <span className="text-[11px] text-neutral-400 hidden sm:inline">
                {mode === 'recording' ? 'Recording...' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Center: Live Waveform Bars */}
          <div className="flex items-center gap-0.5 h-6">
            {[40, 70, 100, 60, 30, 85, 95, 50, 80, 45, 90, 65].map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-all ${
                  mode === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'
                }`}
                style={{ height: `${mode === 'recording' ? (h * 20) / 100 : 6}px` }}
              />
            ))}
          </div>

          {/* Right: Pause/Resume, Stop for Preview, or Send */}
          <div className="flex items-center gap-2">
            {/* Pause / Resume Button */}
            <button
              type="button"
              onClick={handleTogglePause}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                mode === 'paused'
                  ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
              }`}
              title={mode === 'paused' ? 'Resume recording' : 'Pause recording'}
            >
              {mode === 'paused' ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden sm:inline">{mode === 'paused' ? 'Resume' : 'Pause'}</span>
            </button>

            {/* Finish & Listen Preview Button */}
            <button
              type="button"
              onClick={handleFinishRecording}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition active:scale-95"
              title="Stop & Review voice note"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px]">Review</span>
            </button>

            {/* Direct Send */}
            <button
              type="button"
              onClick={handleSend}
              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-950 transition active:scale-95 cursor-pointer"
              title="Send"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
