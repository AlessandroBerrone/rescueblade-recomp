property this, Xpos, radians, Ypos, mapXPos, raftFront, cableGuy, swellList, swellListPointer, loopWidth, loopX, swellHeight, swellListPointerStart, beam, abductCableGuy
global gXVel, gXOffset, gPaused, gTileIDList, gScore

on getPropertyDescriptionList me
  descriptionList = [:]
  addProp(descriptionList, #swellHeight, [#default: 0, #format: #sprite, #comment: "Sea Swell Height"])
  addProp(descriptionList, #swellListPointerStart, [#default: 1, #format: #sprite, #comment: "SwellListPointer Start"])
  return descriptionList
end

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  beam = sprite(the currentSpriteNum - 1)
  cableGuy = sprite(6)
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 800
  mapXPos = Xpos - 256
  swellAngle = random(360)
  swellList = []
  swellListPointer = swellListPointerStart
  repeat with i = 1 to 45
    swellAngle = i * 8
    swellList.add(swellHeight * cos(swellAngle * radians))
  end repeat
  abductCableGuy = 0
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
      if abductCableGuy = 0 then
        yDiff = abs(this.locV - cableGuy.locV)
        if yDiff < 10 then
          puppetSound(2, member(95, "Sfx"))
          abductCableGuy = 1
          gScore = gScore + 1000
        end if
      end if
      cableGuy.Yvel = cableGuy.Yvel - 0.69999999999999996
      cableGuy.Xvel = cableGuy.Xvel + (xDiff * 0.03)
    end if
    this.locH = Xpos
    beam.loc = this.loc
    swellListPointer = swellListPointer + 1
    if swellListPointer > 45 then
      swellListPointer = 1
    end if
    this.locV = Ypos - swellList[swellListPointer]
  end if
end
