import SPELLS from 'common/SPELLS';

import Module from 'Parser/Core/Module';

const debug = true;

class Atonement extends Module {
    healing = 0;
    totalAtones = 0;
  hasContrition = false;
  currentAtonementTargets = [];
  improperAtonementRefreshes = [];

  get atonementDuration() {
    return 15 + (this.hasContrition ? 3 : 0);
  }

  get numAtonementsActive(){
      return this.currentAtonementTargets.length;
  }
  on_initialized() {
      this.active = true;
    if (!this.owner.error) {
      this.hasContrition = this.owner.selectedCombatant.lv75Talent === SPELLS.CONTRITION_TALENT.id;
    }
  }

  on_byPlayer_applybuff(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.ATONEMENT.id) {
      return;
    }

    var atonement = {
        target: event.targetID,
        lastAtonmentAppliedTimestamp: event.timestamp
    };
    this.currentAtonementTargets = this.currentAtonementTargets.filter(id => id.target !== atonement.target);
    this.currentAtonementTargets.push(atonement);
    this.totalAtones++;
    debug && console.log(`%c${this.owner.combatants.players[atonement.target].name} gained an atonement`, 'color:green', this.currentAtonementTargets);
    this.owner.triggerEvent('atonement_applied', event);

  }
  on_byPlayer_refreshbuff(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.ATONEMENT.id) {
      return;
    }

    var atonement = {
        target: event.targetID,
        lastAtonmentAppliedTimestamp: event.timestamp
    };
    var refreshedTarget = this.currentAtonementTargets.find(id => id.target == atonement.target) || {};
    if (refreshedTarget == null){
        refreshedTarget.target = event.targetID;
        refreshedTarget.lastAtonmentAppliedTimestamp = this.owner.fight.start_time;
        debug && console.warn('Atonement: was applied prior to combat');
    }
    if ((event.timestamp - refreshedTarget.lastAtonmentAppliedTimestamp) < this.atonementDuration * 1000 - 3000) {
        this.improperAtonementRefreshes.push(refreshedTarget)
        debug && console.log(`%c${this.owner.combatants.players[atonement.target].name} refreshed an atonement too early %c${event.timestamp - refreshedTarget.lastAtonmentAppliedTimestamp}`, 'color:red', this.currentAtonementTargets);
    this.owner.triggerEvent('atonement_refresh_improper', event);
    }
    this.currentAtonementTargets = this.currentAtonementTargets.filter(id => id.target !== atonement.target);
    this.currentAtonementTargets.push(atonement);
    this.totalAtones++;
    debug && console.log(`%c${this.owner.combatants.players[atonement.target].name} refreshed an atonement`, 'color:green', this.currentAtonementTargets);
    this.owner.triggerEvent('atonement_refresh', event);
  }

    on_byPlayer_removebuff(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.ATONEMENT.id) {
      return;
    }
    var atonement = {
        target: event.targetID,
        lastAtonmentAppliedTimestamp: event.timestamp
    };
    this.currentAtonementTargets = this.currentAtonementTargets.filter(id => id.target !== atonement.target);
    debug && console.log(`%c${this.owner.combatants.players[atonement.target].name} lost an atonement`, 'color:yellow', this.currentAtonementTargets);
    this.owner.triggerEvent('atonement_faded', event);
  }


  on_byPlayer_heal(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.ATONEMENT.id) {
      return;
    }
    // if (!this.owner.toPlayer(event)) {
    //   return;
    // }
    if (this.lastAtonmentAppliedTimestamp === null) {
      // This can be `null` when Atonement wasn't applied in the combatlog. This often happens as Discs like to apply Atonement prior to combat.
      this.lastAtonmentAppliedTimestamp = this.owner.fight.start_time;
      debug && console.warn('Atonement: was applied prior to combat');
    }

    if ((event.timestamp - this.lastAtonmentAppliedTimestamp) < (this.atonementDuration * 1000)) {
      return;
    }

    debug && console.log('Atonement:', event.amount + (event.absorbed || 0), 'healing done to', event.targetID);
    this.healing += event.amount + (event.absorbed || 0);
  }
}

export default Atonement;
