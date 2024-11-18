import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCTxTCkym26FEJ9Ts1UycR4TRxiGLVBiPQ",
  authDomain: "flash-code-e5c7b.firebaseapp.com",
  projectId: "flash-code-e5c7b",
  storageBucket: "flash-code-e5c7b.firebasestorage.app",
  messagingSenderId: "516767196697",
  appId: "1:516767196697:web:b4fa792b271b14c70e2c88",
  measurementId: "G-SLZP48H5XB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.log('Persistence not supported by browser');
    }
  });

export { auth, db };
export default app;
