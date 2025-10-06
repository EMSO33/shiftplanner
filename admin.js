// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyARlOXg2YuKrEsRWARCUTiabHoMN1hO3Ks",
  authDomain: "shiftpilot-b3c1d.firebaseapp.com",
  projectId: "shiftpilot-b3c1d",
  storageBucket: "shiftpilot-b3c1d.firebasestorage.app",
  messagingSenderId: "676810685497",
  appId: "1:676810685497:web:db3162bc7a394442caa1e8",
  measurementId: "G-BEJ85FBSCZ",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 📋 DOM
const shiftsTable = document.querySelector("#shiftsTable tbody");
const usersTable = document.querySelector("#usersTable tbody");
const searchShift = document.getElementById("searchShift");

// 🔄 Sekme geçişi
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    const id = btn.id.replace("tab-", "content-");
    document.getElementById(id).classList.add("active");
  });
});

// 🔑 Auth kontrolü (role tabanlı)
auth.onAuthStateChanged(async (user) => {
  console.clear();
  if (!user) {
    alert("⚠️ No user signed in, redirecting...");
    window.location.href = "login.html";
    return;
  }

  try {
    // Firestore'da kullanıcı rolünü al
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      alert("❌ User record not found in Firestore!");
      await auth.signOut();
      window.location.href = "login.html";
      return;
    }

    const userData = userDoc.data();
    console.log("👤 Logged in as:", userData.email, "| Role:", userData.role);

    if (userData.role !== "admin") {
      alert("⛔ Only admin users can access this page!");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }

    console.log("✅ Admin verified! Loading data...");
    loadShifts();
    loadUsers();

  } catch (err) {
    console.error("❌ Error checking user role:", err);
    alert("Error verifying role. Please try again.");
  }
});

// 🧾 Shift verileri
async function loadShifts() {
  const snap = await db.collection("shifts").get();
  shiftsTable.innerHTML = "";
  let counts = { Morning: 0, Evening: 0, Night: 0 };

  snap.forEach((doc) => {
    const d = doc.data();
    counts[d.type] = (counts[d.type] || 0) + 1;
    const row = `
      <tr>
        <td>${d.userEmail || "N/A"}</td>
        <td>${d.date}</td>
        <td>${d.type}</td>
        <td>${d.note || "-"}</td>
      </tr>`;
    shiftsTable.insertAdjacentHTML("beforeend", row);
  });

  renderChart(counts);
}

// 👥 Kullanıcılar
async function loadUsers() {
  usersTable.innerHTML = "";
  const snap = await db.collection("users").get();
  snap.forEach((doc) => {
    const u = doc.data();
    const row = `<tr><td>${u.email}</td><td>${u.role || "user"}</td><td>${u.uid}</td></tr>`;
    usersTable.insertAdjacentHTML("beforeend", row);
  });
}

// 📊 Chart.js
function renderChart(counts) {
  const ctx = document.getElementById("shiftChart");
  if (!ctx) return;
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Morning", "Evening", "Night"],
      datasets: [{
        data: [counts.Morning, counts.Evening, counts.Night],
        backgroundColor: ["#198754", "#ffc107", "#0d6efd"]
      }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}

// 🚪 Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});
