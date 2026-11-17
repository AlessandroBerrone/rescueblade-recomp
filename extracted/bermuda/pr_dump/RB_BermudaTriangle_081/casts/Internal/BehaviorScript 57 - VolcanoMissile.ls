property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, missileState, ThisWidth, thisHalfHeight, grabCount, distToHQ, targetSprite, targetOffset, frameDir, xSlide, COPTER, splosh, thisVel, blackCopter, flyCount
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore, gDamagePercent

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum
  COPTER = sprite(4)
  blackCopter = sprite(79)
  splosh = sprite(7)
  fireCount = 0
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 50
  Xvel = 0
  mapXPos = Xpos - 256 - 64
  survivorDelay = 0
  swellAngle = 0
  cableGuy = sprite(6)
  missileState = #NULL
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
    case missileState of
      #NULL:
        this.locV = -1000
        flyCount = 0
      #FIRED:
        thisVel = 0
        Xpos = this.locH
        Ypos = this.locV
        missileState = #FLY
      #FLY:
        if (this.locH < -200) or (this.locH > 712) then
          missileState = #NULL
          flyCount = 0
        end if
        if this.locV > 280 then
          missileState = #NULL
          puppetSound(4, member(79, "Sfx"))
          splosh.overlayState = #StartSplash
          splosh.Xpos = this.locH
          splosh.Ypos = this.locV
          flyCount = 0
        end if
        if this.locV < -50 then
          missileState = #NULL
          flyCount = 0
        end if
        angleA = this.rotation
        angleB = AngleGrind(this.locH, this.locV, COPTER.locH, COPTER.locV)
        diffAngle = angleB - angleA
        if diffAngle > 180 then
          diffAngle = diffAngle - 360
        end if
        if diffAngle < -180 then
          diffAngle = diffAngle + 360
        end if
        if diffAngle > 0 then
          this.rotation = this.rotation + 2.5
        else
          this.rotation = this.rotation - 2.5
        end if
        Xpos = Xpos + gXVel + gXOffset
        Xpos = Xpos + (thisVel * cos(this.rotation * radians))
        Ypos = Ypos + (thisVel * sin(this.rotation * radians))
        if thisVel < 6 then
          thisVel = thisVel + 0.20000000000000001
        end if
        this.locH = Xpos
        this.locV = Ypos
        xDiff = abs(this.locH - COPTER.locH)
        yDiff = abs(this.locV - COPTER.locV)
        if (xDiff < 50) and (yDiff < 20) then
          this.memberNum = 210
          this.rotation = 0
          missileState = #BOOM
          puppetSound(2, member(79, "Sfx"))
          gDamagePercent = gDamagePercent + 34
          COPTER.Yvel = COPTER.Yvel - 5
        end if
      #BOOM:
        Xpos = Xpos + gXVel + gXOffset
        this.locH = Xpos
        this.locV = Ypos
        this.blend = this.blend - 5
        if this.blend <= 5 then
          this.blend = 100
          missileState = #NULL
          this.locV = -1000
          this.member = member(startMember, "Gfx")
        end if
    end case
  end if
end
