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


let authFlowLocked = false;
let verificationPending = false;

function showAuthScreen(screen) {
  ['loginScreen', 'registerScreen', 'verifyScreen'].forEach(id => {
    document.getElementById(id).style.display =
      id === screen ? 'block' : 'none';
  });
}

function showAuthMessage(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

document.getElementById('showRegisterBtn').onclick = () => {
  showAuthScreen('registerScreen');
};

document.getElementById('backToLoginBtn').onclick = () => {
  showAuthScreen('loginScreen');
};

document.getElementById('backFromVerifyBtn').onclick = () => {
  verificationPending = false;
  showAuthMessage('authMessage', '');
  showAuthScreen('loginScreen');
};

document.getElementById('cloudLoginBtn').onclick = async () => {
  const email = document.getElementById('cloudEmail').value.trim();
  const password = document.getElementById('cloudPassword').value;

  if (!email || !password) {
    showAuthMessage('authMessage', 'Email සහ Password ඇතුළත් කරන්න.');
    return;
  }

  try {
    showAuthMessage('authMessage', 'Login වෙමින් පවතී...');
    const result = await cloudAuth.signInWithEmailAndPassword(email, password);

    await result.user.reload();

    if (!result.user.emailVerified) {
      showAuthMessage(
        'verifyMessage',
        'ඔබගේ Email එක තවම Verify කර නැහැ. Email එකේ Verification Link එක ඔබා නැවත Login වෙන්න.'
      );
      document.getElementById('verifyEmailText').textContent = email;
      verificationPending = true;
      await cloudAuth.signOut();
      showAuthScreen('verifyScreen');
      return;
    }

    showAuthMessage('authMessage', '');
  } catch (e) {
    showAuthMessage('authMessage', 'Login අසාර්ථකයි: ' + e.message);
  }
};

document.getElementById('cloudRegisterBtn').onclick = async () => {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerPasswordConfirm').value;

  if (!name || !email || !password || !confirm) {
    showAuthMessage('registerMessage', 'සියලු තොරතුරු ඇතුළත් කරන්න.');
    return;
  }

  if (password.length < 6) {
    showAuthMessage('registerMessage', 'Password එක අවම වශයෙන් අකුරු 6ක් විය යුතුයි.');
    return;
  }

  if (password !== confirm) {
    showAuthMessage('registerMessage', 'Password දෙක ගැළපෙන්නේ නැහැ.');
    return;
  }

  try {
    authFlowLocked = true;
    showAuthMessage('registerMessage', 'Account එක සාදමින් පවතී...');

    const result = await cloudAuth.createUserWithEmailAndPassword(
      email, password
    );

    await result.user.updateProfile({ displayName: name });
    await result.user.sendEmailVerification();

    document.getElementById('verifyEmailText').textContent = email;
    showAuthMessage(
      'verifyMessage',
      'Verification Link එක Email එකට යැව්වා. Link එක ඔබා Verify කළ පසු Email සහ Password භාවිතයෙන් Login වෙන්න.'
    );

    verificationPending = true;
    await cloudAuth.signOut();
    authFlowLocked = false;
    showAuthScreen('verifyScreen');

  } catch (e) {
    try {
      if (cloudAuth.currentUser && !cloudAuth.currentUser.emailVerified) {
        await cloudAuth.signOut();
      }
    } catch (signOutError) {
      console.error('Unverified account sign-out failed:', signOutError);
    }

    authFlowLocked = false;
    showAuthMessage('registerMessage', 'Account සෑදීම අසාර්ථකයි: ' + e.message);
  }
};

document.getElementById('cloudResetBtn').onclick = async () => {
  const email = document.getElementById('cloudEmail').value.trim();

  if (!email) {
    alert('Password Reset කිරීමට Email එක ඇතුළත් කරන්න.');
    return;
  }

  try {
    await cloudAuth.sendPasswordResetEmail(email);
    alert('Password Reset Link එක Email එකට යැව්වා.');
  } catch (e) {
    alert('Reset Email යැවීම අසාර්ථකයි: ' + e.message);
  }
};




// Farmer / AI Cloud Delete Queues
const PROFILE_DELETE_KEY = 'fieldOfficerTracker_profileDeletes_v1';
let profileDeleteQueues = { farmers: [], inseminations: [] };

try {
  profileDeleteQueues = JSON.parse(
    localStorage.getItem(PROFILE_DELETE_KEY) || '{"farmers":[],"inseminations":[]}'
  );
  if (!profileDeleteQueues || typeof profileDeleteQueues !== 'object') {
    profileDeleteQueues = { farmers: [], inseminations: [] };
  }
  ['farmers', 'inseminations'].forEach(k => {
    if (!Array.isArray(profileDeleteQueues[k])) profileDeleteQueues[k] = [];
  });
} catch (e) {
  profileDeleteQueues = { farmers: [], inseminations: [] };
}

function saveProfileDeleteQueues() {
  localStorage.setItem(PROFILE_DELETE_KEY, JSON.stringify(profileDeleteQueues));
}

window.queueProfileCloudDelete = function(collectionName, id) {
  if (!['farmers', 'inseminations'].includes(collectionName)) return;
  id = String(id);
  if (!profileDeleteQueues[collectionName].includes(id)) {
    profileDeleteQueues[collectionName].push(id);
    saveProfileDeleteQueues();
  }
};

// Farmer Profiles සහ AI Records Cloud Sync
async function syncProfileCollection(collectionName, localItems, storageKey) {
  const ref = cloudDB.collection('users')
    .doc(cloudUser.uid)
    .collection(collectionName);

  // Delete queued profile records before downloading cloud data.
  const queued = profileDeleteQueues[collectionName] || [];
  if (queued.length > 0) {
    if (queued.length > 450) {
      throw new Error(collectionName + ' pending deletes ගණන වැඩියි.');
    }

    const deleteBatch = cloudDB.batch();
    queued.forEach(id => deleteBatch.delete(ref.doc(String(id))));
    await deleteBatch.commit();

    profileDeleteQueues[collectionName] = [];
    saveProfileDeleteQueues();
  }

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


// Switch local data safely between Guest and individual accounts.
async function activateAccountStorage(namespace) {
  const next = namespace || 'guest';
  const current = window.getAppStorageNamespace();

  if (current === next) return;

  // Save the outgoing namespace before switching.
  localStorage.setItem('fieldOfficerTracker_v1', JSON.stringify(visits));
  localStorage.setItem('fieldOfficerTracker_farmers_v1', JSON.stringify(farmers));
  localStorage.setItem('fieldOfficerTracker_inseminations_v1', JSON.stringify(inseminations));
  localStorage.setItem(DELETE_KEY, JSON.stringify(pendingDeletes));
  localStorage.setItem(PROFILE_DELETE_KEY, JSON.stringify(profileDeleteQueues));

  // Activate the new namespace.
  window.setAppStorageNamespace(next);

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (e) {
      return [];
    }
  }

  visits = readArray('fieldOfficerTracker_v1');
  farmers = readArray('fieldOfficerTracker_farmers_v1');
  inseminations = readArray('fieldOfficerTracker_inseminations_v1');
  pendingDeletes = readArray(DELETE_KEY);

  try {
    profileDeleteQueues = JSON.parse(
      localStorage.getItem(PROFILE_DELETE_KEY) ||
      '{"farmers":[],"inseminations":[]}'
    );
    if (!profileDeleteQueues || typeof profileDeleteQueues !== 'object') {
      profileDeleteQueues = { farmers: [], inseminations: [] };
    }
    ['farmers', 'inseminations'].forEach(k => {
      if (!Array.isArray(profileDeleteQueues[k])) {
        profileDeleteQueues[k] = [];
      }
    });
  } catch (e) {
    profileDeleteQueues = { farmers: [], inseminations: [] };
  }

  render();
  if (typeof refreshFarmerSelect === 'function') refreshFarmerSelect();
  if (typeof refreshAiFarmerSelect === 'function') refreshAiFarmerSelect();

  const aiSelect = document.getElementById('aiFarmerSelect');
  if (aiSelect) {
    document.getElementById('aiRecordsList').innerHTML = '';
    document.getElementById('aiRecordForm').style.display = 'none';
  }

  const farmerDetails = document.getElementById('farmerDetails');
  if (farmerDetails) farmerDetails.innerHTML = '';
}


// ================= USER PROFILE =================

function setUserProfileMessage(message, isError = false) {
  const el = document.getElementById('userProfileMessage');
  if (!el) return;

  el.textContent = message;
  el.style.color = isError ? '#b91c1c' : '#15803d';
}

function showUserProfileData(profile = {}) {
  const user = cloudAuth.currentUser;
  if (!user) return;

  const nameInput = document.getElementById('userProfileName');
  const phoneInput = document.getElementById('userProfilePhone');
  const emailText = document.getElementById('userProfileEmail');
  const photoPreview = document.getElementById('userProfilePhotoPreview');
  const initial = document.getElementById('userProfileInitial');

  const name = profile.name || user.displayName || '';
  const phone = profile.phone || '';
  const photoURL = profile.photoURL || user.photoURL || '';

  if (nameInput) nameInput.value = name;
  if (phoneInput) phoneInput.value = phone;

  if (emailText) {
    emailText.textContent = '📧 ' + (user.email || '');
  }

  if (photoURL) {
    if (photoPreview) {
      photoPreview.src = photoURL;
      photoPreview.style.display = 'block';
    }
    if (initial) initial.style.display = 'none';
  } else {
    if (photoPreview) {
      photoPreview.removeAttribute('src');
      photoPreview.style.display = 'none';
    }

    if (initial) {
      initial.style.display = 'flex';
      initial.textContent = name
        ? name.charAt(0).toUpperCase()
        : '👤';
    }
  }
}

async function loadUserProfile() {
  const user = cloudAuth.currentUser;
  if (!user) return;

  try {
    const doc = await cloudDB
      .collection('users')
      .doc(user.uid)
      .get();

    const profile = doc.exists ? (doc.data().profile || {}) : {};
    showUserProfileData(profile);

  } catch (e) {
    console.error('User profile load failed:', e);
    showUserProfileData();
  }
}


async function compressProfilePhoto(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Photo එක කියවීම අසාර්ථකයි.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Photo එක විවෘත කළ නොහැක.'));
    img.src = dataUrl;
  });

  const maxDimension = 400;
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.width, image.height)
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo Compression අසාර්ථකයි.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.75, 0.65, 0.55, 0.45]) {
    const compressed = canvas.toDataURL('image/jpeg', quality);
    if (compressed.length <= 400000) return compressed;
  }

  throw new Error('Photo එක Compress කළත් විශාලයි. වෙනත් Photo එකක් තෝරන්න.');
}

