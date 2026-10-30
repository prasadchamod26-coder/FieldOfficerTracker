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

const DELETE_KEY = 'fieldOfficerTracker_pendingDeletes_v1';

let cloudReady = false;
let cloudBusy = false;
let cloudUser = null;
let pendingDeletes = [];

try {
  pendingDeletes = JSON.parse(localStorage.getItem(DELETE_KEY) || '[]');
  if (!Array.isArray(pendingDeletes)) pendingDeletes = [];
} catch (e) {
  pendingDeletes = [];
}

function saveDeleteQueue() {
  localStorage.setItem(DELETE_KEY, JSON.stringify(pendingDeletes));
}

window.queueCloudDelete = function(id) {
  id = String(id);

  if (!pendingDeletes.includes(id)) {
    pendingDeletes.push(id);
    saveDeleteQueue();
  }

  if (cloudReady) syncCloud();
};

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


// Farmer Profiles සහ AI Records Cloud Sync
async function syncProfileCollection(collectionName, localItems, storageKey) {
  const ref = cloudDB.collection('users')
    .doc(cloudUser.uid)
    .collection(collectionName);

  const snap = await ref.get();
  const merged = new Map();

  snap.forEach(doc => {
    merged.set(doc.id, doc.data());
  });

  (Array.isArray(localItems) ? localItems : []).forEach(item => {
    merged.set(String(item.id), item);
  });

  const items = Array.from(merged.values());

  if (items.length > 450) {
    throw new Error(collectionName + ' records ගණන වැඩියි.');
  }

  const batch = cloudDB.batch();

  items.forEach(item => {
    batch.set(ref.doc(String(item.id)), item);
  });

  if (items.length > 0) await batch.commit();

  localStorage.setItem(storageKey, JSON.stringify(items));

  return items;
}

async function syncCloud() {
  if (!cloudUser || !cloudReady || cloudBusy) return;

  cloudBusy = true;

  try {
    const ref = cloudDB.collection('users')
      .doc(cloudUser.uid)
      .collection('visits');

    // 1. Cloud එකෙන් Delete කළ යුතු Records මකන්න.
    const deletedNow = [...pendingDeletes];

    if (deletedNow.length > 0) {
      if (deletedNow.length > 450) {
        throw new Error('Pending Delete ගණන වැඩියි.');
      }

      const deleteBatch = cloudDB.batch();

      deletedNow.forEach(id => {
        deleteBatch.delete(ref.doc(String(id)));
      });

      await deleteBatch.commit();

      pendingDeletes = pendingDeletes.filter(
        id => !deletedNow.includes(id)
      );
      saveDeleteQueue();
    }

    // 2. ඉතිරි Local Records Cloud එකට Save කරන්න.
    if (visits.length > 450) {
      throw new Error('Records ගණන වැඩියි.');
    }

    const batch = cloudDB.batch();

    visits.forEach(v => {
      batch.set(ref.doc(String(v.id)), v);
    });

    if (visits.length > 0) {
      await batch.commit();
    }

    farmers = await syncProfileCollection(
      'farmers', farmers, 'fieldOfficerTracker_farmers_v1'
    );

    inseminations = await syncProfileCollection(
      'inseminations', inseminations,
      'fieldOfficerTracker_inseminations_v1'
    );

    document.getElementById('saveStatus').textContent =
      pendingDeletes.length
        ? 'Delete Sync Pending'
        : 'Cloud Sync සාර්ථකයි';

  } catch (e) {
    console.error(e);
    document.getElementById('saveStatus').textContent =
      'Cloud Sync අසාර්ථකයි. Local දත්ත ආරක්ෂිතයි.';
  } finally {
    cloudBusy = false;
  }
}


// Profile සහ AI දත්ත Save කළ විට Cloud Sync ආරම්භ කිරීම
window.syncProfileData = function() {
  if (cloudReady && cloudUser) syncCloud();
};


async function startCloudSync(user) {
  cloudUser = user;
  cloudReady = false;

  document.getElementById('cloudAccount').textContent =
    'Signed in: ' + user.email;

  try {
    const ref = cloudDB.collection('users')
      .doc(user.uid)
      .collection('visits');

    // Delete Queue එක මුලින්ම Cloud එකට යවන්න.
    if (pendingDeletes.length > 0) {
      const deletedNow = [...pendingDeletes];

      if (deletedNow.length > 450) {
        throw new Error('Pending Delete ගණන වැඩියි.');
      }

      const deleteBatch = cloudDB.batch();

      deletedNow.forEach(id => {
        deleteBatch.delete(ref.doc(String(id)));
      });

      await deleteBatch.commit();

      pendingDeletes = pendingDeletes.filter(
        id => !deletedNow.includes(id)
      );
      saveDeleteQueue();
    }

    // ඊට පස්සේ Cloud Records ලබාගන්න.
    const snap = await ref.get();
    const merged = new Map();

    snap.forEach(d => {
      merged.set(d.id, d.data());
    });

    visits.forEach(v => {
      merged.set(String(v.id), v);
    });

    visits = Array.from(merged.values());

    localStorage.setItem(KEY, JSON.stringify(visits));
    render();

    farmers = await syncProfileCollection(
      'farmers', farmers, 'fieldOfficerTracker_farmers_v1'
    );

    inseminations = await syncProfileCollection(
      'inseminations', inseminations,
      'fieldOfficerTracker_inseminations_v1'
    );

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

// Internet නැති වෙලාවක Pending Delete තබාගෙන,
// Internet නැවත ලැබුණු විට Sync කරන්න.
window.addEventListener('online', () => {
  if (cloudUser) {
    if (cloudReady) syncCloud();
    else startCloudSync(cloudUser);
  }
});
