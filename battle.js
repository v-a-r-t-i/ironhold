// battle.js — Battle pre-calculation engine

const Battle = (() => {

  function buildFighter(dwellerId) {
    const dw    = Game.getDweller(dwellerId);
    const stats = Game.getDwellerStats(dwellerId);
    const role  = Game.getDwellerRole(dwellerId);
    return {
      id:     dwellerId,
      name:   dw.name,
      emoji:  dw.emoji,
      role:   role.role,
      maxHp:  stats.hp,
      hp:     stats.hp,
      atk:    stats.atk,
      def:    stats.def,
      mdef:   stats.mdef,
      crit:   stats.crit,
      dodge:  stats.dodge,
      spd:    stats.spd,
      alive:  true,
    };
  }

  function resolveHit(attacker, target) {
    // Dodge
    if (Math.random() * 100 < target.dodge) {
      return { type: 'dodge', damage: 0, attacker: attacker.id, target: target.id };
    }
    // Crit
    const crit   = Math.random() * 100 < attacker.crit;
    let damage   = Math.max(1, attacker.atk - target.def * 0.5);
    if (crit) damage *= 2;
    damage = Math.max(1, Math.round(damage));
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp === 0) target.alive = false;
    return {
      type:   crit ? 'crit' : 'hit',
      damage, attacker: attacker.id, target: target.id,
    };
  }

  function pickTarget(attacker, enemies) {
    if (attacker.role === 'Archer' || attacker.role === 'Assassin') {
      // Lowest HP first
      return enemies.reduce((a, b) => a.hp < b.hp ? a : b);
    }
    return enemies[0]; // Front enemy
  }

  // ─── MAIN CALCULATE ──────────────────────────────────────
  function calculate(attackerIds, defenderIds) {
    const attackers = attackerIds.map(buildFighter);
    const defenders = defenderIds.map(buildFighter);
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
      winner:    won ? 'attacker' : 'defender',
      rounds:    log.length ? log[log.length - 1].round : 0,
      loot:      won ? rollLoot() : null,
      survivors: {
        attackers: attackers.filter(c => c.alive).map(c => c.id),
        defenders: defenders.filter(c => c.alive).map(c => c.id),
      },
    };
  }

  function rollLoot() {
    const roll = Math.random() * 100;
    const rarity = roll < 60 ? 'common' : roll < 88 ? 'rare' : roll < 98 ? 'epic' : 'legendary';
    return {
      rarity,
      gold: Math.floor(Math.random() * 60) + 25,
      food: Math.floor(Math.random() * 35) + 10,
    };
  }

  return { calculate };
})();
