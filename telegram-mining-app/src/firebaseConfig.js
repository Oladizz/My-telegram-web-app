import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions"; // connectFunctionsEmulator can be conditionally added
import { getAnalytics } from "firebase/analytics";

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyDTJKZfwbC_-sY5sgCKieTppumKJ7YBsPY",
  authDomain: "blockmint-app.firebaseapp.com",
  databaseURL: "https://blockmint-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "blockmint-app",
  storageBucket: "blockmint-app.firebasestorage.app",
  messagingSenderId: "30012248810",
  appId: "1:30012248810:web:eb54603b3bc9e0e78b7d93",
  measurementId: "G-6SSJ9YS77Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);
const analytics = getAnalytics(app); // Initialize Analytics

// Optional: Connect to Functions Emulator in development (example from previous content)
// import { connectFunctionsEmulator } from "firebase/functions";
// if (process.env.NODE_ENV === 'development') {
//   try {
//     console.log("Connecting to Firebase Functions Emulator: localhost:5001");
//     connectFunctionsEmulator(functions, "localhost", 5001);
//   } catch (e) {
//     console.error("Error connecting to Functions Emulator:", e);
//   }
// }

export { db, auth, functions, analytics }; // Export all initialized services
