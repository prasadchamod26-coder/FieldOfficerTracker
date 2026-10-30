// FIELD OFFICER TRACKER - FARMER PROFILE SYSTEM

const FARMER_KEY = 'fieldOfficerTracker_farmers_v1';
const AI_KEY = 'fieldOfficerTracker_inseminations_v1';

let farmers = [];
let inseminations = [];

try {
  farmers = JSON.parse(localStorage.getItem(FARMER_KEY) || '[]');
  if (!Array.isArray(farmers)) farmers = [];
} catch (e) {
  farmers = [];
}

try {
  inseminations = JSON.parse(localStorage.getItem(AI_KEY) || '[]');
  if (!Array.isArray(inseminations)) inseminations = [];
} catch (e) {
  inseminations = [];
}

function backupBeforeProfileChange() {
  try {
    const visits = JSON.parse(localStorage.getItem('fieldOfficerTracker_v1') || '[]');
    const oldFarmers = JSON.parse(localStorage.getItem(FARMER_KEY) || '[]');
    const oldAI = JSON.parse(localStorage.getItem(AI_KEY) || '[]');

    if (!Array.isArray(visits) ||
        !Array.isArray(oldFarmers) ||
        !Array.isArray(oldAI)) return;

    if (!oldFarmers.length && !oldAI.length) return;

    const key = 'fieldOfficerTracker_autoBackup_v1';
    let backups = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(backups)) backups = [];

    const snapshot = {
      savedAt: new Date().toISOString(),
      visits,
      farmers: oldFarmers,
      inseminations: oldAI
    };

    const signature = JSON.stringify(snapshot);
    if (!backups.length ||
        JSON.stringify(backups[0].farmers || []) !== JSON.stringify(oldFarmers) ||
        JSON.stringify(backups[0].inseminations || []) !== JSON.stringify(oldAI)) {
      backups.unshift(snapshot);
      localStorage.setItem(key, JSON.stringify(backups.slice(0, 3)));
    }
  } catch (e) {
    console.log('Profile auto backup error:', e);
  }
}

function saveFarmers() {
  backupBeforeProfileChange();
  localStorage.setItem(FARMER_KEY, JSON.stringify(farmers));
  if (window.syncProfileData) window.syncProfileData();
}

function saveInseminations() {
  backupBeforeProfileChange();
  localStorage.setItem(AI_KEY, JSON.stringify(inseminations));
  if (window.syncProfileData) window.syncProfileData();
}

