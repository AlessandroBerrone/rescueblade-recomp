property this, Xpos, radians, Ypos, mapXPos, swell, swellList, swellListPointer, COPTER, sway, bellRung, loopX, loopWidth
global gXVel, gXOffset, gPaused, gTileIDList, gScore, gFlyingPoints

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  COPTER = sprite(4)
  swellList = []
  flyingPoints = sprite(3)
  repeat with i = 1 to 90
    swellAngle = 4 * i
    swellList.add(5 * cos(swellAngle * radians))
  end repeat
  swellListPointer = 1
  swell = 0
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 50
  mapXPos = Xpos - 256
  sway = 0
  swellAngle = 0
  bellRung = 0
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
      if abs(xDiff) < 20 then
        yDiff = COPTER.locV - this.locV
        if (yDiff > -150) and (yDiff < -60) then
          sway = sway + 0.16
        end if
      end if
    end if
    sway = sway - (this.rotation * 0.01)
    sway = sway * 0.98999999999999999
    this.rotation = this.rotation + sway
    if abs(this.rotation) > 20 then
      if bellRung = 0 then
        bellRung = 1
        puppetSound(4, member(26, "Sfx"))
        gScore = gScore + 100
        gFlyingPoints = 100
      end if
    end if
    swellListPointer = swellListPointer + 1
    if swellListPointer > 90 then
      swellListPointer = 1
    end if
    this.locH = Xpos
    this.locV = Ypos + swellList[swellListPointer]
  end if
end
