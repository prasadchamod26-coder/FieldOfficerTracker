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
  if (typeof refreshAreaStatisticsDashboard === 'function') {
    refreshAreaStatisticsDashboard();
  }
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
  if (animal && (
    Object.prototype.hasOwnProperty.call(animal, 'eggLaying') ||
    Object.prototype.hasOwnProperty.call(animal, 'eggNotLaying') ||
    Object.prototype.hasOwnProperty.call(animal, 'meat') ||
    Object.prototype.hasOwnProperty.call(animal, 'village') ||
    Object.prototype.hasOwnProperty.call(animal, 'legacyUnclassified')
  )) {
    return Number(animal.eggLaying || 0) +
      Number(animal.eggNotLaying || 0) +
      Number(animal.meat || 0) +
      Number(animal.village || 0) +
      Number(animal.legacyUnclassified || 0);
  }

  return Number(animal.female || 0) +
    Number(animal.male || 0) +
    Number(animal.femaleYoung || 0) +
    Number(animal.maleYoung || 0) +
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

let selectedLivestockTypes = [];

function renderLivestockInputs(){
  const box=document.getElementById('livestockInputs');
  if(!box)return;

  box.innerHTML=`
    <h3>සත්ව වර්ග තෝරන්න</h3>
    <div id="livestockTypeChoices" class="card"></div>
    <div id="livestockTypeForms"></div>
  `;

  const choices=document.getElementById('livestockTypeChoices');
  choices.innerHTML=livestockTypes.map(a=>`
    <label style="display:flex;align-items:center;gap:10px">
      <input type="checkbox" id="select_${a.id}" value="${a.id}"
        style="width:auto">
      ${a.name}
    </label>
  `).join('');

  const forms=document.getElementById('livestockTypeForms');
  forms.innerHTML=livestockTypes.map(a=>`
    <div class="card" id="form_${a.id}" style="display:none;background:#f8faf8">
      <h3>${a.name}</h3>
      ${a.id==='chickens' ? `
        <h4>🥚 බිත්තර සඳහා ඇති කරන කුකුළන්</h4>
        <label>බිත්තර දමන කිකිළියන්</label>
        <input type="number" min="0" id="chickens_eggLaying" value="0">
        <label>තවම බිත්තර නොදමන කිකිළියන්</label>
        <input type="number" min="0" id="chickens_eggNotLaying" value="0">
        <hr>
        <h4>🥩 මස් සඳහා ඇති කරන කුකුළන්</h4>
        <input type="number" min="0" id="chickens_meat" value="0">
        <hr>
        <h4>🐓 ගම් කුකුළන්</h4>
        <input type="number" min="0" id="chickens_village" value="0">
        <div id="chickens_legacyBox" style="display:none">
          <hr>
          <label>පැරණි වාර්තාවේ වර්ගීකරණය නොකළ කුකුළන්</label>
          <input type="number" min="0" id="chickens_legacyUnclassified" value="0">
          <small>පැරණි දත්ත ආරක්ෂා කර ඇත. අලුත් වර්ගවලට බෙදා ඇත්නම් මෙය 0 කරන්න.</small>
        </div>
        <p>මුළු කුකුළන් ගණන: <b id="chickens_total">0</b></p>
      ` : `
        <label>ගැහැණු සතුන්</label>
        <input type="number" min="0" id="${a.id}_female" value="0">
        <label>පිරිමි සතුන්</label>
        <input type="number" min="0" id="${a.id}_male" value="0">
        <label>ගැහැණු පැටවුන්</label>
        <input type="number" min="0" id="${a.id}_femaleYoung" value="0">
        <label>පිරිමි පැටවුන්</label>
        <input type="number" min="0" id="${a.id}_maleYoung" value="0">
        <p>මුළු පැටවුන් ගණන: <b id="${a.id}_youngTotal">0</b></p>
        <p>මුළු සතුන් ගණන: <b id="${a.id}_total">0</b></p>
      `}
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
    const checkbox=document.getElementById('select_'+a.id);
    checkbox.addEventListener('change',()=>{
      const form=document.getElementById('form_'+a.id);
      form.style.display=checkbox.checked?'block':'none';
      if(checkbox.checked && !selectedLivestockTypes.includes(a.id)){
        selectedLivestockTypes.push(a.id);
      }else if(!checkbox.checked){
        selectedLivestockTypes=selectedLivestockTypes.filter(id=>id!==a.id);
      }
    });

    if(a.id==='chickens'){
      ['eggLaying','eggNotLaying','meat','village','legacyUnclassified']
        .forEach(type=>{
          const input=document.getElementById('chickens_'+type);
          if(input) input.addEventListener('input',()=>updateAnimalTotal('chickens'));
        });
    }else{
      ['female','male','femaleYoung','maleYoung'].forEach(type=>{
        document.getElementById(a.id+'_'+type)
          .addEventListener('input',()=>updateAnimalTotal(a.id));
      });
    }
  });
}

function setSelectedLivestockTypes(types=[]){
  selectedLivestockTypes=[...new Set(types)];
  livestockTypes.forEach(a=>{
    const checkbox=document.getElementById('select_'+a.id);
    const form=document.getElementById('form_'+a.id);
    if(!checkbox || !form)return;
    checkbox.checked=selectedLivestockTypes.includes(a.id);
    form.style.display=checkbox.checked?'block':'none';
  });
}

function updateAnimalTotal(id){
  if(id==='chickens'){
    const total=['eggLaying','eggNotLaying','meat','village','legacyUnclassified']
      .reduce((sum,type)=>{
        const el=document.getElementById('chickens_'+type);
        return sum+Number(el?.value||0);
      },0);
    const totalEl=document.getElementById('chickens_total');
    if(totalEl) totalEl.textContent=total;
    return;
  }

  const female=Number(document.getElementById(id+'_female').value||0);
  const male=Number(document.getElementById(id+'_male').value||0);
  const femaleYoung=Number(document.getElementById(id+'_femaleYoung').value||0);
  const maleYoung=Number(document.getElementById(id+'_maleYoung').value||0);
  const young=femaleYoung+maleYoung;

  document.getElementById(id+'_youngTotal').textContent=young;
  document.getElementById(id+'_total').textContent=female+male+young;
}

function collectLivestockData(existingLivestock={}){
  const data=JSON.parse(JSON.stringify(existingLivestock||{}));

  livestockTypes.forEach(a=>{
    if(!data[a.id])data[a.id]={};

    if(!selectedLivestockTypes.includes(a.id))return;

    const old=data[a.id];
    let animal;

    if(a.id==='chickens'){
      animal={
        ...old,
        eggLaying:Number(document.getElementById('chickens_eggLaying').value||0),
        eggNotLaying:Number(document.getElementById('chickens_eggNotLaying').value||0),
        meat:Number(document.getElementById('chickens_meat').value||0),
        village:Number(document.getElementById('chickens_village').value||0),
        legacyUnclassified:Number(document.getElementById('chickens_legacyUnclassified')?.value||0)
      };
    }else{
      animal={
        ...old,
        female:Number(document.getElementById(a.id+'_female').value||0),
        male:Number(document.getElementById(a.id+'_male').value||0),
        femaleYoung:Number(document.getElementById(a.id+'_femaleYoung').value||0),
        maleYoung:Number(document.getElementById(a.id+'_maleYoung').value||0)
      };
    }

    // පැරණි young අගය වෙනස් නොකර ආරක්ෂා කරයි.
    animal.total=calculateAnimalTotal(animal);

    if(a.breeding){
      animal.firstCalved=Number(document.getElementById(a.id+'_firstCalved').value||0);
      animal.eligibleForPregnancy=Number(document.getElementById(a.id+'_eligible').value||0);
      animal.moreThanThreeOffspring=Number(document.getElementById(a.id+'_multipleBirths').value||0);
    }

    data[a.id]=animal;
  });

  data.selectedSpecies=[...selectedLivestockTypes];

  data.milkAnimals=Number(document.getElementById('milkAnimals').value||0);
  data.milkLitres=Number(document.getElementById('milkLitres').value||0);
  data.buffaloMilkAnimals=Number(document.getElementById('buffaloMilkAnimals').value||0);
  data.buffaloMilkLitres=Number(document.getElementById('buffaloMilkLitres').value||0);
  data.goatMilkAnimals=Number(document.getElementById('goatMilkAnimals').value||0);
  data.goatMilkLitres=Number(document.getElementById('goatMilkLitres').value||0);
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
  if (typeof refreshAreaStatisticsDashboard === 'function') {
    refreshAreaStatisticsDashboard();
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
let editingFarmerMode = null;

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

    if(a.id==='chickens'){
      const hasNewChickenFields=[
        'eggLaying','eggNotLaying','meat','village','legacyUnclassified'
      ].some(key=>Object.prototype.hasOwnProperty.call(v,key));

      const total=hasNewChickenFields
        ? calculateAnimalTotal(v)
        : Number(v.total||calculateAnimalTotal(v));

      // සතුන් නැත්නම් මේ වර්ගය පෙන්වන්න එපා
      if(total <= 0) return '';

      return `
        <p><b>🐓 ${a.name}</b> — මුළු: ${total}</p>
        ${hasNewChickenFields ? `
          <p>🥚 බිත්තර දමන කිකිළියන්: ${Number(v.eggLaying||0)}
          | 🥚 තවම බිත්තර නොදමන කිකිළියන්: ${Number(v.eggNotLaying||0)}</p>
          <p>🥩 මස් සඳහා: ${Number(v.meat||0)}
          | 🐓 ගම් කුකුළන්: ${Number(v.village||0)}</p>
          ${Number(v.legacyUnclassified||0)>0
            ? `<p>පැරණි වර්ගීකරණය නොකළ: ${Number(v.legacyUnclassified||0)}</p>`
            : ''}
        ` : `
          <p>ගැහැණු: ${Number(v.female||0)}
          | පිරිමි: ${Number(v.male||0)}
          | පැටවුන්: ${
            Number(v.femaleYoung||0)+
            Number(v.maleYoung||0)+
            Number(v.young||0)
          }</p>
        `}
      `;
    }

    const total = Number(v.total || calculateAnimalTotal(v));

    // සතුන් නැත්නම් මේ වර්ගය පෙන්වන්න එපා
    if(total <= 0) return '';

    return `
      <p><b>${a.name}</b> — මුළු: ${total}
      | ගැහැණු: ${Number(v.female||0)}
      | පිරිමි: ${Number(v.male||0)}
      | ගැහැණු පැටවුන්: ${Number(v.femaleYoung||0)}
      | පිරිමි පැටවුන්: ${Number(v.maleYoung||0)}
      | මුළු පැටවුන්: ${
        Number(v.femaleYoung||0)+
        Number(v.maleYoung||0)+
        Number(v.young||0)
      }</p>
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

    <h4>🐄 එළ ගව කිරි</h4>
    <p>කිරි දෙන එළ ගවයන්: ${Number(livestock.milkAnimals||0)}</p>
    <p>දිනකට කිරි: ${Number(livestock.milkLitres||0)} ලීටර්</p>

    <h4>🐃 මී ගව කිරි</h4>
    <p>කිරි දෙන මී ගවයන්: ${Number(livestock.buffaloMilkAnimals||0)}</p>
    <p>දිනකට කිරි: ${Number(livestock.buffaloMilkLitres||0)} ලීටර්</p>

    <h4>🐐 එළු කිරි</h4>
    <p>කිරි දෙන එළුවන්: ${Number(livestock.goatMilkAnimals||0)}</p>
    <p>දිනකට කිරි: ${Number(livestock.goatMilkLitres||0)} ලීටර්</p>

    <h3>🥚 කුකුළු නිෂ්පාදනය</h3>
    <p>දිනකට බිත්තර: ${Number(livestock.dailyEggs||0)}</p>

    <h3>🥩 ඌරු මස් නිෂ්පාදනය</h3>
    <p>මාසයක මුළු මස් ප්‍රමාණය: ${Number(livestock.monthlyPork||0)} kg</p>

    <p>Livestock අවසන් Update:
    ${farmer.livestockUpdatedAt?
      new Date(farmer.livestockUpdatedAt).toLocaleDateString():'නැත'}</p>

    <p>${isLivestockUpdateDue(farmer)?
      '⚠️ මාස 3ක Livestock Update එක අවශ්‍යයි.':
      '✅ Livestock Update තවම අවශ්‍ය නැහැ.'}</p>

    <button type="button" id="editFarmerProfileBtn">✏️ ගොවි විස්තර සංස්කරණය කරන්න</button>

    ${isLivestockUpdateDue(farmer)?
      '<button type="button" id="updateLivestockBtn">🐄 Livestock Update කරන්න</button>':''}

    <hr>
    <button type="button" id="deleteFarmerBtn" class="danger">
      🗑️ ගොවි පැතිකඩ Delete කරන්න
    </button>
  `;

  const deleteBtn = document.getElementById('deleteFarmerBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const relatedAI = inseminations.filter(
        r => String(r.farmerId) === String(farmer.id)
      );

      const message =
        'ඔබට "' + farmer.name + '" ගොවි පැතිකඩ Delete කිරීමට අවශ්‍යද?\n\n' +
        'ගොවි පැතිකඩ සහ අදාළ AI වාර්තා ' + relatedAI.length +
        ' ක් Delete වේ.\n\n' +
        'පැරණි Visit History එක Delete නොවේ.';

      if (!confirm(message)) return;

      // Queue cloud deletions before removing local records.
      if (window.queueProfileCloudDelete) {
        window.queueProfileCloudDelete('farmers', farmer.id);
        relatedAI.forEach(r => {
          window.queueProfileCloudDelete('inseminations', r.id);
        });
      }

      farmers = farmers.filter(
        f => String(f.id) !== String(farmer.id)
      );

      inseminations = inseminations.filter(
        r => String(r.farmerId) !== String(farmer.id)
      );

      backupBeforeProfileChange();
      localStorage.setItem(FARMER_KEY, JSON.stringify(farmers));
      localStorage.setItem(AI_KEY, JSON.stringify(inseminations));
      if (window.syncProfileData) window.syncProfileData();

      editingLivestockFarmerId = null;
      document.getElementById('farmerProfileForm').style.display = 'none';

      refreshFarmerSelect();
      refreshAiFarmerSelect();

      document.getElementById('farmerSelect').value = '';
      document.getElementById('aiFarmerSelect').value = '';
      document.getElementById('aiRecordForm').style.display = 'none';
      document.getElementById('aiRecordsList').innerHTML = '';

      showFarmerDetails(null);

      alert('ගොවි පැතිකඩ සහ අදාළ AI වාර්තා Delete කළා. පැරණි Visit History එක ආරක්ෂිතයි.');
    });
  }

  const editProfileBtn=document.getElementById('editFarmerProfileBtn');
  if(editProfileBtn){
    editProfileBtn.addEventListener('click',()=>{
      editingLivestockFarmerId=farmer.id;
      editingFarmerMode='profile';

      document.getElementById('profileName').value=farmer.name||'';
      document.getElementById('profileReg').value=farmer.reg||'';
      document.getElementById('profilePhone').value=farmer.phone||'';
      document.getElementById('profileVillage').value=farmer.village||'';
      document.getElementById('profileStatus').value=farmer.status||'registered';

      document.getElementById('farmerProfileForm').style.display='block';
      document.getElementById('saveFarmerBtn').textContent='💾 ගොවි විස්තර Update කරන්න';
      alert('ගොවි විස්තර වෙනස් කර Save කරන්න.');
    });
  }

  const updateBtn=document.getElementById('updateLivestockBtn');
  if(updateBtn){
    updateBtn.addEventListener('click',()=>{
      editingLivestockFarmerId=farmer.id;
      editingFarmerMode='livestock';
      const v=farmer.livestock||{};

      document.getElementById('profileName').value=farmer.name||'';
      document.getElementById('profileReg').value=farmer.reg||'';
      document.getElementById('profilePhone').value=farmer.phone||'';
      document.getElementById('profileVillage').value=farmer.village||'';
      document.getElementById('profileStatus').value=farmer.status||'registered';

      const savedTypes = livestockTypes
        .filter(a=>{
          const animal=v[a.id]||{};
          return calculateAnimalTotal(animal)>0;
        })
        .map(a=>a.id);

      const selectedTypes = Array.isArray(v.selectedSpecies)
        ? [...new Set(v.selectedSpecies.filter(id=>
            livestockTypes.some(a=>a.id===id)
          ))]
        : savedTypes;

      setSelectedLivestockTypes(selectedTypes);

      livestockTypes.forEach(a=>{
        const animal=v[a.id]||{};
        if(a.id==='chickens'){
          const hasNewChickenFields=[
            'eggLaying','eggNotLaying','meat','village','legacyUnclassified'
          ].some(key=>Object.prototype.hasOwnProperty.call(animal,key));

          document.getElementById('chickens_eggLaying').value=animal.eggLaying||0;
          document.getElementById('chickens_eggNotLaying').value=animal.eggNotLaying||0;
          document.getElementById('chickens_meat').value=animal.meat||0;
          document.getElementById('chickens_village').value=animal.village||0;

          const legacyBox=document.getElementById('chickens_legacyBox');
          const legacyInput=document.getElementById('chickens_legacyUnclassified');
          const legacyCount=hasNewChickenFields
            ? Number(animal.legacyUnclassified||0)
            : calculateAnimalTotal(animal);

          legacyInput.value=legacyCount;
          legacyBox.style.display=legacyCount>0?'block':'none';
        }else{
          ['female','male','femaleYoung','maleYoung'].forEach(type=>{
            document.getElementById(a.id+'_'+type).value=animal[type]||0;
          });
        }
        if(a.breeding){
          document.getElementById(a.id+'_firstCalved').value=animal.firstCalved||0;
          document.getElementById(a.id+'_eligible').value=animal.eligibleForPregnancy||0;
          document.getElementById(a.id+'_multipleBirths').value=animal.moreThanThreeOffspring||0;
        }
        updateAnimalTotal(a.id);
      });

      ['milkAnimals','milkLitres','buffaloMilkAnimals','buffaloMilkLitres',
       'goatMilkAnimals','goatMilkLitres','dailyEggs','monthlyPork'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.value=v[id]||0;
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
  editingFarmerMode=null;
  document.getElementById('saveFarmerBtn').textContent='💾 ගොවි පැතිකඩ Save කරන්න';

  const fields = [
    'profileName','profileReg','profilePhone','profileVillage',
    'milkAnimals','milkLitres','buffaloMilkAnimals','buffaloMilkLitres',
    'goatMilkAnimals','goatMilkLitres','dailyEggs','monthlyPork'
  ];

  fields.forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value='';
  });

  document.getElementById('profileStatus').value='registered';

  setSelectedLivestockTypes([]);

  livestockTypes.forEach(a=>{
    if(a.id==='chickens'){
      ['eggLaying','eggNotLaying','meat','village','legacyUnclassified']
        .forEach(type=>{
          const el=document.getElementById('chickens_'+type);
          if(el) el.value=0;
        });
      const legacyBox=document.getElementById('chickens_legacyBox');
      if(legacyBox) legacyBox.style.display='none';
    }else{
      ['female','male','femaleYoung','maleYoung','firstCalved','eligible','multipleBirths']
        .forEach(type=>{
          const el=document.getElementById(a.id+'_'+type);
          if(el) el.value=0;
        });
    }
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

    if(editingFarmerMode==='livestock'){
      const existingFarmer=farmers.find(f=>String(f.id)===String(farmerId));
      updateFarmerLivestock(
        farmerId,
        collectLivestockData(existingFarmer?.livestock||{}),
        false
      );
    }

    saveFarmers();

    editingLivestockFarmerId=null;
    editingFarmerMode=null;
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
initializeAreaStatisticsDashboard();
refreshFarmerSelect();
refreshAiFarmerSelect();


// AREA STATISTICS DASHBOARD
function areaNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getAreaStatsFarmers() {
  const filter = document.getElementById('areaVillageFilter');
  const village = filter ? filter.value : '__ALL__';

  if (village === '__ALL__') return farmers;

  return farmers.filter(f =>
    String(f.village || '').trim() === village
  );
}

function refreshAreaStatisticsDashboard() {
  const filter = document.getElementById('areaVillageFilter');
  if (!filter) return;

  const previous = filter.value || '__ALL__';
  const villages = [...new Set(
    farmers.map(f => String(f.village || '').trim()).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'si'));

  filter.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = '__ALL__';
  allOption.textContent = 'සියලු ප්‍රදේශ';
  filter.appendChild(allOption);

  villages.forEach(village => {
    const option = document.createElement('option');
    option.value = village;
    option.textContent = village;
    filter.appendChild(option);
  });

  filter.value = villages.includes(previous) || previous === '__ALL__'
    ? previous : '__ALL__';

  renderAreaStatistics();
}

function renderAreaStatistics() {
  const farmerList = getAreaStatsFarmers();
  const farmerCount = document.getElementById('areaFarmerCount');
  if (!farmerCount) return;

  farmerCount.textContent = 'ගොවීන්: ' + farmerList.length;

  const speciesTotals = {};
  livestockTypes.forEach(type => {
    speciesTotals[type.id] = 0;
  });

  let totalAnimals = 0;
  let cowMilkDaily = 0;
  let buffaloMilkDaily = 0;
  let goatMilkDaily = 0;
  let cowMilkAnimals = 0;
  let buffaloMilkAnimals = 0;
  let goatMilkAnimals = 0;
  let dailyEggs = 0;
  let layingHens = 0;
  let monthlyPork = 0;

  farmerList.forEach(farmer => {
    const livestock = farmer.livestock || {};

    livestockTypes.forEach(type => {
      const animal = livestock[type.id] || {};
      const count = calculateAnimalTotal(animal);
      speciesTotals[type.id] += count;
      totalAnimals += count;
    });

    cowMilkDaily += areaNumber(livestock.milkLitres);
    buffaloMilkDaily += areaNumber(livestock.buffaloMilkLitres);
    goatMilkDaily += areaNumber(livestock.goatMilkLitres);

    cowMilkAnimals += areaNumber(livestock.milkAnimals);
    buffaloMilkAnimals += areaNumber(livestock.buffaloMilkAnimals);
    goatMilkAnimals += areaNumber(livestock.goatMilkAnimals);

    dailyEggs += areaNumber(livestock.dailyEggs);
    const chickenData=livestock.chickens||{};
    layingHens += Object.prototype.hasOwnProperty.call(chickenData,'eggLaying')
      ? areaNumber(chickenData.eggLaying)
      : areaNumber(livestock.layingHens);
    monthlyPork += areaNumber(livestock.monthlyPork);
  });

  const animalSummary = document.getElementById('areaAnimalSummary');
  const animalDetails = document.getElementById('areaAnimalDetails');

  const topSpecies = livestockTypes
    .map(type => ({ name: type.name, count: speciesTotals[type.id] }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)[0];

  animalSummary.innerHTML = `
    <div class="stat"><strong>${totalAnimals}</strong>මුළු සතුන්</div>
    <div class="stat"><strong>${topSpecies ? topSpecies.name : 'දත්ත නැත'}</strong>වැඩිම සතුන් සිටින වර්ගය</div>
  `;

  animalDetails.innerHTML = livestockTypes.map(type => {
    const count = speciesTotals[type.id];
    return `<p>${type.name}: <b>${count}</b></p>`;
  }).join('');

  document.getElementById('areaMilkProduction').innerHTML = `
    <p>ගව කිරි: ${cowMilkDaily * 30} ලීටර් / මාසය
      <span class="small">(දිනකට ${cowMilkDaily} L · කිරි දෙන සතුන් ${cowMilkAnimals})</span></p>
    <p>මී ගව කිරි: ${buffaloMilkDaily * 30} ලීටර් / මාසය
      <span class="small">(දිනකට ${buffaloMilkDaily} L · කිරි දෙන සතුන් ${buffaloMilkAnimals})</span></p>
    <p>එළු කිරි: ${goatMilkDaily * 30} ලීටර් / මාසය
      <span class="small">(දිනකට ${goatMilkDaily} L · කිරි දෙන සතුන් ${goatMilkAnimals})</span></p>
    <p class="small">මාසික ඇස්තමේන්තුව (දින 30)</p>
  `;

  document.getElementById('areaEggProduction').innerHTML = `
    <p>මාසික බිත්තර ඇස්තමේන්තුව: <b>${dailyEggs * 30}</b></p>
    <p>දිනකට බිත්තර: ${dailyEggs}</p>
    <p>බිත්තර දමන කිකිළියන්: ${layingHens}</p>
    <p class="small">මාසික ඇස්තමේන්තුව (දින 30)</p>
  `;

  document.getElementById('areaPorkProduction').innerHTML = `
    <p>මාසික ඌරු මස් නිෂ්පාදනය: <b>${monthlyPork} kg</b></p>
  `;

  const milkTypes = [
    { name: 'ගව කිරි', litres: cowMilkDaily * 30 },
    { name: 'මී ගව කිරි', litres: buffaloMilkDaily * 30 },
    { name: 'එළු කිරි', litres: goatMilkDaily * 30 }
  ].sort((a, b) => b.litres - a.litres);

  const highestMilk = milkTypes[0];

  document.getElementById('areaHighlights').innerHTML = `
    <p>වැඩිම සත්ත්ව ගණන: <b>${topSpecies ? topSpecies.name : 'දත්ත නැත'}</b></p>
    <p>වැඩිම කිරි නිෂ්පාදනය: <b>${highestMilk.litres > 0
      ? highestMilk.name + ' (' + highestMilk.litres + ' L / මාසය)'
      : 'දත්ත නැත'}</b></p>
    <p>සටහන: කිරි, බිත්තර සහ මස් වෙනස් ඒකකවලින් වාර්තා කරන නිසා ඒවා එකම අගයකින් ශ්‍රේණිගත කර නැත.</p>
  `;
}

function initializeAreaStatisticsDashboard() {
  const filter = document.getElementById('areaVillageFilter');
  const mainButton = document.getElementById('mainScreenBtn');
  const visitsButton = document.getElementById('farmerVisitsBtn');
  const dashboardButton = document.getElementById('areaDashboardBtn');
  const profileButton = document.getElementById('userProfileBtn');

  const mainScreen = document.getElementById('mainAppScreen');
  const visitsScreen = document.getElementById('farmerVisitsScreen');
  const dashboardScreen = document.getElementById('areaDashboardScreen');
  const profileScreen = document.getElementById('userProfileScreen');

  if (!filter || !mainButton || !visitsButton ||
      !dashboardButton || !profileButton ||
      !mainScreen || !visitsScreen ||
      !dashboardScreen || !profileScreen) return;

  filter.addEventListener('change', renderAreaStatistics);

  function hideAllScreens() {
    mainScreen.style.display = 'none';
    visitsScreen.style.display = 'none';
    dashboardScreen.style.display = 'none';
    profileScreen.style.display = 'none';
  }

  mainButton.addEventListener('click', () => {
    hideAllScreens();
    mainScreen.style.display = 'block';
  });

  visitsButton.addEventListener('click', () => {
    hideAllScreens();
    visitsScreen.style.display = 'block';
  });

  dashboardButton.addEventListener('click', () => {
    hideAllScreens();
    dashboardScreen.style.display = 'block';
    refreshAreaStatisticsDashboard();
  });

  profileButton.addEventListener('click', async () => {
    hideAllScreens();
    profileScreen.style.display = 'block';

    if (typeof window.loadUserProfile === 'function') {
      await window.loadUserProfile();
    }
  });

  refreshAreaStatisticsDashboard();
}

console.log('Farmer Profile System Loaded');
