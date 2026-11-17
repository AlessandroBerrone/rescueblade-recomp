global gLockOut

on exitFrame me
  if keyPressed("r") and keyPressed("i") and keyPressed("x") then
    alert("Rix Cheat" & RETURN & "Unlocking all levels. . .")
    gLockOut = 2
    go(the frame - 1)
  end if
  go(the frame)
end
