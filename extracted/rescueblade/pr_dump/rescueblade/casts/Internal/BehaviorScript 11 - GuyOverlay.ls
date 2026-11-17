property this, Xpos, leftLoopX, rightLoopX, loopWidth, radians, Ypos, overlayState, startHeight, startWidth, cableGuy, splashHeight, splashVel, grav
global gXVel, gXOffset, gPaused

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  rightLoopX = 512 + (this.width / 2)
  leftLoopX = -this.width / 2
  loopWidth = 512 + this.width
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 102
  startHeight = this.height
  startWidth = this.width
  this.blend = 0
  overlayState = #NULL
  splashHeight = startHeight * 0.5
  splashVel = 7
  grav = -0.25
end

on exitFrame
  if gPaused = 0 then
    case overlayState of
      #NULL:
        this.locH = Xpos
        this.locV = Ypos
      #StartSplash:
        this.blend = 100
        this.height = startHeight * 0.5
        this.width = startWidth
        overlayState = #SPLASH
        this.locH = Xpos
        this.locV = Ypos
        splashHeight = 0
        splashVel = 7
      #SPLASH:
        splashVel = splashVel + grav
        splashHeight = splashHeight + splashVel
        this.height = splashHeight
        this.width = startWidth + 5 - (splashHeight * 0.10000000000000001)
        if splashVel < 0 then
          this.blend = this.blend - 1
          if this.blend = 0 then
            overlayState = #NULL
            Xpos = -1000
            Ypos = -1000
          end if
        end if
        Xpos = Xpos + gXVel + gXOffset
        this.locH = Xpos
        this.locV = Ypos
    end case
  end if
end
