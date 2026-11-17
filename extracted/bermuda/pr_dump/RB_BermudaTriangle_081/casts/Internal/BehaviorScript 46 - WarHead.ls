property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, survivorState, ThisWidth, thisHalfHeight, grabCount, distToHQ, frameDir, pullCount, loopX, loopWidth, COPTER, ship, claw, blackCopter, stolenCount
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum
  claw = sprite(80)
  COPTER = sprite(4)
  blackCopter = sprite(79)
  ship = sprite(59)
  thisMember = startMember
  this.member = member(thisMember, "Gfx")
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 103
  Xvel = 0
  mapXPos = Xpos - 256 - 64
  survivorDelay = 0
  swellAngle = 0
  cableGuy = sprite(6)
  survivorState = #ONGROUND
  ThisWidth = this.width
  thisHalfHeight = this.height / 2
  grabCount = 0
  distToHQ = 0
  frameDir = 1
  pullCount = 0
  stolenCount = 0
end

on exitFrame
  if gPaused = 0 then
    case survivorState of
      #ONGROUND:
        Xpos = Xpos + (gXVel + gXOffset)
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        this.locH = Xpos
        this.locV = Ypos
        diffX = abs(this.locH - cableGuy.locH)
        diffY = abs(this.locV - cableGuy.locV)
        if (diffX < 70) and (diffY < 100) then
          if (diffX < ThisWidth) and (diffY < thisHalfHeight) then
            grabCount = grabCount + 1
            if grabCount >= 2 then
              if (gCableItem = 0) and (gCableLength >= 50) then
                survivorState = #GRABBED
                gCableItem = -1
              end if
            end if
          else
            grabCount = 0
          end if
        end if
      #GRABBED:
        Xpos = Xpos + gXVel + gXOffset
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        this.locH = Xpos
        this.locV = Ypos
        if soundBusy(4) = 0 then
          puppetSound(4, member(72, "Sfx"))
        end if
        xDiff = float(COPTER.locH - gXVel - this.locH)
        yDiff = float(COPTER.locV + COPTER.Yvel - this.locV)
        distToCopter = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        toCopterVector = this.loc - COPTER.loc + point(-gXVel, COPTER.Yvel)
        if distToCopter > gCableLength then
          pullVector = toCopterVector / float(distToCopter) * (distToCopter - gCableLength)
          gXVelChange = gXVelChange - pullVector.locH
          COPTER.Yvel = COPTER.Yvel + pullVector.locV
          cableGuy.cableState = #GODOWN
          if pullVector.locV > 0 then
            Ypos = Ypos - 0.05
            pullCount = pullCount + 1
          end if
        end if
        toCableGuyVector = this.loc - (cableGuy.loc + point(cableGuy.Xvel, cableGuy.Yvel))
        pullVector = toCableGuyVector
        cableGuy.Xvel = cableGuy.Xvel + pullVector.locH
        cableGuy.Yvel = cableGuy.Yvel + pullVector.locV
        if pullCount > 40 then
          survivorState = #ONCABLE
          this.rotation = 30
          gCableItem = 2
          puppetSound(4, member(73, "Sfx"))
        end if
      #ONCABLE:
        cableGuy.cableState = #GODOWN
        this.loc = cableGuy.loc
        diffX = abs(this.locH - claw.locH)
        diffY = abs(this.locV - claw.locV)
        if (diffX < 10) and (diffY < 10) and (gCableItem = 2) then
          survivorState = #ONCLAW
          gCableItem = 0
          blackCopter.gotWarHead = 1
          puppetSound(4, member(76, "Sfx"))
        end if
        diffX = abs(this.locH - ship.locH)
        diffY = abs(this.locV - ship.locV)
        if (diffX < 100) and (diffY < 40) then
          gCableItem = 0
          survivorState = #HOME
          gScore = gScore + 500
          puppetSound(3, member(8, "Sfx"))
          gRescuedList.add(this)
          gRescueCount = gRescueCount + 1
        end if
      #HOME:
        this.locH = -1000
        this.locV = -1000
      #ONCLAW:
        stolenCount = stolenCount + 1
        this.loc = claw.loc + point(0, 0)
        diffX = abs(this.locH - cableGuy.locH)
        diffY = abs(this.locV - cableGuy.locV)
        if stolenCount > 30 then
          if (diffX < 70) and (diffY < 100) then
            if (diffX < ThisWidth) and (diffY < thisHalfHeight) then
              if (gCableItem = 0) and (gCableLength >= 50) then
                survivorState = #ONCABLE
                gCableItem = 1
                puppetSound(4, member(77, "Sfx"))
                blackCopter.gotWarHead = 0
              end if
            end if
          end if
        end if
    end case
  end if
end
