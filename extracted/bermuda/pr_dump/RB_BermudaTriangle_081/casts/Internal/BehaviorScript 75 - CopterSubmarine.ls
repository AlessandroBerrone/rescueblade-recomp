property this, gameState, tiltAngle, thisMember, delayCount, rotorToggle, calc, Yvel, grav, Throttle, Ypos, radians, Xpos, PrevXvel, mapXPos, mapXTile, localXPercent, xOffset, prevGroundID, copterShadow, survivorOutDelay, smokeDelay
global gXVel, gXOffset, gSeaFrame, gPaused, gTileIDList, gTileHeightList, gScore, gfuelPercent, gDamagePercent, gCableItem, gCableLength, gRescueCount, gRescuedList, gSmokeList, gPickupList, gLevel, gSceneryList, gCopterTile, gGuyDoom, gProControls, gPloshList, gWaterFlow, gPloshX, gXVelChange, gCoconuts, gCoconutList, gAbducteeList

on beginSprite
  this = sprite(the currentSpriteNum)
  gTileIDList = []
  gTileHeightList = []
  gSceneryList = []
  gAbducteeList = []
  mapMember = member(gLevel, "Maps")
  repeat with i = 1 to mapMember.word[1].item.count
    gTileIDList.add(integer(mapMember.word[1].item[i]))
    gTileHeightList.add(integer(mapMember.word[2].item[i]))
    gSceneryList.add(integer(mapMember.word[3].item[i]))
  end repeat
  if (mapMember.word[1].item.count <> mapMember.word[2].item.count) or (mapMember.word[2].item.count <> mapMember.word[3].item.count) then
    put "List missmatch !"
    put mapMember.word[1].item.count
    put mapMember.word[2].item.count
    put mapMember.word[3].item.count
  end if
  copterShadow = sprite(the currentSpriteNum + 5)
  copterShadow.locZ = 1500
  radians = float(PI / 180)
  tiltAngle = 0
  thisMember = 354
  delayCount = 0
  rotorToggle = 0
  calc = 0
  Yvel = float(0)
  gXVel = float(0)
  grav = 1
  Throttle = 0.94999999999999996
  Ypos = this.locV
  gXOffset = 0
  xOffset = 0
  PrevXvel = 0
  Xpos = float(this.locH)
  gameState = #FLY
  gPaused = 0
  mapXPos = 256 - 64 - Xpos + (gTileIDList.count / 2 * 128)
  mapXTile = mapXTile = integer(mapXPos / 128)
  gCopterTile = 0
  gfuelPercent = 100
  this.locZ = 100
  gScore = 0
  gDamagePercent = 0
  puppetSound(1, member(98, "Sfx"))
  gCableItem = 0
  gCableLength = 0
  gRescueCount = 0
  gRescuedList = []
  prevGroundID = -1
  survivorOutDelay = 0
  gSmokeList = []
  smokeDelay = 0
  gPickupList = []
  gGuyDoom = #NULL
  gPloshList = []
  gWaterFlow = 0
  gPloshX = -1
  gXVelChange = 0
  gCoconuts = 0
  gCoconutList = []
end

on exitFrame
  if gPaused = 0 then
    case gameState of
      #FLY:
        doKeys()
        DoFly()
    end case
  end if
end

