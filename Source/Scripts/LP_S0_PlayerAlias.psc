Scriptname LP_S0_PlayerAlias extends ReferenceAlias
{Living Past Stage 0-B bridge.}

int viewId
string relationshipKey = "LivingPast.Stage0B.Relationship"
string probeSession = ""
string probeText = ""
int probeLength = 0
int probeSlot = 0
int probePrevious = 0
bool probePrepared = False
int probeSequence = 0
int probeReadOffset = 0
string probeReadSnapshot = ""
int probeSnapshotSlot = 0

Event OnInit()
    Setup()
EndEvent

Event OnPlayerLoadGame()
    Setup()
EndEvent

Function Setup()
    probeSession = ""
    probePrepared = False
    probeSequence = 0
    probeText = ""
    probeReadSnapshot = ""
    probeSnapshotSlot = 0
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
    If StringUtil.Substring(frame, 0, 2) == "3|"
        ProbeEvent(frame)
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

; PapyrusUtil's text-stream restore treats raw whitespace as a delimiter.
string Function ReplaceProbeText(string value, string needle, string replacement)
    int cursor = 0
    int hit = StringUtil.Find(value, needle)
    string result = ""
    While hit >= 0
        If hit > cursor
            result += StringUtil.Substring(value, cursor, hit - cursor)
        EndIf
        result += replacement
        cursor = hit + StringUtil.GetLength(needle)
        hit = StringUtil.Find(value, needle, cursor)
    EndWhile
    If cursor < StringUtil.GetLength(value)
        result += StringUtil.Substring(value, cursor)
    EndIf
    Return result
EndFunction

string Function EncodeProbeText(string value)
    value = ReplaceProbeText(value, "%", "%25")
    value = ReplaceProbeText(value, " ", "%20")
    value = ReplaceProbeText(value, StringUtil.AsChar(9), "%09")
    value = ReplaceProbeText(value, StringUtil.AsChar(10), "%0A")
    Return ReplaceProbeText(value, StringUtil.AsChar(13), "%0D")
EndFunction

string Function ReadProbeSlot(Actor npc, int slot)
    string storageKey = "LivingPast.Probe.EncodedSlot" + slot
    If !StorageUtil.HasStringValue(npc, storageKey)
        Return StorageUtil.GetStringValue(npc, "LivingPast.Probe.Slot" + slot, "")
    EndIf
    string value = StorageUtil.GetStringValue(npc, storageKey, "")
    value = ReplaceProbeText(value, "%20", " ")
    value = ReplaceProbeText(value, "%09", StringUtil.AsChar(9))
    value = ReplaceProbeText(value, "%0A", StringUtil.AsChar(10))
    value = ReplaceProbeText(value, "%0D", StringUtil.AsChar(13))
    Return ReplaceProbeText(value, "%25", "%")
EndFunction

