property this, Xpos, radians, Ypos, podsFront, loopX, loopWidth
global gXVel, gXOffset, gPaused, gTileIDList, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  podsFront = sprite(the currentSpriteNum + 1)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  this.locZ = 103
  podsFront.locZ = 1001
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
    podsFront.loc = this.loc
  end if
end
