param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("ntfy", "pushover")]
    [string]$Provider,

    [string]$Title = "Codex",

    [Parameter(Mandatory = $true)]
    [string]$Message,

    [string]$Tag = "computer",

    [ValidateSet("min", "low", "default", "high", "max")]
    [string]$Priority = "default",

    [string]$Topic,

    [string]$Server = "https://ntfy.sh",

    [string]$PushoverAppToken,

    [string]$PushoverUserKey,

    [switch]$PassThru,

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-NtfyPriority {
    param(
        [string]$Name
    )

    switch ($Name) {
        "min" { return "min" }
        "low" { return "low" }
        "high" { return "high" }
        "max" { return "max" }
        default { return "default" }
    }
}

function Resolve-PushoverPriority {
    param(
        [string]$Name
    )

    switch ($Name) {
        "min" { return -2 }
        "low" { return -1 }
        "high" { return 1 }
        "max" { return 2 }
        default { return 0 }
    }
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    throw "Message must not be empty."
}

switch ($Provider) {
    "ntfy" {
        if ([string]::IsNullOrWhiteSpace($Topic)) {
            throw "Topic is required when Provider is 'ntfy'."
        }

        $normalizedServer = $Server.TrimEnd("/")
        $uri = "{0}/{1}" -f $normalizedServer, $Topic
        $headers = @{
            "Title"    = $Title
            "Tags"     = $Tag
            "Priority" = (Resolve-NtfyPriority -Name $Priority)
        }

        if ($DryRun) {
            $result = [pscustomobject]@{
                Provider = "ntfy"
                Uri      = $uri
                Headers  = $headers
                Message  = $Message
                DryRun   = $true
            }
            if ($PassThru) {
                return $result
            }
            $result | Format-List | Out-String | Write-Host
            return
        }

        $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $Message -ContentType "text/plain; charset=utf-8"
        if ($PassThru) {
            return $response
        }
    }

    "pushover" {
        if ([string]::IsNullOrWhiteSpace($PushoverAppToken)) {
            throw "PushoverAppToken is required when Provider is 'pushover'."
        }
        if ([string]::IsNullOrWhiteSpace($PushoverUserKey)) {
            throw "PushoverUserKey is required when Provider is 'pushover'."
        }

        $uri = "https://api.pushover.net/1/messages.json"
        $body = @{
            token    = $PushoverAppToken
            user     = $PushoverUserKey
            title    = $Title
            message  = $Message
            priority = (Resolve-PushoverPriority -Name $Priority)
        }

        if ($DryRun) {
            $result = [pscustomobject]@{
                Provider = "pushover"
                Uri      = $uri
                Body     = $body
                DryRun   = $true
            }
            if ($PassThru) {
                return $result
            }
            $result | Format-List | Out-String | Write-Host
            return
        }

        $response = Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType "application/x-www-form-urlencoded"
        if ($PassThru) {
            return $response
        }
    }
}
