import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC1tEq-z5rcFpMHdcF5-7M_banZ1aWpPTU",
  authDomain: "plnexc-coach.firebaseapp.com",
  projectId: "plnexc-coach",
  storageBucket: "plnexc-coach.firebasestorage.app",
  messagingSenderId: "91600480672",
  appId: "1:91600480672:web:6f35122862ca8f1885dcc5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
