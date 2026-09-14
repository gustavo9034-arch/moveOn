import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBCBw-CBGmOKOrbE4wz8VEx5hovj02B4Hg",
    authDomain: "bancoarmazem-7a554.firebaseapp.com",
    projectId: "bancoarmazem-7a554",
    storageBucket: "bancoarmazem-7a554.firebasestorage.app",
    messagingSenderId: "784965152715",
    appId: "1:784965152715:web:cbf43e40ab228d8022504e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);