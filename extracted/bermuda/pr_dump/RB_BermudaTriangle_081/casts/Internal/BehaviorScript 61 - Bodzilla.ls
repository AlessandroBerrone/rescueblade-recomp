property radians, Body, ArmBack, ArmFront, Head, Tail, bodzillaState, Xpos, Ypos, loopX, loopWidth, Xvel, ArmBackOffset, ArmFrontOffset, HeadOffset, tailOffset, counter, waggleList, waggleListPointer1, waggleListPointer2, cableGuy, bodzillaScale, BONK, Sink, fireBall, COPTER
global gPaused, gXVel, gXOffset, gTileIDList, gCoconutList, gRescueCount, gScore, gPloshX

on getPropertyDescriptionList me
  descriptionList = [:]
  addProp(descriptionList, #bodzillaScale, [#default: 1, #format: #float, #comment: "Bodzilla Scale Decimal Fraction"])
  return descriptionList
end

on beginSprite
  radians = float(PI / 180)
  fireBall = sprite(the currentSpriteNum - 2)
  COPTER = sprite(4)
  cableGuy = sprite(6)
  ArmBack = sprite(the currentSpriteNum - 1)
  Body = sprite(the currentSpriteNum)
  ArmFront = sprite(the currentSpriteNum + 1)
  Head = sprite(the currentSpriteNum + 2)
  Tail = sprite(the currentSpriteNum + 3)
  ArmBack.locZ = 946
  Body.locZ = 947
  ArmFront.locZ = 948
  Head.locZ = 949
  Tail.locZ = 949
  Body.width = Body.width * bodzillaScale
  Body.height = Body.height * bodzillaScale
  ArmBack.width = ArmBack.width * bodzillaScale
  ArmBack.height = ArmBack.height * bodzillaScale
  ArmFront.width = ArmFront.width * bodzillaScale
  ArmFront.height = ArmFront.height * bodzillaScale
  Head.width = Head.member.width * bodzillaScale
  Head.height = Head.member.height * bodzillaScale
  Tail.width = Tail.width * bodzillaScale
  Tail.height = Tail.height * bodzillaScale
  loopX = gTileIDList.count * 128 * 0.5
  loopWidth = gTileIDList.count * 128
  Xpos = Body.locH
  Ypos = Body.locV
  bodzillaState = #STAND
  Xvel = 0
  counter = 0
  BONK = 0
  Sink = 0
  ArmBackOffset = point(15, 90) * bodzillaScale
  ArmFrontOffset = point(-14, 85) * bodzillaScale
  HeadOffset = point(-2, 131) * bodzillaScale
  tailOffset = point(-81, 9) * bodzillaScale
  waggleList = []
  Body.locH = Xpos
  Body.locV = Ypos
  ArmBack.loc = Body.loc - ArmBackOffset
  ArmFront.loc = Body.loc - ArmFrontOffset
  Head.loc = Body.loc - HeadOffset
  Tail.loc = Body.loc - tailOffset
  repeat with i = 1 to 180
    waggleList.add((20 * cos(i * 2 * radians)) + 20)
  end repeat
  waggleListPointer1 = 1
  waggleListPointer2 = waggleList.count * 0.5
end

on exitFrame
  if gPaused = 0 then
    Xpos = Xpos + Xvel + gXVel + gXOffset
    if Xpos > loopX then
      Xpos = Xpos - loopWidth
    end if
    if Xpos < -loopX then
      Xpos = Xpos + loopWidth
    end if
    if (Xpos > -100) and (Xpos < 612) then
      waggleListPointer1 = waggleListPointer1 + 1
      waggleListPointer2 = waggleListPointer2 + 1
      if waggleListPointer1 > waggleList.count then
        waggleListPointer1 = 1
      end if
      if waggleListPointer2 > waggleList.count then
        waggleListPointer2 = 1
      end if
      ArmFront.rotation = waggleList[waggleListPointer1]
      ArmBack.rotation = waggleList[waggleListPointer2]
      case bodzillaState of
        #STAND:
          counter = counter + 1
          if (counter * bodzillaScale) > 50 then
            bodzillaState = #INHALE
            counter = 0
            puppetSound(4, member(84, "Sfx"))
          end if
          xDiff = float(Head.locH - cableGuy.locH)
          yDiff = float(Head.locV - cableGuy.locV)
          Dist = sqrt((xDiff * xDiff) + (yDiff * yDiff))
          if Dist < (120 * bodzillaScale) then
            bodzillaState = #OPENWIDE
            puppetSound(4, member(77, "Sfx"))
          end if
          toGuy = AngleGrind(Head.locH, Head.locV, cableGuy.locH, cableGuy.locV + 8)
          if (toGuy < 90) or (toGuy > 270) then
            Head.rotation = toGuy
            Head.flipH = 1
          else
            Head.rotation = toGuy + 180
            Head.flipH = 0
          end if
          if gPloshX <> -1 then
            if (abs(gPloshX - Head.locH) < (50 * bodzillaScale)) and (xDiff < (250 * bodzillaScale)) then
              bodzillaState = #GARGLE
              if bodzillaScale <= 0.5 then
                puppetSound(4, member(87, "Sfx"))
              else
                puppetSound(4, member(86, "Sfx"))
              end if
              counter = 0
            end if
          end if
          Head.memberNum = 195
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
        #OPENWIDE:
          xDiff = float(Head.locH - cableGuy.locH)
          yDiff = float(Head.locV - cableGuy.locV)
          Dist = sqrt((xDiff * xDiff) + (yDiff * yDiff))
          if Dist < 40 then
            bodzillaState = #SHUT
            puppetSound(4, member(78, "Sfx"))
          end if
          if Dist > (120 * bodzillaScale) then
            bodzillaState = #STAND
          end if
          toGuy = AngleGrind(Head.locH, Head.locV, cableGuy.locH, cableGuy.locV + 8)
          if (toGuy < 90) or (toGuy > 270) then
            Head.rotation = toGuy
            Head.flipH = 1
          else
            Head.rotation = toGuy + 180
            Head.flipH = 0
          end if
          Head.memberNum = 196
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
        #GARGLE:
          counter = counter + 1
          if counter > (70 * bodzillaScale) then
            bodzillaState = #STAND
          end if
          xDiff = float(Head.locH - cableGuy.locH)
          yDiff = float(Head.locV - cableGuy.locV)
          Dist = sqrt((xDiff * xDiff) + (yDiff * yDiff))
          if Dist < 40 then
            bodzillaState = #SHUT
            puppetSound(4, member(78, "Sfx"))
          end if
          toGuy = AngleGrind(Head.locH, Head.locV, cableGuy.locH, cableGuy.locV + 8)
          if (toGuy < 90) or (toGuy > 270) then
            Head.rotation = toGuy
            Head.flipH = 1
          else
            Head.rotation = toGuy + 180
            Head.flipH = 0
          end if
          Head.memberNum = 196
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
        #SHUT:
          xDiff = float(Head.locH - cableGuy.locH)
          yDiff = float(Head.locV - cableGuy.locV)
          Dist = sqrt((xDiff * xDiff) + (yDiff * yDiff))
          if Dist > (70 * bodzillaScale) then
            bodzillaState = #SPIT
            counter = 0
            puppetSound(4, member(79, "Sfx"))
          end if
          toGuy = AngleGrind(Head.locH, Head.locV, cableGuy.locH, cableGuy.locV + 8)
          if (toGuy < 90) or (toGuy > 270) then
            Head.rotation = toGuy
            Head.flipH = 1
          else
            Head.rotation = toGuy + 180
            Head.flipH = 0
          end if
          Head.memberNum = 195
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
        #SPIT:
          counter = counter + 1
          if counter > 15 then
            bodzillaState = #STAND
          end if
          toGuy = AngleGrind(Head.locH, Head.locV, cableGuy.locH, cableGuy.locV + 8)
          if (toGuy < 90) or (toGuy > 270) then
            Head.rotation = toGuy
            Head.flipH = 1
          else
            Head.rotation = toGuy + 180
            Head.flipH = 0
          end if
          Head.memberNum = 197
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
        #INHALE:
          counter = counter + 1
          toGuy = AngleGrind(Head.locH, Head.locV, COPTER.locH, COPTER.locV)
          if (toGuy < 90) or (toGuy > 270) then
            Head.rotation = toGuy
            Head.flipH = 1
          else
            Head.rotation = toGuy + 180
            Head.flipH = 0
          end if
          if counter >= 40 then
            bodzillaState = #EXHALE
            puppetSound(4, member(85, "Sfx"))
            fireBall.fireBallState = #FIRED
            fireBall.loc = Head.loc
            fireBall.rotation = toGuy
            counter = 0
          end if
          xDiff = float(Head.locH - cableGuy.locH)
          if gPloshX <> -1 then
            if (abs(gPloshX - Head.locH) < (50 * bodzillaScale)) and (xDiff < (250 * bodzillaScale)) then
              bodzillaState = #GARGLE
              if bodzillaScale <= 0.5 then
                puppetSound(4, member(87, "Sfx"))
              else
                puppetSound(4, member(86, "Sfx"))
              end if
              counter = 0
            end if
          end if
          Head.memberNum = 196
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
        #EXHALE:
          counter = counter + 1
          if counter >= 30 then
            bodzillaState = #STAND
            counter = 0
          end if
          Head.memberNum = 197
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
        #BONK:
          BONK = BONK * 0.94999999999999996
          toGuy = AngleGrind(Head.locH, Head.locV, COPTER.locH, COPTER.locV)
          if (toGuy < 90) or (toGuy > 270) then
            Head.rotation = toGuy
            Head.flipH = 1
          else
            Head.rotation = toGuy + 180
            Head.flipH = 0
          end if
          Head.memberNum = 197
          Head.width = Head.member.width * bodzillaScale
          Head.height = Head.member.height * bodzillaScale
          if BONK < 10 then
            BONK = 0
            if Head.locV > 290 then
              bodzillaState = #Sink
              gRescueCount = gRescueCount + 1
              gScore = gScore + integer(2000 * bodzillaScale)
              puppetSound(4, member(1, "Sfx"))
            else
              if fireBall.fireBallState <> #FLY then
                bodzillaState = #EXHALE
                puppetSound(4, member(85, "Sfx"))
                fireBall.fireBallState = #FIRED
                fireBall.loc = Head.loc
                fireBall.rotation = toGuy
                counter = 0
              else
                bodzillaState = #STAND
              end if
            end if
          end if
        #Sink:
          Ypos = Ypos + 1
          if Ypos > 400 then
            bodzillaState = #SUNK
          end if
        #SUNK:
      end case
      if gCoconutList.count > 0 then
        repeat with i = 1 to gCoconutList.count
          xDiff = float(gCoconutList[i].locH - Head.locH)
          yDiff = float(gCoconutList[i].locV - Head.locV)
          Dist = sqrt((xDiff * xDiff) + (yDiff * yDiff))
          if (Dist < (80 * bodzillaScale)) and (bodzillaState <> #Sink) then
            if bodzillaState <> #BONK then
              bodzillaState = #BONK
              BONK = 20
              Sink = Sink + (14 * bodzillaScale)
              case bodzillaScale of
                1.0:
                  puppetSound(4, member(80, "Sfx"))
                0.80000000000000004:
                  puppetSound(4, member(81, "Sfx"))
                0.5, 0.40000000000000002:
                  puppetSound(4, member(82, "Sfx"))
              end case
              if Dist > 0 then
                pushDir = point(xDiff, yDiff) / Dist
                gCoconutList[i].Xvel = pushDir.locH * 10
                gCoconutList[i].Yvel = pushDir.locV * 10
              end if
            end if
          end if
        end repeat
      end if
    end if
    Body.locH = Xpos
    Body.locV = Ypos + Sink
    ArmBack.loc = Body.loc - ArmBackOffset
    ArmFront.loc = Body.loc - ArmFrontOffset
    Head.loc = Body.loc - HeadOffset + point(0, BONK)
    Tail.loc = Body.loc - tailOffset
  end if
end
