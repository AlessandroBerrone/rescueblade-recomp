property this, Xpos, radians, Ypos, loopX, loopWidth, bergFront, tiltVel, tiltAngle, COPTER, snowBlow
global gXVel, gXOffset, gPaused, gTileIDList, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  bergFront = sprite(the currentSpriteNum + 1)
  snowBlow = sprite(56)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  COPTER = sprite(5)
  this.locZ = 50
  bergFront.locZ = 1100
  bergFront.blend = 50
  tiltAngle = 0.0
  tiltVel = 0.0
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
      xDiff = COPTER.locH - this.locH
      yDiff = COPTER.locV - this.locV
      if (abs(xDiff) < 60) and (yDiff > -90) and (yDiff < -20) then
        snowBlow.locH = COPTER.locH
        snowBlow.locV = this.locV - 20
        snowBlow.rotation = 0
        if xDiff > 0 then
          tiltVel = tiltVel + ((90 - yDiff) * 0.001)
        else
          tiltVel = tiltVel - ((90 - yDiff) * 0.001)
        end if
      end if
      tiltVel = tiltVel - (tiltAngle * 0.005)
      tiltVel = tiltVel * 0.90000000000000002
      tiltAngle = tiltAngle + tiltVel
    end if
    this.rotation = tiltAngle
    this.locH = Xpos
    bergFront.loc = this.loc
    bergFront.rotation = tiltAngle
  end if
end
