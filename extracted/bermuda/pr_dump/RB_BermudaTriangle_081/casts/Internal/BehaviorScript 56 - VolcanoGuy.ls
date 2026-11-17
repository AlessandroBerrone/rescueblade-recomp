property this, Xpos, Ypos, claw, guyState, Yvel, grav, mapXPos, mapXTile, Xvel, loopX, loopWidth, jump, jumpVel, blackCopter
global gPaused, gXVel, gXOffset, gTileIDList, gTileHeightList, gRescueCount

on beginSprite
  this = sprite(the currentSpriteNum)
  claw = sprite(80)
  blackCopter = sprite(79)
  Xpos = this.locH
  Ypos = this.locV
  Xvel = 0
  Yvel = 0
  guyState = #claw
  grav = 1
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  mapXPos = (gTileIDList.count / 2 * 128) + Xpos - 256 - 64
  mapXTile = mapXTile = integer(mapXPos / 128)
  jump = 0
  puppetSound(4, member(82, "Sfx"))
end

on exitFrame
  if gPaused = 0 then
    case guyState of
      #claw:
        Xpos = claw.locH
        Ypos = claw.locV
        this.locH = Xpos
        this.locV = Ypos
        doGroundHeight()
      #ONGROUND:
        Xpos = Xpos + gXVel + gXOffset
        this.locH = Xpos
        this.locV = Ypos - jump
        jumpVel = jumpVel - grav
        jump = jump + jumpVel
        if jump < 0 then
          jumpVel = 10
        end if
    end case
  end if
end

on doGroundHeight
  mapXPos = mapXPos - gXVel
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
  diff = Ypos + 10 - (280 - groundHeightLeft) + (groundDiff * localXPercent)
  if (diff > 0) and (blackCopter.firedCount >= 10) then
    Ypos = Ypos - diff
    this.locV = Ypos
    guyState = #ONGROUND
    gRescueCount = 1
    puppetSound(4, member(85, "Sfx"))
  end if
end
