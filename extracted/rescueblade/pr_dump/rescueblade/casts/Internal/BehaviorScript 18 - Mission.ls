property this, missionState, missionCounter, tileVisitList
global gLevel, gDamagePercent, gfuelPercent, gTileIDList, gCopterTile, gGuyDoom, gScore, gTimeBonus, gPaused, gLevelScoreList, gFlyingPoints, gRescueCount, gRescuedList, gGameName, gLockOut

on beginSprite
  gLevelResult = #NULL
  this = sprite(the currentSpriteNum)
  missionState = #START
  case gLevel of
    1:
      this.member.text = "Touch down on every HeliPad" & RETURN & "and ring each Bell Buoy."
      gTimeBonus = 2200
      tileVisitList = []
      repeat with i = 1 to gTileIDList.count
        if gTileIDList[i] = 4 then
          tileVisitList.add(i)
        end if
      end repeat
    2:
      gDamagePercent = 50
      this.member.text = "Use the cable guy to grab every pickup." & RETURN & "Quickly TAP SPACEBAR to winch UP / DOWN."
      gTimeBonus = 2200
      tileVisitList = []
      repeat with i = 1 to gTileIDList.count
        if gTileIDList[i] = 4 then
          tileVisitList.add(i)
        end if
      end repeat
    3:
      this.member.text = "HOLD DOWN SPACEBAR to spray!" & RETURN & "Extinguish all" & RETURN & "burning Palm Trees!"
      gTimeBonus = 5000
    4:
      this.member.text = "Rescue all the oil rig workers!" & RETURN & "Avoid Seagulls and other aircraft."
      gTimeBonus = 5000
    5:
      this.member.text = "You are cleared for take off." & RETURN & "Hurry! They can't survive much longer!"
      gTimeBonus = 5000
    6:
      this.member.text = "Save the workers." & RETURN & "PULL UP the three fuel rods," & RETURN & "and SPRAY to cool them down!"
      gTimeBonus = 7000
    7:
      this.member.text = "Save the researchers and" & RETURN & "find a way to put out the fires!" & RETURN
      gTimeBonus = 7000
    8:
      this.member.text = "Save the sailors." & RETURN & "Unscrew the WarHeads then" & RETURN & "drop them into the ship's hold!"
      gTimeBonus = 7000
    9:
      this.member.text = EMPTY & RETURN & EMPTY & RETURN & EMPTY
      gTimeBonus = 7000
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
            temp = tileVisitList.count
            if gCopterTile <> (gTileIDList.count / 2) then
              tileVisitList.deleteOne(gCopterTile)
              if temp > tileVisitList.count then
                puppetSound(3, member(8, "Sfx"))
                gScore = gScore + 100
                gFlyingPoints = 100
              end if
            else
              if tileVisitList.count = 1 then
                tileVisitList.deleteOne(gCopterTile)
              end if
            end if
            if (tileVisitList.count = 0) and (gScore >= 500) then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "Superb piloting skills!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              gFlyingPoints = gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          2:
            if (gCopterTile = (gTileIDList.count / 2)) and ((gScore = 1264) or (gScore = 2264) or (gScore = 3264)) then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "Great winch control!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          3:
            if gRescueCount >= 5 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "Great fire fighting!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          4:
            if gRescueCount >= 7 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "You saved every single survivor!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE !"
              end if
            end if
          5:
            if gRescueCount >= 12 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "You saved every single survivor!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          6:
            if (gRescueCount >= 7) and (gRescuedList.count >= 8) then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "Incredible bravery!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          7:
            if gRescueCount >= 9 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "Nice SnowBall!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          8:
            if (gRescueCount >= 3) and (gRescuedList.count >= 9) then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "All WarHeads Disarmed!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
              end if
            end if
          9:
            if gRescueCount >= 1 then
              gLevelResult = #COMPLETE
              missionState = #COMPLETE
              this.locH = 78
              this.locV = 32
              this.member.text = "MISSION COMPLETE" & RETURN & "YES! You saved cableGuy!" & RETURN & "TRULY SUPERB FLYING!" & RETURN & "TimeBonus = " & gTimeBonus
              gScore = gScore + gTimeBonus
              puppetSound(1, member(23, "Sfx"))
              if gLevelScoreList[gLevel] < gScore then
                gLevelScoreList[gLevel] = gScore
                this.member.text = this.member.text & RETURN & "NEW HI-SCORE!"
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
          this.member.text = "MISSION FAILED" & RETURN & "Don't dunk your cableGuy!"
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
