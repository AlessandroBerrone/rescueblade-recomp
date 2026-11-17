property this, missionState, missionCounter, tileVisitList
global gLevel, gDamagePercent, gfuelPercent, gTileIDList, gCopterTile, gGuyDoom, gScore, gTimeBonus, gPaused, gLevelScoreList, gFlyingPoints, gRescueCount, gRescuedList, gGameName, gLockOut, gCoconuts

on beginSprite
  gLevelResult = #NULL
  this = sprite(the currentSpriteNum)
  missionState = #START
  case gLevel of
    1:
      this.member.text = "Rescue all holiday guests!" & RETURN & "Avoid debris and hazards at all costs."
      gTimeBonus = 2200
      tileVisitList = []
      puppetSound(3, member(76, "Sfx"))
      repeat with i = 1 to gTileIDList.count
        if gTileIDList[i] = 4 then
          tileVisitList.add(i)
        end if
      end repeat
    2:
      this.member.text = "Fight off the UFOs." & RETURN & "Rescue all the guests" & RETURN & "and return them to the hotel!"
      gTimeBonus = 8000
      tileVisitList = []
      repeat with i = 1 to gTileIDList.count
        if gTileIDList[i] = 4 then
          tileVisitList.add(i)
        end if
      end repeat
    3:
      this.member.text = "Save all survivors." & RETURN & "Try to get rid of the Bodzillas!"
      gTimeBonus = 9000
    4:
      this.member.text = "Grab as much sunken treasure as you can!" & RETURN & "HOLD SPACEBAR to snap the plane wrecks!"
      gTimeBonus = 9000
      gCoconuts = 12
  end case
  this.locZ = 2100
  this.blend = 0
  missionCounter = 0
end

on exitFrame
  if gPaused = 0 then
    case missionState of
      #START:
        if keyPressed(126) then
          missionState = #STARTFADEOUT
        end if
        if this.blend < 100 then
          this.blend = this.blend + 5
        end if
      #STARTFADEOUT:
        this.blend = this.blend - 5
        if this.blend = 0 then
          this.locH = -1000
          this.locV = -1000
          missionState = #RUNNING
        end if
      #RUNNING:
        if gTimeBonus > 0 then
          gTimeBonus = gTimeBonus - 1
        end if
        case gLevel of
          1:
            if gRescueCount >= 9 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "You saved all the guests!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              gFlyingPoints = gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          2:
            if gRescueCount >= 16 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "Alien Invaders Repelled! " & RETURN & " TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          3:
            if gRescueCount >= 36 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "Brilliant Bodzilla Bonking! " & RETURN & " TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          4:
            if gRescueCount >= 9 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "cableGuy has ample holiday cash to splash!" & RETURN & "Superb submarine skill skipper!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE !"
              end if
            end if
        end case
        if gDamagePercent >= 100 then
          gLevelResult = #DAMAGE
          missionState = #FAILED
          this.locH = 78
          this.locV = 32
          this.member.text = "MISSION FAILED" & RETURN & "EXTREME DAMAGE!"
          puppetSound(1, member(24, "Sfx"))
          puppetSound(4, member(84, "Sfx"))
        end if
        if gfuelPercent <= 0 then
          gLevelResult = #FUEL
          missionState = #FAILED
          this.locH = 78
          this.locV = 32
          this.member.text = "MISSION FAILED" & RETURN & "OUT OF FUEL!"
          puppetSound(1, member(24, "Sfx"))
        end if
        if gGuyDoom = #SHARK then
          gLevelResult = #SHARK
          missionState = #FAILED
          this.locH = 78
          this.locV = 32
          this.member.text = "MISSION FAILED" & RETURN & "A blue Marlin ate cableGuy!" & RETURN & "(Nice catch though)"
        end if
        if gGuyDoom = #ICECUBE then
          gLevelResult = #ICECUBE
          missionState = #FAILED
          this.locH = 78
          this.locV = 32
          this.member.text = "MISSION FAILED" & RETURN & "You froze your cableGuy!"
        end if
      #FAILED:
        if this.blend < 100 then
          this.blend = this.blend + 5
        end if
        missionCounter = missionCounter + 1
        if missionCounter >= 200 then
          puppetSound(1, 0)
          puppetSound(2, 0)
          puppetSound(3, 0)
          puppetSound(4, 0)
          go(the frame - 1)
        end if
      #COMPLETE:
        if this.blend < 100 then
          this.blend = this.blend + 5
        end if
        missionCounter = missionCounter + 1
        if missionCounter >= 180 then
          if gLevelScoreList[1] and gLevelScoreList[2] and gLevelScoreList[3] then
            if gLockOut = "0" then
              gLockOut = "1"
              setPref(gGameName, gLockOut)
            end if
          end if
          if gLevelScoreList[4] and gLevelScoreList[5] and gLevelScoreList[6] then
            if gLockOut = "1" then
              gLockOut = "2"
              setPref(gGameName, gLockOut)
            end if
          end if
          gLevel = gLevel + 1
          puppetSound(1, 0)
          puppetSound(2, 0)
          puppetSound(3, 0)
          puppetSound(4, 0)
          go("MenuScreen")
        end if
    end case
  end if
end
