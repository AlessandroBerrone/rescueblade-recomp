property this, Xpos, radians, Ypos, podsFront, loopX, loopWidth, cableGuy, COPTER, firstPhoto
global gXVel, gXOffset, gPaused, gTileIDList, gXVelChange, gScore

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  cableGuy = sprite(6)
  COPTER = sprite(4)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  this.locZ = 1000
  firstPhoto = 0
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + gXVel + gXOffset
    if Xpos > loopX then
      Xpos = Xpos - loopWidth
    end if
    if Xpos < -loopX then
      Xpos = Xpos + loopWidth
    end if
    this.ink = 0
    if (Xpos > 50) and (Xpos < 462) then
      if cableGuy.takingPhoto = 1 then
        xDiff = float(cableGuy.locH - this.locH)
        yDiff = float(cableGuy.locV - this.locV)
        distToCopter = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        if distToCopter < 200 then
          gScore = gScore + (100 * (1 - (distToCopter / 200.0)))
          this.ink = 33
          if firstPhoto < 2 then
            gScore = gScore + (1000 * (1 - (distToCopter / 200.0)))
            puppetSound(3, member(8, "Sfx"))
            firstPhoto = firstPhoto + 1
          end if
        end if
      end if
    end if
    this.locH = Xpos
  end if
end
