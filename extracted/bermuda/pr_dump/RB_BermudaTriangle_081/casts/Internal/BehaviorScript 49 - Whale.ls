property this, Xpos, radians, Ypos, loopX, loopWidth, cableGuy, distToGuy, tiltAngle, whaleState, snowBlow, slapCount, sinList, sinListPointer
global gXVel, gXOffset, gPaused, gTileIDList, gXVelChange, gScore

on beginSprite
  radians = float(PI / 180)
  sinList = []
  sinListPointer = 1
  repeat with i = 1 to 180
    sinList.add(30 * sin(i * 2 * radians))
  end repeat
  this = sprite(the currentSpriteNum)
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  radians = float(PI / 180)
  whaleState = #WAITING
  this.locZ = 203
  cableGuy = sprite(6)
  tiltAngle = 0
  snowBlow = sprite(56)
  slapCount = 1
end

on exitFrame
  if gPaused = 0 then
    prevXPos = Xpos
    Xpos = Xpos + gXVel + gXOffset
    if Xpos > loopX then
      Xpos = Xpos - loopWidth
    end if
    if Xpos < -loopX then
      Xpos = Xpos + loopWidth
    end if
    if (Xpos > 0) and (Xpos < 512) then
      if (prevXPos <= 0) or (prevXPos >= 512) then
        if soundBusy(2) = 0 then
          puppetSound(2, member(74, "Sfx"))
        end if
      end if
      case whaleState of
        #WAITING:
          spoutPoint = this.loc + point(-16, -93)
          snowBlow.loc = spoutPoint
          snowBlow.rotation = 180
          xDiff = float(spoutPoint.locH - (cableGuy.locH + cableGuy.Xvel))
          yDiff = float(spoutPoint.locV - (cableGuy.locV + cableGuy.Yvel))
          if abs(xDiff) < 15 then
            if (yDiff < 15) and (yDiff > -10) then
              whaleState = #ROLL
              tiltAngle = 360
            end if
          end if
        #ROLL:
          prevTiltAngle = tiltAngle
          if tiltAngle > 0 then
            tiltAngle = tiltAngle * 0.94999999999999996
          end if
          if (tiltAngle < 270) and (prevTiltAngle >= 270) then
            if slapCount mod 2 then
              puppetSound(4, member(11, "Sfx"))
            else
              puppetSound(4, member(75, "Sfx"))
            end if
            cableGuy.Xvel = -50
            slapCount = slapCount + 1
            gScore = gScore + 500
          end if
          if tiltAngle < 2 then
            tiltAngle = 0
            whaleState = #WAITING
            if soundBusy(2) = 0 then
              puppetSound(2, member(74, "Sfx"))
            end if
          end if
      end case
    end if
    sinListPointer = sinListPointer + 1
    if sinListPointer > sinList.count then
      sinListPointer = 1
    end if
    this.locV = Ypos + sinList[sinListPointer]
    this.locH = Xpos
    this.rotation = tiltAngle
  end if
end
