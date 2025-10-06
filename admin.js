// admin.js  (TAMAMI)
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
const db   = firebase.firestore();

const shiftsTableBody = document.querySelector("#shiftsTable tbody");
const usersTableBody  = document.querySelector("#usersTable tbody");
const searchShift     = document.getElementById("searchShift");

let USER_MAP = {}; // uid -> email map (users koleksiyonundan)
let CURRENT_ADMIN = null;

window.addEventListener("DOMContentLoaded", () => {
  // Sekme tıklamaları
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      const target = document.querySelector(btn.dataset.target);
      if (target) target.classList.add("active");
    });
  });

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await auth.signOut();
      window.location.href = "login.html";
    });
  }

  // Arama
  if (searchShift) {
    searchShift.addEventListener("input", () => {
      const term = searchShift.value.toLowerCase();
      document.querySelectorAll("#shiftsTable tbody tr").forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(term) ? "" : "none";
      });
    });
  }
});

// Auth + rol kontrolü
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // users koleksiyonunda bu kullanıcının rolünü bul
    const uSnap = await db.collection("users").doc(user.uid).get();
    if (!uSnap.exists) {
      alert("⚠️ User record not found in Firestore.");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }
    const uData = uSnap.data();
    if ((uData.role || "user") !== "admin") {
      alert("⛔ Access denied. Only admins can view this page!");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }
    CURRENT_ADMIN = uData.email || user.email || "(admin)";

    // Tüm kullanıcıları map’e al (uid -> email)
    USER_MAP = await buildUserMap();

    // Shiftler ve kullanıcılar yükle
    await loadShifts();
    await loadUsers();
  } catch (err) {
    console.error("Auth/role check failed:", err);
    alert("Auth/role error: " + err.message);
    window.location.href = "index.html";
  }
});

// users koleksiyonundan uid->email map’i
async function buildUserMap() {
  const map = {};
  const snap = await db.collection("users").get();
  snap.forEach(doc => {
    const d = doc.data();
    if (d && d.uid && d.email) map[d.uid] = d.email;
  });
  return map;
}

// Shift verilerini getir + email’i eşleştir + eksikse kalıcı yaz
async function loadShifts() {
  const snap = await db.collection("shifts").get();
  shiftsTableBody.innerHTML = "";
  const counts = { Morning: 0, Evening: 0, Night: 0 };

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    if (d?.type) counts[d.type] = (counts[d.type] || 0) + 1;

    let email = d.userEmail || USER_MAP[d.uid] || "N/A";

    // Eğer userEmail alanı eksik ama USER_MAP’te email bulunuyorsa, belgeye yaz
    if (!d.userEmail && email !== "N/A") {
      try {
        await db.collection("shifts").doc(docSnap.id).update({ userEmail: email });
      } catch (e) {
        console.warn("Failed to backfill userEmail for", docSnap.id, e);
      }
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${email}</td>
      <td>${d.date || "-"}</td>
      <td>${d.type || "-"}</td>
      <td>${d.note || "-"}</td>
      <td>
        <button class="edit-btn" data-id="${docSnap.id}">✏️ Edit</button>
        <button class="delete-btn" data-id="${docSnap.id}">🗑️ Delete</button>
      </td>
    `;
    shiftsTableBody.appendChild(tr);
  }

  // Satır içi Edit/Delete (event delegation)
  shiftsTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (!id) return;

    if (btn.classList.contains("delete-btn")) {
      if (!confirm("Delete this shift?")) return;
      await db.collection("shifts").doc(id).delete();
      await loadShifts();
      return;
    }

    if (btn.classList.contains("edit-btn")) {
      const docRef = db.collection("shifts").doc(id);
      const cur = await docRef.get();
      if (!cur.exists) return;
      const data = cur.data();

      const newDate = prompt("Date (YYYY-MM-DD):", data.date || "");
      if (newDate === null) return;
      const newType = prompt("Type (Morning/Evening/Night):", data.type || "");
      if (newType === null) return;
      const newNote = prompt("Note:", data.note || "");
      if (newNote === null) return;

      await docRef.update({ date: newDate, type: newType, note: newNote });
      await loadShifts();
      return;
    }
  }, { once: true }); // yeniden render’da yeniden bağlanacak

  renderChart(counts);
}

// Kullanıcılar tablosu
async function loadUsers() {
  usersTableBody.innerHTML = "";
  const snap = await db.collection("users").get();
  snap.forEach(doc => {
    const u = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.email}</td>
      <td>${u.role || "user"}</td>
      <td>${u.uid}</td>
    `;
    usersTableBody.appendChild(tr);
  });
}

// İstatistik grafiği
function renderChart(counts) {
  const ctx = document.getElementById("shiftChart");
  if (!ctx) return;
  // eslint-disable-next-line no-undef
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Morning", "Evening", "Night"],
      datasets: [{
        data: [counts.Morning || 0, counts.Evening || 0, counts.Night || 0],
        backgroundColor: ["#198754", "#ffc107", "#0d6efd"],
      }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}
