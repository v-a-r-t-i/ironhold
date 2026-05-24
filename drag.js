// drag.js — Unified touch + mouse drag system for Ironhold v1.7.0
// Works on both mobile (touch) and desktop (mouse/HTML5 drag).

const Drag = (() => {
  let _dragging = null;   // { dwellerId, sourceEl }
  let _ghost    = null;

  function init() {
    _ghost = document.getElementById('drag-ghost');
    // Listen on document so we always catch touchend/mouseup
    document.addEventListener('touchmove',  onTouchMove,  { passive: false });
    document.addEventListener('touchend',   onTouchEnd,   { passive: false });
    document.addEventListener('touchcancel',cancelDrag);
    document.addEventListener('mousemove',  onMouseMove);
    document.addEventListener('mouseup',    onMouseUp);
  }

  // ── Start drag (called from tray chip + room walker tap) ──
  function startDrag(dwellerId, sourceEl, clientX, clientY) {
    _dragging = { dwellerId, sourceEl };
    sourceEl.classList.add('dragging-active');

    const dw = Game.getDweller(dwellerId);
    _ghost.innerHTML = `<span>${dw?.emoji || '🧍'}</span><span style="font-size:.75rem;color:var(--text-main)">${dw?.name || ''}</span>`;
    _ghost.classList.add('visible');
    moveGhost(clientX, clientY);

    // Highlight valid drop targets
    document.querySelectorAll('.room-cell:not(.locked)').forEach(cell => {
      const roomId = cell.dataset.roomId;
      const def    = ROOM_DEFS.find(r => r.id === roomId);
      if (def && def.maxDwellers > 0 && Game.getRoomDwellers(roomId).length < def.maxDwellers) {
        cell.classList.add('touch-drop-target');
      }
    });
  }

  function moveGhost(x, y) {
    if (!_ghost) return;
    _ghost.style.left = x + 'px';
    _ghost.style.top  = y + 'px';
  }

  // ── Touch handlers ──
  function onTouchMove(e) {
    if (!_dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    moveGhost(t.clientX, t.clientY);
  }

  function onTouchEnd(e) {
    if (!_dragging) return;
    const t = e.changedTouches[0];
    const target = document.elementFromPoint(t.clientX, t.clientY);
    const cell   = target?.closest('.room-cell');
    if (cell) {
      drop(cell.dataset.roomId);
    }
    cancelDrag();
  }

  // ── Mouse handlers (desktop) ──
  function onMouseMove(e) {
    if (!_dragging) return;
    moveGhost(e.clientX, e.clientY);
  }

  function onMouseUp(e) {
    if (!_dragging) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cell   = target?.closest('.room-cell');
    if (cell) drop(cell.dataset.roomId);
    cancelDrag();
  }

  // ── Drop logic ──
  function drop(roomId) {
    if (!_dragging || !roomId) return;
    const def = ROOM_DEFS.find(r => r.id === roomId);
    if (!def) return;
    // Drop on throne room = unassign
    if (roomId === 'throne_room') {
      Game.unassignDweller(_dragging.dwellerId);
    } else {
      if (def.maxDwellers === 0) return;
      if (Game.getRoomDwellers(roomId).length >= def.maxDwellers) return;
      Game.assignDweller(_dragging.dwellerId, roomId);
    }
    UI.renderCastle();
    UI.renderDwellerList();
    if (typeof Sync !== 'undefined') Sync.save();
  }

  function cancelDrag() {
    if (_dragging?.sourceEl) _dragging.sourceEl.classList.remove('dragging-active');
    if (_ghost) _ghost.classList.remove('visible');
    document.querySelectorAll('.touch-drop-target').forEach(el => el.classList.remove('touch-drop-target'));
    _dragging = null;
  }

  // ── Expose startDrag for chips to call ──
  return { init, startDrag, cancelDrag };
})();
