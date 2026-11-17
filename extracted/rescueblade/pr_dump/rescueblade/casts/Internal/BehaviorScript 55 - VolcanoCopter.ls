property this, Xpos, loopWidth, loopX, radians, Ypos, mapXPos, swell, swellList, swellListPointer, swellListPointer1, COPTER, sway, bellRung, CopterState, Yvel, Xvel, hitRot, bash, featherDelay, cableGuy, frameToggle, copterDelay, claw, clawYPos, clawYVel, gotWarHead, clawHeight, CABLE, attackMode, fireCount, missile, firedCount, missileWait
global gXVel, gXOffset, gPaused, gTileIDList, gScore, gDamagePercent, gCableLength, gCableItem

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  claw = sprite(the currentSpriteNum + 1)
  CABLE = sprite(the currentSpriteNum - 1)
  missile = sprite(88)
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
  attackMode = #FIREMISSILES
  fireCount = 0
  firedCount = 0
  missileWait = 80
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
        case attackMode of
          #FIREMISSILES:
            fireCount = fireCount + 1
            if (fireCount > missileWait) and (gXVel > 5) then
              if missile.missileState = #NULL then
                fireCount = 0
                missile.loc = this.loc + point(0, 10)
                missile.missileState = #FLY
                firedCount = firedCount + 1
                if firedCount = 2 then
                  puppetSound(3, member(87, "Sfx"))
                end if
                if soundBusy(4) = 0 then
                  puppetSound(4, member(80, "Sfx"))
                  missileWait = 50 + random(50)
                end if
                missile.Xpos = missile.locH
                missile.Ypos = missile.locV
                missile.thisVel = 0
                missile.rotation = 20
              end if
            end if
            if firedCount >= 10 then
              attackMode = #FLEE
              puppetSound(3, member(86, "Sfx"))
            end if
            if cableGuy.locV > claw.locV then
              clawHeight = clawHeight + 1.5
            else
              clawHeight = clawHeight - 1.5
              if clawHeight < 0 then
                clawHeight = 0
              end if
            end if
            Yvel = Yvel + ((COPTER.locV - this.locV) * 0.005)
            if Ypos > 150 then
              Yvel = Yvel + ((150 - Ypos) * 0.01)
            end if
            Xvel = Xvel + ((COPTER.locH - 200 - (abs(gXVel) * (25 + random(10))) - this.locH) * 0.005)
          #FLEE:
            Yvel = Yvel + ((100 - this.locV) * 0.007)
            Xvel = Xvel + 0.20000000000000001
            xDiff = float(this.locH - COPTER.locH)
            yDiff = float(this.locV - COPTER.locV)
            distToCopter = sqrt((xDiff * xDiff) + (yDiff * yDiff))
            if distToCopter < 100 then
              if distToCopter <> 0 then
                normToCopter = point(xDiff, yDiff) / distToCopter
              else
                normToCopter = point(0, 0)
              end if
              pushVector = normToCopter * distToCopter / 100
              Xvel = Xvel + pushVector.locH
              Yvel = Yvel + pushVector.locV
            end if
        end case
        Yvel = Yvel * 0.94999999999999996
        Xvel = Xvel * 0.94999999999999996
        this.locH = Xpos
        this.rotation = Xvel * 2
        this.locV = Ypos
        claw.locH = this.locH
        claw.locV = this.locV + 40 + clawHeight
        CABLE.loc = claw.loc + point(0, -10)
        CABLE.height = clawHeight + 30
    end case
  end if
end
