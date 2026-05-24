// drag.js — Drag system v1.8.4
// Pointer Events with native drag prevention.

const Drag = (() => {
  let _state  = null;  // { dwellerId, sourceEl }
  let _ghost  = null;
  let _active = false;

  function init() {
    _ghost = document.getElementById('drag-ghost');

    // Kill native drag on anything inside the castle wall
    document.addEventListener('dragstart', function(e) {
      if (e.target.closest('#castle-wall') || e.target.closest('.tray-chip')) {
        e.preventDefault();
        return false;
      }
    });

    // Pointer down in capture phase — fires before browser scroll/drag logic
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup',   onUp,   true);
    document.addEventListener('pointercancel', function(e) {
      // Only cancel if it's our captured pointer
      if (_state && e.isPrimary) cancel();
    }, true);
  }

  function onDown(e) {
    if (!e.isPrimary) return;
    var el = e.target.closest('.draggable-walker');
    if (!el) return;
    var id = el.getAttribute('data-dw-id');
    if (!id) return;

    e.preventDefault();
    e.stopPropagation();

    // Capture so pointermove follows finger even outside element
    try { el.setPointerCapture(e.pointerId); } catch(x) {}

    _active = true;
    _state  = { dwellerId: id, sourceEl: el };
    el.classList.add('dragging-active');

    showGhost(id, e.clientX, e.clientY);
    highlightDropTargets(id);
  }

  function onMove(e) {
    if (!_active || !e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    moveGhost(e.clientX, e.clientY);
  }

  function onUp(e) {
    if (!_active || !e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();

    // Find drop target — temporarily hide ghost so elementFromPoint works
    if (_ghost) _ghost.style.visibility = 'hidden';
    var el   = document.elementFromPoint(e.clientX, e.clientY);
    if (_ghost) _ghost.style.visibility = '';

    var cell = el && el.closest('.room-cell');
    if (cell && cell.dataset.roomId) {
      drop(cell.dataset.roomId);
    }
    cancel();
  }

  function showGhost(id, x, y) {
    if (!_ghost) return;
    var dw = Game.getDweller(id);
    _ghost.innerHTML =
      '<span style="font-size:2rem;line-height:1">' + (dw ? dw.emoji : '🧍') + '</span>' +
      '<span style="font-size:.8rem;color:var(--text-bright);margin-left:6px">' + (dw ? dw.name : '') + '</span>';
    _ghost.classList.add('visible');
    moveGhost(x, y);
  }

  function moveGhost(x, y) {
    if (!_ghost) return;
    _ghost.style.left = x + 'px';
    _ghost.style.top  = y + 'px';
  }

  function highlightDropTargets(dwellerId) {
    document.querySelectorAll('.room-cell:not(.locked)').forEach(function(cell) {
      var rid = cell.dataset.roomId;
      if (!rid) return;
      if (rid === 'throne_room') {
        cell.classList.add('touch-drop-target');
        return;
      }
      var def = ROOM_DEFS.find(function(r) { return r.id === rid; });
      if (def && def.maxDwellers > 0 && Game.getRoomDwellers(rid).length < def.maxDwellers) {
        cell.classList.add('touch-drop-target');
      }
    });
  }

  function drop(roomId) {
    if (!_state) return;
    var id  = _state.dwellerId;
    var def = ROOM_DEFS.find(function(r) { return r.id === roomId; });
    if (!def) return;

    if (roomId === 'throne_room') {
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
    _active = false;
    if (_state && _state.sourceEl) _state.sourceEl.classList.remove('dragging-active');
    if (_ghost) _ghost.classList.remove('visible');
    document.querySelectorAll('.touch-drop-target').forEach(function(el) {
      el.classList.remove('touch-drop-target');
    });
    _state = null;
  }

  // Kept for any external callers
  function startDrag(id, el, x, y) {
    if (_active) return;
    _active = true;
    _state  = { dwellerId: id, sourceEl: el };
    el.classList.add('dragging-active');
    showGhost(id, x, y);
    highlightDropTargets(id);
  }

  return { init, startDrag, cancel };
})();
