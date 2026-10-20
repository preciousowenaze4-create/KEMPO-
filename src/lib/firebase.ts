import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: The app will break without passing firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or connecting...');
    }
  }
}
testConnection();

// Save user details to Firestore
export async function saveUserProfile(user: FirebaseUser) {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Kempo User',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Could not save user profile to Firestore:', error);
  }
}

// Real Email Sign Up
export async function firebaseSignUp(email: string, pass: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  await saveUserProfile(userCredential.user);
  return userCredential.user;
}

// Real Email Sign In
export async function firebaseSignIn(email: string, pass: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  await saveUserProfile(userCredential.user);
  return userCredential.user;
}

// Real Google Login
export async function firebaseSignInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserProfile(result.user);
    return result.user;
  } catch (err: any) {
    // If popup was blocked or iframe restriction occurs, try redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      console.info('Retrying with redirect flow...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

// Retrieve user session after mobile OAuth redirect
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await saveUserProfile(result.user);
      return result.user;
    }
  } catch (err) {
    console.warn('Redirect result check:', err);
  }
  return null;
}

// Real Sign Out
export async function firebaseSignOut() {
  await fbSignOut(auth);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kempo_auth_user');
    localStorage.removeItem('kempo_auth_name');
  }
}
