$ErrorActionPreference = "SilentlyContinue"

# ==========================================
# 1. SETUP KEYS
# ==========================================

$TidalKeys = @(
    @{ Name="triton"; Url="https://triton.squid.wtf" },
    @{ Name="hund"; Url="https://hund.qqdl.site" },
    @{ Name="katze"; Url="https://katze.qqdl.site" },
    @{ Name="maus"; Url="https://maus.qqdl.site" },
    @{ Name="vogel"; Url="https://vogel.qqdl.site" },
    @{ Name="wolf"; Url="https://wolf.qqdl.site" },
    @{ Name="kinoplus"; Url="https://tidal.kinoplus.online" },
    @{ Name="binimum"; Url="https://tidal-api.binimum.org" }
)

$QobuzKeys = @(
    @{ Name="dab"; Url="https://dab.yeet.su/api/stream"; Param="trackId"; Quality="7" },
    @{ Name="dabmusic"; Url="https://dabmusic.xyz/api/stream"; Param="trackId"; Quality="7" },
    @{ Name="squid"; Url="https://qobuz.squid.wtf/api/download-music"; Param="track_id"; Quality=$null }
)

# ==========================================
# 2. FIND TEST IDS
# ==========================================

Write-Host "`n🎵 FETCHING TEST IDS..." -ForegroundColor Cyan

# Tidal ID (Fixed)
$TidalID = "488503815" # Sahana Sahana
Write-Host "• Using Tidal ID: $TidalID" -ForegroundColor Gray

# Qobuz ID (Dynamic Search via Squid)
$QobuzID = $null
try {
    $search = Invoke-RestMethod -Uri "https://qobuz.squid.wtf/api/get-music?query=Sahana%20Sahana" -TimeoutSec 5
    if ($search.tracks.items.Count -gt 0) {
        $QobuzID = $search.tracks.items[0].id
        Write-Host "• Found Qobuz ID: $QobuzID (via squid)" -ForegroundColor Gray
    } else {
        Write-Host "• Qobuz Search returned no results. Using fallback ID." -ForegroundColor Yellow
        $QobuzID = "52097746" # Shape of You (Backup)
    }
} catch {
    Write-Host "• Qobuz Search Failed. Using fallback ID." -ForegroundColor Red
    $QobuzID = "52097746" # Shape of You
}

# ==========================================
# 3. TEST TIDAL KEYS
# ==========================================

Write-Host "`n🌊 TESTING TIDAL KEYS (LOSSLESS)..." -ForegroundColor Cyan

foreach ($key in $TidalKeys) {
    $url = "$($key.Url)/track/?id=$TidalID&quality=LOSSLESS"
    $start = Get-Date

    try {
        $res = Invoke-RestMethod -Uri $url -TimeoutSec 5
        $duration = ((Get-Date) - $start).TotalMilliseconds
        
        $status = "FAILED"
        $color = "Red"
        $details = ""

        # Check for success indicators
        if ($res.data -and $res.data.manifest) {
            $status = "PASS"
            $color = "Green"
            $quality = $res.data.audioQuality
            $details = "[$quality]"
        } elseif ($res -and $res.manifest) {
            $status = "PASS"
            $color = "Green"
            $quality = $res.audioQuality
            $details = "[$quality]"
        } else {
            $details = "(Invaild Response)"
        }

        Write-Host "[$($key.Name)]".PadRight(12) -NoNewline
        Write-Host "$status".PadRight(8) -ForegroundColor $color -NoNewline
        Write-Host "$([math]::Round($duration))ms $details"
    } catch {
        Write-Host "[$($key.Name)]".PadRight(12) -NoNewline
        Write-Host "ERROR".PadRight(8) -ForegroundColor Red -NoNewline
        Write-Host "($($_.Exception.Message))"
    }
}

# ==========================================
# 4. TEST QOBUZ KEYS
# ==========================================

Write-Host "`n🎧 TESTING QOBUZ KEYS (HI-RES)..." -ForegroundColor Cyan

if (-not $QobuzID) {
    Write-Host "Skipping Qobuz tests (No ID found)" -ForegroundColor Red
} else {
    foreach ($key in $QobuzKeys) {
        $url = "$($key.Url)?$($key.Param)=$QobuzID"
        if ($key.Quality) { $url += "&quality=$($key.Quality)" }
        
        $start = Get-Date

        try {
            # Fake User-Agent to avoid some blocks
            $res = Invoke-RestMethod -Uri $url -TimeoutSec 8 -Headers @{"User-Agent"="Mozilla/5.0"}
            $duration = ((Get-Date) - $start).TotalMilliseconds

            $status = "FAILED"
            $color = "Red"
            $details = ""

            if ($res.url -or $res.stream_url -or $res.link) {
                $status = "PASS"
                $color = "Green"
                $details = "[24-bit FLAC]"
            } else {
                $details = "(No URL found)"
            }

            Write-Host "[$($key.Name)]".PadRight(12) -NoNewline
            Write-Host "$status".PadRight(8) -ForegroundColor $color -NoNewline
            Write-Host "$([math]::Round($duration))ms $details"

        } catch {
            Write-Host "[$($key.Name)]".PadRight(12) -NoNewline
            Write-Host "ERROR".PadRight(8) -ForegroundColor Red -NoNewline
            Write-Host "($($_.Exception.Message))"
        }
    }
}

Write-Host "`n✅ Verification Complete.`n"
