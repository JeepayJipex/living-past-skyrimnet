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
    Magelight.Call(viewId, "lpReceive", "{\"protocol\":1,\"type\":\"bridge.ready\"}")
EndEvent

Event OnLivingPastEvent(string eventName, string strArg, float numArg, Form sender)
    If numArg as int != viewId
        Return
    EndIf
    ; The payload is JSON. This spike checks transport only and does not parse or save it.
    ; Do not log the payload: it may contain the test biography.
    Debug.Trace("[LivingPast:S0] Received UI JSON event")
    Magelight.Call(viewId, "lpReceive", "{\"protocol\":1,\"type\":\"ack\"}")
EndEvent

Event OnLivingPastClose(string eventName, string strArg, float numArg, Form sender)
    If numArg as int != viewId
        Return
    EndIf
    Magelight.ReleaseUIMode("LivingPast")
    Magelight.ShowView(viewId, False)
EndEvent
