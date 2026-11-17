import type { BehaviorFactory, SpriteInstance } from '../../engine/runtime/DirectorTypes.ts';
import { wrapWorldX } from '../shared/coreBehaviors.ts';

export function registerBermudaBehaviors(map: Map<string, BehaviorFactory>): void {
  const rad = Math.PI / 180;

  map.set('Bar_Z_FullScreen', () => ({
    name: 'Bar_Z_FullScreen',
    spriteNum: 0,
    beginSprite(_ctx, sp) {
      sp.locZ = 99999999;
    },
  }));

  map.set('FullScreenXtra_Buttons', () => ({
    name: 'FullScreenXtra_Buttons',
    spriteNum: 0,
    beginSprite(_ctx, sp) {
      sp.locH = 0;
      sp.locV = 330;
    },
    mouseLeave(_ctx, sp) {
      sp.flipH = false;
      sp.flipV = false;
      sp.blend = 100;
    },
    mouseWithin(ctx, sp) {
      const ptr = ctx.getInput().pointer;
      sp.flipH = false;
      sp.flipV = false;
      sp.blend = 100;
      if (ptr.x <= 11) {
        if (ptr.isDown) sp.blend = 70;
        sp.flipH = true;
      }
    },
    mouseUp(ctx) {
      if (ctx.getInput().pointer.x <= 11 && typeof document !== 'undefined') {
        if (document.fullscreenElement) {
          void document.exitFullscreen?.();
        } else {
          void document.documentElement.requestFullscreen?.();
        }
      }
    },
  }));

  map.set('Whale', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let whaleState = 'WAITING';
    let tiltAngle = 0;
    let slapCount = 1;
    let snowBlow!: SpriteInstance;
    let sinPtr = 0;
    const sinList: number[] = [];
    return {
      name: 'Whale',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        sinList.length = 0;
        for (let i = 1; i <= 180; i++) sinList.push(30 * Math.sin(i * 2 * rad));
        sinPtr = 0;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        whaleState = 'WAITING';
        sp.locZ = 203;
        tiltAngle = 0;
        snowBlow = ctx.sprite(56);
        slapCount = 1;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        const prevX = xpos;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        if (xpos > 0 && xpos < 512) {
          if ((prevX <= 0 || prevX >= 512) && !ctx.soundBusy(2)) ctx.puppetSound(2, 74);
          if (whaleState === 'WAITING') {
            const sx = sp.locH - 16;
            const sy = sp.locV - 93;
            snowBlow.locH = sx;
            snowBlow.locV = sy;
            snowBlow.rotation = 180;
            const dx = sx - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0));
            const dy = sy - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0));
            if (Math.abs(dx) < 15 && dy < 15 && dy > -10) {
              whaleState = 'ROLL';
              tiltAngle = 360;
            }
          } else if (whaleState === 'ROLL') {
            const prevTilt = tiltAngle;
            if (tiltAngle > 0) tiltAngle *= 0.95;
            if (tiltAngle < 270 && prevTilt >= 270) {
              ctx.puppetSound(4, slapCount % 2 ? 11 : 75);
              cableGuy.vars.Xvel = -50;
              slapCount++;
              g.gScore += 500;
            }
            if (tiltAngle < 2) {
              tiltAngle = 0;
              whaleState = 'WAITING';
              if (!ctx.soundBusy(2)) ctx.puppetSound(2, 74);
            }
          }
        }
        sinPtr = (sinPtr + 1) % sinList.length;
        sp.locV = ypos + sinList[sinPtr];
        sp.locH = xpos;
        sp.rotation = tiltAngle;
      },
    };
  });

  map.set('Tornado', () => {
    let thisFrame = 1;
    let skewAngle = 100;
    const radDeg = 180 / Math.PI;
    const quadList: { x: number; y: number }[][] = [];
    const segList: SpriteInstance[] = [];
    return {
      name: 'Tornado',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        thisFrame = 1;
        segList.length = 0;
        quadList.length = 0;
        for (let i = 0; i <= 5; i++) {
          const seg = ctx.sprite(sp.spriteNum + i);
          seg.locZ = 2;
          segList.push(seg);
          const q = [
            { x: 0, y: i * 55 },
            { x: 200, y: i * 55 },
            { x: 100, y: (i + 1) * 55 },
            { x: 0, y: (i + 1) * 55 },
          ];
          quadList.push(q);
          seg.quad = [q[0], q[1], q[2], q[3]];
        }
        ctx.sprite(sp.spriteNum + 6).locZ = 900;
        skewAngle = 100;
      },
      exitFrame(ctx) {
        if (ctx.globals.gPaused !== 0) return;
        thisFrame = thisFrame - 1 < 1 ? 20 : thisFrame - 1;
        let curveOffset = 300;
        skewAngle = (skewAngle + 0.0005) % 360;
        let skewOffset = 0;
        for (let i = 0; i < 6; i++) {
          const q = quadList[i];
          q[0].x = 256 - (curveOffset + 30) + skewOffset;
          q[1].x = 256 + (curveOffset + 30) + skewOffset;
          curveOffset *= 0.6;
          skewOffset = 80 * Math.cos((skewAngle + i * 60) * radDeg);
          q[2].x = 256 + (curveOffset + 30) + skewOffset;
          q[3].x = 256 - (curveOffset + 30) + skewOffset;
          segList[i].member = 88 + thisFrame;
          segList[i].quad = [q[0], q[1], q[2], q[3]];
        }
      },
    };
  });

  map.set('TornadoDebris', () => {
    let startMember = 0;
    let thisMember = 0;
    let frameCounter = 1;
    let xvel = 1;
    let yvel = 0;
    let xpos = 0;
    let ypos = 0;
    let rotVel = 0;
    let spinDir = 1;
    let waitCounter = 0;
    return {
      name: 'TornadoDebris',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        thisMember = ctx.random(12) - 1;
        startMember = sp.member;
        frameCounter = 1;
        xvel = ctx.random(3);
        xpos = sp.locH;
        ypos = sp.locV - 1000;
        yvel = 0;
        rotVel = 0;
        spinDir = ctx.random(2) === 2 ? -1 : 1;
        waitCounter = 45 - sp.spriteNum;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        frameCounter += spinDir;
        if (frameCounter === 2) {
          frameCounter = 0;
          thisMember = thisMember + 1 > 11 ? 0 : thisMember + 1;
        } else if (frameCounter === -2) {
          frameCounter = 0;
          thisMember = thisMember - 1 < 0 ? 11 : thisMember - 1;
        }
        sp.member = startMember + thisMember;
        xpos += g.gXVel + g.gXOffset - xvel;
        ypos += yvel;
        yvel *= 0.98;
        sp.locH = xpos;
        sp.locV = ypos;
        sp.rotation = ((sp.rotation + rotVel) % 360 + 360) % 360;
        if (rotVel === 0) {
          const dx = copter.locH - sp.locH;
          const dy = copter.locV - sp.locV;
          if (Math.abs(dx) < sp.width * 0.5 && Math.abs(dy) < sp.height * 0.5) {
            if (dy > 0) {
              yvel = -5; rotVel = -8; copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) + 2;
            } else {
              yvel = 5; rotVel = 8; copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) - 2;
            }
            xvel *= 0.5;
            ctx.puppetSound(3, 27);
            g.gDamagePercent += sp.width * 0.25;
          }
        }
        if (xpos < -100) {
          waitCounter--;
          if (waitCounter <= 0) { xvel = ctx.random(6); ypos = 30 + ctx.random(270); yvel = ctx.random(2) - 3; rotVel = 0; sp.rotation = 0; }
          xpos += 800;
        }
        if (xpos > 612) {
          waitCounter--;
          if (waitCounter <= 0) { xvel = ctx.random(6); ypos = 30 + ctx.random(270); yvel = ctx.random(2) - 3; rotVel = 0; sp.rotation = 0; }
          xpos -= 800;
        }
      },
    };
  });

  map.set('TornadoPickups', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let sinPtr = 0;
    let pickupID = 'TREASURE';
    let state = 'ONGROUND';
    const sinList: number[] = [];
    return {
      name: 'TornadoPickups',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        sinList.length = 0;
        for (let i = 1; i <= 180; i++) sinList.push(30 * Math.sin(i * 2 * rad));
        sinPtr = 0;
        sp.locZ = 60;
        pickupID = sp.member === 84 ? 'TREASURE' : sp.member === 85 ? 'FUEL' : 'TOOLS';
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        state = 'ONGROUND';
        ctx.globals.gPickupList.push(sp);
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        if (state === 'NULL') {
          sp.locH = -1000; sp.locV = -1000;
        } else if (state === 'ONGROUND') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sinPtr = (sinPtr + 1) % sinList.length;
          sp.locV = ypos + sinList[sinPtr];
          sp.locH = xpos;
          if (Math.abs(sp.locH - cableGuy.locH) <= 10 && Math.abs(sp.locV - cableGuy.locV) <= 20) {
            if (g.gCableItem === 0 && g.gCableLength >= 50) {
              state = 'ONCABLE';
              if (pickupID === 'TREASURE') ctx.puppetSound(4, 15);
              else if (pickupID === 'FUEL') ctx.puppetSound(4, 10);
              g.gCableItem = 1;
            }
          }
        } else if (state === 'ONCABLE') {
          sp.locH = cableGuy.locH;
          sp.locV = cableGuy.locV + 10;
          if (g.gCableLength === 0) {
            g.gCableItem = 0;
            state = 'NULL';
            if (pickupID === 'TREASURE') { g.gScore += 1234; ctx.puppetSound(3, 16); }
            else if (pickupID === 'FUEL' && g.gfuelPercent > 0) { g.gScore += 10; g.gfuelPercent = 100; ctx.puppetSound(3, 19); }
            else if (pickupID === 'TOOLS' && g.gDamagePercent < 100) { g.gScore += 10; g.gDamagePercent = 0; ctx.puppetSound(3, 18); }
            g.gPickupList.push(sp);
          }
        }
      },
    };
  });

  map.set('Pleasure Vessel', (params) => {
    const swellHeight = Number(params?.swellHeight ?? 0);
    const startPtr = Math.max(1, Number(params?.swellListPointerStart ?? 1)) - 1;
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let ptr = 0;
    const swell: number[] = [];
    return {
      name: 'Pleasure Vessel',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        swell.length = 0;
        for (let i = 1; i <= 90; i++) swell.push(swellHeight * Math.cos(i * 4 * rad));
        ptr = startPtr % 90;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 50;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        if (Math.abs(sp.locH - cableGuy.locH) < 35) {
          const yd = sp.locV - 20 - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0));
          if (yd < 0) cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) + yd * 0.25;
        }
        ptr = (ptr + 1) % 90;
        sp.locH = xpos;
        sp.locV = ypos - swell[ptr];
      },
    };
  });

  map.set('Gray', () => {
    let targetSpriteNum = 1;
    let state = 'ONGROUND';
    let grabCount = 0;
    return {
      name: 'Gray',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        targetSpriteNum = sp.spriteNum - 1;
        sp.locZ = ctx.sprite(sp.spriteNum - 1).locZ - 1;
        state = 'ONGROUND';
        grabCount = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        const tgt = ctx.sprite(targetSpriteNum);
        if (state === 'ONGROUND') {
          sp.locH = tgt.locH;
          sp.locV = tgt.locV;
          const dx = Math.abs(sp.locH - cableGuy.locH);
          const dy = Math.abs(sp.locV - cableGuy.locV);
          if (dx < sp.width && dy < sp.height / 2) {
            grabCount++;
            if (grabCount >= 2 && tgt.vars.attackMode === 'FLEE' && g.gCableItem === 0 && g.gCableLength >= 50) {
              state = 'ONCABLE';
              tgt.vars.attackMode = 'PILOTLESS';
              ctx.puppetSound(2, 97);
              g.gCableItem = 1;
            }
          } else {
            grabCount = 0;
          }
        } else if (state === 'ONCABLE') {
          sp.locH = cableGuy.locH;
          sp.locV = cableGuy.locV;
          if (g.gCableLength === 0) {
            g.gCableItem = 0;
            state = 'INCOPTER';
            g.gRescueCount += 1;
            g.gScore += 500;
            ctx.puppetSound(3, 8);
          }
        } else {
          sp.locH = -1000;
          sp.locV = -1000;
        }
      },
    };
  });

  map.set('UFO', () => {
    let xpos = 0;
    let ypos = 0;
    let xvel = 0;
    let yvel = 0;
    let loopX = 0;
    let loopWidth = 0;
    let donkCount = 0;
    let toDieSaid = false;
    let gray!: SpriteInstance;
    let seat!: SpriteInstance;
    let dome!: SpriteInstance;
    return {
      name: 'UFO',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        sp.locZ = sp.spriteNum + 1;
        gray = ctx.sprite(sp.spriteNum + 1);
        seat = ctx.sprite(sp.spriteNum - 1);
        seat.locZ = sp.spriteNum - 1;
        dome = ctx.sprite(sp.spriteNum - 2);
        dome.locZ = sp.spriteNum - 2;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        xvel = 0;
        yvel = 0;
        donkCount = 0;
        toDieSaid = false;
        sp.vars.attackMode = 'ABDUCT';
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        if (sp.member === 194) sp.member = 195;
        else if (sp.member === 195) sp.member = 194;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset + xvel, loopX, loopWidth);
        ypos += yvel;
        if (xpos > 0 && xpos < 512 && !toDieSaid) {
          toDieSaid = true;
          ctx.puppetSound(2, 96);
        }
        if (xpos > -100 && xpos < 612) {
          const mode = sp.vars.attackMode;
          if (mode === 'ABDUCT') {
            yvel += (150 + ctx.random(50) - sp.locV) * 0.005;
            if (ypos > 150) yvel += (150 - ypos) * 0.01;
            xvel = Math.max(-8, Math.min(8, xvel + (copter.locH + 240 + ctx.random(10) - sp.locH) * 0.001));
            for (const coco of g.gCoconutList) {
              const dx = coco.locH - sp.locH;
              const dy = coco.locV - sp.locV;
              const d = Math.hypot(dx, dy);
              if (d < 20) {
                donkCount++;
                if (donkCount > 6) {
                  sp.vars.attackMode = 'FLEE';
                  dome.member = 186;
                  dome.locZ += 3;
                  ctx.puppetSound(4, 92);
                } else {
                  ctx.puppetSound(4, 91);
                }
                if (d > 0) {
                  const nx = dx / d;
                  const ny = dy / d;
                  coco.vars.Xvel = nx * 10;
                  coco.vars.Yvel = ny * 10;
                  xvel -= nx * 2;
                  yvel -= ny * 2;
                }
              }
            }
          } else if (mode === 'FLEE') {
            yvel += (150 - sp.locV) * 0.007;
            xvel += 0.2;
            const dx = sp.locH - cableGuy.locH;
            const dy = sp.locV - cableGuy.locV;
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < 100) {
              xvel += dx * 0.005;
              yvel += dy * 0.005;
            }
          } else {
            yvel += (-200 - sp.locV) * 0.0001;
            xvel += 0.1;
            ypos += yvel;
          }
        }
        yvel *= 0.96;
        xvel *= 0.95;
        sp.locH = xpos;
        sp.rotation = xvel * 2;
        sp.locV = ypos;
        seat.locH = sp.locH; seat.locV = sp.locV; seat.rotation = sp.rotation;
        dome.locH = sp.locH; dome.locV = sp.locV; dome.rotation = sp.rotation;
        gray.rotation = sp.rotation;
      },
    };
  });

  map.set('MotherShip', (params) => {
    const swellHeight = Number(params?.swellHeight ?? 0);
    const startPtr = Math.max(1, Number(params?.swellListPointerStart ?? 1)) - 1;
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let ptr = 0;
    let abductCableGuy = false;
    let beam!: SpriteInstance;
    const swell: number[] = [];
    return {
      name: 'MotherShip',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        swell.length = 0;
        for (let i = 1; i <= 45; i++) swell.push(swellHeight * Math.cos(i * 8 * rad));
        ptr = startPtr % 45;
        beam = ctx.sprite(sp.spriteNum - 1);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 800;
        abductCableGuy = false;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        const xDiff = sp.locH - cableGuy.locH;
        if (Math.abs(xDiff) < 35) {
          if (!abductCableGuy && Math.abs(sp.locV - cableGuy.locV) < 10) {
            ctx.puppetSound(2, 95);
            abductCableGuy = true;
            g.gScore += 1000;
          }
          cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) - 0.7;
          cableGuy.vars.Xvel = Number(cableGuy.vars.Xvel ?? 0) + xDiff * 0.03;
        }
        sp.locH = xpos;
        beam.locH = sp.locH;
        beam.locV = sp.locV;
        ptr = (ptr + 1) % 45;
        sp.locV = ypos - swell[ptr];
      },
    };
  });

  map.set('UFOGun', () => {
    let fireCounter = 0;
    let bolt!: SpriteInstance;
    let ufo!: SpriteInstance;
    let glow!: SpriteInstance;
    return {
      name: 'UFOGun',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        bolt = ctx.sprite(sp.spriteNum - 1);
        ufo = ctx.sprite(sp.spriteNum - 4);
        glow = ctx.sprite(sp.spriteNum - 2);
        glow.blend = 0;
        sp.locZ = 52;
        bolt.locZ = 51;
        glow.locZ = 50;
        fireCounter = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        sp.locH = ufo.locH; sp.locV = ufo.locV;
        glow.locH = sp.locH; glow.locV = sp.locV;
        glow.rotation = sp.rotation;
        if (sp.locH > 0 && sp.locH < 512 && sp.locV > 0) {
          fireCounter++;
          if (fireCounter >= 100) {
            if (glow.blend === 30) ctx.puppetSound(2, 93);
            if (glow.blend >= 100 && bolt.vars.fireBallState === 'NULL') {
              bolt.vars.fireBallState = 'FIRED';
              ctx.puppetSound(2, 94);
              bolt.locH = sp.locH + 50 * Math.cos((sp.rotation + 180) * rad);
              bolt.locV = sp.locV + 50 * Math.sin((sp.rotation + 180) * rad);
              bolt.rotation = sp.rotation - 180;
              glow.blend = 0;
            }
            if (fireCounter >= 150) fireCounter = 0;
            if (fireCounter < 200 && glow.blend < 100) glow.blend += 2;
          }
          sp.rotation = ctx.angleGrind(sp.locH, sp.locV, copter.locH, copter.locV) + 180;
        }
      },
    };
  });

  map.set('LaserBlast', () => {
    let startMember = 0;
    return {
      name: 'LaserBlast',
      spriteNum: 0,
      beginSprite(_ctx, sp) {
        startMember = sp.member;
        sp.locZ = 945;
        sp.vars.fireBallState = 'NULL';
        sp.vars.thisVel = 0;
        sp.vars.Xpos = sp.locH;
        sp.vars.Ypos = sp.locV;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const st = sp.vars.fireBallState;
        if (st === 'NULL') {
          sp.locV = -1000;
          sp.member = startMember;
        } else if (st === 'FIRED') {
          sp.vars.thisVel = 6;
          sp.vars.Xpos = sp.locH;
          sp.vars.Ypos = sp.locV;
          sp.blend = 100;
          sp.vars.fireBallState = 'FLY';
          sp.member = startMember;
        } else if (st === 'FLY') {
          if (sp.locH < -50 || sp.locH > 562 || sp.locV > 280 || sp.locV < -50) {
            sp.vars.fireBallState = 'NULL';
            sp.member = startMember;
          }
          let vel = Number(sp.vars.thisVel ?? 0);
          const xpos = Number(sp.vars.Xpos ?? 0) + g.gXVel + g.gXOffset + vel * Math.cos(sp.rotation * rad);
          const ypos = Number(sp.vars.Ypos ?? 0) + vel * Math.sin(sp.rotation * rad);
          if (vel < 6) vel += 0.2;
          sp.vars.thisVel = vel; sp.vars.Xpos = xpos; sp.vars.Ypos = ypos;
          sp.locH = xpos; sp.locV = ypos;
          if (Math.abs(sp.locH - copter.locH) < 50 && Math.abs(sp.locV - copter.locV) < 20) {
            sp.member = 210;
            sp.rotation = 0;
            sp.vars.fireBallState = 'BOOM';
            ctx.puppetSound(2, 88);
            g.gDamagePercent += 19;
            copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) - 4;
          }
        } else if (st === 'BOOM') {
          sp.vars.Xpos = Number(sp.vars.Xpos ?? 0) + g.gXVel + g.gXOffset;
          sp.locH = Number(sp.vars.Xpos);
          sp.blend -= 5;
          if (sp.blend <= 5) {
            sp.blend = 100;
            sp.vars.fireBallState = 'NULL';
            sp.locV = -1000;
            sp.member = startMember;
          }
        }
      },
    };
  });
}