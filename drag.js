// drag.js — Tap-to-select, tap-to-place system v1.9.0
// No drag events at all. Click dweller to select, click room to place.
// Works identically on mobile and desktop.

const Drag = (() => {
  let _selected = null; // { dwellerId }

  function init() {
    // Hide ghost — not used in this system
    var ghost = document.getElementById('drag-ghost');
    if (ghost) ghost.style.display = 'none';
  }

  // Called when a walker/chip is tapped
  function selectDweller(dwellerId) {
    // Tapping same dweller deselects
    if (_selected && _selected.dwellerId === dwellerId) {
      clearSelection();
      return;
    }
    _selected = { dwellerId };

    // Highlight the selected walker
    document.querySelectorAll('.draggable-walker').forEach(function(el) {
      var active = el.getAttribute('data-dw-id') === dwellerId;
      el.classList.toggle('walker-selected', active);
    });

    // Highlight valid drop rooms
    document.querySelectorAll('.room-cell').forEach(function(cell) {
      cell.classList.remove('touch-drop-target');
      if (cell.classList.contains('locked')) return;
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

    // Show selection banner
    showBanner(dwellerId);
  }

  // Called when a room cell is tapped while a dweller is selected
  function tryPlace(roomId) {
    if (!_selected) return false;

    var id  = _selected.dwellerId;
    var def = ROOM_DEFS.find(function(r) { return r.id === roomId; });
    if (!def) { clearSelection(); return false; }

    var placed = false;
    if (roomId === 'throne_room') {
      Game.unassignDweller(id);
      placed = true;
    } else if (def.maxDwellers > 0 && Game.getRoomDwellers(roomId).length < def.maxDwellers) {
      Game.assignDweller(id, roomId);
      placed = true;
    }

    clearSelection();
    if (placed) {
      UI.renderCastle();
      UI.renderDwellerList();
      if (typeof Sync !== 'undefined') Sync.save();
    }
    return placed;
  }

  function clearSelection() {
    _selected = null;
    document.querySelectorAll('.walker-selected').forEach(function(el) {
      el.classList.remove('walker-selected');
    });
    document.querySelectorAll('.touch-drop-target').forEach(function(el) {
      el.classList.remove('touch-drop-target');
    });
    hideBanner();
  }

  function isSelecting() { return !!_selected; }
  function getSelected()  { return _selected; }

  function showBanner(dwellerId) {
    var dw = Game.getDweller(dwellerId);
    var banner = document.getElementById('select-banner');
    if (!banner) return;
    banner.innerHTML = dw
      ? '<span style="font-size:1.1rem">' + dw.emoji + '</span> <strong>' + dw.name + '</strong> — tap a room to place, or tap again to cancel'
      : '';
    banner.classList.remove('hidden');
  }

  function hideBanner() {
    var banner = document.getElementById('select-banner');
    if (banner) banner.classList.add('hidden');
  }

  return { init, selectDweller, tryPlace, clearSelection, isSelecting, getSelected };
})();