async function saveUserProfile() {
  const user = cloudAuth.currentUser;

  if (!user) {
    alert('Login වෙන්න.');
    return;
  }

  const name = document.getElementById('userProfileName').value.trim();
  const phone = document.getElementById('userProfilePhone').value.trim();
  const fileInput = document.getElementById('userProfilePhoto');

  if (!name) {
    setUserProfileMessage('ඔබගේ නම ඇතුළත් කරන්න.', true);
    return;
  }

  setUserProfileMessage('Profile Save වෙමින් පවතී...');

  try {
    // කලින් Save කර ඇති Profile Photo එක මුලින් ලබාගන්න.
    const existingDoc = await cloudDB
      .collection('users')
      .doc(user.uid)
      .get();

    const existingProfile = existingDoc.exists
      ? (existingDoc.data().profile || {})
      : {};

    let photoURL = existingProfile.photoURL || user.photoURL || '';

    // අලුත් Photo එකක් තෝරා ඇත්නම් පමණක් Compress කරගන්න.
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];

      if (!file.type.startsWith('image/')) {
        throw new Error('Image file එකක් තෝරන්න.');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Photo එක 10 MB ට අඩු එකක් තෝරන්න.');
      }

      photoURL = await compressProfilePhoto(file);
    }

    await cloudDB
      .collection('users')
      .doc(user.uid)
      .set({
        profile: {
          name,
          phone,
          photoURL,
          email: user.email || '',
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });

    await user.updateProfile({
      displayName: name
    });

    showUserProfileData({
      name,
      phone,
      photoURL
    });

    if (fileInput) fileInput.value = '';

    setUserProfileMessage('✅ Profile සාර්ථකව Save කළා.');

  } catch (e) {
    console.error('User profile save failed:', e);
    setUserProfileMessage(
      '❌ Profile Save කිරීම අසාර්ථකයි: ' + e.message,
      true
    );
  }
}

