import { auth, db } from "./firebase.js";
import { 
  collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { 
  onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const shiftDate = document.getElementById("shift-date");
const shiftType = document.getElementById("shift-type");
const shiftNote = document.getElementById("shift-note");
const addShiftBtn = document.getElementById("add-shift");
const shiftList = document.getElementById("shift-list");
const logoutBtn = document.getElementById("logout-btn");

let currentUser = null;
let editShiftId = null; // ✏️ düzenleme için geçici ID

// 🔐 Kullanıcı oturumunu dinle
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loadShifts();
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
      // 🔄 Güncelleme işlemi
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
      // ➕ Yeni vardiya ekleme
      await addDoc(collection(db, "shifts"), {
        uid: currentUser.uid,
        date: shiftDate.value,
        type: shiftType.value,
        note: shiftNote.value || "",
        createdAt: new Date().toISOString()
      });
      alert("✅ Shift added!");
    }

    shiftDate.value = "";
    shiftNote.value = "";
    loadShifts();
  } catch (error) {
    console.error(error);
    alert("❌ Error saving shift: " + error.message);
  }
});

// 📅 Vardiyaları getir ve listele
async function loadShifts() {
  shiftList.innerHTML = "<li>Loading...</li>";

  try {
    const q = query(
      collection(db, "shifts"),
      where("uid", "==", currentUser.uid)
    );

    const querySnapshot = await getDocs(q);
    shiftList.innerHTML = "";

    if (querySnapshot.empty) {
      shiftList.innerHTML = "<li>No shifts yet.</li>";
    } else {
      const shifts = [];
      querySnapshot.forEach((docSnap) => {
        shifts.push({ id: docSnap.id, ...docSnap.data() });
      });

      shifts.sort((a, b) => new Date(a.date) - new Date(b.date));

      shifts.forEach((shift) => {
        const item = document.createElement("li");

        const info = document.createElement("span");
        info.textContent = `${shift.date} - ${shift.type} (${shift.note})`;

        // 🗑️ Sil butonu
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "delete-btn";

        delBtn.addEventListener("click", async () => {
          if (confirm("Are you sure you want to delete this shift?")) {
            await deleteDoc(doc(db, "shifts", shift.id));
            alert("🗑️ Shift deleted!");
            loadShifts();
          }
        });

        // ✏️ Düzenle butonu
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "edit-btn";

        editBtn.addEventListener("click", () => {
          shiftDate.value = shift.date;
          shiftType.value = shift.type;
          shiftNote.value = shift.note;
          editShiftId = shift.id;
          addShiftBtn.textContent = "Update Shift";
        });

        item.appendChild(info);
        item.appendChild(editBtn);
        item.appendChild(delBtn);
        shiftList.appendChild(item);
      });
    }
  } catch (error) {
    console.error(error);
    alert("❌ Error loading shifts: " + error.message);
  }
}

// 🚪 Çıkış işlemi
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("login.html");
});
