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

// 🔄 Sekme geçişi (güncel sistem)
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-target");
    document.querySelector(target).classList.add("active");
  });
});

// 🔑 Rol tabanlı Auth kontrolü
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userRef = db.collection("users").doc(user.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    alert("⚠️ User record not found in database!");
    await auth.signOut();
    window.location.href = "index.html";
    return;
  }

  const userData = userDoc.data();

  if (userData.role !== "admin") {
    alert("⛔ Access denied. Only admins can view this page!");
    await auth.signOut();
    window.location.href = "index.html";
    return;
  }

  console.log("✅ Admin verified:", user.email);
  loadShifts();
  loadUsers();
});


// 🧾 Shift verilerini getir (userEmail eksikse users koleksiyonundan bul)
async function loadShifts() {
  const snap = await db.collection("shifts").get();
  shiftsTable.innerHTML = "";
  let counts = { Morning: 0, Evening: 0, Night: 0 };

  for (const doc of snap.docs) {
    const d = doc.data();
    counts[d.type] = (counts[d.type] || 0) + 1;

    let email = d.userEmail || "N/A";
    if (!d.userEmail && d.uid) {
      try {
        const userSnap = await db.collection("users").where("uid", "==", d.uid).get();
        if (!userSnap.empty) {
          email = userSnap.docs[0].data().email;
        }
      } catch (e) {
        console.warn("⚠️ User lookup failed:", e);
      }
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
}

// 👥 Kullanıcıları getir
async function loadUsers() {
  usersTable.innerHTML = "";
  const snap = await db.collection("users").get();
  snap.forEach((doc) => {
    const u = doc.data();
    const row = `<tr><td>${u.email}</td><td>${u.role || "user"}</td><td>${u.uid}</td></tr>`;
    usersTable.insertAdjacentHTML("beforeend", row);
  });
}

// 📊 Chart.js grafik
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
window.editShift = async function (id) {
  const shiftRef = db.collection("shifts").doc(id);
  const shiftDoc = await shiftRef.get();
  if (!shiftDoc.exists) return alert("Shift not found!");
  const shift = shiftDoc.data();
  const newNote = prompt(`Edit note for ${shift.date}:`, shift.note || "");
  if (newNote !== null) {
    await shiftRef.update({ note: newNote });
    alert("✅ Shift updated!");
    loadShifts();
  }
};

window.deleteShift = async function (id) {
  if (!confirm("Delete this shift?")) return;
  await db.collection("shifts").doc(id).delete();
  alert("🗑️ Shift deleted!");
  loadShifts();
};
// 🔄 Sekme Geçiş Fonksiyonu (TAMİR EDİLMİŞ)
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // Tüm butonlardan aktif class’ı kaldır
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));

    // Tüm tab-content alanlarını gizle
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    // Tıklanan butonu aktif yap
    e.target.classList.add("active");

    // Hangi içerik açılacaksa id’sini eşleştir
    const tabId = e.target.id.replace("tab-", "content-");
    const content = document.getElementById(tabId);
    if (content) content.classList.add("active");
  });
});
