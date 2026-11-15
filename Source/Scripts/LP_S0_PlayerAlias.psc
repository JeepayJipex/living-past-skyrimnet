Scriptname LP_S0_PlayerAlias extends ReferenceAlias
{Living Past Stage 0-B bridge.}

int viewId
string relationshipKey = "LivingPast.Stage0B.Relationship"

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
    If !Magelight.RegisterMod("LivingPast", "Living Past")
        Return
    EndIf
    viewId = Magelight.FindView("LivingPast", "spike")
    If viewId != 0
        Magelight.RegisterListener(viewId, "lpEvent")
        Magelight.RegisterListener(viewId, "lpClose")
    EndIf
EndFunction

Event OnLivingPastDomReady(string eventName, string strArg, float numArg, Form sender)
EndEvent

Event OnLivingPastEvent(string eventName, string frame, float numArg, Form sender)
    If numArg as int != viewId || StringUtil.GetLength(frame) < 31
        Return
    EndIf
    ; Fixed ASCII header is inspected independently of the UTF-8 payload.
    string header = StringUtil.Substring(frame, 0, 31)
    If StringUtil.Substring(header, 0, 2) != "2|" || StringUtil.Substring(header, 22, 1) != "|" || StringUtil.Substring(header, 24, 3) != "|Q|" || StringUtil.Substring(header, 30, 1) != "|"
        Return
    EndIf
    string requestId = StringUtil.Substring(header, 2, 20)
    int i = 0
    While i < 20
        string ch = StringUtil.Substring(requestId, i, 1)
        If i < 16
            If StringUtil.Find("0123456789abcdef", ch) < 0
                Return
            EndIf
        ElseIf StringUtil.Find("0123456789", ch) < 0
            Return
        EndIf
        i += 1
    EndWhile
    string op = StringUtil.Substring(header, 23, 1)
    string lengthField = StringUtil.Substring(header, 27, 3)
    i = 0
    While i < 3
        If StringUtil.Find("0123456789", StringUtil.Substring(lengthField, i, 1)) < 0
            Return
        EndIf
        i += 1
    EndWhile
    int payloadLength = lengthField as int
    If payloadLength > 160 || StringUtil.GetLength(frame) != 31 + payloadLength
        Return
    EndIf
    If op != "O" && op != "A" && op != "C"
        Return
    EndIf
    If (op == "A" && payloadLength == 0) || (op != "A" && payloadLength != 0)
        Return
    EndIf
    string value = ""
    string responseStatus = "E"
    Actor npc = Game.GetFormFromFile(0x0001A69A, "Skyrim.esm") as Actor
    ActorBase expectedBase = Game.GetFormFromFile(0x00013BAB, "Skyrim.esm") as ActorBase
    If op == "C"
        responseStatus = "S"
    ElseIf npc && expectedBase && npc.GetActorBase() == expectedBase && PapyrusUtil.GetVersion() > 0
        If op == "A"
            value = StringUtil.Substring(frame, 31)
            StorageUtil.SetStringValue(npc, relationshipKey, value)
        EndIf
        value = StorageUtil.GetStringValue(npc, relationshipKey, "")
        If StringUtil.GetLength(value) <= 160
            responseStatus = "S"
        Else
            value = ""
        EndIf
    EndIf
    int responseLength = StringUtil.GetLength(value)
    string sizeText = responseLength as string
    If responseLength < 10
        sizeText = "00" + sizeText
    ElseIf responseLength < 100
        sizeText = "0" + sizeText
    EndIf
    Magelight.Call(viewId, "lpReceive", "2|" + requestId + "|" + op + "|" + responseStatus + "|" + sizeText + "|" + value)
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
