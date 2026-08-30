Add-Type -AssemblyName System.Drawing

function New-VoltaIcon {
    param(
        [int]$Size,
        [string]$OutPath
    )

    $bg = [System.Drawing.Color]::FromArgb(255, 0xEF, 0xE7, 0xD9)   # #EFE7D9 creme

    # Geometrie reprise telle quelle du groupe "VOLTA emblem" de
    # public/logo-volta.svg (2026-08-30 — remplace l'ancienne flèche zigzag
    # dorée) : 2 <path>, mêmes coordonnées, voir aussi public/volta-mark.svg
    # (la même extraction sauvegardée en fichier SVG autonome) et
    # src/components/Logo.jsx (même mark en React).
    #   path 1 (dégradé citron -> lavande) : M-190 0 L-80 0 L55 235 L-8 340 Z
    #   path 2 (lavande pleine)            : M110 0 L225 0 L108 168 L174 168 L-8 435 L38 287 L-52 287 L72 112 L30 112 Z
    $path1Pts = @(@(-190, 0), @(-80, 0), @(55, 235), @(-8, 340))
    $path2Pts = @(@(110, 0), @(225, 0), @(108, 168), @(174, 168), @(-8, 435), @(38, 287), @(-52, 287), @(72, 112), @(30, 112))

    # Stops du dégradé SVG (0% / 48% / 100%) : System.Drawing.Drawing2D.LinearGradientBrush
    # ne supporte nativement qu'un dégradé à 2 couleurs par ce constructeur —
    # le stop intermédiaire à 48% (#D8C8E8, une teinte de transition proche
    # du milieu) est une nuance perdue ici, pas une erreur : un dégradé 2
    # points start->end reste visuellement très proche à l'échelle d'une
    # icône PWA 192/512px, sans dépendance supplémentaire (ImageMagick et le
    # module npm sharp ne sont pas installés dans cet environnement —
    # vérifié avant d'écrire ce script, System.Drawing reste la seule
    # option disponible, comme pour la version précédente).
    $gradStart = [System.Drawing.Color]::FromArgb(255, 0xD4, 0xF2, 0x4A)  # #D4F24A
    $gradEnd   = [System.Drawing.Color]::FromArgb(255, 0xA7, 0x8B, 0xFA)  # #A78BFA
    $solid     = [System.Drawing.Color]::FromArgb(255, 0xA7, 0x8B, 0xFA)  # #A78BFA (path 2, plein)

    # Bounding box réelle du tracé combiné (les 2 formes) : x -190..225, y 0..435.
    $minX = -190.0; $maxX = 225.0
    $minY = 0.0; $maxY = 435.0
    $boxW = $maxX - $minX
    $boxH = $maxY - $minY

    # Le mark occupe 62% de la largeur du canevas, centré dans les deux axes
    # (même convention que la version précédente du script).
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

    $path1Mapped = [System.Drawing.PointF[]]($path1Pts | ForEach-Object { Map-Point $_ })
    $path2Mapped = [System.Drawing.PointF[]]($path2Pts | ForEach-Object { Map-Point $_ })

    # Rectangle englobant du path 1 seul (pas du mark entier) — le SVG
    # source définit x1/y1 0%/0% -> x2/y2 100%/100% en objectBoundingBox,
    # donc relatif à la boîte de CETTE forme, pas à l'ensemble du mark.
    $p1MinX = ($path1Mapped | ForEach-Object { $_.X } | Measure-Object -Minimum).Minimum
    $p1MaxX = ($path1Mapped | ForEach-Object { $_.X } | Measure-Object -Maximum).Maximum
    $p1MinY = ($path1Mapped | ForEach-Object { $_.Y } | Measure-Object -Minimum).Minimum
    $p1MaxY = ($path1Mapped | ForEach-Object { $_.Y } | Measure-Object -Maximum).Maximum
    $p1Bounds = New-Object System.Drawing.RectangleF($p1MinX, $p1MinY, ($p1MaxX - $p1MinX), ($p1MaxY - $p1MinY))

    # Angle du dégradé calculé depuis la vraie diagonale de cette boîte
    # (coin haut-gauche -> coin bas-droit), pas un 45° arbitraire — l'angle
    # d'un dégradé 0%/0% -> 100%/100% dépend du ratio largeur/hauteur de sa
    # propre boîte, invariant à l'échelle puisque Map-Point applique le
    # même facteur en x et en y.
    $angleDeg = [Math]::Atan2(($p1MaxY - $p1MinY), ($p1MaxX - $p1MinX)) * 180.0 / [Math]::PI

    $brush1 = New-Object System.Drawing.Drawing2D.LinearGradientBrush($p1Bounds, $gradStart, $gradEnd, [float]$angleDeg)
    $g.FillPolygon($brush1, $path1Mapped)

    $brush2 = New-Object System.Drawing.SolidBrush($solid)
    $g.FillPolygon($brush2, $path2Mapped)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $brush1.Dispose()
    $brush2.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

New-VoltaIcon -Size 192 -OutPath "public/icon-192.png"
New-VoltaIcon -Size 512 -OutPath "public/icon-512.png"

Write-Host "Icones regenerees : public/icon-192.png, public/icon-512.png"
