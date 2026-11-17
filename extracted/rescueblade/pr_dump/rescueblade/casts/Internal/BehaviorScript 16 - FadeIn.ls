property this

on beginSprite
  this = sprite(the currentSpriteNum)
  this.blend = 0
end

on exitFrame
  if this.blend < 100 then
    this.blend = this.blend + 5
  end if
end
