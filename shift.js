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
      // 🔄 Güncelleme modu
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
      // 🆕 Yeni kayıt (artık userEmail ekleniyor)
      await addDoc(collection(db, "shifts"), {
        uid: currentUser.uid,
        userEmail: currentUser.email,  // 🔥 Admin panel için eklendi
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

    // 📅 Tarihe göre sırala
    shifts.sort((a,
