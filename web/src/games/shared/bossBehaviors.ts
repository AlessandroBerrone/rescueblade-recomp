import type { BehaviorFactory, SpriteInstance } from '../../engine/runtime/DirectorTypes.ts';
import { wrapWorldX } from './coreBehaviors.ts';

export function registerBossBehaviors(map: Map<string, BehaviorFactory>): void {
  const rad = Math.PI / 180;

  map.set('WarHead', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let state = 'ONGROUND';
    let grabCount = 0;
    let pullCount = 0;
    let stolenCount = 0;
    let thisWidth = 0;
    let thisHalfHeight = 0;
    return {
      name: 'WarHead',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 103;
        state = 'ONGROUND';
        thisWidth = sp.width;
        thisHalfHeight = sp.height / 2;
        grabCount = 0;
        pullCount = 0;
        stolenCount = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        const ship = ctx.sprite(59);
        const blackCopter = ctx.sprite(79);
        const claw = ctx.sprite(80);

        if (state === 'ONGROUND') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.locH = xpos;
          sp.locV = ypos;
          const dx = Math.abs(sp.locH - cableGuy.locH);
          const dy = Math.abs(sp.locV - cableGuy.locV);
          if (dx < thisWidth && dy < thisHalfHeight) {
            grabCount++;
            if (grabCount >= 2 && g.gCableItem === 0 && g.gCableLength >= 50) {
              state = 'GRABBED';
              g.gCableItem = -1;
            }
          } else {
            grabCount = 0;
          }
        } else if (state === 'GRABBED') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.locH = xpos;
          sp.locV = ypos;
          if (!ctx.soundBusy(4)) ctx.puppetSound(4, 72);
          const xDiff = copter.locH - g.gXVel - sp.locH;
          const yDiff = copter.locV + Number(copter.vars.Yvel ?? 0) - sp.locV;
          const dist = Math.hypot(xDiff, yDiff) || 1e-6;
          if (dist > g.gCableLength) {
            const pullScale = (dist - g.gCableLength) / dist;
            const px = (sp.locH - copter.locH - g.gXVel) * pullScale;
            const py = (sp.locV - copter.locV + Number(copter.vars.Yvel ?? 0)) * pullScale;
            g.gXVelChange -= px;
            copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) + py;
            cableGuy.vars.cableState = 'GODOWN';
            if (py > 0) { ypos -= 0.05; pullCount++; }
          }
          cableGuy.vars.Xvel = Number(cableGuy.vars.Xvel ?? 0) + (sp.locH - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0)));
          cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) + (sp.locV - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0)));
          if (pullCount > 40) {
            state = 'ONCABLE';
            sp.rotation = 30;
            g.gCableItem = 2;
            ctx.puppetSound(4, 73);
          }
        } else if (state === 'ONCABLE') {
          cableGuy.vars.cableState = 'GODOWN';
          sp.locH = cableGuy.locH;
          sp.locV = cableGuy.locV;
          if (Math.abs(sp.locH - claw.locH) < 10 && Math.abs(sp.locV - claw.locV) < 10 && g.gCableItem === 2) {
            state = 'ONCLAW';
            g.gCableItem = 0;
            blackCopter.vars.gotWarHead = 1;
            ctx.puppetSound(4, 76);
          }
          if (Math.abs(sp.locH - ship.locH) < 100 && Math.abs(sp.locV - ship.locV) < 40) {
            g.gCableItem = 0;
            state = 'HOME';
            g.gScore += 500;
            ctx.puppetSound(3, 8);
            g.gRescuedList.push(sp);
            g.gRescueCount += 1;
          }
        } else if (state === 'HOME') {
          sp.locH = -1000;
          sp.locV = -1000;
        } else if (state === 'ONCLAW') {
          stolenCount++;
          sp.locH = claw.locH;
          sp.locV = claw.locV;
          if (stolenCount > 30) {
            const dx = Math.abs(sp.locH - cableGuy.locH);
            const dy = Math.abs(sp.locV - cableGuy.locV);
            if (dx < thisWidth && dy < thisHalfHeight && g.gCableItem === 0 && g.gCableLength >= 50) {
              state = 'ONCABLE';
              g.gCableItem = 1;
              ctx.puppetSound(4, 77);
              blackCopter.vars.gotWarHead = 0;
            }
          }
        }
      },
    };
  });

  map.set('Submarine', () => {
    let xpos = 0;
    let loopX = 0;
    let loopWidth = 0;
    return {
      name: 'Submarine',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        sp.locZ = 103;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        sp.locH = xpos;
      },
    };
  });

  map.set('ShipGreenPace', () => {
    let xpos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let door!: SpriteInstance;
    return {
      name: 'ShipGreenPace',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        door = ctx.sprite(sp.spriteNum - 1);
        door.locH = sp.locH;
        door.locV = sp.locV;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        sp.locZ = 203;
        door.locZ = 50;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        if (xpos > 0 && xpos < 512) {
          const pushFrom = (px: number, py: number, minR: number) => {
            const dx = px - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0));
            const dy = py - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0));
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < minR) {
              cableGuy.vars.Xvel = Number(cableGuy.vars.Xvel ?? 0) - (dx / d) * (minR - d);
              cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) - (dy / d) * (minR - d);
            }
          };
          pushFrom(sp.locH + 80, sp.locV + 10, 80);
          pushFrom(sp.locH - 100, sp.locV + 10, 100);
          const dx = sp.locH - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0));
          const dy = sp.locV - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0));
          if (Math.abs(dx) < 30 && dy < 30) {
            cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) - (30 - dy);
          }
        }
        sp.locH = xpos;
        door.locH = sp.locH;
        door.locV = sp.locV;
      },
    };
  });

  map.set('IceBerg', () => {
    let xpos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let bergFront!: SpriteInstance;
    let tiltVel = 0;
    let tiltAngle = 0;
    return {
      name: 'IceBerg',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        bergFront = ctx.sprite(sp.spriteNum + 1);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        sp.locZ = 50;
        bergFront.locZ = 1100;
        bergFront.blend = 50;
        tiltAngle = 0;
        tiltVel = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(5);
        const snowBlow = ctx.sprite(56);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        if (xpos > 0 && xpos < 512) {
          const dx = copter.locH - sp.locH;
          const dy = copter.locV - sp.locV;
          if (Math.abs(dx) < 60 && dy > -90 && dy < -20) {
            snowBlow.locH = copter.locH;
            snowBlow.locV = sp.locV - 20;
            snowBlow.rotation = 0;
            tiltVel += dx > 0 ? (90 - dy) * 0.001 : -(90 - dy) * 0.001;
          }
          tiltVel = (tiltVel - tiltAngle * 0.005) * 0.9;
          tiltAngle += tiltVel;
        }
        sp.rotation = tiltAngle;
        sp.locH = xpos;
        bergFront.locH = sp.locH;
        bergFront.locV = sp.locV;
        bergFront.rotation = tiltAngle;
      },
    };
  });

  map.set('BergEnemy', (params) => {
    const targetSpriteNum = Number(params?.targetSprite ?? 1);
    const offArr = Array.isArray(params?.targetOffset) ? (params!.targetOffset as number[]) : [0, 0];
    let offX = offArr[0] ?? 0;
    let offY = offArr[1] ?? 0;
    let startMember = 0;
    let fireCount = 50;
    let state = 'ONGROUND';
    let xSlide = 0;
    let firedCount = 0;
    return {
      name: 'BergEnemy',
      spriteNum: 0,
      beginSprite(_ctx, sp) {
        startMember = sp.member;
        fireCount = 50;
        sp.locZ = 1501;
        state = 'ONGROUND';
        firedCount = 0;
        sp.locV = -1000;
        xSlide = offX;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const missile = ctx.sprite(88);
        const splosh = ctx.sprite(7);
        const tgt = ctx.sprite(targetSpriteNum);
        if (state === 'ONGROUND') {
          if (tgt.locH > -100 && tgt.locH < 600) {
            if (startMember === 201) {
              fireCount++;
              if (fireCount > 80 && missile.vars.missileState === 'NULL') {
                fireCount = 0;
                missile.locH = sp.locH;
                missile.locV = sp.locV - 30;
                missile.vars.missileState = 'FLY';
                firedCount++;
                if (!ctx.soundBusy(4)) ctx.puppetSound(4, firedCount % 2 ? 78 : 80);
                missile.vars.Xpos = missile.locH;
                missile.vars.Ypos = missile.locV;
                missile.vars.thisVel = 0;
                missile.rotation = sp.member === 201 ? 225 : 315;
              }
            }
            const tiltAngle = tgt.rotation;
            sp.rotation = tiltAngle;
            xSlide += tiltAngle * 0.1;
            offX = xSlide * Math.cos(tiltAngle * rad);
            offY = xSlide * Math.sin(tiltAngle * rad);
            sp.locH = tgt.locH + offX;
            sp.locV = tgt.locV + offY;
            sp.member = copter.locH >= sp.locH ? startMember + 1 : startMember;
            if (Math.abs(xSlide) > 55) {
              state = 'PLOPPED';
              ctx.puppetSound(4, 81);
              splosh.vars.overlayState = 'StartSplash';
              splosh.vars.Xpos = sp.locH;
              splosh.vars.Ypos = sp.locV;
            }
          }
        } else if (sp.locV !== -1000) {
          sp.locV += 2;
          if (sp.locV > 270) sp.locV = -1000;
        }
      },
    };
  });

  map.set('BlackCopter', () => {
    let xpos = 0;
    let ypos = 0;
    let xvel = 0;
    let yvel = 0;
    let loopX = 0;
    let loopWidth = 0;
    let clawHeight = 0;
    let claw!: SpriteInstance;
    let cable!: SpriteInstance;
    return {
      name: 'BlackCopter',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        claw = ctx.sprite(sp.spriteNum + 1);
        cable = ctx.sprite(sp.spriteNum - 1);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        xvel = 0;
        yvel = 0;
        sp.locZ = 50;
        cable.locZ = 49;
        sp.vars.gotWarHead = 0;
        clawHeight = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        if (sp.member === 194) sp.member = 195;
        else if (sp.member === 195) sp.member = 194;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset + xvel, loopX, loopWidth);
        ypos += yvel;
        if (g.gCableItem === 2 && Number(sp.vars.gotWarHead ?? 0) === 0) {
          clawHeight = cableGuy.locV > claw.locV ? clawHeight + 1.5 : Math.max(0, clawHeight - 1.5);
          yvel += (30 - sp.locV) * 0.005;
          xvel += (cableGuy.locH - g.gXVel * 15 - sp.locH) * 0.005;
        } else if (Number(sp.vars.gotWarHead ?? 0) === 1) {
          yvel += (120 - sp.locV) * 0.005;
          xvel += 0.3;
          clawHeight = Math.max(0, clawHeight - 1.5);
        } else {
          yvel += (30 - sp.locV) * 0.005;
          xvel += (cableGuy.locH - sp.locH) * 0.005;
          clawHeight = Math.max(0, clawHeight - 1.5);
        }
        yvel *= 0.95;
        xvel *= 0.95;
        sp.locH = xpos;
        sp.rotation = xvel * 2;
        sp.locV = ypos;
        claw.locH = sp.locH;
        claw.locV = sp.locV + 40 + clawHeight;
        cable.locH = claw.locH;
        cable.locV = claw.locV - 10;
        cable.height = clawHeight + 30;
      },
    };
  });

  const makeMissile = (name: string, damage: number, splashSfx: number, yKnock: number): BehaviorFactory => () => {
    let startMember = 0;
    return {
      name,
      spriteNum: 0,
      beginSprite(_ctx, sp) {
        startMember = sp.member;
        sp.locZ = 50;
        sp.vars.missileState = 'NULL';
        sp.vars.thisVel = 0;
        sp.vars.Xpos = sp.locH;
        sp.vars.Ypos = sp.locV;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const splosh = ctx.sprite(7);
        const st = sp.vars.missileState;
        if (st === 'NULL') {
          sp.locV = -1000;
        } else if (st === 'FIRED') {
          sp.vars.thisVel = 0;
          sp.vars.Xpos = sp.locH;
          sp.vars.Ypos = sp.locV;
          sp.vars.missileState = 'FLY';
        } else if (st === 'FLY') {
          if (sp.locH < -200 || sp.locH > 712 || sp.locV < -50) {
            sp.vars.missileState = 'NULL';
          }
          if (sp.locV > 280) {
            sp.vars.missileState = 'NULL';
            ctx.puppetSound(4, splashSfx);
            splosh.vars.overlayState = 'StartSplash';
            splosh.vars.Xpos = sp.locH;
            splosh.vars.Ypos = sp.locV;
          }
          const angleB = ctx.angleGrind(sp.locH, sp.locV, copter.locH, copter.locV);
          let diff = angleB - sp.rotation;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          sp.rotation += diff > 0 ? 2.5 : -2.5;
          let vel = Number(sp.vars.thisVel ?? 0);
          const xpos = Number(sp.vars.Xpos ?? 0) + g.gXVel + g.gXOffset + vel * Math.cos(sp.rotation * rad);
          const ypos = Number(sp.vars.Ypos ?? 0) + vel * Math.sin(sp.rotation * rad);
          if (vel < 6) vel += 0.2;
          sp.vars.thisVel = vel;
          sp.vars.Xpos = xpos;
          sp.vars.Ypos = ypos;
          sp.locH = xpos;
          sp.locV = ypos;
          if (Math.abs(sp.locH - copter.locH) < 50 && Math.abs(sp.locV - copter.locV) < 20) {
            sp.member = 210;
            sp.rotation = 0;
            sp.vars.missileState = 'BOOM';
            ctx.puppetSound(2, 79);
            g.gDamagePercent += damage;
            copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) - yKnock;
          }
        } else if (st === 'BOOM') {
          sp.vars.Xpos = Number(sp.vars.Xpos ?? 0) + g.gXVel + g.gXOffset;
          sp.locH = Number(sp.vars.Xpos);
          sp.blend -= 5;
          if (sp.blend <= 5) {
            sp.blend = 100;
            sp.vars.missileState = 'NULL';
            sp.locV = -1000;
            sp.member = startMember;
          }
        }
      },
    };
  };

  map.set('Missile', makeMissile('Missile', 19, 81, 4));
  map.set('VolcanoMissile', makeMissile('VolcanoMissile', 34, 79, 5));

  map.set('VolcanoCopter', () => {
    let xpos = 0;
    let ypos = 0;
    let xvel = 0;
    let yvel = 0;
    let loopX = 0;
    let loopWidth = 0;
    let clawHeight = 0;
    let attackMode = 'FIREMISSILES';
    let fireCount = 0;
    let missileWait = 80;
    let claw!: SpriteInstance;
    let cable!: SpriteInstance;
    return {
      name: 'VolcanoCopter',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        claw = ctx.sprite(sp.spriteNum + 1);
        cable = ctx.sprite(sp.spriteNum - 1);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        xvel = 0;
        yvel = 0;
        sp.locZ = 50;
        cable.locZ = 49;
        clawHeight = 0;
        attackMode = 'FIREMISSILES';
        fireCount = 0;
        sp.vars.firedCount = 0;
        missileWait = 80;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        const missile = ctx.sprite(88);
        if (sp.member === 194) sp.member = 195;
        else if (sp.member === 195) sp.member = 194;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset + xvel, loopX, loopWidth);
        ypos += yvel;
        if (attackMode === 'FIREMISSILES') {
          fireCount++;
          if (fireCount > missileWait && g.gXVel > 5 && missile.vars.missileState === 'NULL') {
            fireCount = 0;
            missile.locH = sp.locH;
            missile.locV = sp.locV + 10;
            missile.vars.missileState = 'FLY';
            const fc = Number(sp.vars.firedCount ?? 0) + 1;
            sp.vars.firedCount = fc;
            if (fc === 2) ctx.puppetSound(3, 87);
            if (!ctx.soundBusy(4)) {
              ctx.puppetSound(4, 80);
              missileWait = 50 + ctx.random(50);
            }
            missile.vars.Xpos = missile.locH;
            missile.vars.Ypos = missile.locV;
            missile.vars.thisVel = 0;
            missile.rotation = 20;
          }
          if (Number(sp.vars.firedCount ?? 0) >= 10) {
            attackMode = 'FLEE';
            ctx.puppetSound(3, 86);
          }
          clawHeight = cableGuy.locV > claw.locV ? clawHeight + 1.5 : Math.max(0, clawHeight - 1.5);
          yvel += (copter.locV - sp.locV) * 0.005;
          if (ypos > 150) yvel += (150 - ypos) * 0.01;
          xvel += (copter.locH - 200 - Math.abs(g.gXVel) * (25 + ctx.random(10)) - sp.locH) * 0.005;
        } else {
          yvel += (100 - sp.locV) * 0.007;
          xvel += 0.2;
          const dx = sp.locH - copter.locH;
          const dy = sp.locV - copter.locV;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < 100) {
            xvel += dx / 100;
            yvel += dy / 100;
          }
        }
        yvel *= 0.95;
        xvel *= 0.95;
        sp.locH = xpos;
        sp.rotation = xvel * 2;
        sp.locV = ypos;
        claw.locH = sp.locH;
        claw.locV = sp.locV + 40 + clawHeight;
        cable.locH = claw.locH;
        cable.locV = claw.locV - 10;
        cable.height = clawHeight + 30;
      },
    };
  });

  map.set('VolcanoGuy', () => {
    let xpos = 0;
    let ypos = 0;
    let guyState = 'claw';
    let loopWidth = 0;
    let mapXPos = 0;
    let jump = 0;
    let jumpVel = 0;
    return {
      name: 'VolcanoGuy',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        xpos = sp.locH;
        ypos = sp.locV;
        guyState = 'claw';
        loopWidth = ctx.globals.gTileIDList.length * 128;
        mapXPos = loopWidth * 0.5 + xpos - 256 - 64;
        jump = 0;
        jumpVel = 0;
        ctx.puppetSound(4, 82);
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const claw = ctx.sprite(80);
        const blackCopter = ctx.sprite(79);
        if (guyState === 'claw') {
          xpos = claw.locH;
          ypos = claw.locV;
          sp.locH = xpos;
          sp.locV = ypos;
          const cnt = g.gTileIDList.length || 1;
          mapXPos = ((mapXPos - g.gXVel) % loopWidth + loopWidth) % loopWidth;
          const temp = ((mapXPos - 0.5) % 128 + 128) % 128;
          const mapXTile = Math.max(1, Math.min(cnt, Math.trunc((mapXPos - temp) / 128) + 1));
          const localXPercent = (mapXPos - (mapXTile - 1) * 128) / 128;
          const hLeft = g.gTileHeightList[mapXTile - 1] ?? 0;
          const nextTile = mapXTile + 1 > cnt ? 1 : mapXTile + 1;
          const hRight = g.gTileHeightList[nextTile - 1] ?? 0;
          const diff = ypos + 10 - (280 - hLeft) + (hRight - hLeft) * localXPercent;
          if (diff > 0 && Number(blackCopter.vars.firedCount ?? 0) >= 10) {
            ypos -= diff;
            sp.locV = ypos;
            guyState = 'ONGROUND';
            g.gRescueCount = 1;
            ctx.puppetSound(4, 85);
          }
        } else {
          xpos += g.gXVel + g.gXOffset;
          sp.locH = xpos;
          sp.locV = ypos - jump;
          jumpVel -= 1;
          jump += jumpVel;
          if (jump < 0) jumpVel = 10;
        }
      },
    };
  });
}
