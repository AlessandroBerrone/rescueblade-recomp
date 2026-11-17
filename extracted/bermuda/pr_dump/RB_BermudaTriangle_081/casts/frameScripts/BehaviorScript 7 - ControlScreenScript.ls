global gProControls

on exitFrame me
  go(the frame)
end

on mouseUp
  case the rollover of
    10:
      gProControls = 0
      go("menuScreen")
      puppetSound(2, member(12, "Sfx"))
    11:
      gProControls = 1
      go("menuScreen")
      puppetSound(2, member(12, "Sfx"))
  end case
end
