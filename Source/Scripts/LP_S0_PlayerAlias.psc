Scriptname LP_S0_PlayerAlias extends ReferenceAlias
{Stage 0 only. Echoes UI events and closes the panel. No save or gameplay changes.}

int viewId

Event OnInit()
    Setup()
EndEvent

Event OnPlayerLoadGame()
    Setup()
EndEvent

Function Setup()
    RegisterForModEvent("Magelight_ViewDomReady", "OnLivingPastDomReady")
    RegisterForModEvent("Magelight_JS_lpEvent", "OnLivingPastEvent")
    RegisterForModEvent("Magelight_JS_lpClose", "OnLivingPastClose")

    If !Magelight.RegisterMod("LivingPast", "Living Past Stage 0 UI Spike")
        Debug.Trace("[LivingPast:S0] Magelight registration failed")
        Return
    EndIf

    viewId = Magelight.FindView("LivingPast", "spike")
    If viewId == 0
        Debug.Trace("[LivingPast:S0] Spike view not found; check the manifest and build layout")
        Return
    EndIf

    If !Magelight.RegisterListener(viewId, "lpEvent")
        Debug.Trace("[LivingPast:S0] lpEvent listener registration failed")
    EndIf
    If !Magelight.RegisterListener(viewId, "lpClose")
        Debug.Trace("[LivingPast:S0] lpClose listener registration failed")
    EndIf
EndFunction

Event OnLivingPastDomReady(string eventName, string strArg, float numArg, Form sender)
    If numArg as int != viewId
        Return
    EndIf
    ; The page initiates a new request when it opens.
EndEvent

Event OnLivingPastEvent(string eventName, string strArg, float numArg, Form sender)
    If numArg as int != viewId
        Return
    EndIf
    ; The page generates alphanumeric IDs. Never log the request payload.
    int start = StringUtil.Find(strArg, "\"id\":\"")
    If start < 0
        Return
    EndIf
    start += 6
    int finish = StringUtil.Find(strArg, "\"", start)
    If finish <= start
        Return
    EndIf
    string requestId = StringUtil.Substring(strArg, start, finish - start)
    Magelight.Call(viewId, "lpReceive", "{\"protocol\":1,\"correlationId\":\"" + requestId + "\",\"type\":\"echo\",\"status\":\"ok\",\"request\":" + strArg + "}")
EndEvent

Event OnLivingPastClose(string eventName, string strArg, float numArg, Form sender)
    If numArg as int != viewId
        Return
    EndIf
    If Magelight.GetUIModeView() == viewId
        Magelight.ReleaseUIMode("LivingPast")
    EndIf
    If Magelight.IsVisible(viewId)
        Magelight.ShowView(viewId, False)
    EndIf
EndEvent
