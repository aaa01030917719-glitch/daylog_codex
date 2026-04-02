# Local Push Notifications

These scripts send a phone notification when a local command finishes.

## Files

- `Send-CodexPush.ps1`: send a push notification through `ntfy` or `Pushover`
- `Invoke-WithCodexNotification.ps1`: run a command and notify on success/failure

## ntfy quick start

1. Install the `ntfy` app on your phone.
2. Subscribe to a unique topic such as `my-codex-finish-12345`.
3. Test:

```powershell
powershell -ExecutionPolicy Bypass -File C:\daylog_codex\scripts\notifications\Send-CodexPush.ps1 `
  -Provider ntfy `
  -Topic my-codex-finish-12345 `
  -Title "Codex test" `
  -Message "Hello from Windows"
```

4. Wrap a command:

```powershell
powershell -ExecutionPolicy Bypass -File C:\daylog_codex\scripts\notifications\Invoke-WithCodexNotification.ps1 `
  -Provider ntfy `
  -Topic my-codex-finish-12345 `
  -TaskName "npm build" `
  -WorkingDirectory C:\daylog_codex `
  -Command "npm run build"
```

## Pushover quick start

1. Install the Pushover app and create an account.
2. Create an application/API token.
3. Copy your user key from the Pushover dashboard.
4. Test:

```powershell
powershell -ExecutionPolicy Bypass -File C:\daylog_codex\scripts\notifications\Send-CodexPush.ps1 `
  -Provider pushover `
  -PushoverAppToken "YOUR_APP_TOKEN" `
  -PushoverUserKey "YOUR_USER_KEY" `
  -Title "Codex test" `
  -Message "Hello from Windows"
```

## Dry run

Use `-DryRun` to preview the payload without sending anything:

```powershell
powershell -ExecutionPolicy Bypass -File C:\daylog_codex\scripts\notifications\Invoke-WithCodexNotification.ps1 `
  -Provider ntfy `
  -Topic my-codex-finish-12345 `
  -TaskName "demo" `
  -Command "Start-Sleep -Seconds 1" `
  -DryRun
```
