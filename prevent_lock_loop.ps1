# Prevent Windows Screen Lock
# Run this script in a separate PowerShell window
# Press Ctrl+C to stop

Add-Type -AssemblyName System.Windows.Forms

Write-Host "Screen lock prevention started. Press Ctrl+C to stop."
Write-Host "Mouse will move 1 pixel every 4 minutes."

while ($true) {
    $pos = [System.Windows.Forms.Cursor]::Position
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($pos.X + 1), $pos.Y)
    Start-Sleep -Milliseconds 50
    [System.Windows.Forms.Cursor]::Position = $pos
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Mouse moved. Screen lock prevented."
    Start-Sleep -Seconds 240  # 4 minutes
}