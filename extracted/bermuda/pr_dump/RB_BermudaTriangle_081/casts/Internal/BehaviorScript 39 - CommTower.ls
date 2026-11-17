property this, radians, Xpos, loopX, Ypos, glow, COPTER, cableGuy, towerState, startY, glowList, glowListPointer, loopWidth, grabX, grabY, tiltAngle
global gXVel, gXOffset, gPaused, gTileIDList, gDamagePercent, gCableLength, gPloshX, gRescueCount, gScore, gCableItem, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  tiltAngle = -50
  glow = sprite(the currentSpriteNum + 1)
  glow.blend = 100
  COPTER = sprite(4)
  cableGuy = sprite(6)
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  startY = Ypos
  this.locZ = the currentSpriteNum + 104
  glow.locZ = the currentSpriteNum + 105
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  ouchCount = 3
  prevBolt = 0
  boltOffset = -60
  towerState = #NULL
  glowList = []
  repeat with i = 1 to 30
    glowList.add(50 + (50 * cos(i * 12 * radians)))
  end repeat
  glowListPointer = 1
  grabX = 0
  grabY = 0
end

on exitFrame
  if gPaused = 0 then
    case towerState of
      #NULL:
        Xpos = Xpos + (gXVel + gXOffset)
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        this.locH = Xpos
        this.locV = Ypos
        this.rotation = tiltAngle
        grabX = Xpos + (100 * cos((tiltAngle - 90) * radians))
        grabY = Ypos + (100 * sin((tiltAngle - 90) * radians))
        xDiff = cableGuy.locH - grabX
        yDiff = cableGuy.locV - grabY
        distToGuy = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        if (distToGuy < 6) and (gCableItem = 0) then
          if gCableLength > 0 then
            towerState = #GRABBED
            gCableItem = 1
          end if
        end if
      #GRABBED:
        Xpos = Xpos + (gXVel + gXOffset)
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        this.locH = Xpos
        this.locV = Ypos
        this.rotation = tiltAngle
        grabX = Xpos + (100 * cos((tiltAngle - 90) * radians))
        grabY = Ypos + (100 * sin((tiltAngle - 90) * radians))
        if soundBusy(4) = 0 then
          puppetSound(4, member(39, "Sfx"))
        end if
        xDiff = float(COPTER.locH - gXVel - grabX)
        yDiff = float(COPTER.locV + COPTER.Yvel - grabY)
        distToCopter = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        toCopterVector = point(grabX, grabY) - COPTER.loc
        if distToCopter > gCableLength then
          pullVector = toCopterVector / float(distToCopter) * (distToCopter - gCableLength)
          gXVelChange = gXVelChange - pullVector.locH
          COPTER.Yvel = COPTER.Yvel + pullVector.locV
          cableGuy.cableState = #GODOWN
          if (pullVector.locH < 0) and (pullVector.locV > 0) then
            tiltAngle = tiltAngle + 0.5
          end if
        end if
        toCableGuyVector = point(grabX, grabY) - (cableGuy.loc + point(cableGuy.Xvel, cableGuy.Yvel))
        pullVector = toCableGuyVector
        cableGuy.Xvel = cableGuy.Xvel + pullVector.locH
        cableGuy.Yvel = cableGuy.Yvel + pullVector.locV
        if tiltAngle > 0 then
          gScore = gScore + 500
          towerState = #UP
          gCableItem = 0
          puppetSound(4, member(40, "Sfx"))
          puppetSound(3, member(8, "Sfx"))
          tiltAngle = 0
          this.rotation = tiltAngle
          gRescueCount = gRescueCount + 1
        end if
      #UP:
        Xpos = Xpos + (gXVel + gXOffset)
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        this.locH = Xpos
        this.locV = Ypos
    end case
  end if
end