on doKeys
  gXVel = gXVel + gXVelChange
  gXVelChange = 0
  if gWaterFlow = 0 then
    if keyPressed(123) then
      if tiltAngle > -20 then
        tiltAngle = tiltAngle - 1.19999999999999996
      end if
    end if
    if keyPressed(124) then
      if tiltAngle < 20 then
        tiltAngle = tiltAngle + 1.19999999999999996
      end if
    end if
    if keyPressed(49) then
      gXVel = gXVel * 0.94999999999999996
      tiltAngle = tiltAngle * 0.94999999999999996
    end if
  else
    gXVel = gXVel * 0.90000000000000002
    tiltAngle = tiltAngle * 0.90000000000000002
  end if
  if (gfuelPercent > 0) and (gDamagePercent < 100) then
    if gProControls = 1 then
      if keyPressed(125) then
        if Throttle > 0.5 then
          Throttle = Throttle - 0.01
        end if
      end if
      if keyPressed(126) then
        if Throttle < 2 then
          Throttle = Throttle + 0.01
        end if
      end if
      Yvel = Yvel + grav
      yForce = -Throttle * cos(tiltAngle * radians)
      gXVel = gXVel - (Throttle * sin(tiltAngle * radians))
      Yvel = Yvel + yForce
      gXVel = gXVel * 0.94999999999999996
      Yvel = Yvel * 0.94999999999999996
    else
      if keyPressed(125) then
        Yvel = Yvel + 0.29999999999999999
      end if
      if keyPressed(126) then
        Yvel = Yvel - 0.29999999999999999
      end if
      Yvel = Yvel + 0.01
      gXVel = gXVel - (Throttle * sin(tiltAngle * radians))
      gXVel = gXVel * 0.94999999999999996
      Yvel = Yvel * 0.94999999999999996
    end if
  else
    if gProControls = 1 then
      Yvel = Yvel + grav
      yForce = -Throttle * cos(tiltAngle * radians)
      gXVel = gXVel - (Throttle * sin(tiltAngle * radians))
      Yvel = Yvel + yForce
      gXVel = gXVel * 0.94999999999999996
      Yvel = Yvel * 0.94999999999999996
      Throttle = 0.5
    else
      Yvel = Yvel + 0.5
      gXVel = gXVel - (Throttle * sin(tiltAngle * radians))
      gXVel = gXVel * 0.94999999999999996
      Yvel = Yvel * 0.94999999999999996
    end if
  end if
  if Ypos < 10 then
    Yvel = Yvel + ((10 - Ypos) * 0.05)
    if Throttle > 1.5 then
      Throttle = 1.5
    end if
  end if
end

on DoFly
  if gfuelPercent > 0 then
    gfuelPercent = gfuelPercent - (Throttle * 0.05)
    if gfuelPercent < 0 then
      gfuelPercent = 0
    end if
  else
  end if
  if delayCount = 2 then
    if gXVel < -2 then
      if thisMember > 348 then
        thisMember = thisMember - 1
      end if
    else
      if gXVel > 2 then
        if thisMember < 367 then
          thisMember = thisMember + 1
        end if
      end if
    end if
    delayCount = 0
    if rotorToggle = 1 then
      rotorToggle = 0
    else
      rotorToggle = 1
    end if
  end if
  delayCount = delayCount + 1
  calc = thisMember
  this.member = member(calc, "Gfx")
  this.rotation = tiltAngle
  Ypos = Ypos + Yvel
  if gXVel > 4 then
    xOffset = xOffset + ((gXVel - 4) * 1.25)
  end if
  if gXVel < -4 then
    xOffset = xOffset + ((gXVel + 4) * 1.25)
  end if
  if gProControls = 1 then
    xOffset = xOffset * 0.90000000000000002
  else
    xOffset = xOffset * 0.96999999999999997
  end if
  gXOffset = xOffset - PrevXvel
  PrevXvel = xOffset
  Xpos = Xpos + gXOffset
  this.locH = Xpos
  this.locV = Ypos
  prevgXOffset = gXOffset
  doGroundHeight()
end

