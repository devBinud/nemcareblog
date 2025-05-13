// src/firebase/Firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBSUmDJ44ZDTHvQkOk_XWzlFFpl9_mjS80",
  authDomain: "nemcareblog.firebaseapp.com",
  projectId: "nemcareblog",
  storageBucket: "nemcareblog.appspot.com",
  messagingSenderId: "73415584981",
  appId: "1:73415584981:web:a294439e45a31f14bf465c"
};

const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
