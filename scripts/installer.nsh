; Custom NSIS hooks for Microsoft Store EXE installer handling.
;
; Partner Center requires unique return-code values per scenario. Electron Builder
; includes this file through the `build.nsis.include` setting in package.json.

!macro preInit
  ; Electron Builder checks the same mutex later and aborts when another installer
  ; instance is already running. We check it first so the installer exits with the
  ; Microsoft Store "installation already in progress" code instead of the generic
  ; NSIS abort code.
  System::Call 'kernel32::OpenMutex(i 0x100000, i 0, t"${APP_GUID}") p.r0'
  IntCmp $0 0 done done alreadyRunning

  alreadyRunning:
    System::Call 'kernel32::CloseHandle(p r0)'
    SetErrorLevel 1618
    Quit

  done:
!macroend

!macro customHeader
  ; User cancellation maps to ERROR_CANCELLED for Microsoft Store reporting.
  Function .onUserAbort
    SetErrorLevel 1223
  FunctionEnd
!macroend
