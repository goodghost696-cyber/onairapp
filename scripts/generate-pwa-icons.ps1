Add-Type -AssemblyName System.Drawing

function New-VoltaIcon {
    param(
        [int]$Size,
        [string]$OutPath
    )

    $bg = [System.Drawing.Color]::FromArgb(255, 0xEF, 0xE7, 0xD9)   # #EFE7D9 creme
    $fg = [System.Drawing.Color]::FromArgb(255, 0xF0, 0xC1, 0x4B)   # #F0C14B or (mark VOLTA)

    # Geometrie reprise telle quelle de public/logo-volta.svg :
    # viewBox="-1 -1 26 26", polyline "1 18 8.5 10.5 13.5 15.5 23 6" (ligne montante)
    # + polyline "17 6 23 6 23 12" (chevron terminal), stroke-width 2.4, round cap/join.
    $mainPts = @(
        @(1, 18), @(8.5, 10.5), @(13.5, 15.5), @(23, 6)
    )
    $chevronPts = @(
        @(17, 6), @(23, 6), @(23, 12)
    )

    # Bounding box reel du tracé (pas le viewBox entier) : x 1..23, y 6..18.
    $minX = 1.0; $maxX = 23.0
    $minY = 6.0; $maxY = 18.0
    $boxW = $maxX - $minX
    $boxH = $maxY - $minY

    # Le mark occupe 62% de la largeur du canevas, centre dans les deux axes.
    $targetW = $Size * 0.62
    $scale = $targetW / $boxW
    $markW = $boxW * $scale
    $markH = $boxH * $scale
    $offsetX = ($Size - $markW) / 2.0
    $offsetY = ($Size - $markH) / 2.0

    function Map-Point($pt) {
        $x = $offsetX + ($pt[0] - $minX) * $scale
        $y = $offsetY + ($pt[1] - $minY) * $scale
        return New-Object System.Drawing.PointF($x, $y)
    }

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear($bg)

    $strokeWidth = 2.4 * $scale
    $pen = New-Object System.Drawing.Pen($fg, $strokeWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $mainMapped = $mainPts | ForEach-Object { Map-Point $_ }
    $g.DrawLines($pen, [System.Drawing.PointF[]]$mainMapped)

    $chevronMapped = $chevronPts | ForEach-Object { Map-Point $_ }
    $g.DrawLines($pen, [System.Drawing.PointF[]]$chevronMapped)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $pen.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

New-VoltaIcon -Size 192 -OutPath "public/icon-192.png"
New-VoltaIcon -Size 512 -OutPath "public/icon-512.png"

Write-Host "Icones regenerees : public/icon-192.png, public/icon-512.png"