async function sendUserProfilePasswordReset() {
  const user = cloudAuth.currentUser;

  if (!user || !user.email) {
    alert('Login වෙලා නැහැ.');
    return;
  }

  try {
    await cloudAuth.sendPasswordResetEmail(user.email);
    alert('Password Reset Link එක ඔබගේ Email එකට යැව්වා.');
  } catch (e) {
    alert('Password Reset Link යැවීම අසාර්ථකයි: ' + e.message);
  }
}

async function logoutFromUserProfile() {
  cloudReady = false;
  cloudUser = null;
  await cloudAuth.signOut();
}

window.loadUserProfile = loadUserProfile;

// USER PROFILE BUTTONS
document.getElementById('saveUserProfileBtn').addEventListener(
  'click',
  saveUserProfile
);

document.getElementById('userProfilePasswordBtn').addEventListener(
  'click',
  sendUserProfilePasswordReset
);

document.getElementById('profileLogoutBtn').addEventListener(
  'click',
  logoutFromUserProfile
);

// Photo Preview
document.getElementById('userProfilePhoto').addEventListener(
  'change',
  function () {
    const file = this.files && this.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Image file එකක් තෝරන්න.');
      this.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const preview = document.getElementById(
        'userProfilePhotoPreview'
      );
      const initial = document.getElementById(
        'userProfileInitial'
      );

      preview.src = e.target.result;
      preview.style.display = 'block';
      initial.style.display = 'none';
    };

    reader.readAsDataURL(file);
  }
);


