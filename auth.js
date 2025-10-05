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
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("✅ Account created successfully!");
      window.location.href = "login.html";
    } catch (error) {
      alert("❌ " + error.message);
    }
  });
}

// LOGIN
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Logged in successfully!");
      window.location.href = "index.html";
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
    alert("👋 Logged out");
    window.location.href = "login.html";
  });
}

// AUTH STATE LISTENER
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged in:", user.email);
  } else {
    console.log("No user logged in.");
  }
});
