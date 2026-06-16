# GitHub API Helper Script
$PAT = "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"
$headers = @{
    Authorization = "Bearer $PAT"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# Step 1: Make repo public
Write-Host "`n[1/3] Making repo public..." -ForegroundColor Cyan
$repoBody = @{ private = $false } | ConvertTo-Json
try {
    $repoResult = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/gulinginaja/RekberBang" `
        -Method PATCH `
        -Headers $headers `
        -Body $repoBody `
        -ContentType "application/json"
    Write-Host "  Repo visibility: $($repoResult.visibility)" -ForegroundColor Green
} catch {
    Write-Host "  Repo may already be public or error: $_" -ForegroundColor Yellow
}

# Step 2: Enable GitHub Pages with workflow source
Write-Host "`n[2/3] Enabling GitHub Pages..." -ForegroundColor Cyan
$pagesBody = @{ build_type = "workflow" } | ConvertTo-Json
try {
    $pagesResult = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/gulinginaja/RekberBang/pages" `
        -Method POST `
        -Headers $headers `
        -Body $pagesBody `
        -ContentType "application/json"
    Write-Host "  Pages URL: $($pagesResult.html_url)" -ForegroundColor Green
    Write-Host "  Status: $($pagesResult.status)" -ForegroundColor Green
} catch {
    $errBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($errBody.message -like "*already*" -or $_.Exception.Response.StatusCode -eq 409) {
        Write-Host "  Pages already enabled!" -ForegroundColor Yellow
    } else {
        Write-Host "  Pages error: $($errBody.message)" -ForegroundColor Red
    }
}

# Step 3: Check pages status
Write-Host "`n[3/3] Checking Pages status..." -ForegroundColor Cyan
try {
    $statusResult = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/gulinginaja/RekberBang/pages" `
        -Method GET `
        -Headers $headers
    Write-Host "  URL:    $($statusResult.html_url)" -ForegroundColor Green
    Write-Host "  Status: $($statusResult.status)" -ForegroundColor Green
    Write-Host "  Source: $($statusResult.build_type)" -ForegroundColor Green
} catch {
    Write-Host "  Pages not yet configured: $_" -ForegroundColor Red
}

Write-Host "`nDone!" -ForegroundColor Green
