// data.js — Static game data for Ironhold

const SUPABASE_URL      = 'https://ngrzhfujrknpzekkabrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnpoZnVqcmtucHpla2thYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzEwNDAsImV4cCI6MjA5NTEwNzA0MH0.E8V_nk4eCp3oscGXhayjAUNKudjeSr-17l1Rhjxvp7o';

// ─── ROOM DEFINITIONS ──────────────────────────────────────
// upgradeCosts[level] = {gold, iron} to go FROM that level to next
// storageCap  = max resource a production room holds before "FULL"
// trainXpPerMin = XP given per minute to each dweller in room
// healHpPerMin  = HP restored per minute per dweller (hospital)
const ROOM_DEFS = [
  {
    id:'throne_room', name:'Throne Room', floor:3, icon:'👑',
    maxDwellers:0, resource:null, baseRate:0, unlockAt:1,
    description:'The heart of your domain. Upgrade to unlock new rooms and expand your army.',
    upgradeCosts:[null,{gold:800,iron:0},{gold:2000,iron:20},{gold:4500,iron:60},{gold:10000,iron:150}],
    upgradeDesc:['','Unlocks Workshop','Adds Barracks slot','Faster resource tick','Unlocks 5th floor'],
  },
  {
    id:'barracks', name:'Barracks', floor:2, icon:'⚔️',
    maxDwellers:3, resource:null, baseRate:0, unlockAt:1,
    description:'Station fighters here. Your battle party comes from this room.',
    upgradeCosts:[null,{gold:300,iron:0},{gold:700,iron:10},{gold:1500,iron:30},{gold:3000,iron:80}],
    upgradeDesc:['','+1 fighter slot','+1 fighter slot','Fighters gain +10% ATK','Unlocks 6-man party'],
  },
  {
    id:'training_grounds', name:'Training Grounds', floor:2, icon:'🏋️',
    maxDwellers:2, resource:null, baseRate:0, unlockAt:1, trainXpPerMin:8,
    description:'Fighters here gain XP over time. Higher level = faster training.',
    upgradeCosts:[null,{gold:400,iron:0},{gold:900,iron:15},{gold:2000,iron:40},{gold:4500,iron:100}],
    upgradeDesc:['','+4 XP/min per fighter','+6 XP/min per fighter','Unlocks 3rd slot','+10 XP/min per fighter'],
  },
  {
    id:'treasury', name:'Treasury', floor:1, icon:'💰',
    maxDwellers:2, resource:'gold', baseRate:12, storageCap:500, unlockAt:1,
    description:'Produces Gold. Assign dwellers to boost output. Collect before it fills up.',
    upgradeCosts:[null,{gold:200,iron:0},{gold:600,iron:8},{gold:1400,iron:25},{gold:3200,iron:70}],
    upgradeDesc:['','+15 Gold/min cap','×1.5 rate & cap','×2 cap','×3 rate'],
  },
  {
    id:'kitchen', name:'Kitchen', floor:1, icon:'🍖',
    maxDwellers:2, resource:'food', baseRate:9, storageCap:400, unlockAt:1,
    description:'Produces Food. Battles consume food; keep this room staffed.',
    upgradeCosts:[null,{gold:200,iron:0},{gold:600,iron:8},{gold:1400,iron:25},{gold:3200,iron:70}],
    upgradeDesc:['','+12 Food/min cap','×1.5 rate & cap','×2 cap','×3 rate'],
  },
  {
    id:'workshop', name:'Workshop', floor:1, icon:'🔨',
    maxDwellers:2, resource:null, baseRate:0, unlockAt:2,
    description:'Craft gear from Iron and Shards. Dismantle unwanted items to get shards back.',
    upgradeCosts:[null,{gold:500,iron:20},{gold:1200,iron:50},{gold:2800,iron:120},{gold:6000,iron:280}],
    upgradeDesc:['','Craft Common & Rare','Craft Epic','Craft Legendary','Faster craft times'],
  },
  {
    id:'living_quarters', name:'Living Quarters', floor:0, icon:'🏠',
    maxDwellers:4, resource:null, baseRate:0, unlockAt:1,
    description:'Increases max population. Assign one male + one female to start breeding.',
    upgradeCosts:[null,{gold:300,iron:0},{gold:800,iron:0},{gold:1800,iron:20},{gold:4000,iron:60}],
    upgradeDesc:['','+2 population cap','+2 population cap','Faster breeding','Babies born with +1 star chance'],
  },
  {
    id:'hospital', name:'Hospital', floor:0, icon:'⚕️',
    maxDwellers:1, resource:null, baseRate:0, unlockAt:1, healHpPerMin:400,
    description:'Injured fighters auto-heal over time. Higher level = faster healing.',
    upgradeCosts:[null,{gold:350,iron:0},{gold:850,iron:12},{gold:2000,iron:35},{gold:4500,iron:90}],
    upgradeDesc:['','+10 HP/min heal','×1.5 heal speed','Heals 2 fighters at once','×3 heal speed'],
  },
];

