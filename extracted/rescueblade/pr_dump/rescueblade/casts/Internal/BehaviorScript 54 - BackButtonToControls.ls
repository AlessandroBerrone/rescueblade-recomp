property thisNum

on beginSprite
  thisNum = the currentSpriteNum
end

on mouseUp
  put thisNum
  if the rollover = thisNum then
    go("ControlScreen")
    puppetSound(2, member(12, "Sfx"))
  end if
end
