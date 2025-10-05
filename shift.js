import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const shiftDate = document.getElementById("shift-date");
const shiftType = document.getElementById("shift-type");
const shiftNote = document.getElementById("shift-note");
const addShiftBtn = document.getElementById("add-shift");
const shiftList = document.getElementById("shift-list");
const logoutBtn = document.getElementById("logout-btn");
const calendarBtn = document.getElementById("calendar-btn");
const statsBtn = document.getElementById("stats-btn");

let currentUser = null;
let editShiftId = null;

// 🔐 Kullanıcı oturumunu dinle
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadShifts();
  } else {
    window.location.replace("login.html");
  }
});

// ➕ veya ✏️ Vardiya ekle/güncelle
addShiftBtn.addEventListener("click", async () => {
  if (!shiftDate.value || !shiftType.value) {
    alert("⚠️ Please fill in date and type.");
    return;
  }

  try {
    if (editShiftId) {
      const shiftRef = doc(db, "shifts", editShiftId);
      await updateDoc(shiftRef, {
        date: shiftDate.value,
        type: shiftType.value,
        note: shiftNote.value || "",
      });
      alert("✅ Shift updated!");
      editShiftId = null;
      addShiftBtn.textContent = "Add Shift";
    } else {
      await addDoc(collection(db, "shifts"), {
        uid: currentUser.uid,
        date: shiftDate.value,
        type: shiftType.value,
        note: shiftNote.value || "",
        createdAt: new Date().toISOString(),
      });
      alert("✅ Shift added!");
    }

    shiftDate.value = "";
    shiftNote.value = "";
    await loadShifts();
  } catch (error) {
    console.error(error);
    alert("❌ Error saving shift: " + error.message);
  }
});

// 📅 Vardiyaları listele
async function loadShifts() {
  shiftList.innerHTML = "<li>Loading...</li>";

  try {
    const q = query(collection(db, "shifts"), where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    shiftList.innerHTML = "";

    if (querySnapshot.empty) {
      shiftList.innerHTML = "<li>No shifts yet.</li>";
      return;
    }

    const shifts = [];
    querySnapshot.forEach((docSnap) => {
      shifts.push({ id: docSnap.id, ...docSnap.data() });
    });

    shifts.sort((a, b) => new Date(a.date) - new Date(b.date));

    shifts.forEach((shift) => {
      const item = document.createElement("li");
      item.classList.add("shift-item");

      let color = "#6c757d";
      if (shift.type === "Morning") color = "#28a745";
      else if (shift.type === "Evening") color = "#fd7e14";
      else if (shift.type === "Night") color = "#007bff";

      const info = document.createElement("span");
      info.textContent = `${shift.date} - ${shift.type} (${shift.note || ""})`;
      info.style.color = color;
      info.style.fontWeight = "500";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "edit-btn";
      editBtn.addEventListener("click", () => {
        shiftDate.value = shift.date;
        shiftType.value = shift.type;
        shiftNote.value = shift.note;
        editShiftId = shift.id;
        addShiftBtn.textContent = "Update Shift";
        alert("📝 Editing mode activated");
      });

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "delete-btn";
      delBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this shift?")) {
          try {
            await deleteDoc(doc(db, "shifts", shift.id));
            alert("🗑️ Shift deleted!");
            await loadShifts();
          } catch (err) {
            console.error(err);
            alert("❌ Error deleting shift: " + err.message);
          }
        }
      });

      item.appendChild(info);
      item.appendChild(editBtn);
      item.appendChild(delBtn);
      shiftList.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    alert("❌ Error loading shifts: " + error.message);
  }
}

// 🚪 Çıkış
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("login.html");
});

// 🗓️ Takvim sayfasına yönlendirme
if (calendarBtn) {
  calendarBtn.addEventListener("click", () => {
    window.location.href = "shift-calendar.html";
  });
}

// 📊 İstatistik sayfasına yönlendirme
if (statsBtn) {
  statsBtn.addEventListener("click", () => {
    window.location.href = "shift-stats.html";
  });
}
