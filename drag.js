// drag.js — Pointer-event drag system v1.8.3
// Uses Pointer Events API (works for touch + mouse, bypasses scroll-container issues).
// Wired once at init() on document — no per-element listeners needed.

const Drag = (() => {
  let _dragging = null;
  let _ghost    = null;

  function init() {
    _ghost = document.getElementById('drag-ghost');

    // Single pointerdown on document — capture phase so we get it before scroll
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup',   onPointerUp,   true);
    document.addEventListener('pointercancel', cancel);
  }

  function onPointerDown(e) {
    // Only primary pointer (finger or left-click)
    if (!e.isPrimary) return;

    var el = e.target.closest('.draggable-walker');
    if (!el) return;

    var id = el.getAttribute('data-dw-id');
    if (!id) return;

    // Prevent scroll + text selection
    e.preventDefault();
    e.stopPropagation();

    // Capture pointer so we keep getting events even if finger leaves element
    try { el.setPointerCapture(e.pointerId); } catch(ex) {}

    _dragging = { dwellerId: id, sourceEl: el, pointerId: e.pointerId };
    el.classList.add('dragging-active');

    // Build ghost
    var dw = Game.getDweller(id);
    if (_ghost) {
      _ghost.innerHTML =
        '<span style="font-size:1.6rem">' + (dw ? dw.emoji : '?') + '</span>' +
        '<span style="font-size:.8rem;margin-left:4px;color:var(--text-main)">' + (dw ? dw.name : '') + '</span>';
      _ghost.classList.add('visible');
      moveGhost(e.clientX, e.clientY);
    }

    // Highlight valid drop rooms
    document.querySelectorAll('.room-cell:not(.locked)').forEach(function(cell) {
      var roomId = cell.dataset.roomId;
      var def    = ROOM_DEFS.find(function(r) { return r.id === roomId; });
      if (!def) return;
      // All rooms with slots are valid (throne room = unassign)
      if (def.maxDwellers > 0 || roomId === 'throne_room') {
        cell.classList.add('touch-drop-target');
      }
    });
  }

  function onPointerMove(e) {
    if (!_dragging || !e.isPrimary) return;
    moveGhost(e.clientX, e.clientY);
    // Don't preventDefault here — let scroll still work when NOT dragging a walker
  }

  function onPointerUp(e) {
    if (!_dragging || !e.isPrimary) return;

    var target = document.elementFromPoint(e.clientX, e.clientY);
    var cell   = target && target.closest('.room-cell');
    if (cell) drop(cell.dataset.roomId);

    cancel();
  }

  function moveGhost(x, y) {
    if (!_ghost) return;
    _ghost.style.left = x + 'px';
    _ghost.style.top  = y + 'px';
  }

  function drop(roomId) {
    if (!_dragging || !roomId) return;
    var id  = _dragging.dwellerId;
    var def = ROOM_DEFS.find(function(r) { return r.id === roomId; });
    if (!def) return;

    if (roomId === 'throne_room') {
      // Throne room = unassign (send back)
      Game.unassignDweller(id);
    } else {
      if (!def.maxDwellers) return;
      if (Game.getRoomDwellers(roomId).length >= def.maxDwellers) return;
      Game.assignDweller(id, roomId);
    }

    UI.renderCastle();
    UI.renderDwellerList();
    if (typeof Sync !== 'undefined') Sync.save();
  }

  function cancel() {
    if (_dragging && _dragging.sourceEl) {
      _dragging.sourceEl.classList.remove('dragging-active');
    }
    if (_ghost) _ghost.classList.remove('visible');
    document.querySelectorAll('.touch-drop-target').forEach(function(el) {
      el.classList.remove('touch-drop-target');
    });
    _dragging = null;
  }

  // Public: manual startDrag (kept for compatibility)
  function startDrag(dwellerId, sourceEl, clientX, clientY) {
    // Synthesise a start using the same logic
    _dragging = { dwellerId: dwellerId, sourceEl: sourceEl, pointerId: null };
    sourceEl.classList.add('dragging-active');
    var dw = Game.getDweller(dwellerId);
    if (_ghost) {
      _ghost.innerHTML =
        '<span style="font-size:1.6rem">' + (dw ? dw.emoji : '?') + '</span>' +
        '<span style="font-size:.8rem;margin-left:4px;color:var(--text-main)">' + (dw ? dw.name : '') + '</span>';
      _ghost.classList.add('visible');
      moveGhost(clientX, clientY);
    }
    document.querySelectorAll('.room-cell:not(.locked)').forEach(function(cell) {
      var roomId = cell.dataset.roomId;
      var def    = ROOM_DEFS.find(function(r) { return r.id === roomId; });
      if (def && (def.maxDwellers > 0 || roomId === 'throne_room')) {
        cell.classList.add('touch-drop-target');
      }
    });
  }

  return { init, startDrag, cancel };
})();
