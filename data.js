// data.js — Static game data for Ironhold

const SUPABASE_URL      = 'https://ngrzhfujrknpzekkabrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnpoZnVqcmtucHpla2thYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzEwNDAsImV4cCI6MjA5NTEwNzA0MH0.E8V_nk4eCp3oscGXhayjAUNKudjeSr-17l1Rhjxvp7o';

// ─── ROOM DEFINITIONS ──────────────────────────────────────
const ROOM_DEFS = [
  { id: 'throne_room',     name: 'Throne Room',     floor: 3, icon: '👑', maxDwellers: 0,  resource: null,   baseRate: 0,  unlockAt: 1, description: 'The heart of your domain. Upgrade to unlock new rooms and expand your army.' },
  { id: 'barracks',        name: 'Barracks',        floor: 2, icon: '⚔️', maxDwellers: 3,  resource: null,   baseRate: 0,  unlockAt: 1, description: 'Station fighters here. Your battle party is drawn from this room.' },
  { id: 'training_grounds',name: 'Training Grounds',floor: 2, icon: '🏋️', maxDwellers: 2,  resource: null,   baseRate: 0,  unlockAt: 1, description: 'Fighters here gain XP over time — even when resting between battles.' },
  { id: 'treasury',        name: 'Treasury',        floor: 1, icon: '💰', maxDwellers: 2,  resource: 'gold', baseRate: 12, unlockAt: 1, description: 'Produces Gold over time. Assign dwellers to multiply output.' },
  { id: 'kitchen',         name: 'Kitchen',         floor: 1, icon: '🍖', maxDwellers: 2,  resource: 'food', baseRate: 9,  unlockAt: 1, description: 'Keeps your castle fed. Food is consumed by battles and healing.' },
  { id: 'workshop',        name: 'Workshop',        floor: 1, icon: '🔨', maxDwellers: 2,  resource: null,   baseRate: 0,  unlockAt: 2, description: 'Craft gear from Iron and Shards. Higher level = better craft results.' },
  { id: 'living_quarters', name: 'Living Quarters', floor: 0, icon: '🏠', maxDwellers: 4,  resource: null,   baseRate: 0,  unlockAt: 1, description: 'Sets your max population. Assign a male + female dweller to start breeding.' },
  { id: 'hospital',        name: 'Hospital',        floor: 0, icon: '⚕️', maxDwellers: 1,  resource: null,   baseRate: 0,  unlockAt: 1, description: 'Heals fighters injured in battle. Injured fighters cannot be deployed.' },
];

// Floor layout: which rooms appear on each floor, left→right
const FLOOR_LAYOUT = {
  3: ['throne_room'],
  2: ['barracks', 'training_grounds'],
  1: ['treasury', 'kitchen', 'workshop'],
  0: ['living_quarters', 'hospital'],
};

// CSS grid column ratios per floor
const FLOOR_GRID = {
  3: '1fr',
  2: '1.1fr 0.9fr',
  1: '1fr 1.3fr 1fr',
  0: '1.4fr 0.9fr',
};

// ─── WEAPON TYPES → ROLE ───────────────────────────────────
const WEAPON_ROLES = {
  sword:   { role: 'Tank',     icon: '🗡️',  position: 'front',        desc: 'Front row — absorbs damage for the party' },
  bow:     { role: 'Archer',   icon: '🏹',  position: 'back',         desc: 'Back row — high DPS, targets back-row enemies' },
  staff:   { role: 'Mage',     icon: '🪄',  position: 'middle',       desc: 'Middle row — magic damage, heals, stuns' },
  daggers: { role: 'Assassin', icon: '🗡️',  position: 'behind_tank',  desc: 'High crit — targets the weakest enemy first' },
  none:    { role: 'Worker',   icon: '🔧',  position: null,           desc: 'No weapon — assigned to production rooms' },
};

// ─── ITEM RARITIES ─────────────────────────────────────────
const RARITIES = {
  common:    { label: 'Common',    color: '#8a8a8a', mult: 1.0,  shards: 1  },
  rare:      { label: 'Rare',      color: '#3a8eff', mult: 1.6,  shards: 3  },
  epic:      { label: 'Epic',      color: '#a044ff', mult: 2.4,  shards: 10 },
  legendary: { label: 'Legendary', color: '#ff8c00', mult: 3.8,  shards: 30 },
};

