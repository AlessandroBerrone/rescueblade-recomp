property this, radians, Xpos, loopX, Ypos, glow, COPTER, cableGuy, towerState, startY, glowList, glowListPointer, loopWidth, grabX, grabY, tiltAngle, thisFrame, frameWait, survivor, tentacleLength, TentacleStretch, stretchVel, startHeight, tiltVel, pullCount, distToCopter, diffAngle, stretchPercent, toCopterVector
global gXVel, gXOffset, gPaused, gTileIDList, gDamagePercent, gCableLength, gPloshX, gRescueCount, gScore, gCableItem, gXVelChange

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  tiltAngle = random(60) - 30
  if tiltAngle < 0 then
    tiltAngle = tiltAngle + 360
  end if
  if tiltAngle > 360 then
    tiltAngle = tiltAngle - 360
  end if
  survivor = sprite(the currentSpriteNum - 1)
  COPTER = sprite(4)
  cableGuy = sprite(6)
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  startHeight = this.height
  startY = Ypos
  tiltVel = 0
  distToCopter = 0.0
  Dist = 0.0
  diffAngle = 0.0
  this.locZ = the currentSpriteNum + 104
  tentacleLength = 105
  TentacleStretch = 0
  stretchVel = random(10) - 5
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  ouchCount = 3
  prevBolt = 0
  boltOffset = -60
  towerState = #NULL
  glowList = []
  repeat with i = 1 to 30
    glowList.add(50 + (50 * cos(i * 12 * radians)))
  end repeat
  glowListPointer = 1
  grabX = 0
  grabY = 0
  thisFrame = 320 + random(9)
  frameWait = random(2)
  pullCount = 0
end

on exitFrame
  if gPaused = 0 then
    case towerState of
      #NULL:
        if abs(stretchVel) < 1 then
          pullCount = pullCount + 1
        else
          if pullCount >= 2 then
            pullCount = pullCount - 2
          end if
        end if
        if pullCount > 20 then
          stretchVel = stretchVel + 4
        end if
        stretchVel = stretchVel * 0.98999999999999999
        stretchVel = stretchVel - (TentacleStretch * 0.03)
        TentacleStretch = TentacleStretch + stretchVel
        this.height = startHeight + (TentacleStretch * 1.19999999999999996)
        Xpos = Xpos + (gXVel + gXOffset)
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        this.locH = Xpos
        this.locV = Ypos
        this.rotation = tiltAngle
        grabX = Xpos + ((tentacleLength + TentacleStretch) * cos((tiltAngle - 90) * radians))
        grabY = Ypos + ((tentacleLength + TentacleStretch) * sin((tiltAngle - 90) * radians))
        xDiff = cableGuy.locH - grabX
        yDiff = cableGuy.locV - grabY
        distToGuy = sqrt((xDiff * xDiff) + (yDiff * yDiff))
        if (distToGuy < 6) and (gCableItem = 0) then
          if gCableLength > 0 then
            tiltAngle = AngleGrind(this.locH, this.locV, cableGuy.locH, cableGuy.locV) + 90
            if tiltAngle > 360 then
              tiltAngle = tiltAngle - 360
            end if
            towerState = #GRABBED
            gCableItem = 1
            pullCount = 0
            stretchVel = 0
          end if
        end if
        survivor.Xpos = grabX
        survivor.Ypos = grabY
        survivor.loc = point(grabX, grabY)
      #GRABBED:
        doPositionTentacle()
        doStretchVelFriction()
        doStretchVelPullBack()
        doStretchVelUpdate()
        doCalcGrabXY()
        doDiffDistToCopter()
        doDiffAngle()
        doTiltAnglePull()
        doStretchPercent()
        doStretchVelCopterPull()
        doCableGuyVelPull()
        doCopterVelPull()
        doPositionSurvivor()
        doPluckConditions()
      #UP:
        tiltAngle = tiltAngle * 0.97999999999999998
        Xpos = Xpos + (gXVel + gXOffset)
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        this.rotation = tiltAngle
        this.locH = Xpos
        this.locV = Ypos
        stretchVel = stretchVel * 0.98999999999999999
        stretchVel = stretchVel - (TentacleStretch * 0.03)
        TentacleStretch = TentacleStretch + stretchVel
        this.height = startHeight + TentacleStretch
    end case
    frameWait = frameWait + 1
    if frameWait >= 2 then
      frameWait = 0
      thisFrame = thisFrame + 1
      if thisFrame > 329 then
        thisFrame = 320
      end if
    end if
    this.memberNum = thisFrame
  end if