; The probe uses inactive slots and publishes only after explicit verified readback.
Function ProbeEvent(string frame)
    If !Magelight.IsVisible(viewId) || StringUtil.GetLength(frame) < 31
        Return
    EndIf
    string id = StringUtil.Substring(frame, 2, 20)
    string session = StringUtil.Substring(id, 0, 16)
    string op = StringUtil.Substring(frame, 23, 1)
    int digits = 3
    int maxPayload = 160
    If op == "L" || op == "P"
        digits = 4
        maxPayload = 4096
    EndIf
    int payloadStart = 28 + digits
    string n = StringUtil.Substring(frame, 27, digits)
    int i = 0
    While i < 20
        string c = StringUtil.Substring(id, i, 1)
        If (i < 16 && StringUtil.Find("0123456789abcdef", c) < 0) || (i >= 16 && StringUtil.Find("0123456789", c) < 0)
            Return
        EndIf
        i += 1
    EndWhile
    i = 0
    While i < digits
        If StringUtil.Find("0123456789", StringUtil.Substring(n, i, 1)) < 0
            Return
        EndIf
        i += 1
    EndWhile
    int size = n as int
    If StringUtil.Substring(frame, 22, 1) != "|" || StringUtil.Substring(frame, 24, 3) != "|Q|" || StringUtil.Substring(frame, payloadStart - 1, 1) != "|" || size > maxPayload || StringUtil.GetLength(frame) != payloadStart + size
        Return
    EndIf
    Actor npc = Game.GetFormFromFile(0x0001A69A, "Skyrim.esm") as Actor
    ActorBase expected = Game.GetFormFromFile(0x00013BAB, "Skyrim.esm") as ActorBase
    If op == "X" && size == 0
        string diagnostic = "ref=" + (npc != None) + ";base=" + (expected != None)
        If npc && expected
            diagnostic += ";match=" + (npc.GetActorBase() == expected)
        Else
            diagnostic += ";match=unavailable"
        EndIf
        If npc && expected && npc.GetActorBase() == expected && PapyrusUtil.GetVersion() > 0
            bool markerPresent = StorageUtil.HasIntValue(npc, "LivingPast.Probe.Active")
            int marker = StorageUtil.GetIntValue(npc, "LivingPast.Probe.Active", 0)
            bool encoded1 = StorageUtil.HasStringValue(npc, "LivingPast.Probe.EncodedSlot1")
            bool encoded2 = StorageUtil.HasStringValue(npc, "LivingPast.Probe.EncodedSlot2")
            bool slot1 = encoded1 || StorageUtil.HasStringValue(npc, "LivingPast.Probe.Slot1")
            bool slot2 = encoded2 || StorageUtil.HasStringValue(npc, "LivingPast.Probe.Slot2")
            int length1 = StringUtil.GetLength(ReadProbeSlot(npc, 1))
            int length2 = StringUtil.GetLength(ReadProbeSlot(npc, 2))
            diagnostic += ";marker=" + markerPresent + ";active=" + marker + ";s1=" + slot1 + "," + length1 + ";s2=" + slot2 + "," + length2
            diagnostic += ";encoded1=" + encoded1 + ";encoded2=" + encoded2
            If markerPresent && marker == 1 && slot1
                diagnostic += ";read=ok"
            ElseIf markerPresent && marker == 2 && slot2
                diagnostic += ";read=ok"
            ElseIf !markerPresent || marker == 0
                diagnostic += ";read=no-active"
            ElseIf marker == 1 || marker == 2
                diagnostic += ";read=missing"
            Else
                diagnostic += ";read=invalid-marker"
            EndIf
        Else
            diagnostic += ";storage=unavailable"
        EndIf
        ProbeReply(id, op, True, diagnostic)
        Return
    EndIf
    If !npc || !expected || npc.GetActorBase() != expected || PapyrusUtil.GetVersion() <= 0
        ProbeReply(id, op, False, "")
        Return
    EndIf
    string arg = StringUtil.Substring(frame, payloadStart)
    string markerKey = "LivingPast.Probe.Active"
    int active = StorageUtil.GetIntValue(npc, markerKey, 0)
    bool ok = False
    string result = ""
    int requestSequence = StringUtil.Substring(id, 16, 4) as int
    If op == "O" && size == 0 && requestSequence == 1
        probeSession = session
        probeSequence = 1
        probePrepared = False
        probeText = ""
        probeLength = 0
        probeReadSnapshot = ""
        probeSnapshotSlot = 0
        result = active as string
        ok = True
    ElseIf session == probeSession && requestSequence == probeSequence + 1 && Magelight.IsVisible(viewId)
        probeSequence = requestSequence
        int numericCount = 0
        If op == "B" || op == "D"
            numericCount = 4
        ElseIf op == "R" || op == "J"
            numericCount = 5
        EndIf
        i = 0
        While i < numericCount
            If i >= size || StringUtil.Find("0123456789", StringUtil.Substring(arg, i, 1)) < 0
                ProbeReply(id, op, False, "")
                Return
            EndIf
            i += 1
        EndWhile
        If (op == "T" || op == "L") && size == 0 && active >= 0 && active <= 2
            SendProbeNarrative(id, op, npc, active)
            Return
        ElseIf op == "P"
            result = arg
            ok = True
        ElseIf op == "B" && size == 4
            probeLength = arg as int
            probeText = ""
            probePrepared = False
            probePrevious = active
            probeSlot = 1
            If active == 1
                probeSlot = 2
            EndIf
            ok = probeLength > 0 && probeLength <= 2048
        ElseIf op == "D" && size > 4 && probeLength > 0 && !probePrepared
            int offset = StringUtil.Substring(arg, 0, 4) as int
            string part = StringUtil.Substring(arg, 4)
            If offset == StringUtil.GetLength(probeText) && StringUtil.GetLength(probeText) + StringUtil.GetLength(part) <= probeLength
                probeText += part
                result = arg
                ok = True
            EndIf
        ElseIf op == "S" && size == 0 && probeLength > 0 && StringUtil.GetLength(probeText) == probeLength && active == probePrevious
            StorageUtil.SetStringValue(npc, "LivingPast.Probe.EncodedSlot" + probeSlot, EncodeProbeText(probeText))
            probePrepared = True
            probeReadOffset = 0
            ok = True
        ElseIf (op == "R" || op == "J") && size == 5
            int slot = StringUtil.Substring(arg, 0, 1) as int
            int offset = StringUtil.Substring(arg, 1, 4) as int
            bool readingProbe = slot == 3
            If (slot == 0 && active > 0) || (readingProbe && probePrepared && offset == probeReadOffset)
                If slot == 0
                    slot = active
                Else
                    slot = probeSlot
                EndIf
                float started = Utility.GetCurrentRealTime()
                string saved = probeReadSnapshot
                If op == "J" || offset == 0 || probeSnapshotSlot != slot
                    saved = ReadProbeSlot(npc, slot)
                    If op == "R"
                        probeReadSnapshot = saved
                        probeSnapshotSlot = slot
                    EndIf
                EndIf
                int readMs = ((Utility.GetCurrentRealTime() - started) * 1000.0) as int
                If offset <= StringUtil.GetLength(saved)
                    int take = ProbeChunkLength(saved, offset)
                    If take > 0
                        result = StringUtil.Substring(saved, offset, take)
                    ElseIf op == "R"
                        probeReadSnapshot = ""
                        probeSnapshotSlot = 0
                    EndIf
                    If readingProbe
                        probeReadOffset += take
                    EndIf
                    ok = True
                    If op == "J"
                        result = readMs + "|1|" + result
                    EndIf
                EndIf
            ElseIf slot == 0 && active == 0 && offset == 0
                ok = True
                If op == "J"
                    result = "0|0|"
                EndIf
            EndIf
        ElseIf op == "K" && size == 0 && probePrepared && probeReadOffset == probeLength && active == probePrevious
            StorageUtil.SetIntValue(npc, markerKey, probeSlot)
            ok = StorageUtil.GetIntValue(npc, markerKey, 0) == probeSlot
            probePrepared = False
            probeLength = 0
        EndIf
    EndIf
    ProbeReply(id, op, ok, result)
