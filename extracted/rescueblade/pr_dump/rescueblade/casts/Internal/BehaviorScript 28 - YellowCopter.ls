property this, Xpos, loopWidth, loopX, radians, Ypos, mapXPos, swell, swellList, swellListPointer, swellListPointer1, COPTER, sway, bellRung, CopterState, hitRot, bash, featherDelay, cableGuy, frameToggle, copterDelay
global gXVel, gXOffset, gPaused, gTileIDList, gScore, gDamagePercent, gCableLength, gCableItem

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
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
  CopterState = #FLY
  bash = 0
  frameToggle = 1
  copterDelay = 0
end

on exitFrame
  if gPaused = 0 then
    if this.memberNum = 110 then
      this.memberNum = 111
    else
      if this.memberNum = 111 then
        this.memberNum = 110
      end if
    end if
    hitRot = hitRot * 0.90000000000000002
    bash = bash * 0.94999999999999996
    case CopterState of
      #FLY:
        Xpos = Xpos + gXVel + gXOffset + 2
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        if (Xpos > 0) and (Xpos < 512) then
          xDiff = COPTER.locH - this.locH
          if abs(xDiff) < 40 then
            yDiff = COPTER.locV - this.locV
            if abs(yDiff) < 20 then
              CopterState = #HIT
              if this.memberNum = 189 then
                puppetSound(3, member(71, "Sfx"))
              else
                puppetSound(3, member(27, "Sfx"))
              end if
              gDamagePercent = 100
              hitRot = -gXVel * 3
              gXVel = 0
            end if
          end if
        end if
        this.locH = Xpos
        this.rotation = 5 + swellList[swellListPointer] + hitRot
        this.locV = Ypos + swellList[swellListPointer] + bash
      #HIT:
        Xpos = Xpos + gXVel + gXOffset
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        hitRot = hitRot * 0.94999999999999996
        bash = bash * 0.94999999999999996
        if this.memberNum = 189 then
          this.locH = Xpos
          this.rotation = 10 + swellList[swellListPointer] + hitRot + 2
          this.locV = Ypos + swellList[swellListPointer] + bash
          Ypos = Ypos - 1
        else
          Xpos = Xpos + (hitRot * 0.10000000000000001)
          this.locH = Xpos
          this.rotation = 10 + swellList[swellListPointer] + hitRot
          this.locV = Ypos + swellList[swellListPointer] + bash
          Ypos = Ypos + 1
        end if
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
