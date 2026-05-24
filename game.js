// game.js — Game state and core logic v1.6.0

const Game = (() => {
  let _state = null;

  function defaultState() {
    const roomLevels = {}, roomDwellers = {}, roomStorage = {}, roomUpgrading = {};
    ROOM_DEFS.forEach(r => {
      roomLevels[r.id]    = r.unlockAt === 1 ? 1 : 0;
      roomDwellers[r.id]  = [];
      roomStorage[r.id]   = 0;   // accumulated resource before collect
      roomUpgrading[r.id] = null; // {finishAt, toLevel} or null
    });
    roomLevels['workshop'] = 0;
    return {
      saveVersion:3, castleName:'Ironhold', throneLevel:1, wins:0, mapProgress:1,
      resources:{ gold:200, food:150, iron:40, shards:{ common:5, rare:0, epic:0, legendary:0 } },
      dwellers: JSON.parse(JSON.stringify(STARTING_DWELLERS)),
      inventory: JSON.parse(JSON.stringify(STARTING_ITEMS)),
      roomLevels, roomDwellers, roomStorage, roomUpgrading,
      lastTick: Date.now(),
    };
  }

  function init(saved) {
    _state = saved || defaultState();
    // If save is from an old version, reset to default (avoids corrupt state)
    if (!_state.saveVersion || _state.saveVersion < 3) {
      console.log('Old save format detected — resetting to fresh state');
      _state = defaultState();
    }
    // Migrate missing fields safely
    if (!_state.roomStorage)   _state.roomStorage   = {};
    if (!_state.roomUpgrading) _state.roomUpgrading = {};
    ROOM_DEFS.forEach(r => {
      if (_state.roomStorage[r.id]   === undefined) _state.roomStorage[r.id]   = 0;
      if (_state.roomUpgrading[r.id] === undefined) _state.roomUpgrading[r.id] = null;
      if (!_state.roomLevels[r.id] && r.id !== 'workshop') _state.roomLevels[r.id] = r.unlockAt === 1 ? 1 : 0;
    });
    // Ensure resources are valid numbers
    if (!_state.resources || typeof _state.resources.gold !== 'number') {
      _state.resources = defaultState().resources;
    }
    // Ensure dwellers exist
    if (!_state.dwellers || !_state.dwellers.length) {
      _state.dwellers = JSON.parse(JSON.stringify(STARTING_DWELLERS));
    }
    // Ensure dwellers have hp / maxHp fields
    _state.dwellers.forEach(d => {
      if (!d.maxHp) d.maxHp = d.stats.hp;
      if (d.hp === undefined) d.hp = d.maxHp;
      if (!d.level) d.level = 1;
      if (d.xp === undefined) d.xp = 0;
    });
    _state.lastTick = Date.now();
  }

  // ─── TICK (called every 3s) ─────────────────────────────
  function tick() {
    const now     = Date.now();
    const elapsed = (now - _state.lastTick) / 1000;
    _state.lastTick = now;

    // 1. Production rooms fill their storage
    ROOM_DEFS.forEach(room => {
      if (!room.resource || !room.baseRate) return;
      const level = _state.roomLevels[room.id] || 0;
      if (!level) return;
      const workers    = (_state.roomDwellers[room.id] || []).length;
      const workerMult = 1 + workers * 0.4;
      const perSec     = (room.baseRate * level * workerMult) / 60;
      const cap        = (room.storageCap || 999999) * level;
      const cur        = _state.roomStorage[room.id] || 0;
      if (cur < cap) {
        _state.roomStorage[room.id] = Math.min(cap, cur + perSec * elapsed);
      }
    });

    // 2. Training grounds — XP for assigned dwellers
    const tg = ROOM_DEFS.find(r => r.id === 'training_grounds');
    if (tg) {
      const level = _state.roomLevels['training_grounds'] || 0;
      const xpMult = 1 + (level - 1) * 0.5;  // +50% per extra level
      const xpPerSec = (tg.trainXpPerMin || 8) * xpMult / 60;
      (_state.roomDwellers['training_grounds'] || []).forEach(id => {
        const dw = getDweller(id);
        if (!dw) return;
        dw.xp = (dw.xp || 0) + xpPerSec * elapsed;
        // Level up
        const nextLevel = (dw.level || 1) + 1;
        const needed    = XP_FOR_LEVEL[nextLevel] || Infinity;
        if (dw.xp >= needed && nextLevel <= 10) {
          dw.level = nextLevel;
          dw.xp    = 0;
          Object.keys(LEVEL_STAT_BONUS).forEach(stat => {
            dw.stats[stat] = (dw.stats[stat] || 0) + LEVEL_STAT_BONUS[stat];
          });
          dw.maxHp = dw.stats.hp;
          if (!dw.injured) dw.hp = dw.maxHp; // refill HP on level up if healthy
        }
      });
    }

    // 3. Hospital — auto-heal injured dwellers
    const hosp = ROOM_DEFS.find(r => r.id === 'hospital');
    if (hosp) {
      const level     = _state.roomLevels['hospital'] || 1;
      const healMult  = 1 + (level - 1) * 0.6;
      const hpPerSec  = (hosp.healHpPerMin || 15) * healMult / 60;
      const injured   = _state.dwellers.filter(d => d.injured);
      injured.forEach((dw, idx) => {
        if (idx >= level) return; // hospital level caps simultaneous heals
        dw.hp = Math.min(dw.maxHp || dw.stats.hp, (dw.hp || 0) + hpPerSec * elapsed);
        if (dw.hp >= (dw.maxHp || dw.stats.hp)) {
          dw.hp      = dw.maxHp || dw.stats.hp;
          dw.injured = false;
        }
      });
    }

    // 4. Finish upgrades
    ROOM_DEFS.forEach(room => {
      const upg = _state.roomUpgrading[room.id];
      if (upg && Date.now() >= upg.finishAt) {
        _state.roomLevels[room.id] = upg.toLevel;
        _state.roomUpgrading[room.id] = null;
        if (room.id === 'throne_room') _state.throneLevel = upg.toLevel;
      }
    });
  }

  // ─── COLLECT (production rooms) ────────────────────────
  function collectRoom(roomId) {
    const room = ROOM_DEFS.find(r => r.id === roomId);
    if (!room || !room.resource) return 0;
    const amount = Math.floor(_state.roomStorage[roomId] || 0);
    if (!amount) return 0;
    _state.resources[room.resource] = (_state.resources[room.resource] || 0) + amount;
    _state.roomStorage[roomId] = 0;
    return amount;
  }

  // ─── UPGRADE ────────────────────────────────────────────
  function canUpgrade(roomId) {
    const def    = ROOM_DEFS.find(r => r.id === roomId);
    const level  = _state.roomLevels[roomId] || 0;
    const costs  = def?.upgradeCosts;
    if (!costs || !costs[level]) return false;
    if (_state.roomUpgrading[roomId]) return false;
    const cost = costs[level];
    return _state.resources.gold >= cost.gold && _state.resources.iron >= (cost.iron || 0);
  }

  function upgradeRoom(roomId) {
    if (!canUpgrade(roomId)) return false;
    const def   = ROOM_DEFS.find(r => r.id === roomId);
    const level = _state.roomLevels[roomId] || 0;
    const cost  = def.upgradeCosts[level];
    _state.resources.gold -= cost.gold;
    _state.resources.iron -= (cost.iron || 0);
    // Upgrade time: 10s per level × level (fast for early game)
    const secs = level * 12;
    _state.roomUpgrading[roomId] = { finishAt: Date.now() + secs * 1000, toLevel: level + 1, totalSecs: secs };
    return true;
  }

  function getUpgradeProgress(roomId) {
    const upg = _state.roomUpgrading[roomId];
    if (!upg) return null;
    const remaining = Math.max(0, upg.finishAt - Date.now()) / 1000;
    const pct = 1 - remaining / upg.totalSecs;
    return { remaining: Math.ceil(remaining), pct };
  }

  // ─── DWELLER HELPERS ────────────────────────────────────
  function getDweller(id)   { return _state.dwellers.find(d => d.id === id) || null; }
  function getDwellers()    { return _state.dwellers; }

  function getDwellerRole(id) {
    const item = getEquippedItem(id, 'weapon');
    const wt   = item ? item.weaponType : 'none';
    return WEAPON_ROLES[wt] || WEAPON_ROLES.none;
  }

  function getDwellerStats(id) {
    const dw = getDweller(id);
    if (!dw) return null;
    const total = { ...dw.stats };
    Object.keys(dw.equipment).forEach(slot => {
      const item = getEquippedItem(id, slot);
      if (!item) return;
      const mult = RARITIES[item.rarity].mult;
      Object.keys(item.stats).forEach(stat => {
        total[stat] = (total[stat] || 0) + Math.round(item.stats[stat] * mult);
      });
    });
    return total;
  }

  function getTrainingProgress(dwellerId) {
    const dw = getDweller(dwellerId);
    if (!dw || dw.level >= 10) return null;
    const nextLevel = (dw.level || 1) + 1;
    const needed    = XP_FOR_LEVEL[nextLevel] || 1;
    return { xp: Math.floor(dw.xp || 0), needed, pct: ((dw.xp || 0) / needed) };
  }

  // ─── ROOM ASSIGNMENT ────────────────────────────────────
  function assignDweller(dwellerId, roomId) {
    unassignDweller(dwellerId);
    const def = ROOM_DEFS.find(r => r.id === roomId);
    if (!def) return false;
    const assigned = _state.roomDwellers[roomId] || [];
    if (assigned.length >= def.maxDwellers) return false;
    _state.roomDwellers[roomId] = [...assigned, dwellerId];
    const dw = getDweller(dwellerId);
    if (dw) dw.assignedRoom = roomId;
    return true;
  }

  function unassignDweller(dwellerId) {
    Object.keys(_state.roomDwellers).forEach(rid => {
      _state.roomDwellers[rid] = _state.roomDwellers[rid].filter(id => id !== dwellerId);
    });
    const dw = getDweller(dwellerId);
    if (dw) dw.assignedRoom = null;
  }

  // ─── EQUIPMENT ──────────────────────────────────────────
  function getEquippedItem(dwellerId, slot) {
    const dw = getDweller(dwellerId);
    if (!dw) return null;
    const itemId = dw.equipment[slot];
    return itemId ? (_state.inventory.find(i => i.id === itemId) || null) : null;
  }

  function equipItem(dwellerId, itemId) {
    const dw = getDweller(dwellerId), item = _state.inventory.find(i => i.id === itemId);
    if (!dw || !item) return false;
    _state.dwellers.forEach(d => {
      Object.keys(d.equipment).forEach(slot => { if (d.equipment[slot] === itemId) d.equipment[slot] = null; });
    });
    dw.equipment[item.slot] = itemId;
    return true;
  }

  function unequipItem(dwellerId, slot) {
    const dw = getDweller(dwellerId);
    if (!dw) return false;
    dw.equipment[slot] = null;
    return true;
  }

  function addItems(items) {
    if (!items?.length) return;
    items.forEach(it => _state.inventory.push(it));
  }

  function dismantleItem(itemId) {
    const idx = _state.inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return false;
    const item    = _state.inventory[idx];
    const equipped = _state.dwellers.some(d => Object.values(d.equipment).includes(itemId));
    if (equipped) return false;
    _state.resources.shards[item.rarity] = (_state.resources.shards[item.rarity] || 0) + RARITIES[item.rarity].shards;
    _state.inventory.splice(idx, 1);
    return { rarity: item.rarity, shards: RARITIES[item.rarity].shards };
  }

  // ─── GETTERS ────────────────────────────────────────────
  function getState()           { return _state; }
  function getInventory()       { return _state.inventory; }
  function getResources()       { return _state.resources; }
  function getCastleName()      { return _state.castleName; }
  function getRoomLevel(rid)    { return _state.roomLevels[rid]   || 0; }
  function getRoomDwellers(rid) { return _state.roomDwellers[rid] || []; }
  function getRoomStorage(rid)  { return _state.roomStorage[rid]  || 0; }
  function getBattleParty()     { return _state.roomDwellers['barracks'] || []; }

  return {
    init, tick, getState,
    getDweller, getDwellers, getDwellerRole, getDwellerStats,
    getTrainingProgress, getInventory, getResources, getCastleName,
    assignDweller, unassignDweller,
    equipItem, unequipItem, getEquippedItem, addItems, dismantleItem,
    collectRoom, canUpgrade, upgradeRoom, getUpgradeProgress,
    getRoomLevel, getRoomDwellers, getRoomStorage, getBattleParty,
  };
})();