function createFarmerId() {
  return 'farmer_' + Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function createRecordId() {
  return 'ai_' + Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

// සත්ව වර්ගයක මුළු ගණන
function calculateAnimalTotal(animal) {
  return Number(animal.female || 0) +
    Number(animal.male || 0) +
    Number(animal.young || 0);
}

// මාස 3කින් Livestock Update කළ යුතුද?
function isLivestockUpdateDue(farmer) {
  if (!farmer.livestockUpdatedAt) return true;

  const last = new Date(farmer.livestockUpdatedAt);
  const next = new Date(last);
  next.setMonth(next.getMonth() + 3);

  return new Date() >= next;
}

// Farmer Profile එකක් Save කිරීම
function addFarmerProfile(data) {
  const farmer = {
    id: createFarmerId(),
    name: data.name || '',
    reg: data.reg || '',
    phone: data.phone || '',
    status: data.status || 'new',
    village: data.village || '',
    latitude: data.latitude || '',
    longitude: data.longitude || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    livestock: data.livestock || {},
    livestockUpdatedAt: new Date().toISOString(),
    livestockHistory: []
  };

  farmers.push(farmer);
  saveFarmers();

  return farmer;
}

// මාස 3ක Livestock Update එකක්
function updateFarmerLivestock(farmerId, livestock, shouldSave = true) {
  const farmer = farmers.find(f => f.id === farmerId);

  if (!farmer) throw new Error('Farmer not found');

  if (farmer.livestock && farmer.livestockUpdatedAt) {
    farmer.livestockHistory = farmer.livestockHistory || [];

    farmer.livestockHistory.push({
      updatedAt: farmer.livestockUpdatedAt,
      livestock: JSON.parse(JSON.stringify(farmer.livestock))
    });
  }

  farmer.livestock = livestock;
  farmer.livestockUpdatedAt = new Date().toISOString();
  farmer.updatedAt = new Date().toISOString();

  if (shouldSave) saveFarmers();
}

// Farmer Profile එකේ සාමාන්‍ය විස්තර Update කිරීම
function updateFarmerProfile(farmerId, data, shouldSave = true) {
  const farmer = farmers.find(f => f.id === farmerId);

  if (!farmer) throw new Error('Farmer not found');

  farmer.name = (data.name !== undefined && data.name !== null ? data.name : farmer.name);
  farmer.reg = (data.reg !== undefined && data.reg !== null ? data.reg : farmer.reg);
  farmer.phone = (data.phone !== undefined && data.phone !== null ? data.phone : farmer.phone);
  farmer.status = (data.status !== undefined && data.status !== null ? data.status : farmer.status);
  farmer.village = (data.village !== undefined && data.village !== null ? data.village : farmer.village);
  farmer.latitude = (data.latitude !== undefined && data.latitude !== null ? data.latitude : farmer.latitude);
  farmer.longitude = (data.longitude !== undefined && data.longitude !== null ? data.longitude : farmer.longitude);
  farmer.updatedAt = new Date().toISOString();

  if (shouldSave) saveFarmers();
}

// කෘත්‍රිම සිංචන වාර්තාවක් Save කිරීම
function addInseminationRecord(data) {
  const record = {
    id: createRecordId(),
    farmerId: data.farmerId,
    species: data.species || '',
    animalTag: data.animalTag || '',
    inseminationDate: data.inseminationDate || '',
    semenStrawNo: data.semenStrawNo || '',
    officer: data.officer || '',
    pregnancyCheckDate: data.pregnancyCheckDate || '',
    result: data.result || 'not_checked',
    createdAt: new Date().toISOString()
  };

  inseminations.push(record);
  saveInseminations();

  return record;
}
// LIVESTOCK INPUT SYSTEM

const livestockTypes = [
  {id:'goats',name:'එළුවන්',breeding:true},
  {id:'cattle',name:'ගවයන්',breeding:true},
  {id:'buffalo',name:'මී ගවයන්',breeding:true},
  {id:'chickens',name:'කුකුළන්'},
  {id:'pigs',name:'ඌරන්'},
  {id:'other',name:'වෙනත් සතුන්'}
];

function renderLivestockInputs(){
  const box=document.getElementById('livestockInputs');
  if(!box)return;

  box.innerHTML=livestockTypes.map(a=>`
    <div class="card" style="background:#f8faf8">
      <h3>${a.name}</h3>

      <label>ගැහැණු සතුන්</label>
      <input type="number" min="0" id="${a.id}_female" value="0">

      <label>පිරිමි සතුන්</label>
      <input type="number" min="0" id="${a.id}_male" value="0">

      <label>පැටවුන්</label>
      <input type="number" min="0" id="${a.id}_young" value="0">

      <p>මුළු සතුන් ගණන:
      <b id="${a.id}_total">0</b></p>

      ${a.breeding?`
        <hr>
        <label>පළමු පැටවා බිහිකළ සතුන්</label>
        <input type="number" min="0" id="${a.id}_firstCalved" value="0">

        <label>තවම පැටවෙකු නොලැබූ, ගැබ් ගැනීමට සුදුසු සතුන්</label>
        <input type="number" min="0" id="${a.id}_eligible" value="0">

        <label>ජීවිත කාලය තුළ පැටවුන් 4ක් හෝ වැඩි ගණනක් ලැබූ සතුන්</label>
        <input type="number" min="0" id="${a.id}_multipleBirths" value="0">
      `:''}
    </div>
  `).join('');

  livestockTypes.forEach(a=>{
    ['female','male','young'].forEach(type=>{
      document.getElementById(a.id+'_'+type)
        .addEventListener('input',()=>updateAnimalTotal(a.id));
    });
  });
}

function updateAnimalTotal(id){
  const female=Number(document.getElementById(id+'_female').value||0);
  const male=Number(document.getElementById(id+'_male').value||0);
  const young=Number(document.getElementById(id+'_young').value||0);

  document.getElementById(id+'_total').textContent=
    female+male+young;
}

function collectLivestockData(){
  const data={};

  livestockTypes.forEach(a=>{
    const animal={
      female:Number(document.getElementById(a.id+'_female').value||0),
      male:Number(document.getElementById(a.id+'_male').value||0),
      young:Number(document.getElementById(a.id+'_young').value||0)
    };

    animal.total=calculateAnimalTotal(animal);

    if(a.breeding){
      animal.firstCalved=Number(document.getElementById(a.id+'_firstCalved').value||0);
      animal.eligibleForPregnancy=Number(document.getElementById(a.id+'_eligible').value||0);
      animal.moreThanThreeOffspring=Number(document.getElementById(a.id+'_multipleBirths').value||0);
    }

    data[a.id]=animal;
  });

  data.milkAnimals=Number(document.getElementById('milkAnimals').value||0);
  data.milkLitres=Number(document.getElementById('milkLitres').value||0);
  data.layingHens=Number(document.getElementById('layingHens').value||0);
  data.dailyEggs=Number(document.getElementById('dailyEggs').value||0);
  data.monthlyPork=Number(document.getElementById('monthlyPork').value||0);

  return data;
}

// Farmer Profile Dropdown
function refreshFarmerSelect(){
 const visitSelect=document.getElementById('visitFarmerSelect');
 if(visitSelect){
  const previous=visitSelect.value;
  visitSelect.innerHTML='<option value="">-- ගොවියෙක් තෝරන්න / Select Farmer --</option>';
  farmers.forEach(f=>{
   const option=document.createElement('option');
   option.value=f.id;
   option.textContent=f.name+(f.reg?' ('+f.reg+')':'');
   visitSelect.appendChild(option);
  });
  if(farmers.some(f=>String(f.id)===previous))visitSelect.value=previous;
 }
  const select=document.getElementById('farmerSelect');
  if(!select)return;

  const selected=select.value;

  select.innerHTML='<option value="">-- ගොවියෙකු තෝරන්න --</option>';

  farmers.forEach(f=>{
    const option=document.createElement('option');
    option.value=f.id;
    option.textContent=f.name+' ('+(f.reg||'ලියාපදිංචි අංකයක් නැත')+')';
    select.appendChild(option);
  });

  select.value=selected;
}

let editingLivestockFarmerId = null;

function showFarmerDetails(farmer){
  const box=document.getElementById('farmerDetails');
  if(!box)return;

  if(!farmer){
    box.innerHTML='';
    return;
  }

  const livestock=farmer.livestock||{};

  const animalRows=livestockTypes.map(a=>{
    const v=livestock[a.id]||{};
    return `
      <p><b>${a.name}</b> — මුළු: ${Number(v.total||0)}
      | ගැහැණු: ${Number(v.female||0)}
      | පිරිමි: ${Number(v.male||0)}
      | පැටවුන්: ${Number(v.young||0)}</p>
      ${a.breeding?`
        <p>පළමු පැටවා ලැබූ: ${Number(v.firstCalved||0)}
        | ගැබ් ගැනීමට සුදුසු: ${Number(v.eligibleForPregnancy||0)}
        | පැටවුන් 4+: ${Number(v.moreThanThreeOffspring||0)}</p>
      `:''}
    `;
  }).join('');

  box.innerHTML=`
    <hr>
    <h3>👨‍🌾 ${farmer.name}</h3>
    <p>ලියාපදිංචි අංකය: ${farmer.reg||'නැත'}</p>
    <p>දුරකථනය: ${farmer.phone||'නැත'}</p>
    <p>ගම: ${farmer.village||'නැත'}</p>

    <h3>🐄 සත්ව තොරතුරු</h3>
    ${animalRows}

    <h3>🥛 කිරි නිෂ්පාදනය</h3>
    <p>කිරි දෙන සතුන්: ${Number(livestock.milkAnimals||0)}</p>
    <p>දිනකට කිරි: ${Number(livestock.milkLitres||0)} ලීටර්</p>

    <h3>🥚 කුකුළු නිෂ්පාදනය</h3>
    <p>බිත්තර දමන කිකිළියන්: ${Number(livestock.layingHens||0)}</p>
    <p>දිනකට බිත්තර: ${Number(livestock.dailyEggs||0)}</p>

    <h3>🥩 ඌරු මස් නිෂ්පාදනය</h3>
    <p>මාසයක මුළු මස් ප්‍රමාණය: ${Number(livestock.monthlyPork||0)} kg</p>

    <p>Livestock අවසන් Update:
    ${farmer.livestockUpdatedAt?
      new Date(farmer.livestockUpdatedAt).toLocaleDateString():'නැත'}</p>

    <p>${isLivestockUpdateDue(farmer)?
      '⚠️ මාස 3ක Livestock Update එක අවශ්‍යයි.':
      '✅ Livestock Update තවම අවශ්‍ය නැහැ.'}</p>

    ${isLivestockUpdateDue(farmer)?
      '<button type="button" id="updateLivestockBtn">🐄 Livestock Update කරන්න</button>':''}
  `;

  const updateBtn=document.getElementById('updateLivestockBtn');
  if(updateBtn){
    updateBtn.addEventListener('click',()=>{
      editingLivestockFarmerId=farmer.id;
      const v=farmer.livestock||{};

      document.getElementById('profileName').value=farmer.name||'';
      document.getElementById('profileReg').value=farmer.reg||'';
      document.getElementById('profilePhone').value=farmer.phone||'';
      document.getElementById('profileVillage').value=farmer.village||'';
      document.getElementById('profileStatus').value=farmer.status||'registered';

      livestockTypes.forEach(a=>{
        const animal=v[a.id]||{};
        ['female','male','young'].forEach(type=>{
          document.getElementById(a.id+'_'+type).value=animal[type]||0;
        });
        if(a.breeding){
          document.getElementById(a.id+'_firstCalved').value=animal.firstCalved||0;
          document.getElementById(a.id+'_eligible').value=animal.eligibleForPregnancy||0;
          document.getElementById(a.id+'_multipleBirths').value=animal.moreThanThreeOffspring||0;
        }
        updateAnimalTotal(a.id);
      });

      ['milkAnimals','milkLitres','layingHens','dailyEggs','monthlyPork'].forEach(id=>{
        document.getElementById(id).value=v[id]||0;
      });

      document.getElementById('farmerProfileForm').style.display='block';
      document.getElementById('saveFarmerBtn').textContent='💾 Livestock Update Save කරන්න';
      alert('දත්ත වෙනස් කර Save කරන්න.');
    });
  }
}

// New Farmer
document.getElementById('newFarmerBtn').addEventListener('click',()=>{
  editingLivestockFarmerId=null;
  document.getElementById('saveFarmerBtn').textContent='💾 ගොවි පැතිකඩ Save කරන්න';

  const fields = [
    'profileName','profileReg','profilePhone','profileVillage',
    'milkAnimals','milkLitres','layingHens','dailyEggs','monthlyPork'
  ];

  fields.forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value='';
  });

  document.getElementById('profileStatus').value='registered';

  livestockTypes.forEach(a=>{
    ['female','male','young','firstCalved','eligible','multipleBirths']
      .forEach(type=>{
        const el=document.getElementById(a.id+'_'+type);
        if(el) el.value=0;
      });
    updateAnimalTotal(a.id);
  });

  document.getElementById('farmerProfileForm').style.display='block';
});

