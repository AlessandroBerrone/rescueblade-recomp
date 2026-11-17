property this, scoreList, lockFlash, lockOutFlashCount1, lockOutFlashCount2
global gLevelScoreList, gScoreTotal, gLockOut

on beginSprite
  this = sprite(the currentSpriteNum)
  scoreList = []
  gScoreTotal = 0
  repeat with i = 1 to 9
    gScoreTotal = gScoreTotal + gLevelScoreList[i]
    calcScore = gLevelScoreList[i]
    tempString = EMPTY
    repeat with j = 7 down to 1
      temp = calcScore mod power(10, j - 1)
      temp1 = (calcScore - temp) / power(10, j - 1)
      calcScore = temp
      tempString = tempString & string(integer(temp1))
    end repeat
    scoreList.add(tempString)
  end repeat
  calcScore = gScoreTotal
  tempString = EMPTY
  repeat with j = 7 down to 1
    temp = calcScore mod power(10, j - 1)
    temp1 = (calcScore - temp) / power(10, j - 1)
    calcScore = temp
    tempString = tempString & string(integer(temp1))
  end repeat
  scoreList.add(tempString)
  this.member.text = scoreList[1] & RETURN & scoreList[2] & RETURN & scoreList[3] & RETURN & RETURN & scoreList[4] & RETURN & scoreList[5] & RETURN & scoreList[6] & RETURN & RETURN & scoreList[7] & RETURN & scoreList[8] & RETURN & scoreList[9] & RETURN & RETURN & scoreList[10]
  member("SubmitScore", "Gfx").text = string(gScoreTotal)
  if gLevelScoreList[1] and gLevelScoreList[2] and gLevelScoreList[3] then
    if gLockOut = "0" then
      gLockOut = "1"
    end if
  end if
  if gLevelScoreList[4] and gLevelScoreList[5] and gLevelScoreList[6] then
    if gLockOut = "1" then
      gLockOut = "2"
    end if
  end if
  if (the environment).runMode = "Author" then
    gLockOut = "2"
  end if
  case gLockOut of
    "0":
    "1":
      sprite(19).locV = -1000
    "2":
      sprite(19).locV = -1000
      sprite(20).locV = -1000
  end case
  lockOutFlashCount2 = 0
  lockOutFlashCount1 = 0
end

on exitFrame
  if (sprite(19).blend = 0) and (lockOutFlashCount1 = 0) then
    lockOutFlashCount1 = 10
  end if
  if lockOutFlashCount1 > 0 then
    sprite(19).blend = 100 * (lockOutFlashCount1 mod 2)
    lockOutFlashCount1 = lockOutFlashCount1 - 1
  end if
  if (sprite(20).blend = 0) and (lockOutFlashCount2 = 0) then
    lockOutFlashCount2 = 10
  end if
  if lockOutFlashCount2 > 0 then
    sprite(20).blend = 100 * (lockOutFlashCount2 mod 2)
    lockOutFlashCount2 = lockOutFlashCount2 - 1
  end if
end
