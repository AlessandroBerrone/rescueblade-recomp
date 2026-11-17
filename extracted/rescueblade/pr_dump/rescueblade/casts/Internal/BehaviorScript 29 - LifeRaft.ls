property this, Xpos, radians, Ypos, mapXPos, raftFront, cableGuy, swellList, swellListPointer, loopWidth, loopX, swellHeight, swellListPointerStart
global gXVel, gXOffset, gPaused, gTileIDList

on getPropertyDescriptionList me
  descriptionList = [:]
  addProp(descriptionList, #swellHeight, [#default: 0, #format: #sprite, #comment: "Sea Swell Height"])
  addProp(descriptionList, #swellListPointerStart, [#default: 1, #format: #sprite, #comment: "SwellListPointer Start"])
  return descriptionList
end

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  cableGuy = sprite(6)
  raftFront = sprite(the currentSpriteNum + 4)
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 50
  raftFront.locZ = 200
  mapXPos = Xpos - 256
  swellAngle = random(360)
  swellList = []
  swellListPointer = swellListPointerStart
  repeat with i = 1 to 90
    swellAngle = i * 4
    swellList.add(swellHeight * cos(swellAngle * radians))
  end repeat
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
    xDiff = this.locH - cableGuy.locH
    if abs(xDiff) < 35 then
      yDiff = this.locV - 20 - (cableGuy.locV + cableGuy.Yvel)
      if yDiff < 0 then
        cableGuy.Yvel = cableGuy.Yvel + (yDiff * 0.25)
      end if
    end if
    this.locH = Xpos
    swellListPointer = swellListPointer + 1
    if swellListPointer > 90 then
      swellListPointer = 1
    end if
    this.locV = Ypos - swellList[swellListPointer]
    raftFront.loc = this.loc
  end if
end
