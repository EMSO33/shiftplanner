import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// HTML elementleri
const userInfo = document.getElementById("user-info");
const logoutBtn = document.getElementById("logout-btn");
const backBtn = document.getElementById("back-btn");
const ctx = document.getElementById("shiftChart");

// 🔐 Kullanıcı oturumunu dinle
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userInfo.textContent = `Welcome, ${user.email}`;
    await loadShiftStats(user.uid);
  } else {
    window.location.replace("login.html");
  }
});

// 📊 Firestore'dan vardiya istatistiklerini yükle
async function loadShiftStats(uid) {
  try {
    const q = query(collection(db, "shifts"), where("uid", "==", uid));
    const snapshot = await getDocs(q);

    let morning = 0,
        evening = 0,
        night = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === "Morning") morning++;
      else if (data.type === "Evening") evening++;
      else if (data.type === "Night") night++;
    });

    const total = morning + evening + night;

    if (total === 0) {
      userInfo.textContent += " — No shifts found yet.";
      return;
    }

    // 🎨 Chart.js grafiği oluştur
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Morning", "Evening", "Night"],
        datasets: [
          {
            label: "Shift Count",
            data: [morning, evening, night],
            backgroundColor: ["#28a745", "#fd7e14", "#007bff"],
            borderColor: "#fff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          title: {
            display: true,
            text: `Total Shifts: ${total}`,
            font: { size: 16 },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error loading stats:", error);
    alert("❌ Error loading statistics: " + error.message);
  }
}

// 🚪 Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("login.html");
});

// ⬅️ Dashboard'a dön
backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});
