property numberSpriteList, prevScore, displayScore, fuelBar, damageBar, fuelBarDelay, fuelFlashToggle, displayDamage, damageFlashToggle, damageBarDelay, displayFuel
global gScore, gDamagePercent, gfuelPercent, gPaused

on beginSprite
  gScore = 0
  prevScore = 0
  displayScore = float(0)
  sprite(the currentSpriteNum).locZ = 2000
  numberSpriteList = []
  repeat with i = 1 to 7
    numberSpriteList.add(sprite(the currentSpriteNum + i - 1))
    sprite(the currentSpriteNum + i - 1).locZ = 2000 + 1
  end repeat
  fuelBar = sprite(the currentSpriteNum + 9)
  sprite(the currentSpriteNum + 10).locZ = 2004
  fuelBar.locZ = 2003
  damageBar = sprite(the currentSpriteNum + 7)
  sprite(the currentSpriteNum + 8).locZ = 2002
  damageBar.locZ = 2001
  fuelBarDelay = 0
  displayFuel = 50
  fuelFlashToggle = 1
  displayDamage = 100
  damageBarDelay = 0
  damageFlashToggle = 1
end

on exitFrame
  if gPaused = 0 then
    if gScore > 9999999 then
      gScore = 9999999
    end if
    displayScore = displayScore + ((gScore - displayScore) * 0.20000000000000001)
    calcScore = integer(displayScore)
    repeat with i = 7 down to 1
      temp = calcScore mod power(10, i - 1)
      temp1 = (calcScore - temp) / power(10, i - 1)
      calcScore = temp
      numberSpriteList[i].member = member(50 + temp1, "Gfx")
    end repeat
    if gfuelPercent > 100 then
      gfuelPercent = 100
    end if
    displayFuel = displayFuel + ((gfuelPercent - displayFuel) * 0.05)
    fuelBar.locH = 512 - (displayFuel / 100.0 * 93)
    if displayFuel < 30 then
      fuelBarDelay = fuelBarDelay + 1
      if fuelBarDelay = 4 then
        fuelBarDelay = 0
        fuelBar.blend = 55 + (45 * fuelFlashToggle)
        if fuelFlashToggle = 1 then
          fuelBar.locH = 420
        end if
        fuelFlashToggle = -fuelFlashToggle
        if soundBusy(3) = 0 then
          puppetSound(3, member(13, "Sfx"))
        end if
      end if
    else
      fuelBar.blend = 100
    end if
  end if
  if gDamagePercent > 100 then
    gDamagePercent = 100
  end if
  displayDamage = displayDamage + ((gDamagePercent - displayDamage) * 0.05)
  damageBar.locH = displayDamage / 100.0 * 92
  if gDamagePercent > 80 then
    damageBarDelay = damageBarDelay + 1
    if damageBarDelay = 4 then
      damageBarDelay = 0
      damageBar.blend = 55 + (45 * damageFlashToggle)
      damageFlashToggle = -damageFlashToggle
      if soundBusy(3) = 0 then
        puppetSound(3, member(13, "Sfx"))
      end if
    else
      damageBar.blend = 100
    end if
  end if
end
