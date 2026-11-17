property thisNum, this
global gLevel

on beginSprite
  this = sprite(the currentSpriteNum)
  thisNum = the currentSpriteNum
  this.blend = 50
end

on exitFrame
  if thisNum = the rollover then
    this.blend = 100
  else
    this.blend = 50
  end if
end
