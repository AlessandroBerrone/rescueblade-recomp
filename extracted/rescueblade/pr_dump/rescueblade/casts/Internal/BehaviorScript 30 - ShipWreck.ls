property this, Xpos, radians, Ypos, mapXPos, raftFront, cableGuy, swellList, swellListPointer, crumpus, crumpusX, crumpusPointer, COPTER, loopX, loopWidth
global gXVel, gXOffset, gPaused, gTileIDList

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  cableGuy = sprite(6)
  crumpus = sprite(the currentSpriteNum + 8)
  COPTER = sprite(4)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 50
  mapXPos = Xpos - 256
  swellAngle = random(360)
  swellList = []
  swellListPointer = random(90)
  repeat with i = 1 to 180
    swellAngle = i * 2
    swellList.add(15 * cos(swellAngle * radians))
  end repeat
  crumpusPointer = 1.0
  crumpus.locZ = 49
  crumpusX = -100
  crumpus.locH = this.locH
  crumpus.locV = this.locV
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
    swellListPointer = swellListPointer + 2
    if swellListPointer > 180 then
      swellListPointer = 1
    end if
    this.locV = Ypos + swellList[swellListPointer]
    crumpus.locH = this.locH + crumpusX
    crumpusX = crumpusX + 2
    if crumpusX = -90 then
      if (this.locH > 0) and (this.locH < 512) then
        puppetSound(2, member(32, "Sfx"))
      end if
    end if
    crumpusPointer = crumpusPointer + 1
    if crumpusPointer > 180 then
      crumpusPointer = 1
    end if
    temp = swellList[crumpusPointer] * 12
    if temp < 1 then
      temp = 1
      crumpusX = -100
    end if
    crumpus.height = temp
  end if
  yDiff = this.locV - COPTER.locV
  if yDiff < crumpus.height then
    xDiff = this.locH - COPTER.locH
    if abs(xDiff) < 100 then
      COPTER.Yvel = COPTER.Yvel - 0.10000000000000001
      COPTER.tiltAngle = COPTER.tiltAngle + 0.5
    end if
  end if
end
