global gCurrentLevel, gTileIDList, gTileHeightList, gSceneryList, gLevel, gLevelResult, gLevelScoreList, gScoreTotal, gFirstTime, gLockOut, gGameName

on startMovie
  if gFirstTime = VOID then
    gFirstTime = 1
    gGameName = "RBlade2"
    gCurrentLevel = 1
    gTileIDList = []
    gTileHeightList = []
    gSceneryList = []
    gLevel = 1
    gLevelResult = #NULL
    gLevelScoreList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    gScoreTotal = 0
    gLockOut = 0
    gLockOut = getPref(gGameName)
    if gLockOut = VOID then
      gLockOut = "0"
      setPref(gGameName, gLockOut)
    end if
    if (the environment).runMode <> "Author" then
      the allowSaveLocal = 0
      if not validDomain() then
        go("stolen")
      end if
    end if
  else
    go("MenuScreen")
  end if
end

on validDomain
  if externalParamValue("src") starts "http:" then
    return 0
  end if
  validDomains = ["shockwave.com", "sticky3d.com"]
  repeat with sDomain in validDomains
    if the moviePath contains sDomain then
      return 1
    end if
  end repeat
  return 0
end

on AngleGrind OriginX, OriginY, TargetX, TargetY
  radians = float(180 / PI)
  Grind = float(0)
  X = float(TargetX) - float(OriginX)
  Y = float(TargetY) - float(OriginY)
  if (X = 0) and (Y = 0) then
    Grind = 0
  end if
  if (X = 0) or (Y = 0) then
    if (X = 0) and (Y < 0) then
      Grind = 270
    end if
    if (X = 0) and (Y > 0) then
      Grind = 90
    end if
    if (Y = 0) and (X > 0) then
      Grind = 0
    end if
    if (Y = 0) and (X < 0) then
      Grind = 180
    end if
  end if
  if (X <> 0) and (Y <> float(0)) then
    if X > 0 then
      Grind = atan(Y / X) * radians
    end if
    if X < 0 then
      Grind = 180 + (atan(Y / X) * radians)
    end if
    if Grind < 0 then
      Grind = Grind + 360
    end if
  end if
  return Grind
end
