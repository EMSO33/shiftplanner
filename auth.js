import { auth } from "./firebase.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// REGISTER
const registerBtn = document.getElementById("register-btn");
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value.trim();

    if (!email || !password) {
      alert("⚠️ Please fill in both fields.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("✅ Account created successfully! Redirecting...");
      setTimeout(() => {
        window.location.replace("login.html");
      }, 800);
    } catch (error) {
      alert("❌ " + error.message);
    }
  });
}

// LOGIN
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      alert("⚠️ Please enter your email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Logged in successfully! Redirecting...");
      setTimeout(() => {
        window.location.replace("index.html");
      }, 800);
    } catch (error) {
      alert("❌ " + error.message);
    }
  });
}

// LOGOUT (optional for dashboard)
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    alert("👋 Logged out successfully!");
    setTimeout(() => {
      window.location.replace("login.html");
    }, 500);
  });
}

// AUTH STATE LISTENER (Optional: to track login status)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged in:", user.email);
  } else {
    console.log("No user logged in.");
  }
});
