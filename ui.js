// ui.js — Ironhold v1.7.2

const UI = (() => {

  // ─── SCREEN NAV ─────────────────────────────────────────
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (name === 'castle') document.getElementById('game-screen').classList.add('active');
    if (name === 'map') {
      document.getElementById('map-screen').classList.add('active');
      switchMapTab('campaign');
      syncMapResources();
    }
    closeDrawer();
    if (typeof Sync !== 'undefined') Sync.saveLocal();
  }

  function switchMapTab(tab) {
    document.querySelectorAll('.map-tab').forEach(t => t.classList.toggle('active', t.dataset.mtab === tab));
    const roadmap = document.getElementById('roadmap');
    const ranks   = document.getElementById('ranks-panel');
    if (!roadmap || !ranks) return;
    if (tab === 'campaign') {
      roadmap.classList.remove('hidden');
      ranks.classList.add('hidden');
      renderRoadmap();
    } else {
      roadmap.classList.add('hidden');
      ranks.classList.remove('hidden');
      renderRanksPanel();
    }
  }

  function syncMapResources() {
    const r = Game.getResources();
    document.querySelectorAll('.map-gold').forEach(e => { e.textContent = fmt(r.gold); });
    document.querySelectorAll('.map-food').forEach(e => { e.textContent = fmt(r.food); });
  }

  // ─── DRAWER ─────────────────────────────────────────────
  function openDrawer() {
    const d = document.getElementById('dweller-drawer');
    const b = document.getElementById('dweller-drawer-backdrop');
    if (d) d.classList.add('open');
    if (b) b.classList.add('visible');
  }
  function closeDrawer() {
    const d = document.getElementById('dweller-drawer');
    const b = document.getElementById('dweller-drawer-backdrop');
    if (d) d.classList.remove('open');
    if (b) b.classList.remove('visible');
  }

  // ─── DWELLER TRAY (always-visible strip) ────────────────
  function renderTray() {
    const tray = document.getElementById('dweller-tray-inner');
    if (!tray) return;
    const unassigned = Game.getDwellers().filter(function(d) { return !d.assignedRoom; });
    if (!unassigned.length) {
      tray.innerHTML = '<span class="tray-label">All dwellers assigned</span>';
      return;
    }
    var html = '<span class="tray-label">Drag to assign</span>';
    unassigned.forEach(function(dw) {
      var role = Game.getDwellerRole(dw.id);
      var inj = dw.injured ? ' injured' : '';
      html += '<div class="tray-chip" data-id="' + dw.id + '">' +
        '<span class="tc-emoji">' + dw.emoji + '</span>' +
        '<div><div class="tc-name">' + dw.name + (dw.injured ? ' 🩹' : '') + '</div>' +
        '<div class="tc-role">' + role.icon + ' ' + role.role + ' Lv' + (dw.level || 1) + '</div></div>' +
        '</div>';
    });
    tray.innerHTML = html;
    tray.querySelectorAll('.tray-chip').forEach(function(chip) {
      var id = chip.dataset.id;
      chip.addEventListener('click', function() { UI.openDwellerModal(id); });
      // tap chip = select dweller
      chip.addEventListener('click', function(e) { e.stopPropagation(); if (typeof Drag !== 'undefined') Drag.selectDweller(id); });
    });
  }

  // ─── CASTLE ─────────────────────────────────────────────
  function renderCastle() {
    var wall = document.getElementById('castle-wall');
    if (!wall) return;
    wall.innerHTML = '';

    [3, 2, 1, 0].forEach(function(floorNum) {
      var col = document.createElement('div');
      col.className = 'castle-floor floor-' + floorNum;

      FLOOR_LAYOUT[floorNum].forEach(function(roomId) {
        var def    = ROOM_DEFS.find(function(r) { return r.id === roomId; });
        var level  = Game.getRoomLevel(roomId);
        var locked = level === 0;
        var upg    = Game.getUpgradeProgress(roomId);
        var dwIds  = Game.getRoomDwellers(roomId);

        var cell = document.createElement('div');
        var cls = 'room-cell';
        if (locked) cls += ' locked';
        if (upg)    cls += ' upgrading';
        cell.className = cls;
        cell.dataset.roomId = roomId;

        // Collect badge
        var collectBadge = '';
        if (!locked && def.resource) {
          var stored = Game.getRoomStorage(roomId);
          var cap    = (def.storageCap || 999) * level;
          if (stored >= cap * 0.9) {
            collectBadge = '<div class="room-collect-badge" data-collect="' + roomId + '">COLLECT!</div>';
          } else if (stored > 5) {
            collectBadge = '<div class="room-collect-badge" style="opacity:.6;animation:none" data-collect="' + roomId + '">' + Math.floor(stored) + ' ' + def.resource + '</div>';
          }
        }

        // Worker boost for production rooms
        var boostBadge = '';
        if (def.resource && !locked && dwIds.length) {
          var mult = (1 + dwIds.length * 0.4).toFixed(1);
          boostBadge = '<div class="room-boost">x' + mult + '</div>';
        }

        // Walkers
        var walkersHtml = '';
        if (!locked && !upg && dwIds.length) {
          walkersHtml = '<div class="room-walkers">';
          dwIds.forEach(function(id) {
            var dw = Game.getDweller(id);
            var injCls = dw && dw.injured ? ' walker-injured' : '';
            walkersHtml += '<span class="walker draggable-walker' + injCls + '" data-dw-id="' + id + '" draggable="false" title="' + (dw ? dw.name : '') + '">' + (dw ? dw.emoji : '🧍') + '</span>';
          });
          walkersHtml += '</div>';
        }
        // Unassigned dwellers float in throne room
        var unassignedHtml = '';
        if (roomId === 'throne_room' && !locked) {
          var unassigned = Game.getDwellers().filter(function(d) { return !d.assignedRoom; });
          if (unassigned.length) {
            unassignedHtml = '<div class="room-unassigned">';
            unassigned.forEach(function(dw) {
              unassignedHtml += '<span class="walker-unassigned draggable-walker" data-dw-id="' + dw.id + '" draggable="false" title="' + dw.name + ' (drag to assign)">' + dw.emoji + '</span>';
            });
            unassignedHtml += '<div style="font-size:.55rem;color:var(--text-ghost);margin-top:2px">drag to assign</div></div>';
          }
        }

        // Upgrade bar
        var upgHtml = '';
        if (upg) {
          upgHtml = '<div class="room-upgrade-bar"><div class="room-upgrade-fill" style="width:' + Math.round(upg.pct * 100) + '%"></div></div>';
        }

        var metaText = locked ? 'LOCKED' : (upg ? ('Upgrading ' + upg.remaining + 's') : 'Level ' + level);
        var outputHtml = (!locked && def.resource) ? '<div class="room-output">+' + (def.baseRate * level) + '/min</div>' : '';
        var torchIcon  = locked ? '🔒' : (upg ? '🔨' : '🔥');

        cell.innerHTML =
          boostBadge +
          '<div class="room-torch">' + torchIcon + '</div>' +
          '<div class="room-icon">' + def.icon + '</div>' +
          '<div class="room-name">' + def.name + '</div>' +
          '<div class="room-meta">' + metaText + '</div>' +
          outputHtml +
          walkersHtml +
          unassignedHtml +
          collectBadge +
          upgHtml;

        if (!locked) {
          cell.addEventListener('click', function(e) {
            // If a dweller is selected → try to place them here
            if (typeof Drag !== 'undefined' && Drag.isSelecting()) {
              Drag.tryPlace(roomId);
              return;
            }
            // Walker click → select dweller
            var walkerEl = e.target.closest('.draggable-walker');
            var wid = walkerEl && walkerEl.getAttribute('data-dw-id');
            if (wid) {
              if (typeof Drag !== 'undefined') Drag.selectDweller(wid);
              return;
            }
            var badge = e.target.closest('[data-collect]');
            if (badge) { doCollect(badge.dataset.collect); return; }
            openRoomModal(roomId);
          });

          // Drop target for drag
          cell.addEventListener('dragover', function(e) {
            if (def.maxDwellers > 0 && Game.getRoomDwellers(roomId).length < def.maxDwellers) {
              e.preventDefault(); cell.classList.add('drag-over');
            }
          });
          cell.addEventListener('dragleave', function() { cell.classList.remove('drag-over'); });
          cell.addEventListener('drop', function(e) {
            e.preventDefault(); cell.classList.remove('drag-over');
            var id = e.dataTransfer.getData('dwellerId');
            if (id) { Game.assignDweller(id, roomId); refresh(); }
          });
        }
        col.appendChild(cell);
      });
      // Insert staircase divider between floors (not after the last)
      if (floorNum > 0) {
        var stair = document.createElement('div');
        stair.className = 'staircase-col';
        stair.innerHTML =
          '<div class="stair-step"></div>' +
          '<div class="stair-step"></div>' +
          '<div class="stair-step"></div>' +
          '<div class="stair-mid">&#9654;</div>' +
          '<div class="stair-step"></div>' +
          '<div class="stair-step"></div>' +
          '<div class="stair-step"></div>';
        wall.appendChild(stair);
      }
      wall.appendChild(col);
    });

    // Drag handled by Drag.init() pointer-event delegation
  }

  function doCollect(roomId) {
    var amount = Game.collectRoom(roomId);
    if (amount > 0) { renderCastle(); renderResources(); save(); }
  }

  // ─── DWELLER LIST (drawer) ───────────────────────────────
  function renderDwellerList() {
    var all = Game.getDwellers();
    var c = document.getElementById('dweller-count');
    if (c) c.textContent = all.length + '/10';
    var html = all.map(function(dw) {
      var role  = Game.getDwellerRole(dw.id);
      var stars = '★'.repeat(dw.stars) + '☆'.repeat(5 - dw.stars);
      return '<div class="dweller-card-mini" data-id="' + dw.id + '" draggable="true">' +
        '<div class="dweller-avatar">' + dw.emoji + '</div>' +
        '<div class="dweller-mini-info">' +
        '<div class="dweller-mini-name">' + dw.name + (dw.injured ? ' 🩹' : '') + '</div>' +
        '<div class="dweller-mini-sub">' + role.icon + ' ' + role.role + ' · Lv' + (dw.level || 1) + '</div>' +
        '<div class="dweller-stars">' + stars + '</div>' +
        '</div></div>';
    }).join('');
    var el = document.getElementById('dweller-list');
    if (!el) return;
    el.innerHTML = html;
    el.querySelectorAll('.dweller-card-mini').forEach(function(card) {
      card.addEventListener('click', function() { closeDrawer(); openDwellerModal(card.dataset.id); });
      card.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('dwellerId', card.dataset.id);
        setTimeout(function() { card.classList.add('dragging'); }, 0);
        closeDrawer();
      });
      card.addEventListener('dragend', function() { card.classList.remove('dragging'); });
    });
  }


  function renderResources() {
    var r = Game.getResources();
    function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = fmt(v); }
    set('val-gold', r.gold);
    set('val-food', r.food);
    set('val-iron', r.iron);
    set('val-shards', (r.shards.common || 0) + (r.shards.rare || 0) + (r.shards.epic || 0) + (r.shards.legendary || 0));
    var cn = document.getElementById('castle-name');
    if (cn) cn.textContent = Game.getCastleName();
    syncMapResources();
  }

  // ─── ROOM MODAL ─────────────────────────────────────────
  function openRoomModal(roomId) {
    var def   = ROOM_DEFS.find(function(r) { return r.id === roomId; });
    var level = Game.getRoomLevel(roomId);
    var upg   = Game.getUpgradeProgress(roomId);
    var dwIds = Game.getRoomDwellers(roomId);

    // Dweller slots HTML
    var slotsHtml = '';
    if (def.maxDwellers > 0) {
      var rows = '';
      for (var i = 0; i < def.maxDwellers; i++) {
        var id = dwIds[i];
        if (id) {
          var dw   = Game.getDweller(id);
          var role = Game.getDwellerRole(id);
          var tp   = Game.getTrainingProgress(id);
          var hpPct = dw ? Math.round(((dw.hp || dw.stats.hp) / (dw.maxHp || dw.stats.hp)) * 100) : 100;
          var progressBar = '';
          if (roomId === 'training_grounds' && tp) {
            progressBar = '<div class="rds-xp-bar"><div class="rds-xp-fill" style="width:' + Math.round(tp.pct * 100) + '%"></div></div>' +
              '<div style="font-size:.62rem;color:var(--text-dim)">' + tp.xp + '/' + tp.needed + ' XP</div>';
          } else if (dw && dw.injured) {
            progressBar = '<div class="rds-hp-bar"><div class="rds-hp-fill" style="width:' + hpPct + '%"></div></div>' +
              '<div style="font-size:.62rem;color:#ff8888">Healing ' + hpPct + '%</div>';
          }
          rows += '<div class="room-dweller-slot filled">' +
            '<div class="rds-avatar">' + dw.emoji + '</div>' +
            '<div class="rds-info"><div class="rds-name">' + dw.name + '</div>' +
            '<div class="rds-sub">' + role.icon + ' ' + role.role + ' Lv' + (dw.level || 1) + '</div>' +
            progressBar + '</div>' +
            '<button class="rds-remove" onclick="UI.doUnassign(\'' + id + '\',\'' + roomId + '\')">x</button>' +
            '</div>';
        } else {
          rows += '<div class="room-dweller-slot">' +
            '<div class="rds-avatar" style="background:none;border-style:dashed;color:var(--text-ghost);font-size:.8rem">drag</div>' +
            '<div class="rds-info"><div class="rds-sub empty-slot-hint">Drag from top bar</div></div>' +
            '</div>';
        }
      }
      slotsHtml = '<div class="modal-sect">' +
        '<div class="modal-sect-title">Dwellers (' + dwIds.length + '/' + def.maxDwellers + ')</div>' +
        '<div class="room-dweller-slots">' + rows + '</div>' +
        '</div>';
    }

    // Upgrade HTML
    var upgradeHtml = '';
    var nextCosts = def.upgradeCosts && def.upgradeCosts[level];
    if (nextCosts && !upg) {
      var canUp = Game.canUpgrade(roomId);
      upgradeHtml = '<div class="modal-sect"><div class="modal-sect-title">Upgrade to Level ' + (level + 1) + '</div>' +
        '<div class="upgrade-box">' +
        '<div style="font-size:.8rem;color:var(--text-dim);margin-bottom:6px">' + (def.upgradeDesc && def.upgradeDesc[level] || '') + '</div>' +
        '<div class="upgrade-cost"><span>Gold: ' + nextCosts.gold + '</span>' + (nextCosts.iron ? '<span>Iron: ' + nextCosts.iron + '</span>' : '') + '</div>' +
        '<button class="btn-room-action primary" style="width:100%;margin-top:8px" ' + (canUp ? '' : 'disabled') + ' onclick="UI.doUpgrade(\'' + roomId + '\')">' +
        (canUp ? 'Upgrade' : 'Not enough resources') + '</button>' +
        '</div></div>';
    } else if (upg) {
      upgradeHtml = '<div class="modal-sect"><div class="modal-sect-title">Upgrading... ' + upg.remaining + 's left</div>' +
        '<div class="upgrade-timer"><div class="upgrade-timer-fill" style="width:' + Math.round(upg.pct * 100) + '%"></div></div></div>';
    }

    // Room-specific actions
    var actionHtml = '';
    if (roomId === 'treasury' || roomId === 'kitchen') {
      var stored = Game.getRoomStorage(roomId);
      var cap    = (def.storageCap || 999) * level;
      var pct    = Math.min(100, Math.round((stored / cap) * 100));
      actionHtml = '<div class="modal-sect"><div class="modal-sect-title">Production</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:.82rem;color:var(--text-dim);margin-bottom:6px">' +
        '<span>' + Math.floor(stored) + ' / ' + cap + ' ' + def.resource + '</span><span>' + pct + '%</span></div>' +
        '<div class="upgrade-timer"><div class="upgrade-timer-fill" style="width:' + pct + '%;background:linear-gradient(90deg,#2a6a18,#5acc28)"></div></div>' +
        '<button class="btn-room-action collect" style="width:100%;margin-top:10px" onclick="UI.doCollect(\'' + roomId + '\');UI.closeModal()">' +
        'Collect ' + Math.floor(stored) + ' ' + def.resource + '</button></div>';
    }
    if (roomId === 'barracks') {
      var party = Game.getBattleParty();
      actionHtml = '<div class="modal-sect"><div class="modal-sect-title">Battle Party (' + party.length + ' fighters)</div>' +
        (party.length
          ? '<button class="btn-room-action primary" onclick="UI.closeModal();UI.showScreen(\'map\')">Go to Battle Map</button>'
          : '<p style="font-size:.78rem;color:var(--text-ghost);font-style:italic">Assign fighters with weapons</p>') +
        '</div>';
    }
    if (roomId === 'hospital') {
      var hospLevel = Game.getRoomLevel('hospital');
      var hospDef   = ROOM_DEFS.find(function(r) { return r.id === 'hospital'; });
      var hpPerMin  = (hospDef.healHpPerMin || 15) * (1 + (hospLevel - 1) * 0.6);
      var injured   = Game.getDwellers().filter(function(d) { return d.injured; });
      var injHtml   = injured.length
        ? injured.map(function(dw) {
            var hp = Math.round(((dw.hp || 0) / (dw.maxHp || dw.stats.hp)) * 100);
            return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
              '<span>' + dw.emoji + '</span>' +
              '<div style="flex:1"><div style="font-size:.82rem;color:var(--text-bright)">' + dw.name + ' — ' + hp + '%</div>' +
              '<div class="rds-hp-bar"><div class="rds-hp-fill" style="width:' + hp + '%"></div></div></div>' +
              '</div>';
          }).join('')
        : '<p style="font-size:.78rem;color:var(--text-ghost);font-style:italic">No injured fighters</p>';
      actionHtml = '<div class="modal-sect"><div class="modal-sect-title">Auto-Healing</div>' +
        '<p style="font-size:.82rem;color:var(--text-dim);margin-bottom:8px">Rate: ' + Math.round(hpPerMin) + ' HP/min</p>' +
        injHtml + '</div>';
    }
    if (roomId === 'workshop') {
      actionHtml = '<div class="modal-sect"><div class="modal-sect-title">Workshop</div>' +
        '<div class="room-actions">' +
        '<button class="btn-room-action" onclick="UI.openInventory()">Inventory</button>' +
        '</div></div>';
    }

    openModal(
      '<div class="modal-title">' + def.icon + ' ' + def.name + '</div>' +
      '<div class="modal-sub">Level ' + level + (upg ? ' · Upgrading...' : '') + '</div>' +
      '<div class="modal-sect"><p style="font-size:.86rem;color:var(--text-dim);line-height:1.6">' + def.description + '</p></div>' +
      actionHtml + slotsHtml + upgradeHtml
    );
  }

  function doUpgrade(roomId) {
    if (Game.upgradeRoom(roomId)) { openRoomModal(roomId); renderCastle(); save(); }
  }
  function doUnassign(dwellerId, roomId) {
    Game.unassignDweller(dwellerId);
    openRoomModal(roomId); refresh(); save();
  }
  function doCollect(roomId) {
    var amount = Game.collectRoom(roomId);
    if (amount > 0) { renderCastle(); renderResources(); save(); }
  }

  // ─── DWELLER MODAL ──────────────────────────────────────
  function openDwellerModal(dwellerId) {
    var dw = Game.getDweller(dwellerId);
    if (!dw) return;
    var stats   = Game.getDwellerStats(dwellerId);
    var role    = Game.getDwellerRole(dwellerId);
    var stars   = '★'.repeat(dw.stars) + '☆'.repeat(5 - dw.stars);
    var tp      = Game.getTrainingProgress(dwellerId);
    var roleCls = 'role-' + role.role.toLowerCase();

    var statsHtml = Object.keys(STAT_DEFS).map(function(k) {
      return '<div class="stat-box"><div class="stat-lbl">' + STAT_DEFS[k].icon + ' ' + STAT_DEFS[k].label + '</div>' +
        '<div class="stat-val">' + (stats ? (stats[k] || 0) : 0) + '</div></div>';
    }).join('');

    var slotsHtml = EQUIP_SLOTS.map(function(slot) {
      var item   = Game.getEquippedItem(dwellerId, slot.id);
      var rarCls = item ? ' filled r-' + item.rarity : '';
      var inner  = item
        ? '<div class="eslot-name" style="color:' + RARITIES[item.rarity].color + '">' + item.name + '</div>'
        : '<div class="eslot-lbl">' + slot.label + '</div>';
      return '<div class="equip-slot' + rarCls + '" onclick="UI.openEquipPicker(\'' + dwellerId + '\',\'' + slot.id + '\')">' +
        '<div class="eslot-icon">' + slot.icon + '</div>' + inner + '</div>';
    }).join('');

    var xpBar = tp
      ? '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-dim);margin-bottom:3px"><span>XP</span><span>' + tp.xp + '/' + tp.needed + '</span></div><div class="rds-xp-bar" style="height:5px"><div class="rds-xp-fill" style="width:' + Math.round(tp.pct * 100) + '%"></div></div></div>'
      : '<div style="margin-top:8px;font-size:.75rem;color:var(--gold)">Max Level</div>';

    openModal(
      '<div class="dw-header"><div class="dw-avatar-lg">' + dw.emoji + '</div>' +
      '<div class="dw-header-info"><h3>' + dw.name + (dw.injured ? ' 🩹' : '') + '</h3>' +
      '<div class="dw-stars">' + stars + ' Lv ' + (dw.level || 1) + '</div>' +
      '<div class="role-badge ' + roleCls + '">' + role.icon + ' ' + role.role + '</div>' +
      xpBar + '</div></div>' +
      '<div class="modal-sect"><div class="modal-sect-title">Stats</div><div class="stats-grid">' + statsHtml + '</div></div>' +
      '<div class="modal-sect"><div class="modal-sect-title">Equipment</div><div class="equip-grid">' + slotsHtml + '</div></div>'
    );
  }

  // ─── EQUIP PICKER ───────────────────────────────────────
  function openEquipPicker(dwellerId, slot) {
    var dw      = Game.getDweller(dwellerId);
    var current = Game.getEquippedItem(dwellerId, slot);
    var currentId = current ? current.id : null;
    // Show unequipped items + whatever is currently in this slot
    var pool    = Game.getInventory().filter(function(i) {
      if (i.slot !== slot) return false;
      // Include if unequipped OR already in this slot
      var equippedBy = Game.getDwellers().find(function(d) { return Object.values(d.equipment).indexOf(i.id) >= 0; });
      return !equippedBy || i.id === currentId;
    });
    var cards   = pool.map(function(item) {
      var r  = RARITIES[item.rarity];
      var eq = current && current.id === item.id;
      var ss = Object.keys(item.stats).map(function(k) { return (STAT_DEFS[k] ? STAT_DEFS[k].icon : k) + ' +' + item.stats[k]; }).join('  ');
      return '<div class="item-card' + (eq ? ' equipped' : '') + '" onclick="UI.doEquip(\'' + dwellerId + '\',\'' + item.id + '\')" style="border-color:' + r.color + '">' +
        '<div class="item-card-left"><h4 style="color:' + r.color + '">' + item.name + '</h4>' +
        '<div class="item-stats">' + ss + '</div></div>' +
        '<span class="item-rarity-badge" style="color:' + r.color + ';border:1px solid ' + r.color + '">' + r.label + (eq ? ' ✓' : '') + '</span>' +
        '</div>';
    }).join('');
    openModal(
      '<div class="modal-title">Choose ' + slot.replace(/\d+/, '') + '</div>' +
      '<div class="modal-sub">For ' + (dw ? dw.name : '') + '</div>' +
      (current ? '<button class="btn-secondary" onclick="UI.doUnequip(\'' + dwellerId + '\',\'' + slot + '\')" style="width:100%;margin-bottom:12px">Remove ' + current.name + '</button>' : '') +
      (cards || '<p style="color:var(--text-ghost);font-style:italic;font-size:.85rem">No items for this slot</p>')
    );
  }
  function doEquip(dwellerId, itemId) {
    Game.equipItem(dwellerId, itemId);
    openDwellerModal(dwellerId); refresh(); save();
  }
  function doUnequip(dwellerId, slot) {
    Game.unequipItem(dwellerId, slot);
    openDwellerModal(dwellerId); save();
  }

  // ─── INVENTORY ──────────────────────────────────────────
  function openInventory() {
    var items = Game.getUnequippedInventory();
    var grid  = items.map(function(item) {
      var r = RARITIES[item.rarity];
      var icon = item.slot === 'weapon' ? 'sword' : item.slot === 'armor' ? 'shield' : item.slot === 'ring' ? 'ring' : 'gem';
      return '<div class="inv-item" style="border-color:' + r.color + '" onclick="UI.openItemDetail(\'' + item.id + '\')">' +
        '<div class="inv-icon">' + (item.slot === 'weapon' ? '⚔️' : item.slot === 'armor' ? '🛡️' : item.slot === 'ring' ? '💍' : '🔮') + '</div>' +
        '<div class="inv-name" style="color:' + r.color + '">' + item.name + '</div>' +
        '<div style="font-size:.58rem;color:var(--text-ghost)">' + item.slot + '</div>' +
        '</div>';
    }).join('');
    openModal(
      '<div class="modal-title">Inventory</div>' +
      '<div class="modal-sub">' + items.length + ' items</div>' +
      '<div class="inventory-grid">' + (grid || '<p style="color:var(--text-ghost);font-style:italic">Empty</p>') + '</div>'
    );
  }

  function openItemDetail(itemId) {
    var item = Game.getInventory().find(function(i) { return i.id === itemId; });
    if (!item) return;
    var r  = RARITIES[item.rarity];
    var ss = Object.keys(item.stats).map(function(k) { return (STAT_DEFS[k] ? STAT_DEFS[k].icon + ' ' + STAT_DEFS[k].label : k) + ': +' + Math.round(item.stats[k] * r.mult); }).join('<br>');
    var equippedBy = Game.getDwellers().find(function(d) { return Object.values(d.equipment).indexOf(itemId) >= 0; });
    var btns = Game.getDwellers().filter(function(d) { return !d.injured; }).map(function(d) {
      return '<button class="btn-room-action" onclick="UI.doEquip(\'' + d.id + '\',\'' + itemId + '\')">' + d.emoji + ' ' + d.name + '</button>';
    }).join('');
    openModal(
      '<div class="modal-title" style="color:' + r.color + '">' + item.name + '</div>' +
      '<div class="modal-sub">' + r.label + ' ' + item.slot + (item.weaponType ? ' · ' + (WEAPON_ROLES[item.weaponType] ? WEAPON_ROLES[item.weaponType].role : '') : '') + '</div>' +
      '<div class="modal-sect"><div class="modal-sect-title">Stats</div><p style="font-size:.85rem;color:var(--text-main);line-height:1.8">' + ss + '</p></div>' +
      (equippedBy ? '<p style="font-size:.8rem;color:var(--text-dim);margin-bottom:10px">Equipped by: ' + equippedBy.emoji + ' ' + equippedBy.name + '</p>' : '') +
      '<div class="room-actions">' + btns +
      (!equippedBy ? '<button class="btn-room-action danger" onclick="UI._dismantle(\'' + itemId + '\')">Dismantle (+' + RARITIES[item.rarity].shards + ' shards)</button>' : '') +
      '</div>'
    );
  }
  function _dismantle(itemId) {
    var result = Game.dismantleItem(itemId);
    if (result) { openInventory(); renderResources(); save(); }
  }

  // ─── ROADMAP ─────────────────────────────────────────────
  function renderRoadmap() {
    var rm = document.getElementById('roadmap');
    if (!rm) return;
    var progress = Game.getState().mapProgress || 1;
    rm.innerHTML = '';
    var lastRegion = null;
    MAP_STAGES.forEach(function(stage, idx) {
      var row   = document.createElement('div');
      var sides = ['left','mid','right'];
      row.className = 'stage-row ' + sides[idx % 3];
      var cleared  = stage.id < progress;
      var current  = stage.id === progress;
      var locked   = stage.id > progress;
      var stateCls = cleared ? 'cleared' : current ? 'current' : 'locked';
      row.innerHTML = '<div class="road-link"></div>' +
        '<div class="stage-cell">' +
        '<div class="stage-node ' + stateCls + '" data-stage="' + stage.id + '">' +
        '<div class="sn-num">' + stage.id + '</div><div class="sn-boss">' + stage.boss + '</div></div>' +
        '<div class="stage-label">' + stage.name + '</div>' +
        '</div>';
      if (!locked) {
        row.querySelector('.stage-node').addEventListener('click', function() { openStageModal(stage.id); });
      }
      rm.appendChild(row);
      if (stage.region !== lastRegion) {
        var banner = document.createElement('div');
        banner.className = 'region-banner';
        banner.style.color = REGION_COLORS[stage.region] || 'var(--text-dim)';
        banner.textContent = stage.region;
        rm.appendChild(banner);
        lastRegion = stage.region;
      }
    });
  }

  // ─── STAGE / BATTLE ──────────────────────────────────────
  var _activeStage   = null;
  var _activeEnemies = [];

  function buildStageEnemies(stage) {
    var names   = ['Grimbold','Vexar','Thornwick','Draven','Kael','Seraphia','Morwen','Skarn'];
    var emojis  = ['🧙','👹','💀','🧟','👺','🤺','🧛','👿'];
    var weapons = ['sword','bow','staff','daggers'];
    var d = stage.diff;
    return Array.from({ length: stage.enemyCount }, function(_, i) {
      var isLast = i === stage.enemyCount - 1;
      return {
        id: 'enemy_' + i,
        name:   isLast ? stage.name + ' Boss' : names[Math.floor(Math.random() * names.length)],
        emoji:  isLast ? stage.boss          : emojis[Math.floor(Math.random() * emojis.length)],
        weapon: weapons[Math.floor(Math.random() * weapons.length)],
        stats: {
          atk:  Math.round((9  + Math.random() * 6)  * d),
          def:  Math.round((5  + Math.random() * 4)  * d),
          mdef: Math.round((3  + Math.random() * 4)  * d),
          hp:   Math.round((55 + Math.random() * 30) * d),
          crit: 5  + Math.floor(Math.random() * 8),
          dodge:3  + Math.floor(Math.random() * 6),
          spd:  7  + Math.floor(Math.random() * 7),
        }
      };
    });
  }

  function openStageModal(stageId) {
    var stage = MAP_STAGES.find(function(s) { return s.id === stageId; });
    if (!stage) return;
    _activeStage   = stage;
    _activeEnemies = buildStageEnemies(stage);
    var partyIds   = Game.getBattleParty();

    var yourCards = partyIds.length
      ? partyIds.map(function(id) {
          var dw = Game.getDweller(id), stats = Game.getDwellerStats(id), role = Game.getDwellerRole(id);
          return '<div class="battle-fighter-card">' +
            '<div class="bfc-avatar">' + dw.emoji + '</div>' +
            '<div style="flex:1"><div class="bfc-name">' + dw.name + '</div>' +
            '<div class="bfc-role">' + role.icon + ' ' + role.role + ' HP:' + stats.hp + ' ATK:' + stats.atk + '</div>' +
            '<div class="hp-bar-wrap"><div class="hp-bar" style="width:100%"></div></div></div>' +
            '</div>';
        }).join('')
      : '<div class="party-empty">No fighters in Barracks!<br><a onclick="UI.closeModal();UI.showScreen(\'castle\')">Assign fighters</a></div>';

    var enemyCards = _activeEnemies.map(function(e) {
      var role = WEAPON_ROLES[e.weapon] || WEAPON_ROLES.none;
      return '<div class="battle-fighter-card enemy">' +
        '<div class="bfc-avatar">' + e.emoji + '</div>' +
        '<div style="flex:1;text-align:right"><div class="bfc-name">' + e.name + '</div>' +
        '<div class="bfc-role">' + role.icon + ' ' + role.role + ' HP:' + e.stats.hp + '</div>' +
        '<div class="hp-bar-wrap"><div class="hp-bar" style="width:100%"></div></div></div>' +
        '</div>';
    }).join('');

    openModal(
      '<div class="modal-title">' + stage.boss + ' ' + stage.name + '</div>' +
      '<div class="modal-sub">' + stage.region + ' Stage ' + stage.id + '</div>' +
      '<div class="battle-arena">' +
      '<div class="party-panel"><h3>Your Party (' + partyIds.length + ')</h3>' + yourCards + '</div>' +
      '<div class="vs-divider"><div class="vs-line"></div><div class="vs-text">VS</div><div class="vs-line"></div></div>' +
      '<div class="party-panel"><h3>Enemies</h3>' + enemyCards + '</div>' +
      '</div>' +
      '<div id="battle-log-area"></div>' +
      '<button class="btn-battle" id="btn-fight"' + (partyIds.length ? '' : ' disabled') + '>Begin Battle</button>'
    );
    var btn = document.getElementById('btn-fight');
    if (btn) btn.addEventListener('click', runStageBattle);
  }

  function runStageBattle() {
    var partyIds = Game.getBattleParty();
    if (!partyIds.length) return;
    var result = Battle.calculate(partyIds, _activeEnemies, _activeStage ? _activeStage.id : 1);
    playBattleLog(result);
  }

  function playBattleLog(result) {
    var area = document.getElementById('battle-log-area');
    if (!area) return;
    area.innerHTML = '<div class="battle-log-wrap" id="battle-log"></div>';
    var log    = document.getElementById('battle-log');
    var events = result.log;
    var i = 0, lastRound = 0;
    var fightBtn = document.getElementById('btn-fight');
    if (fightBtn) fightBtn.disabled = true;

    function step() {
      if (i >= events.length) {
        var won = result.winner === 'attacker';
        addLine(log, won ? '🏆 VICTORY' : '💀 DEFEAT', won ? 'result win' : 'result loss');
        var s = Game.getState();
        if (won) {
          var loot = result.loot;
          if (loot) {
            s.resources.gold += loot.gold;
            s.resources.food += loot.food;
            s.resources.iron += (loot.iron || 0);
            if (loot.items && loot.items.length) Game.addItems(loot.items);
          }
          s.wins = (s.wins || 0) + 1;
          if (_activeStage && _activeStage.id === (s.mapProgress || 1)) {
            s.mapProgress = Math.min(_activeStage.id + 1, MAP_STAGES.length);
          }
          renderResources();
          save();
          showChestReveal(loot);
        } else {
          Game.getBattleParty().forEach(function(id) {
            var dw = Game.getDweller(id);
            if (dw && result.survivors && result.survivors.attackers.indexOf(id) < 0) {
              dw.injured = true;
              dw.hp = Math.floor((dw.maxHp || dw.stats.hp) * 0.3);
            }
          });
          var lossGold = Math.min(s.resources.gold, 15);
          s.resources.gold -= lossGold;
          addLine(log, 'Lost ' + lossGold + ' gold. Fighters are healing.', 'loss');
          renderResources(); renderCastle(); 
          save();
          if (fightBtn) {
            fightBtn.textContent = 'Try Again';
            fightBtn.disabled = false;
            fightBtn.onclick = function() { openStageModal(_activeStage.id); };
          }
        }
        return;
      }
      var ev = events[i++];
      if (ev.round !== lastRound) { lastRound = ev.round; addLine(log, 'Round ' + ev.round, 'round'); }
      if (ev.type === 'dodge')     addLine(log, ev.targetName + ' dodged ' + ev.attackerName, 'dodge');
      else if (ev.type === 'crit') addLine(log, ev.attackerName + ' CRITS ' + ev.targetName + ' for ' + ev.damage + '! (' + ev.targetHp + '/' + ev.targetMaxHp + ' HP)', 'crit');
      else                         addLine(log, ev.attackerName + ' hits ' + ev.targetName + ' for ' + ev.damage + ' (' + ev.targetHp + '/' + ev.targetMaxHp + ' HP)', '');
      if (ev.targetHp <= 0) addLine(log, ev.targetName + ' has fallen', 'death');
      log.scrollTop = log.scrollHeight;
      setTimeout(step, 80);
    }
    step();
  }

  function addLine(container, text, cls) {
    var div = document.createElement('div');
    div.className = 'log-line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    container.appendChild(div);
  }

  function showChestReveal(loot) {
    var itemsHtml = (loot && loot.items && loot.items.length)
      ? loot.items.map(function(it) {
          var r  = RARITIES[it.rarity];
          var ss = Object.keys(it.stats).map(function(k) { return (STAT_DEFS[k] ? STAT_DEFS[k].icon : k) + ' +' + it.stats[k]; }).join('  ');
          return '<div class="loot-item r-' + it.rarity + '" style="border-color:' + r.color + '">' +
            '<div class="loot-item-icon">' + (it.slot === 'weapon' ? '⚔️' : it.slot === 'armor' ? '🛡️' : it.slot === 'ring' ? '💍' : '🔮') + '</div>' +
            '<div><div class="loot-item-name" style="color:' + r.color + '">' + it.name + '</div>' +
            '<div class="loot-item-rarity" style="color:' + r.color + '">' + r.label + '</div>' +
            '<div class="loot-item-stats">' + ss + '</div></div></div>';
        }).join('')
      : '<p style="color:var(--text-dim);font-style:italic;font-size:.85rem;text-align:center">Resources only</p>';
    openModal(
      '<div class="chest-reveal">' +
      '<div class="chest-icon">🎁</div>' +
      '<div class="modal-title" style="text-align:center">Victory!</div>' +
      '<div class="loot-resources"><span>+' + (loot ? loot.gold : 0) + ' Gold</span><span>+' + (loot ? loot.food : 0) + ' Food</span>' + (loot && loot.iron ? '<span>+' + loot.iron + ' Iron</span>' : '') + '</div>' +
      '<div class="modal-sect-title" style="margin-top:14px">Items Found</div>' +
      '<div class="loot-items">' + itemsHtml + '</div>' +
      '<button class="btn-primary" style="width:100%;margin-top:16px" onclick="UI.closeModal();UI.renderRoadmap()">Continue</button>' +
      '</div>'
    );
  }

  // ─── RANKS ───────────────────────────────────────────────
  function renderRanksPanel() {
    var panel = document.getElementById('ranks-panel');
    if (!panel) return;
    var s      = Game.getState();
    var wins   = s.wins || 0;
    var score  = wins * 120 + Game.getDwellers().length * 50 + (s.mapProgress || 1) * 80;
    var user   = Auth.getUser();
    var myName = user ? (user.email.split('@')[0] || 'You') : 'You (Guest)';
    var tier   = score > 4000 ? 'Champion' : score > 2000 ? 'Knight' : score > 800 ? 'Soldier' : 'Recruit';
    var fakes  = [
      { name:'Thorvald the Grim', emoji:'🧔', wins:47, score:5820, tier:'Champion' },
      { name:'Lady Seraphine',    emoji:'👸', wins:38, score:4690, tier:'Champion' },
      { name:'Iron Duke Raven',   emoji:'🤺', wins:31, score:3870, tier:'Knight'  },
      { name:'Morgath Stonehide', emoji:'👹', wins:27, score:3340, tier:'Knight'  },
      { name:'Elara the Swift',   emoji:'🧝', wins:19, score:2420, tier:'Soldier' },
      { name:'Dunwick the Bold',  emoji:'⚔️', wins:14, score:1760, tier:'Soldier' },
    ];
    var all = fakes.concat([{ name:myName, emoji:'🏰', wins:wins, score:score, tier:tier, you:true }]);
    all.sort(function(a,b) { return b.score - a.score; });
    var myRank = 1; all.forEach(function(r,i) { if (r.you) myRank = i + 1; });
    panel.innerHTML =
      '<div class="ranks-header">Hall of Lords</div>' +
      '<div class="ranks-sub">Global Leaderboard</div>' +
      '<div class="your-stats-box">' +
      '<div class="ys-item"><div class="ys-val">#' + myRank + '</div><div class="ys-lbl">Rank</div></div>' +
      '<div class="ys-item"><div class="ys-val">' + wins + '</div><div class="ys-lbl">Wins</div></div>' +
      '<div class="ys-item"><div class="ys-val">' + Game.getDwellers().length + '</div><div class="ys-lbl">Dwellers</div></div>' +
      '<div class="ys-item"><div class="ys-val">' + score + '</div><div class="ys-lbl">Score</div></div>' +
      '</div><div class="rank-tier-label">All Kingdoms</div>' +
      all.map(function(row, idx) {
        var pos    = idx + 1;
        var posCls = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
        var posStr = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '#' + pos;
        return '<div class="rank-row' + (row.you ? ' you' : '') + '">' +
          '<div class="rank-pos ' + posCls + '">' + posStr + '</div>' +
          '<div class="rank-avatar-sm">' + row.emoji + '</div>' +
          '<div class="rank-info"><div class="rank-name">' + row.name + (row.you ? ' (You)' : '') + '</div>' +
          '<div class="rank-meta">' + row.tier + ' · ' + row.wins + ' wins</div></div>' +
          '<div class="rank-score">' + row.score + '</div></div>';
      }).join('');
  }

  // ─── MODAL ───────────────────────────────────────────────
  function openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }
  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ─── HELPERS ─────────────────────────────────────────────
  function refresh() { renderCastle(); renderDwellerList(); }
  function save()    { if (typeof Sync !== 'undefined') Sync.save(); }
  function fmt(n)    { if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; if (n >= 1e3) return (n/1e3).toFixed(1)+'K'; return Math.floor(n || 0).toString(); }

  function renderAll() {
    renderCastle();
    renderDwellerList();
    renderResources();
    var vd = document.getElementById('ver-display');
    if (vd) vd.textContent = APP_VERSION;
  }

  return {
    renderAll, renderCastle, renderDwellerList, renderResources,
    showScreen, switchMapTab, syncMapResources, renderRoadmap, renderRanksPanel,
    openModal, closeModal, openDrawer, closeDrawer,
    openRoomModal, openDwellerModal, openEquipPicker, openInventory, openItemDetail,
    openStageModal, showChestReveal,
    doUnassign, doCollect, doEquip, doUnequip, doUpgrade,
    _dismantle, fmt,
  };
})();
