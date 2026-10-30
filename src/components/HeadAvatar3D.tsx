import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getPreloadedAvatar, onAvatarLoaded } from '../lib/modelPreloader';

interface HeadAvatar3DProps {
  isSpeaking: boolean;
  isGenerating?: boolean;
  speakingText?: string;
  speechEnergy?: number;
  className?: string;
}

export const HeadAvatar3D: React.FC<HeadAvatar3DProps> = ({
  isSpeaking,
  isGenerating = false,
  speakingText = '',
  speechEnergy = 0,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to keep mutable state across frames without tearing down the WebGL canvas
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;

  const generatingRef = useRef(isGenerating);
  generatingRef.current = isGenerating;

  const speechEnergyRef = useRef(speechEnergy);
  speechEnergyRef.current = speechEnergy;

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
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 50);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1f1f2e, 1.6);
    scene.add(hemiLight);

    // Key Light directly illuminating the face
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(1.5, 2.5, 3.5);
    scene.add(keyLight);

    // Fill Light from the side
    const fillLight = new THREE.DirectionalLight(0xffdddd, 1.3);
    fillLight.position.set(-2.5, 1, 2.5);
    scene.add(fillLight);

    // Kempo Pro Crimson Rim Light for stylish edge highlight
    const rimLight = new THREE.DirectionalLight(0xef4444, 2.4);
    rimLight.position.set(0, 2.5, -3);
    scene.add(rimLight);

    // 3. Avatar Rig Group (with base pitch compensation so head looks directly at user)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Base pitch offset to compensate for Blender model/animation tilt (-90 degrees on X)
    // Ensures head faces directly forward towards the camera and looks straight at the user
    const BASE_PITCH_OFFSET = -1.55;
    rootGroup.rotation.x = BASE_PITCH_OFFSET;

    let mixer: THREE.AnimationMixer | null = null;
    let baseAction: THREE.AnimationAction | null = null;
    let morphMesh: THREE.Mesh | null = null;
    let jawMorphIndices: number[] = [];

    // Helper to setup parsed GLTF model
    const setupModel = (gltf: any) => {
      if (isDisposed) return;

      // Clone scene if needed to allow independent instances
      const model = gltf.scene;

      // Auto-center and normalize bounds
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Center model inside pivot group
      model.position.set(-center.x, -center.y, -center.z);
      rootGroup.add(model);

      // Position camera to frame the head avatar looking right at the user
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraDistance = (maxDim / 2 / Math.tan(fov / 2)) * 1.3;
      camera.position.set(0, 0, Math.max(cameraDistance, 0.42));
      camera.lookAt(0, 0, 0);

      // Find morph targets for lip-sync & speech animation
      model.traverse((child: any) => {
        if (child.isMesh) {
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

            if (jawMorphIndices.length === 0) {
              jawMorphIndices = [0, 1, 2].filter((i) => i < mesh.morphTargetInfluences!.length);
            }
          }
        }
      });

      // Initialize Animation Mixer
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        baseAction = mixer.clipAction(gltf.animations[0]);
        baseAction.setEffectiveTimeScale(0.75);
        baseAction.setEffectiveWeight(0.6);
        baseAction.play();
      }
    };

    // Instant check or subscribe
    const immediate = getPreloadedAvatar();
    if (immediate) {
      setupModel(immediate);
    } else {
      const unsub = onAvatarLoaded((gltf) => {
        setupModel(gltf);
      });
      // Safety cleanup if unmounted before load
      const origDispose = isDisposed;
      if (origDispose) unsub();
    }

    // Pointer move listener for interactive head tracking
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = (e.clientX - rect.left) / rect.width;
      const clientY = (e.clientY - rect.top) / rect.height;

      mousePosRef.current.targetX = (clientX - 0.5) * 0.4;
      mousePosRef.current.targetY = -(clientY - 0.5) * 0.25;
    };

    window.addEventListener('pointermove', handlePointerMove);

    // 4. Render & Motion Loop with real-time lip sync
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update base animation mixer
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
      const currentEnergy = speechEnergyRef.current;

      // Real-time Motion & Lip-Sync Behavior
      if (isSpeakingActive) {
        // High-precision syllable & speech cadence modulation
        const syllableWave =
          Math.abs(Math.sin(elapsed * 16)) * 0.55 +
          Math.abs(Math.sin(elapsed * 9.5)) * 0.35 +
          0.1;
        const combinedEnergy = currentEnergy > 0 ? currentEnergy * 0.7 + syllableWave * 0.3 : syllableWave;
        const speechJaw = Math.min(1, Math.max(0, combinedEnergy * 0.85));

        // Move mouth/jaw morph targets in exact sync with speech
        if (morphMesh && morphMesh.morphTargetInfluences) {
          jawMorphIndices.forEach((idx, i) => {
            const mult = i === 0 ? 1 : 0.65;
            morphMesh!.morphTargetInfluences![idx] = THREE.MathUtils.damp(
              morphMesh!.morphTargetInfluences![idx],
              speechJaw * mult,
              24,
              delta
            );
          });
        }

        // Natural head nods and conversational tilt while maintaining eye contact
        const speechPitch = Math.sin(elapsed * 6.5) * 0.06 + Math.sin(elapsed * 12) * 0.025;
        const speechYaw = Math.sin(elapsed * 3.2) * 0.09;
        const speechRoll = Math.sin(elapsed * 2.8) * 0.03;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          BASE_PITCH_OFFSET + speechPitch + mousePosRef.current.y,
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
        rootGroup.position.z = THREE.MathUtils.damp(rootGroup.position.z, 0.02, 4, delta);
      } else if (isGeneratingActive) {
        // Contemplative thinking mode: gentle gaze upward and slight thinking tilt
        const thinkingYaw = Math.sin(elapsed * 1.5) * 0.08;
        const thinkingPitch = 0.06 + Math.sin(elapsed * 2) * 0.025;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          BASE_PITCH_OFFSET + thinkingPitch + mousePosRef.current.y * 0.4,
          4,
          delta
        );
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          thinkingYaw + mousePosRef.current.x * 0.4,
          4,
          delta
        );
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, -0.03, 4, delta);

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
        // Calm idle mode: looking straight ahead at user with subtle natural breathing
        const idlePitch = Math.sin(elapsed * 1.2) * 0.025;
        const idleYaw = Math.sin(elapsed * 0.7) * 0.035;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          BASE_PITCH_OFFSET + idlePitch + mousePosRef.current.y,
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

      {/* 3D Canvas Mounting Node - Instant 0ms render without spinner */}
      <div ref={mountRef} className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing" />

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
