global gPaused

on exitFrame me
  go(the frame)
end

on keyDown
  if the keyCode = 35 then
    if gPaused = 1 then
      gPaused = 0
      sound(1).play()
      sound(2).play()
      sound(3).play()
      sound(4).play()
    else
      gPaused = 1
      sound(1).pause()
      sound(2).pause()
      sound(3).pause()
      sound(4).pause()
    end if
  end if
end
