Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
rootDir = fso.GetParentFolderName(scriptDir)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = rootDir
WshShell.Run """" & scriptDir & "\anbarmeh_server_runner.bat""", 0, False
Set WshShell = Nothing
Set fso = Nothing