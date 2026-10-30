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
    // 35 degree FOV for crisp portrait perspective without wide-angle fish-eye distortion
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 50);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // 2. Studio Lighting Rig tailored for the 3D Head model
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222230, 1.6);
    scene.add(hemiLight);

    // Key Light directly illuminating face features
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(1.5, 2.5, 3.5);
    scene.add(keyLight);

    // Fill Light for soft cheek & eye shadows
    const fillLight = new THREE.DirectionalLight(0xffdddd, 1.4);
    fillLight.position.set(-2.5, 1, 2.5);
    scene.add(fillLight);

    // Kempo Pro Crimson Rim Light for stylish edge highlight
    const rimLight = new THREE.DirectionalLight(0xef4444, 2.6);
    rimLight.position.set(0, 2.5, -3);
    scene.add(rimLight);

    // 3. Avatar Pivot Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    let morphMesh: THREE.Mesh | null = null;
    let jawMorphIndices: number[] = [];

    // Helper to setup parsed GLTF model
    const setupModel = (gltf: any) => {
      if (isDisposed) return;

      const model = gltf.scene;

      // In rest pose without the journal animation track, rotation [0, 0, 0] gives:
      // - Eyes and face pointing directly toward the camera (+Z)
      // - Upright orientation with top of skull pointing up (+Y) and chin down (-Y)
      // - Left and right eyes correctly aligned horizontally
      model.rotation.set(0, 0, 0);
      model.updateMatrixWorld(true);

      // Auto-center the head based on bounding box
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());

      // Center model exactly inside pivot group
      model.position.set(-center.x, -center.y, -center.z);
      rootGroup.add(model);

      // Position camera centered on the face features (eyes and nose level) with close portrait framing
      camera.position.set(0, 0.045, 0.35);
      camera.lookAt(0, 0.045, 0);

      // Find morph targets for speech animation & lip-sync
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
    };

    // Instant preloaded model check or subscribe for 0ms load
    const immediate = getPreloadedAvatar();
    if (immediate) {
      setupModel(immediate);
    } else {
      const unsub = onAvatarLoaded((gltf) => {
        setupModel(gltf);
      });
      if (isDisposed) unsub();
    }

    // Pointer move listener for interactive head tracking
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = (e.clientX - rect.left) / rect.width;
      const clientY = (e.clientY - rect.top) / rect.height;

      mousePosRef.current.targetX = (clientX - 0.5) * 0.32;
      mousePosRef.current.targetY = -(clientY - 0.5) * 0.2;
    };

    window.addEventListener('pointermove', handlePointerMove);

    // 4. Render & Motion Loop with real-time lip sync & eye contact
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

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
        // High-precision syllable cadence modulation
        const syllableWave =
          Math.abs(Math.sin(elapsed * 16)) * 0.55 +
          Math.abs(Math.sin(elapsed * 9.5)) * 0.35 +
          0.1;
        const combinedEnergy = currentEnergy > 0 ? currentEnergy * 0.7 + syllableWave * 0.3 : syllableWave;
        const speechJaw = Math.min(1, Math.max(0, combinedEnergy * 0.85));

        // Move mouth/jaw morph targets in sync with speech
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

        // Natural conversational head nods while keeping eyes looking directly at the user
        const speechPitch = Math.sin(elapsed * 6.5) * 0.03 + Math.sin(elapsed * 12) * 0.01;
        const speechYaw = Math.sin(elapsed * 3.2) * 0.035;
        const speechRoll = Math.sin(elapsed * 2.8) * 0.015;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          speechPitch + mousePosRef.current.y * 0.4,
          8,
          delta
        );
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          speechYaw + mousePosRef.current.x * 0.4,
          8,
          delta
        );
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, speechRoll, 8, delta);
        rootGroup.position.z = THREE.MathUtils.damp(rootGroup.position.z, 0.01, 4, delta);
      } else if (isGeneratingActive) {
        // Subtle contemplative state while keeping eye contact
        const thinkingYaw = Math.sin(elapsed * 1.5) * 0.03;
        const thinkingPitch = Math.sin(elapsed * 2) * 0.015;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          thinkingPitch + mousePosRef.current.y * 0.25,
          4,
          delta
        );
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          thinkingYaw + mousePosRef.current.x * 0.25,
          4,
          delta
        );
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, 0, 4, delta);

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
        const idlePitch = Math.sin(elapsed * 1.2) * 0.012;
        const idleYaw = Math.sin(elapsed * 0.7) * 0.015;

        rootGroup.rotation.x = THREE.MathUtils.damp(
          rootGroup.rotation.x,
          idlePitch + mousePosRef.current.y * 0.3,
          4,
          delta
        );
        rootGroup.rotation.y = THREE.MathUtils.damp(
          rootGroup.rotation.y,
          idleYaw + mousePosRef.current.x * 0.3,
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
