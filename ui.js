// ui.js — DOM rendering for Ironhold v1.4.0

const UI = (() => {

  // ─── SCREEN NAV ──────────────────────────────────────────
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (name === 'castle') {
      document.getElementById('game-screen').classList.add('active');
    }
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
    document.querySelectorAll('.map-gold').forEach(e => e.textContent = fmt(r.gold));
    document.querySelectorAll('.map-food').forEach(e => e.textContent = fmt(r.food));
  }

  // ─── DRAWER ──────────────────────────────────────────────
  function openDrawer() {
    document.getElementById('dweller-drawer').classList.add('open');
    document.getElementById('dweller-drawer-backdrop').classList.add('visible');
  }
  function closeDrawer() {
    document.getElementById('dweller-drawer').classList.remove('open');
    document.getElementById('dweller-drawer-backdrop').classList.remove('visible');
  }

  // ─── CASTLE RENDER ───────────────────────────────────────
  function renderCastle() {
    const wall = document.getElementById('castle-wall');
    if (!wall) return;
    wall.innerHTML = '';

    [3, 2, 1, 0].forEach(floorNum => {
      const floor = document.createElement('div');
      floor.className = 'castle-floor';
      floor.style.gridTemplateColumns = FLOOR_GRID[floorNum];

      FLOOR_LAYOUT[floorNum].forEach(roomId => {
        const def    = ROOM_DEFS.find(r => r.id === roomId);
        const level  = Game.getRoomLevel(roomId);
        const locked = level === 0;
        const dwIds  = Game.getRoomDwellers(roomId);

        const cell = document.createElement('div');
        cell.className = 'room-cell' + (locked ? ' locked' : '');
        cell.dataset.roomId = roomId;

        const walkersHtml = (!locked && dwIds.length)
          ? `<div class="room-walkers">${dwIds.map(id => {
              const dw = Game.getDweller(id);
              return `<span class="walker" title="${dw?.name||''}">${dw?.emoji||'🧍'}</span>`;
            }).join('')}</div>` : '';

        const rateHtml = (def.resource && !locked)
          ? `<div class="room-output">+${def.baseRate * level}/min ${def.resource}</div>` : '';

        cell.innerHTML = `
          <div class="room-torch">${locked ? '🔒' : '🔥'}</div>
          <div class="room-icon">${def.icon}</div>
          <div class="room-name">${def.name}</div>
          <div class="room-meta">${locked ? 'LOCKED' : 'Level ' + level}</div>
          ${rateHtml}
          ${walkersHtml}
          <div class="room-floor-line"></div>
        `;

        if (!locked) {
          cell.addEventListener('click', () => openRoomModal(roomId));
          cell.addEventListener('dragover', e => {
            if (def.maxDwellers > 0 && Game.getRoomDwellers(roomId).length < def.maxDwellers) {
              e.preventDefault(); cell.classList.add('drag-over');
            }
          });
          cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
          cell.addEventListener('drop', e => {
            e.preventDefault(); cell.classList.remove('drag-over');
            const dwId = e.dataTransfer.getData('dwellerId');
            if (dwId) { Game.assignDweller(dwId, roomId); renderCastle(); renderDwellerList(); }
          });
        }
        floor.appendChild(cell);
      });
      wall.appendChild(floor);
    });
  }

  // ─── DWELLER LIST ────────────────────────────────────────
  function renderDwellerList() {
    const all   = Game.getDwellers();
    const count = `${all.length}/10`;
    const c1 = document.getElementById('dweller-count');
    if (c1) c1.textContent = count;

    const html = all.map(dw => {
      const role  = Game.getDwellerRole(dw.id);
      const stars = '★'.repeat(dw.stars) + '☆'.repeat(5 - dw.stars);
      return `
        <div class="dweller-card-mini" data-id="${dw.id}" draggable="true">
          <div class="dweller-avatar">${dw.emoji}</div>
          <div class="dweller-mini-info">
            <div class="dweller-mini-name">${dw.name}</div>
            <div class="dweller-mini-sub">${role.icon} ${role.role}${dw.injured ? ' 🤕' : ''}</div>
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

  // ─── RESOURCES ───────────────────────────────────────────
  function renderResources() {
    const r = Game.getResources();
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = fmt(v); };
    set('val-gold', r.gold); set('val-food', r.food); set('val-iron', r.iron);
    set('val-shards', (r.shards?.common||0)+(r.shards?.rare||0)+(r.shards?.epic||0)+(r.shards?.legendary||0));
    const cn = document.getElementById('castle-name');
    if (cn) cn.textContent = Game.getCastleName();
    syncMapResources();
  }

  // ─── ROADMAP ─────────────────────────────────────────────
  function renderRoadmap() {
    const rm = document.getElementById('roadmap');
    if (!rm) return;
    const progress = Game.getState().mapProgress || 1; // highest UNLOCKED stage
    rm.innerHTML = '';

    let lastRegion = null;
    MAP_STAGES.forEach((stage, idx) => {
      // Region banner (since column-reverse, insert before node so it appears above)
      const row = document.createElement('div');
      const side = idx % 3 === 0 ? 'left' : idx % 3 === 1 ? 'mid' : 'right';
      row.className = 'stage-row ' + side;

      const cleared = stage.id < progress;
      const current = stage.id === progress;
      const locked  = stage.id > progress;
      const stateCls = cleared ? 'cleared' : current ? 'current' : 'locked';

      row.innerHTML = `
        <div class="road-link"></div>
        <div class="stage-cell">
          <div class="stage-node ${stateCls}" data-stage="${stage.id}">
            <div class="sn-num">${stage.id}</div>
            <div class="sn-boss">${stage.boss}</div>
          </div>
          <div class="stage-label">${stage.name}</div>
        </div>`;

      if (!locked) {
        row.querySelector('.stage-node').addEventListener('click', () => openStageModal(stage.id));
      }
      rm.appendChild(row);

      // Region banner after (above in reverse)
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

  // ─── ENEMY GENERATION FOR A STAGE ────────────────────────
  function buildStageEnemies(stage) {
    const names   = ['Grimbold','Vexar','Thornwick','Draven','Kael','Seraphia','Morwen','Skarn'];
    const emojis  = ['🧙','👹','💀','🧟','👺','🤺','🗡️','🧛'];
    const weapons = ['sword','bow','staff','daggers'];
    const d = stage.diff;
    return Array.from({ length: stage.enemyCount }, (_, i) => ({
      id: 'enemy_' + i,
      name: i === stage.enemyCount - 1 ? stage.name + ' Boss' : names[Math.floor(Math.random()*names.length)],
      emoji: i === stage.enemyCount - 1 ? stage.boss : emojis[Math.floor(Math.random()*emojis.length)],
      weapon: weapons[Math.floor(Math.random()*weapons.length)],
      stats: {
        atk:  Math.round((9 + Math.random()*6)  * d),
        def:  Math.round((5 + Math.random()*4)  * d),
        mdef: Math.round((3 + Math.random()*4)  * d),
        hp:   Math.round((55 + Math.random()*30)* d),
        crit: 5 + Math.floor(Math.random()*8),
        dodge:3 + Math.floor(Math.random()*6),
        spd:  7 + Math.floor(Math.random()*7),
      }
    }));
  }

  // ─── STAGE / BATTLE MODAL ────────────────────────────────
  let _activeStage = null;
  let _activeEnemies = [];

  function openStageModal(stageId) {
    const stage = MAP_STAGES.find(s => s.id === stageId);
    if (!stage) return;
    _activeStage = stage;
    _activeEnemies = buildStageEnemies(stage);
    const partyIds = Game.getBattleParty();

    const yourCards = partyIds.length
      ? partyIds.map(id => {
          const dw = Game.getDweller(id), stats = Game.getDwellerStats(id), role = Game.getDwellerRole(id);
          return `<div class="battle-fighter-card">
            <div class="bfc-avatar">${dw.emoji}</div>
            <div style="flex:1"><div class="bfc-name">${dw.name}</div>
            <div class="bfc-role">${role.icon} ${role.role} · ❤️${stats.hp} ⚔️${stats.atk}</div>
            <div class="hp-bar-wrap"><div class="hp-bar" style="width:100%"></div></div></div>
          </div>`;
        }).join('')
      : `<div class="party-empty">No fighters in Barracks!<br>
          <a onclick="UI.closeModal();UI.showScreen('castle')">Equip a weapon & assign to Barracks →</a></div>`;

    const enemyCards = _activeEnemies.map(e => {
      const role = WEAPON_ROLES[e.weapon] || WEAPON_ROLES.none;
      return `<div class="battle-fighter-card enemy">
        <div class="bfc-avatar">${e.emoji}</div>
        <div style="flex:1;text-align:right"><div class="bfc-name">${e.name}</div>
        <div class="bfc-role">${role.icon} ${role.role} · ❤️${e.stats.hp} ⚔️${e.stats.atk}</div>
        <div class="hp-bar-wrap"><div class="hp-bar" style="width:100%"></div></div></div>
      </div>`;
    }).join('');

    openModal(`
      <div class="modal-title">${stage.boss} ${stage.name}</div>
      <div class="modal-sub">${stage.region} · Stage ${stage.id}</div>
      <div class="battle-modal-arena">
        <div class="battle-arena">
          <div class="party-panel"><h3>Your Party (${partyIds.length})</h3>${yourCards}</div>
          <div class="vs-divider"><div class="vs-line"></div><div class="vs-text">VS</div><div class="vs-line"></div></div>
          <div class="party-panel"><h3>Enemies</h3>${enemyCards}</div>
        </div>
      </div>
      <div id="battle-log-area"></div>
      <button class="btn-battle" id="btn-fight" ${!partyIds.length ? 'disabled' : ''} style="width:100%">⚔ Begin Battle</button>
    `);

    document.getElementById('btn-fight')?.addEventListener('click', runStageBattle);
  }

  function runStageBattle() {
    const partyIds = Game.getBattleParty();
    if (!partyIds.length) return;
    const result = Battle.calculate(partyIds, _activeEnemies, _activeStage ? _activeStage.id : 1);
    playBattleLog(result);
  }

  function playBattleLog(result) {
    const area = document.getElementById('battle-log-area');
    if (!area) return;
    area.innerHTML = `<div class="battle-log-wrap" id="battle-log"></div>`;
    const log = document.getElementById('battle-log');
    const events = result.log;
    let i = 0, lastRound = 0;
    const fightBtn = document.getElementById('btn-fight');
    if (fightBtn) fightBtn.disabled = true;

    function step() {
      if (i >= events.length) {
        const won = result.winner === 'attacker';
        addLine(log, `— ${won ? '🏆 VICTORY' : '💀 DEFEAT'} —`, won ? 'result win' : 'result loss');
        const s = Game.getState();
        if (won) {
          const loot = result.loot;
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
          renderResources(); renderDwellerList();
          if (typeof Sync !== 'undefined') Sync.save();
          showChestReveal(loot);
        } else {
          const lossGold = Math.min(s.resources.gold, 15);
          s.resources.gold -= lossGold;
          addLine(log, `💰 -${lossGold} Gold lost`, 'loss');
          renderResources();
          if (fightBtn) { fightBtn.textContent = '↺ Try Again'; fightBtn.disabled = false;
            fightBtn.onclick = () => openStageModal(_activeStage.id); }
        }
        return;
      }
      const ev = events[i++];
      if (ev.round !== lastRound) { lastRound = ev.round; addLine(log, `Round ${ev.round}`, 'round'); }
      if (ev.type === 'dodge')     addLine(log, `↩ ${ev.targetName} dodged ${ev.attackerName}`, 'dodge');
      else if (ev.type === 'crit') addLine(log, `💥 ${ev.attackerName} CRITS ${ev.targetName} for ${ev.damage}! (${ev.targetHp}/${ev.targetMaxHp})`, 'crit');
      else                         addLine(log, `⚔ ${ev.attackerName} hits ${ev.targetName} for ${ev.damage} (${ev.targetHp}/${ev.targetMaxHp})`, '');
      if (ev.targetHp <= 0) addLine(log, `☠ ${ev.targetName} has fallen`, 'death');
      log.scrollTop = log.scrollHeight;
      setTimeout(step, 90);
    }
    step();
  }

  // ─── CHEST REVEAL ────────────────────────────────────────
  function showChestReveal(loot) {
    const nextUnlocked = _activeStage && _activeStage.id < MAP_STAGES.length;
    const itemsHtml = (loot.items && loot.items.length)
      ? loot.items.map(it => {
          const r = RARITIES[it.rarity];
          const statStr = Object.entries(it.stats).map(([k,v]) => `${STAT_DEFS[k]?.icon||k} +${v}`).join('  ');
          return `<div class="loot-item r-${it.rarity}" style="border-color:${r.color}">
            <div class="loot-item-icon">${it.slot==='weapon'?'⚔️':it.slot==='armor'?'🛡️':it.slot==='ring'?'💍':'🔮'}</div>
            <div class="loot-item-info">
              <div class="loot-item-name" style="color:${r.color}">${it.name}</div>
              <div class="loot-item-rarity" style="color:${r.color}">${r.label}</div>
              <div class="loot-item-stats">${statStr}</div>
            </div>
          </div>`;
        }).join('')
      : '<p style="color:var(--text-dim);font-style:italic;text-align:center;font-size:0.85rem">No gear this time — just resources.</p>';

    openModal(`
      <div class="chest-reveal">
        <div class="chest-icon">🎁</div>
        <div class="modal-title" style="text-align:center">Victory Spoils!</div>
        <div class="loot-resources">
          <span>💰 +${loot.gold}</span>
          <span>🍖 +${loot.food}</span>
          ${loot.iron ? `<span>⚙️ +${loot.iron}</span>` : ''}
        </div>
        <div class="modal-sect-title" style="margin-top:14px">Items Looted</div>
        <div class="loot-items">${itemsHtml}</div>
        ${nextUnlocked ? '<div class="loot-unlock">🗺️ Next stage unlocked!</div>' : ''}
        <button class="btn-primary" style="width:100%;margin-top:16px" onclick="UI.closeModal();UI.renderRoadmap()">Continue</button>
      </div>
    `);
  }

  function addLine(container, text, cls) {
    const div = document.createElement('div');
    div.className = 'log-line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    container.appendChild(div);
  }

  // ─── RANKS PANEL (inline in map screen) ──────────────────
  function renderRanksPanel() {
    const panel = document.getElementById('ranks-panel');
    if (!panel) return;
    const wins   = Game.getState().wins || 0;
    const score  = (wins * 120) + (Game.getDwellers().length * 50) + ((Game.getState().mapProgress||1) * 80);
    const user   = Auth.getUser();
    const myName = user ? (user.email?.split('@')[0] || 'You') : 'You (Guest)';
    const tier   = score > 4000 ? 'Champion' : score > 2000 ? 'Knight' : score > 800 ? 'Soldier' : 'Recruit';
    const fakes = [
      { name:'Thorvald the Grim', emoji:'🧔', wins:47, score:5820, tier:'Champion' },
      { name:'Lady Seraphine',    emoji:'👸', wins:38, score:4690, tier:'Champion' },
      { name:'Iron Duke Raven',   emoji:'🤺', wins:31, score:3870, tier:'Knight'  },
      { name:'Morgath Stonehide', emoji:'👹', wins:27, score:3340, tier:'Knight'  },
      { name:'Elara the Swift',   emoji:'🧝', wins:19, score:2420, tier:'Soldier' },
      { name:'Dunwick the Bold',  emoji:'⚔️', wins:14, score:1760, tier:'Soldier' },
    ];
    const all = [...fakes, { name:myName, emoji:'🏰', wins, score, tier, you:true }].sort((a,b)=>b.score-a.score);
    const myRank = all.findIndex(r => r.you) + 1;

    panel.innerHTML = `
      <div class="ranks-header">🏆 Hall of Lords</div>
      <div class="ranks-sub">Global Leaderboard</div>
      <div class="your-stats-box">
        <div class="ys-item"><div class="ys-val">#${myRank}</div><div class="ys-lbl">Rank</div></div>
        <div class="ys-item"><div class="ys-val">${wins}</div><div class="ys-lbl">Wins</div></div>
        <div class="ys-item"><div class="ys-val">${Game.getDwellers().length}</div><div class="ys-lbl">Dwellers</div></div>
        <div class="ys-item"><div class="ys-val">${score.toLocaleString()}</div><div class="ys-lbl">Score</div></div>
      </div>
      <div class="rank-tier-label">All Kingdoms</div>
      ${all.map((row, idx) => {
        const pos = idx+1;
        const posCls = pos===1?'top1':pos===2?'top2':pos===3?'top3':'';
        const posStr = pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':`#${pos}`;
        return `<div class="rank-row ${row.you?'you':''}">
          <div class="rank-pos ${posCls}">${posStr}</div>
          <div class="rank-avatar-sm">${row.emoji}</div>
          <div class="rank-info"><div class="rank-name">${row.name}${row.you?' (You)':''}</div>
          <div class="rank-meta">${row.tier} · ${row.wins} wins</div></div>
          <div class="rank-score">${row.score.toLocaleString()}</div>
        </div>`;
      }).join('')}`;
  }

  function _unused_openRanks() {
    const wins   = Game.getState().wins || 0;
    const score  = (wins * 120) + (Game.getDwellers().length * 50) + ((Game.getState().mapProgress||1) * 80);
    const user   = Auth.getUser();
    const myName = user ? (user.email?.split('@')[0] || 'You') : 'You (Guest)';
    const tier   = score > 4000 ? 'Champion' : score > 2000 ? 'Knight' : score > 800 ? 'Soldier' : 'Recruit';
    const fakes = [
      { name:'Thorvald the Grim', emoji:'🧔', wins:47, score:5820, tier:'Champion' },
      { name:'Lady Seraphine',    emoji:'👸', wins:38, score:4690, tier:'Champion' },
      { name:'Iron Duke Raven',   emoji:'🤺', wins:31, score:3870, tier:'Knight'  },
      { name:'Morgath Stonehide', emoji:'👹', wins:27, score:3340, tier:'Knight'  },
      { name:'Elara the Swift',   emoji:'🧝', wins:19, score:2420, tier:'Soldier' },
      { name:'Dunwick the Bold',  emoji:'⚔️', wins:14, score:1760, tier:'Soldier' },
    ];
    const all = [...fakes, { name:myName, emoji:'🏰', wins, score, tier, you:true }].sort((a,b)=>b.score-a.score);
    const myRank = all.findIndex(r => r.you) + 1;

    openModal(`
      <div class="modal-title">🏆 Hall of Lords</div>
      <div class="modal-sub">Global Leaderboard</div>
      <div class="your-stats-box">
        <div class="ys-item"><div class="ys-val">#${myRank}</div><div class="ys-lbl">Rank</div></div>
        <div class="ys-item"><div class="ys-val">${wins}</div><div class="ys-lbl">Wins</div></div>
        <div class="ys-item"><div class="ys-val">${Game.getDwellers().length}</div><div class="ys-lbl">Dwellers</div></div>
        <div class="ys-item"><div class="ys-val">${score.toLocaleString()}</div><div class="ys-lbl">Score</div></div>
      </div>
      <div class="rank-tier-label">All Kingdoms</div>
      ${all.map((row, idx) => {
        const pos = idx+1;
        const posCls = pos===1?'top1':pos===2?'top2':pos===3?'top3':'';
        const posStr = pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':`#${pos}`;
        return `<div class="rank-row ${row.you?'you':''}">
          <div class="rank-pos ${posCls}">${posStr}</div>
          <div class="rank-avatar-sm">${row.emoji}</div>
          <div class="rank-info"><div class="rank-name">${row.name}${row.you?' (You)':''}</div>
          <div class="rank-meta">${row.tier} · ${row.wins} wins</div></div>
          <div class="rank-score">${row.score.toLocaleString()}</div>
        </div>`;
      }).join('')}`);
  }

  // ─── MODAL ───────────────────────────────────────────────
  function openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }
  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ─── ROOM MODAL ──────────────────────────────────────────
  function openRoomModal(roomId) {
    const def    = ROOM_DEFS.find(r => r.id === roomId);
    const level  = Game.getRoomLevel(roomId);
    const dwIds  = Game.getRoomDwellers(roomId);
    const free   = Game.getDwellers().filter(d => !d.assignedRoom);
    const canAssign = def.maxDwellers > 0 && dwIds.length < def.maxDwellers;

    const assignedHtml = dwIds.map(id => {
      const dw = Game.getDweller(id), role = Game.getDwellerRole(id);
      return `<div class="assign-card">
        <div class="dweller-avatar" style="width:30px;height:30px;font-size:1rem">${dw.emoji}</div>
        <div><div style="font-size:0.88rem;color:var(--text-bright)">${dw.name}</div>
        <div style="font-size:0.75rem;color:var(--text-dim)">${role.icon} ${role.role}</div></div>
        <button class="btn-remove" onclick="UI.doUnassign('${id}','${roomId}')">✕</button>
      </div>`;
    }).join('');

    const assignHtml = canAssign && free.length
      ? `<div class="modal-sect-title" style="margin-top:10px">Assign Dweller</div>
         <select id="assign-sel"><option value="">— choose —</option>
         ${free.map(d => `<option value="${d.id}">${d.emoji} ${d.name}</option>`).join('')}</select>
         <button class="btn-primary" onclick="UI.doAssign('${roomId}')" style="width:100%">Assign</button>` : '';

    openModal(`
      <div class="modal-title">${def.icon} ${def.name}</div>
      <div class="modal-sub">Level ${level}${def.maxDwellers ? ' · ' + dwIds.length + '/' + def.maxDwellers + ' dwellers' : ''}</div>
      <div class="modal-sect">
        <p style="font-size:0.88rem;color:var(--text-dim);line-height:1.6;margin-bottom:10px">${def.description}</p>
        ${def.resource ? `<div style="font-size:0.83rem;color:var(--gold-dim)">📦 +${def.baseRate*level}/min <strong>${def.resource}</strong></div>` : ''}
      </div>
      ${def.maxDwellers > 0 ? `<div class="modal-sect">
        <div class="modal-sect-title">Assigned (${dwIds.length}/${def.maxDwellers})</div>
        ${assignedHtml || '<p style="font-size:0.8rem;color:var(--text-ghost);font-style:italic">None assigned</p>'}
        ${assignHtml}
      </div>` : ''}`);
  }

  function doAssign(roomId) {
    const sel = document.getElementById('assign-sel');
    if (!sel?.value) return;
    Game.assignDweller(sel.value, roomId);
    openRoomModal(roomId); renderDwellerList(); renderCastle();
    if (typeof Sync !== 'undefined') Sync.save();
  }
  function doUnassign(dwellerId, roomId) {
    Game.unassignDweller(dwellerId);
    openRoomModal(roomId); renderDwellerList(); renderCastle();
    if (typeof Sync !== 'undefined') Sync.save();
  }

  // ─── DWELLER MODAL ───────────────────────────────────────
  function openDwellerModal(dwellerId) {
    const dw = Game.getDweller(dwellerId); if (!dw) return;
    const stats = Game.getDwellerStats(dwellerId), role = Game.getDwellerRole(dwellerId);
    const stars = '★'.repeat(dw.stars) + '☆'.repeat(5 - dw.stars);
    const roleCls = 'role-' + role.role.toLowerCase();
    const statsHtml = Object.keys(STAT_DEFS).map(k => `
      <div class="stat-box"><div class="stat-lbl">${STAT_DEFS[k].icon} ${STAT_DEFS[k].label}</div>
      <div class="stat-val">${stats?.[k]??0}</div></div>`).join('');
    const slotsHtml = EQUIP_SLOTS.map(slot => {
      const item = Game.getEquippedItem(dwellerId, slot.id);
      const rarCls = item ? ' filled r-' + item.rarity : '';
      const nameColor = item ? RARITIES[item.rarity].color : '';
      return `<div class="equip-slot${rarCls}" onclick="UI.openEquipPicker('${dwellerId}','${slot.id}')">
        <div class="eslot-icon">${slot.icon}</div>
        ${item ? `<div class="eslot-name" style="color:${nameColor}">${item.name}</div>` : `<div class="eslot-lbl">${slot.label}</div>`}
      </div>`;
    }).join('');
    openModal(`
      <div class="dw-header"><div class="dw-avatar-lg">${dw.emoji}</div>
        <div class="dw-header-info"><h3>${dw.name}${dw.injured?' 🤕':''}</h3>
        <div class="dw-stars">${stars} · Lv ${dw.level}</div>
        <div class="role-badge ${roleCls}">${role.icon} ${role.role}</div></div></div>
      <div class="modal-sect"><div class="modal-sect-title">Stats</div><div class="stats-grid">${statsHtml}</div></div>
      <div class="modal-sect"><div class="modal-sect-title">Equipment — tap slot to change</div><div class="equip-grid">${slotsHtml}</div></div>`);
  }

  // ─── EQUIP PICKER ────────────────────────────────────────
  function openEquipPicker(dwellerId, slot) {
    const dw = Game.getDweller(dwellerId);
    const current = Game.getEquippedItem(dwellerId, slot);
    const pool = Game.getInventory().filter(i => i.slot === slot);
    const cards = pool.map(item => {
      const r = RARITIES[item.rarity], eq = current?.id === item.id;
      return `<div class="item-card ${eq?'equipped':''}" onclick="UI.doEquip('${dwellerId}','${item.id}')" style="border-color:${r.color}">
        <div class="item-card-left"><h4 style="color:${r.color}">${item.name}</h4>
        <div class="item-stats">${Object.entries(item.stats).map(([k,v])=>`${STAT_DEFS[k]?.icon||k} +${v}`).join('  ')}</div></div>
        <span class="item-rarity-badge" style="color:${r.color};border:1px solid ${r.color}">${r.label}${eq?' ✓':''}</span>
      </div>`;
    }).join('');
    openModal(`
      <div class="modal-title">Choose ${slot.replace(/\d+/,'')}</div>
      <div class="modal-sub">Equipping on ${dw?.name}</div>
      ${current ? `<button class="btn-secondary" onclick="UI.doUnequip('${dwellerId}','${slot}')" style="width:100%;margin-bottom:12px">Remove: ${current.name}</button>` : ''}
      ${cards || '<p style="color:var(--text-ghost);font-style:italic;font-size:0.85rem">No items for this slot</p>'}`);
  }
  function doEquip(dwellerId, itemId) {
    Game.equipItem(dwellerId, itemId);
    openDwellerModal(dwellerId); renderDwellerList(); renderCastle();
    if (typeof Sync !== 'undefined') Sync.save();
  }
  function doUnequip(dwellerId, slot) { Game.unequipItem(dwellerId, slot); openDwellerModal(dwellerId); if (typeof Sync !== 'undefined') Sync.save(); }

  // ─── INVENTORY MODAL ─────────────────────────────────────
  function openInventory() {
    const items = Game.getInventory();
    const grid = items.map(item => {
      const r = RARITIES[item.rarity];
      return `<div class="inv-item" style="border-color:${r.color}">
        <div class="inv-icon">⚔️</div><div class="inv-name" style="color:${r.color}">${item.name}</div>
        <div style="font-size:0.6rem;color:var(--text-ghost)">${item.slot}</div></div>`;
    }).join('');
    openModal(`<div class="modal-title">🎒 Inventory</div><div class="modal-sub">${items.length} items</div>
      <div class="inventory-grid">${grid || '<p style="color:var(--text-ghost);font-style:italic">Empty</p>'}</div>`);
  }

  // ─── FULL RENDER ─────────────────────────────────────────
  function renderAll() {
    renderCastle(); renderDwellerList(); renderResources();
    const vd = document.getElementById('ver-display'); if (vd) vd.textContent = APP_VERSION;
  }

  function fmt(n) {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return Math.floor(n||0).toString();
  }

  return {
    renderAll, renderCastle, renderDwellerList, renderResources,
    showScreen, openDrawer, closeDrawer, renderRoadmap,
    openModal, closeModal,
    openRoomModal, openDwellerModal, openEquipPicker, openInventory,
    openStageModal, renderRanksPanel, switchMapTab, showChestReveal,
    doAssign, doUnassign, doEquip, doUnequip, fmt,
  };
})();
