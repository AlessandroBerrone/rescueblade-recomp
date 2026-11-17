property this, radians, Xpos, loopX, Ypos, glow, COPTER, cableGuy, rodState, startY, glowList, glowListPointer, targetSprite, targetOffset, loopWidth
global gXVel, gXOffset, gPaused, gTileIDList, gDamagePercent, gCableLength, gPloshX, gRescueCount, gScore, gCableItem, gXVelChange

on getPropertyDescriptionList me
  descriptionList = [:]
  addProp(descriptionList, #targetSprite, [#default: 1, #format: #sprite, #comment: "targetSprite"])
  addProp(descriptionList, #targetOffset, [#default: point(0, 0), #format: #point, #comment: "offSet from targetSprite"])
  return descriptionList
end

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  this.loc = sprite(targetSprite).loc + targetOffset
  glow = sprite(the currentSpriteNum + 1)
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
  boltOffset = -50
  rodState = #NULL
  glowList = []
  repeat with i = 1 to 30
    glowList.add(50 + (50 * cos(i * 12 * radians)))
  end repeat
  glowListPointer = 1
end

on exitFrame
  if gPaused = 0 then
    case rodState of
      #NULL:
        if targetSprite <> this.spriteNum then
          this.loc = sprite(targetSprite).loc + targetOffset
        else
          Xpos = Xpos + (gXVel + gXOffset)
          if Xpos > loopX then
            Xpos = Xpos - loopWidth
          end if
          if Xpos < -loopX then
            Xpos = Xpos + loopWidth
          end if
          this.locH = Xpos
          this.locV = Ypos
        end if
        xDiff = cableGuy.locH - this.locH
        yDiff = cableGuy.locV - this.locV
        distToGuy = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        if (distToGuy < 6) and (gCableItem = 0) then
          rodState = #GRABBED
          gCableItem = 1
        end if
        glowListPointer = glowListPointer + 1
        if glowListPointer > glowList.count then
          glowListPointer = 1
        end if
        glow.blend = glowList[glowListPointer]
      #GRABBED:
        if targetSprite <> this.spriteNum then
          this.locH = sprite(targetSprite).locH + targetOffset.locH
          this.locV = Ypos
        else
          Xpos = Xpos + (gXVel + gXOffset)
          if Xpos > loopX then
            Xpos = Xpos - (gTileIDList.count * 128)
          end if
          if Xpos < -loopX then
            Xpos = Xpos + (gTileIDList.count * 128)
          end if
          this.locH = Xpos
          this.locV = Ypos
        end if
        if soundBusy(4) = 0 then
          puppetSound(4, member(39, "Sfx"))
        end if
        xDiff = float(COPTER.locH - gXVel - this.locH)
        yDiff = float(COPTER.locV + COPTER.Yvel - this.locV)
        distToCopter = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        toCopterVector = this.loc - COPTER.loc
        if distToCopter > gCableLength then
          pullVector = toCopterVector / float(distToCopter) * (distToCopter - gCableLength)
          gXVelChange = gXVelChange - pullVector.locH
          COPTER.Yvel = COPTER.Yvel + pullVector.locV
          cableGuy.cableState = #GODOWN
          Ypos = Ypos - (pullVector.locV * 1.30000000000000004)
        end if
        toCableGuyVector = this.loc - (cableGuy.loc + point(cableGuy.Xvel, cableGuy.Yvel))
        pullVector = toCableGuyVector
        cableGuy.Xvel = cableGuy.Xvel + pullVector.locH
        cableGuy.Yvel = cableGuy.Yvel + pullVector.locV
        glow.blend = glowList[glowListPointer]
        if (Ypos - startY) < -65 then
          rodState = #UP
          gCableItem = 0
          puppetSound(4, member(40, "Sfx"))
          glow.blend = 100
        end if
        glowListPointer = glowListPointer + 1
        if glowListPointer > glowList.count then
          glowListPointer = 1
        end if
      #UP:
        if targetSprite <> this.spriteNum then
          this.locH = sprite(targetSprite).locH + targetOffset.locH
          this.locV = Ypos
        else
          Xpos = Xpos + (gXVel + gXOffset)
          if Xpos > loopX then
            Xpos = Xpos - (gTileIDList.count * 128)
          end if
          if Xpos < -loopX then
            Xpos = Xpos + (gTileIDList.count * 128)
          end if
          this.locH = Xpos
          this.locV = Ypos
        end if
        if glow.blend < 100 then
          glow.blend = glow.blend + 1
        end if
        if (this.locH > 0) and (this.locH < 512) then
          if gPloshX > -1 then
            xDiff = this.locH - gPloshX
            if abs(xDiff) < 80 then
              if glow.blend >= 6 then
                glow.blend = glow.blend - 6
              else
                rodState = #COOLED
                gRescueCount = gRescueCount + 1
                puppetSound(4, member(8, "Sfx"))
                gScore = gScore + 500
              end if
            end if
          end if
        end if
      #COOLED:
        this.locH = sprite(targetSprite).locH + targetOffset.locH
    end case
    glow.loc = this.loc
  end if
end
