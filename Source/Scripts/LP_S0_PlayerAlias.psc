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
Actor chronicleActor
string chronicleLabel = ""
Form[] discoveryForms
string discoverySession = ""
int discoverySequence

Event OnInit()
    Setup()
EndEvent

Event OnPlayerLoadGame()
    Setup()
EndEvent

Function Setup()
    discoveryForms = Utility.CreateFormArray(0)
    discoverySession = ""
    int registration = SkyrimNetApi.RegisterDecorator("living_past_base_probe", "LP_S0_PlayerAlias", "NativeProbeMatch")
    Debug.Trace("[Living Past] Native probe decorator registration: " + registration)
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
        Magelight.Call(viewId, "lpGameLoaded", "")
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
    If StringUtil.Substring(frame, 0, 2) == "4|"
        ChronicleEvent(frame)
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

string Function ReadChronicleHistory(Actor npc, int slot)
    string storageKey = "LivingPast.Chronicle.History" + slot
    If !StorageUtil.HasStringValue(npc, storageKey)
        Return ""
    EndIf
    string value = StorageUtil.GetStringValue(npc, storageKey, "")
    value = ReplaceProbeText(value, "%20", " ")
    value = ReplaceProbeText(value, "%09", StringUtil.AsChar(9))
    value = ReplaceProbeText(value, "%0A", StringUtil.AsChar(10))
    value = ReplaceProbeText(value, "%0D", StringUtil.AsChar(13))
    Return ReplaceProbeText(value, "%25", "%")
EndFunction

string Function ReadChronicleLabel(Actor npc, int slot)
    string storageKey = "LivingPast.Chronicle.Label" + slot
    If !StorageUtil.HasStringValue(npc, storageKey)
        Return ""
    EndIf
    string value = StorageUtil.GetStringValue(npc, storageKey, "")
    value = ReplaceProbeText(value, "%20", " ")
    value = ReplaceProbeText(value, "%09", StringUtil.AsChar(9))
    value = ReplaceProbeText(value, "%0A", StringUtil.AsChar(10))
    value = ReplaceProbeText(value, "%0D", StringUtil.AsChar(13))
    Return ReplaceProbeText(value, "%25", "%")
EndFunction

