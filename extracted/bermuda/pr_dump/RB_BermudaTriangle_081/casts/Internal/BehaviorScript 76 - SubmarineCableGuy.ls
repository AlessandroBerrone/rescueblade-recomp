property this, thisMember, COPTER, CABLE, cableState, PrevSpacePressed, grav, Xpos, Ypos, Xvel, Yvel, prevgXOffset, mapXPos, mapXTile, localXPercent, prevGroundID, cableGuyOverlay, cableGuyBubbles, sharkCounter, frameDir, speechCounter, winchWait, startMember, oofCount, photoCounter, takingPhoto, photoFlash
global gXVel, gXOffset, gPaused, gTileIDList, gTileHeightList, gCableLength, gGuyDoom, gLevel, gCoconuts

on beginSprite
  this = sprite(the currentSpriteNum)
  thisMember = this.memberNum
  startMember = this.memberNum
  COPTER = sprite(the currentSpriteNum - 2)
  CABLE = sprite(the currentSpriteNum - 1)
  photoFlash = sprite(7)
  cableState = #GOUP
  PrevSpacePressed = 0
  Xpos = float(COPTER.locH - 5)
  Ypos = float(COPTER.locV)
  Xvel = 0.0
  Yvel = 0.0
  grav = 0.5
  prevgXOffset = 0.0
  this.locH = Xpos
  this.locV = Ypos
  mapXPos = 256 - 64 - 5 - Xpos + (gTileIDList.count / 2 * 128)
  mapXTile = mapXTile = integer(mapXPos / 128)
  prevGroundID = -1
  cableGuyOverlay = sprite(the currentSpriteNum + 1)
  cableGuyOverlay.locZ = 1001
  CABLE.locZ = 101
  this.locZ = 102
  cableGuyBubbles = sprite(the currentSpriteNum + 2)
  cableGuyBubbles.locZ = -1002
  sharkCounter = 0
  frameDir = 1
  speechCounter = random(7)
  winchWait = 0
  oofCount = 1
  photoCounter = 0
  takingPhoto = 0
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + gXVel + gXOffset
    takingPhoto = 0
    photoFlash.blend = 0
    if keyPressed(49) and (gCoconuts > 0) then
      photoCounter = photoCounter + 1
      if photoCounter >= 10 then
        cableState = #GODOWN
        if (sound(2).member <> member(99, "Sfx")) and (gCableLength > 50) then
          puppetSound(2, member(99, "Sfx"))
          takingPhoto = 1
          gCoconuts = gCoconuts - 1
          photoFlash.blend = 100
        end if
      end if
    else
      photoCounter = 0
    end if
    case cableState of
      #GOUP:
        if not keyPressed(49) and (PrevSpacePressed = 1) then
          if winchWait < 15 then
            cableState = #GODOWN
            if gCableLength = 0 then
              if soundBusy(4) = 0 then
                puppetSound(4, member(56 + speechCounter, "Sfx"))
              end if
              speechCounter = speechCounter + 1
              if speechCounter > 7 then
                speechCounter = 1
              end if
              puppetSound(3, member(20, "Sfx"))
            end if
          end if
        end if
        if keyPressed(49) then
          PrevSpacePressed = 1
          winchWait = winchWait + 1
        else
          winchWait = 0
          PrevSpacePressed = 0
        end if
        if gCableLength > 0 then
          gCableLength = gCableLength - 2.5
          if gCableLength < 0 then
            gCableLength = 0
          end if
        else
          Xvel = 0
          Yvel = 0
        end if
      #GODOWN:
        if not keyPressed(49) and (PrevSpacePressed = 1) then
          cableState = #GOUP
          puppetSound(3, member(21, "Sfx"))
          winchWait = 0
        end if
        if gCableLength < 100 then
          gCableLength = gCableLength + 1.5
          if gCableLength > 100 then
            gCableLength = 100
          end if
        end if
    end case
    PrevSpacePressed = keyPressed(49)
    Yvel = Yvel + grav
    xx = COPTER.locH - 5 - (Xpos + Xvel)
    YY = COPTER.locV - (Ypos + Yvel)
    HH = sqrt((xx * xx) + (YY * YY))
    diff = point(xx, YY)
    diff.locH = diff.locH / float(HH)
    diff.locV = diff.locV / float(HH)
    diffLength = gCableLength - HH
    if diffLength < 0 then
      Xvel = Xvel - (diff.locH * diffLength)
      Yvel = Yvel - (diff.locV * diffLength)
    end if
    if gCableLength > 0 then
      if diffLength < -2 then
        if soundBusy(4) = 0 then
        end if
      end if
    end if
    Yvel = Yvel * 0.90000000000000002
    Xvel = Xvel * 0.92000000000000004
    Xpos = Xpos + Xvel
    Ypos = Ypos + Yvel
    this.locH = Xpos
    this.locV = Ypos
    photoFlash.loc = this.loc
    CABLE.locH = COPTER.locH - 5
    CABLE.locV = COPTER.locV
    CABLE.rotation = AngleGrind(COPTER.locH - 5, COPTER.locV, Xpos, Ypos) - 90
    xx = COPTER.locH - Xpos
    YY = COPTER.locV - Ypos
    HH = sqrt((xx * xx) + (YY * YY))
    CABLE.height = HH
    doGroundHeight1()
    if sharkCounter < 150 then
    else
      this.rotation = this.rotation * 0.97999999999999998
      thisMember = thisMember + frameDir
      if thisMember > 83 then
        thisMember = 83
        frameDir = -frameDir
      end if
      if thisMember < 74 then
        thisMember = 74
        frameDir = -frameDir
      end if
      if gLevel = 8 then
        thisMember = 198
      end if
      this.member = member(thisMember, "Gfx")
    end if
  end if
