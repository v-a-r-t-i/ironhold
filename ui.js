// ui.js — DOM rendering for Ironhold v1.6.0

const UI = (() => {

  // ─── SCREEN NAV ──────────────────────────────────────────
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (name === 'castle') document.getElementById('game-screen').classList.add('active');
    if (name === 'map')    { document.getElementById('map-screen').classList.add('active'); switchMapTab('campaign'); syncMapResources(); }
    closeDrawer();
    if (typeof Sync !== 'undefined') Sync.saveLocal();
  }

  function switchMapTab(tab) {
    document.querySelectorAll('.map-tab').forEach(t => t.classList.toggle('active', t.dataset.mtab === tab));
    const roadmap = document.getElementById('roadmap');
    const ranks   = document.getElementById('ranks-panel');
    if (tab === 'campaign') { roadmap.classList.remove('hidden'); ranks.classList.add('hidden'); renderRoadmap(); }
    else                    { roadmap.classList.add('hidden'); ranks.classList.remove('hidden'); renderRanksPanel(); }
  }

  function syncMapResources() {
    const r = Game.getResources();
    document.querySelectorAll('.map-gold').forEach(e => e.textContent = fmt(r.gold));
    document.querySelectorAll('.map-food').forEach(e => e.textContent = fmt(r.food));
  }

  // ─── DRAWER ──────────────────────────────────────────────
  function openDrawer()  { document.getElementById('dweller-drawer').classList.add('open'); document.getElementById('dweller-drawer-backdrop').classList.add('visible'); }
  function closeDrawer() { document.getElementById('dweller-drawer').classList.remove('open'); document.getElementById('dweller-drawer-backdrop').classList.remove('visible'); }

  // ─── CASTLE (horizontal) ─────────────────────────────────
  function renderCastle() {
    const wall = document.getElementById('castle-wall');
    if (!wall) return;
    wall.innerHTML = '';

    // Each floor becomes a vertical column in the horizontal layout
    [3, 2, 1, 0].forEach(floorNum => {
      const col = document.createElement('div');
      col.className = `castle-floor floor-${floorNum}`;

      FLOOR_LAYOUT[floorNum].forEach(roomId => {
        const def    = ROOM_DEFS.find(r => r.id === roomId);
        const level  = Game.getRoomLevel(roomId);
        const locked = level === 0;
        const upg    = Game.getUpgradeProgress(roomId);
        const dwIds  = Game.getRoomDwellers(roomId);

        const cell = document.createElement('div');
        cell.className = 'room-cell' + (locked ? ' locked' : '') + (upg ? ' upgrading' : '');
        cell.dataset.roomId = roomId;

        // Collect badge for production rooms
        let collectBadge = '';
        if (!locked && def.resource) {
          const stored = Game.getRoomStorage(roomId);
          const cap    = (def.storageCap || 999) * level;
          if (stored >= cap * 0.9) collectBadge = `<div class="room-collect-badge" data-collect="${roomId}">COLLECT!</div>`;
          else if (stored > 5)     collectBadge = `<div class="room-collect-badge" style="opacity:.6;animation:none" data-collect="${roomId}">${Math.floor(stored)} ${def.resource}</div>`;
        }

        // Walkers
        const walkersHtml = (!locked && !upg && dwIds.length)
          ? `<div class="room-walkers">${dwIds.map(id => {
              const dw = Game.getDweller(id);
              const injured = dw?.injured;
              return `<span class="walker${injured?' walker-injured':''}" title="${dw?.name||''}">${dw?.emoji||'🧍'}</span>`;
            }).join('')}</div>` : '';

        // Upgrade bar
        const upgHtml = upg
          ? `<div class="room-upgrade-bar"><div class="room-upgrade-fill" style="width:${Math.round(upg.pct*100)}%"></div></div>` : '';

        cell.innerHTML = `
          <div class="room-torch">${locked ? '🔒' : upg ? '🔨' : '🔥'}</div>
          <div class="room-icon">${def.icon}</div>
          <div class="room-name">${def.name}</div>
          <div class="room-meta">${locked ? 'LOCKED' : upg ? `Upgrading… ${upg.remaining}s` : 'Level ' + level}</div>
          ${!locked && def.resource ? `<div class="room-output">+${def.baseRate * level}/min</div>` : ''}
          ${walkersHtml}
          ${collectBadge}
          ${upgHtml}
        `;

        if (!locked) {
          cell.addEventListener('click', e => {
            const badge = e.target.closest('[data-collect]');
            if (badge) { doCollect(badge.dataset.collect); return; }
            openRoomModal(roomId);
          });
          // Drag target
          cell.addEventListener('dragover', e => {
            if (def.maxDwellers > 0 && Game.getRoomDwellers(roomId).length < def.maxDwellers) {
              e.preventDefault(); cell.classList.add('drag-over');
            }
          });
          cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
          cell.addEventListener('drop', e => {
            e.preventDefault(); cell.classList.remove('drag-over');
            const id = e.dataTransfer.getData('dwellerId');
            if (id) { Game.assignDweller(id, roomId); renderCastle(); renderDwellerList(); if (typeof Sync!=='undefined') Sync.save(); }
          });
        }
        col.appendChild(cell);
      });
      wall.appendChild(col);
    });
  }

  function doCollect(roomId) {
    const amount = Game.collectRoom(roomId);
    if (amount > 0) { renderCastle(); renderResources(); if (typeof Sync!=='undefined') Sync.save(); }
  }

  // ─── DWELLER LIST ─────────────────────────────────────────
  function renderDwellerList() {
    const all = Game.getDwellers();
    const c = document.getElementById('dweller-count');
    if (c) c.textContent = `${all.length}/10`;
    const html = all.map(dw => {
      const role  = Game.getDwellerRole(dw.id);
      const stars = '★'.repeat(dw.stars) + '☆'.repeat(5 - dw.stars);
      return `<div class="dweller-card-mini" data-id="${dw.id}" draggable="true">
        <div class="dweller-avatar">${dw.emoji}${dw.injured?'<span style="font-size:.5rem;position:absolute">🩹</span>':''}</div>
        <div class="dweller-mini-info">
          <div class="dweller-mini-name">${dw.name}${dw.injured?' 🩹':''}</div>
          <div class="dweller-mini-sub">${role.icon} ${role.role} · Lv${dw.level||1}</div>
          <div class="dweller-stars">${stars}</div>
        </div>
      </div>`;
    }).join('');
    const el = document.getElementById('dweller-list');
    if (!el) return;
    el.innerHTML = html;
    el.querySelectorAll('.dweller-card-mini').forEach(card => {
      card.addEventListener('click', () => { closeDrawer(); openDwellerModal(card.dataset.id); });
      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('dwellerId', card.dataset.id);
        setTimeout(() => card.classList.add('dragging'), 0);
        closeDrawer();
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });
  }

  // ─── RESOURCES ────────────────────────────────────────────
  function renderResources() {
    const r = Game.getResources();
    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=fmt(v); };
    set('val-gold',r.gold); set('val-food',r.food); set('val-iron',r.iron);
    set('val-shards',(r.shards?.common||0)+(r.shards?.rare||0)+(r.shards?.epic||0)+(r.shards?.legendary||0));
    const cn=document.getElementById('castle-name'); if(cn) cn.textContent=Game.getCastleName();
    syncMapResources();
  }

  // ─── ROOM MODAL — the main interactive popup ──────────────
  function openRoomModal(roomId) {
    const def   = ROOM_DEFS.find(r => r.id === roomId);
    const level = Game.getRoomLevel(roomId);
    const upg   = Game.getUpgradeProgress(roomId);
    const dwIds = Game.getRoomDwellers(roomId);

    // ── Dweller slots ──
    const slotsHtml = def.maxDwellers > 0 ? (() => {
      const rows = Array.from({ length: def.maxDwellers }, (_, i) => {
        const id = dwIds[i];
        if (id) {
          const dw   = Game.getDweller(id);
          const role = Game.getDwellerRole(id);
          const tp   = Game.getTrainingProgress(id);
          const hpPct = Math.round(((dw.hp||dw.stats.hp)/(dw.maxHp||dw.stats.hp))*100);
          const hpFull = hpPct >= 100;
          const progressBar = (roomId === 'training_grounds' && tp)
            ? `<div class="rds-xp-bar"><div class="rds-xp-fill" style="width:${Math.round(tp.pct*100)}%"></div></div>
               <div style="font-size:.62rem;color:var(--text-dim)">${tp.xp}/${tp.needed} XP → Lv${(dw.level||1)+1}</div>`
            : (dw.injured
              ? `<div class="rds-hp-bar"><div class="rds-hp-fill" style="width:${hpPct}%"></div></div>
                 <div style="font-size:.62rem;color:#ff8888">🩹 Healing… ${hpPct}%</div>`
              : (!hpFull
                ? `<div class="rds-hp-bar"><div class="rds-hp-fill ${hpFull?'full':''}" style="width:${hpPct}%"></div></div>`
                : ''));
          return `<div class="room-dweller-slot filled">
            <div class="rds-avatar">${dw.emoji}</div>
            <div class="rds-info">
              <div class="rds-name">${dw.name}</div>
              <div class="rds-sub">${role.icon} ${role.role}  ·  Lv${dw.level||1}</div>
              ${progressBar}
            </div>
            <button class="rds-remove" onclick="UI.doUnassign('${id}','${roomId}')">✕</button>
          </div>`;
        } else {
          const free = Game.getDwellers().filter(d => !d.assignedRoom);
          const opts = free.map(d => `<option value="${d.id}">${d.emoji} ${d.name}</option>`).join('');
          return `<div class="room-dweller-slot" onclick="UI._promptAssign('${roomId}', this)">
            <div class="rds-avatar" style="background:none;border-style:dashed">➕</div>
            <div class="rds-info"><div class="rds-sub empty-slot-hint">Tap or drag dweller here</div></div>
          </div>`;
        }
      });
      return `<div class="modal-sect">
        <div class="modal-sect-title">Dwellers (${dwIds.length}/${def.maxDwellers})</div>
        <div class="room-dweller-slots" id="rds-${roomId}">${rows.join('')}</div>
      </div>`;
    })() : '';

    // ── Upgrade section ──
    const nextCosts = def.upgradeCosts?.[level];
    const canUp     = Game.canUpgrade(roomId);
    const upgradeHtml = nextCosts && !upg ? `
      <div class="modal-sect">
        <div class="modal-sect-title">Upgrade to Level ${level+1}</div>
        <div class="upgrade-box">
          <div style="font-size:.8rem;color:var(--text-dim);margin-bottom:6px">${def.upgradeDesc?.[level]||''}</div>
          <div class="upgrade-cost">
            <span>💰 ${nextCosts.gold} gold</span>
            ${nextCosts.iron ? `<span>⚙️ ${nextCosts.iron} iron</span>` : ''}
            <span style="margin-left:auto;color:var(--text-ghost)">~${level*12}s</span>
          </div>
          <button class="btn-room-action primary" style="width:100%" ${canUp?'':'disabled'} onclick="UI.doUpgrade('${roomId}')">
            ${canUp ? '⬆ Upgrade' : '⬆ Upgrade (not enough resources)'}
          </button>
        </div>
      </div>` : (upg ? `
      <div class="modal-sect">
        <div class="modal-sect-title">Upgrading… ${upg.remaining}s remaining</div>
        <div class="upgrade-timer"><div class="upgrade-timer-fill" style="width:${Math.round(upg.pct*100)}%"></div></div>
        <div class="upgrade-time-label">Level ${level} → ${level+1}</div>
      </div>` : (level >= (def.upgradeCosts?.length-1||4) ? `
      <div class="modal-sect"><p style="font-size:.82rem;color:var(--gold);text-align:center">✦ Max Level</p></div>` : ''));

    // ── Room-specific action ──
    let actionHtml = '';
    if (roomId === 'treasury' || roomId === 'kitchen') {
      const stored = Game.getRoomStorage(roomId);
      const cap    = (def.storageCap||999) * level;
      const pct    = Math.min(100, Math.round((stored/cap)*100));
      actionHtml = `<div class="modal-sect">
        <div class="modal-sect-title">Production Storage</div>
        <div style="display:flex;justify-content:space-between;font-size:.82rem;color:var(--text-dim);margin-bottom:6px">
          <span>${Math.floor(stored)} / ${cap} ${def.resource}</span><span>${pct}% full</span>
        </div>
        <div class="upgrade-timer"><div class="upgrade-timer-fill" style="width:${pct}%;background:linear-gradient(90deg,#2a6a18,#5acc28)"></div></div>
        <button class="btn-room-action collect" style="width:100%;margin-top:10px" onclick="UI.doCollect('${roomId}');UI.closeModal()">
          💰 Collect ${Math.floor(stored)} ${def.resource}
        </button>
      </div>`;
    }
    if (roomId === 'barracks') {
      const party = Game.getBattleParty();
      actionHtml = `<div class="modal-sect">
        <div class="modal-sect-title">Battle Party (${party.length} fighters)</div>
        <p style="font-size:.8rem;color:var(--text-dim);margin-bottom:8px">Assign fighters here, then use the Map to battle. Equip weapons to set their role.</p>
        ${party.length ? '<button class="btn-room-action primary" onclick="UI.closeModal();UI.showScreen(\'map\')">⚔️ Go to Battle Map</button>' : '<p style="font-size:.78rem;color:var(--text-ghost);font-style:italic">No fighters assigned — drag dwellers with weapons here</p>'}
      </div>`;
    }
    if (roomId === 'workshop') {
      actionHtml = `<div class="modal-sect">
        <div class="modal-sect-title">Workshop Actions</div>
        <div class="room-actions">
          <button class="btn-room-action" onclick="UI.openInventory()">🎒 Inventory</button>
          <button class="btn-room-action danger" onclick="UI.closeModal();UI.openInventory()">🔨 Dismantle</button>
        </div>
        <p style="font-size:.75rem;color:var(--text-dim);margin-top:8px">Break unwanted items for Shards. Spend Shards to craft better gear.</p>
      </div>`;
    }
    if (roomId === 'hospital') {
      const hospLevel  = Game.getRoomLevel('hospital');
      const hpPerMin   = (ROOM_DEFS.find(r=>r.id==='hospital').healHpPerMin||15) * (1+(hospLevel-1)*0.6);
      const injured    = Game.getDwellers().filter(d => d.injured);
      actionHtml = `<div class="modal-sect">
        <div class="modal-sect-title">Auto-Heal Status</div>
        <p style="font-size:.82rem;color:var(--text-dim);margin-bottom:6px">Healing rate: <strong style="color:var(--text-bright)">${Math.round(hpPerMin)} HP/min</strong> · Upgrade to heal faster & treat more fighters at once.</p>
        ${injured.length
          ? injured.map(dw => { const hpPct=Math.round((dw.hp/dw.maxHp)*100); return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:1rem">${dw.emoji}</span><div style="flex:1"><div style="font-size:.82rem;color:var(--text-bright)">${dw.name} — ${dw.hp}/${dw.maxHp} HP</div><div class="rds-hp-bar"><div class="rds-hp-fill" style="width:${hpPct}%"></div></div></div></div>`; }).join('')
          : '<p style="font-size:.78rem;color:var(--text-ghost);font-style:italic">No injured fighters 🏥</p>'}
      </div>`;
    }
    if (roomId === 'living_quarters') {
      const males   = Game.getDwellers().filter(d=>d.gender==='male'&&!d.assignedRoom);
      const females = Game.getDwellers().filter(d=>d.gender==='female'&&!d.assignedRoom);
      actionHtml = `<div class="modal-sect">
        <div class="modal-sect-title">Breeding</div>
        <p style="font-size:.82rem;color:var(--text-dim);margin-bottom:8px">Assign a male + female dweller. After a timer, a baby will be born and grow into an adult.</p>
        <p style="font-size:.78rem;color:var(--text-ghost);font-style:italic">Coming soon — assign dwellers to begin</p>
      </div>`;
    }

    openModal(`
      <div class="modal-title">${def.icon} ${def.name}</div>
      <div class="modal-sub">Level ${level}${upg ? ' · Upgrading…' : ''}</div>
      <div class="modal-sect">
        <p style="font-size:.86rem;color:var(--text-dim);line-height:1.6">${def.description}</p>
      </div>
      ${actionHtml}
      ${slotsHtml}
      ${upgradeHtml}
    `);
  }

  function _promptAssign(roomId, slotEl) {
    const free = Game.getDwellers().filter(d => !d.assignedRoom);
    if (!free.length) return;
    const sel = document.createElement('select');
    sel.innerHTML = '<option value="">— choose —</option>' + free.map(d => `<option value="${d.id}">${d.emoji} ${d.name}</option>`).join('');
    sel.style.cssText = 'position:absolute;z-index:999;background:var(--bg-mid);color:var(--text-bright);border:1px solid var(--gold-dim);border-radius:3px;padding:6px;font-family:Crimson Text,serif';
    slotEl.style.position = 'relative';
    slotEl.appendChild(sel);
    sel.focus();
    sel.addEventListener('change', () => {
      if (sel.value) { Game.assignDweller(sel.value, roomId); openRoomModal(roomId); renderCastle(); renderDwellerList(); if(typeof Sync!=='undefined')Sync.save(); }
      sel.remove();
    });
    sel.addEventListener('blur', () => setTimeout(() => sel.remove(), 200));
  }

  function doUpgrade(roomId) {
    if (Game.upgradeRoom(roomId)) {
      openRoomModal(roomId); renderCastle();
      if (typeof Sync !== 'undefined') Sync.save();
    }
  }

  function doUnassign(dwellerId, roomId) {
    Game.unassignDweller(dwellerId);
    openRoomModal(roomId); renderDwellerList(); renderCastle();
    if (typeof Sync !== 'undefined') Sync.save();
  }

  function doCollect(roomId) {
    const amount = Game.collectRoom(roomId);
    if (amount > 0) { renderCastle(); renderResources(); if(typeof Sync!=='undefined')Sync.save(); }
  }

  // ─── DWELLER MODAL ────────────────────────────────────────
  function openDwellerModal(dwellerId) {
    const dw = Game.getDweller(dwellerId); if (!dw) return;
    const stats = Game.getDwellerStats(dwellerId);
    const role  = Game.getDwellerRole(dwellerId);
    const stars = '★'.repeat(dw.stars) + '☆'.repeat(5-dw.stars);
    const tp    = Game.getTrainingProgress(dwellerId);
    const roleCls = 'role-' + role.role.toLowerCase();
    const statsHtml = Object.keys(STAT_DEFS).map(k => `
      <div class="stat-box"><div class="stat-lbl">${STAT_DEFS[k].icon} ${STAT_DEFS[k].label}</div>
      <div class="stat-val">${stats?.[k]??0}</div></div>`).join('');
    const slotsHtml = EQUIP_SLOTS.map(slot => {
      const item = Game.getEquippedItem(dwellerId, slot.id);
      const rarCls = item ? ' filled r-' + item.rarity : '';
      return `<div class="equip-slot${rarCls}" onclick="UI.openEquipPicker('${dwellerId}','${slot.id}')">
        <div class="eslot-icon">${slot.icon}</div>
        ${item ? `<div class="eslot-name" style="color:${RARITIES[item.rarity].color}">${item.name}</div>` : `<div class="eslot-lbl">${slot.label}</div>`}
      </div>`;
    }).join('');
    const xpBar = tp ? `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-dim);margin-bottom:4px"><span>XP Progress</span><span>${tp.xp}/${tp.needed} → Lv${(dw.level||1)+1}</span></div><div class="rds-xp-bar" style="height:6px"><div class="rds-xp-fill" style="width:${Math.round(tp.pct*100)}%"></div></div></div>` : `<div style="margin-top:8px;font-size:.75rem;color:var(--gold)">✦ Max Level</div>`;
    openModal(`
      <div class="dw-header">
        <div class="dw-avatar-lg">${dw.emoji}</div>
        <div class="dw-header-info">
          <h3>${dw.name}${dw.injured?' 🩹':''}</h3>
          <div class="dw-stars">${stars} · Lv ${dw.level||1}</div>
          <div class="role-badge ${roleCls}">${role.icon} ${role.role}</div>
          ${xpBar}
        </div>
      </div>
      <div class="modal-sect"><div class="modal-sect-title">Stats</div><div class="stats-grid">${statsHtml}</div></div>
      <div class="modal-sect"><div class="modal-sect-title">Equipment — tap to change</div><div class="equip-grid">${slotsHtml}</div></div>
    `);
  }

  // ─── EQUIP PICKER ─────────────────────────────────────────
  function openEquipPicker(dwellerId, slot) {
    const dw = Game.getDweller(dwellerId);
    const current = Game.getEquippedItem(dwellerId, slot);
    const pool    = Game.getInventory().filter(i => i.slot === slot);
    const cards   = pool.map(item => {
      const r = RARITIES[item.rarity], eq = current?.id === item.id;
      return `<div class="item-card ${eq?'equipped':''}" onclick="UI.doEquip('${dwellerId}','${item.id}')" style="border-color:${r.color}">
        <div class="item-card-left"><h4 style="color:${r.color}">${item.name}</h4>
        <div class="item-stats">${Object.entries(item.stats).map(([k,v])=>`${STAT_DEFS[k]?.icon||k} +${v}`).join('  ')}</div></div>
        <span class="item-rarity-badge" style="color:${r.color};border:1px solid ${r.color}">${r.label}${eq?' ✓':''}</span>
      </div>`;
    }).join('');
    openModal(`
      <div class="modal-title">Choose ${slot.replace(/\d+/,'')}</div>
      <div class="modal-sub">For ${dw?.name}</div>
      ${current?`<button class="btn-secondary" onclick="UI.doUnequip('${dwellerId}','${slot}')" style="width:100%;margin-bottom:12px">Remove: ${current.name}</button>`:''}
      ${cards||'<p style="color:var(--text-ghost);font-style:italic;font-size:.85rem">No items for this slot</p>'}`);
  }
  function doEquip(dwellerId, itemId) {
    Game.equipItem(dwellerId, itemId);
    openDwellerModal(dwellerId); renderDwellerList(); renderCastle();
    if (typeof Sync!=='undefined') Sync.save();
  }
  function doUnequip(dwellerId, slot) {
    Game.unequipItem(dwellerId, slot); openDwellerModal(dwellerId);
    if (typeof Sync!=='undefined') Sync.save();
  }

  // ─── INVENTORY ────────────────────────────────────────────
  function openInventory() {
    const items = Game.getInventory();
    const grid  = items.map(item => {
      const r = RARITIES[item.rarity];
      const dismantleRes = RARITIES[item.rarity]?.shards;
      return `<div class="inv-item" style="border-color:${r.color}" onclick="UI.openItemDetail('${item.id}')">
        <div class="inv-icon">${item.slot==='weapon'?'⚔️':item.slot==='armor'?'🛡️':item.slot==='ring'?'💍':'🔮'}</div>
        <div class="inv-name" style="color:${r.color}">${item.name}</div>
        <div style="font-size:.58rem;color:var(--text-ghost)">${item.slot}</div>
      </div>`;
    }).join('');
    openModal(`<div class="modal-title">🎒 Inventory</div><div class="modal-sub">${items.length} items</div>
      <div class="inventory-grid">${grid||'<p style="color:var(--text-ghost);font-style:italic">Empty</p>'}</div>
      <p style="font-size:.75rem;color:var(--text-dim);margin-top:12px;text-align:center">Tap an item to equip or dismantle</p>`);
  }

  function openItemDetail(itemId) {
    const item = Game.getInventory().find(i => i.id === itemId);
    if (!item) return;
    const r = RARITIES[item.rarity];
    const statStr = Object.entries(item.stats).map(([k,v]) => `${STAT_DEFS[k]?.icon||k} +${Math.round(v * r.mult)} (${v} base)`).join('<br>');
    const equippedBy = Game.getDwellers().find(d => Object.values(d.equipment).includes(itemId));
    openModal(`
      <div class="modal-title" style="color:${r.color}">${item.name}</div>
      <div class="modal-sub">${r.label} ${item.slot}${item.weaponType?' · '+item.weaponType+' ('+( WEAPON_ROLES[item.weaponType]?.role||'')+')'  :''}</div>
      <div class="modal-sect"><div class="modal-sect-title">Stats</div><p style="font-size:.85rem;color:var(--text-main);line-height:1.8">${statStr}</p></div>
      ${equippedBy ? `<p style="font-size:.8rem;color:var(--text-dim);margin-bottom:10px">Equipped by: <strong>${equippedBy.emoji} ${equippedBy.name}</strong></p>` : ''}
      <div class="room-actions">
        ${Game.getDwellers().filter(d=>!d.injured).map(d=>`<button class="btn-room-action" onclick="UI.doEquip('${d.id}','${itemId}')">Equip ${d.emoji} ${d.name}</button>`).join('')}
        ${!equippedBy ? `<button class="btn-room-action danger" onclick="UI._dismantle('${itemId}')">🔨 Dismantle (+${RARITIES[item.rarity].shards} shards)</button>` : ''}
      </div>`);
  }

  function _dismantle(itemId) {
    const result = Game.dismantleItem(itemId);
    if (result) { openInventory(); renderResources(); if(typeof Sync!=='undefined')Sync.save(); }
  }

  // ─── ROADMAP ──────────────────────────────────────────────
  function renderRoadmap() {
    const rm = document.getElementById('roadmap');
    if (!rm) return;
    const progress = Game.getState().mapProgress || 1;
    rm.innerHTML = '';
    let lastRegion = null;
    MAP_STAGES.forEach((stage, idx) => {
      const row   = document.createElement('div');
      const side  = idx%3===0?'left':idx%3===1?'mid':'right';
      row.className = 'stage-row ' + side;
      const cleared = stage.id < progress, current = stage.id === progress, locked = stage.id > progress;
      const stateCls = cleared?'cleared':current?'current':'locked';
      row.innerHTML = `<div class="road-link"></div>
        <div class="stage-cell">
          <div class="stage-node ${stateCls}" data-stage="${stage.id}">
            <div class="sn-num">${stage.id}</div><div class="sn-boss">${stage.boss}</div>
          </div>
          <div class="stage-label">${stage.name}</div>
        </div>`;
      if (!locked) row.querySelector('.stage-node').addEventListener('click', () => openStageModal(stage.id));
      rm.appendChild(row);
      if (stage.region !== lastRegion) {
        const banner = document.createElement('div');
        banner.className = 'region-banner';
        banner.style.color = REGION_COLORS[stage.region] || 'var(--text-dim)';
        banner.textContent = stage.region;
        rm.appendChild(banner);
        lastRegion = stage.region;
      }
    });
  }

  // ─── STAGE BATTLE ─────────────────────────────────────────
  let _activeStage = null, _activeEnemies = [];

  function buildStageEnemies(stage) {
    const names=['Grimbold','Vexar','Thornwick','Draven','Kael','Seraphia','Morwen','Skarn'];
    const emojis=['🧙','👹','💀','🧟','👺','🤺','🗡️','🧛'];
    const weapons=['sword','bow','staff','daggers'];
    const d=stage.diff;
    return Array.from({length:stage.enemyCount},(_,i)=>({
      id:'enemy_'+i,
      name:i===stage.enemyCount-1?stage.name+' Boss':names[Math.floor(Math.random()*names.length)],
      emoji:i===stage.enemyCount-1?stage.boss:emojis[Math.floor(Math.random()*emojis.length)],
      weapon:weapons[Math.floor(Math.random()*weapons.length)],
      stats:{atk:Math.round((9+Math.random()*6)*d),def:Math.round((5+Math.random()*4)*d),mdef:Math.round((3+Math.random()*4)*d),hp:Math.round((55+Math.random()*30)*d),crit:5+Math.floor(Math.random()*8),dodge:3+Math.floor(Math.random()*6),spd:7+Math.floor(Math.random()*7)},
    }));
  }

  function openStageModal(stageId) {
    const stage = MAP_STAGES.find(s => s.id === stageId);
    if (!stage) return;
    _activeStage = stage; _activeEnemies = buildStageEnemies(stage);
    const partyIds = Game.getBattleParty();
    const yourCards = partyIds.length
      ? partyIds.map(id => { const dw=Game.getDweller(id),stats=Game.getDwellerStats(id),role=Game.getDwellerRole(id);
          return `<div class="battle-fighter-card"><div class="bfc-avatar">${dw.emoji}</div><div style="flex:1"><div class="bfc-name">${dw.name}</div><div class="bfc-role">${role.icon} ${role.role} · ❤️${stats.hp} ⚔️${stats.atk}</div><div class="hp-bar-wrap"><div class="hp-bar" style="width:100%"></div></div></div></div>`; }).join('')
      : `<div class="party-empty">No fighters in Barracks!<br><a onclick="UI.closeModal();UI.showScreen('castle')">Assign fighters →</a></div>`;
    const enemyCards = _activeEnemies.map(e=>{const role=WEAPON_ROLES[e.weapon]||WEAPON_ROLES.none;
      return `<div class="battle-fighter-card enemy"><div class="bfc-avatar">${e.emoji}</div><div style="flex:1;text-align:right"><div class="bfc-name">${e.name}</div><div class="bfc-role">${role.icon} ${role.role} · ❤️${e.stats.hp} ⚔️${e.stats.atk}</div><div class="hp-bar-wrap"><div class="hp-bar" style="width:100%"></div></div></div></div>`;}).join('');
    openModal(`
      <div class="modal-title">${stage.boss} ${stage.name}</div>
      <div class="modal-sub">${stage.region} · Stage ${stage.id}</div>
      <div class="battle-arena">
        <div class="party-panel"><h3>Your Party (${partyIds.length})</h3>${yourCards}</div>
        <div class="vs-divider"><div class="vs-line"></div><div class="vs-text">VS</div><div class="vs-line"></div></div>
        <div class="party-panel"><h3>Enemies</h3>${enemyCards}</div>
      </div>
      <div id="battle-log-area"></div>
      <button class="btn-battle" id="btn-fight" ${!partyIds.length?'disabled':''}>⚔ Begin Battle</button>`);
    document.getElementById('btn-fight')?.addEventListener('click', runStageBattle);
  }

  function runStageBattle() {
    const partyIds = Game.getBattleParty();
    if (!partyIds.length) return;
    const result = Battle.calculate(partyIds, _activeEnemies, _activeStage?.id||1);
    playBattleLog(result);
  }

  function playBattleLog(result) {
    const area = document.getElementById('battle-log-area');
    if (!area) return;
    area.innerHTML = `<div class="battle-log-wrap" id="battle-log"></div>`;
    const log=document.getElementById('battle-log'), events=result.log;
    let i=0, lastRound=0;
    const fightBtn=document.getElementById('btn-fight');
    if(fightBtn) fightBtn.disabled=true;
    function step() {
      if (i >= events.length) {
        const won = result.winner==='attacker';
        addLine(log,`— ${won?'🏆 VICTORY':'💀 DEFEAT'} —`,won?'result win':'result loss');
        const s = Game.getState();
        if (won) {
          const loot=result.loot;
          if(loot){s.resources.gold+=loot.gold;s.resources.food+=loot.food;s.resources.iron+=(loot.iron||0);if(loot.items?.length)Game.addItems(loot.items);}
          s.wins=(s.wins||0)+1;
          if(_activeStage&&_activeStage.id===(s.mapProgress||1))s.mapProgress=Math.min(_activeStage.id+1,MAP_STAGES.length);
          renderResources(); renderDwellerList();
          if(typeof Sync!=='undefined')Sync.save();
          showChestReveal(loot);
        } else {
          // Mark fighters as injured
          Game.getBattleParty().forEach(id=>{const dw=Game.getDweller(id);if(dw&&!result.survivors?.attackers?.includes(id)){dw.injured=true;dw.hp=Math.floor((dw.maxHp||dw.stats.hp)*0.3);}});
          const lossGold=Math.min(s.resources.gold,15);
          s.resources.gold-=lossGold;
          addLine(log,`💰 -${lossGold} Gold lost`,'loss');
          addLine(log,`🩹 Injured fighters are auto-healing in the Hospital`,'loot');
          renderResources(); renderDwellerList(); renderCastle();
          if(typeof Sync!=='undefined')Sync.save();
          if(fightBtn){fightBtn.textContent='↺ Try Again';fightBtn.disabled=false;fightBtn.onclick=()=>openStageModal(_activeStage.id);}
        }
        return;
      }
      const ev=events[i++];
      if(ev.round!==lastRound){lastRound=ev.round;addLine(log,`Round ${ev.round}`,'round');}
      if(ev.type==='dodge')    addLine(log,`↩ ${ev.targetName} dodged ${ev.attackerName}`,'dodge');
      else if(ev.type==='crit')addLine(log,`💥 ${ev.attackerName} CRITS ${ev.targetName} for ${ev.damage}! (${ev.targetHp}/${ev.targetMaxHp})`,'crit');
      else                     addLine(log,`⚔ ${ev.attackerName} hits ${ev.targetName} for ${ev.damage} (${ev.targetHp}/${ev.targetMaxHp})`,'');
      if(ev.targetHp<=0)addLine(log,`☠ ${ev.targetName} has fallen`,'death');
      log.scrollTop=log.scrollHeight;
      setTimeout(step,90);
    }
    step();
  }

  function addLine(c,t,cls){const d=document.createElement('div');d.className='log-line'+(cls?' '+cls:'');d.textContent=t;c.appendChild(d);}

  function showChestReveal(loot) {
    const nextUnlocked = _activeStage && _activeStage.id < MAP_STAGES.length;
    const itemsHtml = loot?.items?.length
      ? loot.items.map(it=>{const r=RARITIES[it.rarity];const ss=Object.entries(it.stats).map(([k,v])=>`${STAT_DEFS[k]?.icon||k} +${v}`).join('  ');
          return `<div class="loot-item r-${it.rarity}" style="border-color:${r.color}"><div class="loot-item-icon">${it.slot==='weapon'?'⚔️':it.slot==='armor'?'🛡️':it.slot==='ring'?'💍':'🔮'}</div><div><div class="loot-item-name" style="color:${r.color}">${it.name}</div><div class="loot-item-rarity" style="color:${r.color}">${r.label}</div><div class="loot-item-stats">${ss}</div></div></div>`;}).join('')
      : '<p style="color:var(--text-dim);font-style:italic;font-size:.85rem;text-align:center">Resources only this time</p>';
    openModal(`<div class="chest-reveal">
      <div class="chest-icon">🎁</div>
      <div class="modal-title" style="text-align:center">Victory Spoils!</div>
      <div class="loot-resources"><span>💰 +${loot?.gold||0}</span><span>🍖 +${loot?.food||0}</span>${loot?.iron?`<span>⚙️ +${loot.iron}</span>`:''}</div>
      <div class="modal-sect-title" style="margin-top:14px">Items Looted</div>
      <div class="loot-items">${itemsHtml}</div>
      ${nextUnlocked?'<div class="loot-unlock">🗺️ Next stage unlocked!</div>':''}
      <button class="btn-primary" style="width:100%;margin-top:16px" onclick="UI.closeModal();UI.renderRoadmap()">Continue</button>
    </div>`);
  }

  // ─── RANKS PANEL ──────────────────────────────────────────
  function renderRanksPanel() {
    const panel=document.getElementById('ranks-panel'); if(!panel)return;
    const wins=Game.getState().wins||0, score=(wins*120)+(Game.getDwellers().length*50)+((Game.getState().mapProgress||1)*80);
    const user=Auth.getUser(), myName=user?(user.email?.split('@')[0]||'You'):'You (Guest)';
    const tier=score>4000?'Champion':score>2000?'Knight':score>800?'Soldier':'Recruit';
    const fakes=[{name:'Thorvald the Grim',emoji:'🧔',wins:47,score:5820,tier:'Champion'},{name:'Lady Seraphine',emoji:'👸',wins:38,score:4690,tier:'Champion'},{name:'Iron Duke Raven',emoji:'🤺',wins:31,score:3870,tier:'Knight'},{name:'Morgath Stonehide',emoji:'👹',wins:27,score:3340,tier:'Knight'},{name:'Elara the Swift',emoji:'🧝',wins:19,score:2420,tier:'Soldier'},{name:'Dunwick the Bold',emoji:'⚔️',wins:14,score:1760,tier:'Soldier'}];
    const all=[...fakes,{name:myName,emoji:'🏰',wins,score,tier,you:true}].sort((a,b)=>b.score-a.score);
    const myRank=all.findIndex(r=>r.you)+1;
    panel.innerHTML=`<div class="ranks-header">🏆 Hall of Lords</div><div class="ranks-sub">Global Leaderboard</div>
      <div class="your-stats-box">
        <div class="ys-item"><div class="ys-val">#${myRank}</div><div class="ys-lbl">Rank</div></div>
        <div class="ys-item"><div class="ys-val">${wins}</div><div class="ys-lbl">Wins</div></div>
        <div class="ys-item"><div class="ys-val">${Game.getDwellers().length}</div><div class="ys-lbl">Dwellers</div></div>
        <div class="ys-item"><div class="ys-val">${score.toLocaleString()}</div><div class="ys-lbl">Score</div></div>
      </div><div class="rank-tier-label">All Kingdoms</div>
      ${all.map((row,idx)=>{const pos=idx+1,posCls=pos===1?'top1':pos===2?'top2':pos===3?'top3':'',posStr=pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':`#${pos}`;
        return `<div class="rank-row ${row.you?'you':''}"><div class="rank-pos ${posCls}">${posStr}</div><div class="rank-avatar-sm">${row.emoji}</div><div class="rank-info"><div class="rank-name">${row.name}${row.you?' (You)':''}</div><div class="rank-meta">${row.tier} · ${row.wins} wins</div></div><div class="rank-score">${row.score.toLocaleString()}</div></div>`;}).join('')}`;
  }

  // ─── MODAL ────────────────────────────────────────────────
  function openModal(html){document.getElementById('modal-content').innerHTML=html;document.getElementById('modal-overlay').classList.remove('hidden');}
  function closeModal(){document.getElementById('modal-overlay').classList.add('hidden');}

  // ─── FULL RENDER ──────────────────────────────────────────
  function renderAll() {
    renderCastle(); renderDwellerList(); renderResources();
    const vd=document.getElementById('ver-display'); if(vd)vd.textContent=APP_VERSION;
  }
  function fmt(n){if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return Math.floor(n||0).toString();}

  return {
    renderAll, renderCastle, renderDwellerList, renderResources,
    showScreen, switchMapTab, syncMapResources, renderRoadmap, renderRanksPanel,
    openModal, closeModal, openDrawer, closeDrawer,
    openRoomModal, openDwellerModal, openEquipPicker, openInventory, openItemDetail,
    openStageModal, showChestReveal,
    doAssign:_promptAssign, doUnassign, doCollect, doEquip, doUnequip, doUpgrade,
    _promptAssign, _dismantle, fmt,
  };
})();
