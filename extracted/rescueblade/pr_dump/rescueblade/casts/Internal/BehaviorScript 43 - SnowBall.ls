property this, radians, Xpos, Xvel, loopX, Ypos, COPTER, cableGuy, ballState, startY, loopWidth, ballAngle, ballRadius, Yvel, grav, snowBlow, ploshCount, mapXPos, mapXTile
global gXVel, gXOffset, gPaused, gTileIDList, gDamagePercent, gCableLength, gPloshX, gRescueCount, gScore, gCableItem, gXVelChange, gTileHeightList

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  ballAngle = 0
  snowBlow = sprite(56)
  COPTER = sprite(4)
  Yvel = 0
  grav = 1
  cableGuy = sprite(6)
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  mapXPos = (gTileIDList.count / 2 * 128) + Xpos - 256 - 64
  mapXTile = mapXTile = integer(mapXPos / 128)
  Xvel = 0
  startY = Ypos
  this.locZ = the currentSpriteNum + 104
  ballRadius = 10
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  ouchCount = 3
  prevBolt = 0
  boltOffset = -60
  ballState = #ROLL
  glowList = []
  repeat with i = 1 to 30
    glowList.add(50 + (50 * cos(i * 12 * radians)))
  end repeat
  glowListPointer = 1
  grabX = 0
  grabY = 0
  ploshCount = 0
end

on exitFrame
  if gPaused = 0 then
    case ballState of
      #ROLL:
        Xpos = Xpos + (gXVel + gXOffset) + Xvel
        Ypos = Ypos + Yvel
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        ballAngle = ballAngle + (Xvel * 2)
        if ballAngle > 360 then
          ballAngle = ballAngle - 360
        end if
        if ballAngle < 0 then
          ballAngle = ballAngle + 360
        end if
        Yvel = Yvel + grav
        doGroundHeight()
        this.locH = Xpos
        this.locV = Ypos
        this.rotation = ballAngle
        if gPloshX = -2 then
          if ballRadius > 10 then
            ballRadius = ballRadius - 0.20000000000000001
          end if
          Xvel = Xvel * 0.90000000000000002
          if sound(3).member <> member(33, "Sfx") then
            puppetSound(3, member(33, "Sfx"))
          end if
        end if
        gPloshX = -1
        ploshCount = ploshCount + 1
        if ploshCount >= 4 then
          gPloshX = Xpos
          ploshCount = 0
        end if
        xDiff = abs(COPTER.locH - this.locH)
        xDiff = xDiff - 32
        yDiff = COPTER.locV - this.locV
        if (abs(xDiff) < 32) and (yDiff > -100) then
          if COPTER.locH < this.locH then
            snowBlow.loc = this.loc + point(-32, ballRadius - 15)
            Xvel = Xvel + (0.29999999999999999 * (1 - (abs(xDiff) / 32)))
          else
            snowBlow.loc = this.loc + point(32, ballRadius - 15)
            Xvel = Xvel - (0.29999999999999999 * (1 - (abs(xDiff) / 32)))
          end if
          if ballRadius < 32 then
            ballRadius = ballRadius + 0.14000000000000001
          end if
        end if
        Xvel = Xvel * 0.94999999999999996
        this.height = ballRadius * 2
        this.width = ballRadius * 2
    end case
  end if
end

on doGroundHeight
  mapXPos = mapXPos + Xvel
  if mapXPos > loopWidth then
    mapXPos = mapXPos - loopWidth
  end if
  if mapXPos < 0 then
    mapXPos = mapXPos + loopWidth
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
  diff = Ypos + (ballRadius * 0.90000000000000002) - (280 - groundHeightLeft) + (groundDiff * localXPercent)
  if diff > 0 then
    Ypos = Ypos - diff
  end if
end
