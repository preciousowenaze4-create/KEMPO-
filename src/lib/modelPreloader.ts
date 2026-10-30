import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let preloadedGLTF: any = null;
let loadPromise: Promise<any> | null = null;
const listeners = new Set<(gltf: any) => void>();

export const AVATAR_MODEL_URL = '/blender_sushi_virtual_journal_16th_april_2020.glb';

export function preloadAvatarModel(): Promise<any> {
  if (preloadedGLTF) {
    return Promise.resolve(preloadedGLTF);
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      AVATAR_MODEL_URL,
      (gltf) => {
        preloadedGLTF = gltf;
        listeners.forEach((cb) => {
          try {
            cb(gltf);
          } catch {}
        });
        listeners.clear();
        resolve(gltf);
      },
      undefined,
      (err) => {
        console.warn('Preload avatar notice:', err);
        reject(err);
      }
    );
  });

  return loadPromise;
}

export function getPreloadedAvatar(): any | null {
  return preloadedGLTF;
}

export function onAvatarLoaded(cb: (gltf: any) => void): () => void {
  if (preloadedGLTF) {
    cb(preloadedGLTF);
    return () => {};
  }
  listeners.add(cb);
  preloadAvatarModel();
  return () => {
    listeners.delete(cb);
  };
}

// Automatically trigger preload when the module is imported
if (typeof window !== 'undefined') {
  setTimeout(() => {
    preloadAvatarModel().catch(() => {});
  }, 50);
}
