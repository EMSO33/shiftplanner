document.addEventListener("DOMContentLoaded", async () => {
  // 🔥 Firebase
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

  // 📋 DOM
  const shiftsTable = document.querySelector("#shiftsTable tbody");
  const usersTable  = document.querySelector("#usersTable tbody");
  const searchShift = document.getElementById("searchShift");

  // 🔄 Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-target");
      document.querySelector(target)?.classList.add("active");

      // Stats tab açıldıysa grafiği şimdi çiz
      if (target === "#content-stats") {
        renderChart(latestCounts);
      }
    });
  });

  // 🔑 Role kontrolü
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    try {
      const userSnap = await db.collection("users").doc(user.uid).get();
      if (!userSnap.exists) {
        alert("⚠️ User record not found!");
        await auth.signOut();
        window.location.href = "index.html";
        return;
      }

      const data = userSnap.data();
      if ((data.role || "user") !== "admin") {
        alert("⛔ Access denied. Only admins can view this page!");
        await auth.signOut();
        window.location.href = "index.html";
        return;
      }

      await loadShifts();
      await loadUsers();
    } catch (e) {
      console.error("Role check failed:", e);
      window.location.href = "index.html";
    }
  });

  // 🧩 UID → email (fallback’lı)
  async function emailFromUid(uid) {
    if (!uid) return "N/A";
    try {
      const docSnap = await db.collection("users").doc(uid).get();
      if (docSnap.exists) return docSnap.data().email || "N/A";
      const q = await db.collection("users").where("uid", "==", uid).limit(1).get();
      if (!q.empty) return q.docs[0].data().email || "N/A";
    } catch {}
    return "N/A";
  }

  // 🔢 Grafiğe veri: son değerleri tut
  let latestCounts = { Morning: 0, Evening: 0, Night: 0 };

  // 🧾 Shifts
  async function loadShifts() {
    const snap = await db.collection("shifts").orderBy("date").get();
    shiftsTable.innerHTML = "";

    // sayım sıfırla
    latestCounts = { Morning: 0, Evening: 0, Night: 0 };

    for (const shiftDoc of snap.docs) {
      const d = shiftDoc.data();
      latestCounts[d.type] = (latestCounts[d.type] || 0) + 1;

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

    // Sadece Statistics tab açıksa çiz
    const statsOpen = document.querySelector("#content-stats")?.classList.contains("active");
    if (statsOpen) renderChart(latestCounts);
  }

  // 🔎 Arama
  searchShift?.addEventListener("input", () => {
    const term = searchShift.value.toLowerCase();
    document.querySelectorAll("#shiftsTable tbody tr").forEach((tr) => {
      tr.style.display = tr.innerText.toLowerCase().includes(term) ? "" : "none";
    });
  });

  // 👥 Users
  async function loadUsers() {
    usersTable.innerHTML = "";
    const snap = await db.collection("users").get();
    snap.forEach((doc) => {
      const u = doc.data();
      usersTable.insertAdjacentHTML(
        "beforeend",
        `<tr><td>${u.email}</td><td>${u.role || "user"}</td><td>${u.uid}</td></tr>`
      );
    });
  }

  // 📊 Chart — tekrar çizmeden önce daima destroy
  let shiftChartInstance = null;
  function renderChart(counts = { Morning: 0, Evening: 0, Night: 0 }) {
    const canvas = document.getElementById("shiftChart");
    if (!canvas) return;

    try {
      // varsa önceki grafiği yok et
      const existing = (Chart.getChart && (Chart.getChart(canvas) || Chart.getChart("shiftChart"))) || shiftChartInstance;
      if (existing) existing.destroy();
    } catch (e) {
      // sessizce geç
    }

    const ctx = canvas.getContext("2d");
    shiftChartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Morning", "Evening", "Night"],
        datasets: [{
          data: [counts.Morning || 0, counts.Evening || 0, counts.Night || 0],
          backgroundColor: ["#198754", "#ffc107", "#0d6efd"]
        }]
      },
      options: { plugins: { legend: { position: "bottom" } } }
    });
  }

  // 🪟 Modal
  const editModal     = document.getElementById("editModal");
  const editDate      = document.getElementById("edit-date");
  const editType      = document.getElementById("edit-type");
  const editNote      = document.getElementById("edit-note");
  const saveEditBtn   = document.getElementById("saveEdit");
  const cancelEditBtn = document.getElementById("cancelEdit");

  let editingShiftId = null;

  // ✏️ Edit (global)
  window.editShift = async function (id) {
    try {
      const ref = db.collection("shifts").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return alert("Shift not found!");
      const s = snap.data();

      // formu doldur
      if (editDate) editDate.value = s.date || "";
      if (editType) editType.value = s.type || "Morning";
      if (editNote) editNote.value = s.note || "";

      editingShiftId = id;
      if (editModal) editModal.style.display = "flex";
    } catch (e) {
      console.error(e);
      alert("❌ Could not load shift: " + e.message);
    }
  };

  // 💾 Save
  saveEditBtn?.addEventListener("click", async () => {
    if (!editingShiftId) return;
    try {
      await db.collection("shifts").doc(editingShiftId).update({
        date: editDate.value,
        type: editType.value,
        note: editNote.value,
      });
      if (editModal) editModal.style.display = "none";
      editingShiftId = null;
      await loadShifts();
      alert("✅ Shift updated!");
    } catch (e) {
      alert("❌ Update failed: " + e.message);
    }
  });

  // ❌ Cancel + backdrop
  cancelEditBtn?.addEventListener("click", () => {
    if (editModal) editModal.style.display = "none";
    editingShiftId = null;
  });
  editModal?.addEventListener("click", (e) => {
    if (e.target === editModal) {
      editModal.style.display = "none";
      editingShiftId = null;
    }
  });

  // 🗑️ Delete (global)
  window.deleteShift = async function (id) {
    if (!confirm("Delete this shift?")) return;
    await db.collection("shifts").doc(id).delete();
    await loadShifts();
    alert("🗑️ Shift deleted!");
  };

  // 🚪 Logout
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });
});
