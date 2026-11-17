property this, Xpos, Ypos, smokeState, rotWise, Yvel
global gXVel, gXOffset, gPaused, gSmokeList

on beginSprite
  this = sprite(the currentSpriteNum)
  Xpos = float(-1000)
  Ypos = float(-1000)
  Yvel = -2
  smokeState = #NULL
  this.locZ = 105
  gSmokeList.add(this)
  rotWise = random(2)
  if rotWise = 2 then
    rotWise = -1
  end if
end

on exitFrame
  if gPaused = 0 then
    case smokeState of
      #NULL:
        Xpos = -1000
        Ypos = -1000
        this.locH = Xpos
        this.locV = Ypos
        rand = random(10)
        this.width = rand
        this.height = rand
        this.blend = 100
      #SMOKE:
        Xpos = Xpos + gXVel + gXOffset
        Ypos = Ypos + Yvel
        this.rotation = this.rotation + (rotWise * 3)
        if this.width < 50 then
          this.width = this.width + 2
          this.height = this.height + 2
        else
          this.width = this.width + 2
          this.height = this.height + 2
        end if
        this.blend = this.blend - 2
        if this.blend = 0 then
          smokeState = #NULL
          gSmokeList.add(this)
          Xpos = -1000
          Ypos = -1000
          this.width = 1
          this.height = 1
          this.blend = 100
        end if
        this.locH = Xpos
        this.locV = Ypos
    end case
  end if
end
