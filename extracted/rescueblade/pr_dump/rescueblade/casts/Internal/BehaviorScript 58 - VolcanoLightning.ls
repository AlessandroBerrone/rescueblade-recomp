property this, reflash
global gPaused

on beginSprite
  this = sprite(the currentSpriteNum)
  this.locV = -1000
  puppetSound(2, member(30, "Sfx"))
  reflash = 0
end

on exitFrame
  if gPaused = 0 then
    if this.locV = -1000 then
      X = random(200)
      if X = 50 then
        this.locH = random(512)
        this.locV = 123 + (random(3) * 50)
        this.blend = 100
      end if
    end if
    if this.blend > 0 then
      if (this.blend = 40) and (reflash = 0) then
        this.blend = 100
        reflash = 1
      end if
      if this.blend > 10 then
        this.blend = this.blend - 10
      else
        puppetSound(2, member(31, "Sfx"))
        this.blend = 0
        this.locV = -1000
        reflash = 0
      end if
    end if
    if soundBusy(2) = 0 then
      puppetSound(2, member(30, "Sfx"))
    end if
  end if
end
