import type { BehaviorFactory, SpriteInstance } from '../../engine/runtime/DirectorTypes.ts';
import { wrapWorldX } from './coreBehaviors.ts';

export function registerHazardBehaviors(map: Map<string, BehaviorFactory>): void {
  const rad = Math.PI / 180;

  map.set('Flames', () => {
    let startMember = 0;
    let thisMember = 1;
    let loopX = 0;
    let loopWidth = 0;
    let smokeDelay = 0;
    let xpos = 0;
    let ypos = 0;
    let flameHeightMax = 0;
    let thisHeight = 0;
    let flameState = 'FLAME';
    let heightVel = 0;
    let hitCount = 0;
    let ouchCount = 3;
    let onScreen = false;
    return {
      name: 'Flames',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        startMember = sp.member - 1;
        ypos = sp.locV;
        xpos = sp.locH;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        thisMember = 1;
        smokeDelay = 0;
        sp.locZ = 103;
        flameHeightMax = sp.height;
        thisHeight = sp.height;
        flameState = 'FLAME';
        heightVel = 0;
        hitCount = 0;
        ouchCount = 3;
        onScreen = false;
        ctx.puppetSound(2, 14);
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        if (flameState === 'NULL') {
          sp.locV = -1000;
          return;
        }
        if (flameState === 'FLAME') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          heightVel += (flameHeightMax - thisHeight) * 0.018;
          if (xpos > 0 && xpos < 512) {
            onScreen = true;
            if (!ctx.soundBusy(2)) ctx.puppetSound(2, 14);
            if (g.gPloshX > -1 && Math.abs(sp.locH - g.gPloshX) < 100) {
              heightVel -= 6.4;
              hitCount++;
              g.gPloshX = -2;
            }
            if (Math.abs(copter.locH - sp.locH) < 80) {
              g.gDamagePercent += 1;
              heightVel += 2;
            }
            if (Math.abs(cableGuy.locH - sp.locH) < 80 && !ctx.soundBusy(4)) {
              ctx.puppetSound(4, 34 + ouchCount);
              ouchCount = ouchCount >= 3 ? 0 : ouchCount + 1;
            }
          } else if (onScreen) {
            if (ctx.soundMember(2) === 14) ctx.puppetSound(2, 0);
            onScreen = false;
          }
          heightVel *= 0.8;
          thisHeight += heightVel;
          if (thisHeight < 40 || hitCount >= 50) {
            flameState = 'DOWSED';
            g.gRescueCount += 1;
            ctx.puppetSound(4, 8);
            g.gScore += 500;
            ctx.puppetSound(2, 0);
            if (ctx.soundMember(3) === 33) ctx.puppetSound(3, 0);
            g.gPloshX = -1;
          }
        } else if (flameState === 'DOWSED') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          thisHeight -= 1;
          if (thisHeight <= 2) flameState = 'NULL';
        }
        smokeDelay += 1.5;
        if (smokeDelay >= 2) {
          smokeDelay = 0;
          thisMember = thisMember >= 10 ? 1 : thisMember + 1;
        }
        sp.member = startMember + thisMember;
        sp.locH = xpos;
        sp.locV = ypos;
        sp.height = thisHeight;
      },
    };
  });

  map.set('Transformer', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let bolt!: SpriteInstance;
    let ouchCount = 0;
    let prevBolt = false;
    return {
      name: 'Transformer',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        bolt = ctx.sprite(sp.spriteNum - 1);
        xpos = sp.locH;
        ypos = sp.locV;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.25 - xpos;
        sp.locZ = 51;
        bolt.locZ = 52;
        ouchCount = 0;
        prevBolt = false;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        sp.locH = xpos;
        sp.locV = ypos;
        if (Math.abs(sp.locH - cableGuy.locH) < 120 && sp.locV - cableGuy.locV < 168) {
          const target = ctx.random(2) === 1 ? cableGuy : copter;
          const boltOffset = 96 - ctx.random(3) * 48;
          bolt.locH = sp.locH + boltOffset;
          bolt.locV = sp.locV;
          bolt.rotation = ctx.angleGrind(bolt.locH, bolt.locV, target.locH, target.locV) + 90;
          bolt.height = Math.hypot(bolt.locH - target.locH, bolt.locV - target.locV);
          if (!prevBolt) { prevBolt = true; ctx.puppetSound(3, 38); }
          g.gDamagePercent += 0.5;
          if (!ctx.soundBusy(4)) {
            ctx.puppetSound(4, 34 + ouchCount);
            ouchCount = ouchCount >= 3 ? 0 : ouchCount + 1;
          }
        } else {
          if (prevBolt) { prevBolt = false; ctx.puppetSound(3, 0); }
          bolt.locH = -1000;
          bolt.locV = -1000;
        }
      },
    };
  });


  map.set('FuelRod', (params) => {
    const targetSpriteNum = Number(params?.targetSprite ?? 1);
    const offArr = Array.isArray(params?.targetOffset) ? (params!.targetOffset as number[]) : [0, 0];
    const offX = offArr[0] ?? 0;
    const offY = offArr[1] ?? 0;
    let xpos = 0;
    let ypos = 0;
    let startY = 0;
    let loopX = 0;
    let loopWidth = 0;
    let glow!: SpriteInstance;
    let rodState = 'NULL';
    let glowPtr = 0;
    const glowList: number[] = [];
    return {
      name: 'FuelRod',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        glowList.length = 0;
        for (let i = 1; i <= 30; i++) glowList.push(50 + 50 * Math.cos(i * 12 * rad));
        glowPtr = 0;
        const tgt = ctx.sprite(targetSpriteNum);
        sp.locH = tgt.locH + offX;
        sp.locV = tgt.locV + offY;
        glow = ctx.sprite(sp.spriteNum + 1);
        xpos = sp.locH;
        ypos = sp.locV;
        startY = ypos;
        sp.locZ = sp.spriteNum + 104;
        glow.locZ = sp.spriteNum + 105;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        rodState = 'NULL';
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        const syncHoriz = () => {
          if (targetSpriteNum !== sp.spriteNum) {
            sp.locH = ctx.sprite(targetSpriteNum).locH + offX;
            sp.locV = ypos;
          } else {
            xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
            sp.locH = xpos;
            sp.locV = ypos;
          }
        };

        if (rodState === 'NULL') {
          if (targetSpriteNum !== sp.spriteNum) {
            const tgt = ctx.sprite(targetSpriteNum);
            sp.locH = tgt.locH + offX;
            sp.locV = tgt.locV + offY;
          } else {
            xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
            sp.locH = xpos;
            sp.locV = ypos;
          }
          if (Math.hypot(cableGuy.locH - sp.locH, cableGuy.locV - sp.locV) < 6 && g.gCableItem === 0) {
            rodState = 'GRABBED';
            g.gCableItem = 1;
          }
          glowPtr = (glowPtr + 1) % glowList.length;
          glow.blend = glowList[glowPtr];
        } else if (rodState === 'GRABBED') {
          syncHoriz();
          if (!ctx.soundBusy(4)) ctx.puppetSound(4, 39);
          const xDiff = copter.locH - g.gXVel - sp.locH;
          const yDiff = copter.locV + Number(copter.vars.Yvel ?? 0) - sp.locV;
          const dist = Math.hypot(xDiff, yDiff) || 1e-6;
          if (dist > g.gCableLength) {
            const pullScale = (dist - g.gCableLength) / dist;
            const px = (sp.locH - copter.locH) * pullScale;
            const py = (sp.locV - copter.locV) * pullScale;
            g.gXVelChange -= px;
            copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) + py;
            cableGuy.vars.cableState = 'GODOWN';
            ypos -= py * 1.3;
          }
          cableGuy.vars.Xvel = Number(cableGuy.vars.Xvel ?? 0) + (sp.locH - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0)));
          cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) + (sp.locV - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0)));
          glow.blend = glowList[glowPtr];
          if (ypos - startY < -65) {
            rodState = 'UP';
            g.gCableItem = 0;
            ctx.puppetSound(4, 40);
            glow.blend = 100;
          }
          glowPtr = (glowPtr + 1) % glowList.length;
        } else if (rodState === 'UP') {
          syncHoriz();
          if (glow.blend < 100) glow.blend += 1;
          if (sp.locH > 0 && sp.locH < 512 && g.gPloshX > -1 && Math.abs(sp.locH - g.gPloshX) < 80) {
            if (glow.blend >= 6) {
              glow.blend -= 6;
            } else {
              rodState = 'COOLED';
              g.gRescueCount += 1;
              ctx.puppetSound(4, 8);
              g.gScore += 500;
            }
          }
        } else {
          sp.locH = ctx.sprite(targetSpriteNum).locH + offX;
        }
        glow.locH = sp.locH;
        glow.locV = sp.locV;
      },
    };
  });

  map.set('FuelRodPods', () => {
    let xpos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let podsFront!: SpriteInstance;
    return {
      name: 'FuelRodPods',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        podsFront = ctx.sprite(sp.spriteNum + 1);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        sp.locZ = 103;
        podsFront.locZ = 1001;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        sp.locH = xpos;
        podsFront.locH = sp.locH;
        podsFront.locV = sp.locV;
      },
    };
  });


  map.set('SteamValve', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let steam!: SpriteInstance;
    let valve!: SpriteInstance;
    let ouchCount = 0;
    let valveState = 'STEAM';
    let valveAngle = 90;
    let valveVel = 0;
    let valveCounter = 0;
    let onScreen = false;
    return {
      name: 'SteamValve',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        steam = ctx.sprite(sp.spriteNum + 2);
        valve = ctx.sprite(sp.spriteNum + 1);
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 51;
        steam.locZ = 52;
        valve.locZ = 53;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        ouchCount = 0;
        valveState = 'STEAM';
        valveAngle = 90;
        valveVel = 0;
        valveCounter = 0;
        onScreen = false;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        sp.locH = xpos;
        sp.locV = ypos;
        steam.locH = sp.locH;
        valve.locH = sp.locH;
        valve.locV = sp.locV;
        if (xpos > -20 && xpos < 550) {
          if (!onScreen) { onScreen = true; ctx.puppetSound(2, 42); }
          if (valveState === 'STEAM') {
            valveVel -= 1;
            if (valveAngle < 60) valveVel += (60 - valveAngle) * 0.1;
            valveAngle += valveVel;
            valveVel *= 0.99;
            valve.rotation = valveAngle;
            if (g.gPloshX > -1) {
              if (Math.abs(g.gPloshX - xpos - 12) < 50) valveVel -= 8;
              if (valveAngle <= 0) {
                valveState = 'closed';
                valveCounter = 0;
                ctx.puppetSound(2, 41);
              }
            }
            if (Math.abs(sp.locH - 12 - cableGuy.locH) < 40) {
              g.gDamagePercent += 2;
              if (!ctx.soundBusy(4)) {
                ctx.puppetSound(4, 34 + ouchCount);
                ouchCount = ouchCount >= 3 ? 0 : ouchCount + 1;
              }
            }
            steam.locH = sp.locH;
            steam.locV = sp.locV;
          } else {
            steam.locV = -1000;
            valveAngle = 0;
            valve.rotation = 0;
            valveCounter++;
            if (valveCounter >= 70) {
              valveState = 'STEAM';
              valveAngle = 1;
              valveVel = 0;
              ctx.puppetSound(2, 42);
            }
          }
          steam.height = valveAngle + 70 + ctx.random(80);
        } else if (onScreen) {
          if (ctx.soundMember(2) === 42) ctx.puppetSound(2, 0);
          onScreen = false;
        }
      },
    };
  });

  map.set('CommTower', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let glow!: SpriteInstance;
    let towerState = 'NULL';
    let tiltAngle = -50;
    return {
      name: 'CommTower',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        tiltAngle = -50;
        glow = ctx.sprite(sp.spriteNum + 1);
        glow.blend = 100;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = sp.spriteNum + 104;
        glow.locZ = sp.spriteNum + 105;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        towerState = 'NULL';
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        sp.locH = xpos;
        sp.locV = ypos;
        if (towerState === 'NULL') {
          sp.rotation = tiltAngle;
          const grabX = xpos + 100 * Math.cos((tiltAngle - 90) * rad);
          const grabY = ypos + 100 * Math.sin((tiltAngle - 90) * rad);
          if (Math.hypot(cableGuy.locH - grabX, cableGuy.locV - grabY) < 6 && g.gCableItem === 0 && g.gCableLength > 0) {
            towerState = 'GRABBED';
            g.gCableItem = 1;
          }
        } else if (towerState === 'GRABBED') {
          sp.rotation = tiltAngle;
          const grabX = xpos + 100 * Math.cos((tiltAngle - 90) * rad);
          const grabY = ypos + 100 * Math.sin((tiltAngle - 90) * rad);
          if (!ctx.soundBusy(4)) ctx.puppetSound(4, 39);
          const dist = Math.hypot(copter.locH - g.gXVel - grabX, copter.locV + Number(copter.vars.Yvel ?? 0) - grabY) || 1e-6;
          if (dist > g.gCableLength) {
            const pullScale = (dist - g.gCableLength) / dist;
            const px = (grabX - copter.locH) * pullScale;
            const py = (grabY - copter.locV) * pullScale;
            g.gXVelChange -= px;
            copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) + py;
            cableGuy.vars.cableState = 'GODOWN';
            if (px < 0 && py > 0) tiltAngle += 0.5;
          }
          cableGuy.vars.Xvel = Number(cableGuy.vars.Xvel ?? 0) + (grabX - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0)));
          cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) + (grabY - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0)));
          if (tiltAngle > 0) {
            g.gScore += 500;
            towerState = 'UP';
            g.gCableItem = 0;
            ctx.puppetSound(4, 40);
            ctx.puppetSound(3, 8);
            tiltAngle = 0;
            sp.rotation = 0;
            g.gRescueCount += 1;
          }
        }
      },
    };
  });


  map.set('SnowBlow', () => {
    let thisMember = 175;
    return {
      name: 'SnowBlow',
      spriteNum: 0,
      beginSprite(_ctx, sp) {
        thisMember = sp.member;
        sp.locZ = 1500;
      },
      exitFrame(_ctx, sp) {
        sp.locH = -1000;
        sp.locV = -1000;
        thisMember = thisMember + 1 > 182 ? 175 : thisMember + 1;
        sp.member = thisMember;
      },
    };
  });

  map.set('SnowLump', () => ({
    name: 'SnowLump',
    spriteNum: 0,
    beginSprite(_ctx, sp) {
      sp.locZ = 1600;
    },
    exitFrame(ctx, sp) {
      if (ctx.globals.gPaused === 0) sp.locH = -1000;
    },
  }));

  map.set('SnowSurvivor', () => {
    let startMember = 0;
    let thisMember = 0;
    let xpos = 0;
    let ypos = 0;
    let xvel = 0;
    let loopX = 0;
    let loopWidth = 0;
    let survivorDelay = 0;
    let grabCount = 0;
    let distToHQ = 0;
    let frameDir = 1;
    let pullCount = 0;
    let lumpHeight = 0;
    let lump!: SpriteInstance;
    let state = 'ONGROUND';
    return {
      name: 'SnowSurvivor',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        startMember = sp.member;
        lump = ctx.sprite(sp.spriteNum - 1);
        lumpHeight = lump.height;
        thisMember = ctx.random(3) + startMember - 1;
        sp.member = thisMember;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 60;
        xvel = 0;
        survivorDelay = 0;
        state = 'ONGROUND';
        grabCount = 0;
        distToHQ = 0;
        frameDir = 1;
        pullCount = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        const snowBlow = ctx.sprite(56);
        const animate = () => {
          survivorDelay++;
          if (survivorDelay >= 5) {
            survivorDelay = 0;
            if (thisMember + frameDir > startMember + 2 || thisMember + frameDir < startMember) frameDir = -frameDir;
            thisMember += frameDir;
            sp.member = thisMember;
          }
        };

        if (state === 'ONGROUND') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.locH = xpos;
          sp.locV = ypos;
          lump.locH = sp.locH;
          lump.locV = sp.locV + 11;
          animate();
          const dx = Math.abs(sp.locH - cableGuy.locH);
          const dy = Math.abs(sp.locV - cableGuy.locV);
          if (dx < 70 && dy < 100) {
            if (lump.height > 6) {
              lumpHeight -= 0.25;
              lump.height = lumpHeight;
              if (lumpHeight === 6.25) ctx.puppetSound(4, 9);
              snowBlow.locH = sp.locH;
              snowBlow.locV = sp.locV - 12;
            } else if (dx < sp.width && dy < sp.height / 2) {
              grabCount++;
              if (grabCount >= 2 && g.gCableItem === 0 && g.gCableLength >= 50) {
                state = 'GRABBED';
                g.gCableItem = 1;
              }
            } else {
              grabCount = 0;
            }
          }
        } else if (state === 'GRABBED') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.locH = xpos;
          sp.locV = ypos;
          lump.locH = sp.locH;
          animate();
          if (!ctx.soundBusy(4)) ctx.puppetSound(4, 39);
          const dist = Math.hypot(copter.locH - g.gXVel - sp.locH, copter.locV + Number(copter.vars.Yvel ?? 0) - sp.locV) || 1e-6;
          if (dist > g.gCableLength) {
            const pullScale = (dist - g.gCableLength) / dist;
            const px = (sp.locH - copter.locH - g.gXVel) * pullScale;
            const py = (sp.locV - copter.locV + Number(copter.vars.Yvel ?? 0)) * pullScale;
            g.gXVelChange -= px;
            copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) + py;
            cableGuy.vars.cableState = 'GODOWN';
            if (py > 0) { ypos -= 0.1; pullCount++; }
          }
          cableGuy.vars.Xvel = Number(cableGuy.vars.Xvel ?? 0) + (sp.locH - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0)));
          cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) + (sp.locV - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0)));
          if (pullCount > 40) {
            state = 'ONCABLE';
            ctx.puppetSound(4, 63 + Number(cableGuy.vars.speechCounter ?? 1));
          }
        } else if (state === 'ONCABLE') {
          sp.locH = cableGuy.locH;
          sp.locV = cableGuy.locV;
          if (g.gCableLength === 0) {
            g.gCableItem = 0;
            state = 'INCOPTER';
            g.gScore += 500;
            ctx.puppetSound(3, 8);
            g.gRescuedList.push(sp);
            g.gRescueCount += 1;
          }
        } else if (state === 'INCOPTER') {
          sp.locH = -1000;
          sp.locV = -1000;
        } else if (state === 'GOTOHQ') {
          thisMember = thisMember + 1 > startMember + 2 ? startMember : thisMember + 1;
          sp.member = thisMember;
          if (distToHQ <= 0) {
            xvel = 0;
            sp.blend -= 5;
            if (sp.blend <= 0) {
              state = 'HOME';
              g.gRescueCount += 1;
              g.gScore += 1000;
              ctx.puppetSound(3, 8);
            }
          }
          xpos += g.gXVel + g.gXOffset + xvel;
          distToHQ += xvel;
          sp.locH = xpos;
          sp.locV = 270;
        } else {
          sp.locH = -1000;
          sp.locV = -1000;
        }
      },
    };
  });

  map.set('SnowBall', () => {
    let xpos = 0;
    let ypos = 0;
    let xvel = 0;
    let yvel = 0;
    let loopX = 0;
    let loopWidth = 0;
    let ballAngle = 0;
    let ballRadius = 10;
    let ploshCount = 0;
    let mapXPos = 0;
    return {
      name: 'SnowBall',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        ballAngle = 0;
        yvel = 0;
        xpos = sp.locH;
        ypos = sp.locV;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        mapXPos = loopX + xpos - 256 - 64;
        xvel = 0;
        sp.locZ = sp.spriteNum + 104;
        ballRadius = 10;
        ploshCount = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const snowBlow = ctx.sprite(56);
        const cnt = g.gTileIDList.length || 1;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset + xvel, loopX, loopWidth);
        ypos += yvel;
        ballAngle = ((ballAngle + xvel * 2) % 360 + 360) % 360;
        yvel += 1;

        mapXPos = ((mapXPos + xvel) % loopWidth + loopWidth) % loopWidth;
        const temp = ((mapXPos - 0.5) % 128 + 128) % 128;
        const mapXTile = Math.max(1, Math.min(cnt, Math.trunc((mapXPos - temp) / 128) + 1));
        const localXPercent = (mapXPos - (mapXTile - 1) * 128) / 128;
        const hLeft = g.gTileHeightList[mapXTile - 1] ?? 0;
        const nextTile = mapXTile + 1 > cnt ? 1 : mapXTile + 1;
        const hRight = g.gTileHeightList[nextTile - 1] ?? 0;
        const diff = ypos + ballRadius * 0.9 - (280 - hLeft) + (hRight - hLeft) * localXPercent;
        if (diff > 0) ypos -= diff;

        sp.locH = xpos;
        sp.locV = ypos;
        sp.rotation = ballAngle;
        if (g.gPloshX === -2) {
          if (ballRadius > 10) ballRadius -= 0.2;
          xvel *= 0.9;
          if (ctx.soundMember(3) !== 33) ctx.puppetSound(3, 33);
        }
        g.gPloshX = -1;
        ploshCount++;
        if (ploshCount >= 4) {
          g.gPloshX = xpos;
          ploshCount = 0;
        }
        const xDiff = Math.abs(copter.locH - sp.locH) - 32;
        const yDiff = copter.locV - sp.locV;
        if (Math.abs(xDiff) < 32 && yDiff > -100) {
          const push = 0.3 * (1 - Math.abs(xDiff) / 32);
          if (copter.locH < sp.locH) {
            snowBlow.locH = sp.locH - 32;
            snowBlow.locV = sp.locV + ballRadius - 15;
            xvel += push;
          } else {
            snowBlow.locH = sp.locH + 32;
            snowBlow.locV = sp.locV + ballRadius - 15;
            xvel -= push;
          }
          if (ballRadius < 32) ballRadius += 0.14;
        }
        xvel *= 0.95;
        sp.width = ballRadius * 2;
        sp.height = ballRadius * 2;
      },
    };
  });
}


