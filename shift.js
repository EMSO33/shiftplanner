import { auth, db } from "./firebase.js";
import { 
  collection, addDoc, query, where, getDocs, orderBy 
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

// Kullanıcı oturumunu dinle
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loadShifts();
  } else {
    window.location.replace("login.html");
  }
});

// Vardiya ekle
addShiftBtn.addEventListener("click", async () => {
  if (!shiftDate.value || !shiftType.value) {
    alert("⚠️ Please fill in date and type.");
    return;
  }

  try {
    await addDoc(collection(db, "shifts"), {
      uid: currentUser.uid,
      date: shiftDate.value,
      type: shiftType.value,
      note: shiftNote.value || "",
      createdAt: new Date()
    });
    alert("✅ Shift added!");
    shiftDate.value = "";
    shiftNote.value = "";
    loadShifts();
  } catch (error) {
    console.error(error);
    alert("❌ Error adding shift: " + error.message);
  }
});

// Vardiyaları getir
async function loadShifts() {
  shiftList.innerHTML = "<li>Loading...</li>";

  const q = query(
    collection(db, "shifts"),
    where("uid", "==", currentUser.uid),
    orderBy("date", "asc")
  );

  const querySnapshot = await getDocs(q);
  shiftList.innerHTML = "";

  if (querySnapshot.empty) {
    shiftList.innerHTML = "<li>No shifts yet.</li>";
  } else {
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const item = document.createElement("li");
      item.textContent = `${data.date} - ${data.type} (${data.note})`;
      shiftList.appendChild(item);
    });
  }
}

// Çıkış
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("login.html");
});
