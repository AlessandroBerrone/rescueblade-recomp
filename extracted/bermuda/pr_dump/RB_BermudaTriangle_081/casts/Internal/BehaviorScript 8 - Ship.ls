property this, Xpos, swellAngle, radians, Ypos, mapXPos, loopWidth, loopX
global gXVel, gXOffset, gPaused, gTileIDList

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 50
  mapXPos = Xpos - 256
  swellAngle = 0
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
    this.locH = Xpos
    swellAngle = swellAngle + 2
    if swellAngle > 360 then
      swellAngle = swellAngle - 360
    end if
    this.locV = Ypos + (10 * cos(swellAngle * radians))
  end if
end
