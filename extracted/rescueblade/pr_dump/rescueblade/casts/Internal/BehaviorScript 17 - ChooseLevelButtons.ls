property thisNum, this
global gLevel, gLockOut

on beginSprite
  this = sprite(the currentSpriteNum)
  thisNum = the currentSpriteNum
  this.blend = 50
  this.locZ = the currentSpriteNum
end

on exitFrame
  if thisNum = the rollover then
    this.blend = 100
  else
    this.blend = 50
  end if
end

on mouseUp
  case thisNum of
    8:
      gLevel = 1
      go("Level" & gLevel)
      puppetSound(2, member(12, "Sfx"))
    9:
      gLevel = 2
      go("Level" & gLevel)
      puppetSound(2, member(12, "Sfx"))
    10:
      gLevel = 3
      go("Level" & gLevel)
      puppetSound(2, member(12, "Sfx"))
    11:
      if integer(gLockOut) > 0 then
        gLevel = 4
        go("Level" & gLevel)
        puppetSound(2, member(12, "Sfx"))
      else
        puppetSound(2, member(13, "Sfx"))
        sprite(19).blend = 0
      end if
    12:
      if integer(gLockOut) > 0 then
        gLevel = 5
        go("Level" & gLevel)
        puppetSound(2, member(12, "Sfx"))
      else
        puppetSound(2, member(13, "Sfx"))
        sprite(19).blend = 0
      end if
    13:
      if integer(gLockOut) > 0 then
        gLevel = 6
        go("Level" & gLevel)
        puppetSound(2, member(12, "Sfx"))
      else
        puppetSound(2, member(13, "Sfx"))
        sprite(19).blend = 0
      end if
    14:
      if integer(gLockOut) > 1 then
        gLevel = 7
        go("Level" & gLevel)
        puppetSound(2, member(12, "Sfx"))
      else
        puppetSound(2, member(13, "Sfx"))
        sprite(20).blend = 0
      end if
    15:
      if integer(gLockOut) > 1 then
        gLevel = 8
        go("Level" & gLevel)
        puppetSound(2, member(12, "Sfx"))
      else
        puppetSound(2, member(13, "Sfx"))
        sprite(20).blend = 0
      end if
    16:
      if integer(gLockOut) > 1 then
        gLevel = 9
        go("Level" & gLevel)
        puppetSound(2, member(12, "Sfx"))
      else
        puppetSound(2, member(13, "Sfx"))
        sprite(20).blend = 0
      end if
  end case
end
