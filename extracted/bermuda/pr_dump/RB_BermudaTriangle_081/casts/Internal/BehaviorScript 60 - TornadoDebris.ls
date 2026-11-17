property this, startMember, thisMember, frameCounter, Xvel, Xpos, Yvel, rotVel, COPTER, Ypos, spinDir, waitCounter
global gXVel, gXOffset, gPaused, gDamagePercent

on beginSprite
  this = sprite(the currentSpriteNum)
  COPTER = sprite(4)
  thisMember = random(12) - 1
  startMember = this.memberNum
  frameCounter = 1
  Xvel = random(3)
  Xpos = float(this.locH)
  Ypos = float(this.locV) - 1000
  Yvel = 0
  rotVel = 0
  spinDir = random(2)
  if spinDir = 2 then
    spinDir = -1
  end if
  waitCounter = 45 - the currentSpriteNum
end

on exitFrame
  if gPaused = 0 then
    frameCounter = frameCounter + spinDir
    if frameCounter = 2 then
      frameCounter = 0
      thisMember = thisMember + 1
      if thisMember > 11 then
        thisMember = 0
      end if
    end if
    if frameCounter = -2 then
      frameCounter = 0
      thisMember = thisMember - 1
      if thisMember < 0 then
        thisMember = 11
      end if
    end if
    this.memberNum = startMember + thisMember
    Xpos = Xpos + gXVel + gXOffset - Xvel
    Ypos = Ypos + Yvel
    Yvel = Yvel * 0.97999999999999998
    this.locH = Xpos
    this.locV = Ypos
    this.rotation = this.rotation + rotVel
    if this.rotation > 360 then
      this.rotation = this.rotation - 360
    end if
    if this.rotation < 0 then
      this.rotation = this.rotation + 360
    end if
    if rotVel = 0 then
      xDiff = COPTER.locH - this.locH
      if abs(xDiff) < (this.width * 0.5) then
        yDiff = COPTER.locV - this.locV
        if abs(yDiff) < (this.height * 0.5) then
          if yDiff > 0 then
            Yvel = -5
            rotVel = -8
            Xvel = Xvel * 0.5
            COPTER.Yvel = COPTER.Yvel + 2
          else
            Yvel = 5
            rotVel = 8
            Xvel = Xvel * 0.5
            COPTER.Yvel = COPTER.Yvel - 2
          end if
          puppetSound(3, member(27, "Sfx"))
          gDamagePercent = gDamagePercent + (this.width * 0.25)
        end if
      end if
    end if
    if Xpos < -100 then
      waitCounter = waitCounter - 1
      if waitCounter <= 0 then
        Xvel = random(6)
        Ypos = 30 + random(270)
        Yvel = random(2) - 3
        rotVel = 0
        this.rotation = 0
      end if
      Xpos = Xpos + 800
    end if
    if Xpos > 612 then
      waitCounter = waitCounter - 1
      if waitCounter <= 0 then
        Xvel = random(6)
        Ypos = 30 + random(270)
        Yvel = random(2) - 3
        rotVel = 0
        this.rotation = 0
      end if
      Xpos = Xpos - 800
    end if
  end if
end
