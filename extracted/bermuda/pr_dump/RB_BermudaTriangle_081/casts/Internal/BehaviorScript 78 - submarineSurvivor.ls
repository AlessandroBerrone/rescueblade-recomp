property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, survivorState, ThisWidth, thisHalfHeight, grabCount, distToHQ, targetSprite, targetOffset, frameDir, loopWidth, loopX
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
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
  survivorState = #TENTACLE
  ThisWidth = this.width
  thisHalfHeight = this.height / 2
  grabCount = 0
  distToHQ = 0
  frameDir = 1
end

on exitFrame
  if gPaused = 0 then
    case survivorState of
      #TENTACLE:
      #ONCABLE:
        this.loc = cableGuy.loc
        if gCableLength = 0 then
          gCableItem = 0
          survivorState = #INCOPTER
          gRescueCount = gRescueCount + 1
          gScore = gScore + 500
          puppetSound(3, member(8, "Sfx"))
          gRescuedList.add(this)
        end if
      #INCOPTER:
        this.locH = -1000
        this.locV = -1000
      #GOTOHQ:
        if distToHQ <= 0 then
          Xvel = 0
          this.blend = this.blend - 5
          if this.blend <= 0 then
            survivorState = #HOME
            gRescueCount = gRescueCount + 1
            gScore = gScore + 1234
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
