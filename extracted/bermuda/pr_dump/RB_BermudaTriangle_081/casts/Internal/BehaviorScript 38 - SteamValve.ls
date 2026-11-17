property this, Xpos, Ypos, mapXPos, loopX, bolt, COPTER, cableGuy, ouchCount, valveState, valveAngle, valve, valveVel, STEAM, valveCounter, onScreen, loopWidth
global gXVel, gXOffset, gPaused, gTileIDList, gDamagePercent, gPloshX

on beginSprite
  this = sprite(the currentSpriteNum)
  COPTER = sprite(4)
  cableGuy = sprite(6)
  STEAM = sprite(the currentSpriteNum + 2)
  valve = sprite(the currentSpriteNum + 1)
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 51
  STEAM.locZ = 52
  valve.locZ = 53
  mapXPos = Xpos - 256
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  ouchCount = 0
  prevBolt = 0
  boltOffset = -50
  valveState = #STEAM
  valveAngle = 90
  valveVel = 0
  valveCounter = 0
  onScreen = 0
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
    this.locH = Xpos
    this.locV = Ypos
    STEAM.locH = this.locH
    valve.loc = this.loc
    if (Xpos > -20) and (Xpos < 550) then
      if onScreen = 0 then
        onScreen = 1
        puppetSound(2, member(42, "Sfx"))
      end if
      case valveState of
        #STEAM:
          valveVel = valveVel - 1
          if valveAngle < 60 then
            valveVel = valveVel + ((60 - valveAngle) * 0.10000000000000001)
          end if
          valveAngle = valveAngle + valveVel
          valveVel = valveVel * 0.98999999999999999
          valve.rotation = valveAngle
          if gPloshX > -1 then
            xDiff = gPloshX - Xpos - 12
            if abs(xDiff) < 50 then
              valveVel = valveVel - 8
            end if
            if valveAngle <= 0 then
              valveState = #closed
              valveCounter = 0
              puppetSound(2, member(41, "Sfx"))
            end if
          end if
          xDiff = this.locH - 12 - cableGuy.locH
          if abs(xDiff) < 40 then
            gDamagePercent = gDamagePercent + 2
            if soundBusy(4) = 0 then
              puppetSound(4, member(34 + ouchCount, "Sfx"))
              ouchCount = ouchCount + 1
              if ouchCount > 3 then
                ouchCount = 0
              end if
            end if
          end if
          STEAM.loc = this.loc
        #closed:
          STEAM.locV = -1000
          valveAngle = 0
          valve.rotation = valveAngle
          valveCounter = valveCounter + 1
          if valveCounter >= 70 then
            valveState = #STEAM
            valveAngle = 1
            valveVel = 0
            puppetSound(2, member(42, "Sfx"))
          end if
      end case
      STEAM.height = valveAngle + 70 + random(80)
    else
      if onScreen = 1 then
        if sound(2).member = member(42, "Sfx") then
          puppetSound(2, 0)
        end if
        onScreen = 0
      end if
    end if
  end if
end
