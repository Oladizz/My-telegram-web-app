import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // If using Firebase Auth
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"; // Import Functions services

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // If using Firebase Auth
const functions = getFunctions(app); // Initialize Firebase Functions

// Optional: Connect to Functions Emulator in development
// if (process.env.NODE_ENV === 'development') {
//   try {
//     console.log("Connecting to Firebase Functions Emulator: localhost:5001");
//     connectFunctionsEmulator(functions, "localhost", 5001);
//   } catch (e) {
//     console.error("Error connecting to Functions Emulator:", e);
//     // It's useful to log this but not break the app if the emulator isn't running.
//     // The app will then try to connect to the deployed functions.
//   }
// }

export { db, auth, functions }; // Export functions
