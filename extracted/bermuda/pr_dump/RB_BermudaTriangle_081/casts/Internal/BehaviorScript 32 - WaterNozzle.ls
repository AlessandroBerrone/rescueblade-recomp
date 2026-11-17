property this, COPTER, nozzleAngle, PrevSpacePressed, ploshDelay, radians, sprayWait, prevgWaterFlow, cableGuy
global gPaused, gWaterFlow, gPloshList, gPloshX, gCoconuts, gCoconutList

on beginSprite
  this = sprite(the currentSpriteNum)
  radians = float(PI / 180)
  cableGuy = sprite(6)
  COPTER = sprite(4)
  nozzleAngle = 0
  this.locZ = 99
  prevgWaterFlow = 0
  ploshDelay = float(3)
  sprayWait = 0
end

on exitFrame
  if gPaused = 0 then
    gPloshX = -1
    if keyPressed(123) then
      nozzleAngle = nozzleAngle + 6
    end if
    if keyPressed(124) then
      nozzleAngle = nozzleAngle - 6
    end if
    if keyPressed(49) then
      if prevgWaterFlow = 0 then
        if sprayWait >= 15 then
          if gCoconuts = 0 then
            puppetSound(3, member(33, "Sfx"))
          end if
          gWaterFlow = 1
          cableGuy.cableState = #GOUP
        else
          sprayWait = sprayWait + 1
        end if
      end if
    else
      sprayWait = 0
      gWaterFlow = 0
      if prevgWaterFlow = 1 then
        if sound(3).member = member(33, "Sfx") then
          puppetSound(3, 0)
        end if
        PrevSpacePressed = 0
      end if
    end if
    prevgWaterFlow = gWaterFlow
    nozzleAngle = nozzleAngle * 0.94999999999999996
    this.rotation = nozzleAngle
    this.locH = COPTER.locH
    this.locV = COPTER.locV + 10
    if gWaterFlow = 1 then
      if gCoconuts > 0 then
        ploshDelay = ploshDelay + 0.20000000000000001
      else
        ploshDelay = ploshDelay + 1
      end if
      if ploshDelay >= 3 then
        if gPloshList.count > 0 then
          if gCoconuts > 0 then
            gCoconuts = gCoconuts - 1
            gPloshList[1].rotation = 0
            gPloshList[1].member = member(200, "Gfx")
            gPloshList[1].width = gPloshList[1].member.width
            gPloshList[1].height = gPloshList[1].member.height
            gCoconutList.add(gPloshList[1])
            puppetSound(3, member(71, "Sfx"))
          else
            if sound(3).member <> member(33, "Sfx") then
              puppetSound(3, member(33, "Sfx"))
            end if
            gPloshList[1].member = member(126, "Gfx")
          end if
          gPloshList[1].ploshState = #PLOSH
          gPloshList[1].Xvel = 8 * sin(-nozzleAngle * radians)
          gPloshList[1].Yvel = 8 * cos(-nozzleAngle * radians)
          gPloshList[1].Xpos = this.locH
          gPloshList[1].Ypos = this.locV
          gPloshList[1].rotation = nozzleAngle
          gPloshList.deleteAt(1)
        end if
        ploshDelay = 0
      end if
    else
      ploshDelay = 3
    end if
  end if
end
