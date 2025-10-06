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

// 📋 DOM Elemanları
const shiftsTable = document.querySelector("#shiftsTable tbody");
const usersTable = document.querySelector("#usersTable tbody");
const searchShift = document.getElementById("searchShift");

// 🔑 Rol Kontrolü
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userSnap = await db.collection("users").where("uid", "==", user.uid).get();
  if (userSnap.empty) {
    alert("User record not found!");
    window.location.href = "index.html";
    return;
  }

  const userData = userSnap.docs[0].data();

  if (userData.role !== "admin") {
    alert("⛔ Access denied. Only admins allowed!");
    await auth.signOut();
    window.location.href = "index.html";
    return;
  }

  console.log("✅ Admin verified:", userData.email);
  loadShifts();
  loadUsers();
});

// 🧾 Shift verilerini getir
async function loadShifts() {
  const shiftsSnap = await db.collection("shifts").get();
  const usersSnap = await db.collection("users").get();
  shiftsTable.innerHTML = "";
  let counts = { Morning: 0, Evening: 0, Night: 0 };

  // Kullanıcı UID → email eşleştirme map’i oluştur
  const userMap = {};
  usersSnap.forEach((doc) => {
    const u = doc.data();
    userMap[u.uid] = u.email;
  });

  // Shiftleri sırayla işle
  for (const doc of shiftsSnap.docs) {
    const d = doc.data();
    counts[d.type] = (counts[d.type] || 0) + 1;

    // Email’i userMap’ten bul
    let email = d.userEmail || userMap[d.uid] || "N/A";

    // Eğer shift kaydında yoksa Firestore’a kaydet
    if (!d.userEmail && email !== "N/A") {
      await db.collection("shifts").doc(doc.id).update({ userEmail: email });
    }

    // Tablo satırını oluştur
    const row = `
      <tr>
        <td>${email}</td>
        <td>${d.date}</td>
        <td>${d.type}</td>
        <td>${d.note || "-"}</td>
        <td>
          <button class="edit-btn">✏️ Edit</button>
          <button class="delete-btn">🗑️ Delete</button>
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
    const row = `<tr>
      <td>${u.email}</td>
      <td>${u.role || "user"}</td>
      <td>${u.uid}</td>
    </tr>`;
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