// Save Farmer
document.getElementById('saveFarmerBtn').addEventListener('click',()=>{
  const name=document.getElementById('profileName').value.trim();

  if(!name){
    alert('ගොවි නම ඇතුළත් කරන්න.');
    return;
  }

  let farmer;

  if(editingLivestockFarmerId){
    const farmerId=editingLivestockFarmerId;

    updateFarmerProfile(farmerId,{
      name,
      reg:document.getElementById('profileReg').value.trim(),
      phone:document.getElementById('profilePhone').value.trim(),
      status:document.getElementById('profileStatus').value,
      village:document.getElementById('profileVillage').value.trim()
    }, false);

    updateFarmerLivestock(farmerId,collectLivestockData(), false);
    saveFarmers();

    editingLivestockFarmerId=null;
    farmer=farmers.find(f=>f.id===farmerId);
    document.getElementById('saveFarmerBtn').textContent='💾 ගොවි පැතිකඩ Save කරන්න';
  } else {
    farmer=addFarmerProfile({
      name,
      reg:document.getElementById('profileReg').value.trim(),
      phone:document.getElementById('profilePhone').value.trim(),
      status:document.getElementById('profileStatus').value,
      village:document.getElementById('profileVillage').value.trim(),
      livestock:collectLivestockData()
    });
  }

  refreshFarmerSelect();
  refreshAiFarmerSelect();
  document.getElementById('farmerSelect').value=farmer.id;
  showFarmerDetails(farmer);

  document.getElementById('farmerProfileForm').style.display='none';

  alert('ගොවි පැතිකඩ සාර්ථකව Save කළා.');
});

