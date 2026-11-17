property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, survivorState, ThisWidth, thisHalfHeight, grabCount, distToHQ, targetSprite, targetOffset, frameDir, loopWidth, loopX
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum
  targetSprite = the currentSpriteNum - 1
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = sprite(the currentSpriteNum - 1).locZ - 1
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
end

on exitFrame
  if gPaused = 0 then
    case survivorState of
      #ONGROUND:
        if targetSprite = this.spriteNum then
          Xpos = Xpos + (gXVel + gXOffset)
          this.locH = Xpos
          if Xpos > loopX then
            Xpos = Xpos - loopWidth
          end if
          if Xpos < -loopX then
            Xpos = Xpos + loopWidth
          end if
        else
          this.loc = sprite(targetSprite).loc + targetOffset
        end if
        survivorDelay = survivorDelay + 1
        if survivorDelay >= 5 then
          survivorDelay = 0
        end if
        diffX = abs(this.locH - cableGuy.locH)
        diffY = abs(this.locV - cableGuy.locV)
        if (diffX < ThisWidth) and (diffY < thisHalfHeight) then
          grabCount = grabCount + 1
          if (grabCount >= 2) and (sprite(targetSprite).attackMode = #FLEE) then
            if (gCableItem = 0) and (gCableLength >= 50) then
              survivorState = #ONCABLE
              sprite(targetSprite).attackMode = #PILOTLESS
              puppetSound(2, member(97, "Sfx"))
              gCableItem = 1
            end if
          end if
        else
          grabCount = 0
        end if
      #ONCABLE:
        this.loc = cableGuy.loc
        if gCableLength = 0 then
          gCableItem = 0
          survivorState = #INCOPTER
          gRescueCount = gRescueCount + 1
          gScore = gScore + 500
          puppetSound(3, member(8, "Sfx"))
        end if
      #INCOPTER:
        this.locH = -1000
        this.locV = -1000
    end case
  end if
end
