property this, Xpos, leftLoopX, rightLoopX, loopWidth, ThisWidth, thisHalfWidth, TR, TL, BR, BL, calc, thisMember, delayCount, tileIDListPointer, thisTileID, leftHeight, rightHeight
global gXVel, gTileIDList, gTileHeightList, gSeaFrame, gXOffset, gPaused

on beginSprite
  this = sprite(the currentSpriteNum)
  rightLoopX = 256 + (this.width * 4.5)
  leftLoopX = 256 - (this.width * 4.5)
  loopWidth = 512 + (this.width * 5)
  Xpos = float(this.locH)
  ThisWidth = this.width
  thisHalfWidth = this.width / 2
  TR = point(0.0, 256.0)
  TL = point(0.0, 256.0)
  BR = point(0.0, 280.0)
  BL = point(0.0, 280.0)
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
  if tileHeightListPointer > gTileHeightList.count then
    tileHeightListPointer = tileHeightListPointer - gTileHeightList.count
  end if
  leftHeight = gTileHeightList[tileIDListPointer]
  rightHeight = gTileHeightList[tileHeightListPointer]
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
      if tileHeightListPointer > gTileHeightList.count then
        tileHeightListPointer = tileHeightListPointer - gTileHeightList.count
      end if
      leftHeight = gTileHeightList[tileIDListPointer]
      rightHeight = gTileHeightList[tileHeightListPointer]
    end if
    if integer(Xpos) < leftLoopX then
      Xpos = Xpos + loopWidth
      tileIDListPointer = tileIDListPointer + 9
      if tileIDListPointer > gTileIDList.count then
        tileIDListPointer = tileIDListPointer - gTileIDList.count
      end if
      thisTileID = gTileIDList[tileIDListPointer]
      tileHeightListPointer = tileIDListPointer + 1
      if tileHeightListPointer > gTileHeightList.count then
        tileHeightListPointer = tileHeightListPointer - gTileHeightList.count
      end if
      leftHeight = gTileHeightList[tileIDListPointer]
      rightHeight = gTileHeightList[tileHeightListPointer]
    end if
    this.locH = Xpos
    tileHeightListPointer = tileIDListPointer + 1
    if tileHeightListPointer > gTileHeightList.count then
      tileHeightListPointer = tileHeightListPointer - gTileHeightList.count
    end if
    leftHeight = gTileHeightList[tileIDListPointer]
    rightHeight = gTileHeightList[tileHeightListPointer]
    calc = (256 - (Xpos - thisHalfWidth)) * 0.5
    TL.locH = integer(Xpos - thisHalfWidth + calc)
    calc = (256 - (Xpos + thisHalfWidth)) * 0.5
    TR.locH = integer(Xpos + thisHalfWidth + calc)
    BL.locH = integer(Xpos - thisHalfWidth)
    BL.locV = integer(280 - leftHeight)
    BR.locH = integer(Xpos + thisHalfWidth)
    BR.locV = integer(280 - rightHeight)
    this.quad = [TL, TR, BR, BL]
    case thisTileID of
      0:
        thisMember = gSeaFrame
      1:
        thisMember = 23
      2:
        thisMember = 23 + gSeaFrame
      3:
        thisMember = 43 + gSeaFrame
      4:
        thisMember = 65
      5:
        thisMember = 67
      6:
        thisMember = 68
      7:
        thisMember = 69
      8:
        thisMember = 70
    end case
    this.member = member(thisMember, "Tiles")
  end if
end