// Select Farmer
document.getElementById('farmerSelect').addEventListener('change',e=>{
  const farmer=farmers.find(f=>f.id===e.target.value);
  showFarmerDetails(farmer);
});


// ARTIFICIAL INSEMINATION RECORDS
function refreshAiFarmerSelect(){
  const select=document.getElementById('aiFarmerSelect');
  select.innerHTML='<option value="">-- ගොවියෙකු තෝරන්න --</option>';

  farmers.forEach(f=>{
    const option=document.createElement('option');
    option.value=f.id;
    option.textContent=f.name;
    select.appendChild(option);
  });
}

function renderAiRecords(farmerId){
  const box=document.getElementById('aiRecordsList');
  const records=inseminations.filter(r=>r.farmerId===farmerId);

  if(!records.length){
    box.innerHTML='<p>මෙම ගොවියාට AI වාර්තා තවම නැත.</p>';
    return;
  }

  const speciesNames={
    goats:'එළුවන්', cattle:'ගවයන්',
    buffalo:'මී ගවයන්', other:'වෙනත්'
  };

  const resultNames={
    pregnant:'ගැබ්ගෙන ඇත',
    not_pregnant:'ගැබ්ගෙන නැත',
    not_checked:'තවම පරීක්ෂා කර නැත'
  };

  box.innerHTML='<h3>📋 AI වාර්තා ඉතිහාසය</h3>'+
    records.slice().reverse().map(r=>`
      <div class="card">
        <p><b>සත්ව වර්ගය:</b> ${speciesNames[r.species]||r.species}</p>
        <p><b>සත්ව අංකය:</b> ${r.animalTag||'-'}</p>
        <p><b>සිංචන දිනය:</b> ${r.inseminationDate||'-'}</p>
        <p><b>වීර්ය මාත්‍රා අංකය:</b> ${r.semenStrawNo||'-'}</p>
        <p><b>නිලධාරියා:</b> ${r.officer||'-'}</p>
        <p><b>ගැබ් පරීක්ෂණ දිනය:</b> ${r.pregnancyCheckDate||'-'}</p>
        <p><b>ප්‍රතිඵලය:</b> ${resultNames[r.result]||r.result}</p>
      </div>
    `).join('');
}

