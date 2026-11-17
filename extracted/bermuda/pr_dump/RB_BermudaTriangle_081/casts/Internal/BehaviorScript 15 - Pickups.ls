property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, Xvel, cableGuy, pickupState, ThisWidth, thisHalfHeight, grabCount, distToHQ, pickupID, pickupTile, pickupMaster
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore, gPickupList, gfuelPercent, gSceneryList, gDamagePercent, gCoconuts

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  this.locH = -1000
  this.locV = -1000
  this.locZ = 60
  pickupID = #TREASURE
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  Xvel = 0
  mapXPos = Xpos - 256
  survivorDelay = 0
  swellAngle = 0
  cableGuy = sprite(6)
  pickupState = #NULL
  pickupTile = 0
  grabCount = 0
  gPickupList.add(this)
  pickupMaster = 0
end

on exitFrame
  if gPaused = 0 then
    case pickupState of
      #NULL:
        this.locH = -1000
        this.locV = -1000
      #ONGROUND:
        diffX = abs(this.locH - cableGuy.locH)
        diffY = abs(this.locV - cableGuy.locV)
        if (diffX <= 10) and (diffY <= 20) then
          if (gCableItem = 0) and (gCableLength >= 50) then
            pickupState = #ONCABLE
            pickupMaster.thisPickup = 0
            pickupMaster = 0
            case pickupID of
              #TREASURE:
                puppetSound(4, member(15, "Sfx"))
                gSceneryList[pickupTile] = 0
              #FUEL:
                puppetSound(4, member(10, "Sfx"))
                gSceneryList[pickupTile] = 0
              #TOOLS:
                gSceneryList[pickupTile] = 0
              #COCONUTS:
                puppetSound(4, member(89, "Sfx"))
            end case
            gCableItem = 1
          end if
        else
          grabCount = 0
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
            #COCONUTS:
              gCoconuts = 10
              puppetSound(4, member(90, "Sfx"))
          end case
          gPickupList.add(this)
        end if
    end case
  end if
end
