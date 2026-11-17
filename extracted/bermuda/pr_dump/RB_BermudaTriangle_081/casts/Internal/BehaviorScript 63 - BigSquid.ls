property this, Xpos, radians, Ypos, podsFront, loopX, loopWidth, Eye, eyeOffset, eyeVel
global gXVel, gXOffset, gPaused, gTileIDList, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  Eye = sprite(the currentSpriteNum + 1)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  eyeOffset = 4
  this.locZ = 103
  eyeVel = 0
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
    eyeVel = eyeVel - (eyeOffset * 0.025)
    eyeOffset = eyeOffset + eyeVel
    Eye.locH = this.locH + eyeOffset
    Eye.locV = this.locV - eyeOffset
  end if
end