Function ChronicleEvent(string frame)
    If !Magelight.IsVisible(viewId) || StringUtil.GetLength(frame) < 31
        Return
    EndIf
    string id = StringUtil.Substring(frame, 2, 20)
    string session = StringUtil.Substring(id, 0, 16)
    string op = StringUtil.Substring(frame, 23, 1)
    int digits = 3
    int maxPayload = 160
    If WideChronicleFrame(op)
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
    string arg = StringUtil.Substring(frame, payloadStart)
    int requestSequence = StringUtil.Substring(id, 16, 4) as int
    If op == "G" || op == "N" || op == "F" || op == "U" || op == "W" || op == "Y" || op == "V"
        DiscoveryEvent(id, op, arg, session, requestSequence)
        Return
    EndIf
    If op == "O" && requestSequence == 1
        chronicleActor = None
        ActorBase expected = None
        If arg == "1"
            chronicleActor = Game.GetFormFromFile(0x0001A69A, "Skyrim.esm") as Actor
            expected = Game.GetFormFromFile(0x00013BAB, "Skyrim.esm") as ActorBase
        ElseIf arg == "2"
            chronicleActor = Game.GetFormFromFile(0x0001A675, "Skyrim.esm") as Actor
            expected = Game.GetFormFromFile(0x00013B99, "Skyrim.esm") as ActorBase
        EndIf
        If !chronicleActor || !expected || chronicleActor.GetActorBase() != expected
            ChronicleReply(id, op, False, "")
            Return
        EndIf
    EndIf
    Actor npc = chronicleActor
    If !npc || PapyrusUtil.GetVersion() <= 0
        ChronicleReply(id, op, False, "")
        Return
    EndIf
    string markerKey = "LivingPast.Chronicle.Revision"
    int revision = StorageUtil.GetIntValue(npc, markerKey, 0)
    int active = 0
    If revision > 0
        active = ((revision - 1) % 2) + 1
    EndIf
    bool ok = False
    string result = ""
    If op == "O" && (arg == "1" || arg == "2") && requestSequence == 1
        probeSession = session
        probeSequence = 1
        probePrepared = False
        chronicleLabel = ""
        probeText = ""
        probeLength = 0
        probeReadSnapshot = ""
        probeSnapshotSlot = 0
        result = revision + "|" + ReadChronicleLabel(npc, active)
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
                ChronicleReply(id, op, False, "")
                Return
            EndIf
            i += 1
        EndWhile
        If (op == "T" || op == "L") && size == 0 && active >= 0 && active <= 2
            SendChronicleNarrative(id, op, npc, active)
            Return
        ElseIf op == "P"
            result = arg
            ok = True
        ElseIf op == "H" && size > 0 && size <= 96 && ValidRelationship(arg)
            chronicleLabel = arg
            result = arg
            ok = True
        ElseIf op == "B" && size == 4 && chronicleLabel != ""
            probeLength = arg as int
            probeText = ""
            probePrepared = False
            probePrevious = revision
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
        ElseIf op == "S" && size == 0 && probeLength > 0 && StringUtil.GetLength(probeText) == probeLength && revision == probePrevious
            StorageUtil.SetStringValue(npc, "LivingPast.Chronicle.History" + probeSlot, EncodeProbeText(probeText))
            StorageUtil.SetStringValue(npc, "LivingPast.Chronicle.Label" + probeSlot, EncodeProbeText(chronicleLabel))
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
                    saved = ReadChronicleHistory(npc, slot)
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
        ElseIf op == "K" && size == 0 && probePrepared && probeReadOffset == probeLength && revision == probePrevious
            If ReadChronicleLabel(npc, probeSlot) == chronicleLabel && revision < 2147483646
                Actor player = Game.GetPlayer()
                int index = 1
                int available = 0
                While index <= 5
                    Form indexed = StorageUtil.GetFormValue(player, "LivingPast.Chronicle.Actor" + index, None)
                    If indexed == npc
                        available = index
                        index = 6
                    ElseIf available == 0 && (indexed == None || StorageUtil.GetIntValue(indexed, markerKey, 0) == 0)
                        available = index
                    EndIf
                    index += 1
                EndWhile
                If available > 0
                    StorageUtil.SetFormValue(player, "LivingPast.Chronicle.Actor" + available, npc)
                    If StorageUtil.GetFormValue(player, "LivingPast.Chronicle.Actor" + available, None) == npc
                        StorageUtil.SetIntValue(npc, markerKey, revision + 1)
                        ok = StorageUtil.GetIntValue(npc, markerKey, 0) == revision + 1
                    EndIf
                EndIf
            EndIf
            probePrepared = False
            probeLength = 0
        EndIf
    EndIf
    ChronicleReply(id, op, ok, result)
EndFunction

Function SendChronicleNarrative(string id, string op, Actor npc, int active)
    string saved = ""
    int readCount = 0
    float started = Utility.GetCurrentRealTime()
    If active > 0
        saved = ReadChronicleHistory(npc, active)
        readCount = 1
    EndIf
    int readMs = ((Utility.GetCurrentRealTime() - started) * 1000.0) as int
    int size = StringUtil.GetLength(saved)
    If size > 2048 || (active > 0 && size == 0)
        ChronicleReply(id, op, False, "")
        Return
    EndIf
    If op == "L"
        ChronicleReply(id, op, True, readMs + "|" + readCount + "|" + size + "|" + saved)
        Return
    EndIf
    int offset = 0
    While offset < size
        If !Magelight.IsVisible(viewId) || probeSession != StringUtil.Substring(id, 0, 16)
            Return
        EndIf
        int take = ProbeChunkLength(saved, offset)
        If take == 0
            ChronicleReply(id, op, False, "")
            Return
        EndIf
        SendChronicleFrame(id, op, "C", offset + "|" + StringUtil.Substring(saved, offset, take))
        offset += take
    EndWhile
    ChronicleReply(id, op, True, readMs + "|" + readCount + "|" + size)
EndFunction

Function ChronicleReply(string id, string op, bool ok, string value)
    string status = "E"
    If ok
        status = "S"
    EndIf
    SendChronicleFrame(id, op, status, value)
EndFunction

Function SendChronicleFrame(string id, string op, string status, string value)
    int count = StringUtil.GetLength(value)
    string n = count as string
    If count < 10
        n = "00" + n
    ElseIf count < 100
        n = "0" + n
    EndIf
    If WideChronicleFrame(op) && count < 1000
        n = "0" + n
    EndIf
    Magelight.Call(viewId, "lpReceive", "4|" + id + "|" + op + "|" + status + "|" + n + "|" + value)
EndFunction

