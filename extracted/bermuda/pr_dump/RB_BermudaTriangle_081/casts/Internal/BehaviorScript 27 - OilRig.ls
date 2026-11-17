property this, Xpos, Ypos, mapXPos, loopX, loopWidth
global gXVel, gXOffset, gPaused, gTileIDList

on beginSprite
  this = sprite(the currentSpriteNum)
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 3
  mapXPos = Xpos - 256
  loopX = (gTileIDList.count * 128 * 0.25) - Xpos
  loopWidth = gTileIDList.count * 128 * 0.25
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + ((gXVel + gXOffset) * 0.25)
    if Xpos > loopX then
      Xpos = Xpos - loopWidth
    end if
    if Xpos < -loopX then
      Xpos = Xpos + loopWidth
    end if
    this.locH = Xpos
    this.locV = Ypos
  end if
end
