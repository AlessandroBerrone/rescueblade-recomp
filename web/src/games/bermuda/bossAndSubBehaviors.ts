import type { BehaviorFactory, MovieRuntimeContext, SpriteInstance } from '../../engine/runtime/DirectorTypes.ts';
import type { Quad2D } from '../../engine/render/types.ts';
import { wrapWorldX } from '../shared/coreBehaviors.ts';
import { lingoInteger } from '../../engine/runtime/MovieGlobals.ts';

export function registerBermudaBossAndSubBehaviors(map: Map<string, BehaviorFactory>): void {
  const rad = Math.PI / 180;

  map.set('Bodzilla', (params) => {
    const scale = Number(params?.bodzillaScale ?? 1);
    let xpos = 0;
    let ypos = 0;
    let xvel = 0;
    let loopX = 0;
    let loopWidth = 0;
    let state = 'STAND';
    let counter = 0;
    let bonk = 0;
    let sink = 0;
    let p1 = 0;
    let p2 = 0;
    const waggle: number[] = [];
    let armBack!: SpriteInstance;
    let armFront!: SpriteInstance;
    let head!: SpriteInstance;
    let tail!: SpriteInstance;
    let fireBall!: SpriteInstance;

    const sizeHead = (ctx: MovieRuntimeContext, memberNum: number) => {
      head.member = memberNum;
      const tex = ctx.bundle.texturesByKey.get(`3:${memberNum}`);
      if (tex) {
        head.width = tex.width * scale;
        head.height = tex.height * scale;
      }
    };

    return {
      name: 'Bodzilla',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        fireBall = ctx.sprite(sp.spriteNum - 2);
        armBack = ctx.sprite(sp.spriteNum - 1);
        armFront = ctx.sprite(sp.spriteNum + 1);
        head = ctx.sprite(sp.spriteNum + 2);
        tail = ctx.sprite(sp.spriteNum + 3);
        armBack.locZ = 946;
        sp.locZ = 947;
        armFront.locZ = 948;
        head.locZ = 949;
        tail.locZ = 949;
        for (const s of [sp, armBack, armFront, tail]) {
          s.width *= scale;
          s.height *= scale;
        }
        sizeHead(ctx, head.member);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        state = 'STAND';
        xvel = 0;
        counter = 0;
        bonk = 0;
        sink = 0;
        waggle.length = 0;
        for (let i = 1; i <= 180; i++) waggle.push(20 * Math.cos(i * 2 * rad) + 20);
        p1 = 0;
        p2 = Math.floor(waggle.length * 0.5);
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + xvel + g.gXVel + g.gXOffset, loopX, loopWidth);

        if (xpos > -100 && xpos < 612) {
          p1 = (p1 + 1) % waggle.length;
          p2 = (p2 + 1) % waggle.length;
          armFront.rotation = waggle[p1];
          armBack.rotation = waggle[p2];

          const aimHead = (tx: number, ty: number) => {
            const ang = ctx.angleGrind(head.locH, head.locV, tx, ty);
            if (ang < 90 || ang > 270) {
              head.rotation = ang;
              head.flipH = true;
            } else {
              head.rotation = ang + 180;
              head.flipH = false;
            }
            return ang;
          };

          const checkGargle = () => {
            if (g.gPloshX !== -1 && Math.abs(g.gPloshX - head.locH) < 50 * scale && Math.abs(head.locH - cableGuy.locH) < 250 * scale) {
              state = 'GARGLE';
              ctx.puppetSound(4, scale <= 0.5 ? 87 : 86);
              counter = 0;
            }
          };

          const distGuy = Math.hypot(head.locH - cableGuy.locH, head.locV - cableGuy.locV);
          if (state === 'STAND') {
            counter++;
            if (counter * scale > 50) {
              state = 'INHALE';
              counter = 0;
              ctx.puppetSound(4, 84);
            }
            if (distGuy < 120 * scale) { state = 'OPENWIDE'; ctx.puppetSound(4, 77); }
            aimHead(cableGuy.locH, cableGuy.locV + 8);
            checkGargle();
            sizeHead(ctx, 195);
          } else if (state === 'OPENWIDE') {
            if (distGuy < 40) { state = 'SHUT'; ctx.puppetSound(4, 78); }
            else if (distGuy > 120 * scale) state = 'STAND';
            aimHead(cableGuy.locH, cableGuy.locV + 8);
            sizeHead(ctx, 196);
          } else if (state === 'GARGLE') {
            counter++;
            if (counter > 70 * scale) state = 'STAND';
            if (distGuy < 40) { state = 'SHUT'; ctx.puppetSound(4, 78); }
            aimHead(cableGuy.locH, cableGuy.locV + 8);
            sizeHead(ctx, 196);
          } else if (state === 'SHUT') {
            if (distGuy > 70 * scale) { state = 'SPIT'; counter = 0; ctx.puppetSound(4, 79); }
            aimHead(cableGuy.locH, cableGuy.locV + 8);
            sizeHead(ctx, 195);
          } else if (state === 'SPIT') {
            counter++;
            if (counter > 15) state = 'STAND';
            aimHead(cableGuy.locH, cableGuy.locV + 8);
            sizeHead(ctx, 197);
          } else if (state === 'INHALE') {
            counter++;
            const ang = aimHead(copter.locH, copter.locV);
            if (counter >= 40) {
              state = 'EXHALE';
              ctx.puppetSound(4, 85);
              fireBall.vars.fireBallState = 'FIRED';
              fireBall.locH = head.locH;
              fireBall.locV = head.locV;
              fireBall.rotation = ang;
              counter = 0;
            }
            checkGargle();
            sizeHead(ctx, 196);
          } else if (state === 'EXHALE') {
            counter++;
            if (counter >= 30) { state = 'STAND'; counter = 0; }
            sizeHead(ctx, 197);
          } else if (state === 'BONK') {
            bonk *= 0.95;
            const ang = aimHead(copter.locH, copter.locV);
            sizeHead(ctx, 197);
            if (bonk < 10) {
              bonk = 0;
              if (head.locV > 290) {
                state = 'Sink';
                g.gRescueCount += 1;
                g.gScore += lingoInteger(2000 * scale);
                ctx.puppetSound(4, 1);
              } else if (fireBall.vars.fireBallState !== 'FLY') {
                state = 'EXHALE';
                ctx.puppetSound(4, 85);
                fireBall.vars.fireBallState = 'FIRED';
                fireBall.locH = head.locH;
                fireBall.locV = head.locV;
                fireBall.rotation = ang;
                counter = 0;
              } else {
                state = 'STAND';
              }
            }
          } else if (state === 'Sink') {
            ypos += 1;
            if (ypos > 400) state = 'SUNK';
          }

          for (const coco of g.gCoconutList) {
            const dx = coco.locH - head.locH;
            const dy = coco.locV - head.locV;
            const d = Math.hypot(dx, dy);
            if (d < 80 * scale && state !== 'Sink' && state !== 'BONK') {
              state = 'BONK';
              bonk = 20;
              sink += 14 * scale;
              ctx.puppetSound(4, scale === 1 ? 80 : scale === 0.8 ? 81 : 82);
              if (d > 0) {
                coco.vars.Xvel = (dx / d) * 10;
                coco.vars.Yvel = (dy / d) * 10;
              }
            }
          }
        }

        sp.locH = xpos;
        sp.locV = ypos + sink;
        armBack.locH = sp.locH - 15 * scale;
        armBack.locV = sp.locV - 90 * scale;
        armFront.locH = sp.locH + 14 * scale;
        armFront.locV = sp.locV - 85 * scale;
        head.locH = sp.locH + 2 * scale;
        head.locV = sp.locV - 131 * scale + bonk;
        tail.locH = sp.locH + 81 * scale;
        tail.locV = sp.locV - 9 * scale;
      },
    };
  });

  map.set('FireBall', () => {
    let startMember = 0;
    let thisMember = 0;
    return {
      name: 'FireBall',
      spriteNum: 0,
      beginSprite(_ctx, sp) {
        startMember = sp.member;
        thisMember = startMember;
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
        const splosh = ctx.sprite(7);
        const st = sp.vars.fireBallState;
        if (st === 'NULL') {
          sp.locV = -1000;
        } else if (st === 'FIRED') {
          sp.vars.thisVel = 3;
          sp.vars.Xpos = sp.locH;
          sp.vars.Ypos = sp.locV;
          sp.blend = 100;
          sp.vars.fireBallState = 'FLY';
        } else if (st === 'FLY') {
          if (sp.locH < -200 || sp.locH > 712 || sp.locV < -50) sp.vars.fireBallState = 'NULL';
          if (sp.locV > 280) {
            sp.vars.fireBallState = 'NULL';
            splosh.vars.overlayState = 'StartSplash';
            splosh.vars.Xpos = sp.locH;
            splosh.vars.Ypos = sp.locV;
          }
          thisMember = thisMember + 1 > startMember + 9 ? startMember : thisMember + 1;
          sp.member = thisMember;
          let vel = Number(sp.vars.thisVel ?? 0);
          const xpos = Number(sp.vars.Xpos ?? 0) + g.gXVel + g.gXOffset + vel * Math.cos(sp.rotation * rad);
          const ypos = Number(sp.vars.Ypos ?? 0) + vel * Math.sin(sp.rotation * rad);
          if (vel < 5) vel += 0.2;
          sp.vars.thisVel = vel;
          sp.vars.Xpos = xpos;
          sp.vars.Ypos = ypos;
          sp.locH = xpos;
          sp.locV = ypos;
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

  map.set('BigSquid', () => {
    let xpos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let eye!: SpriteInstance;
    let eyeOffset = 4;
    let eyeVel = 0;
    return {
      name: 'BigSquid',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        eye = ctx.sprite(sp.spriteNum + 1);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        eyeOffset = 4;
        sp.locZ = 103;
        eyeVel = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        sp.locH = xpos;
        eyeVel -= eyeOffset * 0.025;
        eyeOffset += eyeVel;
        eye.locH = sp.locH + eyeOffset;
        eye.locV = sp.locV - eyeOffset;
      },
    };
  });

  const makeTentacles = (name: string, pullBackK: number, stretchLimit: number, pullCountLimit: number): BehaviorFactory => () => {
    let xpos = 0; let ypos = 0; let loopX = 0; let loopWidth = 0;
    let towerState = 'NULL'; let tiltAngle = 0; let startHeight = 0;
    let stretch = 0; let stretchVel = 0; let pullCount = 0;
    let thisFrame = 320; let frameWait = 0;
    let survivor!: SpriteInstance;
    return {
      name,
      spriteNum: 0,
      beginSprite(ctx, sp) {
        tiltAngle = ((ctx.random(60) - 30) % 360 + 360) % 360;
        survivor = ctx.sprite(sp.spriteNum - 1);
        xpos = sp.locH; ypos = sp.locV; startHeight = sp.height;
        sp.locZ = sp.spriteNum + 104;
        stretch = 0; stretchVel = ctx.random(10) - 5;
        loopWidth = ctx.globals.gTileIDList.length * 128; loopX = loopWidth * 0.5;
        towerState = 'NULL'; thisFrame = 320 + ctx.random(9); frameWait = ctx.random(2); pullCount = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        const calcGrab = () => ({
          gx: xpos + (105 + stretch) * Math.cos((tiltAngle - 90) * rad),
          gy: ypos + (105 + stretch) * Math.sin((tiltAngle - 90) * rad),
        });
        if (towerState === 'NULL') {
          if (Math.abs(stretchVel) < 1) pullCount++;
          else if (pullCount >= 2) pullCount -= 2;
          if (pullCount > 20) stretchVel += 4;
          stretchVel = stretchVel * 0.99 - stretch * 0.03;
          stretch += stretchVel; sp.height = startHeight + stretch * 1.2;
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.locH = xpos; sp.locV = ypos; sp.rotation = tiltAngle;
          const { gx, gy } = calcGrab();
          if (Math.hypot(cableGuy.locH - gx, cableGuy.locV - gy) < 6 && g.gCableItem === 0 && g.gCableLength > 0) {
            tiltAngle = (ctx.angleGrind(sp.locH, sp.locV, cableGuy.locH, cableGuy.locV) + 90) % 360;
            towerState = 'GRABBED'; g.gCableItem = 1; pullCount = 0; stretchVel = 0;
          }
          survivor.vars.Xpos = gx; survivor.vars.Ypos = gy; survivor.locH = gx; survivor.locV = gy;
        } else if (towerState === 'GRABBED') {
          if (!ctx.soundBusy(4)) ctx.puppetSound(4, 39);
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.locH = xpos; sp.locV = ypos; sp.rotation = tiltAngle;
          stretchVel = stretchVel * 0.99 - stretch * pullBackK;
          stretch += stretchVel; sp.height = startHeight + stretch * 1.3;
          const { gx, gy } = calcGrab();
          const distToCopter = Math.hypot(copter.locH - g.gXVel - gx, copter.locV + Number(copter.vars.Yvel ?? 0) - gy) || 1e-6;
          let diffAngle = ctx.angleGrind(gx, gy, copter.locH - g.gXVel, copter.locV + Number(copter.vars.Yvel ?? 0)) - (sp.rotation - 90);
          if (diffAngle > 180) diffAngle -= 360; if (diffAngle < -180) diffAngle += 360;
          tiltAngle = ((tiltAngle + diffAngle * 0.02) % 360 + 360) % 360;
          const stretchPercent = 1 - Math.min(90, Math.abs(diffAngle)) / 90;
          if (distToCopter > g.gCableLength) {
            stretchVel += (distToCopter - g.gCableLength) * stretchPercent;
            pullCount++;
            const pullScale = (distToCopter - g.gCableLength) / distToCopter;
            g.gXVelChange -= (gx - copter.locH) * pullScale;
            copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) + (gy - copter.locV) * pullScale;
            cableGuy.vars.cableState = 'GODOWN';
          }
          cableGuy.vars.Xvel = Number(cableGuy.vars.Xvel ?? 0) + (gx - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0)));
          cableGuy.vars.Yvel = Number(cableGuy.vars.Yvel ?? 0) + (gy - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0)));
          survivor.vars.Xpos = gx; survivor.vars.Ypos = gy; survivor.locH = gx; survivor.locV = gy;
          if (stretch > stretchLimit || pullCount >= pullCountLimit) {
            g.gScore += 500; towerState = 'UP';
            ctx.puppetSound(4, 40); ctx.puppetSound(3, 8);
            g.gRescueCount += 1; survivor.vars.survivorState = 'ONCABLE'; g.gCableItem = 1;
            if (tiltAngle > 180) tiltAngle -= 360;
          }
        } else {
          tiltAngle *= 0.98;
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.rotation = tiltAngle; sp.locH = xpos; sp.locV = ypos;
          stretchVel = stretchVel * 0.99 - stretch * 0.03;
          stretch += stretchVel; sp.height = startHeight + stretch;
        }
        frameWait++;
        if (frameWait >= 2) { frameWait = 0; thisFrame = thisFrame + 1 > 329 ? 320 : thisFrame + 1; }
        sp.member = thisFrame;
      },
    };
  };

  map.set('Tentacles', makeTentacles('Tentacles', 0.006, 80, 200));
  map.set('SubmarineTentacles', makeTentacles('SubmarineTentacles', 0.005, 60, 100));

  const makeTentacleSurvivor = (name: string, homeScore: number, animate: boolean): BehaviorFactory => () => {
    let startMember = 0; let thisMember = 0; let survivorDelay = 0; let frameDir = 1;
    let xpos = 0; let ypos = 0; let xvel = 0;
    return {
      name,
      spriteNum: 0,
      beginSprite(ctx, sp) {
        startMember = sp.member;
        thisMember = ctx.random(3) + startMember - 1;
        if (animate) sp.member = thisMember;
        xpos = sp.locH; ypos = sp.locV; sp.locZ = 60; xvel = 0;
        survivorDelay = 0; sp.vars.survivorState = 'TENTACLE';
        sp.vars.distToHQ = 0; frameDir = 1;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        const st = sp.vars.survivorState;
        if (st === 'TENTACLE' && animate) {
          survivorDelay++;
          if (survivorDelay >= 5) {
            survivorDelay = 0;
            if (thisMember + frameDir > startMember + 2 || thisMember + frameDir < startMember) frameDir = -frameDir;
            thisMember += frameDir;
            sp.member = thisMember;
          }
        } else if (st === 'ONCABLE') {
          sp.locH = cableGuy.locH; sp.locV = cableGuy.locV;
          if (g.gCableLength === 0) {
            g.gCableItem = 0; sp.vars.survivorState = 'INCOPTER';
            g.gRescueCount += 1; g.gScore += 500; ctx.puppetSound(3, 8);
            g.gRescuedList.push(sp);
          }
        } else if (st === 'INCOPTER') {
          sp.locH = -1000; sp.locV = -1000;
        } else if (st === 'GOTOHQ') {
          if (animate) {
            thisMember = thisMember + 1 > startMember + 2 ? startMember : thisMember + 1;
            sp.member = thisMember;
          }
          if (Number(sp.vars.distToHQ ?? 0) <= 0) {
            xvel = 0; sp.blend -= 5;
            if (sp.blend <= 0) {
              sp.vars.survivorState = 'HOME'; g.gRescueCount += 1;
              g.gScore += homeScore; ctx.puppetSound(3, 8);
            }
          }
          xpos = Number(sp.vars.Xpos ?? xpos) + g.gXVel + g.gXOffset + xvel;
          sp.vars.Xpos = xpos;
          sp.vars.distToHQ = Number(sp.vars.distToHQ ?? 0) + xvel;
          ypos = 270; sp.locH = xpos; sp.locV = ypos;
        } else if (st === 'HOME') {
          sp.locH = -1000; sp.locV = -1000;
        }
      },
    };
  };

  map.set('TentacleSurvivor', makeTentacleSurvivor('TentacleSurvivor', 1000, true));
  map.set('submarineSurvivor', makeTentacleSurvivor('submarineSurvivor', 1234, false));

  map.set('UnderSeaQuadTileFar', () => {
    let xpos = 0; let rightLoopX = 0; let leftLoopX = 0; let loopWidth = 0; let halfW = 0; let ptr = 1;
    return {
      name: 'UnderSeaQuadTileFar',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        g.gUnderSeaHeightList = [...g.gTileHeightList];
        const cnt = g.gTileIDList.length || 1;
        rightLoopX = 256 + sp.width * 4.5; leftLoopX = 256 - sp.width * 4.5; loopWidth = 512 + sp.width * 5;
        xpos = sp.locH; halfW = sp.width / 2; sp.locZ = 2;
        const calc = xpos - 256 - 64 + sp.width / 2;
        ptr = ((Math.trunc(cnt / 2) + lingoInteger(calc / 128) - 1) % cnt + cnt) % cnt + 1;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cnt = g.gTileIDList.length || 1;
        xpos += g.gXVel + g.gXOffset;
        if (lingoInteger(xpos) > rightLoopX) { xpos -= loopWidth; ptr -= 9; while (ptr < 1) ptr += cnt; }
        if (lingoInteger(xpos) < leftLoopX) { xpos += loopWidth; ptr += 9; while (ptr > cnt) ptr -= cnt; }
        sp.locH = xpos;
        const nextPtr = ptr + 1 > cnt ? 1 : ptr + 1;
        const hL = g.gUnderSeaHeightList[ptr - 1] ?? 0;
        const hR = g.gUnderSeaHeightList[nextPtr - 1] ?? 0;
        const xL = xpos - halfW; const xR = xpos + halfW;
        const quad: Quad2D = [
          { x: lingoInteger(xL + (256 - xL) * 0.5), y: lingoInteger(80 - hL * 0.2) },
          { x: lingoInteger(xR + (256 - xR) * 0.5), y: lingoInteger(80 - hR * 0.2) },
          { x: lingoInteger(xR), y: lingoInteger(-20 - hR) },
          { x: lingoInteger(xL), y: lingoInteger(-20 - hL) },
        ];
        sp.quad = quad;
        sp.member = g.gSeaFrame;
      },
    };
  });

  map.set('UnderSeaSwell', (params) => {
    const swellHeight = Number(params?.swellHeight ?? 0);
    const swell: number[] = [];
    let counter = 1;
    return {
      name: 'UnderSeaSwell',
      spriteNum: 0,
      beginSprite(ctx) {
        ctx.globals.gSeaFrame = 1; swell.length = 0; counter = 1;
        for (let i = 1; i <= 90; i++) swell.push(swellHeight * Math.sin(i * 4 * rad));
      },
      exitFrame(ctx) {
        counter = counter >= 90 ? 1 : counter + 1;
        const cnt = ctx.globals.gTileIDList.length;
        for (let i = 0; i < cnt; i++) {
          let ptr = ((i + 1) * 10 + counter) % 90;
          if (ptr === 0) ptr = 1;
          ctx.globals.gUnderSeaHeightList[i] = swell[ptr - 1];
        }
      },
    };
  });

  map.set('TBMAvenger', () => {
    let xpos = 0; let loopX = 0; let loopWidth = 0; let firstPhoto = 0;
    return {
      name: 'TBMAvenger',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        sp.locZ = 1000;
        firstPhoto = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        sp.ink = 0;
        if (xpos > 50 && xpos < 462 && cableGuy.vars.takingPhoto === 1) {
          const d = Math.hypot(cableGuy.locH - sp.locH, cableGuy.locV - sp.locV);
          if (d < 200) {
            g.gScore += 100 * (1 - d / 200);
            sp.ink = 33;
            if (firstPhoto < 2) {
              g.gScore += 1000 * (1 - d / 200);
              ctx.puppetSound(3, 8);
              firstPhoto++;
            }
          }
        }
        sp.locH = xpos;
      },
    };
  });

  map.set('BlueMarlin', () => {
    let xpos = 0; let ypos = 0; let yvel = 0; let loopX = 0; let loopWidth = 0;
    let thisMember = 370; let frameDir = 1;
    return {
      name: 'BlueMarlin',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        thisMember = sp.member;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH; ypos = sp.locV;
        frameDir = 1; sp.locZ = 1000; yvel = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cableGuy = ctx.sprite(6);
        xpos += g.gXVel + g.gXOffset + 3;
        ypos += yvel;
        const diffY = cableGuy.locV - sp.locV;
        const diffX = cableGuy.locH - (sp.locH + 45);
        yvel = (yvel + (diffY > 1 ? 0.2 : -0.2)) * 0.9;
        if (Math.abs(diffY) < 20 && Math.abs(diffX) < 20 && g.gGuyDoom !== 'SHARK') {
          ctx.puppetSound(1, 17);
          g.gGuyDoom = 'SHARK';
          cableGuy.vars.sharkCounter = 150;
          cableGuy.rotation = sp.rotation + 90;
          sp.blend = 0;
        }
        xpos = wrapWorldX(xpos, loopX, loopWidth);
        sp.ink = 0;
        sp.rotation = yvel * 4;
        thisMember += frameDir;
        if (thisMember > 379) { thisMember = 379; frameDir = -frameDir; }
        if (thisMember < 370) { thisMember = 370; frameDir = -frameDir; }
        sp.locH = xpos; sp.locV = ypos; sp.member = thisMember;
        if (xpos > 600) { xpos -= 800; ypos = 300; }
      },
    };
  });

  map.set('CopterSubmarine', () => {
    let thisMember = 354; let delayCount = 0; let throttle = 0.95;
    let xpos = 0; let ypos = 0; let xOffset = 0; let prevXvel = 0;
    let mapXPos = 0; let survivorOutDelay = 0; let smokeDelay = 0;
    let copterShadow!: SpriteInstance;
    return {
      name: 'CopterSubmarine',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        const m = ctx.bundle.mapsByLevel.get(g.gLevel) ?? ctx.bundle.mapsByLevel.get(1);
        g.gTileIDList = m ? [...m.tileIds] : [0];
        g.gTileHeightList = m ? [...m.tileHeights] : [0];
        g.gSceneryList = m ? [...m.sceneryIds] : [0];
        g.gAbducteeList = [];
        copterShadow = ctx.sprite(sp.spriteNum + 5);
        copterShadow.locZ = 1500;
        sp.vars.tiltAngle = 0; sp.vars.Yvel = 0;
        thisMember = 354; delayCount = 0; throttle = 0.95;
        ypos = sp.locV; xpos = sp.locH;
        g.gXVel = 0; g.gXOffset = 0; xOffset = 0; prevXvel = 0; g.gPaused = 0;
        mapXPos = 256 - 64 - xpos + (g.gTileIDList.length / 2) * 128;
        g.gCopterTile = 0; g.gfuelPercent = 100; sp.locZ = 100;
        g.gScore = 0; g.gDamagePercent = 0; ctx.puppetSound(1, 98);
        g.gCableItem = 0; g.gCableLength = 0; g.gRescueCount = 0; g.gRescuedList = [];
        survivorOutDelay = 0; g.gSmokeList = []; smokeDelay = 0; g.gPickupList = [];
        g.gGuyDoom = null; g.gPloshList = []; g.gWaterFlow = 0; g.gPloshX = -1;
        g.gXVelChange = 0; g.gCoconuts = 0; g.gCoconutList = [];
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const inp = ctx.getInput();
        let tilt = Number(sp.vars.tiltAngle ?? 0);
        let yvel = Number(sp.vars.Yvel ?? 0);
        g.gXVel += g.gXVelChange; g.gXVelChange = 0;
        if (g.gWaterFlow === 0) {
          if (inp.axes.moveX !== 0) tilt = Math.max(-20, Math.min(20, tilt + inp.axes.moveX * 1.2));
          if (inp.actions.action.isPressed) { g.gXVel *= 0.95; tilt *= 0.95; }
        } else { g.gXVel *= 0.9; tilt *= 0.9; }
        if (g.gfuelPercent > 0 && g.gDamagePercent < 100) {
          if (g.gProControls === 1) {
            if (inp.axes.throttle !== 0) throttle = Math.max(0.5, Math.min(2.0, throttle + inp.axes.throttle * 0.01));
            yvel += 1 - throttle * Math.cos(tilt * rad);
            g.gXVel -= throttle * Math.sin(tilt * rad);
          } else {
            if (inp.axes.throttle !== 0) yvel -= inp.axes.throttle * 0.3;
            yvel += 0.01;
            g.gXVel -= throttle * Math.sin(tilt * rad);
          }
        } else {
          if (g.gProControls === 1) { yvel += 1 - throttle * Math.cos(tilt * rad); g.gXVel -= throttle * Math.sin(tilt * rad); throttle = 0.5; }
          else { yvel += 0.5; g.gXVel -= throttle * Math.sin(tilt * rad); }
        }
        g.gXVel *= 0.95; yvel *= 0.95;
        if (ypos < 10) { yvel += (10 - ypos) * 0.05; if (throttle > 1.5) throttle = 1.5; }
        if (g.gfuelPercent > 0) g.gfuelPercent = Math.max(0, g.gfuelPercent - throttle * 0.05);
        if (delayCount === 2) {
          if (g.gXVel < -2 && thisMember > 348) thisMember--;
          else if (g.gXVel > 2 && thisMember < 367) thisMember++;
          delayCount = 0;
        }
        delayCount++;
        sp.member = thisMember; sp.rotation = tilt; ypos += yvel;
        if (g.gXVel > 4) xOffset += (g.gXVel - 4) * 1.25;
        if (g.gXVel < -4) xOffset += (g.gXVel + 4) * 1.25;
        xOffset *= g.gProControls === 1 ? 0.9 : 0.97;
        g.gXOffset = xOffset - prevXvel; prevXvel = xOffset;
        xpos += g.gXOffset; sp.locH = xpos; sp.locV = ypos;
        const cnt = g.gTileIDList.length || 1;
        const worldW = cnt * 128;
        if (mapXPos > worldW) mapXPos -= worldW; if (mapXPos < 0) mapXPos += worldW;
        const temp = ((mapXPos - 0.5) % 128 + 128) % 128;
        const tile = Math.max(1, Math.min(cnt, Math.trunc((mapXPos - temp) / 128) + 1));
        const pct = (mapXPos - (tile - 1) * 128) / 128;
        const tid = g.gTileIDList[tile - 1] ?? 0;
        const hL = g.gTileHeightList[tile - 1] ?? 0;
        const hR = g.gTileHeightList[tile % cnt] ?? 0;
        const diff = ypos + 16 + yvel - (280 - hL) + (hR - hL) * pct;
        copterShadow.locH = sp.locH; copterShadow.locV = 280 - hL - (hR - hL) * pct;
        g.gCopterTile = 0;
        if (diff >= 0) {
          if (tid === 0 || tid === 2 || tid === 3) {
            if (!ctx.soundBusy(3)) ctx.puppetSound(3, 10);
            yvel -= diff * (tid === 0 ? 0.03 : 0.04);
            g.gXVel *= tid === 0 ? 0.9 : 0.5;
            if (throttle < (tid === 0 ? 0.5 : 0.8)) throttle = tid === 0 ? 0.5 : 0.8;
            tilt *= 0.8; g.gDamagePercent += 1;
          } else {
            if (tid === 4) {
              g.gCopterTile = tile;
              if (g.gRescuedList.length > 0 && ++survivorOutDelay >= 16) {
                const s = g.gRescuedList.shift()!;
                s.vars.survivorState = 'GOTOHQ'; s.vars.distToHQ = 67 + 128 * pct;
                s.vars.Xvel = -1; s.vars.Xpos = xpos; survivorOutDelay = 0;
              }
              g.gfuelPercent = Math.min(100, g.gfuelPercent + 0.8);
              if (g.gfuelPercent < 100 && !ctx.soundBusy(3)) ctx.puppetSound(3, 12);
            }
            yvel -= diff; if (throttle < 0.8) throttle = 0.8;
            if (diff > 2 || Math.abs(g.gXVel) > (tid === 4 ? 3 : 2)) {
              g.gDamagePercent += Math.abs(g.gXVel) * 2 + (diff - (tid === 4 ? 3 : 2)) * 2;
              if (!ctx.soundBusy(3)) ctx.puppetSound(3, 27);
            }
            g.gXVel = 0; tilt *= 0.8;
          }
        }
        if (g.gDamagePercent > 70 && ++smokeDelay >= 6) {
          if (g.gSmokeList.length > 0) {
            const sm = g.gSmokeList.shift()!;
            sm.vars.smokeState = 'SMOKE'; sm.vars.Xpos = xpos; sm.vars.Ypos = ypos;
          }
          smokeDelay = 0;
        }
        mapXPos -= g.gXVel; sp.vars.tiltAngle = tilt; sp.vars.Yvel = yvel;
      },
    };
  });

  map.set('SubmarineCableGuy', () => {
    let thisMember = 0; let copter!: SpriteInstance; let cable!: SpriteInstance;
    let photoFlash!: SpriteInstance; let cableGuyOverlay!: SpriteInstance; let cableGuyBubbles!: SpriteInstance;
    let prevSpace = false; let xpos = 0; let ypos = 0; let mapXPos = 0;
    let prevGroundID = -1; let frameDir = 1; let winchWait = 0; let oofCount = 1; let photoCounter = 0;
    return {
      name: 'SubmarineCableGuy',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        thisMember = sp.member;
        copter = ctx.sprite(sp.spriteNum - 2); cable = ctx.sprite(sp.spriteNum - 1);
        photoFlash = ctx.sprite(7); cableGuyOverlay = ctx.sprite(sp.spriteNum + 1); cableGuyBubbles = ctx.sprite(sp.spriteNum + 2);
        sp.vars.cableState = 'GOUP'; prevSpace = false;
        xpos = copter.locH - 5; ypos = copter.locV;
        sp.vars.Xvel = 0; sp.vars.Yvel = 0; sp.locH = xpos; sp.locV = ypos;
        mapXPos = 256 - 64 - 5 - xpos + (ctx.globals.gTileIDList.length / 2) * 128;
        prevGroundID = -1; cableGuyOverlay.locZ = 1001; cable.locZ = 101; sp.locZ = 102; cableGuyBubbles.locZ = -1002;
        sp.vars.sharkCounter = 0; frameDir = 1; sp.vars.speechCounter = ctx.random(7);
        winchWait = 0; oofCount = 1; photoCounter = 0; sp.vars.takingPhoto = 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const spaceDown = ctx.getInput().actions.action.isPressed;
        xpos += g.gXVel + g.gXOffset;
        sp.vars.takingPhoto = 0; photoFlash.blend = 0;
        if (spaceDown && g.gCoconuts > 0) {
          photoCounter++;
          if (photoCounter >= 10) {
            sp.vars.cableState = 'GODOWN';
            if (ctx.soundMember(2) !== 99 && g.gCableLength > 50) {
              ctx.puppetSound(2, 99);
              sp.vars.takingPhoto = 1;
              g.gCoconuts--;
              photoFlash.blend = 100;
            }
          }
        } else { photoCounter = 0; }

        let xvel = Number(sp.vars.Xvel ?? 0); let yvel = Number(sp.vars.Yvel ?? 0);
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
          winchWait = spaceDown ? winchWait + 1 : 0;
          if (g.gCableLength > 0) g.gCableLength = Math.max(0, g.gCableLength - 2.5);
          else { xvel = 0; yvel = 0; }
        } else {
          if (!spaceDown && prevSpace) { sp.vars.cableState = 'GOUP'; ctx.puppetSound(3, 21); winchWait = 0; }
          if (g.gCableLength < 100) g.gCableLength = Math.min(100, g.gCableLength + 1.5);
        }
        prevSpace = spaceDown;

        yvel += 0.5;
        const xx = copter.locH - 5 - (xpos + xvel); const yy = copter.locV - (ypos + yvel);
        const hh = Math.hypot(xx, yy) || 1e-6;
        if (g.gCableLength - hh < 0) {
          xvel -= (xx / hh) * (g.gCableLength - hh);
          yvel -= (yy / hh) * (g.gCableLength - hh);
        }
        yvel *= 0.95; xvel *= 0.98; xpos += xvel; ypos += yvel;
        sp.locH = xpos; sp.locV = ypos;
        cable.locH = copter.locH - 5; cable.locV = copter.locV;
        cable.rotation = ctx.angleGrind(copter.locH - 5, copter.locV, xpos, ypos) - 90;
        cable.height = Math.hypot(copter.locH - xpos, copter.locV - ypos);
        const cnt = g.gTileIDList.length || 1;
        const worldW = cnt * 128;
        mapXPos = ((mapXPos + xvel) % worldW + worldW) % worldW;
        const temp = ((mapXPos - 0.5) % 128 + 128) % 128;
        const tile = Math.max(1, Math.min(cnt, Math.trunc((mapXPos - temp) / 128) + 1));
        const pct = (mapXPos - (tile - 1) * 128) / 128;
        const tid = g.gTileIDList[tile - 1] ?? 0;
        const hL = g.gTileHeightList[tile - 1] ?? 0;
        const hR = g.gTileHeightList[tile % cnt] ?? 0;
        const diff = ypos + 5 + yvel - (280 - hL) + (hR - hL) * pct;
        if (diff >= 0) {
          if (tid === 0 || tid === 7 || tid === 2 || tid === 3) {
            yvel -= diff * (tid === 0 || tid === 7 ? 0.01 : 0.02);
            xvel *= tid === 0 || tid === 7 ? 0.95 : 0.5;
            if (prevGroundID === -1) {
              ctx.puppetSound(4, 6);
              cableGuyOverlay.vars.overlayState = 'StartSplash'; cableGuyOverlay.vars.Xpos = xpos; cableGuyOverlay.vars.Ypos = ypos + yvel;
            } else {
              if (!ctx.soundBusy(4)) ctx.puppetSound(4, 1);
              cableGuyBubbles.locH = sp.locH - 10 + ctx.random(20); cableGuyBubbles.locV = 280 + ctx.random(5);
              if ((tid === 0 || tid === 7) && g.gCableLength >= 100) sp.vars.sharkCounter = Number(sp.vars.sharkCounter ?? 0) + 1;
            }
          } else {
            if ((prevGroundID === -1 || (tid !== 4 && Math.abs(xvel) > 0.5)) && !ctx.soundBusy(4)) {
              oofCount = oofCount >= 12 ? 1 : oofCount + 1; ctx.puppetSound(4, 44 + oofCount);
            }
            yvel -= diff; xvel *= 0.5;
          }
          prevGroundID = tid;
        } else {
          const sc = Number(sp.vars.sharkCounter ?? 0);
          if (prevGroundID === 0 || prevGroundID === 2 || prevGroundID === 3) {
            if (sc < 150) ctx.puppetSound(4, 4); else { ctx.puppetSound(1, 17); g.gGuyDoom = 'SHARK'; }
          } else if (prevGroundID === 7) {
            if (sc < 150) ctx.puppetSound(4, 4); else { ctx.puppetSound(1, 17); g.gGuyDoom = 'ICECUBE'; }
          } else if ((prevGroundID === 1 || prevGroundID === 6) && sc < 150 && !ctx.soundBusy(4)) {
            ctx.puppetSound(4, 3);
          }
          prevGroundID = -1;
        }
        sp.vars.Xvel = xvel; sp.vars.Yvel = yvel;
        if (Number(sp.vars.sharkCounter ?? 0) >= 150) {
          thisMember += frameDir;
          if (thisMember > 83) { thisMember = 83; frameDir = -frameDir; }
          if (thisMember < 74) { thisMember = 74; frameDir = -frameDir; }
          sp.member = thisMember;
        }
      },
    };
  });
}