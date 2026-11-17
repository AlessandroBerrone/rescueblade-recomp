property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, Xvel, cableGuy, pickupState, ThisWidth, thisHalfHeight, grabCount, distToHQ, pickupID, pickupTile, pickupMaster, loopWidth, loopX, sinList, sinListPointer
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore, gPickupList, gfuelPercent, gSceneryList, gDamagePercent

on beginSprite
  radians = float(PI / 180)
  sinList = []
  repeat with i = 1 to 180
    sinList.add(30 * sin(i * 2 * radians))
  end repeat
  this = sprite(the currentSpriteNum)
  this.locZ = 60
  case this.memberNum of
    84:
      pickupID = #TREASURE
    85:
      pickupID = #FUEL
    86:
      pickupID = #TOOLS
  end case
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  Xvel = 0
  mapXPos = Xpos - 256
  survivorDelay = 0
  swellAngle = 0
  cableGuy = sprite(6)
  pickupState = #ONGROUND
  pickupTile = 0
  grabCount = 0
  gPickupList.add(this)
end

on exitFrame
  if gPaused = 0 then
    case pickupState of
      #NULL:
        this.locH = -1000
        this.locV = -1000
      #ONGROUND:
        Xpos = Xpos + gXVel + gXOffset + Xvel
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        sinListPointer = sinListPointer + 1
        if sinListPointer > sinList.count then
          sinListPointer = 1
        end if
        this.locV = Ypos + sinList[sinListPointer]
        this.locH = Xpos
        if (this.locH > 0) or (this.locH < 512) then
          diffX = abs(this.locH - cableGuy.locH)
          diffY = abs(this.locV - cableGuy.locV)
          if (diffX <= 10) and (diffY <= 20) then
            if (gCableItem = 0) and (gCableLength >= 50) then
              pickupState = #ONCABLE
              case pickupID of
                #TREASURE:
                  puppetSound(4, member(15, "Sfx"))
                #FUEL:
                  puppetSound(4, member(10, "Sfx"))
                #TOOLS:
              end case
              gCableItem = 1
            end if
          else
            grabCount = 0
          end if
        end if
      #ONCABLE:
        this.loc = cableGuy.loc + point(0, 10)
        if gCableLength = 0 then
          gCableItem = 0
          pickupState = #NULL
          case pickupID of
            #TREASURE:
              gScore = gScore + 1234
              puppetSound(3, member(16, "Sfx"))
            #FUEL:
              if gfuelPercent > 0 then
                gScore = gScore + 10
                gfuelPercent = 100
                puppetSound(3, member(19, "Sfx"))
              end if
            #TOOLS:
              if gDamagePercent < 100 then
                gScore = gScore + 10
                gDamagePercent = 0
                if gDamagePercent < 0 then
                  gDamagePercent = 0
                end if
                puppetSound(3, member(18, "Sfx"))
              end if
          end case
          gPickupList.add(this)
        end if
    end case
  end if
end
