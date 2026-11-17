global gTileHeightList

on beginSprite
  delayCount = 0
  gSeaFrame = 1
  repeat with i = 1 to gTileHeightList.count
    gTileHeightList[i] = random(50)
  end repeat
end

on exitFrame
  repeat with i = 1 to gTileHeightList.count
    temp = gTileHeightList[i]
    temp = temp * 0.94999999999999996
    if temp < 1 then
      temp = 0
    end if
    gTileHeightList[i] = temp
  end repeat
end
