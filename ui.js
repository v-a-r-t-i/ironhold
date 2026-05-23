// ui.js — All DOM rendering for Ironhold

const UI = (() => {

  // ─── CASTLE VIEW ─────────────────────────────────────────
  function renderCastle() {
    const wall = document.getElementById('castle-wall');
    wall.innerHTML = '';

    [3, 2, 1, 0].forEach(floorNum => {
      const floor   = document.createElement('div');
      floor.className = 'castle-floor';
      floor.style.gridTemplateColumns = FLOOR_GRID[floorNum];

      FLOOR_LAYOUT[floorNum].forEach(roomId => {
        const def     = ROOM_DEFS.find(r => r.id === roomId);
        const level   = Game.getRoomLevel(roomId);
        const locked  = level === 0;
        const dwIds   = Game.getRoomDwellers(roomId);

        const cell = document.createElement('div');
        cell.className = 'room-cell' + (locked ? ' locked' : '');
        cell.dataset.roomId = roomId;

        const dotsHtml = dwIds.map(id => {
          const dw = Game.getDweller(id);
          return `<div class="rdot" title="${dw?.name || ''}">${dw?.emoji || '👤'}</div>`;
        }).join('');

        const rateHtml = (def.resource && !locked)
          ? `<div class="room-output">+${def.baseRate * level}/min ${def.resource}</div>`
          : '';

        cell.innerHTML = `
          <div class="room-torch">${locked ? '🔒' : '🔥'}</div>
          <div class="room-icon">${def.icon}</div>
          <div class="room-name">${def.name}</div>
          <div class="room-meta">${locked ? 'LOCKED' : 'Level ' + level}</div>
          ${rateHtml}
          <div class="room-dwellers">${dotsHtml}</div>
          <div class="room-floor-line"></div>
        `;

        if (!locked) cell.addEventListener('click', () => openRoomModal(roomId));
        floor.appendChild(cell);
      });

      wall.appendChild(floor);
    });
  }

  // ─── DWELLER LIST (SIDEBAR) ──────────────────────────────
  function renderDwellerList() {
    const list    = document.getElementById('dweller-list');
    const all     = Game.getDwellers();
    document.getElementById('dweller-count').textContent = `${all.length}/10`;

    list.innerHTML = all.map(dw => {
      const role  = Game.getDwellerRole(dw.id);
      const stars = '★'.repeat(dw.stars) + '☆'.repeat(5 - dw.stars);
      return `
        <div class="dweller-card-mini" data-id="${dw.id}">
          <div class="dweller-avatar">${dw.emoji}</div>
          <div class="dweller-mini-info">
            <div class="dweller-mini-name">${dw.name}</div>
            <div class="dweller-mini-sub">${role.icon} ${role.role}${dw.injured ? ' 🤕' : ''}</div>
            <div class="dweller-stars">${stars}</div>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.dweller-card-mini').forEach(card => {
      card.addEventListener('click', () => openDwellerModal(card.dataset.id));
    });
  }

  // ─── RESOURCES ───────────────────────────────────────────
  function renderResources() {
    const r = Game.getResources();
    document.getElementById('val-gold').textContent  = fmt(r.gold);
    document.getElementById('val-food').textContent  = fmt(r.food);
    document.getElementById('val-iron').textContent  = fmt(r.iron);
    document.getElementById('val-shards').textContent = fmt(
      (r.shards?.common || 0) + (r.shards?.rare || 0) +
      (r.shards?.epic   || 0) + (r.shards?.legendary || 0)
    );
    document.getElementById('castle-name').textContent = Game.getCastleName();
  }

  // ─── MODAL HELPERS ───────────────────────────────────────
  function openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ─── ROOM MODAL ──────────────────────────────────────────
  function openRoomModal(roomId) {
    const def     = ROOM_DEFS.find(r => r.id === roomId);
    const level   = Game.getRoomLevel(roomId);
    const dwIds   = Game.getRoomDwellers(roomId);

    const assignedHtml = dwIds.map(id => {
      const dw   = Game.getDweller(id);
      const role = Game.getDwellerRole(id);
      return `
        <div class="assign-card">
          <div class="dweller-avatar" style="width:30px;height:30px;font-size:1rem">${dw.emoji}</div>
          <div>
            <div style="font-size:0.88rem;color:var(--text-bright)">${dw.name}</div>
            <div style="font-size:0.75rem;color:var(--text-dim)">${role.icon} ${role.role}</div>
          </div>
          <button class="btn-remove" onclick="UI.doUnassign('${id}','${roomId}')">✕</button>
        </div>
      `;
    }).join('');

    const canAssign = def.maxDwellers > 0 && dwIds.length < def.maxDwellers;
    const free      = Game.getDwellers().filter(d => !d.assignedRoom);
    const assignHtml = canAssign && free.length
      ? `<div class="modal-sect-title" style="margin-top:10px">Assign Dweller</div>
         <select id="assign-sel">
           <option value="">— choose —</option>
           ${free.map(d => `<option value="${d.id}">${d.emoji} ${d.name}</option>`).join('')}
         </select>
         <button class="btn-primary" onclick="UI.doAssign('${roomId}')" style="width:100%">Assign</button>`
      : '';

    openModal(`
      <div class="modal-title">${def.icon} ${def.name}</div>
      <div class="modal-sub">Level ${level}${def.maxDwellers ? ' · ' + dwIds.length + '/' + def.maxDwellers + ' dwellers' : ''}</div>
      <div class="modal-sect">
        <p style="font-size:0.9rem;color:var(--text-dim);line-height:1.6;margin-bottom:12px">${def.description}</p>
        ${def.resource ? `<div style="font-size:0.85rem;color:var(--gold-dim)">📦 +${def.baseRate * level}/min <strong>${def.resource}</strong></div>` : ''}
      </div>
      ${def.maxDwellers > 0 ? `
        <div class="modal-sect">
          <div class="modal-sect-title">Assigned (${dwIds.length}/${def.maxDwellers})</div>
          ${assignedHtml || '<p style="font-size:0.82rem;color:var(--text-ghost);font-style:italic">None assigned</p>'}
          ${assignHtml}
        </div>` : ''}
    `);
  }

  function doAssign(roomId) {
    const sel = document.getElementById('assign-sel');
    if (!sel?.value) return;
    Game.assignDweller(sel.value, roomId);
    openRoomModal(roomId);
    renderDwellerList(); renderCastle();
  }

  function doUnassign(dwellerId, roomId) {
    Game.unassignDweller(dwellerId);
    openRoomModal(roomId);
    renderDwellerList(); renderCastle();
  }

  // ─── DWELLER MODAL ───────────────────────────────────────
  function openDwellerModal(dwellerId) {
    const dw    = Game.getDweller(dwellerId);
    if (!dw) return;
    const stats  = Game.getDwellerStats(dwellerId);
    const role   = Game.getDwellerRole(dwellerId);
    const stars  = '★'.repeat(dw.stars) + '☆'.repeat(5 - dw.stars);
    const roleCls = 'role-' + role.role.toLowerCase();

    const statsHtml = Object.keys(STAT_DEFS).map(k => `
      <div class="stat-box">
        <div class="stat-lbl">${STAT_DEFS[k].icon} ${STAT_DEFS[k].label}</div>
        <div class="stat-val">${stats?.[k] ?? 0}</div>
      </div>
    `).join('');

    const slotsHtml = EQUIP_SLOTS.map(slot => {
      const item   = Game.getEquippedItem(dwellerId, slot.id);
      const rarCls = item ? ' filled r-' + item.rarity : '';
      const nameColor = item ? RARITIES[item.rarity].color : '';
      return `
        <div class="equip-slot${rarCls}" onclick="UI.openEquipPicker('${dwellerId}','${slot.id}')">
          <div class="eslot-icon">${slot.icon}</div>
          ${item
            ? `<div class="eslot-name" style="color:${nameColor}">${item.name}</div>`
            : `<div class="eslot-lbl">${slot.label}</div>`}
        </div>
      `;
    }).join('');

    openModal(`
      <div class="dw-header">
        <div class="dw-avatar-lg">${dw.emoji}</div>
        <div class="dw-header-info">
          <h3>${dw.name}${dw.injured ? ' 🤕' : ''}</h3>
          <div class="dw-stars">${stars} · Lv ${dw.level}</div>
          <div class="role-badge ${roleCls}">${role.icon} ${role.role}</div>
        </div>
      </div>
      <div class="modal-sect">
        <div class="modal-sect-title">Stats</div>
        <div class="stats-grid">${statsHtml}</div>
      </div>
      <div class="modal-sect">
        <div class="modal-sect-title">Equipment — click slot to change</div>
        <div class="equip-grid">${slotsHtml}</div>
      </div>
    `);
  }

  // ─── EQUIP PICKER ────────────────────────────────────────
  function openEquipPicker(dwellerId, slot) {
    const dw      = Game.getDweller(dwellerId);
    const current = Game.getEquippedItem(dwellerId, slot);
    const pool    = Game.getInventory().filter(i => i.slot === slot);

    const cards = pool.map(item => {
      const r  = RARITIES[item.rarity];
      const eq = current?.id === item.id;
      return `
        <div class="item-card ${eq ? 'equipped' : ''}" onclick="UI.doEquip('${dwellerId}','${item.id}')"
             style="border-color:${r.color}">
          <div class="item-card-left">
            <h4 style="color:${r.color}">${item.name}</h4>
            <div class="item-stats">${Object.entries(item.stats).map(([k,v]) => `${STAT_DEFS[k]?.icon || k} +${v}`).join('  ')}</div>
          </div>
          <span class="item-rarity-badge" style="color:${r.color};border:1px solid ${r.color}">
            ${r.label}${eq ? ' ✓' : ''}
          </span>
        </div>
      `;
    }).join('');

    openModal(`
      <div class="modal-title">Choose ${slot.replace(/\d+/,'')}</div>
      <div class="modal-sub">Equipping on ${dw?.name}</div>
      ${current ? `<button class="btn-secondary" onclick="UI.doUnequip('${dwellerId}','${slot}')" style="width:100%;margin-bottom:12px">Remove: ${current.name}</button>` : ''}
      ${cards || '<p style="color:var(--text-ghost);font-style:italic;font-size:0.85rem">No items for this slot</p>'}
    `);
  }

  function doEquip(dwellerId, itemId) {
    Game.equipItem(dwellerId, itemId);
    openDwellerModal(dwellerId);
    renderDwellerList(); renderCastle();
  }

  function doUnequip(dwellerId, slot) {
    Game.unequipItem(dwellerId, slot);
    openDwellerModal(dwellerId);
  }

  // ─── INVENTORY MODAL ─────────────────────────────────────
  function openInventory() {
    const items = Game.getInventory();
    const grid  = items.map(item => {
      const r = RARITIES[item.rarity];
      return `
        <div class="inv-item" style="border-color:${r.color}">
          <div class="inv-icon">⚔️</div>
          <div class="inv-name" style="color:${r.color}">${item.name}</div>
          <div style="font-size:0.6rem;color:var(--text-ghost)">${item.slot}</div>
        </div>
      `;
    }).join('');

    openModal(`
      <div class="modal-title">🎒 Inventory</div>
      <div class="modal-sub">${items.length} items</div>
      <div class="inventory-grid">${grid || '<p style="color:var(--text-ghost);font-style:italic">Empty</p>'}</div>
    `);
  }

  // ─── FULL RENDER ─────────────────────────────────────────
  function renderAll() {
    renderCastle();
    renderDwellerList();
    renderResources();
    document.getElementById('ver-display').textContent = APP_VERSION;
  }

  // ─── FORMAT NUMBER ───────────────────────────────────────
  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n || 0).toString();
  }

  return {
    renderAll, renderCastle, renderDwellerList, renderResources,
    openModal, closeModal,
    openRoomModal, openDwellerModal, openEquipPicker, openInventory,
    doAssign, doUnassign, doEquip, doUnequip, fmt,
  };
})();
