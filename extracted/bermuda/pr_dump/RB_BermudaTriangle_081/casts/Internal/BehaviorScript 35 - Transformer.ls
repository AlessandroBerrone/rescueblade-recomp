property this, Xpos, Ypos, mapXPos, loopX, bolt, COPTER, cableGuy, ouchCount, prevBolt, boltOffset, loopWidth
global gXVel, gXOffset, gPaused, gTileIDList, gDamagePercent

on beginSprite
  this = sprite(the currentSpriteNum)
  bolt = sprite(the currentSpriteNum - 1)
  COPTER = sprite(4)
  cableGuy = sprite(6)
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  this.locZ = 51
  bolt.locZ = 52
  mapXPos = Xpos - 256
  loopX = (gTileIDList.count * 128 * 0.25) - Xpos
  ouchCount = 0
  prevBolt = 0
  boltOffset = -50
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + (gXVel + gXOffset)
    if Xpos > loopX then
      Xpos = Xpos - loopWidth
    end if
    if Xpos < -loopX then
      Xpos = Xpos + loopWidth
    end if
    this.locH = Xpos
    this.locV = Ypos
    boltTarget = cableGuy
    xDiff = this.locH - boltTarget.locH
    if abs(xDiff) < 120 then
      yDiff = this.locV - boltTarget.locV
      if yDiff < 168 then
        rand = random(2)
        if rand = 1 then
          boltTarget = cableGuy
        else
          boltTarget = COPTER
        end if
        boltOffset = 96 - (random(3) * 48)
        bolt.locH = this.locH + boltOffset
        bolt.locV = this.locV
        bolt.rotation = AngleGrind(bolt.locH, bolt.locV, boltTarget.locH, boltTarget.locV) + 90
        xDiff = bolt.locH - boltTarget.locH
        yDiff = bolt.locV - boltTarget.locV
        bolt.height = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        if prevBolt = 0 then
          prevBolt = 1
          puppetSound(3, member(38, "Sfx"))
        end if
        gDamagePercent = gDamagePercent + 0.5
        if soundBusy(4) = 0 then
          puppetSound(4, member(34 + ouchCount, "Sfx"))
          ouchCount = ouchCount + 1
          if ouchCount > 3 then
            ouchCount = 0
          end if
        end if
      else
        if prevBolt = 1 then
          prevBolt = 0
          puppetSound(3, 0)
        end if
        bolt.locH = -1000
        bolt.locV = -1000
      end if
    else
      if prevBolt = 1 then
        prevBolt = 0
        puppetSound(3, 0)
      end if
      bolt.locH = -1000
      bolt.locV = -1000
    end if
  end if
end
