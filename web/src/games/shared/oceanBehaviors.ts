import type { BehaviorFactory, SpriteInstance } from '../../engine/runtime/DirectorTypes.ts';
import { wrapWorldX } from './coreBehaviors.ts';

export function registerOceanBehaviors(map: Map<string, BehaviorFactory>): void {
  const rad = Math.PI / 180;

  map.set('Bell Buoy', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let sway = 0;
    let bellRung = false;
    let ptr = 0;
    const swell: number[] = [];
    return {
      name: 'Bell Buoy',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        swell.length = 0;
        for (let i = 1; i <= 90; i++) swell.push(5 * Math.cos(4 * i * rad));
        ptr = 0;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 50;
        sway = 0;
        bellRung = false;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        if (xpos > 0 && xpos < 512) {
          if (Math.abs(copter.locH - sp.locH) < 20) {
            const yd = copter.locV - sp.locV;
            if (yd > -150 && yd < -60) sway += 0.16;
          }
        }
        sway = (sway - sp.rotation * 0.01) * 0.99;
        sp.rotation += sway;
        if (Math.abs(sp.rotation) > 20 && !bellRung) {
          bellRung = true;
          ctx.puppetSound(4, 26);
          g.gScore += 100;
          g.gFlyingPoints = 100;
        }
        ptr = (ptr + 1) % 90;
        sp.locH = xpos;
        sp.locV = ypos + swell[ptr];
      },
    };
  });

  map.set('SeaGull', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let ptr = 0;
    let ptr1 = 0;
    let state = 'FLY';
    let hitRot = 0;
    let bash = 0;
    let featherDelay = 0;
    let fx = -1000;
    let fy = -1000;
    let feathers!: SpriteInstance;
    const swell: number[] = [];
    return {
      name: 'SeaGull',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        swell.length = 0;
        for (let i = 1; i <= 90; i++) swell.push(5 * Math.cos(4 * i * rad));
        ptr = 0;
        ptr1 = 0;
        hitRot = 0;
        bash = 0;
        featherDelay = 0;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 50;
        state = 'FLY';
        feathers = ctx.sprite(sp.spriteNum + 1);
        feathers.locZ = 110;
        fx = -1000;
        fy = -1000;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const copter = ctx.sprite(4);
        const cableGuy = ctx.sprite(6);
        xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
        hitRot *= 0.9;
        bash *= 0.95;

        if (state === 'FLY') {
          if (xpos > 0 && xpos < 512 && Math.abs(copter.locH - sp.locH) < 30 && Math.abs(copter.locV - sp.locV) < 15) {
            state = 'HIT';
            fx = xpos;
            fy = ypos;
            sp.member = sp.member + 1;
            ctx.puppetSound(3, 28);
            feathers.locV = sp.locV;
            g.gDamagePercent += 20;
            hitRot = g.gXVel > 0 ? 3234 : -3234;
            g.gXVel = 0;
          }
          if (Math.abs(cableGuy.locH - sp.locH) < 30 && Math.abs(cableGuy.locV - sp.locV) < 15) {
            if (g.gCableItem === 0 && g.gCableLength >= 50) {
              state = 'ONCABLE';
              ctx.puppetSound(3, 29);
              g.gCableItem = 1;
            }
          }
          feathers.locH = sp.locH;
          feathers.locV = -1000;
          sp.locH = xpos + bash + swell[ptr] * 5;
          sp.rotation = -swell[ptr1] * 2 + hitRot;
          sp.locV = ypos + swell[ptr] + bash;
        } else if (state === 'HIT') {
          fx += g.gXVel + g.gXOffset;
          feathers.locH = fx;
          feathers.locV = fy;
          fy += 1;
          featherDelay++;
          if (featherDelay === 3) {
            feathers.member = feathers.member === 105 ? 106 : 105;
            featherDelay = 0;
          }
          sp.locH = xpos + bash + swell[ptr] * 5;
          sp.rotation = -swell[ptr1] * 2 + hitRot;
          sp.locV = ypos + swell[ptr] + bash;
        } else if (state === 'ONCABLE') {
          sp.locH = cableGuy.locH;
          sp.locV = cableGuy.locV;
          if (g.gCableLength === 0) {
            state = 'INCOPTER';
            g.gCableItem = 0;
            g.gScore += 1000;
            ctx.puppetSound(3, 29);
          }
        } else {
          sp.locH = -1000;
          sp.locV = -1000;
        }
        ptr = (ptr + 1) % 90;
        ptr1 = (ptr + 2) % 90;
      },
    };
  });


  map.set('OilRig', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    return {
      name: 'OilRig',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 3;
        loopWidth = ctx.globals.gTileIDList.length * 128 * 0.25;
        loopX = loopWidth - xpos;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        xpos = wrapWorldX(xpos + (g.gXVel + g.gXOffset) * 0.25, loopX, loopWidth);
        sp.locH = xpos;
        sp.locV = ypos;
      },
    };
  });

  map.set('YellowCopter', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let ptr = 0;
    let state = 'FLY';
    let hitRot = 0;
    const swell: number[] = [];
    return {
      name: 'YellowCopter',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        swell.length = 0;
        for (let i = 1; i <= 90; i++) swell.push(5 * Math.cos(4 * i * rad));
        ptr = 0;
        hitRot = 0;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 50;
        state = 'FLY';
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        if (sp.member === 110) sp.member = 111;
        else if (sp.member === 111) sp.member = 110;
        hitRot *= 0.9;
        const copter = ctx.sprite(4);
        if (state === 'FLY') {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset + 2, loopX, loopWidth);
          if (xpos > 0 && xpos < 512 && Math.abs(copter.locH - sp.locH) < 40 && Math.abs(copter.locV - sp.locV) < 20) {
            state = 'HIT';
            ctx.puppetSound(3, sp.member === 189 ? 71 : 27);
            g.gDamagePercent = 100;
            hitRot = -g.gXVel * 3;
            g.gXVel = 0;
          }
          sp.locH = xpos;
          sp.rotation = 5 + swell[ptr] + hitRot;
          sp.locV = ypos + swell[ptr];
        } else {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          hitRot *= 0.95;
          if (sp.member === 189) {
            sp.locH = xpos;
            sp.rotation = 12 + swell[ptr] + hitRot;
            sp.locV = ypos + swell[ptr];
            ypos -= 1;
          } else {
            xpos += hitRot * 0.1;
            sp.locH = xpos;
            sp.rotation = 10 + swell[ptr] + hitRot;
            sp.locV = ypos + swell[ptr];
            ypos += 1;
          }
        }
        ptr = (ptr + 1) % 90;
      },
    };
  });

  map.set('LifeRaft', (params) => {
    const swellHeight = Number(params?.swellHeight ?? 0);
    const startPtr = Math.max(1, Number(params?.swellListPointerStart ?? 1)) - 1;
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let ptr = 0;
    let raftFront!: SpriteInstance;
    const swell: number[] = [];
    return {
      name: 'LifeRaft',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        swell.length = 0;
        for (let i = 1; i <= 90; i++) swell.push(swellHeight * Math.cos(i * 4 * rad));
        ptr = startPtr % 90;
        raftFront = ctx.sprite(sp.spriteNum + 4);
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 50;
        raftFront.locZ = 200;
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
        raftFront.locH = sp.locH;
        raftFront.locV = sp.locV;
      },
    };
  });

  map.set('ShipWreck', () => {
    let xpos = 0;
    let ypos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let ptr = 0;
    let crumpusPtr = 0;
    let crumpusX = -100;
    let crumpus!: SpriteInstance;
    const swell: number[] = [];
    return {
      name: 'ShipWreck',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        swell.length = 0;
        for (let i = 1; i <= 180; i++) swell.push(15 * Math.cos(i * 2 * rad));
        ptr = ctx.random(90) - 1;
        crumpusPtr = 0;
        crumpus = ctx.sprite(sp.spriteNum + 8);
        crumpus.locZ = 49;
        crumpusX = -100;
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 50;
        crumpus.locH = sp.locH;
        crumpus.locV = sp.locV;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        const copter = ctx.sprite(4);
        if (g.gPaused === 0) {
          xpos = wrapWorldX(xpos + g.gXVel + g.gXOffset, loopX, loopWidth);
          sp.locH = xpos;
          ptr = (ptr + 2) % 180;
          sp.locV = ypos + swell[ptr];
          crumpus.locH = sp.locH + crumpusX;
          crumpusX += 2;
          if (crumpusX === -90 && sp.locH > 0 && sp.locH < 512) {
            ctx.puppetSound(2, 32);
          }
          crumpusPtr = (crumpusPtr + 1) % 180;
          let h = swell[crumpusPtr] * 12;
          if (h < 1) {
            h = 1;
            crumpusX = -100;
          }
          crumpus.height = h;
        }
        if (sp.locV - copter.locV < crumpus.height && Math.abs(sp.locH - copter.locH) < 100) {
          copter.vars.Yvel = Number(copter.vars.Yvel ?? 0) - 0.1;
          copter.vars.tiltAngle = Number(copter.vars.tiltAngle ?? 0) + 0.5;
        }
      },
    };
  });


  const makeLightning = (name: string): BehaviorFactory => () => {
    let reflash = 0;
    return {
      name,
      spriteNum: 0,
      beginSprite(ctx, sp) {
        sp.locV = -1000;
        ctx.puppetSound(2, 30);
        reflash = 0;
      },
      exitFrame(ctx, sp) {
        if (ctx.globals.gPaused !== 0) return;
        if (sp.locV === -1000 && ctx.random(200) === 50) {
          sp.locH = ctx.random(512);
          sp.locV = 123 + ctx.random(3) * 50;
          sp.blend = 100;
        }
        if (sp.blend > 0) {
          if (sp.blend === 40 && reflash === 0) {
            sp.blend = 100;
            reflash = 1;
          }
          if (sp.blend > 10) {
            sp.blend -= 10;
          } else {
            ctx.puppetSound(2, 31);
            sp.blend = 0;
            sp.locV = -1000;
            reflash = 0;
          }
        }
        if (!ctx.soundBusy(2)) ctx.puppetSound(2, 30);
      },
    };
  };

  map.set('Lightning', makeLightning('Lightning'));
  map.set('VolcanoLightning', makeLightning('VolcanoLightning'));

  map.set('SeaBumph', () => ({
    name: 'SeaBumph',
    spriteNum: 0,
    beginSprite(ctx) {
      ctx.globals.gSeaFrame = 1;
      for (let i = 0; i < ctx.globals.gTileHeightList.length; i++) {
        ctx.globals.gTileHeightList[i] = ctx.random(50);
      }
    },
    exitFrame(ctx) {
      for (let i = 0; i < ctx.globals.gTileHeightList.length; i++) {
        let t = ctx.globals.gTileHeightList[i] * 0.95;
        if (t < 1) t = 0;
        ctx.globals.gTileHeightList[i] = t;
      }
    },
  }));

  map.set('SeaSwell', (params) => {
    const swellHeight = Number(params?.swellHeight ?? 0);
    const swell: number[] = [];
    let counter = 1;
    return {
      name: 'SeaSwell',
      spriteNum: 0,
      beginSprite(ctx) {
        ctx.globals.gSeaFrame = 1;
        swell.length = 0;
        counter = 1;
        for (let i = 1; i <= 90; i++) swell.push(swellHeight * Math.sin(i * 4 * rad));
      },
      exitFrame(ctx) {
        counter = counter >= 90 ? 1 : counter + 1;
        const ids = ctx.globals.gTileIDList;
        for (let i = 0; i < ids.length; i++) {
          let ptr = ((i + 1) * 10 + counter) % 90;
          if (ptr === 0) ptr = 1;
          if (ids[i] === 0 || ids[i] === 3 || ids[i] === 7) {
            ctx.globals.gTileHeightList[i] = swell[ptr - 1];
          }
        }
      },
    };
  });

  map.set('Whale', () => {
    let xpos = 0;
    let loopX = 0;
    let loopWidth = 0;
    let whaleState = 'WAITING';
    let tiltAngle = 0;
    let slapCount = 1;
    let snowBlow!: SpriteInstance;
    return {
      name: 'Whale',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
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
          if ((prevX <= 0 || prevX >= 512) && !ctx.soundBusy(2)) {
            ctx.puppetSound(2, 74);
          }
          if (whaleState === 'WAITING') {
            const sx = sp.locH - 16;
            const sy = sp.locV - 93;
            snowBlow.locH = sx;
            snowBlow.locV = sy;
            snowBlow.rotation = 180;
            const dx = sx - (cableGuy.locH + Number(cableGuy.vars.Xvel ?? 0));
            const dy = sy - (cableGuy.locV + Number(cableGuy.vars.Yvel ?? 0));
            if (Math.abs(dx) < 10 && dy < 10 && dy > -10) {
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
        sp.locH = xpos;
        sp.rotation = tiltAngle;
      },
    };
  });
}

