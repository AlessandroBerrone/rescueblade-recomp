property this, thisMember, loopX, loopWidth, startMember, smokeDelay, Xpos, Ypos, flameHeightMax, thisHeight, flameState, COPTER, heightVel, hitCount, ouchCount, cableGuy, onScreen
global gTileIDList, gXOffset, gXVel, gPaused, gPloshX, gDamagePercent, gScore, gRescueCount

on beginSprite
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum - 1
  COPTER = sprite(4)
  cableGuy = sprite(6)
  Ypos = this.locV
  Xpos = this.locH
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  thisMember = 1
  smokeDelay = 0.0
  this.locZ = 103
  flameHeightMax = this.height
  thisHeight = this.height
  flameState = #FLAME
  heightVel = 0.0
  hitCount = 0
  ouchCount = 3
  onScreen = 0
  puppetSound(2, member(14, "Sfx"))
end

on exitFrame
  if gPaused = 0 then
    case flameState of
      #NULL:
        this.locV = -1000
      #FLAME:
        Xpos = Xpos + gXVel + gXOffset
        heightVel = heightVel + ((flameHeightMax - thisHeight) * 0.018)
        if Xpos > loopX then
          Xpos = Xpos - loopWidth
        end if
        if Xpos < -loopX then
          Xpos = Xpos + loopWidth
        end if
        if (Xpos > 0) and (Xpos < 512) then
          onScreen = 1
          if soundBusy(2) = 0 then
            puppetSound(2, member(14, "Sfx"))
          end if
          if gPloshX > -1 then
            xDiff = this.locH - gPloshX
            if abs(xDiff) < 100 then
              heightVel = heightVel - 6.40000000000000036
              hitCount = hitCount + 1
              gPloshX = -2
            end if
          end if
          xDiff = COPTER.locH - this.locH
          if abs(xDiff) < 80 then
            gDamagePercent = gDamagePercent + 1
            heightVel = heightVel + 2
          end if
          xDiff = cableGuy.locH - this.locH
          if abs(xDiff) < 80 then
            if soundBusy(4) = 0 then
              puppetSound(4, member(34 + ouchCount, "Sfx"))
              ouchCount = ouchCount + 1
              if ouchCount > 3 then
                ouchCount = 0
              end if
            end if
          end if
        else
          if onScreen = 1 then
            if sound(2).member = member(14, "Sfx") then
              puppetSound(2, 0)
            end if
            onScreen = 0
          end if
        end if
        heightVel = heightVel * 0.80000000000000004
        thisHeight = thisHeight + heightVel
        if (thisHeight < 40) or (hitCount >= 50) then
          flameState = #DOWSED
          gRescueCount = gRescueCount + 1
          puppetSound(4, member(8, "Sfx"))
          gScore = gScore + 500
          puppetSound(2, 0)
          if sound(3).member = member(33, "Sfx") then
            puppetSound(3, 0)
          end if
          gPloshX = -1
        end if
        smokeDelay = smokeDelay + 1.5
        if smokeDelay >= 2 then
          smokeDelay = 0
          thisMember = thisMember + 1
          if thisMember > 10 then
            thisMember = 1
          end if
        end if
        this.member = member(startMember + thisMember, "Gfx")
        this.locH = Xpos
        this.locV = Ypos
        this.height = thisHeight
      #DOWSED:
        Xpos = Xpos + gXVel + gXOffset
        heightVel = heightVel + ((flameHeightMax - thisHeight) * 0.018)
        if Xpos > (gTileIDList.count * 128 * 0.5) then
          Xpos = Xpos - (gTileIDList.count * 128)
        end if
        if Xpos < (-gTileIDList.count * 128 * 0.5) then
          Xpos = Xpos + (gTileIDList.count * 128)
        end if
        smokeDelay = smokeDelay + 1.5
        if smokeDelay >= 2 then
          smokeDelay = 0
          thisMember = thisMember + 1
          if thisMember > 10 then
            thisMember = 1
          end if
        end if
        thisHeight = thisHeight - 1
        if thisHeight <= 2 then
          flameState = #NULL
        end if
        this.member = member(startMember + thisMember, "Gfx")
        this.locH = Xpos
        this.locV = Ypos
        this.height = thisHeight
    end case
  end if
end
