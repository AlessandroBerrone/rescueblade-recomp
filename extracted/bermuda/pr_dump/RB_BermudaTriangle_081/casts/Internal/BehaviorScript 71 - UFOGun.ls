property this, radians, Xpos, Ypos, mapXPos, loopX, bolt, COPTER, cableGuy, ouchCount, prevBolt, boltOffset, loopWidth, gun, Yvel, Xvel, startY, yTarget, fireCounter, donkCount, xDonk, UFO, glow, glowBlend
global gXVel, gXOffset, gPaused, gTileIDList, gDamagePercent, gCoconutList, yDonk

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  bolt = sprite(the currentSpriteNum - 1)
  UFO = sprite(the currentSpriteNum - 4)
  glow = sprite(the currentSpriteNum - 2)
  glow.blend = 0
  startY = this.locV
  COPTER = sprite(4)
  yTarget = 0
  cableGuy = sprite(6)
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  Yvel = 0
  Xvel = 0
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  this.locZ = 52
  bolt.locZ = 51
  glow.locZ = 50
  mapXPos = Xpos - 256
  loopX = (gTileIDList.count * 128 * 0.25) - Xpos
  ouchCount = 0
  prevBolt = 0
  boltOffset = -50
  fireCounter = 0
  donkCount = 0
  xDonk = 0
  yDonk = 0
  glowBlend = 0
end

on exitFrame
  if gPaused = 0 then
    this.loc = UFO.loc
    glow.loc = this.loc
    glow.rotation = this.rotation
    if (this.locH > 0) and (this.locH < 512) and (this.locV > 0) then
      fireCounter = fireCounter + 1
      if fireCounter >= 100 then
        if glow.blend = 30 then
          puppetSound(2, member(93, "Sfx"))
        end if
        if glow.blend >= 100 then
          if bolt.fireBallState = #NULL then
            bolt.fireBallState = #FIRED
            puppetSound(2, member(94, "Sfx"))
            bolt.locH = this.locH + (50 * cos((this.rotation + 180) * radians))
            bolt.locV = this.locV + (50 * sin((this.rotation + 180) * radians))
            bolt.rotation = this.rotation - 180
            glow.blend = 0
          end if
        end if
        if fireCounter >= 150 then
          fireCounter = 0
        end if
        if fireCounter < 200 then
          if glow.blend < 100 then
            glow.blend = glow.blend + 2
          end if
        end if
      else
      end if
      this.rotation = AngleGrind(this.locH, this.locV, COPTER.locH, COPTER.locV) + 180
    end if
  end if
end
