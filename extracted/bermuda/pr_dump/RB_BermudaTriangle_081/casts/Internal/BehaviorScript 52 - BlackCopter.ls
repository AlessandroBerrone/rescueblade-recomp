property this, Xpos, loopWidth, loopX, radians, Ypos, mapXPos, swell, swellList, swellListPointer, swellListPointer1, COPTER, sway, bellRung, CopterState, Yvel, Xvel, hitRot, bash, featherDelay, cableGuy, frameToggle, copterDelay, claw, clawYPos, clawYVel, gotWarHead, clawHeight, CABLE
global gXVel, gXOffset, gPaused, gTileIDList, gScore, gDamagePercent, gCableLength, gCableItem

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  claw = sprite(the currentSpriteNum + 1)
  CABLE = sprite(the currentSpriteNum - 1)
  cableGuy = sprite(6)
  COPTER = sprite(4)
  swellList = []
  repeat with i = 1 to 90
    swellAngle = 4 * i
    swellList.add(5 * cos(swellAngle * radians))
  end repeat
  clawYPos = 20
  clawYVel = 0
  swellListPointer = 1
  swellListPointer1 = 1
  swell = 0
  hitRot = 0
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  Yvel = 0.0
  Xvel = 0.0
  this.locZ = 50
  CABLE.locZ = 49
  mapXPos = Xpos - 256
  sway = 0
  swellAngle = 0
  CopterState = #FLY
  bash = 0
  frameToggle = 1
  copterDelay = 0
  gotWarHead = 0
  clawHeight = 0
end

on exitFrame
  if gPaused = 0 then
    if this.memberNum = 194 then
      this.memberNum = 195
    else
      if this.memberNum = 195 then
        this.memberNum = 194
      end if
    end if
    hitRot = hitRot * 0.90000000000000002
    bash = bash * 0.94999999999999996
    case CopterState of
      #FLY:
        Xpos = Xpos + gXVel + gXOffset + Xvel
        Ypos = Ypos + Yvel
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        if (Xpos > 0) and (Xpos < 512) then
          xDiff = COPTER.locH - this.locH
          if abs(xDiff) < 5 then
            yDiff = COPTER.locV - this.locV
            if abs(yDiff) < 5 then
            end if
          end if
        end if
        if (gCableItem = 2) and (gotWarHead = 0) then
          if cableGuy.locV > claw.locV then
            clawHeight = clawHeight + 1.5
          else
            clawHeight = clawHeight - 1.5
            if clawHeight < 0 then
              clawHeight = 0
            end if
          end if
          Yvel = Yvel + ((30 - this.locV) * 0.005)
          Xvel = Xvel + ((cableGuy.locH - (gXVel * 15) - this.locH) * 0.005)
        else
          if gotWarHead = 1 then
            Yvel = Yvel + ((120 - this.locV) * 0.005)
            Xvel = Xvel + 0.29999999999999999
            clawHeight = clawHeight - 1.5
            if clawHeight < 0 then
              clawHeight = 0
            end if
          else
            Yvel = Yvel + ((30 - this.locV) * 0.005)
            Xvel = Xvel + ((cableGuy.locH - this.locH) * 0.005)
          end if
          clawHeight = clawHeight - 1.5
          if clawHeight < 0 then
            clawHeight = 0
          end if
        end if
        Yvel = Yvel * 0.94999999999999996
        Xvel = Xvel * 0.94999999999999996
        this.locH = Xpos
        this.rotation = Xvel * 2
        this.locV = Ypos
        claw.locH = this.locH
        claw.locV = this.locV + 40 + clawHeight
        CABLE.loc = claw.loc + point(0, -10)
        CABLE.height = clawHeight + 30
      #HIT:
        Xpos = Xpos + gXVel + gXOffset
        if Xpos > (gTileIDList.count * 128 * 0.5) then
          Xpos = Xpos - (gTileIDList.count * 128)
        end if
        if Xpos < (-gTileIDList.count * 128 * 0.5) then
          Xpos = Xpos + (gTileIDList.count * 128)
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
