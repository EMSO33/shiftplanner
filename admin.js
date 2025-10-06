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

// 🔄 Sekme geçişi
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    e.currentTarget.classList.add("active");
    const tabId = e.currentTarget.id.replace("tab-", "content-");
    document.getElementById(tabId)?.classList.add("active");
  });
});

// 🔑 Rol tabanlı Auth kontrolü
auth.onAuthStateChanged(async (user) => {
  if (!user) return (window.location.href = "login.html");

  try {
    const userRef  = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      alert("⚠️ User record not found in database!");
      await auth.signOut();
      return (window.location.href = "index.html");
    }

    const userData = userSnap.data();
    if (userData.role !== "admin") {
      alert("⛔ Access denied. Only admins can view this page!");
      await auth.signOut();
      return (window.location.href = "index.html");
    }

    await loadShifts();
    await loadUsers();
  } catch (err) {
    console.error("❌ Role check failed:", err);
    alert("Error verifying role: " + err.message);
    window.location.href = "index.html";
  }
});

// 🧩 UID'den email bul
async function emailFromUid(uid) {
  if (!uid) return "N/A";
  try {
    const q = await db.collection("users").where("uid", "==", uid).limit(1).get();
    if (q.empty) return "N/A";
    return q.docs[0].data().email || "N/A";
  } catch {
    return "N/A";
  }
}

// 🧾 Shift verilerini getir
async function loadShifts() {
  const snap = await db.collection("shifts").orderBy("date").get();
  shiftsTable.innerHTML = "";

  let counts = { Morning: 0, Evening: 0, Night: 0 };

  for (const shiftDoc of snap.docs) {
    const d = shiftDoc.data();
    counts[d.type] = (counts[d.type] || 0) + 1;

    let email = d.userEmail || "N/A";
    if (email === "N/A") email = await emailFromUid(d.uid);

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
}

// 👥 Kullanıcıları getir
async function loadUsers() {
  const snap = await db.collection("users").get();
  usersTable.innerHTML = "";
  snap.forEach((doc) => {
    const u = doc.data();
    usersTable.insertAdjacentHTML(
      "beforeend",
      `<tr><td>${u.email}</td><td>${u.role || "user"}</td><td>${u.uid}</td></tr>`
    );
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

// 🪟 Edit Modal Elementleri
const editModal = document.getElementById("editModal");
const editDate = document.getElementById("edit-date");
const editType = document.getElementById("edit-type");
const editNote = document.getElementById("edit-note");
const saveEditBtn = document.getElementById("saveEdit");
const cancelEditBtn = document.getElementById("cancelEdit");

let editingShiftId = null;

// ✏️ Edit Shift - Modal aç
window.editShift = async function (id) {
  try {
    const ref = db.collection("shifts").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return alert("Shift not found!");
    const s = snap.data();

    editDate.value = s.date || "";
    editType.value = s.type || "Morning";
    editNote.value = s.note || "";

    editingShiftId = id;
    editModal.style.display = "flex";
  } catch (e) {
    console.error(e);
    alert("❌ Could not load shift: " + e.message);
  }
};

// 💾 Kaydet
saveEditBtn?.addEventListener("click", async () => {
  if (!editingShiftId) return;
  try {
    await db.collection("shifts").doc(editingShiftId).update({
      date: editDate.value,
      type: editType.value,
      note: editNote.value,
    });
    alert("✅ Shift updated successfully!");
    editModal.style.display = "none";
    editingShiftId = null;
    loadShifts();
  } catch (e) {
    alert("❌ Update failed: " + e.message);
  }
});

// ❌ Cancel
cancelEditBtn?.addEventListener("click", () => {
  editModal.style.display = "none";
  editingShiftId = null;
});

// 🗑️ Delete Shift
window.deleteShift = async function (id) {
  if (!confirm("Delete this shift?")) return;
  await db.collection("shifts").doc(id).delete();
  alert("🗑️ Shift deleted!");
  loadShifts();
};

// 🚪 Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});
