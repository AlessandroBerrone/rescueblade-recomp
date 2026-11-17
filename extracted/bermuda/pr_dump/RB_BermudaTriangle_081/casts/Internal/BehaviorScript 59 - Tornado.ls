property this, radians, thisFrame, segList, quadList, skewAngle, skewOffset
global gPaused

on beginSprite
  radians = float(180 / PI)
  this = sprite(the currentSpriteNum)
  thisFrame = 1
  segList = []
  repeat with i = 0 to 5
    segList.add(sprite(the currentSpriteNum + i))
  end repeat
  quadList = []
  repeat with i = 1 to 6
    tempQuadList = [point(0, 0), point(200, 0), point(100, 100), point(0, 100)]
    quadList.add(tempQuadList)
  end repeat
  repeat with i = 1 to 6
    quadList[i][1].locV = (i - 1) * 55
    quadList[i][2].locV = (i - 1) * 55
    quadList[i][3].locV = i * 55
    quadList[i][4].locV = i * 55
    sprite(the currentSpriteNum + i - 1).locZ = 2
    segList[i].quad = quadList[i]
  end repeat
  sprite(the currentSpriteNum + 6).locZ = 900
  skewAngle = 100
  skewOffset = 0
end

on exitFrame
  if gPaused = 0 then
    thisFrame = thisFrame - 1
    if thisFrame < 1 then
      thisFrame = 20
    end if
    curveOffset = 300
    skewAngle = skewAngle + 0.0005
    if skewAngle > 360 then
      skewAngle = skewAngle - 360
    end if
    skewOffset = 0
    repeat with i = 1 to 6
      quadList[i][1].locH = 256 - (curveOffset + 30) + skewOffset
      quadList[i][2].locH = 256 + (curveOffset + 30) + skewOffset
      curveOffset = curveOffset * 0.59999999999999998
      skewOffset = 80 * cos((skewAngle + ((i - 1) * 60)) * radians)
      quadList[i][3].locH = 256 + (curveOffset + 30) + skewOffset
      quadList[i][4].locH = 256 - (curveOffset + 30) + skewOffset
      segList[i].memberNum = 88 + thisFrame
      segList[i].quad = quadList[i]
    end repeat
  end if
end
