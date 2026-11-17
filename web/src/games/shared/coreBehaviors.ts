import type { BehaviorFactory, MovieRuntimeContext, SpriteInstance } from '../../engine/runtime/DirectorTypes.ts';
import type { Quad2D } from '../../engine/render/types.ts';

export function wrapWorldX(x: number, loopX: number, loopWidth: number): number {
  if (loopWidth <= 0) return x;
  if (x > loopX) return x - loopWidth;
  if (x < -loopX) return x + loopWidth;
  return x;
}

export function registerSharedCoreBehaviors(map: Map<string, BehaviorFactory>): void {
  map.set('frameScriptScrollTest', () => ({
    name: 'frameScriptScrollTest',
    spriteNum: 0,
    exitFrame(ctx) {
      ctx.go(ctx.currentFrame);
    },
    keyDown(ctx) {
      if (ctx.globals.gPaused === 1) {
        ctx.globals.gPaused = 0;
        for (let ch = 1; ch <= 4; ch++) ctx.soundControl(ch, 'play');
      } else {
        ctx.globals.gPaused = 1;
        for (let ch = 1; ch <= 4; ch++) ctx.soundControl(ch, 'pause');
      }
    },
  }));

  map.set('StartScreenFrameScript', () => ({
    name: 'StartScreenFrameScript',
    spriteNum: 0,
    exitFrame(ctx) {
      if (ctx.getInput().actions.confirm.justPressed || ctx.getInput().actions.action.justPressed) {
        ctx.go('MenuScreen');
        return;
      }
      ctx.go(ctx.currentFrame);
    },
    mouseUp(ctx) {
      ctx.go('MenuScreen');
    },
  }));

  map.set('MenuScreen', () => ({
    name: 'MenuScreen',
    spriteNum: 0,
    exitFrame(ctx) {
      if (ctx.getInput().actions.cheatUnlock.justPressed) {
        ctx.globals.gLockOut = '2';
        ctx.setPref(ctx.globals.gGameName, '2');
        ctx.go(ctx.currentFrame - 1);
        return;
      }
      if (ctx.getInput().actions.confirm.justPressed) {
        const maxLv = ctx.bundle.gameId === 'bermuda' ? 4 : 9;
        const lv = Math.max(1, Math.min(maxLv, ctx.globals.gLevel || 1));
        ctx.globals.gLevel = lv;
        ctx.puppetSound(2, 12);
        ctx.go(`Level${lv}`);
        return;
      }
      ctx.go(ctx.currentFrame);
    },
  }));

  map.set('GameOverScreenScript', () => ({
    name: 'GameOverScreenScript',
    spriteNum: 0,
    exitFrame(ctx) {
      ctx.go('MenuScreen');
    },
  }));

  map.set('MissionBriefingScript', () => ({
    name: 'MissionBriefingScript',
    spriteNum: 0,
    exitFrame(ctx) {
      const inp = ctx.getInput();
      if (inp.actions.confirm.justPressed || inp.actions.action.justPressed) {
        ctx.puppetSound(2, 12);
        ctx.go(ctx.currentFrame + 1);
        return;
      }
      if (inp.actions.cancel.justPressed) {
        ctx.puppetSound(2, 12);
        ctx.go('MenuScreen');
        return;
      }
      ctx.go(ctx.currentFrame);
    },
  }));

  map.set('ControlScreenScript', () => ({
    name: 'ControlScreenScript',
    spriteNum: 0,
    exitFrame(ctx) {
      ctx.go(ctx.currentFrame);
    },
    mouseUp(ctx) {
      const r = ctx.getRollover();
      if (r === 10) {
        ctx.globals.gProControls = 0;
        ctx.go('MenuScreen');
        ctx.puppetSound(2, 12);
      } else if (r === 11) {
        ctx.globals.gProControls = 1;
        ctx.go('MenuScreen');
        ctx.puppetSound(2, 12);
      }
    },
  }));

  map.set('PresentsScreenFrameScript', () => ({
    name: 'PresentsScreenFrameScript',
    spriteNum: 0,
    exitFrame(ctx) {
      ctx.go(ctx.currentFrame);
    },
    mouseUp(ctx) {
      ctx.go('StartScreen');
    },
  }));

  map.set('ZReset', () => ({
    name: 'ZReset',
    spriteNum: 0,
    beginSprite(_ctx, sp) {
      sp.locZ = sp.spriteNum;
    },
  }));

  map.set('FadeIn', () => ({
    name: 'FadeIn',
    spriteNum: 0,
    beginSprite(_ctx, sp) {
      sp.blend = 0;
    },
    exitFrame(_ctx, sp) {
      if (sp.blend < 100) sp.blend += 5;
    },
  }));

  map.set('HiLightRollover', () => ({
    name: 'HiLightRollover',
    spriteNum: 0,
    beginSprite(_ctx, sp) {
      sp.blend = 50;
    },
    exitFrame(ctx, sp) {
      sp.blend = ctx.getRollover() === sp.spriteNum ? 100 : 50;
    },
  }));

  map.set('BackButton', () => ({
    name: 'BackButton',
    spriteNum: 0,
    mouseUp(ctx, sp) {
      if (ctx.getRollover() === sp.spriteNum) {
        ctx.go('MenuScreen');
        ctx.puppetSound(2, 12);
      }
    },
  }));

  map.set('BackButtonToControls', () => ({
    name: 'BackButtonToControls',
    spriteNum: 0,
    mouseUp(ctx, sp) {
      if (ctx.getRollover() === sp.spriteNum) {
        ctx.go('MenuScreen');
        ctx.puppetSound(2, 12);
      }
    },
  }));

  map.set('TakeOffButton', () => ({
    name: 'TakeOffButton',
    spriteNum: 0,
    mouseUp(ctx, sp) {
      if (ctx.getRollover() === sp.spriteNum) {
        ctx.go(ctx.currentFrame + 1);
        ctx.puppetSound(2, 12);
      }
    },
  }));

  map.set('ChooseLevelButtons', () => ({
    name: 'ChooseLevelButtons',
    spriteNum: 0,
    beginSprite(ctx, sp) {
      sp.blend = 50;
      sp.locZ = sp.spriteNum;
      if (ctx.bundle.gameId === 'bermuda') {
        ctx.globals.gLockOut = '2';
      }
    },
    exitFrame(ctx, sp) {
      sp.blend = ctx.getRollover() === sp.spriteNum ? 100 : 50;
    },
    mouseUp(ctx, sp) {
      const n = sp.spriteNum;
      const lock = Number.parseInt(String(ctx.globals.gLockOut), 10) || 0;
      const maxLv = ctx.bundle.gameId === 'bermuda' ? 4 : 9;
      const targetLv = n - 7;
      if (targetLv < 1 || targetLv > maxLv) return;

      if (targetLv <= 3 || (targetLv <= 6 && lock > 0) || (targetLv <= 9 && lock > 1)) {
        ctx.globals.gLevel = targetLv;
        ctx.go(`Level${targetLv}`);
        ctx.puppetSound(2, 12);
      } else {
        ctx.puppetSound(2, 13);
        const lockSprite = targetLv <= 6 ? ctx.sprite(19) : ctx.sprite(20);
        lockSprite.blend = 0;
      }
    },
  }));

  map.set('Hi-Scores', () => {
    let lockOutFlashCount1 = 0;
    let lockOutFlashCount2 = 0;
    const fmt7 = (v: number) => String(Math.max(0, Math.floor(v))).padStart(7, '0');
    return {
      name: 'Hi-Scores',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        g.gScoreTotal = 0;
        const list: string[] = [];
        const numScores = ctx.bundle.gameId === 'bermuda' ? 4 : 9;
        for (let i = 0; i < numScores; i++) {
          g.gScoreTotal += g.gLevelScoreList[i] ?? 0;
          list.push(fmt7(g.gLevelScoreList[i] ?? 0));
        }
        list.push(fmt7(g.gScoreTotal));
        if (ctx.bundle.gameId === 'bermuda') {
          sp.text = `${list[0]}\n${list[1]}\n${list[2]}\n${list[3]}\n\n${list[4]}`;
        } else {
          sp.text =
            `${list[0]}\n${list[1]}\n${list[2]}\n\n` +
            `${list[3]}\n${list[4]}\n${list[5]}\n\n` +
            `${list[6]}\n${list[7]}\n${list[8]}\n\n${list[9]}`;
        }
        if (g.gLevelScoreList[0] && g.gLevelScoreList[1] && g.gLevelScoreList[2] && g.gLockOut === '0') {
          g.gLockOut = '1';
        }
        if (g.gLevelScoreList[3] && g.gLevelScoreList[4] && g.gLevelScoreList[5] && g.gLockOut === '1') {
          g.gLockOut = '2';
        }
        if (g.gLockOut === '1') {
          ctx.sprite(19).locV = -1000;
        } else if (g.gLockOut === '2') {
          ctx.sprite(19).locV = -1000;
          ctx.sprite(20).locV = -1000;
        }
        lockOutFlashCount1 = 0;
        lockOutFlashCount2 = 0;
      },
      exitFrame(ctx) {
        if (ctx.sprite(19).blend === 0 && lockOutFlashCount1 === 0) lockOutFlashCount1 = 10;
        if (lockOutFlashCount1 > 0) {
          ctx.sprite(19).blend = 100 * (lockOutFlashCount1 % 2);
          lockOutFlashCount1--;
        }
        if (ctx.sprite(20).blend === 0 && lockOutFlashCount2 === 0) lockOutFlashCount2 = 10;
        if (lockOutFlashCount2 > 0) {
          ctx.sprite(20).blend = 100 * (lockOutFlashCount2 % 2);
          lockOutFlashCount2--;
        }
      },
    };
  });

  map.set('High Score Hub - Standard.', () => ({
    name: 'High Score Hub - Standard.',
    spriteNum: 0,
    mouseUp(ctx) {
      const best = Number.parseInt(ctx.getPref(`${ctx.globals.gGameName}_hi`) ?? '0', 10) || 0;
      if (ctx.globals.gScoreTotal > best) {
        ctx.setPref(`${ctx.globals.gGameName}_hi`, String(ctx.globals.gScoreTotal));
      }
      ctx.puppetSound(2, 12);
      ctx.go('MenuScreen');
    },
  }));

  map.set('Stolen Link button', () => ({
    name: 'Stolen Link button',
    spriteNum: 0,
    mouseUp(ctx) {
      ctx.go('MenuScreen');
    },
  }));

  map.set('SeaFrameCounter', () => {
    let delayCount = 0;
    return {
      name: 'SeaFrameCounter',
      spriteNum: 0,
      beginSprite(ctx) {
        delayCount = 0;
        ctx.globals.gSeaFrame = 1;
      },
      exitFrame(ctx) {
        delayCount++;
        if (delayCount > 3) {
          ctx.globals.gSeaFrame++;
          if (ctx.globals.gSeaFrame > 20) ctx.globals.gSeaFrame = 1;
          delayCount = 0;
        }
      },
    };
  });

  map.set('Ship', () => {
    let xpos = 0;
    let ypos = 0;
    let swellAngle = 0;
    let loopX = 0;
    let loopWidth = 0;
    const rad = Math.PI / 180;
    return {
      name: 'Ship',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        loopWidth = ctx.globals.gTileIDList.length * 128;
        loopX = loopWidth * 0.5;
        xpos = sp.locH;
        ypos = sp.locV;
        sp.locZ = 50;
        swellAngle = 0;
      },
      exitFrame(ctx, sp) {
        if (ctx.globals.gPaused !== 0) return;
        xpos = wrapWorldX(xpos + ctx.globals.gXVel + ctx.globals.gXOffset, loopX, loopWidth);
        sp.locH = xpos;
        swellAngle = (swellAngle + 2) % 360;
        sp.locV = ypos + 10 * Math.cos(swellAngle * rad);
      },
    };
  });

  map.set('Score&Bars', () => {
    let displayScore = 0;
    let displayFuel = 50;
    let displayDamage = 100;
    let fuelBarDelay = 0;
    let fuelFlashToggle = 1;
    let damageBarDelay = 0;
    let damageFlashToggle = 1;
    return {
      name: 'Score&Bars',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        g.gScore = 0;
        displayScore = 0;
        sp.locZ = 2000;
        for (let i = 1; i <= 7; i++) {
          ctx.sprite(sp.spriteNum + i - 1).locZ = 2001;
        }
        const fuelBar = ctx.sprite(sp.spriteNum + 9);
        ctx.sprite(sp.spriteNum + 10).locZ = 2004;
        fuelBar.locZ = 2003;
        const damageBar = ctx.sprite(sp.spriteNum + 7);
        if (damageBar.member === 60 && damageBar.width < 90) {
          damageBar.width = 92;
          damageBar.height = 17;
        }
        ctx.sprite(sp.spriteNum + 8).locZ = 2002;
        damageBar.locZ = 2001;
        if (ctx.bundle.gameId === 'bermuda') {
          ctx.sprite(2).locZ = 2003;
        }
        fuelBarDelay = 0;
        displayFuel = 50;
        fuelFlashToggle = 1;
        displayDamage = 100;
        damageBarDelay = 0;
        damageFlashToggle = 1;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        if (g.gScore > 9999999) g.gScore = 9999999;
        displayScore += (g.gScore - displayScore) * 0.2;
        let calc = Math.floor(displayScore);
        for (let i = 7; i >= 1; i--) {
          const p10 = Math.pow(10, i - 1);
          const rem = calc % p10;
          const digit = Math.floor((calc - rem) / p10);
          calc = rem;
          ctx.sprite(sp.spriteNum + i - 1).member = 50 + digit;
        }
        if (g.gfuelPercent > 100) g.gfuelPercent = 100;
        displayFuel += (g.gfuelPercent - displayFuel) * 0.05;
        const fuelBar = ctx.sprite(sp.spriteNum + 9);
        fuelBar.locH = 512 - (displayFuel / 100) * 93;
        if (displayFuel < 30) {
          fuelBarDelay++;
          if (fuelBarDelay === 4) {
            fuelBarDelay = 0;
            fuelBar.blend = 55 + 45 * fuelFlashToggle;
            if (fuelFlashToggle === 1) fuelBar.locH = 420;
            fuelFlashToggle = -fuelFlashToggle;
            if (!ctx.soundBusy(3)) ctx.puppetSound(3, 13);
          }
        } else {
          fuelBar.blend = 100;
        }
        if (g.gDamagePercent > 100) g.gDamagePercent = 100;
        displayDamage += (g.gDamagePercent - displayDamage) * 0.05;
        const damageBar = ctx.sprite(sp.spriteNum + 7);
        damageBar.locH = (displayDamage / 100) * 92;
        if (g.gDamagePercent > 80) {
          damageBarDelay++;
          if (damageBarDelay === 4) {
            damageBarDelay = 0;
            damageBar.blend = 55 + 45 * damageFlashToggle;
            damageFlashToggle = -damageFlashToggle;
            if (!ctx.soundBusy(3)) ctx.puppetSound(3, 13);
          } else {
            damageBar.blend = 100;
          }
        }
        if (ctx.bundle.gameId === 'bermuda') {
          ctx.sprite(2).locH = g.gCoconuts * 9;
        }
      },
    };
  });

  map.set('Smoke', () => {
    let rotWise = 1;
    return {
      name: 'Smoke',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        sp.vars.smokeState = 'NULL';
        sp.vars.Xpos = -1000;
        sp.vars.Ypos = -1000;
        sp.locZ = 105;
        ctx.globals.gSmokeList.push(sp);
        rotWise = ctx.random(2) === 2 ? -1 : 1;
      },
      exitFrame(ctx, sp) {
        if (ctx.globals.gPaused !== 0) return;
        if (sp.vars.smokeState === 'NULL') {
          sp.vars.Xpos = -1000;
          sp.vars.Ypos = -1000;
          sp.locH = -1000;
          sp.locV = -1000;
          const rand = ctx.random(10);
          sp.width = rand;
          sp.height = rand;
          sp.blend = 100;
        } else if (sp.vars.smokeState === 'SMOKE') {
          sp.vars.Xpos = Number(sp.vars.Xpos) + ctx.globals.gXVel + ctx.globals.gXOffset;
          sp.vars.Ypos = Number(sp.vars.Ypos) - 2;
          sp.rotation += rotWise * 3;
          sp.width += 2;
          sp.height += 2;
          sp.blend -= 2;
          if (sp.blend <= 0) {
            sp.vars.smokeState = 'NULL';
            ctx.globals.gSmokeList.push(sp);
            sp.vars.Xpos = -1000;
            sp.vars.Ypos = -1000;
            sp.width = 1;
            sp.height = 1;
            sp.blend = 100;
          }
          sp.locH = Number(sp.vars.Xpos);
          sp.locV = Number(sp.vars.Ypos);
        }
      },
    };
  });

  map.set('GuyOverlay', () => {
    let startHeight = 0;
    let startWidth = 0;
    let splashHeight = 0;
    let splashVel = 7;
    return {
      name: 'GuyOverlay',
      spriteNum: 0,
      beginSprite(_ctx, sp) {
        sp.vars.Xpos = sp.locH;
        sp.vars.Ypos = sp.locV;
        sp.vars.overlayState = 'NULL';
        sp.locZ = 102;
        startHeight = sp.height;
        startWidth = sp.width;
        sp.blend = 0;
        splashHeight = startHeight * 0.5;
        splashVel = 7;
      },
      exitFrame(ctx, sp) {
        if (ctx.globals.gPaused !== 0) return;
        const st = sp.vars.overlayState;
        if (st === 'NULL') {
          sp.locH = Number(sp.vars.Xpos);
          sp.locV = Number(sp.vars.Ypos);
        } else if (st === 'StartSplash') {
          sp.blend = 100;
          sp.height = startHeight * 0.5;
          sp.width = startWidth;
          sp.vars.overlayState = 'SPLASH';
          sp.locH = Number(sp.vars.Xpos);
          sp.locV = Number(sp.vars.Ypos);
          splashHeight = 0;
          splashVel = 7;
        } else if (st === 'SPLASH') {
          splashVel -= 0.25;
          splashHeight += splashVel;
          sp.height = splashHeight;
          sp.width = startWidth + 5 - splashHeight * 0.1;
          if (splashVel < 0) {
            sp.blend -= 1;
            if (sp.blend <= 0) {
              sp.vars.overlayState = 'NULL';
              sp.vars.Xpos = -1000;
              sp.vars.Ypos = -1000;
            }
          }
          sp.vars.Xpos = Number(sp.vars.Xpos) + ctx.globals.gXVel + ctx.globals.gXOffset;
          sp.locH = Number(sp.vars.Xpos);
          sp.locV = Number(sp.vars.Ypos);
        }
      },
    };
  });

  const tileMember = (tid: number, seaFrame: number, isFar: boolean): number => {
    switch (tid) {
      case 0: return seaFrame;
      case 1: return 23;
      case 2: return 23 + seaFrame;
      case 3: return 43 + seaFrame;
      case 4: return isFar ? 65 : 64;
      case 5: return isFar ? 67 : 66;
      case 6: return isFar ? 68 : 68;
      case 7: return isFar ? 69 : 70;
      case 8: return isFar ? 70 : 69;
      default: return 1;
    }
  };

  map.set('QuadTileFar', () => {
    let xpos = 0;
    let rightLoopX = 0;
    let leftLoopX = 0;
    let loopWidth = 0;
    let thisHalfWidth = 0;
    let ptr = 1;
    let thisTileID = 0;
    return {
      name: 'QuadTileFar',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        const cnt = g.gTileIDList.length || 1;
        rightLoopX = 256 + sp.width * 4.5;
        leftLoopX = 256 - sp.width * 4.5;
        loopWidth = 512 + sp.width * 5;
        xpos = sp.locH;
        thisHalfWidth = sp.width / 2;
        sp.locZ = 2;
        const calc = xpos - 256 - 64 + sp.width / 2;
        ptr = Math.trunc(cnt / 2) + Math.trunc(calc / 128);
        ptr = ((ptr - 1) % cnt + cnt) % cnt + 1;
        thisTileID = g.gTileIDList[ptr - 1] ?? 0;
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cnt = g.gTileIDList.length || 1;
        xpos += g.gXVel + g.gXOffset;
        if (Math.trunc(xpos) > rightLoopX) {
          xpos -= loopWidth;
          ptr -= 9;
          while (ptr < 1) ptr += cnt;
          thisTileID = g.gTileIDList[ptr - 1] ?? 0;
        }
        if (Math.trunc(xpos) < leftLoopX) {
          xpos += loopWidth;
          ptr += 9;
          while (ptr > cnt) ptr -= cnt;
          thisTileID = g.gTileIDList[ptr - 1] ?? 0;
        }
        sp.locH = xpos;
        const nextPtr = ptr + 1 > cnt ? 1 : ptr + 1;
        const hL = g.gTileHeightList[ptr - 1] ?? 0;
        const hR = g.gTileHeightList[nextPtr - 1] ?? 0;
        const xL = xpos - thisHalfWidth;
        const xR = xpos + thisHalfWidth;
        const quad: Quad2D = [
          { x: Math.trunc(xL + (256 - xL) * 0.5), y: 256 },
          { x: Math.trunc(xR + (256 - xR) * 0.5), y: 256 },
          { x: Math.trunc(xR), y: Math.trunc(280 - hR) },
          { x: Math.trunc(xL), y: Math.trunc(280 - hL) },
        ];
        sp.quad = quad;
        sp.member = tileMember(thisTileID, g.gSeaFrame, true);
      },
    };
  });

  map.set('QuadTileNear', () => {
    let xpos = 0;
    let rightLoopX = 0;
    let leftLoopX = 0;
    let loopWidth = 0;
    let thisHalfWidth = 0;
    let ptr = 1;
    let thisTileID = 0;
    let scenerySprite!: SpriteInstance;
    let sceneryID = 0;
    let thisPickup: SpriteInstance | null = null;

    const sceneryMemberFor = (id: number): number => {
      switch (id) {
        case 0: return 68;
        case 1: return 69;
        case 2: return 70;
        case 3: return 71;
        case 4: case 5: case 6: return 68;
        case 7: return 139;
        case 8: return 148;
        case 9: return 153;
        case 10: return 156;
        case 11: return 188;
        case 12: return 71;
        case 13: return 340;
        case 14: return 341;
        case 15: return 342;
        default: return 68;
      }
    };

    const refreshTileAndPickup = (ctx: MovieRuntimeContext) => {
      const g = ctx.globals;
      const cnt = g.gTileIDList.length || 1;
      const nextPtr = ptr + 1 > cnt ? 1 : ptr + 1;
      const hL = g.gTileHeightList[ptr - 1] ?? 0;
      const hR = g.gTileHeightList[nextPtr - 1] ?? 0;
      scenerySprite.locV = 280 - hL + (hL - hR) * 0.5;
      sceneryID = g.gSceneryList[ptr - 1] ?? 0;

      if (thisPickup) {
        thisPickup.vars.pickupState = 'NULL';
        g.gPickupList.push(thisPickup);
        thisPickup = null;
      }
      const spawnPickup = (id: string, memberNum: number) => {
        if (g.gPickupList.length === 0) return;
        const p = g.gPickupList.shift()!;
        p.vars.pickupID = id;
        p.vars.pickupState = 'ONGROUND';
        p.member = memberNum;
        p.vars.pickupTile = ptr;
        p.vars.pickupMaster = { clearPickup: () => { thisPickup = null; } };
        thisPickup = p;
      };
      if (sceneryID === 4) spawnPickup('TREASURE', 84);
      else if (sceneryID === 5) spawnPickup('FUEL', 85);
      else if (sceneryID === 6) spawnPickup('TOOLS', 86);
      else if (sceneryID === 12) spawnPickup('COCONUTS', 199);
    };

    const updateQuad = (ctx: MovieRuntimeContext, sp: SpriteInstance) => {
      const g = ctx.globals;
      const cnt = g.gTileIDList.length || 1;
      const nextPtr = ptr + 1 > cnt ? 1 : ptr + 1;
      const hL = g.gTileHeightList[ptr - 1] ?? 0;
      const hR = g.gTileHeightList[nextPtr - 1] ?? 0;
      const xL = xpos - thisHalfWidth;
      const xR = xpos + thisHalfWidth;
      sp.quad = [
        { x: Math.trunc(xL), y: Math.trunc(280 - hL) },
        { x: Math.trunc(xR), y: Math.trunc(280 - hR) },
        { x: Math.trunc(xR + (xR - 256)), y: 330 },
        { x: Math.trunc(xL + (xL - 256)), y: 330 },
      ];
      sp.member = tileMember(thisTileID, g.gSeaFrame, false);
      scenerySprite.member = sceneryMemberFor(sceneryID);
      scenerySprite.locH = sp.locH;
      if (thisPickup) {
        if (thisPickup.vars.pickupID === 'COCONUTS') {
          thisPickup.locH = scenerySprite.locH - 18;
          thisPickup.locV = scenerySprite.locV - 90;
        } else {
          thisPickup.locH = scenerySprite.locH;
          thisPickup.locV = scenerySprite.locV;
        }
      }
    };

    return {
      name: 'QuadTileNear',
      spriteNum: 0,
      beginSprite(ctx, sp) {
        const g = ctx.globals;
        const cnt = g.gTileIDList.length || 1;
        rightLoopX = 512 + sp.width / 2;
        leftLoopX = -sp.width / 2;
        loopWidth = 512 + sp.width;
        xpos = sp.locH;
        thisHalfWidth = sp.width / 2;
        const calc = xpos - 256 - 64 + sp.width / 2;
        ptr = Math.trunc(cnt / 2) + Math.trunc(calc / 128);
        ptr = ((ptr - 1) % cnt + cnt) % cnt + 1;
        thisTileID = g.gTileIDList[ptr - 1] ?? 0;
        scenerySprite = ctx.sprite(sp.spriteNum + 5);
        sp.locZ = 1000;
        scenerySprite.locZ = 50;
        thisPickup = null;
        refreshTileAndPickup(ctx);
        updateQuad(ctx, sp);
      },
      exitFrame(ctx, sp) {
        const g = ctx.globals;
        if (g.gPaused !== 0) return;
        const cnt = g.gTileIDList.length || 1;
        xpos += g.gXVel + g.gXOffset;
        if (Math.trunc(xpos) > rightLoopX) {
          xpos -= loopWidth;
          ptr -= 5;
          while (ptr < 1) ptr += cnt;
          thisTileID = g.gTileIDList[ptr - 1] ?? 0;
          refreshTileAndPickup(ctx);
        }
        if (Math.trunc(xpos) < leftLoopX) {
          xpos += loopWidth;
          ptr += 5;
          while (ptr > cnt) ptr -= cnt;
          thisTileID = g.gTileIDList[ptr - 1] ?? 0;
          refreshTileAndPickup(ctx);
        }
        sp.locH = xpos;
        updateQuad(ctx, sp);
      },
    };
  });
}
