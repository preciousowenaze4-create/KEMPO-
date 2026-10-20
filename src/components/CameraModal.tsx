import React, { useRef, useState, useEffect } from 'react';
import { X, Camera as CameraIcon, RefreshCw, Send, Check } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCapturedImage(null);
      return;
    }

    let isMounted = true;
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (isMounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }
      } catch (err) {
        console.warn('Camera permission denied or camera not accessible, using simulation mode', err);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleTakePhoto = () => {
    if (videoRef.current && stream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        return;
      }
    }
    // Fallback snap
    setCapturedImage('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80');
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 select-none animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/60 text-white hover:bg-neutral-800"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm font-semibold tracking-wide text-neutral-300">
          KEMPO CAMERA
        </span>
        <button
          onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
          className="p-2 rounded-full bg-black/60 text-white hover:bg-neutral-800"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 flex items-center justify-center my-4 relative rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 mx-auto flex items-center justify-center">
              <CameraIcon className="w-8 h-8" />
            </div>
            <p className="text-white text-base font-semibold">Camera Ready</p>
            <p className="text-neutral-400 text-xs max-w-xs">
              Tap the shutter below to take a photo or status snap for KEMPO PRo.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Shutter / Controls */}
      <div className="flex items-center justify-center gap-6 pb-6 z-10">
        {capturedImage ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCapturedImage(null)}
              className="px-5 py-2.5 rounded-full bg-neutral-800 text-white text-sm font-semibold hover:bg-neutral-700"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-red-950"
            >
              <Send className="w-4 h-4" />
              Share to Status / Chat
            </button>
          </div>
        ) : (
          <button
            onClick={handleTakePhoto}
            aria-label="Take Photo"
            className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-90 transition"
          >
            <div className="w-full h-full rounded-full bg-red-600 hover:bg-red-500 transition shadow-inner"></div>
          </button>
        )}
      </div>
    </div>
  );
};