// Floor layout: which rooms appear on each floor, left→right
const FLOOR_LAYOUT = {
  3: ['throne_room'],
  2: ['barracks', 'training_grounds'],
  1: ['treasury', 'kitchen', 'workshop'],
  0: ['living_quarters', 'hospital'],
};

// CSS grid column widths per floor (horizontal scroll — each floor is one row in the cross-section)
const FLOOR_WIDTHS = {
  3: ['100%'],
  2: ['55%','45%'],
  1: ['33%','40%','27%'],
  0: ['58%','42%'],
};

// ─── WEAPON TYPES → ROLE ───────────────────────────────────
const WEAPON_ROLES = {
  sword:   { role:'Tank',     icon:'🗡️',  position:'front'       },
  bow:     { role:'Archer',   icon:'🏹',  position:'back'        },
  staff:   { role:'Mage',     icon:'🪄',  position:'middle'      },
  daggers: { role:'Assassin', icon:'🗡️',  position:'behind_tank' },
  none:    { role:'Worker',   icon:'🔧',  position:null          },
};

// ─── ITEM RARITIES ─────────────────────────────────────────
const RARITIES = {
  common:    { label:'Common',    color:'#8a8a8a', mult:1.0,  shards:1  },
  rare:      { label:'Rare',      color:'#3a8eff', mult:1.6,  shards:3  },
  epic:      { label:'Epic',      color:'#a044ff', mult:2.4,  shards:10 },
  legendary: { label:'Legendary', color:'#ff8c00', mult:3.8,  shards:30 },
};

// ─── EQUIPMENT SLOTS ───────────────────────────────────────
const EQUIP_SLOTS = [
  { id:'weapon',    label:'Weapon',   icon:'⚔️' },
  { id:'armor',     label:'Armor',    icon:'🛡️' },
  { id:'ring',      label:'Ring',     icon:'💍' },
  { id:'artifact1', label:'Artifact', icon:'🔮' },
  { id:'artifact2', label:'Artifact', icon:'🔮' },
  { id:'artifact3', label:'Artifact', icon:'🔮' },
];

// ─── STAT DISPLAY ──────────────────────────────────────────
const STAT_DEFS = {
  atk:   { label:'ATK',    icon:'⚔️'  },
  def:   { label:'DEF',    icon:'🛡️'  },
  mdef:  { label:'M.DEF',  icon:'✨'   },
  hp:    { label:'HP',     icon:'❤️'   },
  crit:  { label:'CRIT%',  icon:'💥'   },
  dodge: { label:'DODGE%', icon:'💨'   },
  spd:   { label:'SPD',    icon:'⚡'   },
};

// ─── XP TABLE — level thresholds ───────────────────────────
const XP_FOR_LEVEL = [0, 0, 80, 200, 400, 750, 1300, 2100, 3200, 4800, 7000];
// stat boost per level up
const LEVEL_STAT_BONUS = { atk:2, def:1, mdef:1, hp:8, crit:0, dodge:0, spd:0 };

// ─── STARTING DWELLERS ─────────────────────────────────────
const STARTING_DWELLERS = [
  { id:'dw_001', name:'Aldric',  gender:'male',   emoji:'🧔',   stars:2, level:1, xp:0, maxHp:85, hp:85,
    stats:{ atk:14, def:11, mdef:5,  hp:85, crit:5,  dodge:3,  spd:8  },
    equipment:{ weapon:null, armor:null, ring:null, artifact1:null, artifact2:null, artifact3:null },
    assignedRoom:null, injured:false },
  { id:'dw_002', name:'Mira',   gender:'female', emoji:'👩‍🦰', stars:2, level:1, xp:0, maxHp:72, hp:72,
    stats:{ atk:9,  def:7,  mdef:12, hp:72, crit:9,  dodge:7,  spd:12 },
    equipment:{ weapon:null, armor:null, ring:null, artifact1:null, artifact2:null, artifact3:null },
    assignedRoom:null, injured:false },
  { id:'dw_003', name:'Bram',   gender:'male',   emoji:'👨‍🦱', stars:1, level:1, xp:0, maxHp:78, hp:78,
    stats:{ atk:11, def:9,  mdef:6,  hp:78, crit:6,  dodge:4,  spd:9  },
    equipment:{ weapon:null, armor:null, ring:null, artifact1:null, artifact2:null, artifact3:null },
    assignedRoom:null, injured:false },
  { id:'dw_004', name:'Tilda',  gender:'female', emoji:'👱‍♀️', stars:1, level:1, xp:0, maxHp:70, hp:70,
    stats:{ atk:8,  def:6,  mdef:9,  hp:70, crit:8,  dodge:9,  spd:11 },
    equipment:{ weapon:null, armor:null, ring:null, artifact1:null, artifact2:null, artifact3:null },
    assignedRoom:null, injured:false },
];