on doGroundHeight
  gCopterTile = 0
  if mapXPos > (gTileIDList.count * 128) then
    mapXPos = mapXPos - (gTileIDList.count * 128)
  end if
  if mapXPos < 0 then
    mapXPos = mapXPos + (gTileIDList.count * 128)
  end if
  temp = (mapXPos - 0.5) mod 128
  temp1 = mapXPos - temp
  temp2 = integer(temp1 / 128)
  mapXTile = temp2 + 1
  localXPercent = (mapXPos - ((mapXTile - 1) * 128)) / 128
  tempID = gTileIDList[mapXTile]
  groundHeightLeft = gTileHeightList[mapXTile]
  temp = mapXTile + 1
  if temp > gTileIDList.count then
    temp = temp - gTileIDList.count
  end if
  groundHeightRight = gTileHeightList[temp]
  groundDiff = groundHeightRight - groundHeightLeft
  diff = Ypos + 16 + Yvel - (280 - groundHeightLeft) + (groundDiff * localXPercent)
  copterShadow.locH = this.locH
  copterShadow.locV = 280 - groundHeightLeft - (groundDiff * localXPercent)
  if diff >= 0 then
    case tempID of
      (-1):
      0:
        if soundBusy(3) = 0 then
          puppetSound(3, member(10, "Sfx"))
        end if
        Yvel = Yvel - (diff * 0.03)
        gXVel = gXVel * 0.90000000000000002
        if Throttle < 0.5 then
          Throttle = 0.5
        end if
        tiltAngle = tiltAngle * 0.80000000000000004
        gDamagePercent = gDamagePercent + 1
      1, 5, 6, 7, 8, 9:
        Yvel = Yvel - diff
        if Throttle < 0.80000000000000004 then
          Throttle = 0.80000000000000004
        end if
        if (diff > 2) or (abs(gXVel) > 2) then
          gDamagePercent = gDamagePercent + (abs(gXVel) * 2) + ((diff - 2) * 2)
          if soundBusy(3) = 0 then
            puppetSound(3, member(27, "Sfx"))
          end if
        end if
        gXVel = 0
        tiltAngle = tiltAngle * 0.80000000000000004
      2, 3:
        if soundBusy(3) = 0 then
          puppetSound(3, member(10, "Sfx"))
        end if
        Yvel = Yvel - (diff * 0.04)
        gXVel = gXVel * 0.5
        if Throttle < 0.80000000000000004 then
          Throttle = 0.80000000000000004
        end if
        tiltAngle = tiltAngle * 0.80000000000000004
        gDamagePercent = gDamagePercent + 1
      4:
        gCopterTile = mapXTile
        if gRescuedList.count > 0 then
          survivorOutDelay = survivorOutDelay + 1
          if survivorOutDelay >= 16 then
            gRescuedList[1].survivorState = #GOTOHQ
            gRescuedList[1].distToHQ = 67 + (128 * localXPercent)
            gRescuedList[1].Xvel = -1
            gRescuedList[1].Xpos = Xpos
            gRescuedList.deleteAt(1)
            survivorOutDelay = 0
          end if
        end if
        Yvel = Yvel - diff
        if Throttle < 0.80000000000000004 then
          Throttle = 0.80000000000000004
        end if
        if (diff > 2) or (abs(gXVel) > 3) then
          gDamagePercent = gDamagePercent + (abs(gXVel) * 2) + ((diff - 3) * 2)
          if soundBusy(3) = 0 then
            puppetSound(3, member(27, "Sfx"))
          end if
        end if
        gfuelPercent = gfuelPercent + 0.80000000000000004
        if gfuelPercent > 100 then
          gfuelPercent = 100
        end if
        if gfuelPercent < 100 then
          if soundBusy(3) = 0 then
            puppetSound(3, member(12, "Sfx"))
          end if
        end if
        gXVel = 0
        tiltAngle = tiltAngle * 0.80000000000000004
    end case
    prevGroundID = tempID
  else
    case prevGroundID of
      0:
      1:
    end case
    prevGroundID = -1
  end if
  if gDamagePercent > 70 then
    smokeDelay = smokeDelay + 1
    if smokeDelay >= 6 then
      if gSmokeList.count > 0 then
        gSmokeList[1].smokeState = #SMOKE
        gSmokeList[1].Xpos = Xpos
        gSmokeList[1].Ypos = Ypos
        gSmokeList.deleteAt(1)
      end if
      smokeDelay = 0
    end if
  end if
  mapXPos = mapXPos - gXVel
end
