import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD74cmzRhsv7Ianf...mgUCCCgc",
  authDomain: "cueballpro-dd0d07.firebaseapp.com",
  projectId: "cueballpro-dd0d07",
  storageBucket: "cueballpro-dd0d07.appspot.com",
  messagingSenderId: "297463907277",
  appId: "1:297463907277:web:f37fd2c639dbc83487a84"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