// ─── STARTING INVENTORY ────────────────────────────────────
const STARTING_ITEMS = [
  { id:'itm_001', name:'Iron Sword',   slot:'weapon', weaponType:'sword',   rarity:'common', stats:{ atk:8 },          ability:null },
  { id:'itm_002', name:'Wooden Bow',   slot:'weapon', weaponType:'bow',     rarity:'common', stats:{ atk:6, crit:5 },  ability:null },
  { id:'itm_003', name:'Leather Vest', slot:'armor',  weaponType:null,      rarity:'common', stats:{ def:6, hp:18 },   ability:null },
  { id:'itm_004', name:'Copper Ring',  slot:'ring',   weaponType:null,      rarity:'common', stats:{ spd:2, dodge:2 }, ability:null },
];

// ─── MAP STAGES ────────────────────────────────────────────
const MAP_STAGES = [
  { id:1,  name:'Bandit Camp',      region:'Greenwood',  boss:'🏕️', diff:0.6, enemyCount:1 },
  { id:2,  name:'Wolf Den',         region:'Greenwood',  boss:'🐺', diff:0.8, enemyCount:2 },
  { id:3,  name:'Goblin Warren',    region:'Greenwood',  boss:'👺', diff:1.0, enemyCount:2 },
  { id:4,  name:'Crossroads Keep',  region:'Greenwood',  boss:'🏰', diff:1.3, enemyCount:3 },
  { id:5,  name:'Haunted Mill',     region:'Mistmoor',   boss:'👻', diff:2.0, enemyCount:2 },
  { id:6,  name:'Bog Witch Hut',    region:'Mistmoor',   boss:'🧙', diff:2.4, enemyCount:3 },
  { id:7,  name:'Skeleton Crypt',   region:'Mistmoor',   boss:'💀', diff:2.8, enemyCount:3 },
  { id:8,  name:'Drowned Fortress', region:'Mistmoor',   boss:'🏯', diff:3.3, enemyCount:3 },
  { id:9,  name:'Frost Caverns',    region:'Frostpeak',  boss:'🧊', diff:3.8, enemyCount:3 },
  { id:10, name:'Wyvern Roost',     region:'Frostpeak',  boss:'🐉', diff:4.4, enemyCount:3 },
  { id:11, name:'Dark Citadel',     region:'Frostpeak',  boss:'🏚️', diff:5.0, enemyCount:3 },
  { id:12, name:'Throne of Ash',    region:'Frostpeak',  boss:'👑', diff:6.0, enemyCount:3 },
];
const REGION_COLORS = { 'Greenwood':'#3a7a3a', 'Mistmoor':'#5a4a7a', 'Frostpeak':'#3a6a8a' };

// ─── LOOT TABLES ───────────────────────────────────────────
const LOOT_TEMPLATES = {
  weapon:[
    { base:'Sword',      weaponType:'sword',   stats:{ atk:9, hp:6 } },
    { base:'Greatsword', weaponType:'sword',   stats:{ atk:12, def:3 } },
    { base:'Longbow',    weaponType:'bow',     stats:{ atk:8, crit:6 } },
    { base:'Crossbow',   weaponType:'bow',     stats:{ atk:10, spd:2 } },
    { base:'Staff',      weaponType:'staff',   stats:{ atk:7, mdef:5 } },
    { base:'Wand',       weaponType:'staff',   stats:{ atk:6, mdef:7 } },
    { base:'Daggers',    weaponType:'daggers', stats:{ atk:7, crit:9, spd:3 } },
    { base:'Kris',       weaponType:'daggers', stats:{ atk:6, crit:12 } },
  ],
  armor:[
    { base:'Chainmail',   stats:{ def:8, hp:22 } },
    { base:'Plate Armor', stats:{ def:12, hp:14 } },
    { base:'Robe',        stats:{ mdef:10, hp:16 } },
    { base:'Leathers',    stats:{ def:5, dodge:6, hp:12 } },
  ],
  ring:[
    { base:'Ring of Vigor', stats:{ hp:20 } },
    { base:'Ring of Fury',  stats:{ atk:5, crit:4 } },
    { base:'Ring of Haste', stats:{ spd:4, dodge:3 } },
    { base:'Ring of Wards', stats:{ def:4, mdef:4 } },
  ],
  artifact1:[
    { base:'Lucky Charm',   stats:{ crit:6, dodge:4 } },
    { base:'War Totem',     stats:{ atk:6 } },
    { base:'Iron Sigil',    stats:{ def:6, hp:10 } },
    { base:'Swift Feather', stats:{ spd:5 } },
  ],
};
const RARITY_PREFIX = {
  common:    ['Worn','Plain','Chipped','Rusty'],
  rare:      ['Fine','Sturdy','Polished','Keen'],
  epic:      ['Heroic','Runed','Gleaming','Vicious'],
  legendary: ['Ancient','Dragonforged','Godtouched','Eternal'],
};
