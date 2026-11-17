property thisNum
global gLevel

on beginSprite
  thisNum = the currentSpriteNum
end

on mouseUp
  if the rollover = thisNum then
    go(the frame + 1)
    puppetSound(2, member(12, "Sfx"))
  end if
end
