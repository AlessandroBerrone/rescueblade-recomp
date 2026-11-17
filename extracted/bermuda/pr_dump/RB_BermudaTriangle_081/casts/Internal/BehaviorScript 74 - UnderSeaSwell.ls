property swellList, swellListCounter, swellHeight
global gTileHeightList, gTileIDList, gUnderSeaHeightList

on getPropertyDescriptionList me
  descriptionList = [:]
  addProp(descriptionList, #swellHeight, [#default: 0, #format: #sprite, #comment: "Sea Swell Height"])
  return descriptionList
end

on beginSprite
  delayCount = 0
  gSeaFrame = 1
  swellList = []
  swellListCounter = 1
  radians = PI / 180.0
  repeat with i = 1 to 90
    swellList.add(swellHeight * sin(i * 4 * radians))
  end repeat
end

on exitFrame
  swellListCounter = swellListCounter + 1
  if swellListCounter > 90 then
    swellListCounter = 1
  end if
  repeat with i = 1 to gTileIDList.count
    tempPointer = (i * 10) + swellListCounter
    tempPointer = tempPointer mod 90
    if tempPointer = 0 then
      tempPointer = 1
    end if
    gUnderSeaHeightList[i] = swellList[tempPointer]
  end repeat
end
