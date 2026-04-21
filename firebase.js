// Firebase imports
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDXAn_ewaMcYxYB5KxC2l_GSF6HORFQmZ4",
  authDomain: "cricscore-pro-a0b22.firebaseapp.com",
  projectId: "cricscore-pro-a0b22",
  storageBucket: "cricscore-pro-a0b22.firebasestorage.app",
  messagingSenderId: "658688899479",
  appId: "1:658688899479:web:ddd1ec1337f50b62012cd2",
  measurementId: "G-GE58GVEEZ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore database
const db = getFirestore(app);

// 🔹 Get matches data
export const getMatches = async () => {
  const querySnapshot = await getDocs(collection(db, "matches"));
  let matches = [];
  querySnapshot.forEach((doc) => {
    matches.push({ id: doc.id, ...doc.data() });
  });
  return matches;
};

// 🔹 Add match (admin use)
export const addMatch = async (data) => {
  await addDoc(collection(db, "matches"), data);
};

export { db };