// ─── EQUIPMENT SLOTS ───────────────────────────────────────
const EQUIP_SLOTS = [
  { id: 'weapon',    label: 'Weapon',   icon: '⚔️' },
  { id: 'armor',     label: 'Armor',    icon: '🛡️' },
  { id: 'ring',      label: 'Ring',     icon: '💍' },
  { id: 'artifact1', label: 'Artifact', icon: '🔮' },
  { id: 'artifact2', label: 'Artifact', icon: '🔮' },
  { id: 'artifact3', label: 'Artifact', icon: '🔮' },
];

// ─── STAT DISPLAY ──────────────────────────────────────────
const STAT_DEFS = {
  atk:   { label: 'ATK',    icon: '⚔️' },
  def:   { label: 'DEF',    icon: '🛡️' },
  mdef:  { label: 'M.DEF',  icon: '✨'  },
  hp:    { label: 'HP',     icon: '❤️'  },
  crit:  { label: 'CRIT%',  icon: '💥'  },
  dodge: { label: 'DODGE%', icon: '💨'  },
  spd:   { label: 'SPD',    icon: '⚡'  },
};

// ─── STARTING DWELLERS ─────────────────────────────────────
const STARTING_DWELLERS = [
  {
    id: 'dw_001',
    name: 'Aldric',
    gender: 'male',
    emoji: '🧔',
    stars: 2,
    level: 1, xp: 0,
    stats: { atk: 14, def: 11, mdef: 5,  hp: 85,  crit: 5,  dodge: 3,  spd: 8  },
    equipment: { weapon: null, armor: null, ring: null, artifact1: null, artifact2: null, artifact3: null },
    assignedRoom: null,
    injured: false,
  },
  {
    id: 'dw_002',
    name: 'Mira',
    gender: 'female',
    emoji: '👩‍🦰',
    stars: 2,
    level: 1, xp: 0,
    stats: { atk: 9,  def: 7,  mdef: 12, hp: 72,  crit: 9,  dodge: 7,  spd: 12 },
    equipment: { weapon: null, armor: null, ring: null, artifact1: null, artifact2: null, artifact3: null },
    assignedRoom: null,
    injured: false,
  },
  {
    id: 'dw_003',
    name: 'Bram',
    gender: 'male',
    emoji: '👨‍🦱',
    stars: 1,
    level: 1, xp: 0,
    stats: { atk: 11, def: 9,  mdef: 6,  hp: 78,  crit: 6,  dodge: 4,  spd: 9  },
    equipment: { weapon: null, armor: null, ring: null, artifact1: null, artifact2: null, artifact3: null },
    assignedRoom: null,
    injured: false,
  },
  {
    id: 'dw_004',
    name: 'Tilda',
    gender: 'female',
    emoji: '👱‍♀️',
    stars: 1,
    level: 1, xp: 0,
    stats: { atk: 8,  def: 6,  mdef: 9,  hp: 70,  crit: 8,  dodge: 9,  spd: 11 },
    equipment: { weapon: null, armor: null, ring: null, artifact1: null, artifact2: null, artifact3: null },
    assignedRoom: null,
    injured: false,
  },
];

// ─── STARTING INVENTORY ────────────────────────────────────
const STARTING_ITEMS = [
  { id: 'itm_001', name: 'Iron Sword',    slot: 'weapon', weaponType: 'sword',   rarity: 'common', stats: { atk: 8 },               ability: null },
  { id: 'itm_002', name: 'Wooden Bow',    slot: 'weapon', weaponType: 'bow',     rarity: 'common', stats: { atk: 6, crit: 5 },       ability: null },
  { id: 'itm_003', name: 'Leather Vest',  slot: 'armor',  weaponType: null,      rarity: 'common', stats: { def: 6, hp: 18 },        ability: null },
  { id: 'itm_004', name: 'Copper Ring',   slot: 'ring',   weaponType: null,      rarity: 'common', stats: { spd: 2, dodge: 2 },      ability: null },
];


