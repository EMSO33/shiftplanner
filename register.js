// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyARlOXg2YuKrEsRWARCUTiabHoMN1hO3Ks",
  authDomain: "shiftpilot-b3c1d.firebaseapp.com",
  projectId: "shiftpilot-b3c1d",
  storageBucket: "shiftpilot-b3c1d.firebasestorage.app",
  messagingSenderId: "676810685497",
  appId: "1:676810685497:web:db3162bc7a394442caa1e8",
  measurementId: "G-BEJ85FBSCZ"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🧾 Form referansı
const registerForm = document.getElementById("register-form");

// 📥 Kayıt işlemi
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("⚠️ Please fill in all fields.");
    return;
  }

  try {
    // 🔐 Firebase Authentication ile kullanıcı oluştur
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // 🧾 Firestore'a kullanıcı kaydı ekle
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      createdAt: new Date().toISOString()
    });

    alert("✅ Registration successful! Redirecting to login...");
    window.location.href = "login.html";

  } catch (error) {
    console.error("❌ Registration error:", error);
    alert("❌ Error: " + error.message);
  }
});
