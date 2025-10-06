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

// 🔐 Admin Email Tanımı
const ADMIN_EMAIL = "emircansuleymanoglu@gmail.com"; // sadece admin erişimi

// 📋 DOM Elementleri
const shiftsTable = document.querySelector("#shiftsTable tbody");
const usersTable = document.querySelector("#usersTable tbody");
const searchShift = document.getElementById("searchShift");

// 🔄 Sekme Geçişi
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    const id = btn.id.replace("tab-", "content-");
    document.getElementById(id).classList.add("active");
  });
});

// 🔑 Auth Kontrolü
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // ✅ Null veya yanlış mail kontrolü — artık güvenli
  const email = user.email ? user.email.toLowerCase() : "";
  const adminEmail = ADMIN_EMAIL.toLowerCase();

  if (email !== adminEmail) {
    alert("⛔ Only admin can access this page!");
    await auth.signOut();
    window.location.href = "index.html";
    return;
  }

  console.log("✅ Admin erişimi verildi:", email);
  loadShifts();
  loadUsers();
});

// 🧾 Shift Verilerini Getir (eski kayıtlar için fallback'li)
async function loadShifts() {
  try {
    const snap = await db.collection("shifts").get();
    shiftsTable.innerHTML = "";
    let counts = { Morning: 0, Evening: 0, Night: 0 };

    for (const doc of snap.docs) {
      const d = doc.data();
      counts[d.type] = (counts[d.type] || 0) + 1;

      // 🧩 userEmail yoksa UID üzerinden kullanıcıyı bul
      let email = d.userEmail || "N/A";
      if (!d.userEmail && d.uid) {
        try {
          const userSnap = await db.collection("users").doc(d.uid).get();
          if (userSnap.exists) email = userSnap.data().email || "N/A";
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
        </tr>`;
      shiftsTable.insertAdjacentHTML("beforeend", row);
    }

    renderChart(counts);
  } catch (err) {
    console.error("❌ Shift verileri alınamadı:", err);
  }
}

// 🔎 Arama Filtresi
searchShift.addEventListener("input", () => {
  const term = searchShift.value.toLowerCase();
  document.querySelectorAll("#shiftsTable tbody tr").forEach((tr) => {
    tr.style.display = tr.innerText.toLowerCase().includes(term) ? "" : "none";
  });
});

// 👥 Kullanıcı Verilerini Getir
async function loadUsers() {
  try {
    usersTable.innerHTML = "";
    const snap = await db.collection("users").get();
    snap.forEach((doc) => {
      const u = doc.data();
      const row = `
        <tr>
          <td>${u.email}</td>
          <td>${u.uid}</td>
        </tr>`;
      usersTable.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    console.error("❌ Kullanıcı verileri alınamadı:", err);
  }
}

// 📊 Chart.js Grafik
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
    options: {
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

// 🚪 Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});
