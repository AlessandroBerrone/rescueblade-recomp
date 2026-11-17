property this, thisMember

on beginSprite
  this = sprite(the currentSpriteNum)
  thisMember = this.memberNum
  this.locZ = 1500
end

on exitFrame
  this.locH = -1000
  this.locV = -1000
  thisMember = thisMember + 1
  if thisMember > 182 then
    thisMember = 175
  end if
  this.member = member(thisMember, "Gfx")
end