end

on doGroundHeight1
  mapXPos = mapXPos + Xvel
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
  diff = Ypos + 5 + Yvel - (280 - groundHeightLeft) + (groundDiff * localXPercent)
  if diff >= 0 then
    case tempID of
      (-1):
      0, 7:
        Yvel = Yvel - (diff * 0.01)
        Xvel = Xvel * 0.94999999999999996
        if prevGroundID = -1 then
          puppetSound(4, member(6, "Sfx"))
          cableGuyOverlay.overlayState = #StartSplash
          cableGuyOverlay.Xpos = Xpos
          cableGuyOverlay.Ypos = Ypos + Yvel
        else
          if soundBusy(4) = 0 then
            puppetSound(4, member(1, "Sfx"))
          end if
          cableGuyBubbles.locH = this.locH - 10 + random(20)
          cableGuyBubbles.locV = 280 + random(5)
          if gCableLength >= 100 then
            sharkCounter = sharkCounter + 1
          end if
        end if
      1, 5, 6:
        if (prevGroundID = -1) or (abs(Xvel) > 0.5) then
          if soundBusy(4) = 0 then
            oofCount = oofCount + 1
            if oofCount > 12 then
              oofCount = 1
            end if
            puppetSound(4, member(44 + oofCount, "Sfx"))
          end if
        end if
        Yvel = Yvel - diff
        Xvel = Xvel * 0.5
      2, 3:
        Yvel = Yvel - (diff * 0.02)
        Xvel = Xvel * 0.5
        if prevGroundID = -1 then
          puppetSound(4, member(6, "Sfx"))
          cableGuyOverlay.overlayState = #StartSplash
          cableGuyOverlay.Xpos = Xpos
          cableGuyOverlay.Ypos = Ypos + (Yvel * 2)
        else
          if soundBusy(4) = 0 then
            puppetSound(4, member(1, "Sfx"))
          end if
          cableGuyBubbles.locH = this.locH - 10 + random(20)
          cableGuyBubbles.locV = 280 + random(5)
        end if
      4:
        if prevGroundID = -1 then
          if soundBusy(4) = 0 then
            oofCount = oofCount + 1
            if oofCount > 12 then
              oofCount = 1
            end if
            puppetSound(4, member(44 + oofCount, "Sfx"))
          end if
        end if
        Yvel = Yvel - diff
        Xvel = Xvel * 0.5
    end case
    prevGroundID = tempID
  else
    case prevGroundID of
      0, 2, 3:
        if sharkCounter < 150 then
          puppetSound(4, member(4, "Sfx"))
        else
          puppetSound(1, member(17, "Sfx"))
          gGuyDoom = #SHARK
        end if
      7:
        if sharkCounter < 150 then
          puppetSound(4, member(4, "Sfx"))
        else
          puppetSound(1, member(17, "Sfx"))
          gGuyDoom = #ICECUBE
        end if
      1, 6:
        if sharkCounter < 150 then
          if soundBusy(4) = 0 then
            puppetSound(4, member(3, "Sfx"))
          end if
        end if
    end case
    prevGroundID = -1
  end if
end
