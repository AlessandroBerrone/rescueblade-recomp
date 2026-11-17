property this, Xpos, leftLoopX, rightLoopX, loopWidth, ThisWidth, thisHalfWidth, TR, TL, BR, BL, calc, thisMember, thisTileID, tileIDListPointer, leftHeight, rightHeight, tileHeightListPointer, Scenery, SceneryID, sceneryMember, thisPickup
global gXVel, gCurrentLevel, gTileIDList, gTileHeightList, gSeaFrame, gXOffset, gPaused, gSceneryList, gPickupList

on beginSprite
  this = sprite(the currentSpriteNum)
  rightLoopX = 512 + (this.width / 2)
  leftLoopX = -this.width / 2
  loopWidth = 512 + this.width
  Xpos = float(this.locH)
  ThisWidth = this.width
  thisHalfWidth = this.width / 2
  TR = point(0.0, 280.0)
  TL = point(0.0, 280.0)
  BR = point(0.0, 330.0)
  BL = point(0.0, 330.0)
  calc = 0.0
  thisMember = 1
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
  Scenery = sprite(the currentSpriteNum + 5)
  SceneryID = 0
  Scenery.locV = 280 - ((leftHeight - rightHeight) * 0.5)
  this.locZ = 1000
  Scenery.locZ = 50
  thisPickup = 0
  doQuadsStart()
  doQuadsNear()
end

on exitFrame
  if gPaused = 0 then
    doQuadsNear()
  end if
end

on doQuadsNear
  Xpos = Xpos + gXVel + gXOffset
  if integer(Xpos) > rightLoopX then
    Xpos = Xpos - loopWidth
    tileIDListPointer = tileIDListPointer - 5
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
    Scenery.locV = 280 - leftHeight + ((leftHeight - rightHeight) * 0.5)
    SceneryID = gSceneryList[tileIDListPointer]
    if thisPickup <> 0 then
      thisPickup.pickupState = #NULL
      gPickupList.add(thisPickup)
      thisPickup = 0
    end if
    case SceneryID of
      4:
        thisPickup = gPickupList[1]
        gPickupList.deleteAt(1)
        thisPickup.pickupID = #TREASURE
        thisPickup.pickupState = #ONGROUND
        thisPickup.member = member(84, "Gfx")
        thisPickup.pickupTile = tileIDListPointer
        thisPickup.pickupMaster = this
      5:
        thisPickup = gPickupList[1]
        gPickupList.deleteAt(1)
        thisPickup.pickupID = #FUEL
        thisPickup.pickupState = #ONGROUND
        thisPickup.member = member(85, "Gfx")
        thisPickup.pickupTile = tileIDListPointer
        thisPickup.pickupMaster = this
      6:
        thisPickup = gPickupList[1]
        gPickupList.deleteAt(1)
        thisPickup.pickupID = #TOOLS
        thisPickup.pickupState = #ONGROUND
        thisPickup.member = member(86, "Gfx")
        thisPickup.pickupTile = tileIDListPointer
        thisPickup.pickupMaster = this
    end case
  end if
  if integer(Xpos) < leftLoopX then
    Xpos = Xpos + loopWidth
    tileIDListPointer = tileIDListPointer + 5
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
    Scenery.locV = 280 - leftHeight + ((leftHeight - rightHeight) * 0.5)
    SceneryID = gSceneryList[tileIDListPointer]
    if thisPickup <> 0 then
      thisPickup.pickupState = #NULL
      gPickupList.add(thisPickup)
      thisPickup = 0
    end if
    case SceneryID of
      4:
        thisPickup = gPickupList[1]
        gPickupList.deleteAt(1)
        thisPickup.pickupID = #TREASURE
        thisPickup.pickupState = #ONGROUND
        thisPickup.member = member(84, "Gfx")
        thisPickup.pickupTile = tileIDListPointer
        thisPickup.pickupMaster = this
      5:
        thisPickup = gPickupList[1]
        gPickupList.deleteAt(1)
        thisPickup.pickupID = #FUEL
        thisPickup.pickupState = #ONGROUND
        thisPickup.member = member(85, "Gfx")
        thisPickup.pickupTile = tileIDListPointer
        thisPickup.pickupMaster = this
      6:
        thisPickup = gPickupList[1]
        gPickupList.deleteAt(1)
        thisPickup.pickupID = #TOOLS
        thisPickup.pickupState = #ONGROUND
        thisPickup.member = member(86, "Gfx")
        thisPickup.pickupTile = tileIDListPointer
        thisPickup.pickupMaster = this
    end case
  end if
  this.locH = Xpos
  tileHeightListPointer = tileIDListPointer + 1
  if tileHeightListPointer > gTileHeightList.count then
    tileHeightListPointer = tileHeightListPointer - gTileHeightList.count
  end if
  leftHeight = gTileHeightList[tileIDListPointer]
  rightHeight = gTileHeightList[tileHeightListPointer]
  TL.locH = integer(Xpos - thisHalfWidth)
  TL.locV = integer(280 - leftHeight)
  TR.locH = integer(Xpos + thisHalfWidth)
  TR.locV = integer(280 - rightHeight)
  calc = integer((Xpos - thisHalfWidth - 256) * 1)
  BL.locH = integer(Xpos - thisHalfWidth + calc)
  calc = integer((Xpos + thisHalfWidth - 256) * 1)
  BR.locH = integer(Xpos + thisHalfWidth + calc)
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
      thisMember = 64
    5:
      thisMember = 66
    6:
      thisMember = 68
    7:
      thisMember = 70
    8:
      thisMember = 69
  end case
  this.member = member(thisMember, "Tiles")
  case SceneryID of
    0:
      sceneryMember = 68
    1:
      sceneryMember = 69
    2:
      sceneryMember = 70
    3:
      sceneryMember = 71
    4:
      sceneryMember = 68
    5:
      sceneryMember = 68
    6:
      sceneryMember = 68
    7:
      sceneryMember = 139
    8:
      sceneryMember = 148
    9:
      sceneryMember = 153
    10:
      sceneryMember = 156
    11:
      sceneryMember = 188
  end case
  Scenery.member = member(sceneryMember, "Gfx")
  Scenery.locH = this.locH
  if thisPickup <> 0 then
    thisPickup.loc = Scenery.loc
  end if
