property this, Xpos, swellAngle, radians, Ypos, mapXPos, survivorDelay, thisMember, startMember, Xvel, cableGuy, enemyState, ThisWidth, thisHalfHeight, grabCount, distToHQ, targetSprite, targetOffset, frameDir, xSlide, COPTER, tiltAngle, fireCount, splosh, missile, firedCount
global gXVel, gXOffset, gPaused, gTileIDList, gCableItem, gCableLength, gRescueCount, gRescuedList, gScore

on getPropertyDescriptionList me
  descriptionList = [:]
  addProp(descriptionList, #targetSprite, [#default: 1, #format: #sprite, #comment: "targetSprite"])
  addProp(descriptionList, #targetOffset, [#default: point(0, 0), #format: #point, #comment: "offSet from targetSprite"])
  return descriptionList
end

on beginSprite
  radians = float(PI / 180)
  this = sprite(the currentSpriteNum)
  startMember = this.memberNum
  missile = sprite(88)
  COPTER = sprite(4)
  splosh = sprite(7)
  fireCount = 50
  loopWidth = gTileIDList.count * 128
  Xpos = float(this.locH)
  Ypos = float(this.locV)
  this.locZ = 1501
  Xvel = 0
  mapXPos = Xpos - 256 - 64
  survivorDelay = 0
  swellAngle = 0
  cableGuy = sprite(6)
  enemyState = #ONGROUND
  ThisWidth = this.width
  thisHalfHeight = this.height / 2
  grabCount = 0
  distToHQ = 0
  frameDir = 1
  tiltAngle = 0
  firedCount = 0
  this.locV = -1000
  xSlide = targetOffset.locH
end

on exitFrame
  if gPaused = 0 then
    case enemyState of
      #ONGROUND:
        if (sprite(targetSprite).locH > -100) and (sprite(targetSprite).locH < 600) then
          if startMember = 201 then
            fireCount = fireCount + 1
            if fireCount > 80 then
              if missile.missileState = #NULL then
                fireCount = 0
                missile.loc = this.loc + point(0, -30)
                missile.missileState = #FLY
                firedCount = firedCount + 1
                if soundBusy(4) = 0 then
                  if firedCount mod 2 then
                    puppetSound(4, member(78, "Sfx"))
                  else
                    puppetSound(4, member(80, "Sfx"))
                  end if
                end if
                missile.Xpos = missile.locH
                missile.Ypos = missile.locV
                missile.thisVel = 0
                if this.memberNum = 201 then
                  missile.rotation = 225
                else
                  missile.rotation = 315
                end if
              end if
            end if
          end if
          tiltAngle = sprite(targetSprite).rotation
          this.rotation = tiltAngle
          xSlide = xSlide + (tiltAngle * 0.10000000000000001)
          targetOffset.locH = xSlide * cos(tiltAngle * radians)
          targetOffset.locV = xSlide * sin(tiltAngle * radians)
          this.loc = sprite(targetSprite).loc + targetOffset
          if COPTER.locH >= this.locH then
            this.member = member(startMember + 1, "Gfx")
          else
            this.member = member(startMember, "Gfx")
          end if
          if abs(xSlide) > 55 then
            enemyState = #PLOPPED
            puppetSound(4, member(81, "Sfx"))
            splosh.overlayState = #StartSplash
            splosh.Xpos = this.locH
            splosh.Ypos = this.locV
          end if
        end if
      #PLOPPED:
        if this.locV <> -1000 then
          this.locV = this.locV + 2
          if this.locV > 270 then
            this.locV = -1000
          end if
        end if
    end case
  end if
end
