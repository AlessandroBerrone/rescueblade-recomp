property this
global gPaused

on beginSprite
  this = sprite(the currentSpriteNum)
  this.locZ = 1600
end

on exitFrame
  if gPaused = 0 then
    this.locH = -1000
  end if
end
