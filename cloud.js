const firebaseConfig = {
  apiKey: "AIzaSyCrQCSuOwHcffAlUY5vYCERlMMPB6j3rUM",
  authDomain: "fieldofficertracker.firebaseapp.com",
  projectId: "fieldofficertracker",
  storageBucket: "fieldofficertracker.firebasestorage.app",
  messagingSenderId: "40998668036",
  appId: "1:40998668036:web:a59b9c9faf86354859b251"
};

firebase.initializeApp(firebaseConfig);

const cloudAuth = firebase.auth();
const cloudDB = firebase.firestore();

let cloudReady = false;
let cloudBusy = false;
let cloudUser = null;

document.getElementById('cloudLoginBtn').onclick = async () => {
  const email = document.getElementById('cloudEmail').value.trim();
  const password = document.getElementById('cloudPassword').value;

  if (!email || !password) {
    alert('Email සහ Password ඇතුළත් කරන්න.');
    return;
  }

  try {
    await cloudAuth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    alert('Login අසාර්ථකයි: ' + e.message);
  }
};

document.getElementById('cloudLogoutBtn').onclick = async () => {
  cloudReady = false;
  cloudUser = null;
  await cloudAuth.signOut();
};

async function syncCloud() {
  if (!cloudUser || !cloudReady || cloudBusy) return;

  cloudBusy = true;

  try {
    const ref = cloudDB.collection('users')
      .doc(cloudUser.uid)
      .collection('visits');

    const batch = cloudDB.batch();

    visits.forEach(v => {
      batch.set(ref.doc(String(v.id)), v);
    });


    if (visits.length > 450) {
      throw new Error('Records ගණන වැඩියි.');
    }

    await batch.commit();

    document.getElementById('saveStatus').textContent =
      'Cloud Sync සාර්ථකයි';
  } catch (e) {
    console.error(e);
    document.getElementById('saveStatus').textContent =
      'Cloud Sync අසාර්ථකයි. Local දත්ත ආරක්ෂිතයි.';
  } finally {
    cloudBusy = false;
  }
}

async function startCloudSync(user) {
  cloudUser = user;
  cloudReady = false;

  document.getElementById('cloudAccount').textContent =
    'Signed in: ' + user.email;

  try {
    const ref = cloudDB.collection('users')
      .doc(user.uid)
      .collection('visits');

    const snap = await ref.get();
    const merged = new Map();

    snap.forEach(d => merged.set(d.id, d.data()));
    visits.forEach(v => merged.set(String(v.id), v));

    visits = Array.from(merged.values());
    localStorage.setItem(KEY, JSON.stringify(visits));
    render();

    cloudReady = true;
    await syncCloud();
  } catch (e) {
    console.error(e);
    document.getElementById('saveStatus').textContent =
      'Cloud data load failed. Internet පරීක්ෂා කරන්න.';
  }
}

cloudAuth.onAuthStateChanged(user => {
  if (user) {
    startCloudSync(user);
  } else {
    cloudUser = null;
    cloudReady = false;
    document.getElementById('cloudAccount').textContent =
      'Cloud account: Not signed in';
  }
});

const localSave = save;

save = function() {
  localSave();
  if (cloudReady) syncCloud();
};
