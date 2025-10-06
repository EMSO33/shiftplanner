let chartInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
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

  const shiftsTable = document.querySelector("#shiftsTable tbody");
  const usersTable = document.querySelector("#usersTable tbody");
  const totalUsersEl = document.getElementById("totalUsers");
  const totalShiftsEl = document.getElementById("totalShifts");
  const lastUpdatedEl = document.getElementById("lastUpdated");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(btn.dataset.target)?.classList.add("active");
    });
  });

  auth.onAuthStateChanged(async (user) => {
    if (!user) return (window.location.href = "login.html");
    const userSnap = await db.collection("users").doc(user.uid).get();
    if (!userSnap.exists || userSnap.data().role !== "admin") {
      alert("⛔ Access denied!");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }
    await loadShifts();
    await loadUsers();
  });

  async function loadShifts() {
    const snap = await db.collection("shifts").orderBy("date").get();
    shiftsTable.innerHTML = "";
    let counts = { Morning: 0, Evening: 0, Night: 0 };

    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      counts[d.type] = (counts[d.type] || 0) + 1;
      const row = `
        <tr>
          <td>${d.userEmail || "N/A"}</td>
          <td>${d.date}</td>
          <td>${d.type}</td>
          <td>${d.note || "-"}</td>
          <td>
            <button class="edit-btn" onclick="editShift('${docSnap.id}')">✏️ Edit</button>
            <button class="delete-btn" onclick="deleteShift('${docSnap.id}')">🗑️ Delete</button>
          </td>
        </tr>`;
      shiftsTable.insertAdjacentHTML("beforeend", row);
    }

    totalShiftsEl.textContent = snap.size;
    lastUpdatedEl.textContent = new Date().toLocaleString();
    renderChart(counts);
  }

  async function loadUsers() {
    const snap = await db.collection("users").get();
    usersTable.innerHTML = "";
    snap.forEach((doc) => {
      const u = doc.data();
      usersTable.insertAdjacentHTML(
        "beforeend",
        `<tr><td>${u.email}</td><td>${u.role}</td><td>${u.uid}</td></tr>`
      );
    });
    totalUsersEl.textContent = snap.size;
  }

  function renderChart(counts) {
    const ctx = document.getElementById("shiftChart");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Morning", "Evening", "Night"],
        datasets: [{
          data: [counts.Morning, counts.Evening, counts.Night],
          backgroundColor: ["#198754", "#ffc107", "#0d6efd"],
        }],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
  }

  // ✏️ Edit Modal
  const editModal = document.getElementById("editModal");
  const editDate = document.getElementById("edit-date");
  const editType = document.getElementById("edit-type");
  const editNote = document.getElementById("edit-note");
  const saveEditBtn = document.getElementById("saveEdit");
  const cancelEditBtn = document.getElementById("cancelEdit");
  let editingShiftId = null;

  window.editShift = async function (id) {
    const ref = db.collection("shifts").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return alert("Shift not found!");
    const s = snap.data();
    editDate.value = s.date || "";
    editType.value = s.type || "Morning";
    editNote.value = s.note || "";
    editingShiftId = id;
    editModal.style.display = "flex";
  };

  saveEditBtn.addEventListener("click", async () => {
    if (!editingShiftId) return;
    await db.collection("shifts").doc(editingShiftId).update({
      date: editDate.value,
      type: editType.value,
      note: editNote.value,
    });
    editModal.style.display = "none";
    editingShiftId = null;
    loadShifts();
  });

  cancelEditBtn.addEventListener("click", () => (editModal.style.display = "none"));
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) editModal.style.display = "none";
  });

  window.deleteShift = async function (id) {
    if (!confirm("Delete this shift?")) return;
    await db.collection("shifts").doc(id).delete();
    loadShifts();
  };

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });
});
