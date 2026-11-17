property this, Xpos, radians, Ypos, podsFront, loopX, loopWidth, cableGuy, COPTER, firstPhoto, startMember, thisMember, frameDir, Xvel, Yvel
global gXVel, gXOffset, gPaused, gTileIDList, gXVelChange, gScore, gGuyDoom

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  thisMember = this.memberNum
  cableGuy = sprite(6)
  COPTER = sprite(4)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  frameDir = 1
  this.locZ = 1000
  Xvel = 3
  Yvel = 0
  firstPhoto = 0
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + gXVel + gXOffset + Xvel
    Ypos = Ypos + Yvel
    diffY = cableGuy.locV - this.locV
    diffX = cableGuy.locH - (this.locH + 45)
    if diffY > 1 then
      Yvel = Yvel + 0.20000000000000001
    else
      Yvel = Yvel - 0.20000000000000001
    end if
    Yvel = Yvel * 0.90000000000000002
    if (abs(diffY) < 20) and (abs(diffX) < 20) then
      if gGuyDoom <> #SHARK then
        puppetSound(1, member(17, "Sfx"))
        gGuyDoom = #SHARK
        cableGuy.sharkCounter = 150
        cableGuy.rotation = this.rotation + 90
        put cableGuy.rotation
        this.blend = 0
      end if
    end if
    if Xpos > loopX then
      Xpos = Xpos - loopWidth
    end if
    if Xpos < -loopX then
      Xpos = Xpos + loopWidth
    end if
    this.ink = 0
    this.rotation = Yvel * 4
    thisMember = thisMember + frameDir
    if thisMember > 379 then
      thisMember = 379
      frameDir = -frameDir
    end if
    if thisMember < 370 then
      thisMember = 370
      frameDir = -frameDir
    end if
    this.locH = Xpos
    this.locV = Ypos
    this.memberNum = thisMember
    if Xpos > 600 then
      Xpos = Xpos - 800
      Ypos = 300
    end if
  end if
end
