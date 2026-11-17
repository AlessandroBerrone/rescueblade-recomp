property MaxToggle, this
global gShockwave_ResolutionObj, gShockwave_ExitObj

on beginSprite
  this = sprite(the currentSpriteNum)
  MaxToggle = 0
  this.loc = point(0, the stageBottom - the stageTop)
  if voidp(gShockwave_ResolutionObj) then
    if (the environment).runMode <> "Author" then
      this.locV = -1000
    end if
  end if
  put "No Xtra found"
end

on mouseLeave
  this.flipH = 0
  this.flipV = 0
  this.blend = 100
end

on mouseWithin
  this.flipH = 0
  this.flipV = 0
  this.blend = 100
  if the mouseH <= 11 then
    if the mouseDown then
      this.blend = 70
    end if
    this.flipH = 1
    this.flipH = 1
  end if
end

on mouseUp
  if the mouseH <= 11 then
    if objectp(gShockwave_ResolutionObj) then
      gShockwave_ExitObj.mExit()
    end if
    put "CallClose"
  end if
end