end

on doPositionTentacle
  if soundBusy(4) = 0 then
    puppetSound(4, member(39, "Sfx"))
  end if
  Xpos = Xpos + (gXVel + gXOffset)
  if Xpos > loopX then
    Xpos = Xpos - loopWidth
  end if
  if Xpos < -loopX then
    Xpos = Xpos + loopWidth
  end if
  this.locH = Xpos
  this.locV = Ypos
  this.rotation = tiltAngle
end

on doStretchVelFriction
  stretchVel = stretchVel * 0.98999999999999999
end

on doStretchVelPullBack
  stretchVel = stretchVel - (TentacleStretch * 0.006)
end

on doStretchVelUpdate
  TentacleStretch = TentacleStretch + stretchVel
  this.height = startHeight + (TentacleStretch * 1.30000000000000004)
end

on doCalcGrabXY
  grabX = Xpos + ((tentacleLength + TentacleStretch) * cos((tiltAngle - 90) * radians))
  grabY = Ypos + ((tentacleLength + TentacleStretch) * sin((tiltAngle - 90) * radians))
end

on doDiffDistToCopter
  xDiff = float(COPTER.locH - gXVel - grabX)
  yDiff = float(COPTER.locV + COPTER.Yvel - grabY)
  distToCopter = sqrt((xDiff * xDiff) + (yDiff * yDiff))
end

on doDiffAngle
  angleA = this.rotation - 90
  angleB = AngleGrind(grabX, grabY, COPTER.locH - gXVel, COPTER.locV + COPTER.Yvel)
  diffAngle = angleB - angleA
  if diffAngle > 180 then
    diffAngle = diffAngle - 360
  end if
  if diffAngle < -180 then
    diffAngle = diffAngle + 360
  end if
end

on doTiltAnglePull
  tiltAngle = tiltAngle + (diffAngle * 0.02)
  if tiltAngle < 0 then
    tiltAngle = tiltAngle + 360
  end if
  if tiltAngle > 360 then
    tiltAngle = tiltAngle - 360
  end if
end

on doStretchPercent
  stretchPercent = abs(diffAngle)
  if stretchPercent > 90 then
    stretchPercent = 90
  end if
  stretchPercent = 1 - (stretchPercent / 90)
end

on doStretchVelCopterPull
  if distToCopter > gCableLength then
    stretchVel = stretchVel + ((distToCopter - gCableLength) * stretchPercent)
  end if
end

on doCableGuyVelPull
  toCableGuyVector = point(grabX, grabY) - (cableGuy.loc + point(cableGuy.Xvel, cableGuy.Yvel))
  pullVector = toCableGuyVector
  cableGuy.Xvel = cableGuy.Xvel + pullVector.locH
  cableGuy.Yvel = cableGuy.Yvel + pullVector.locV
  toCopterVector = point(grabX, grabY) - COPTER.loc
end

on doCopterVelPull
  if distToCopter > gCableLength then
    pullCount = pullCount + 1
    pullVector = toCopterVector / float(distToCopter) * (distToCopter - gCableLength)
    gXVelChange = gXVelChange - pullVector.locH
    COPTER.Yvel = COPTER.Yvel + pullVector.locV
    cableGuy.cableState = #GODOWN
  end if
end

on doPositionSurvivor
  survivor.Xpos = grabX
  survivor.Ypos = grabY
  survivor.loc = point(grabX, grabY)
end

on doPluckConditions
  if (TentacleStretch > 80) or (pullCount >= 200) then
    gScore = gScore + 500
    towerState = #UP
    gCableItem = 0
    puppetSound(4, member(40, "Sfx"))
    puppetSound(3, member(8, "Sfx"))
    gRescueCount = gRescueCount + 1
    survivor.survivorState = #ONCABLE
    gCableItem = 1
    if tiltAngle > 180 then
      tiltAngle = tiltAngle - 360
    end if
  end if
end