// ================================================

async function startCloudSync(user) {
  document.getElementById('appDataArea').style.display = 'none';

  if (!user || !user.emailVerified) {
    cloudReady = false;
    cloudUser = null;
    return;
  }

  await activateAccountStorage(user.uid);
  document.getElementById('appDataArea').style.display = 'block';
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

    // Login වූ User ගේ Profile එක Firebase වලින් Load කරන්න.
    await loadUserProfile();

  } catch (e) {
    console.error(e);
    document.getElementById('saveStatus').textContent =
      'Cloud data load failed. Internet පරීක්ෂා කරන්න.';
  }
}

cloudAuth.onAuthStateChanged(async user => {
  const authArea = document.getElementById('authArea');
  const appArea = document.getElementById('appDataArea');
  const accountCard = document.getElementById('cloudLoginCard');

  if (authFlowLocked) return;

  if (user) {
    try {
      await user.reload();
    } catch (e) {
      console.error('Auth refresh failed:', e);
      await cloudAuth.signOut();
      return;
    }

    if (!user.emailVerified) {
      appArea.style.display = 'none';
      accountCard.style.display = 'none';
      authArea.style.display = 'block';
      cloudReady = false;
      cloudUser = null;
      await activateAccountStorage('guest');

      document.getElementById('verifyEmailText').textContent =
        user.email || '';

      verificationPending = true;
      showAuthMessage(
        'verifyMessage',
        'Email එක Verify කරනතුරු App එකට ඇතුළු විය නොහැක. Email එකේ Link එක ඔබා නැවත Login වෙන්න.'
      );

      showAuthScreen('verifyScreen');
      await cloudAuth.signOut();
      return;
    }

    verificationPending = false;
    authArea.style.display = 'none';
    accountCard.style.display = 'block';
    await startCloudSync(user);

  } else {
    appArea.style.display = 'none';
    accountCard.style.display = 'none';
    authArea.style.display = 'block';

    cloudReady = false;
    cloudUser = null;

    await activateAccountStorage('guest');

    document.getElementById('cloudAccount').textContent =
      'Cloud account: Not signed in';

    if (verificationPending) {
      showAuthScreen('verifyScreen');
    } else {
      showAuthScreen('loginScreen');
    }
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