bool Function WideChronicleFrame(string op)
    Return op == "L" || op == "P" || op == "F" || op == "U" || op == "W"
EndFunction

bool Function NamedUniqueBase(ActorBase base) Global
    If !base
        Return False
    EndIf
    int formId = base.GetFormID()
    Return formId != 7 && Math.LogicalAnd(Math.RightShift(formId, 24), 255) != 255 && base.IsUnique() && base.GetName() != ""
EndFunction

string Function NativeProbeMatch(Actor speaker) Global
    If !speaker || speaker == Game.GetPlayer() || Math.LogicalAnd(Math.RightShift(speaker.GetFormID(), 24), 255) == 255
        Return "{\"revision\":0}"
    EndIf
    float started = Utility.GetCurrentRealTime()
    Actor player = Game.GetPlayer()
    int revision = StorageUtil.GetIntValue(player, "LivingPast.NativeProbe.Revision", 0)
    If revision > 0
        int bank = ((revision - 1) % 2) + 1
        ActorBase stored = StorageUtil.GetFormValue(player, "LivingPast.NativeProbe.Base" + bank, None) as ActorBase
        If stored && stored == speaker.GetActorBase() && stored.IsUnique()
            int milliseconds = ((Utility.GetCurrentRealTime() - started) * 1000.0) as int
            Debug.Trace("[Living Past] Native probe speaker matched revision " + revision + " in " + milliseconds + " ms")
            Return "{\"revision\":" + revision + "}"
        EndIf
    EndIf
    Return "{\"revision\":0}"
EndFunction

Function DiscoveryEvent(string id, string op, string arg, string session, int sequence)
    If op == "G" && sequence == 1 && arg == ""
        discoverySession = session
        discoveryForms = Utility.CreateFormArray(0)
        discoverySequence = sequence
        ChronicleReply(id, op, True, "")
        Return
    EndIf
    If session != discoverySession || sequence != discoverySequence + 1
        ChronicleReply(id, op, False, "")
        Return
    EndIf
    discoverySequence = sequence
    If op == "V" && arg == ""
        int version = LivingPastCatalog.GetVersion()
        Debug.Trace("[Living Past] Native DLL GetVersion returned " + version)
        ChronicleReply(id, op, True, version as string)
    ElseIf op == "N" && discoveryForms.Length == 0
        string source = "GetAllForms(43)"
        If arg != ""
            source = "GetAllFormsInMod(" + arg + ", 43)"
        EndIf
        Debug.Trace("[Living Past] Native probe calling " + source)
        float started = Utility.GetCurrentRealTime()
        If arg == ""
            discoveryForms = PO3_SKSEFunctions.GetAllForms(43)
        Else
            discoveryForms = PO3_SKSEFunctions.GetAllFormsInMod(arg, 43)
        EndIf
        int elapsed = ((Utility.GetCurrentRealTime() - started) * 1000.0) as int
        If discoveryForms.Length > 0
            Debug.Trace("[Living Past] Native probe enumerated " + discoveryForms.Length + " NPC forms in " + elapsed + " ms")
            ChronicleReply(id, op, True, discoveryForms.Length + "|" + elapsed)
        Else
            ChronicleReply(id, op, False, "")
        EndIf
    ElseIf op == "F" && discoveryForms.Length > 0 && arg == ((arg as int) as string)
        SendDiscoveryPage(id, arg as int)
    ElseIf op == "U" && arg == ""
        ChronicleReply(id, op, True, NativeProbeSnapshot())
    ElseIf op == "W"
        ChronicleReply(id, op, StoreNativeProbe(arg), "")
    ElseIf op == "Y" && arg == ""
        Actor player = Game.GetPlayer()
        int revision = StorageUtil.GetIntValue(player, "LivingPast.NativeProbe.Revision", 0)
        If revision > 0
            StorageUtil.SetIntValue(player, "LivingPast.NativeProbe.Revision", -revision)
        EndIf
        ChronicleReply(id, op, True, "")
    Else
        ChronicleReply(id, op, False, "")
    EndIf
EndFunction

