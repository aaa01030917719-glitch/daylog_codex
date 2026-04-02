param(
    [Parameter(Mandatory = $true, ParameterSetName = "Command")]
    [string]$Command,

    [Parameter(Mandatory = $true, ParameterSetName = "File")]
    [string]$FilePath,

    [Parameter(ParameterSetName = "File")]
    [string[]]$ArgumentList = @(),

    [ValidateSet("ntfy", "pushover")]
    [string]$Provider = "ntfy",

    [string]$TaskName = "Codex task",

    [string]$Topic,

    [string]$Server = "https://ntfy.sh",

    [string]$PushoverAppToken,

    [string]$PushoverUserKey,

    [string]$SuccessTag = "white_check_mark",

    [string]$FailureTag = "warning",

    [string]$WorkingDirectory,

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$notifyScript = Join-Path $scriptRoot "Send-CodexPush.ps1"

if (-not (Test-Path -LiteralPath $notifyScript)) {
    throw "Notification script not found: $notifyScript"
}

$startedAt = Get-Date
$commandDisplay = if ($PSCmdlet.ParameterSetName -eq "Command") {
    $Command
} elseif ($ArgumentList.Count -gt 0) {
    $FilePath + " " + ($ArgumentList -join " ")
} else {
    $FilePath
}

if ($DryRun) {
    & $notifyScript `
        -Provider $Provider `
        -Title "$TaskName dry run" `
        -Message "Preview only`n$commandDisplay" `
        -Tag $SuccessTag `
        -Topic $Topic `
        -Server $Server `
        -PushoverAppToken $PushoverAppToken `
        -PushoverUserKey $PushoverUserKey `
        -DryRun
    return
}

try {
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        Push-Location -LiteralPath $WorkingDirectory
    }

    if ($PSCmdlet.ParameterSetName -eq "Command") {
        powershell -NoProfile -Command $Command
        $exitCode = $LASTEXITCODE
    } else {
        & $FilePath @ArgumentList
        $exitCode = $LASTEXITCODE
    }

    if ($null -eq $exitCode) {
        $exitCode = 0
    }

    $finishedAt = Get-Date
    $duration = [math]::Round(($finishedAt - $startedAt).TotalSeconds, 1)

    if ($exitCode -eq 0) {
        & $notifyScript `
            -Provider $Provider `
            -Title "$TaskName completed" `
            -Message "Success in $duration sec`n$commandDisplay" `
            -Tag $SuccessTag `
            -Topic $Topic `
            -Server $Server `
            -PushoverAppToken $PushoverAppToken `
            -PushoverUserKey $PushoverUserKey `
            -DryRun:$DryRun
    } else {
        & $notifyScript `
            -Provider $Provider `
            -Title "$TaskName failed" `
            -Message "Exit code $exitCode after $duration sec`n$commandDisplay" `
            -Tag $FailureTag `
            -Priority high `
            -Topic $Topic `
            -Server $Server `
            -PushoverAppToken $PushoverAppToken `
            -PushoverUserKey $PushoverUserKey `
            -DryRun:$DryRun

        exit $exitCode
    }
}
catch {
    $finishedAt = Get-Date
    $duration = [math]::Round(($finishedAt - $startedAt).TotalSeconds, 1)
    $errorMessage = $_.Exception.Message

    & $notifyScript `
        -Provider $Provider `
        -Title "$TaskName crashed" `
        -Message "Error after $duration sec`n$commandDisplay`n$errorMessage" `
        -Tag $FailureTag `
        -Priority high `
        -Topic $Topic `
        -Server $Server `
        -PushoverAppToken $PushoverAppToken `
        -PushoverUserKey $PushoverUserKey `
        -DryRun:$DryRun

    throw
}
finally {
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        Pop-Location
    }
}
