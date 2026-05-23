// game.js — Game state and core logic

const Game = (() => {
  let _state = null;

  // ─── DEFAULT STATE ───────────────────────────────────────
  function defaultState() {
    const roomLevels = {};
    const roomDwellers = {};
    ROOM_DEFS.forEach(r => {
      roomLevels[r.id]   = r.unlockAt === 1 ? 1 : 0;
      roomDwellers[r.id] = [];
    });
    roomLevels['workshop'] = 0; // Locked until throne lv2
    return {
      castleName:   'Ironhold',
      throneLevel:  1,
      resources:    { gold: 120, food: 80, iron: 30, shards: { common: 5, rare: 0, epic: 0, legendary: 0 } },
      dwellers:     JSON.parse(JSON.stringify(STARTING_DWELLERS)),
      inventory:    JSON.parse(JSON.stringify(STARTING_ITEMS)),
      roomLevels,
      roomDwellers,
      lastTick:     Date.now(),
    };
  }

  // ─── INIT ────────────────────────────────────────────────
  function init(saved) {
    _state = saved || defaultState();
    _state.lastTick = Date.now(); // Reset tick timer
  }

  // ─── RESOURCE TICK ───────────────────────────────────────
  function tick() {
    const now     = Date.now();
    const elapsed = (now - _state.lastTick) / 1000; // seconds
    _state.lastTick = now;

    ROOM_DEFS.forEach(room => {
      if (!room.resource || !room.baseRate) return;
      const level = _state.roomLevels[room.id] || 0;
      if (!level) return;
      const workers    = (_state.roomDwellers[room.id] || []).length;
      const workerMult = 1 + workers * 0.35;
      const perSec     = (room.baseRate * level * workerMult) / 60;
      _state.resources[room.resource] = Math.floor(
        (_state.resources[room.resource] || 0) + perSec * elapsed
      );
    });
  }

  // ─── DWELLER HELPERS ─────────────────────────────────────
  function getDweller(id) {
    return _state.dwellers.find(d => d.id === id) || null;
  }

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

  // ─── ROOM ASSIGNMENT ─────────────────────────────────────
  function assignDweller(dwellerId, roomId) {
    unassignDweller(dwellerId);
    const def      = ROOM_DEFS.find(r => r.id === roomId);
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

  // ─── EQUIPMENT ───────────────────────────────────────────
  function getEquippedItem(dwellerId, slot) {
    const dw = getDweller(dwellerId);
    if (!dw) return null;
    const itemId = dw.equipment[slot];
    return itemId ? _state.inventory.find(i => i.id === itemId) || null : null;
  }

  function equipItem(dwellerId, itemId) {
    const dw   = getDweller(dwellerId);
    const item = _state.inventory.find(i => i.id === itemId);
    if (!dw || !item) return false;
    // Strip from whoever has it
    _state.dwellers.forEach(d => {
      Object.keys(d.equipment).forEach(slot => {
        if (d.equipment[slot] === itemId) d.equipment[slot] = null;
      });
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

  // ─── GETTERS ─────────────────────────────────────────────
  function getState()           { return _state; }
  function getDwellers()        { return _state.dwellers; }
  function getInventory()       { return _state.inventory; }
  function getResources()       { return _state.resources; }
  function getCastleName()      { return _state.castleName; }
  function getRoomLevel(rid)    { return _state.roomLevels[rid]   || 0; }
  function getRoomDwellers(rid) { return _state.roomDwellers[rid] || []; }
  function getBattleParty()     { return _state.roomDwellers['barracks'] || []; }

  return {
    init, tick, getState,
    getDweller, getDwellers, getDwellerRole, getDwellerStats,
    getInventory, getResources, getCastleName,
    assignDweller, unassignDweller,
    equipItem, unequipItem, getEquippedItem,
    getRoomLevel, getRoomDwellers, getBattleParty,
  };
})();
