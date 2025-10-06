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
const usersTable  = document.querySelector("#usersTable tbody");
const searchShift = document.getElementById("searchShift");

// 🔄 Sekme geçişi (HTML'deki id kalıbı: tab-*, content-*)
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // aktif buton
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
    // içerikler
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    const tabId = e.currentTarget.id.replace("tab-", "content-");
    document.getElementById(tabId)?.classList.add("active");
  });
});

// 🔑 Rol tabanlı Auth kontrolü
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const userRef  = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      alert("⚠️ User record not found in database!");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }

    const userData = userSnap.data();
    if (userData.role !== "admin") {
      alert("⛔ Access denied. Only admins can view this page!");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }

    // Admin ok → verileri yükle
    await loadShifts();
    await loadUsers();
  } catch (err) {
    console.error("❌ Role check failed:", err);
    alert("Error verifying role: " + err.message);
    window.location.href = "index.html";
  }
});

// 🧩 UID'den email bul (users koleksiyonunda field: uid/email)
async function emailFromUid(uid) {
  if (!uid) return "N/A";
  try {
    const q = await db.collection("users").where("uid", "==", uid).limit(1).get();
    if (q.empty) return "N/A";
    return q.docs[0].data().email || "N/A";
  } catch (e) {
    console.warn("⚠️ emailFromUid lookup failed:", e);
    return "N/A";
  }
}

// 🧾 Shift verilerini getir (userEmail yoksa users'tan tamamla)
async function loadShifts() {
  try {
    // Tarihe göre sırala (YYYY-MM-DD string old. için leksikografik sıralama çalışır)
    const snap = await db.collection("shifts").orderBy("date").get();
    shiftsTable.innerHTML = "";

    let counts = { Morning: 0, Evening: 0, Night: 0 };

    for (const shiftDoc of snap.docs) {
      const d = shiftDoc.data();
      counts[d.type] = (counts[d.type] || 0) + 1;

      // email'i tamamla
      let email = d.userEmail || "N/A";
      if (email === "N/A") {
        email = await emailFromUid(d.uid);
      }

      const row = `
        <tr>
          <td>${email}</td>
          <td>${d.date}</td>
          <td>${d.type}</td>
          <td>${d.note || "-"}</td>
          <td>
            <button class="edit-btn" onclick="editShift('${shiftDoc.id}')">✏️ Edit</button>
            <button class="delete-btn" onclick="deleteShift('${shiftDoc.id}')">🗑️ Delete</button>
          </td>
        </tr>`;
      shiftsTable.insertAdjacentHTML("beforeend", row);
    }

    renderChart(counts);
  } catch (err) {
    console.error("❌ loadShifts failed:", err);
    shiftsTable.innerHTML = `<tr><td colspan="5">Failed to load shifts.</td></tr>`;
  }
}

// 🔎 Arama filtresi
searchShift?.addEventListener("input", () => {
  const term = searchShift.value.toLowerCase();
  document.querySelectorAll("#shiftsTable tbody tr").forEach((tr) => {
    tr.style.display = tr.innerText.toLowerCase().includes(term) ? "" : "none";
  });
});

// 👥 Kullanıcıları getir
async function loadUsers() {
  try {
    usersTable.innerHTML = "";
    const snap = await db.collection("users").get();
    snap.forEach((doc) => {
      const u = doc.data();
      const row = `<tr><td>${u.email}</td><td>${u.role || "user"}</td><td>${u.uid}</td></tr>`;
      usersTable.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    console.error("❌ loadUsers failed:", err);
    usersTable.innerHTML = `<tr><td colspan="3">Failed to load users.</td></tr>`;
  }
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

// ✏️ Edit / 🗑️ Delete (global)
window.editShift = async function (id) {
  try {
    const ref = db.collection("shifts").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return alert("Shift not found!");
    const s = snap.data();
    const newNote = prompt(`Edit note for ${s.date}:`, s.note || "");
    if (newNote !== null) {
      await ref.update({ note: newNote });
      alert("✅ Shift updated!");
      loadShifts();
    }
  } catch (e) {
    console.error(e);
    alert("❌ Update failed: " + e.message);
  }
};

window.deleteShift = async function (id) {
  try {
    if (!confirm("Delete this shift?")) return;
    await db.collection("shifts").doc(id).delete();
    alert("🗑️ Shift deleted!");
    loadShifts();
  } catch (e) {
    console.error(e);
    alert("❌ Delete failed: " + e.message);
  }
};

// 🚪 Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});
