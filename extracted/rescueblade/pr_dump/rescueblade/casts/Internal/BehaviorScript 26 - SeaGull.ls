property this, Xpos, loopX, loopWidth, radians, Ypos, mapXPos, featherXPos, featherYPos, swell, swellList, swellListPointer, swellListPointer1, COPTER, sway, bellRung, feathers, seaGullState, hitRot, bash, featherDelay, cableGuy
global gXVel, gXOffset, gPaused, gTileIDList, gScore, gDamagePercent, gCableLength, gCableItem

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  feathers = sprite(the currentSpriteNum + 1)
  cableGuy = sprite(6)
  COPTER = sprite(4)
  swellList = []
  repeat with i = 1 to 90
    swellAngle = 4 * i
    swellList.add(5 * cos(swellAngle * radians))
  end repeat
  swellListPointer = 1
  swellListPointer1 = 1
  swell = 0
  hitRot = 0
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 50
  mapXPos = Xpos - 256
  sway = 0
  swellAngle = 0
  seaGullState = #FLY
  bash = 0
  featherDelay = 0
  feathers.locZ = 110
  featherXPos = -1000
  featherYPos = -1000
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + gXVel + gXOffset
    if Xpos > loopX then
      Xpos = Xpos - loopWidth
    end if
    if Xpos < -loopX then
      Xpos = Xpos + loopWidth
    end if
    hitRot = hitRot * 0.90000000000000002
    bash = bash * 0.94999999999999996
    case seaGullState of
      #FLY:
        if (Xpos > 0) and (Xpos < 512) then
          xDiff = COPTER.locH - this.locH
          if abs(xDiff) < 30 then
            yDiff = COPTER.locV - this.locV
            if abs(yDiff) < 15 then
              seaGullState = #HIT
              featherXPos = Xpos
              featherYPos = Ypos
              this.member = member(this.memberNum + 1, "Gfx")
              puppetSound(3, member(28, "Sfx"))
              feathers.locV = this.locV
              gDamagePercent = gDamagePercent + 20
              if gXVel > 0 then
                hitRot = 3234
              else
                hitRot = -3234
              end if
              gXVel = 0
            end if
          end if
        end if
        xDiff = cableGuy.locH - this.locH
        if abs(xDiff) < 30 then
          yDiff = cableGuy.locV - this.locV
          if abs(yDiff) < 15 then
            if (gCableItem = 0) and (gCableLength >= 50) then
              seaGullState = #ONCABLE
              puppetSound(3, member(29, "Sfx"))
              gCableItem = 1
            end if
          end if
        end if
        feathers.locH = this.locH
        feathers.locV = -1000
        this.locH = Xpos + bash + (swellList[swellListPointer] * 5)
        this.rotation = (-swellList[swellListPointer1] * 2) + hitRot
        this.locV = Ypos + swellList[swellListPointer] + bash
      #HIT:
        featherXPos = featherXPos + gXVel + gXOffset + (swell * 5)
        feathers.locH = featherXPos
        feathers.locV = featherYPos
        featherYPos = featherYPos + 1
        featherDelay = featherDelay + 1
        if featherDelay = 3 then
          if feathers.memberNum = 105 then
            feathers.memberNum = 106
          else
            feathers.memberNum = 105
          end if
          featherDelay = 0
        end if
        this.locH = Xpos + bash + (swellList[swellListPointer] * 5)
        this.rotation = (-swellList[swellListPointer1] * 2) + hitRot
        this.locV = Ypos + swellList[swellListPointer] + bash
      #ONCABLE:
        this.locH = cableGuy.locH
        this.locV = cableGuy.locV
        if gCableLength = 0 then
          seaGullState = #INCOPTER
          gCableItem = 0
          gScore = gScore + 1000
          puppetSound(3, member(29, "Sfx"))
        end if
      #INCOPTER:
        this.locH = -1000
        this.locV = -1000
    end case
    swellListPointer = swellListPointer + 1
    swellListPointer1 = swellListPointer + 2
    if swellListPointer > 90 then
      swellListPointer = 1
    end if
    if swellListPointer1 > 90 then
      swellListPointer1 = 1
    end if
  end if
end
