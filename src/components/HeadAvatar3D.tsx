import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sparkles, Loader2 } from 'lucide-react';

interface HeadAvatar3DProps {
  isSpeaking: boolean;
  isGenerating?: boolean;
  speakingText?: string;
  className?: string;
}

export const HeadAvatar3D: React.FC<HeadAvatar3DProps> = ({
  isSpeaking,
  isGenerating = false,
  speakingText = '',
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // References to keep mutable state across frames without tearing down the WebGL canvas
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;

  const generatingRef = useRef(isGenerating);
  generatingRef.current = isGenerating;

  const textRef = useRef(speakingText);
  textRef.current = speakingText;

  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId = 0;
    let isDisposed = false;

    // Detect software WebGL to balance visual fidelity and performance
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Scene & Camera Setup
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 180;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 50);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.appendChild(renderer.domElement);

    // 2. Studio Lighting Rig tailored for the 3D Head model
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1f1f2e, 1.5);
    scene.add(hemiLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(2, 3, 3);
    scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xffcccc, 1.2);
    fillLight.position.set(-2.5, 1, 2);
    scene.add(fillLight);

    // Kempo Pro Crimson Rim Light for stylish edge highlight
    const rimLight = new THREE.DirectionalLight(0xef4444, 2.2);
    rimLight.position.set(0, 2.5, -3);
    scene.add(rimLight);

    // 3. Load ONLY the designated 3D model
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    let mixer: THREE.AnimationMixer | null = null;
    let baseAction: THREE.AnimationAction | null = null;
    let morphMesh: THREE.Mesh | null = null;
    let jawMorphIndices: number[] = [];

    const loader = new GLTFLoader();
    const modelUrl = '/blender_sushi_virtual_journal_16th_april_2020.glb';

    loader.load(
      modelUrl,
      (gltf) => {
        if (isDisposed) return;

        const model = gltf.scene;

        // Auto-center and normalize bounds
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center model inside our pivot group
        model.position.set(-center.x, -center.y, -center.z);
        rootGroup.add(model);

        // Position camera to frame the head avatar naturally
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraDistance = (maxDim / 2 / Math.tan(fov / 2)) * 1.35;
        camera.position.set(0, 0, Math.max(cameraDistance, 0.45));
        camera.lookAt(0, 0, 0);

        // Find morph targets for lip-sync & speech animation
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => {
                  m.depthWrite = true;
                });
              } else {
                mesh.material.depthWrite = true;
              }
            }
            if (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0) {
              morphMesh = mesh;
              // Detect blendshape indices
              const dict = mesh.morphTargetDictionary || {};
              const keys = Object.keys(dict);

              if (keys.length > 0) {
                keys.forEach((key) => {
                  const lower = key.toLowerCase();
                  if (
                    lower.includes('jaw') ||
                    lower.includes('mouth') ||
                    lower.includes('open') ||
                    lower.includes('funnel') ||
                    lower.includes('pucker')
                  ) {
                    jawMorphIndices.push(dict[key]);
                  }
                });
              }

              // Fallback to primary morph target indices (typically 0, 1, 2 for facial rigs)
              if (jawMorphIndices.length === 0) {
                jawMorphIndices = [0, 1, 2].filter((i) => i < mesh.morphTargetInfluences!.length);
              }
            }
          }
        });

        // Initialize Animation Mixer if animations exist
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          baseAction = mixer.clipAction(gltf.animations[0]);
          baseAction.setEffectiveTimeScale(0.8);
          baseAction.setEffectiveWeight(0.65);
          baseAction.play();
        }

        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load 3D head avatar GLB:', err);
        setLoadError('3D avatar model loaded with notice');
        setIsLoading(false);
      }
    );

    // Pointer move listener for interactive head turning
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = (e.clientX - rect.left) / rect.width;
      const clientY = (e.clientY - rect.top) / rect.height;

      mousePosRef.current.targetX = (clientX - 0.5) * 0.45;
      mousePosRef.current.targetY = -(clientY - 0.5) * 0.35;
    };

    window.addEventListener('pointermove', handlePointerMove);

    // 4. Render & Motion Loop with real-time lip sync
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update base skeletal/morph animation mixer
      if (mixer) {
        mixer.update(delta);
      }

      // Smooth pointer tracking interpolation
      mousePosRef.current.x = THREE.MathUtils.damp(
        mousePosRef.current.x,
        mousePosRef.current.targetX,
        5,
        delta
      );
      mousePosRef.current.y = THREE.MathUtils.damp(
        mousePosRef.current.y,
        mousePosRef.current.targetY,
        5,
        delta
      );

      const isSpeakingActive = speakingRef.current;
      const isGeneratingActive = generatingRef.current;

      // Real-time Motion & Lip-Sync Behavior
      if (isSpeakingActive) {
        // High-energy conversational motion
        const speechIntensity = Math.abs(Math.sin(elapsed * 14)) * 0.6 + Math.abs(Math.sin(elapsed * 8.5)) * 0.4;
        const speechJaw = Math.min(1, Math.max(0, speechIntensity * 0.85));

        // Modulate morph targets for mouth speaking opening/closing
        if (morphMesh && morphMesh.morphTargetInfluences) {
          jawMorphIndices.forEach((idx, i) => {
            const mult = i === 0 ? 1 : 0.6;
            morphMesh!.morphTargetInfluences![idx] = THREE.MathUtils.damp(
              morphMesh!.morphTargetInfluences![idx],
              speechJaw * mult,
              22,
              delta
            );
          });
        }

        // Animated head nods and tilts corresponding to speech cadence
        const speechPitch = Math.sin(elapsed * 6.5) * 0.08 + Math.sin(elapsed * 12) * 0.03;
        const speechYaw = Math.sin(elapsed * 3.2) * 0.12;
        const speechRoll = Math.sin(elapsed * 2.8) * 0.04;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          speechPitch + mousePosRef.current.y,
          8,
          delta
        );
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          speechYaw + mousePosRef.current.x,
          8,
          delta
        );
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, speechRoll, 8, delta);

        // Subtle forward-leaning engagement
        rootGroup.position.z = THREE.MathUtils.damp(rootGroup.position.z, 0.03, 4, delta);
      } else if (isGeneratingActive) {
        // Thinking / retrieving answer mode: slight contemplative head tilt and upward gaze
        const thinkingYaw = Math.sin(elapsed * 1.5) * 0.1;
        const thinkingPitch = 0.08 + Math.sin(elapsed * 2) * 0.03;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          thinkingPitch + mousePosRef.current.y * 0.4,
          4,
          delta
        );
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          thinkingYaw + mousePosRef.current.x * 0.4,
          4,
          delta
        );
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, -0.04, 4, delta);

        // Mouth closed during thinking
        if (morphMesh && morphMesh.morphTargetInfluences) {
          jawMorphIndices.forEach((idx) => {
            morphMesh!.morphTargetInfluences![idx] = THREE.MathUtils.damp(
              morphMesh!.morphTargetInfluences![idx],
              0,
              12,
              delta
            );
          });
        }
      } else {
        // Idle mode: calm breathing sway and subtle eye/head tracking
        const idlePitch = Math.sin(elapsed * 1.2) * 0.03;
        const idleYaw = Math.sin(elapsed * 0.7) * 0.04;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          idlePitch + mousePosRef.current.y,
          4,
          delta
        );
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          idleYaw + mousePosRef.current.x,
          4,
          delta
        );
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, 0, 4, delta);
        rootGroup.position.z = THREE.MathUtils.damp(rootGroup.position.z, 0, 4, delta);

        // Smoothly close mouth when idle
        if (morphMesh && morphMesh.morphTargetInfluences) {
          jawMorphIndices.forEach((idx) => {
            morphMesh!.morphTargetInfluences![idx] = THREE.MathUtils.damp(
              morphMesh!.morphTargetInfluences![idx],
              0,
              12,
              delta
            );
          });
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 5. Handle Resize
    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);

      if (mixer) {
        mixer.stopAllAction();
      }

      try {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      } catch {}
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden select-none ${className}`}>
      {/* Background Tech Glow & Crimson Atmosphere Ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-36 h-36 rounded-full transition-all duration-700 blur-2xl opacity-60 ${
            isSpeaking
              ? 'bg-red-600/50 scale-125 animate-pulse'
              : isGenerating
              ? 'bg-purple-600/40 scale-110'
              : 'bg-red-800/30 scale-95'
          }`}
        />
        <div className="absolute w-28 h-28 rounded-full border border-red-500/25 ring-1 ring-red-500/10 pointer-events-none" />
      </div>

      {/* 3D Canvas Mounting Node */}
      <div ref={mountRef} className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#161619]/80 backdrop-blur-xs text-xs text-neutral-400 gap-1.5">
          <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
          <span className="text-[11px] font-medium text-neutral-300">Loading 3D Avatar...</span>
        </div>
      )}

      {/* Active State Pill */}
      <div className="absolute bottom-1 z-20 pointer-events-none">
        <div
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 border shadow-lg transition-colors ${
            isSpeaking
              ? 'bg-red-950/80 text-red-300 border-red-600/60 shadow-red-950/80'
              : isGenerating
              ? 'bg-purple-950/80 text-purple-300 border-purple-600/60'
              : 'bg-black/60 text-neutral-400 border-neutral-800'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSpeaking ? 'bg-red-400 animate-ping' : isGenerating ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          {isSpeaking ? 'Speaking' : isGenerating ? 'Thinking...' : 'AI Ready'}
        </div>
      </div>
    </div>
  );
};