document.getElementById('aiFarmerSelect').addEventListener('change',e=>{
  const farmerId=e.target.value;
  document.getElementById('aiRecordForm').style.display=farmerId?'block':'none';
  document.getElementById('aiRecordsList').innerHTML='';
  if(farmerId) renderAiRecords(farmerId);
});

document.getElementById('saveAiRecordBtn').addEventListener('click',()=>{
  const farmerId=document.getElementById('aiFarmerSelect').value;
  const inseminationDate=document.getElementById('aiDate').value;

  if(!farmerId){
    alert('පළමුව ගොවියෙක් තෝරන්න.');
    return;
  }

  if(!inseminationDate){
    alert('කෘත්‍රිම සිංචන දිනය ඇතුළත් කරන්න.');
    return;
  }

  addInseminationRecord({
    farmerId,
    species:document.getElementById('aiSpecies').value,
    animalTag:document.getElementById('aiAnimalTag').value.trim(),
    inseminationDate,
    semenStrawNo:document.getElementById('aiStrawNo').value.trim(),
    officer:document.getElementById('aiOfficer').value.trim(),
    pregnancyCheckDate:document.getElementById('aiCheckDate').value,
    result:document.getElementById('aiResult').value
  });

  ['aiAnimalTag','aiDate','aiStrawNo','aiOfficer','aiCheckDate']
    .forEach(id=>document.getElementById(id).value='');

  document.getElementById('aiResult').value='not_checked';

  renderAiRecords(farmerId);
  alert('AI වාර්තාව සාර්ථකව Save කළා.');
});

renderLivestockInputs();
refreshFarmerSelect();
refreshAiFarmerSelect();
console.log('Farmer Profile System Loaded');