end

on doQuadsStart
  thisTileID = gTileIDList[tileIDListPointer]
  tileHeightListPointer = tileIDListPointer + 1
  if tileHeightListPointer > gTileHeightList.count then
    tileHeightListPointer = tileHeightListPointer - gTileHeightList.count
  end if
  leftHeight = gTileHeightList[tileIDListPointer]
  rightHeight = gTileHeightList[tileHeightListPointer]
  Scenery.locV = 280 - leftHeight + ((leftHeight - rightHeight) * 0.5)
  SceneryID = gSceneryList[tileIDListPointer]
  if thisPickup <> 0 then
    thisPickup.pickupState = #NULL
    gPickupList.add(thisPickup)
    thisPickup = 0
  end if
  case SceneryID of
    4:
      thisPickup = gPickupList[1]
      gPickupList.deleteAt(1)
      thisPickup.pickupID = #TREASURE
      thisPickup.pickupState = #ONGROUND
      thisPickup.member = member(84, "Gfx")
      thisPickup.pickupTile = tileIDListPointer
      thisPickup.pickupMaster = this
    5:
      thisPickup = gPickupList[1]
      gPickupList.deleteAt(1)
      thisPickup.pickupID = #FUEL
      thisPickup.pickupState = #ONGROUND
      thisPickup.member = member(85, "Gfx")
      thisPickup.pickupTile = tileIDListPointer
      thisPickup.pickupMaster = this
    6:
      thisPickup = gPickupList[1]
      gPickupList.deleteAt(1)
      thisPickup.pickupID = #TOOLS
      thisPickup.pickupState = #ONGROUND
      thisPickup.member = member(86, "Gfx")
      thisPickup.pickupTile = tileIDListPointer
      thisPickup.pickupMaster = this
  end case
end