Function SendDiscoveryPage(string id, int start)
    If start < 0 || start >= discoveryForms.Length
        ChronicleReply(id, "F", False, "")
        Return
    EndIf
    int cursor = start
    string payload = ""
    float started = Utility.GetCurrentRealTime()
    int limit = start + 160
    If start == 0
        limit = 16
        Debug.Trace("[Living Past] Native probe starting catalog page 0")
    EndIf
    While cursor < discoveryForms.Length && cursor < limit
        ActorBase base = discoveryForms[cursor] as ActorBase
        If NamedUniqueBase(base)
            string row = cursor + "|" + EncodeDiscoveryField(PO3_SKSEFunctions.GetFormModName(base, False)) + "|" + EncodeDiscoveryField(base.GetName()) + StringUtil.AsChar(10)
            If StringUtil.GetLength(row) <= 3840
                If StringUtil.GetLength(payload) + StringUtil.GetLength(row) > 3840
                    ReplyDiscoveryPage(id, start, cursor, started, payload)
                    Return
                EndIf
                payload += row
            EndIf
        EndIf
        cursor += 1
        If (cursor - start) % 4 == 0 && Utility.GetCurrentRealTime() - started >= 0.250
            ReplyDiscoveryPage(id, start, cursor, started, payload)
            Return
        EndIf
    EndWhile
    ReplyDiscoveryPage(id, start, cursor, started, payload)
EndFunction

Function ReplyDiscoveryPage(string id, int start, int cursor, float started, string payload)
    int elapsed = ((Utility.GetCurrentRealTime() - started) * 1000.0) as int
    If start == 0
        Debug.Trace("[Living Past] Native probe replying to catalog page 0 with " + StringUtil.GetLength(payload) + " row bytes in " + elapsed + " ms")
    EndIf
    ChronicleReply(id, "F", True, cursor + "|" + elapsed + "|" + payload)
EndFunction

string Function NativeProbeSnapshot()
    Actor player = Game.GetPlayer()
    int revision = StorageUtil.GetIntValue(player, "LivingPast.NativeProbe.Revision", 0)
    If revision <= 0
        Return "0|||"
    EndIf
    int bank = ((revision - 1) % 2) + 1
    ActorBase base = StorageUtil.GetFormValue(player, "LivingPast.NativeProbe.Base" + bank, None) as ActorBase
    string name = ""
    string pluginName = ""
    If base
        name = EncodeDiscoveryField(base.GetName())
        pluginName = EncodeDiscoveryField(PO3_SKSEFunctions.GetFormModName(base, False))
    EndIf
    Return revision + "|" + name + "|" + pluginName + "|" + StorageUtil.GetStringValue(player, "LivingPast.NativeProbe.History" + bank, "")
EndFunction

string Function EncodeDiscoveryField(string value)
    value = ReplaceProbeText(value, "%", "%25")
    value = ReplaceProbeText(value, StringUtil.AsChar(10), "%0A")
    value = ReplaceProbeText(value, StringUtil.AsChar(13), "%0D")
    Return ReplaceProbeText(value, "|", "%7C")
EndFunction

bool Function StoreNativeProbe(string arg)
    int delimiter = StringUtil.Find(arg, "|")
    If delimiter < 1 || discoveryForms.Length == 0
        Return False
    EndIf
    string indexText = StringUtil.Substring(arg, 0, delimiter)
    int index = indexText as int
    If index < 0 || index >= discoveryForms.Length || indexText != (index as string)
        Return False
    EndIf
    ActorBase base = discoveryForms[index] as ActorBase
    string history = StringUtil.Substring(arg, delimiter + 1)
    If !NamedUniqueBase(base) || history == "" || StringUtil.GetLength(history) > 2048
        Return False
    EndIf
    Actor player = Game.GetPlayer()
    int previous = StorageUtil.GetIntValue(player, "LivingPast.NativeProbe.Revision", 0)
    int magnitude = previous
    If magnitude < 0
        magnitude = -magnitude
    EndIf
    If magnitude >= 2147483646
        Return False
    EndIf
    int bank = (magnitude % 2) + 1
    string baseKey = "LivingPast.NativeProbe.Base" + bank
    string historyKey = "LivingPast.NativeProbe.History" + bank
    string encoded = EncodeProbeText(history)
    StorageUtil.SetFormValue(player, baseKey, base)
    StorageUtil.SetStringValue(player, historyKey, encoded)
    If StorageUtil.GetFormValue(player, baseKey, None) != base || StorageUtil.GetStringValue(player, historyKey, "") != encoded
        Return False
    EndIf
    StorageUtil.SetIntValue(player, "LivingPast.NativeProbe.Revision", magnitude + 1)
    Return True
EndFunction

Event OnLivingPastClose(string eventName, string strArg, float numArg, Form sender)
    If numArg as int != viewId
        Return
    EndIf
    discoverySession = ""
    discoveryForms = Utility.CreateFormArray(0)
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
