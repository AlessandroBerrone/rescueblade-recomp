property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, survivorState, ThisWidth, thisHalfHeight, grabCount, distToHQ, targetSprite, targetOffset, frameDir, loopWidth, loopX
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore

on getPropertyDescriptionList me
  descriptionList = [:]
  addProp(descriptionList, #targetSprite, [#default: 1, #format: #sprite, #comment: "targetSprite"])
  addProp(descriptionList, #targetOffset, [#default: point(0, 0), #format: #point, #comment: "offSet from targetSprite"])
  return descriptionList
end

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum
  thisMember = random(3) + startMember - 1
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
          if ((thisMember + frameDir) > (startMember + 2)) or ((thisMember + frameDir) < startMember) then
            frameDir = -frameDir
          end if
          thisMember = thisMember + frameDir
          this.member = member(thisMember, "Gfx")
          diffX = abs(this.locH - cableGuy.locH)
          diffY = abs(this.locV - cableGuy.locV)
          if (diffX < ThisWidth) and (diffY < thisHalfHeight) then
            grabCount = grabCount + 1
            if grabCount >= 2 then
              if (gCableItem = 0) and (gCableLength >= 50) then
                survivorState = #ONCABLE
                puppetSound(4, member(63 + cableGuy.speechCounter, "Sfx"))
                gCableItem = 1
              end if
            end if
          else
            grabCount = 0
          end if
        end if
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
