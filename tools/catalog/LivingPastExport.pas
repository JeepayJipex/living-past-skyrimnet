unit UserScript;

// Read-only export. Run on all loaded files in script mode.
const
  NPC_FLAG_UNIQUE = $00000020;

var
  candidates, counts: TStringList;
  deletedCount, disabledCount, nonPersistentCount, badBaseCount: Integer;
  unnamedCount, nonUniqueCount, conditionalCount, ambiguousCount: Integer;

function JsonString(s: string): string;
var i: Integer;
begin
  Result := StringReplace(s, '\', '\\', [rfReplaceAll]);
  Result := StringReplace(Result, '"', '\"', [rfReplaceAll]);
  for i := 0 to 31 do
    Result := StringReplace(Result, Chr(i), '\u' + IntToHex(i, 4), [rfReplaceAll]);
  Result := '"' + Result + '"';
end;

function Identity(e: IInterface): string;
var origin: IInterface;
begin
  origin := MasterOrSelf(e);
  Result := '{"plugin":' + JsonString(GetFileName(GetFile(origin))) +
    ',"localId":"' + IntToHex(FixedFormID(origin) and $00FFFFFF, 6) + '"}';
end;

function Initialize: Integer;
begin
  candidates := TStringList.Create;
  candidates.Sorted := True;
  candidates.Duplicates := dupError;
  counts := TStringList.Create;
  counts.Sorted := True;
  counts.Duplicates := dupAccept;
  Result := 0;
end;

function Process(e: IInterface): Integer;
var ref, base, origin, cell: IInterface;
    key, row, name, baseKey, location: string;
begin
  Result := 0;
  if Signature(e) <> 'ACHR' then Exit;
  // Process the origin once, while inspecting the profile's winning override.
  if not IsMaster(e) then Exit;
  ref := WinningOverride(e);
  if GetIsDeleted(ref) then begin Inc(deletedCount); Exit; end;
  if GetIsInitiallyDisabled(ref) then begin Inc(disabledCount); Exit; end;
  if not GetIsPersistent(ref) then begin Inc(nonPersistentCount); Exit; end;
  if ElementExists(ref, 'XESP') then begin Inc(conditionalCount); Exit; end;
  base := LinksTo(ElementBySignature(ref, 'NAME'));
  if not Assigned(base) then begin Inc(badBaseCount); Exit; end;
  base := WinningOverride(base);
  if (Signature(base) <> 'NPC_') or GetIsDeleted(base) then begin Inc(badBaseCount); Exit; end;
  if ElementExists(base, 'TPLT') then begin Inc(badBaseCount); Exit; end;
  if (GetElementNativeValues(base, 'ACBS\Flags') and NPC_FLAG_UNIQUE) = 0 then begin Inc(nonUniqueCount); Exit; end;
  name := Trim(GetElementEditValues(base, 'FULL'));
  if name = '' then begin Inc(unnamedCount); Exit; end;
  origin := MasterOrSelf(ref);
  key := LowerCase(GetFileName(GetFile(origin))) + ':' + IntToHex(FixedFormID(origin) and $00FFFFFF, 6);
  origin := MasterOrSelf(base);
  baseKey := LowerCase(GetFileName(GetFile(origin))) + ':' + IntToHex(FixedFormID(origin) and $00FFFFFF, 6);
  // A placed actor belongs to a reference group whose ChildrenOf is its CELL.
  cell := GetContainer(ref);
  while Assigned(cell) and (ElementType(cell) <> etGroupRecord) do
    cell := GetContainer(cell);
  if Assigned(cell) then cell := ChildrenOf(cell);
  location := '';
  if Assigned(cell) then
    if Signature(cell) = 'CELL' then location := EditorID(cell);
  row := '{"reference":' + Identity(ref) + ',"base":' + Identity(base) +
    ',"name":' + JsonString(name) + ',"editorId":' + JsonString(EditorID(base)) +
    ',"location":' + JsonString(location) + '}';
  counts.Add(baseKey);
  candidates.Add(key + '=' + baseKey + #9 + row);
end;

function Finalize: Integer;
var output: TStringList; document: TJsonObject; i, n, tab, included: Integer;
    value, baseKey, row, path: string;
begin
  Result := 0;
  output := TStringList.Create;
  output.Add('{"schemaVersion":1,"actors":[');
  included := 0;
  for i := 0 to candidates.Count - 1 do begin
    value := candidates.ValueFromIndex[i];
    tab := Pos(#9, value);
    baseKey := Copy(value, 1, tab - 1);
    row := Copy(value, tab + 1, Length(value));
    n := counts.IndexOf(baseKey);
    if n > 0 then
      if counts[n - 1] = baseKey then n := -1;
    if n >= 0 then
      if n < counts.Count - 1 then
        if counts[n + 1] = baseKey then n := -1;
    if n < 0 then Inc(ambiguousCount)
    else begin
      if included > 0 then output[output.Count - 1] := output[output.Count - 1] + ',';
      output.Add(row);
      Inc(included);
    end;
  end;
  output.Add('],"exclusions":{"deleted":' + IntToStr(deletedCount) +
    ',"initiallyDisabled":' + IntToStr(disabledCount) +
    ',"nonPersistent":' + IntToStr(nonPersistentCount) +
    ',"invalidBase":' + IntToStr(badBaseCount) +
    ',"unnamed":' + IntToStr(unnamedCount) +
    ',"nonUnique":' + IntToStr(nonUniqueCount) +
    ',"conditional":' + IntToStr(conditionalCount) +
    ',"ambiguous":' + IntToStr(ambiguousCount) + '}}');
  path := ScriptsPath + 'LivingPast-catalog.json';
  if FileExists(path) then begin
    AddMessage('Living Past export refused to overwrite ' + path);
    output.Free;
    candidates.Free;
    counts.Free;
    Result := 1;
    Exit;
  end;
  document := TJsonObject.Parse(output.Text);
  document.SaveToFile(path, False);
  document.Free;
  AddMessage('Living Past catalog: ' + IntToStr(included) + ' actors, ' +
    IntToStr(deletedCount + disabledCount + nonPersistentCount + badBaseCount + unnamedCount + nonUniqueCount + conditionalCount + ambiguousCount) + ' excluded.');
  AddMessage('Catalog saved to ' + path);
  output.Free;
  candidates.Free;
  counts.Free;
end;
end.
