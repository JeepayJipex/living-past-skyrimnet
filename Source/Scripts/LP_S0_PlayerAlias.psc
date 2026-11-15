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

; StringUtil indexes bytes. Inspect individual bytes without changing the payload.
int Function ByteAt(string text, int index)
    int code = StringUtil.AsOrd(StringUtil.GetNthChar(text, index))
    If code < 0
        code += 256
    EndIf
    Return code
EndFunction

bool Function ValidRelationship(string text)
    int count = StringUtil.GetLength(text)
    If count == 0 || count > 160
        Return False
    EndIf
    int i = 0
    bool nonblank = False
    While i < count
        int code = ByteAt(text, i)
        If code < 32 || code == 127
            Return False
        ElseIf code == 194 && i + 1 < count && ByteAt(text, i + 1) >= 128 && ByteAt(text, i + 1) <= 159
            Return False
        ElseIf code == 226 && i + 2 < count && ByteAt(text, i + 1) == 128 && (ByteAt(text, i + 2) == 168 || ByteAt(text, i + 2) == 169)
            Return False
        ElseIf code == 32
            i += 1
        ElseIf code == 194 && i + 1 < count && ByteAt(text, i + 1) == 160
            i += 2
        ElseIf code == 225 && i + 2 < count && ByteAt(text, i + 1) == 154 && ByteAt(text, i + 2) == 128
            i += 3
        ElseIf code == 226 && i + 2 < count && ByteAt(text, i + 1) == 128 && ((ByteAt(text, i + 2) >= 128 && ByteAt(text, i + 2) <= 138) || ByteAt(text, i + 2) == 175)
            i += 3
        ElseIf code == 226 && i + 2 < count && ByteAt(text, i + 1) == 129 && ByteAt(text, i + 2) == 159
            i += 3
        ElseIf code == 227 && i + 2 < count && ByteAt(text, i + 1) == 128 && ByteAt(text, i + 2) == 128
            i += 3
        ElseIf code == 239 && i + 2 < count && ByteAt(text, i + 1) == 187 && ByteAt(text, i + 2) == 191
            i += 3
        Else
            nonblank = True
            i += 1
        EndIf
    EndWhile
    Return nonblank
EndFunction

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
    If op != "A" && payloadLength != 0
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
            If ValidRelationship(value)
                StorageUtil.SetStringValue(npc, relationshipKey, value)
                value = StorageUtil.GetStringValue(npc, relationshipKey, "")
                If StringUtil.GetLength(value) <= 160
                    responseStatus = "S"
                Else
                    value = ""
                EndIf
            Else
                value = ""
            EndIf
        Else
            value = StorageUtil.GetStringValue(npc, relationshipKey, "")
            If StringUtil.GetLength(value) <= 160
                responseStatus = "S"
            Else
                value = ""
            EndIf
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