// ─── MAP / ROADMAP STAGES ──────────────────────────────────
// Each stage: difficulty scales enemy stats. Cleared in order.
const MAP_STAGES = [
  { id: 1,  name: 'Bandit Camp',       region: 'Greenwood',   boss: '🏕️', diff: 0.6,  enemyCount: 1 },
  { id: 2,  name: 'Wolf Den',          region: 'Greenwood',   boss: '🐺', diff: 0.8,  enemyCount: 2 },
  { id: 3,  name: 'Goblin Warren',     region: 'Greenwood',   boss: '👺', diff: 1.0,  enemyCount: 2 },
  { id: 4,  name: 'Crossroads Keep',   region: 'Greenwood',   boss: '🏰', diff: 1.3,  enemyCount: 3 },
  { id: 5,  name: 'Haunted Mill',      region: 'Mistmoor',    boss: '👻', diff: 2.0,  enemyCount: 2 },
  { id: 6,  name: 'Bog Witch Hut',     region: 'Mistmoor',    boss: '🧙', diff: 2.4,  enemyCount: 3 },
  { id: 7,  name: 'Skeleton Crypt',    region: 'Mistmoor',    boss: '💀', diff: 2.8,  enemyCount: 3 },
  { id: 8,  name: 'Drowned Fortress',  region: 'Mistmoor',    boss: '🏯', diff: 3.3,  enemyCount: 3 },
  { id: 9,  name: 'Frost Caverns',     region: 'Frostpeak',   boss: '🧊', diff: 3.8,  enemyCount: 3 },
  { id: 10, name: 'Wyvern Roost',      region: 'Frostpeak',   boss: '🐉', diff: 4.4,  enemyCount: 3 },
  { id: 11, name: 'Dark Citadel',      region: 'Frostpeak',   boss: '🏚️', diff: 5.0,  enemyCount: 3 },
  { id: 12, name: 'Throne of Ash',     region: 'Frostpeak',   boss: '👑', diff: 6.0,  enemyCount: 3 },
];

const REGION_COLORS = {
  'Greenwood': '#3a7a3a',
  'Mistmoor':  '#5a4a7a',
  'Frostpeak': '#3a6a8a',
};


// ─── LOOT TABLES ───────────────────────────────────────────
// Base items. When dropped, stats scale by the rarity multiplier.
// weaponType on weapons determines the fighter role when equipped.
const LOOT_TEMPLATES = {
  weapon: [
    { base: 'Sword',      weaponType: 'sword',   stats: { atk: 9, hp: 6 } },
    { base: 'Greatsword', weaponType: 'sword',   stats: { atk: 12, def: 3 } },
    { base: 'Longbow',    weaponType: 'bow',     stats: { atk: 8, crit: 6 } },
    { base: 'Crossbow',   weaponType: 'bow',     stats: { atk: 10, spd: 2 } },
    { base: 'Staff',      weaponType: 'staff',   stats: { atk: 7, mdef: 5 } },
    { base: 'Wand',       weaponType: 'staff',   stats: { atk: 6, mdef: 7 } },
    { base: 'Daggers',    weaponType: 'daggers', stats: { atk: 7, crit: 9, spd: 3 } },
    { base: 'Kris',       weaponType: 'daggers', stats: { atk: 6, crit: 12 } },
  ],
  armor: [
    { base: 'Chainmail',   stats: { def: 8, hp: 22 } },
    { base: 'Plate Armor', stats: { def: 12, hp: 14 } },
    { base: 'Robe',        stats: { mdef: 10, hp: 16 } },
    { base: 'Leathers',    stats: { def: 5, dodge: 6, hp: 12 } },
  ],
  ring: [
    { base: 'Ring of Vigor',  stats: { hp: 20 } },
    { base: 'Ring of Fury',   stats: { atk: 5, crit: 4 } },
    { base: 'Ring of Haste',  stats: { spd: 4, dodge: 3 } },
    { base: 'Ring of Wards',  stats: { def: 4, mdef: 4 } },
  ],
  artifact1: [
    { base: 'Lucky Charm',   stats: { crit: 6, dodge: 4 } },
    { base: 'War Totem',     stats: { atk: 6 } },
    { base: 'Iron Sigil',    stats: { def: 6, hp: 10 } },
    { base: 'Swift Feather', stats: { spd: 5 } },
  ],
};
// Adjective prefixes by rarity for flavour
const RARITY_PREFIX = {
  common:    ['Worn', 'Plain', 'Chipped', 'Rusty'],
  rare:      ['Fine', 'Sturdy', 'Polished', 'Keen'],
  epic:      ['Heroic', 'Runed', 'Gleaming', 'Vicious'],
  legendary: ['Ancient', 'Dragonforged', 'Godtouched', 'Eternal'],
};
