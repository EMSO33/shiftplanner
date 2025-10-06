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

// 🔑 Auth kontrolü
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDoc = await db.collection("users").doc(user.uid).get();
  const data = userDoc.data();

  if (!data || data.role !== "admin") {
    alert("⛔ Only admins can access this page!");
    await auth.signOut();
    window.location.href = "index.html";
    return;
  }

  loadShifts();
  loadUsers();
});

// 🧾 Shift verileri
async function loadShifts() {
  const snap = await db.collection("shifts").get();
  shiftsTable.innerHTML = "";
  let counts = { Morning: 0, Evening: 0, Night: 0 };

  snap.forEach((doc) => {
    const d = doc.data();
    counts[d.type] = (counts[d.type] || 0) + 1;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d.userEmail || "N/A"}</td>
      <td>${d.date}</td>
      <td>${d.type}</td>
      <td>${d.note || "-"}</td>
      <td>
        <button class="edit-btn" data-id="${doc.id}">✏️ Edit</button>
        <button class="delete-btn" data-id="${doc.id}">🗑️ Delete</button>
      </td>
    `;
    shiftsTable.appendChild(row);
  });

  // Edit işlemi
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const docRef = await db.collection("shifts").doc(id).get();
      const data = docRef.data();

      const newDate = prompt("📅 New Date (YYYY-MM-DD):", data.date);
      const newType = prompt("🌙 New Type (Morning/Evening/Night):", data.type);
      const newNote = prompt("📝 Note:", data.note || "");

      if (newDate && newType) {
        await db.collection("shifts").doc(id).update({
          date: newDate,
          type: newType,
          note: newNote
        });
        alert("✅ Shift updated!");
        loadShifts();
      }
    });
  });

  // Delete işlemi
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("🗑️ Are you sure you want to delete this shift?")) {
        await db.collection("shifts").doc(id).delete();
        alert("✅ Shift deleted!");
        loadShifts();
      }
    });
  });

  renderChart(counts);
}

// 👥 Kullanıcılar
async function loadUsers() {
  usersTable.innerHTML = "";
  const snap = await db.collection("users").get();
  snap.forEach((doc) => {
    const u = doc.data();
    const row = `<tr><td>${u.email}</td><td>${u.role || "user"}</td></tr>`;
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
      datasets: [
        {
          data: [counts.Morning, counts.Evening, counts.Night],
          backgroundColor: ["#198754", "#ffc107", "#0d6efd"],
        },
      ],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

// 🚪 Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});
