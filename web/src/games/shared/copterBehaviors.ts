import type { BehaviorFactory, MovieRuntimeContext, SpriteInstance } from '../../engine/runtime/DirectorTypes.ts';
import { wrapWorldX } from './coreBehaviors.ts';

export function registerSharedCopterBehaviors(map: Map<string, BehaviorFactory>): void {
  map.set('Copter', () => {
    let gameState = 'FLY';
    let thisMember = 14;
    let delayCount = 0;
    let rotorToggle = 0;
    let throttle = 0.95;
    let xpos = 0;
    let ypos = 0;
    let xOffset = 0;
    let prevXvel = 0;
    let mapXPos = 0;
    let mapXTile = 1;
    let localXPercent = 0;
    let survivorOutDelay = 0;
    let smokeDelay = 0;
    let copterShadow!: SpriteInstance;
    const rad = Math.PI / 180;
    const grav = 1;

    const doKeys = (ctx: MovieRuntimeContext, sp: SpriteInstance) => {
      const g = ctx.globals;
      const inp = ctx.getInput();
      let tiltAngle = Number(sp.vars.tiltAngle ?? 0);
      let yVel = Number(sp.vars.Yvel ?? 0);

      g.gXVel += g.gXVelChange;
      g.gXVelChange = 0;

      if (g.gWaterFlow === 0) {
        if (inp.axes.moveX !== 0) {
          tiltAngle = Math.max(-30, Math.min(30, tiltAngle + inp.axes.moveX * 1.2));
        }
        if (inp.actions.action.isPressed) {
          g.gXVel *= 0.95;
          tiltAngle *= 0.95;
        }
      } else {
        g.gXVel *= 0.9;
        tiltAngle *= 0.9;
      }

      if (g.gfuelPercent > 0 && g.gDamagePercent < 100) {
        if (g.gProControls === 1) {
          if (inp.axes.throttle !== 0) {
            throttle = Math.max(0.5, Math.min(2.0, throttle + inp.axes.throttle * 0.01));
          }
          yVel += grav;
          const yForce = -throttle * Math.cos(tiltAngle * rad);
          g.gXVel -= throttle * Math.sin(tiltAngle * rad);
          yVel += yForce;
          g.gXVel *= 0.95;
          yVel *= 0.95;
        } else {
          if (inp.axes.throttle !== 0) {
            yVel -= inp.axes.throttle * 0.3;
          }
          yVel += 0.01;
          g.gXVel -= throttle * Math.sin(tiltAngle * rad);
          g.gXVel *= 0.95;
          yVel *= 0.95;
        }
      } else {
        if (g.gProControls === 1) {
          yVel += grav;
          const yForce = -throttle * Math.cos(tiltAngle * rad);
          g.gXVel -= throttle * Math.sin(tiltAngle * rad);
          yVel += yForce;
          g.gXVel *= 0.95;
          yVel *= 0.95;
          throttle = 0.5;
        } else {
          yVel += 0.5;
          g.gXVel -= throttle * Math.sin(tiltAngle * rad);
          g.gXVel *= 0.95;
          yVel *= 0.95;
        }
      }

      if (ypos < 10) {
        yVel += (10 - ypos) * 0.05;
        if (throttle > 1.5) throttle = 1.5;
      }

      sp.vars.tiltAngle = tiltAngle;
      sp.vars.Yvel = yVel;
    };


    const doGroundHeight = (ctx: MovieRuntimeContext, sp: SpriteInstance) => {
      const g = ctx.globals;
      const cnt = g.gTileIDList.length || 1;
      const worldW = cnt * 128;
      let tiltAngle = Number(sp.vars.tiltAngle ?? 0);
      let yVel = Number(sp.vars.Yvel ?? 0);

      g.gCopterTile = 0;
      if (mapXPos > worldW) mapXPos -= worldW;
      if (mapXPos < 0) mapXPos += worldW;

      const temp = ((mapXPos - 0.5) % 128 + 128) % 128;
      const temp1 = mapXPos - temp;
      mapXTile = Math.trunc(temp1 / 128) + 1;
      if (mapXTile < 1) mapXTile = 1;
      if (mapXTile > cnt) mapXTile = cnt;
      localXPercent = (mapXPos - (mapXTile - 1) * 128) / 128;

      const tempID = g.gTileIDList[mapXTile - 1] ?? 0;
      const hLeft = g.gTileHeightList[mapXTile - 1] ?? 0;
      const nextTile = mapXTile + 1 > cnt ? 1 : mapXTile + 1;
      const hRight = g.gTileHeightList[nextTile - 1] ?? 0;
      const groundDiff = hRight - hLeft;
      const diff = ypos + 16 + yVel - (280 - hLeft) + groundDiff * localXPercent;

      copterShadow.locH = sp.locH;
      copterShadow.locV = 280 - hLeft - groundDiff * localXPercent;

      if (diff >= 0) {
        switch (tempID) {
          case 0:
            if (!ctx.soundBusy(3)) ctx.puppetSound(3, 10);
            yVel -= diff * 0.03;
            g.gXVel *= 0.9;
            if (throttle < 0.5) throttle = 0.5;
            tiltAngle *= 0.8;
            g.gDamagePercent += 1;
            break;
          case 1: case 5: case 6: case 7: case 8: case 9:
            yVel -= diff;
            if (throttle < 0.8) throttle = 0.8;
            if (diff > 2 || Math.abs(g.gXVel) > 2) {
              g.gDamagePercent += Math.abs(g.gXVel) * 2 + (diff - 2) * 2;
              if (!ctx.soundBusy(3)) ctx.puppetSound(3, 27);
            }
            g.gXVel = 0;
            tiltAngle *= 0.8;
            break;
          case 2: case 3:
            if (!ctx.soundBusy(3)) ctx.puppetSound(3, 10);
            yVel -= diff * 0.04;
            g.gXVel *= 0.5;
            if (throttle < 0.8) throttle = 0.8;
            tiltAngle *= 0.8;
            g.gDamagePercent += 1;
            break;
          case 4:
            g.gCopterTile = mapXTile;
            if (g.gRescuedList.length > 0) {
              survivorOutDelay++;
              if (survivorOutDelay >= 16) {
                const surv = g.gRescuedList.shift()!;
                surv.vars.survivorState = 'GOTOHQ';
                surv.vars.distToHQ = 67 + 128 * localXPercent;
                surv.vars.Xvel = -1;
                surv.vars.Xpos = xpos;
                survivorOutDelay = 0;
              }
            }
            yVel -= diff;
            if (throttle < 0.8) throttle = 0.8;
            if (diff > 2 || Math.abs(g.gXVel) > 3) {
              g.gDamagePercent += Math.abs(g.gXVel) * 2 + (diff - 3) * 2;
              if (!ctx.soundBusy(3)) ctx.puppetSound(3, 27);
            }
            g.gfuelPercent = Math.min(100, g.gfuelPercent + 0.8);
            if (g.gfuelPercent < 100 && !ctx.soundBusy(3)) {
              ctx.puppetSound(3, 12);
            }
            g.gXVel = 0;
            tiltAngle *= 0.8;
            break;
        }
      }

      if (g.gDamagePercent > 70) {
        smokeDelay++;
        if (smokeDelay >= 6) {
          if (g.gSmokeList.length > 0) {
            const sm = g.gSmokeList.shift()!;
            sm.vars.smokeState = 'SMOKE';
            sm.vars.Xpos = xpos;
            sm.vars.Ypos = ypos;
          }
          smokeDelay = 0;
        }
      }

      mapXPos -= g.gXVel;
      sp.vars.tiltAngle = tiltAngle;
      sp.vars.Yvel = yVel;
    };

    return {
      name: 'Copter',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        const map = ctx.bundle.mapsByLevel.get(g.gLevel) ?? ctx.bundle.mapsByLevel.get(1);
        g.gTileIDList = map ? [...map.tileIds] : [0];
        g.gTileHeightList = map ? [...map.tileHeights] : [0];
        g.gSceneryList = map ? [...map.sceneryIds] : [0];
        g.gAbducteeList = [];
        copterShadow = ctx.sprite(sp.spriteNum + 5);
        copterShadow.locZ = 1500;
        sp.vars.tiltAngle = 0;
        sp.vars.Yvel = 0;
        thisMember = 14;
        delayCount = 0;
        rotorToggle = 0;
        throttle = 0.95;
        ypos = sp.locV;
        xpos = sp.locH;
        g.gXVel = 0;
        g.gXOffset = 0;
        xOffset = 0;
        prevXvel = 0;
        gameState = 'FLY';
        g.gPaused = 0;
        mapXPos = 256 - 64 - xpos + (g.gTileIDList.length / 2) * 128;
        g.gCopterTile = 0;
        g.gfuelPercent = 100;
        sp.locZ = 100;
        g.gScore = 0;
        g.gDamagePercent = 0;
        ctx.puppetSound(1, 7);
        g.gCableItem = 0;
        g.gCableLength = 0;
        g.gRescueCount = 0;
        g.gRescuedList = [];
        survivorOutDelay = 0;
        g.gSmokeList = [];
        smokeDelay = 0;
        g.gPickupList = [];
        g.gGuyDoom = null;
        g.gPloshList = [];
        g.gWaterFlow = 0;
        g.gPloshX = -1;
        g.gXVelChange = 0;
        g.gCoconuts = 0;
        g.gCoconutList = [];
      },
      exitFrame(ctx, sp) {
        if (ctx.globals.gPaused !== 0 || gameState !== 'FLY') return;
        doKeys(ctx, sp);
        const g = ctx.globals;
        if (g.gfuelPercent > 0) {
          g.gfuelPercent = Math.max(0, g.gfuelPercent - throttle * 0.05);
        }
        if (delayCount === 2) {
          if (g.gXVel < -2 && thisMember < 21) thisMember++;
          else if (g.gXVel > 2 && thisMember > 1) thisMember--;
          delayCount = 0;
          rotorToggle = rotorToggle === 1 ? 0 : 1;
        }
        delayCount++;
        sp.member = thisMember + rotorToggle * 21;
        const tiltAngle = Number(sp.vars.tiltAngle ?? 0);
        const yVel = Number(sp.vars.Yvel ?? 0);
        sp.rotation = tiltAngle;
        ypos += yVel;
        if (g.gXVel > 4) xOffset += (g.gXVel - 4) * 1.25;
        if (g.gXVel < -4) xOffset += (g.gXVel + 4) * 1.25;
        xOffset *= g.gProControls === 1 ? 0.9 : 0.97;
        g.gXOffset = xOffset - prevXvel;
        prevXvel = xOffset;
        xpos += g.gXOffset;
        sp.locH = xpos;
        sp.locV = ypos;
        doGroundHeight(ctx, sp);
      },
    };
  });


  map.set('CableGuy', () => {
    let thisMember = 0;
    let copter!: SpriteInstance;
    let cable!: SpriteInstance;
    let cableGuyOverlay!: SpriteInstance;
    let cableGuyBubbles!: SpriteInstance;
    let prevSpace = false;
    let xpos = 0;
    let ypos = 0;
    let mapXPos = 0;
    let prevGroundID = -1;
    let frameDir = 1;
    let winchWait = 0;
    let oofCount = 1;

    const doGroundHeight1 = (ctx: MovieRuntimeContext, sp: SpriteInstance) => {
      const g = ctx.globals;
      const cnt = g.gTileIDList.length || 1;
      const worldW = cnt * 128;
      let xvel = Number(sp.vars.Xvel ?? 0);
      let yvel = Number(sp.vars.Yvel ?? 0);

      mapXPos += xvel;
      if (mapXPos > worldW) mapXPos -= worldW;
      if (mapXPos < 0) mapXPos += worldW;

      const temp = ((mapXPos - 0.5) % 128 + 128) % 128;
      const mapXTile = Math.max(1, Math.min(cnt, Math.trunc((mapXPos - temp) / 128) + 1));
      const localXPercent = (mapXPos - (mapXTile - 1) * 128) / 128;
      const tempID = g.gTileIDList[mapXTile - 1] ?? 0;
      const hLeft = g.gTileHeightList[mapXTile - 1] ?? 0;
      const nextTile = mapXTile + 1 > cnt ? 1 : mapXTile + 1;
      const hRight = g.gTileHeightList[nextTile - 1] ?? 0;
      const diff = ypos + 5 + yvel - (280 - hLeft) + (hRight - hLeft) * localXPercent;

      if (diff >= 0) {
        if (tempID === 0 || tempID === 7) {
          yvel -= diff * 0.01;
          xvel *= 0.95;
          if (prevGroundID === -1) {
            ctx.puppetSound(4, 6);
            cableGuyOverlay.vars.overlayState = 'StartSplash';
            cableGuyOverlay.vars.Xpos = xpos;
            cableGuyOverlay.vars.Ypos = ypos + yvel;
          } else {
            if (!ctx.soundBusy(4)) ctx.puppetSound(4, 1);
            cableGuyBubbles.locH = sp.locH - 10 + ctx.random(20);
            cableGuyBubbles.locV = 280 + ctx.random(5);
            if (g.gCableLength >= 100) {
              sp.vars.sharkCounter = Number(sp.vars.sharkCounter ?? 0) + 1;
            }
          }
        } else if (tempID === 1 || tempID === 5 || tempID === 6 || tempID === 4) {
          if (prevGroundID === -1 || (tempID !== 4 && Math.abs(xvel) > 0.5)) {
            if (!ctx.soundBusy(4)) {
              oofCount = oofCount >= 12 ? 1 : oofCount + 1;
              ctx.puppetSound(4, 44 + oofCount);
            }
          }
          yvel -= diff;
          xvel *= 0.5;
        } else if (tempID === 2 || tempID === 3) {
          yvel -= diff * 0.02;
          xvel *= 0.5;
          if (prevGroundID === -1) {
            ctx.puppetSound(4, 6);
            cableGuyOverlay.vars.overlayState = 'StartSplash';
            cableGuyOverlay.vars.Xpos = xpos;
            cableGuyOverlay.vars.Ypos = ypos + yvel * 2;
          } else {
            if (!ctx.soundBusy(4)) ctx.puppetSound(4, 1);
            cableGuyBubbles.locH = sp.locH - 10 + ctx.random(20);
            cableGuyBubbles.locV = 280 + ctx.random(5);
          }
        }
        prevGroundID = tempID;
      } else {
        const sc = Number(sp.vars.sharkCounter ?? 0);
        if (prevGroundID === 0 || prevGroundID === 2 || prevGroundID === 3) {
          if (sc < 150) ctx.puppetSound(4, 4);
          else { ctx.puppetSound(1, 17); g.gGuyDoom = 'SHARK'; }
        } else if (prevGroundID === 7) {
          if (sc < 150) ctx.puppetSound(4, 4);
          else { ctx.puppetSound(1, 17); g.gGuyDoom = 'ICECUBE'; }
        } else if (prevGroundID === 1 || prevGroundID === 6) {
          if (sc < 150 && !ctx.soundBusy(4)) ctx.puppetSound(4, 3);
        }
        prevGroundID = -1;
      }
      sp.vars.Xvel = xvel;
      sp.vars.Yvel = yvel;
    };


    return {
      name: 'CableGuy',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        thisMember = sp.member;
        copter = ctx.sprite(sp.spriteNum - 2);
        cable = ctx.sprite(sp.spriteNum - 1);
        cableGuyOverlay = ctx.sprite(sp.spriteNum + 1);
        cableGuyBubbles = ctx.sprite(sp.spriteNum + 2);
        sp.vars.cableState = 'GOUP';
        prevSpace = false;
        xpos = copter.locH - 5;
        ypos = copter.locV;
        sp.vars.Xvel = 0;
        sp.vars.Yvel = 0;
        sp.locH = xpos;
        sp.locV = ypos;
        mapXPos = 256 - 64 - 5 - xpos + (ctx.globals.gTileIDList.length / 2) * 128;
        prevGroundID = -1;
        cableGuyOverlay.locZ = 1001;
        cable.locZ = 101;
        sp.locZ = 102;
        cableGuyBubbles.locZ = -1002;
        sp.vars.sharkCounter = 0;
        frameDir = 1;
        sp.vars.speechCounter = ctx.random(7);
        winchWait = 0;
        oofCount = 1;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const spaceDown = ctx.getInput().actions.action.isPressed;
        xpos += g.gXVel + g.gXOffset;
        let xvel = Number(sp.vars.Xvel ?? 0);
        let yvel = Number(sp.vars.Yvel ?? 0);

        if (sp.vars.cableState === 'GOUP') {
          if (!spaceDown && prevSpace && winchWait < 15) {
            sp.vars.cableState = 'GODOWN';
            if (g.gCableLength === 0) {
              const sc = Number(sp.vars.speechCounter ?? 1);
              if (!ctx.soundBusy(4)) ctx.puppetSound(4, 56 + sc);
              sp.vars.speechCounter = sc >= 7 ? 1 : sc + 1;
              ctx.puppetSound(3, 20);
            }
          }
          if (spaceDown) winchWait++;
          else winchWait = 0;
          if (g.gCableLength > 0) {
            g.gCableLength = Math.max(0, g.gCableLength - 1.5);
          } else {
            xvel = 0;
            yvel = 0;
          }
          sp.rotation = 0;
        } else {
          if (!spaceDown && prevSpace) {
            sp.vars.cableState = 'GOUP';
            ctx.puppetSound(3, 21);
            winchWait = 0;
          }
          if (g.gCableLength < 100) {
            g.gCableLength = Math.min(100, g.gCableLength + 1.5);
          }
          sp.rotation = 0;
        }
        prevSpace = spaceDown;

        yvel += 0.5;
        const xx = copter.locH - 5 - (xpos + xvel);
        const yy = copter.locV - (ypos + yvel);
        const hh = Math.hypot(xx, yy) || 1e-6;
        const diffLen = g.gCableLength - hh;
        if (diffLen < 0) {
          xvel -= (xx / hh) * diffLen;
          yvel -= (yy / hh) * diffLen;
        }
        yvel *= 0.95;
        xvel *= 0.98;
        xpos += xvel;
        ypos += yvel;
        sp.vars.Xvel = xvel;
        sp.vars.Yvel = yvel;
        sp.locH = xpos;
        sp.locV = ypos;

        cable.locH = copter.locH - 5;
        cable.locV = copter.locV;
        cable.rotation = ctx.angleGrind(copter.locH - 5, copter.locV, xpos, ypos) - 90;
        cable.height = Math.hypot(copter.locH - xpos, copter.locV - ypos);

        doGroundHeight1(ctx, sp);
        if (Number(sp.vars.sharkCounter ?? 0) >= 150) {
          thisMember += frameDir;
          if (thisMember > 83) { thisMember = 83; frameDir = -frameDir; }
          if (thisMember < 74) { thisMember = 74; frameDir = -frameDir; }
          if (ctx.bundle.gameId === 'rescueblade' && g.gLevel === 8) thisMember = 198;
          sp.member = thisMember;
        }
      },
    };
  });


  map.set('Survivor', (params) => {
    const targetSpriteNum = Number(params?.targetSprite ?? 1);
    const offArr = Array.isArray(params?.targetOffset) ? (params!.targetOffset as number[]) : [0, 0];
    const offX = offArr[0] ?? 0;
    const offY = offArr[1] ?? 0;
    let startMember = 0;
    let thisMember = 0;
    let loopX = 0;
    let loopWidth = 0;
    let survivorDelay = 0;
    let cableGuy!: SpriteInstance;
    let thisWidth = 0;
    let thisHalfHeight = 0;
    let grabCount = 0;
    let frameDir = 1;
    let ypos = 0;

    return {
      name: 'Survivor',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        startMember = sp.member;
        thisMember = ctx.random(3) + startMember - 1;
        sp.member = thisMember;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        sp.vars.Xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 60;
        sp.vars.Xvel = 0;
        survivorDelay = 0;
        cableGuy = ctx.sprite(6);
        sp.vars.survivorState = 'ONGROUND';
        thisWidth = sp.width;
        thisHalfHeight = sp.height / 2;
        grabCount = 0;
        sp.vars.distToHQ = 0;
        frameDir = 1;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const st = sp.vars.survivorState;
        if (st === 'ONGROUND') {
          if (targetSpriteNum === sp.spriteNum) {
            sp.vars.Xpos = wrapWorldX(Number(sp.vars.Xpos) + g.gXVel + g.gXOffset, loopX, loopWidth);
            sp.locH = Number(sp.vars.Xpos);
          } else {
            const tgt = ctx.sprite(targetSpriteNum);
            sp.locH = tgt.locH + offX;
            sp.locV = tgt.locV + offY;
          }
          survivorDelay++;
          if (survivorDelay >= 5) {
            survivorDelay = 0;
            if (thisMember + frameDir > startMember + 2 || thisMember + frameDir < startMember) {
              frameDir = -frameDir;
            }
            thisMember += frameDir;
            sp.member = thisMember;
            const dx = Math.abs(sp.locH - cableGuy.locH);
            const dy = Math.abs(sp.locV - cableGuy.locV);
            if (dx < thisWidth && dy < thisHalfHeight) {
              grabCount++;
              if (grabCount >= 2 && g.gCableItem === 0 && g.gCableLength >= 50) {
                sp.vars.survivorState = 'ONCABLE';
                ctx.puppetSound(4, 63 + Number(cableGuy.vars.speechCounter ?? 1));
                g.gCableItem = 1;
              }
            } else {
              grabCount = 0;
            }
          }
        } else if (st === 'ONCABLE') {
          sp.locH = cableGuy.locH;
          sp.locV = cableGuy.locV;
          if (g.gCableLength === 0) {
            g.gCableItem = 0;
            sp.vars.survivorState = 'INCOPTER';
            if (ctx.bundle.gameId === 'bermuda') g.gRescueCount += 1;
            g.gScore += 500;
            ctx.puppetSound(3, 8);
            g.gRescuedList.push(sp);
          }
        } else if (st === 'INCOPTER') {
          sp.locH = -1000;
          sp.locV = -1000;
        } else if (st === 'GOTOHQ') {
          thisMember = thisMember + 1 > startMember + 2 ? startMember : thisMember + 1;
          sp.member = thisMember;
          if (Number(sp.vars.distToHQ ?? 0) <= 0) {
            sp.vars.Xvel = 0;
            sp.blend -= 5;
            if (sp.blend <= 0) {
              sp.vars.survivorState = 'HOME';
              g.gRescueCount += 1;
              g.gScore += 1000;
              ctx.puppetSound(3, 8);
            }
          }
          sp.vars.Xpos = Number(sp.vars.Xpos) + g.gXVel + g.gXOffset + Number(sp.vars.Xvel ?? 0);
          sp.vars.distToHQ = Number(sp.vars.distToHQ ?? 0) + Number(sp.vars.Xvel ?? 0);
          ypos = 270;
          sp.locH = Number(sp.vars.Xpos);
          sp.locV = ypos;
        } else if (st === 'HOME') {
          sp.locH = -1000;
          sp.locV = -1000;
        }
      },
    };
  });


  map.set('Pickups', () => {
    let cableGuy!: SpriteInstance;
    return {
      name: 'Pickups',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        sp.locH = -1000;
        sp.locV = -1000;
        sp.locZ = 60;
        sp.vars.pickupID = 'TREASURE';
        sp.vars.pickupState = 'NULL';
        sp.vars.pickupTile = 0;
        sp.vars.pickupMaster = null;
        cableGuy = ctx.sprite(6);
        ctx.globals.gPickupList.push(sp);
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const st = sp.vars.pickupState;
        if (st === 'NULL') {
          sp.locH = -1000;
          sp.locV = -1000;
        } else if (st === 'ONGROUND') {
          const dx = Math.abs(sp.locH - cableGuy.locH);
          const dy = Math.abs(sp.locV - cableGuy.locV);
          if (dx <= 10 && dy <= 20 && g.gCableItem === 0 && g.gCableLength >= 50) {
            sp.vars.pickupState = 'ONCABLE';
            const master = sp.vars.pickupMaster as { clearPickup?: () => void } | null;
            master?.clearPickup?.();
            sp.vars.pickupMaster = null;
            const pid = sp.vars.pickupID;
            if (pid === 'TREASURE') {
              ctx.puppetSound(4, 15);
              g.gSceneryList[Number(sp.vars.pickupTile) - 1] = 0;
            } else if (pid === 'FUEL') {
              ctx.puppetSound(4, 10);
              g.gSceneryList[Number(sp.vars.pickupTile) - 1] = 0;
            } else if (pid === 'TOOLS') {
              g.gSceneryList[Number(sp.vars.pickupTile) - 1] = 0;
            } else if (pid === 'COCONUTS') {
              ctx.puppetSound(4, 89);
            }
            g.gCableItem = 1;
          }
        } else if (st === 'ONCABLE') {
          sp.locH = cableGuy.locH;
          sp.locV = cableGuy.locV + 10;
          if (g.gCableLength === 0) {
            g.gCableItem = 0;
            sp.vars.pickupState = 'NULL';
            const pid = sp.vars.pickupID;
            if (pid === 'TREASURE') {
              g.gScore += 1234;
              ctx.puppetSound(3, 16);
            } else if (pid === 'FUEL' && g.gfuelPercent > 0) {
              g.gScore += 10;
              g.gfuelPercent = 100;
              ctx.puppetSound(3, 19);
            } else if (pid === 'TOOLS' && g.gDamagePercent < 100) {
              g.gScore += 10;
              g.gDamagePercent = 0;
              ctx.puppetSound(3, 18);
            } else if (pid === 'COCONUTS') {
              g.gCoconuts = 10;
              ctx.puppetSound(4, 90);
            }
            g.gPickupList.push(sp);
          }
        }
      },
    };
  });

  map.set('WaterNozzle', () => {
    let copter!: SpriteInstance;
    let cableGuy!: SpriteInstance;
    let nozzleAngle = 0;
    let ploshDelay = 3;
    let sprayWait = 0;
    let prevWaterFlow = 0;
    const rad = Math.PI / 180;
    return {
      name: 'WaterNozzle',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        cableGuy = ctx.sprite(6);
        copter = ctx.sprite(4);
        nozzleAngle = 0;
        sp.locZ = 99;
        prevWaterFlow = 0;
        ploshDelay = 3;
        sprayWait = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const inp = ctx.getInput();
        g.gPloshX = -1;
        if (inp.axes.moveX !== 0) {
          nozzleAngle -= inp.axes.moveX * 6;
        }
        if (inp.actions.action.isPressed) {
          if (prevWaterFlow === 0) {
            if (sprayWait >= 15) {
              if (g.gCoconuts === 0) ctx.puppetSound(3, 33);
              g.gWaterFlow = 1;
              cableGuy.vars.cableState = 'GOUP';
            } else {
              sprayWait++;
            }
          }
        } else {
          sprayWait = 0;
          g.gWaterFlow = 0;
          if (prevWaterFlow === 1 && ctx.soundMember(3) === 33) {
            ctx.puppetSound(3, 0);
          }
        }
        prevWaterFlow = g.gWaterFlow;
        nozzleAngle *= 0.95;
        sp.rotation = nozzleAngle;
        sp.locH = copter.locH;
        sp.locV = copter.locV + 10;
        if (g.gWaterFlow === 1) {
          ploshDelay += g.gCoconuts > 0 ? 0.2 : 1;
          if (ploshDelay >= 3) {
            if (g.gPloshList.length > 0) {
              const p = g.gPloshList.shift()!;
              if (g.gCoconuts > 0) {
                g.gCoconuts--;
                p.rotation = 0;
                p.member = 200;
                p.width = 16;
                p.height = 16;
                g.gCoconutList.push(p);
                ctx.puppetSound(3, 71);
              } else {
                if (ctx.soundMember(3) !== 33) ctx.puppetSound(3, 33);
                if (ctx.bundle.gameId === 'bermuda') p.member = 126;
              }
              p.vars.ploshState = 'PLOSH';
              p.vars.Xvel = 8 * Math.sin(-nozzleAngle * rad);
              p.vars.Yvel = 8 * Math.cos(-nozzleAngle * rad);
              p.vars.Xpos = sp.locH;
              p.vars.Ypos = sp.locV;
              p.rotation = nozzleAngle;
            }
            ploshDelay = 0;
          }
        } else {
          ploshDelay = 3;
        }
      },
    };
  });


  map.set('WaterPlosh', () => {
    return {
      name: 'WaterPlosh',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        sp.vars.Xpos = -1000;
        sp.vars.Ypos = -1000;
        sp.vars.Yvel = -2;
        sp.vars.Xvel = 0;
        sp.vars.ploshState = 'NULL';
        sp.locZ = 98;
        ctx.globals.gPloshList.push(sp);
        sp.height = 30;
        sp.width = 2;
        sp.locH = -1000;
        sp.locV = -1000;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0 || sp.vars.ploshState !== 'PLOSH') return;
        let yvel = Number(sp.vars.Yvel ?? 0) + 0.8;
        let xvel = Number(sp.vars.Xvel ?? 0);
        let xpos = Number(sp.vars.Xpos ?? 0) + g.gXVel + g.gXOffset + xvel;
        const ypos = Number(sp.vars.Ypos ?? 0) + yvel;
        xvel *= 0.98;
        yvel *= 0.95;
        sp.rotation *= 0.9;
        if (sp.member !== 200 && sp.width < 50) {
          sp.width += 4;
          sp.height += 2;
        }
        sp.vars.Xpos = xpos;
        sp.vars.Ypos = ypos;
        sp.vars.Xvel = xvel;
        sp.vars.Yvel = yvel;
        sp.locH = xpos;
        sp.locV = ypos;
        if (sp.locV > 280) {
          if (ctx.bundle.gameId !== 'bermuda' || sp.member === 126) {
            g.gPloshX = sp.locH;
          }
          sp.vars.ploshState = 'NULL';
          g.gPloshList.push(sp);
          sp.vars.Xpos = -1000;
          sp.vars.Ypos = -1000;
          sp.vars.Xvel = 0;
          sp.vars.Yvel = 0;
          sp.locH = -1000;
          sp.locV = -1000;
          if (ctx.bundle.gameId === 'bermuda') sp.member = 126;
          sp.width = 2;
          sp.height = 30;
          const idx = g.gCoconutList.indexOf(sp);
          if (idx !== -1) g.gCoconutList.splice(idx, 1);
        }
      },
    };
  });


  map.set('Mission', () => {
    let missionState = 'START';
    let missionCounter = 0;
    let tileVisitList: number[] = [];
    const completeMission = (ctx: MovieRuntimeContext, sp: SpriteInstance, msg: string) => {
      const g = ctx.globals;
      g.gLevelResult = 'COMPLETE';
      missionState = 'COMPLETE';
      sp.locH = 78;
      sp.locV = 32;
      sp.text = `MISSION COMPLETE\n${msg}\nTimeBonus = ${g.gTimeBonus}`;
      g.gScore += g.gTimeBonus;
      // Only level 1 of each game shows the time bonus as flying points.
      if (g.gLevel === 1) g.gFlyingPoints = g.gTimeBonus;
      ctx.puppetSound(1, 23);
      if ((g.gLevelScoreList[g.gLevel - 1] ?? 0) < g.gScore) {
        g.gLevelScoreList[g.gLevel - 1] = g.gScore;
        sp.text += '\nNEW HI-SCORE!';
      }
    };

    return {
      name: 'Mission',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        g.gLevelResult = null;
        missionState = 'START';
        tileVisitList = [];
        for (let i = 0; i < g.gTileIDList.length; i++) {
          if (g.gTileIDList[i] === 4) tileVisitList.push(i + 1);
        }
        if (ctx.bundle.gameId === 'bermuda') {
          switch (g.gLevel) {
            case 1:
              sp.text = 'Rescue all holiday guests!\nAvoid debris and hazards at all costs.';
              g.gTimeBonus = 2200;
              ctx.puppetSound(3, 76);
              break;
            case 2:
              sp.text = 'Fight off the UFOs.\nRescue all the guests\nand return them to the hotel!';
              g.gTimeBonus = 8000;
              break;
            case 3:
              sp.text = 'Save all survivors.\nTry to get rid of the Bodzillas!';
              g.gTimeBonus = 9000;
              break;
            default:
              sp.text = 'Grab as much sunken treasure as you can!\nHOLD SPACEBAR to snap the plane wrecks!';
              g.gTimeBonus = 9000;
              g.gCoconuts = 12;
              break;
          }
        } else {
          switch (g.gLevel) {
            case 1:
              sp.text = 'Touch down on every HeliPad\nand ring each Bell Buoy.';
              g.gTimeBonus = 2200;
              break;
            case 2:
              g.gDamagePercent = 50;
              sp.text = 'Use the cable guy to grab every pickup.\nQuickly TAP SPACEBAR to winch UP / DOWN.';
              g.gTimeBonus = 2200;
              break;
            case 3:
              sp.text = 'HOLD DOWN SPACEBAR to spray!\nExtinguish all\nburning Palm Trees!';
              g.gTimeBonus = 5000;
              break;
            case 4:
              sp.text = 'Rescue all the oil rig workers!\nAvoid Seagulls and other aircraft.';
              g.gTimeBonus = 5000;
              break;
            case 5:
              sp.text = "You are cleared for take off.\nHurry! They can't survive much longer!";
              g.gTimeBonus = 5000;
              break;
            case 6:
              sp.text = 'Save the workers.\nPULL UP the three fuel rods,\nand SPRAY to cool them down!';
              g.gTimeBonus = 7000;
              break;
            case 7:
              sp.text = 'Save the researchers and\nfind a way to put out the fires!';
              g.gTimeBonus = 7000;
              break;
            case 8:
              sp.text = "Save the sailors.\nUnscrew the WarHeads then\ndrop them into the ship's hold!";
              g.gTimeBonus = 7000;
              break;
            default:
              sp.text = '';
              g.gTimeBonus = 7000;
              break;
          }
        }
        sp.locZ = 2100;
        sp.blend = 0;
        missionCounter = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const inp = ctx.getInput();
        if (missionState === 'START') {
          if (inp.axes.throttle > 0.25 || inp.actions.up.isPressed || inp.actions.confirm.justPressed) {
            missionState = 'STARTFADEOUT';
          }
          if (sp.blend < 100) sp.blend += 5;
        } else if (missionState === 'STARTFADEOUT') {
          sp.blend -= 5;
          if (sp.blend <= 0) {
            sp.blend = 0;
            sp.locH = -1000;
            sp.locV = -1000;
            missionState = 'RUNNING';
          }
        } else if (missionState === 'RUNNING') {

          if (g.gTimeBonus > 0) g.gTimeBonus--;
          if (ctx.bundle.gameId === 'bermuda') {
            if (g.gLevel === 1 && g.gRescueCount >= 9) completeMission(ctx, sp, 'You saved all the guests!');
            else if (g.gLevel === 2 && g.gRescueCount >= 16) completeMission(ctx, sp, 'Alien Invaders Repelled!');
            else if (g.gLevel === 3 && g.gRescueCount >= 36) completeMission(ctx, sp, 'Brilliant Bodzilla Bonking!');
            else if (g.gLevel === 4 && g.gRescueCount >= 9) {
              completeMission(ctx, sp, 'cableGuy has ample holiday cash to splash!\nSuperb submarine skill skipper!');
            }
          } else {
            if (g.gLevel === 1) {
              const prevLen = tileVisitList.length;
              if (g.gCopterTile !== g.gTileIDList.length / 2) {
                tileVisitList = tileVisitList.filter((t) => t !== g.gCopterTile);
                if (prevLen > tileVisitList.length) {
                  ctx.puppetSound(3, 8);
                  g.gScore += 100;
                  g.gFlyingPoints = 100;
                }
              } else if (tileVisitList.length === 1) {
                tileVisitList = [];
              }
              if (tileVisitList.length === 0 && g.gScore >= 500) {
                completeMission(ctx, sp, 'Superb piloting skills!');
              }
            } else if (g.gLevel === 2 && g.gCopterTile === g.gTileIDList.length / 2 && (g.gScore === 1264 || g.gScore === 2264 || g.gScore === 3264)) {
              completeMission(ctx, sp, 'Great winch control!');
            } else if (g.gLevel === 3 && g.gRescueCount >= 5) {
              completeMission(ctx, sp, 'Great fire fighting!');
            } else if (g.gLevel === 4 && g.gRescueCount >= 7) {
              completeMission(ctx, sp, 'You saved every single survivor!');
            } else if (g.gLevel === 5 && g.gRescueCount >= 12) {
              completeMission(ctx, sp, 'You saved every single survivor!');
            } else if (g.gLevel === 6 && g.gRescueCount >= 7 && g.gRescuedList.length >= 8) {
              completeMission(ctx, sp, 'Incredible bravery!');
            } else if (g.gLevel === 7 && g.gRescueCount >= 9) {
              completeMission(ctx, sp, 'Nice SnowBall!');
            } else if (g.gLevel === 8 && g.gRescueCount >= 3 && g.gRescuedList.length >= 9) {
              completeMission(ctx, sp, 'All WarHeads Disarmed!');
            } else if (g.gLevel === 9 && g.gRescueCount >= 1) {
              completeMission(ctx, sp, 'YES! You saved cableGuy!\nTRULY SUPERB FLYING!');
            }
          }

          // The original runs these four checks one after another, so when more
          // than one applies the last one wins (e.g. no fuel + wrecked copter
          // reads "OUT OF FUEL!").
          if (g.gDamagePercent >= 100) {
            g.gLevelResult = 'DAMAGE';
            missionState = 'FAILED';
            sp.locH = 78; sp.locV = 32;
            sp.text = 'MISSION FAILED\nEXTREME DAMAGE!';
            ctx.puppetSound(1, 24);
            ctx.puppetSound(4, 84);
          }
          if (g.gfuelPercent <= 0) {
            g.gLevelResult = 'FUEL';
            missionState = 'FAILED';
            sp.locH = 78; sp.locV = 32;
            sp.text = 'MISSION FAILED\nOUT OF FUEL!';
            ctx.puppetSound(1, 24);
          }
          if (g.gGuyDoom === 'SHARK') {
            g.gLevelResult = 'SHARK';
            missionState = 'FAILED';
            sp.locH = 78; sp.locV = 32;
            sp.text =
              ctx.bundle.gameId === 'bermuda'
                ? 'MISSION FAILED\nA blue Marlin ate cableGuy!\n(Nice catch though)'
                : "MISSION FAILED\nDon't dunk your cableGuy!";
          }
          if (g.gGuyDoom === 'ICECUBE') {
            g.gLevelResult = 'ICECUBE';
            missionState = 'FAILED';
            sp.locH = 78; sp.locV = 32;
            sp.text = 'MISSION FAILED\nYou froze your cableGuy!';
          }
        } else if (missionState === 'FAILED') {
          if (sp.blend < 100) sp.blend += 5;
          missionCounter++;
          if (missionCounter >= 200) {
            for (let ch = 1; ch <= 4; ch++) ctx.puppetSound(ch, 0);
            ctx.go(ctx.currentFrame - 1);
          }
        } else if (missionState === 'COMPLETE') {
          if (sp.blend < 100) sp.blend += 5;
          missionCounter++;
          if (missionCounter >= 180) {
            if (g.gLevelScoreList[0] && g.gLevelScoreList[1] && g.gLevelScoreList[2] && g.gLockOut === '0') {
              g.gLockOut = '1';
              ctx.setPref(g.gGameName, g.gLockOut);
            }
            if (g.gLevelScoreList[3] && g.gLevelScoreList[4] && g.gLevelScoreList[5] && g.gLockOut === '1') {
              g.gLockOut = '2';
              ctx.setPref(g.gGameName, g.gLockOut);
            }
            g.gLevel += 1;
            for (let ch = 1; ch <= 4; ch++) ctx.puppetSound(ch, 0);
            ctx.go('MenuScreen');
          }
        }
      },
    };
  });
}

