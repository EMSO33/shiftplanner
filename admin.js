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

// 🔑 Auth kontrolü (rol tabanlı)
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    console.log("🧩 Logged user UID:", user.uid);

    // 🔍 Kullanıcıyı Firestore'dan getir
    const q = await db.collection("users").where("uid", "==", user.uid).get();

    if (q.empty) {
      alert("⚠️ User record not found in Firestore!");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }

    const userData = q.docs[0].data();
    console.log("✅ Firestore user:", userData);

    // 🛡️ Rol kontrolü
    if (userData.role?.toLowerCase() !== "admin") {
      alert("⛔ Access denied. Only admins can view this page!");
      await auth.signOut();
      window.location.href = "index.html";
      return;
    }

    console.log("👑 Admin verified:", userData.email);
    loadShifts();
    loadUsers();
  } catch (error) {
    console.error("❌ Role check failed:", error);
    alert("Error verifying admin role: " + error.message);
    window.location.href = "index.html";
  }
});

// 🧾 Shift verilerini getir
async function loadShifts() {
  const snap = await db.collection("shifts").get();
  shiftsTable.innerHTML = "";
  let counts = { Morning: 0, Evening: 0, Night: 0 };

  for (const docSnap of snap.docs) {
    const shift = docSnap.data();
    counts[shift.type] = (counts[shift.type] || 0) + 1;

    let email = shift.userEmail || null;

    // ✅ Eğer userEmail yoksa, uid üzerinden email'i bul
    if (!email && shift.uid) {
      try {
        const userQ = await db.collection("users").where("uid", "==", shift.uid).get();
        if (!userQ.empty) {
          const userDoc = userQ.docs[0].data();
          email = userDoc.email || "N/A";
          // Firestore’a kaydet (kalıcı düzeltme)
          await db.collection("shifts").doc(docSnap.id).update({ userEmail: email });
        } else {
          email = "N/A";
        }
      } catch (e) {
        console.warn("⚠️ user lookup failed:", e);
        email = "N/A";
      }
    }

    // 📄 Tabloya yaz
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${email || "N/A"}</td>
      <td>${shift.date}</td>
      <td>${shift.type}</td>
      <td>${shift.note || "-"}</td>
      <td>
        <button class="edit-btn">✏️ Edit</button>
        <button class="delete-btn">🗑️ Delete</button>
      </td>
    `;

    // ✏️ Edit butonu
    row.querySelector(".edit-btn").addEventListener("click", async () => {
      const newNote = prompt("Enter new note:", shift.note || "");
      if (newNote === null) return;
      await db.collection("shifts").doc(docSnap.id).update({ note: newNote });
      alert("✅ Shift updated!");
      loadShifts();
    });

    // 🗑️ Delete butonu
    row.querySelector(".delete-btn").addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this shift?")) {
        await db.collection("shifts").doc(docSnap.id).delete();
        alert("🗑️ Shift deleted!");
        loadShifts();
      }
    });

    shiftsTable.appendChild(row);
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
      datasets: [{
        data: [counts.Morning, counts.Evening, counts.Night],
        backgroundColor: ["#198754", "#ffc107", "#0d6efd"],
      }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

// 🚪 Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});
