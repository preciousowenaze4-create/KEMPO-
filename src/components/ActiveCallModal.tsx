import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  RotateCcw,
  User,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Chat } from '../types';
import { ringtoneManager } from '../lib/callSounds';

interface ActiveCallModalProps {
  chat: Chat | null;
  isVideo: boolean;
  callStatus?: 'Ringing...' | 'Connected' | 'Call Declined' | 'No Answer';
  onEndCall: () => void;
  onNoAnswer?: () => void;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  chat,
  isVideo,
  callStatus = 'Ringing...',
  onEndCall,
  onNoAnswer,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideo);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callState, setCallState] = useState<'Ringing...' | 'Connected' | 'Call Declined' | 'No Answer'>(callStatus);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isPipSwapped, setIsPipSwapped] = useState(false);

  // Sync external callStatus changes
  useEffect(() => {
    if (callStatus) {
      setCallState(callStatus);
      if (callStatus === 'Connected') {
        ringtoneManager.playConnectedTone();
      } else if (callStatus === 'Call Declined' || callStatus === 'No Answer') {
        ringtoneManager.playEndCallTone();
      }
    }
  }, [callStatus]);

  // Video and audio references
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize call & real media stream
  useEffect(() => {
    if (!chat) return;

    let activeStream: MediaStream | null = null;

    // Start authentic WhatsApp ringing tone if ringing
    if (callState === 'Ringing...') {
      ringtoneManager.startOutgoingTone();
    }

    // Request real user media (camera/mic)
    const initMedia = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: isVideo ? { facingMode } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        setMediaStream(stream);

        // Attach local stream to video element
        if (localVideoRef.current && isVideo) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        try {
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtxClass();
          audioContextRef.current = ctx;

          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
            }
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        } catch (e) {
          console.warn('Audio analyser notice:', e);
        }
      } catch (err: any) {
        console.warn('Media devices permission notice:', err.message);
        setPermissionError('Microphone or Camera access previewing in safe mode.');
      }
    };

    initMedia();

    // 25-second Ringing Timeout: If recipient doesn't answer, mark as No Answer
    let noAnswerTimer: any = null;
    if (callState === 'Ringing...') {
      noAnswerTimer = setTimeout(() => {
        setCallState('No Answer');
        ringtoneManager.playEndCallTone();
        onNoAnswer?.();
        setTimeout(() => {
          onEndCall();
        }, 2000);
      }, 25000);
    }

    // Call duration timer only increments when Connected
    const interval = setInterval(() => {
      setSeconds((prev) => (callState === 'Connected' ? prev + 1 : 0));
    }, 1000);

    return () => {
      if (noAnswerTimer) clearTimeout(noAnswerTimer);
      clearInterval(interval);
      ringtoneManager.stop();

      // Clean up media streams
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [chat, isVideo, callState]);

  // Flip camera (front vs rear)
  const handleFlipCamera = async () => {
    if (!mediaStream || !isVideo) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    try {
      // Stop old video tracks
      mediaStream.getVideoTracks().forEach((track) => track.stop());

      // Get new video stream with switched camera
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
      });

      const newTrack = newVideoStream.getVideoTracks()[0];
      if (newTrack) {
        mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
        mediaStream.addTrack(newTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
          localVideoRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Camera flip error:', err);
    }
  };

  // Toggle Microphone mute
  const handleToggleMute = () => {
    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted; // Toggle track
      });
    }
    setIsMuted(!isMuted);
  };

  // Toggle Video track on/off
  const handleToggleVideo = () => {
    if (mediaStream) {
      const videoTracks = mediaStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !isVideoOn;
      });
    }
    setIsVideoOn(!isVideoOn);
  };

  const handleEndCall = () => {
    ringtoneManager.playEndCallTone();
    if (callState === 'Ringing...') {
      onNoAnswer?.();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
    setTimeout(() => {
      onEndCall();
    }, 300);
  };

  if (!chat) return null;

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08080a] flex flex-col justify-between select-none animate-in fade-in overflow-hidden">
      {/* Background Ambience / Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black pointer-events-none z-10" />

      {/* Real Live Video Mode View */}
      {isVideo && isVideoOn ? (
        <div className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
          {/* Main Full-Screen Video (Local or Remote) */}
          <video
            ref={isPipSwapped ? remoteVideoRef : localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Floating Picture-in-Picture Self/Partner Camera */}
          <div
            onClick={() => setIsPipSwapped(!isPipSwapped)}
            className="absolute top-16 right-4 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-red-500/80 shadow-2xl z-30 bg-black cursor-pointer transition active:scale-95 group"
          >
            <video
              ref={isPipSwapped ? localVideoRef : remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* PiP Overlay badge */}
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white">
              {isPipSwapped ? 'Partner' : 'You'}
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition p-1 bg-black/50 rounded-full text-white">
              <Maximize2 className="w-3 h-3" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Top Header Bar */}
      <div className="relative z-20 pt-[max(env(safe-area-inset-top),20px)] px-6 flex flex-col items-center text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-neutral-800 text-[11px] text-neutral-300 font-medium mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>End-to-End Encrypted</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
          {chat.name}
        </h2>

        <p className="text-sm font-semibold text-neutral-300">
          {callState === 'Ringing...' ? (
            <span className="text-red-400 animate-pulse font-medium">Ringing...</span>
          ) : (
            <span className="text-emerald-400 font-mono tracking-wider">{formatTimer(seconds)}</span>
          )}
        </p>

        {permissionError && (
          <span className="text-[10px] text-amber-400/90 bg-amber-950/60 px-2 py-0.5 rounded-full mt-1">
            {permissionError}
          </span>
        )}
      </div>

      {/* Center Avatar & Audio Waveform (Active in Voice Call or Video Disabled) */}
      {(!isVideo || !isVideoOn) && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center my-6">
          <div className="relative flex items-center justify-center">
            {/* Audio Pulsing Waves that react to real microphone volume */}
            <div
              className="absolute w-48 h-48 rounded-full bg-red-600/20 transition-transform duration-75"
              style={{
                transform: `scale(${1 + (micVolume / 100) * 0.4})`,
                opacity: callState === 'Connected' ? 0.4 + (micVolume / 100) * 0.6 : 0.2,
              }}
            />
            <div
              className="absolute w-40 h-40 rounded-full bg-red-600/30 transition-transform duration-100"
              style={{
                transform: `scale(${1 + (micVolume / 100) * 0.25})`,
                opacity: callState === 'Connected' ? 0.6 + (micVolume / 100) * 0.4 : 0.3,
              }}
            />

            {/* Contact Large Avatar */}
            <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-red-600 shadow-2xl shadow-red-950/80 z-20 bg-neutral-900 flex items-center justify-center">
              {chat.avatarType === 'photo' && chat.avatarUrl ? (
                <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-black text-4xl"
                  style={{ backgroundColor: chat.avatarBg || '#1c1c1e' }}
                >
                  {chat.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Real Audio Volume Waveform Meter */}
          {callState === 'Connected' && (
            <div className="mt-8 flex items-center gap-1">
              {[40, 70, 100, 80, 50, 90, 60].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(6, (h * (micVolume + 15)) / 100)}px`,
                    opacity: 0.5 + (micVolume / 200),
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom WhatsApp Calling Action Dock */}
      <div className="relative z-20 pb-[max(env(safe-area-inset-bottom),25px)] px-6">
        <div className="w-full max-w-sm mx-auto p-4 rounded-3xl bg-[#141418]/90 backdrop-blur-xl border border-neutral-800 shadow-2xl flex items-center justify-between gap-3">
          {/* 1. Mute Button */}
          <button
            onClick={handleToggleMute}
            aria-label="Toggle mute"
            className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
              isMuted ? 'bg-white text-black' : 'bg-neutral-800 text-white hover:bg-neutral-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* 2. Video Toggle / Flip Camera */}
          {isVideo ? (
            <button
              onClick={handleFlipCamera}
              aria-label="Flip camera"
              className="w-12 h-12 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 flex items-center justify-center transition active:scale-90 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              aria-label="Speaker"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                isSpeakerOn ? 'bg-neutral-800 text-white' : 'bg-neutral-900 text-neutral-400'
              }`}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          )}

          {/* 3. Camera Toggle (if video call) */}
          {isVideo && (
            <button
              onClick={handleToggleVideo}
              aria-label="Toggle camera"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                !isVideoOn ? 'bg-white text-black' : 'bg-neutral-800 text-white hover:bg-neutral-700'
              }`}
            >
              {!isVideoOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* 4. End Call Button (Large WhatsApp Crimson Red) */}
          <button
            onClick={handleEndCall}
            aria-label="End call"
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-950 transition active:scale-90 cursor-pointer"
          >
            <PhoneOff className="w-6 h-6 stroke-[2.4]" />
          </button>
        </div>
      </div>
    </div>
  );
};
