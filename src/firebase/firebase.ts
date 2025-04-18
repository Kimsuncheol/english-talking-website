// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCWpTN1e2edBi8v-AXMjWI9sEuyOgVe6O8",
  authDomain: "english-talking-website.firebaseapp.com",
  projectId: "english-talking-website",
  storageBucket: "english-talking-website.firebasestorage.app",
  messagingSenderId: "805391569075",
  appId: "1:805391569075:web:1e637a0da9047437f9e0c6",
  measurementId: "G-MWZJ4PTXQT"
};

// Initialize Firebase
let firebaseApp: FirebaseApp;

// Check if Firebase has been initialized
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

// Initialize Firebase services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Only initialize analytics on the client side
const initializeAnalytics = () => {
  if (typeof window !== 'undefined') {
    // Import dynamically to avoid server-side errors
    return import('firebase/analytics').then(({ getAnalytics }) => {
      return getAnalytics(firebaseApp);
    });
  }
  return null;
};

export { firebaseApp, auth, initializeAnalytics, db };