// battle.js — Battle pre-calculation engine v1.1.0

const Battle = (() => {

  function buildFighterFromDweller(dwellerId) {
    const dw    = Game.getDweller(dwellerId);
    const stats = Game.getDwellerStats(dwellerId);
    const role  = Game.getDwellerRole(dwellerId);
    return {
      id:      dwellerId,
      name:    dw.name,
      emoji:   dw.emoji,
      role:    role.role,
      maxHp:   stats.hp,
      hp:      stats.hp,
      atk:     stats.atk,
      def:     stats.def,
      crit:    stats.crit,
      dodge:   stats.dodge,
      spd:     stats.spd,
      alive:   true,
    };
  }

  function buildFighterFromEnemy(enemy) {
    const role = WEAPON_ROLES[enemy.weapon] || WEAPON_ROLES.none;
    return {
      id:     enemy.id,
      name:   enemy.name,
      emoji:  enemy.emoji,
      role:   role.role,
      maxHp:  enemy.stats.hp,
      hp:     enemy.stats.hp,
      atk:    enemy.stats.atk,
      def:    enemy.stats.def,
      crit:   enemy.stats.crit,
      dodge:  enemy.stats.dodge,
      spd:    enemy.stats.spd,
      alive:  true,
    };
  }

  function resolveHit(attacker, target) {
    if (Math.random() * 100 < target.dodge) {
      return { type: 'dodge', damage: 0, attacker: attacker.id, target: target.id };
    }
    const crit  = Math.random() * 100 < attacker.crit;
    let damage  = Math.max(1, attacker.atk - target.def * 0.5);
    if (crit) damage *= 2;
    damage = Math.max(1, Math.round(damage));
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp === 0) target.alive = false;
    return {
      type:    crit ? 'crit' : 'hit',
      damage,
      attacker: attacker.id,
      target:   target.id,
    };
  }

  function pickTarget(attacker, enemies) {
    if (attacker.role === 'Archer' || attacker.role === 'Assassin') {
      return enemies.reduce((a, b) => a.hp < b.hp ? a : b);
    }
    return enemies[0];
  }

  // attackerIds = array of dweller IDs
  // enemyList   = array of enemy objects (from rollEnemyParty)
  function calculate(attackerIds, enemyList, stageId = 1) {
    const attackers = attackerIds.map(buildFighterFromDweller);
    const defenders = enemyList.map(buildFighterFromEnemy);
    const log = [];
    const MAX_ROUNDS = 30;

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const aAlive = attackers.filter(c => c.alive);
      const dAlive = defenders.filter(c => c.alive);
      if (!aAlive.length || !dAlive.length) break;

      const turnOrder = [...aAlive, ...dAlive].sort((a, b) => b.spd - a.spd);

      for (const fighter of turnOrder) {
        if (!fighter.alive) continue;
        const isAtk  = attackerIds.includes(fighter.id);
        const enemies = isAtk
          ? defenders.filter(c => c.alive)
          : attackers.filter(c => c.alive);
        if (!enemies.length) continue;

        const target = pickTarget(fighter, enemies);
        const event  = resolveHit(fighter, target);
        log.push({
          round,
          ...event,
          attackerName: fighter.name,
          targetName:   target.name,
          targetHp:     target.hp,
          targetMaxHp:  target.maxHp,
        });
        if (!attackers.some(c => c.alive) || !defenders.some(c => c.alive)) break;
      }
    }

    const won = defenders.every(c => !c.alive);
    return {
      log,
      winner:   won ? 'attacker' : 'defender',
      rounds:   log.length ? log[log.length - 1].round : 0,
      loot:     won ? rollLoot(stageId) : null,
      survivors: {
        attackers: attackers.filter(c => c.alive).map(c => c.id),
        defenders: defenders.filter(c => c.alive).map(c => c.id),
      },
    };
  }

  // Roll a rarity. earlyBonus shifts odds toward better drops in early stages
  // so beginners get flooded with gear (mirrors Hustle Castle's onboarding).
  function rollRarity(luck = 0) {
    const roll = Math.random() * 100 - luck;
    if (roll < 55) return 'common';
    if (roll < 85) return 'rare';
    if (roll < 97) return 'epic';
    return 'legendary';
  }

  let _itemCounter = Date.now();
  function nextItemId() { return 'drop_' + (_itemCounter++); }

  // Generate one random item, optionally forcing a slot
  function generateItem(forceSlot, luck = 0) {
    const slots = forceSlot ? [forceSlot] : ['weapon','armor','ring','artifact1'];
    const slot  = slots[Math.floor(Math.random() * slots.length)];
    const pool  = LOOT_TEMPLATES[slot];
    const tmpl  = pool[Math.floor(Math.random() * pool.length)];
    const rarity = rollRarity(luck);
    const mult   = RARITIES[rarity].mult;
    const prefixes = RARITY_PREFIX[rarity];
    const prefix   = prefixes[Math.floor(Math.random() * prefixes.length)];

    const stats = {};
    Object.keys(tmpl.stats).forEach(k => { stats[k] = Math.round(tmpl.stats[k] * mult); });

    return {
      id: nextItemId(),
      name: `${prefix} ${tmpl.base}`,
      slot: slot.startsWith('artifact') ? 'artifact1' : slot,
      weaponType: tmpl.weaponType || null,
      rarity, stats, ability: null,
    };
  }

  // Returns a loot bundle for winning a stage.
  // stageId is used to give early stages extra item drops + luck.
  function rollLoot(stageId = 1) {
    const early = stageId <= 4;          // Greenwood = generous onboarding
    const luck  = early ? 18 : 0;        // better rarity odds early
    const itemCount = early ? (Math.random() < 0.5 ? 2 : 1) : (Math.random() < 0.35 ? 1 : 0);

    const items = [];
    for (let i = 0; i < itemCount; i++) {
      // First few stages bias toward weapons so all dwellers can be armed
      const forceSlot = (early && i === 0) ? 'weapon' : null;
      items.push(generateItem(forceSlot, luck));
    }

    return {
      gold:  Math.floor(Math.random() * 60) + 25 + stageId * 8,
      food:  Math.floor(Math.random() * 35) + 10 + stageId * 4,
      iron:  Math.floor(Math.random() * 15) + 5,
      items,
    };
  }

  return { calculate, rollLoot };
})();
