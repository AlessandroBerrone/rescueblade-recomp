property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, survivorState, ThisWidth, thisHalfHeight, grabCount, distToHQ, frameDir, pullCount, loopX, loopWidth, COPTER, lump, snowBlow, lumpHeight
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum
  lump = sprite(the currentSpriteNum - 1)
  lumpHeight = lump.height
  thisMember = random(3) + startMember - 1
  COPTER = sprite(4)
  snowBlow = sprite(56)
  this.member = member(thisMember, "Gfx")
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 60
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
        lump.loc = this.loc + point(0, 11)
        survivorDelay = survivorDelay + 1
        if survivorDelay >= 5 then
          survivorDelay = 0
          if ((thisMember + frameDir) > (startMember + 2)) or ((thisMember + frameDir) < startMember) then
            frameDir = -frameDir
          end if
          thisMember = thisMember + frameDir
          this.member = member(thisMember, "Gfx")
        end if
        diffX = abs(this.locH - cableGuy.locH)
        diffY = abs(this.locV - cableGuy.locV)
        if (diffX < 70) and (diffY < 100) then
          if lump.height > 6 then
            lumpHeight = lumpHeight - 0.25
            lump.height = lumpHeight
            if lumpHeight = (6 + 0.25) then
              puppetSound(4, member(9, "Sfx"))
            end if
            snowBlow.loc = this.loc + point(0, -12)
          else
            if (diffX < ThisWidth) and (diffY < thisHalfHeight) then
              grabCount = grabCount + 1
              if grabCount >= 2 then
                if (gCableItem = 0) and (gCableLength >= 50) then
                  survivorState = #GRABBED
                  gCableItem = 1
                end if
              end if
            else
              grabCount = 0
            end if
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
        lump.locH = this.locH
        survivorDelay = survivorDelay + 1
        if survivorDelay >= 5 then
          survivorDelay = 0
          if ((thisMember + frameDir) > (startMember + 2)) or ((thisMember + frameDir) < startMember) then
            frameDir = -frameDir
          end if
          thisMember = thisMember + frameDir
          this.member = member(thisMember, "Gfx")
        end if
        if soundBusy(4) = 0 then
          puppetSound(4, member(39, "Sfx"))
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
            Ypos = Ypos - 0.10000000000000001
            pullCount = pullCount + 1
          end if
        end if
        toCableGuyVector = this.loc - (cableGuy.loc + point(cableGuy.Xvel, cableGuy.Yvel))
        pullVector = toCableGuyVector
        cableGuy.Xvel = cableGuy.Xvel + pullVector.locH
        cableGuy.Yvel = cableGuy.Yvel + pullVector.locV
        if pullCount > 40 then
          survivorState = #ONCABLE
          puppetSound(4, member(63 + cableGuy.speechCounter, "Sfx"))
        end if
      #ONCABLE:
        this.loc = cableGuy.loc
        if gCableLength = 0 then
          gCableItem = 0
          survivorState = #INCOPTER
          gScore = gScore + 500
          puppetSound(3, member(8, "Sfx"))
          gRescuedList.add(this)
          gRescueCount = gRescueCount + 1
        end if
      #INCOPTER:
        this.locH = -1000
        this.locV = -1000
      #GOTOHQ:
        thisMember = thisMember + 1
        if thisMember > (startMember + 2) then
          thisMember = startMember
        end if
        this.member = member(thisMember, "Gfx")
        if distToHQ <= 0 then
          Xvel = 0
          this.blend = this.blend - 5
          if this.blend <= 0 then
            survivorState = #HOME
            gRescueCount = gRescueCount + 1
            gScore = gScore + 1000
            puppetSound(3, member(8, "Sfx"))
          end if
        end if
        Xpos = Xpos + gXVel + gXOffset + Xvel
        distToHQ = distToHQ + Xvel
        Ypos = 270
        this.locH = Xpos
        this.locV = Ypos
      #HOME:
        this.locH = -1000
        this.locV = -1000
    end case
  end if
end