EndFunction

int Function ProbeChunkLength(string value, int offset)
    int remaining = StringUtil.GetLength(value) - offset
    If remaining <= 128
        Return remaining
    EndIf
    int take = 128
    int nextByte = ByteAt(value, offset + take)
    While take > 0 && nextByte >= 128 && nextByte <= 191
        take -= 1
        nextByte = ByteAt(value, offset + take)
    EndWhile
    Return take
EndFunction

Function SendProbeNarrative(string id, string op, Actor npc, int active)
    string saved = ""
    int readCount = 0
    float started = Utility.GetCurrentRealTime()
    If active > 0
        saved = ReadProbeSlot(npc, active)
        readCount = 1
    EndIf
    int readMs = ((Utility.GetCurrentRealTime() - started) * 1000.0) as int
    int size = StringUtil.GetLength(saved)
    If size > 2048 || (active > 0 && size == 0)
        ProbeReply(id, op, False, "")
        Return
    EndIf
    If op == "L"
        ProbeReply(id, op, True, readMs + "|" + readCount + "|" + size + "|" + saved)
        Return
    EndIf
    int offset = 0
    While offset < size
        If !Magelight.IsVisible(viewId) || probeSession != StringUtil.Substring(id, 0, 16)
            Return
        EndIf
        int take = ProbeChunkLength(saved, offset)
        If take == 0
            ProbeReply(id, op, False, "")
            Return
        EndIf
        SendProbeFrame(id, op, "C", offset + "|" + StringUtil.Substring(saved, offset, take))
        offset += take
    EndWhile
    ProbeReply(id, op, True, readMs + "|" + readCount + "|" + size)
EndFunction

Function ProbeReply(string id, string op, bool ok, string value)
    string status = "E"
    If ok
        status = "S"
    EndIf
    SendProbeFrame(id, op, status, value)
EndFunction

Function SendProbeFrame(string id, string op, string status, string value)
    int count = StringUtil.GetLength(value)
    string n = count as string
    If count < 10
        n = "00" + n
    ElseIf count < 100
        n = "0" + n
    EndIf
    If (op == "L" || op == "P") && count < 1000
        n = "0" + n
    EndIf
    Magelight.Call(viewId, "lpReceive", "3|" + id + "|" + op + "|" + status + "|" + n + "|" + value)
EndFunction

Event OnLivingPastClose(string eventName, string strArg, float numArg, Form sender)
    If numArg as int != viewId
        Return
    EndIf
    probeSession = ""
    probePrepared = False
    probeText = ""
    probeLength = 0
    probeReadSnapshot = ""
    probeSnapshotSlot = 0
    If Magelight.GetUIModeView() == viewId
        Magelight.ReleaseUIMode("LivingPast")
    EndIf
    If Magelight.IsVisible(viewId)
        Magelight.ShowView(viewId, False)
    EndIf
EndEvent
