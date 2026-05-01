Add-Type -AssemblyName System.Windows.Forms
$pos = [System.Windows.Forms.Cursor]::Position
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($pos.X + 1), $pos.Y)
Start-Sleep -Milliseconds 50
[System.Windows.Forms.Cursor]::Position = $pos