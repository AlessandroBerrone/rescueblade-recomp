property delayCount
global gSeaFrame

on beginSprite
  delayCount = 0
  gSeaFrame = 1
end

on exitFrame
  delayCount = delayCount + 1
  if delayCount > 3 then
    gSeaFrame = gSeaFrame + 1
    if gSeaFrame > 20 then
      gSeaFrame = 1
    end if
    delayCount = 0
  end if
end
