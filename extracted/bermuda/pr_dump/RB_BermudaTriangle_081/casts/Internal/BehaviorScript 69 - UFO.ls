property this, Xpos, loopWidth, loopX, radians, Ypos, mapXPos, swell, swellList, swellListPointer, swellListPointer1, COPTER, sway, bellRung, CopterState, Yvel, Xvel, hitRot, bash, featherDelay, cableGuy, frameToggle, copterDelay, claw, clawYPos, clawYVel, gotWarHead, clawHeight, CABLE, attackMode, fireCount, missile, firedCount, missileWait, gray, seat, dome, abductee, donkCount, toDieSaid
global gXVel, gXOffset, gPaused, gTileIDList, gScore, gDamagePercent, gCableLength, gCableItem, gAbducteeList, gCoconutList

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  abductee = VOID
  this.locZ = the currentSpriteNum + 1
  gray = sprite(the currentSpriteNum + 1)
  seat = sprite(the currentSpriteNum - 1)
  seat.locZ = the currentSpriteNum - 1
  dome = sprite(the currentSpriteNum - 2)
  dome.locZ = the currentSpriteNum - 2
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
  donkCount = 0
  loopWidth = gTileIDList.count * 128
  loopX = gTileIDList.count * 128 * 0.5
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  Yvel = 0.0
  Xvel = 0.0
  mapXPos = Xpos - 256
  sway = 0
  swellAngle = 0
  CopterState = #FLY
  bash = 0
  frameToggle = 1
  copterDelay = 0
  gotWarHead = 0
  clawHeight = 0
  attackMode = #ABDUCT
  fireCount = 0
  firedCount = 0
  missileWait = 80
  toDieSaid = 0
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
          if toDieSaid = 0 then
            toDieSaid = 1
            puppetSound(2, member(96, "Sfx"))
          end if
          xDiff = COPTER.locH - this.locH
          if abs(xDiff) < 5 then
            yDiff = COPTER.locV - this.locV
            if abs(yDiff) < 5 then
            end if
          end if
        end if
        if (Xpos > -100) and (Xpos < 612) then
          case attackMode of
            #ABDUCT:
              fireCount = fireCount + 1
              if (fireCount > missileWait) and (gXVel > 5) then
              end if
              Yvel = Yvel + ((150 + random(50) - this.locV) * 0.005)
              if Ypos > 150 then
                Yvel = Yvel + ((150 - Ypos) * 0.01)
              end if
              Xvel = Xvel + ((COPTER.locH + 240 + random(10) - this.locH) * 0.001)
              if Xvel > 8 then
                Xvel = 8
              end if
              if Xvel < -8 then
                Xvel = -8
              end if
              if gCoconutList.count > 0 then
                repeat with i = 1 to gCoconutList.count
                  xDiff = float(gCoconutList[i].locH - this.locH)
                  yDiff = float(gCoconutList[i].locV - this.locV)
                  Dist = sqrt((xDiff * xDiff) + (yDiff * yDiff))
                  if Dist < 20 then
                    donkCount = donkCount + 1
                    if donkCount > 6 then
                      attackMode = #FLEE
                      dome.memberNum = 186
                      dome.locZ = dome.locZ + 3
                      puppetSound(4, member(92, "Sfx"))
                      gAbducteeList.add(abductee)
                      abductee = VOID
                    else
                      puppetSound(4, member(91, "Sfx"))
                    end if
                    if Dist > 0 then
                      pushDir = point(xDiff, yDiff) / Dist
                      gCoconutList[i].Xvel = pushDir.locH * 10
                      gCoconutList[i].Yvel = pushDir.locV * 10
                      Xvel = Xvel - (pushDir.locH * 2)
                      Yvel = Yvel - (pushDir.locV * 2)
                    end if
                  end if
                end repeat
              end if
            #FLEE:
              Yvel = Yvel + ((150 - this.locV) * 0.007)
              Xvel = Xvel + 0.20000000000000001
              xDiff = float(this.locH - cableGuy.locH)
              yDiff = float(this.locV - cableGuy.locV)
              distToCopter = sqrt((xDiff * xDiff) + (yDiff * yDiff))
              if distToCopter < 100 then
                if distToCopter <> 0 then
                  normToCopter = point(xDiff, yDiff) / distToCopter
                else
                  normToCopter = point(0, 0)
                end if
                pushVector = normToCopter * distToCopter * 0.005
                Xvel = Xvel + pushVector.locH
                Yvel = Yvel + pushVector.locV
              end if
            #PILOTLESS:
              Yvel = Yvel + ((-200 - this.locV) * 0.0001)
              Xvel = Xvel + 0.10000000000000001
              Ypos = Ypos + Yvel
          end case
        end if
        Yvel = Yvel * 0.95999999999999996
        Xvel = Xvel * 0.94999999999999996
        this.locH = Xpos
        this.rotation = Xvel * 2
        this.locV = Ypos
        seat.loc = this.loc
        dome.loc = this.loc
        seat.rotation = this.rotation
        dome.rotation = this.rotation
        gray.rotation = this.rotation
    end case
  end if
end

on doCallMissile
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
end
