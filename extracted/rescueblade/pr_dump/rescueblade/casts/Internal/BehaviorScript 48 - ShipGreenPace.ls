property this, Xpos, radians, Ypos, loopX, loopWidth, door, cableGuy, distToGuy
global gXVel, gXOffset, gPaused, gTileIDList, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  door = sprite(the currentSpriteNum - 1)
  door.loc = this.loc
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  this.locZ = 203
  door.locZ = 50
  cableGuy = sprite(6)
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
    if (Xpos > 0) and (Xpos < 512) then
      frontPoint = this.loc + point(80, 10)
      backPoint = this.loc + point(-100, 10)
      xDiff = float(frontPoint.locH - (cableGuy.locH + cableGuy.Xvel))
      yDiff = float(frontPoint.locV - (cableGuy.locV + cableGuy.Yvel))
      distToGuy = float(sqrt((xDiff * xDiff) + (yDiff * yDiff)))
      toGuyVector = point(xDiff, yDiff)
      if distToGuy < 80 then
        if distToGuy <> 0 then
          normToGuyVector = toGuyVector / distToGuy
          pushVector = normToGuyVector * (80 - distToGuy)
          cableGuy.Xvel = cableGuy.Xvel - pushVector.locH
          cableGuy.Yvel = cableGuy.Yvel - pushVector.locV
        end if
      end if
      xDiff = float(backPoint.locH - (cableGuy.locH + cableGuy.Xvel))
      yDiff = float(backPoint.locV - (cableGuy.locV + cableGuy.Yvel))
      distToGuy = float(sqrt((xDiff * xDiff) + (yDiff * yDiff)))
      toGuyVector = point(xDiff, yDiff)
      if distToGuy < 100 then
        if distToGuy <> 0 then
          normToGuyVector = toGuyVector / distToGuy
          pushVector = normToGuyVector * (100 - distToGuy)
          cableGuy.Xvel = cableGuy.Xvel - pushVector.locH
          cableGuy.Yvel = cableGuy.Yvel - pushVector.locV
        end if
      end if
      xDiff = float(this.locH - (cableGuy.locH + cableGuy.Xvel))
      yDiff = float(this.locV - (cableGuy.locV + cableGuy.Yvel))
      if abs(xDiff) < 30 then
        if yDiff < 30 then
          cableGuy.Yvel = cableGuy.Yvel - (30 - yDiff)
        end if
      end if
    end if
    this.locH = Xpos
    door.loc = this.loc
  end if
end
