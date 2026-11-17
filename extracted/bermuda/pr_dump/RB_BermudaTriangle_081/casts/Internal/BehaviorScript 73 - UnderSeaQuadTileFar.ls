property this, Xpos, leftLoopX, rightLoopX, loopWidth, ThisWidth, thisHalfWidth, TR, TL, BR, BL, calc, thisMember, delayCount, tileIDListPointer, thisTileID, leftHeight, rightHeight
global gXVel, gTileIDList, gTileHeightList, gSeaFrame, gXOffset, gPaused, gUnderSeaHeightList

on beginSprite
  this = sprite(the currentSpriteNum)
  gUnderSeaHeightList = gTileHeightList.duplicate()
  rightLoopX = 256 + (this.width * 4.5)
  leftLoopX = 256 - (this.width * 4.5)
  loopWidth = 512 + (this.width * 5)
  Xpos = float(this.locH)
  ThisWidth = this.width
  thisHalfWidth = this.width / 2
  TR = point(0.0, 80.0)
  TL = point(0.0, 80.0)
  BR = point(0.0, -10.0)
  BL = point(0.0, -10.0)
  calc = 0.0
  thisMember = 1
  sprite(this).locZ = 2
  if Xpos > (256 - 64) then
    calc = Xpos
    calc = calc - 256 - 64 + (this.width / 2)
    tileIDListPointer = (gTileIDList.count / 2) + integer(calc / 128.0)
    thisTileID = gTileIDList[tileIDListPointer]
  else
    calc = Xpos
    calc = calc - 256 - 64 + (this.width / 2)
    tileIDListPointer = (gTileIDList.count / 2) + integer(calc / 128.0)
    thisTileID = gTileIDList[tileIDListPointer]
  end if
  tileHeightListPointer = tileIDListPointer + 1
  if tileHeightListPointer > gUnderSeaHeightList.count then
    tileHeightListPointer = tileHeightListPointer - gUnderSeaHeightList.count
  end if
  leftHeight = gUnderSeaHeightList[tileIDListPointer]
  rightHeight = gUnderSeaHeightList[tileHeightListPointer]
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + gXVel + gXOffset
    if integer(Xpos) > rightLoopX then
      Xpos = Xpos - loopWidth
      tileIDListPointer = tileIDListPointer - 9
      if tileIDListPointer < 1 then
        tileIDListPointer = tileIDListPointer + gTileIDList.count
      end if
      thisTileID = gTileIDList[tileIDListPointer]
      tileHeightListPointer = tileIDListPointer + 1
      if tileHeightListPointer > gUnderSeaHeightList.count then
        tileHeightListPointer = tileHeightListPointer - gUnderSeaHeightList.count
      end if
      leftHeight = gUnderSeaHeightList[tileIDListPointer]
      rightHeight = gUnderSeaHeightList[tileHeightListPointer]
    end if
    if integer(Xpos) < leftLoopX then
      Xpos = Xpos + loopWidth
      tileIDListPointer = tileIDListPointer + 9
      if tileIDListPointer > gTileIDList.count then
        tileIDListPointer = tileIDListPointer - gTileIDList.count
      end if
      thisTileID = gTileIDList[tileIDListPointer]
      tileHeightListPointer = tileIDListPointer + 1
      if tileHeightListPointer > gUnderSeaHeightList.count then
        tileHeightListPointer = tileHeightListPointer - gUnderSeaHeightList.count
      end if
      leftHeight = gUnderSeaHeightList[tileIDListPointer]
      rightHeight = gUnderSeaHeightList[tileHeightListPointer]
    end if
    this.locH = Xpos
    tileHeightListPointer = tileIDListPointer + 1
    if tileHeightListPointer > gUnderSeaHeightList.count then
      tileHeightListPointer = tileHeightListPointer - gUnderSeaHeightList.count
    end if
    leftHeight = gUnderSeaHeightList[tileIDListPointer]
    rightHeight = gUnderSeaHeightList[tileHeightListPointer]
    calc = (256 - (Xpos - thisHalfWidth)) * 0.5
    TL.locH = integer(Xpos - thisHalfWidth + calc)
    calc = (256 - (Xpos + thisHalfWidth)) * 0.5
    TR.locH = integer(Xpos + thisHalfWidth + calc)
    BL.locH = integer(Xpos - thisHalfWidth)
    TL.locV = integer(80 - (leftHeight * 0.20000000000000001))
    BR.locH = integer(Xpos + thisHalfWidth)
    TR.locV = integer(80 - (rightHeight * 0.20000000000000001))
    BL.locV = integer(-20 - leftHeight)
    BR.locV = integer(-20 - rightHeight)
    this.quad = [TL, TR, BR, BL]
    thisMember = gSeaFrame
    this.member = member(thisMember, "Tiles")
  end if
end
