// art.js — Original SVG art system for Ironhold v2.0.0
// All artwork is original, drawn procedurally. Dark medieval fantasy aesthetic.

const Art = (() => {

  // ─── ROLE PALETTE ────────────────────────────────────────
  var ROLE_COLORS = {
    Tank:     { cloth:'#3a6ab0', trim:'#5a8ad0', metal:'#9aa8c0' },
    Archer:   { cloth:'#3a8a4a', trim:'#5aaa6a', metal:'#8a6a3a' },
    Mage:     { cloth:'#7a3ab0', trim:'#9a5ad0', metal:'#c0a040' },
    Assassin: { cloth:'#7a2030', trim:'#a04050', metal:'#606060' },
    Worker:   { cloth:'#7a5a35', trim:'#9a7a50', metal:'#888888' },
  };

  var SKIN = ['#f0c8a0','#e0b080','#c89060','#a06840'];
  var HAIR = ['#3a2818','#6a4828','#a06830','#d8c060','#888888','#201810'];

  // Deterministic pick from id so each dweller looks consistent
  function pick(arr, seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
    return arr[h % arr.length];
  }

  // ─── CHARACTER SVG ───────────────────────────────────────
  // Returns an inline SVG string for a little medieval figure.
  // gender affects hair/silhouette; role sets clothing colors.
  function character(dweller, role) {
    var rc   = ROLE_COLORS[role] || ROLE_COLORS.Worker;
    var skin = pick(SKIN, dweller.id);
    var hair = pick(HAIR, dweller.id + 'h');
    var female = dweller.gender === 'female';

    // Weapon prop based on role
    var prop = '';
    if (role === 'Tank')     prop = '<rect x="30" y="20" width="4" height="26" rx="1" fill="'+rc.metal+'"/><rect x="27" y="18" width="10" height="5" rx="1" fill="'+rc.trim+'"/>';
    if (role === 'Archer')   prop = '<path d="M30 16 Q40 30 30 44" stroke="'+rc.metal+'" stroke-width="2.5" fill="none"/><line x1="30" y1="16" x2="30" y2="44" stroke="#d8c8a0" stroke-width="1"/>';
    if (role === 'Mage')     prop = '<rect x="31" y="14" width="3" height="32" rx="1.5" fill="'+rc.metal+'"/><circle cx="32.5" cy="13" r="4" fill="'+rc.trim+'"/><circle cx="32.5" cy="13" r="2" fill="#fff" opacity="0.7"/>';
    if (role === 'Assassin') prop = '<rect x="29" y="30" width="3" height="12" rx="1" fill="'+rc.metal+'" transform="rotate(20 30 36)"/>';
    if (role === 'Worker')   prop = '<rect x="29" y="26" width="4" height="16" rx="1" fill="#8a6a40"/><rect x="26" y="24" width="10" height="6" rx="1" fill="'+rc.metal+'"/>';

    // Hair shape
    var hairShape = female
      ? '<path d="M9 13 Q8 4 16 3 Q24 4 23 13 Q23 18 21 20 L21 13 Q16 9 11 13 L11 20 Q9 18 9 13Z" fill="'+hair+'"/>'
      : '<path d="M9 13 Q9 4 16 4 Q23 4 23 13 Q20 9 16 9 Q12 9 9 13Z" fill="'+hair+'"/>';

    return '<svg viewBox="0 0 40 56" class="char-svg" xmlns="http://www.w3.org/2000/svg">' +
      // shadow
      '<ellipse cx="16" cy="53" rx="11" ry="2.5" fill="rgba(0,0,0,0.35)"/>' +
      // legs
      '<rect class="char-leg-l" x="11" y="40" width="4.5" height="11" rx="2" fill="#2a2418"/>' +
      '<rect class="char-leg-r" x="16.5" y="40" width="4.5" height="11" rx="2" fill="#2a2418"/>' +
      // body / tunic
      (female
        ? '<path d="M9 26 Q16 24 23 26 L25 44 Q16 47 7 44Z" fill="'+rc.cloth+'"/>'
        : '<path d="M9 26 L23 26 L24 43 L8 43Z" fill="'+rc.cloth+'"/>') +
      // belt
      '<rect x="8" y="40" width="16" height="3" fill="'+rc.trim+'"/>' +
      // chest trim
      '<path d="M16 26 L16 40" stroke="'+rc.trim+'" stroke-width="1.5"/>' +
      // arms
      '<rect x="6" y="27" width="4" height="13" rx="2" fill="'+rc.cloth+'"/>' +
      '<rect x="22" y="27" width="4" height="13" rx="2" fill="'+rc.cloth+'"/>' +
      // hands
      '<circle cx="8" cy="40" r="2.5" fill="'+skin+'"/>' +
      '<circle cx="24" cy="40" r="2.5" fill="'+skin+'"/>' +
      // neck
      '<rect x="14" y="20" width="4" height="5" fill="'+skin+'"/>' +
      // head
      '<circle cx="16" cy="14" r="8" fill="'+skin+'"/>' +
      // hair
      hairShape +
      // eyes
      '<circle cx="13" cy="14" r="1.1" fill="#1a1208"/>' +
      '<circle cx="19" cy="14" r="1.1" fill="#1a1208"/>' +
      // weapon prop
      prop +
      '</svg>';
  }

  // ─── ROOM INTERIOR SVG ───────────────────────────────────
  // Themed background furniture for each room type
  function roomInterior(roomId) {
    var interiors = {
      throne_room:
        '<rect x="38" y="20" width="24" height="40" rx="2" fill="#6a2a2a"/>' +       // throne back
        '<rect x="36" y="52" width="28" height="10" rx="2" fill="#7a3a3a"/>' +       // throne seat
        '<rect x="40" y="14" width="20" height="8" rx="4" fill="#d8b840"/>' +        // gold crest
        '<path d="M0 72 L100 72 L100 78 L0 78Z" fill="#5a1a1a" opacity="0.5"/>',     // red carpet
      barracks:
        '<rect x="10" y="20" width="6" height="40" fill="#3a2a1a"/>' +               // weapon rack
        '<line x1="11" y1="24" x2="11" y2="56" stroke="#888" stroke-width="2"/>' +
        '<line x1="14" y1="24" x2="14" y2="56" stroke="#aaa" stroke-width="2"/>' +
        '<rect x="78" y="30" width="14" height="30" rx="2" fill="#4a3a28"/>' +       // training dummy
        '<circle cx="85" cy="26" r="7" fill="#5a4a38"/>',
      training_grounds:
        '<rect x="12" y="40" width="22" height="6" rx="3" fill="#333"/>' +           // barbell
        '<circle cx="14" cy="43" r="6" fill="#222"/><circle cx="32" cy="43" r="6" fill="#222"/>' +
        '<rect x="74" y="28" width="12" height="32" rx="2" fill="#4a3a28"/>' +       // dummy
        '<circle cx="80" cy="24" r="6" fill="#5a4a38"/>',
      treasury:
        '<path d="M12 56 Q20 44 30 56Z" fill="#d8b840"/>' +                          // gold pile
        '<circle cx="16" cy="54" r="3" fill="#f0d860"/><circle cx="24" cy="54" r="3" fill="#f0d860"/>' +
        '<rect x="70" y="44" width="22" height="16" rx="2" fill="#6a4a28"/>' +       // chest
        '<rect x="70" y="44" width="22" height="5" fill="#8a6a40"/><circle cx="81" cy="52" r="2" fill="#d8b840"/>',
      kitchen:
        '<ellipse cx="22" cy="52" rx="14" ry="8" fill="#2a2a2a"/>' +                 // cauldron
        '<rect x="10" y="40" width="24" height="12" rx="2" fill="#333"/>' +
        '<path d="M16 40 Q22 30 28 40" fill="none" stroke="#ff6a20" stroke-width="2" opacity="0.7"/>' + // steam/fire
        '<rect x="74" y="34" width="18" height="24" rx="1" fill="#4a3a28"/>',        // cupboard
      workshop:
        '<rect x="14" y="42" width="26" height="14" rx="2" fill="#3a3a3a"/>' +       // anvil base
        '<path d="M16 42 L38 42 L34 36 L20 36Z" fill="#555"/>' +                     // anvil
        '<rect x="74" y="30" width="16" height="28" rx="2" fill="#5a2a1a"/>' +       // forge
        '<path d="M78 36 Q82 28 86 36" fill="none" stroke="#ff7a20" stroke-width="3" opacity="0.6"/>',
      living_quarters:
        '<rect x="8" y="46" width="30" height="14" rx="2" fill="#5a4a38"/>' +        // bed
        '<rect x="8" y="42" width="10" height="8" rx="2" fill="#cabba0"/>' +         // pillow
        '<rect x="62" y="46" width="30" height="14" rx="2" fill="#5a4a38"/>' +
        '<rect x="82" y="42" width="10" height="8" rx="2" fill="#cabba0"/>',
      hospital:
        '<rect x="20" y="44" width="34" height="14" rx="2" fill="#d0d0d8"/>' +       // medical bed
        '<rect x="20" y="40" width="12" height="8" rx="2" fill="#fff"/>' +           // pillow
        '<rect x="74" y="22" width="16" height="16" rx="2" fill="#3a4a5a"/>' +       // cross sign
        '<rect x="80" y="25" width="4" height="10" fill="#e04040"/><rect x="77" y="28" width="10" height="4" fill="#e04040"/>',
    };
    return interiors[roomId] || '';
  }

  return { character, roomInterior, ROLE_COLORS };
})();
