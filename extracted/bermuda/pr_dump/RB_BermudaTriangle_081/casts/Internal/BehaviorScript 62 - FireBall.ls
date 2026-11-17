property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, fireBallState, ThisWidth, thisHalfHeight, grabCount, distToHQ, targetSprite, targetOffset, frameDir, xSlide, COPTER, splosh, thisVel
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore, gDamagePercent

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum
  thisMember = startMember
  COPTER = sprite(4)
  splosh = sprite(7)
  fireCount = 0
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 945
  Xvel = 0
  mapXPos = Xpos - 256 - 64
  survivorDelay = 0
  swellAngle = 0
  cableGuy = sprite(6)
  fireBallState = #NULL
  ThisWidth = this.width
  thisHalfHeight = this.height / 2
  grabCount = 0
  distToHQ = 0
  frameDir = 1
  tiltAngle = 0
  thisVel = 0
end

on exitFrame
  if gPaused = 0 then
    case fireBallState of
      #NULL:
        this.locV = -1000
      #FIRED:
        thisVel = 3
        Xpos = this.locH
        Ypos = this.locV
        this.blend = 100
        fireBallState = #FLY
      #FLY:
        if (this.locH < -200) or (this.locH > 712) then
          fireBallState = #NULL
        end if
        if this.locV > 280 then
          fireBallState = #NULL
          splosh.overlayState = #StartSplash
          splosh.Xpos = this.locH
          splosh.Ypos = this.locV
        end if
        if this.locV < -50 then
          fireBallState = #NULL
        end if
        thisMember = thisMember + 1
        if thisMember > (startMember + 9) then
          thisMember = startMember
        end if
        this.memberNum = thisMember
        Xpos = Xpos + gXVel + gXOffset
        Xpos = Xpos + (thisVel * cos(this.rotation * radians))
        Ypos = Ypos + (thisVel * sin(this.rotation * radians))
        if thisVel < 5 then
          thisVel = thisVel + 0.20000000000000001
        end if
        this.locH = Xpos
        this.locV = Ypos
        xDiff = abs(this.locH - COPTER.locH)
        yDiff = abs(this.locV - COPTER.locV)
        if (xDiff < 50) and (yDiff < 20) then
          this.memberNum = 210
          this.rotation = 0
          fireBallState = #BOOM
          puppetSound(2, member(88, "Sfx"))
          gDamagePercent = gDamagePercent + 19
          COPTER.Yvel = COPTER.Yvel - 4
        end if
      #BOOM:
        Xpos = Xpos + gXVel + gXOffset
        this.locH = Xpos
        this.locV = Ypos
        this.blend = this.blend - 5
        if this.blend <= 5 then
          this.blend = 100
          fireBallState = #NULL
          this.locV = -1000
          this.member = member(startMember, "Gfx")
        end if
    end case
  end if
end
