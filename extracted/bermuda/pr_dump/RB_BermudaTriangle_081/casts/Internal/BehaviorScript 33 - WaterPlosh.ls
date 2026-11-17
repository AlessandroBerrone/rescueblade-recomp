property this, Xpos, Ypos, ploshState, Yvel, grav, Xvel
global gXVel, gXOffset, gPaused, gPloshList, gPloshX, gCoconutList

on beginSprite
  this = sprite(the currentSpriteNum)
  Xpos = float(-1000)
  Ypos = float(-1000)
  Yvel = -2
  ploshState = #NULL
  this.locZ = 98
  gPloshList.add(this)
  grav = 0.80000000000000004
  Xvel = 0
  this.height = 30
  this.width = 2
  this.locH = Xpos
  this.locV = Ypos
end

on exitFrame
  if gPaused = 0 then
    case ploshState of
      #NULL:
      #PLOSH:
        Yvel = Yvel + grav
        Xpos = Xpos + gXVel + gXOffset + Xvel
        Ypos = Ypos + Yvel
        Xvel = Xvel * 0.97999999999999998
        Yvel = Yvel * 0.94999999999999996
        this.rotation = this.rotation * 0.90000000000000002
        if this.memberNum <> 200 then
          if this.width < 50 then
            this.width = this.width + 4
            this.height = this.height + 2
          end if
        else
        end if
        if this.locV > 280 then
          if this.memberNum = 126 then
            gPloshX = this.locH
          end if
          ploshState = #NULL
          gPloshList.add(this)
          Xpos = -1000
          Ypos = -1000
          Xvel = 0
          Yvel = 0
          this.locH = Xpos
          this.locV = Ypos
          this.member = member(126, "Gfx")
          this.width = 2
          this.height = 30
          if gCoconutList.count > 0 then
            repeat with i = 1 to gCoconutList.count
              if this = gCoconutList[i] then
                gCoconutList.deleteAt(i)
              end if
            end repeat
          end if
        end if
        this.locH = Xpos
        this.locV = Ypos
    end case
  end if
end
