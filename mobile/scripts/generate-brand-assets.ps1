Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Common -ErrorAction SilentlyContinue

$assetDir = Join-Path $PSScriptRoot "..\assets"
$null = New-Item -ItemType Directory -Force -Path $assetDir
$format = [System.Drawing.Imaging.ImageFormat]::Png

function C([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

function Draw-Path($g, [string]$fill, [string]$stroke, [single]$width) {
  $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $p.StartFigure()
  $p.AddBezier(256, 118, 286, 134, 319, 143, 345, 153)
  $p.AddLine(345, 153, 337, 246)
  $p.AddBezier(337, 246, 333, 294, 296, 329, 256, 356)
  $p.AddBezier(256, 356, 216, 329, 179, 294, 175, 246)
  $p.AddLine(175, 246, 167, 153)
  $p.AddBezier(167, 153, 193, 143, 226, 134, 256, 118)
  $p.CloseFigure()
  if ($fill -ne "none") {
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new(160, 118, 192, 238), (C $fill), (C "#130B09"), [single]35)
    $g.FillPath($brush, $p); $brush.Dispose()
  }
  if ($stroke -ne "none") { $pen = [System.Drawing.Pen]::new((C $stroke), $width); $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round; $g.DrawPath($pen, $p); $pen.Dispose() }
  return $p
}

function Draw-Leaf($g, [single]$x, [single]$y, [single]$angle, [string]$color) {
  $state = $g.Save(); $g.TranslateTransform($x, $y); $g.RotateTransform($angle)
  $b = [System.Drawing.SolidBrush]::new((C $color)); $p = [System.Drawing.Pen]::new((C "#D7B65F"), [single]1.1)
  $g.FillEllipse($b, -11, -5, 22, 10); $g.DrawLine($p, -7, 0, 8, 0)
  $b.Dispose(); $p.Dispose(); $g.Restore($state)
}

function Draw-Star($g, [single]$x, [single]$y, [single]$radius, [string]$color) {
  $pts = [System.Collections.Generic.List[System.Drawing.PointF]]::new()
  for ($i = 0; $i -lt 16; $i++) {
    $a = (-[Math]::PI / 2) + ($i * [Math]::PI / 8)
    $r = if (($i % 2) -eq 0) { $radius } else { $radius * 0.31 }
    $pts.Add([System.Drawing.PointF]::new($x + [single]([Math]::Cos($a) * $r), $y + [single]([Math]::Sin($a) * $r)))
  }
  $b = [System.Drawing.SolidBrush]::new((C $color)); $g.FillPolygon($b, $pts.ToArray()); $b.Dispose()
}

function Draw-Crest($g, [single]$scale, [string]$mode) {
  $saved = $g.Save(); $g.TranslateTransform(256, 256); $g.ScaleTransform($scale, $scale); $g.TranslateTransform(-256, -256)
  if ($mode -eq "mono") {
    $white = "#FFF8E7"; $none = "none"
    $shield = Draw-Path $g $white $white 3
    $g.FillPolygon([System.Drawing.SolidBrush]::new((C $white)), [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new(199, 214), [System.Drawing.PointF]::new(252, 228), [System.Drawing.PointF]::new(252, 273), [System.Drawing.PointF]::new(199, 259)))
    $g.FillPolygon([System.Drawing.SolidBrush]::new((C $white)), [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new(260, 228), [System.Drawing.PointF]::new(313, 214), [System.Drawing.PointF]::new(313, 259), [System.Drawing.PointF]::new(260, 273)))
    $g.FillPolygon([System.Drawing.SolidBrush]::new((C $white)), [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new(256, 149), [System.Drawing.PointF]::new(271, 181), [System.Drawing.PointF]::new(261, 196), [System.Drawing.PointF]::new(256, 187), [System.Drawing.PointF]::new(249, 200), [System.Drawing.PointF]::new(241, 184)))
    $shield.Dispose(); $g.Restore($saved); return
  }

  $deep = if ($mode -eq "foreground") { "#180F0B" } else { "#240F0D" }
  $gold = "#E3C174"; $bright = "#F2D58C"; $dim = "#9A7136"; $page = "#E9D6A0"; $pageEdge = "#A98245"
  $shield = Draw-Path $g $deep $gold 3.2
  $inner = [System.Drawing.Pen]::new((C $dim), [single]1.25); $inner.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Solid
  $g.DrawLine($inner, 184, 164, 256, 139); $g.DrawLine($inner, 256, 139, 328, 164)
  $g.DrawLine($inner, 184, 164, 190, 239); $g.DrawLine($inner, 328, 164, 322, 239)
  $inner.Dispose()

  # Rising ember above an open chronicle: a distinct, readable mark at launcher size.
  $firePts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(256, 150), [System.Drawing.PointF]::new(276, 179), [System.Drawing.PointF]::new(269, 195),
    [System.Drawing.PointF]::new(261, 188), [System.Drawing.PointF]::new(256, 204), [System.Drawing.PointF]::new(247, 194),
    [System.Drawing.PointF]::new(240, 202), [System.Drawing.PointF]::new(237, 185), [System.Drawing.PointF]::new(247, 168))
  $fb = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new(237, 150, 39, 54), (C $bright), (C "#B94425"), [single]90)
  $g.FillPolygon($fb, $firePts); $fb.Dispose()
  $innerFire = [System.Drawing.SolidBrush]::new((C "#FFF0C3"))
  $g.FillPolygon($innerFire, [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(256, 174), [System.Drawing.PointF]::new(264, 187), [System.Drawing.PointF]::new(256, 196), [System.Drawing.PointF]::new(250, 190)))
  $innerFire.Dispose()

  # Open book, with page edges and a centered binding.
  $pageBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new(199, 212, 114, 65), (C "#F5E5B7"), (C $page), [single]90)
  $left = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(199, 212), [System.Drawing.PointF]::new(252, 226), [System.Drawing.PointF]::new(252, 274), [System.Drawing.PointF]::new(199, 258))
  $right = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(260, 226), [System.Drawing.PointF]::new(313, 212), [System.Drawing.PointF]::new(313, 258), [System.Drawing.PointF]::new(260, 274))
  $g.FillPolygon($pageBrush, $left); $g.FillPolygon($pageBrush, $right); $pageBrush.Dispose()
  $edge = [System.Drawing.Pen]::new((C $pageEdge), [single]2.0); $edge.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPolygon($edge, $left); $g.DrawPolygon($edge, $right); $g.DrawLine($edge, 256, 224, 256, 276); $edge.Dispose()
  $rule = [System.Drawing.Pen]::new((C "#AE8952"), [single]1.25)
  foreach ($y in @(231, 240, 249)) { $g.DrawLine($rule, 207, $y, 243, $y + 9); $g.DrawLine($rule, 269, $y + 9, 305, $y) }
  $rule.Dispose()
  $base = [System.Drawing.Pen]::new((C $bright), [single]3); $g.DrawArc($base, 198, 260, 116, 23, 8, 164); $base.Dispose()

  # Small laurel leaves frame the shield without crowding its silhouette.
  foreach ($i in 0..3) {
    $y = 232 - ($i * 19)
    Draw-Leaf $g (183 - ($i * 2)) $y (-35 + ($i * 4)) "#B28B48"
    Draw-Leaf $g (329 + ($i * 2)) $y (215 - ($i * 4)) "#B28B48"
  }
  Draw-Star $g 256 112 8 $bright
  $shield.Dispose(); $g.Restore($saved)
}

function Save-Image([string]$path, [int]$width, [int]$height, [string]$kind) {
  $bmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($kind -eq "icon") {
    $bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new(0, 0, $width, $height), (C "#21140D"), (C "#080604"), [single]55)
    $g.FillRectangle($bg, 0, 0, $width, $height); $bg.Dispose()
    $g.ScaleTransform($width / 512.0, $height / 512.0)
    $disc = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new(42, 42, 428, 428), (C "#432C19"), (C "#100A06"), [single]45)
    $g.FillEllipse($disc, 42, 42, 428, 428); $disc.Dispose()
    $outer = [System.Drawing.Pen]::new((C "#CBA858"), [single]3.2); $g.DrawEllipse($outer, 48, 48, 416, 416); $outer.Dispose()
    $thin = [System.Drawing.Pen]::new((C "#72532D"), [single]1.5); $g.DrawEllipse($thin, 61, 61, 390, 390); $thin.Dispose()
    for ($i=0; $i -lt 24; $i++) { $a = $i * [Math]::PI / 12; $r1=197; $r2=if (($i%3)-eq 0) { 211 } else { 203 }; $p=[System.Drawing.Pen]::new((C "#9A753D"), [single]1.1); $g.DrawLine($p, 256+[Math]::Cos($a)*$r1, 256+[Math]::Sin($a)*$r1, 256+[Math]::Cos($a)*$r2, 256+[Math]::Sin($a)*$r2); $p.Dispose() }
    Draw-Crest $g 1.45 "color"
  } elseif ($kind -eq "foreground") {
    $g.ScaleTransform($width / 512.0, $height / 512.0); Draw-Crest $g 1.22 "foreground"
  } elseif ($kind -eq "mono") {
    $g.ScaleTransform($width / 512.0, $height / 512.0); Draw-Crest $g 1.22 "mono"
  } elseif ($kind -eq "background") {
    $bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new(0, 0, $width, $height), (C "#21140D"), (C "#080604"), [single]45)
    $g.FillRectangle($bg, 0, 0, $width, $height); $bg.Dispose()
    $p = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(40, 203, 168, 88), [single]2); $g.DrawEllipse($p, $width*0.13, $height*0.13, $width*0.74, $height*0.74); $p.Dispose()
  } elseif ($kind -eq "splash") {
    $g.ScaleTransform($width / 512.0, $height / 640.0)
    $disc = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new(48, 48, 416, 416), (C "#432C19"), (C "#100A06"), [single]45)
    $g.FillEllipse($disc, 48, 48, 416, 416); $disc.Dispose()
    $outer = [System.Drawing.Pen]::new((C "#CBA858"), [single]3); $g.DrawEllipse($outer, 48, 48, 416, 416); $outer.Dispose()
    $inner = [System.Drawing.Pen]::new((C "#72532D"), [single]1.5); $g.DrawEllipse($inner, 61, 61, 390, 390); $inner.Dispose()
    Draw-Crest $g 1.45 "color"
    $title = [System.Drawing.Font]::new("Georgia", [single]38, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $subtitle = [System.Drawing.Font]::new("Georgia", [single]18, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $goldBrush = [System.Drawing.SolidBrush]::new((C "#E3C174")); $subBrush = [System.Drawing.SolidBrush]::new((C "#C7B590"))
    $fmt = [System.Drawing.StringFormat]::new(); $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString("KRONİKLER", $title, $goldBrush, [single]256, [single]474, $fmt)
    $g.DrawString("KÜLLERİN MİRASI", $subtitle, $subBrush, [single]256, [single]520, $fmt)
    $fmt.Dispose(); $title.Dispose(); $subtitle.Dispose(); $goldBrush.Dispose(); $subBrush.Dispose()
  }
  $bmp.Save($path, $format); $g.Dispose(); $bmp.Dispose()
}

Save-Image (Join-Path $assetDir "icon.png") 1024 1024 "icon"
Save-Image (Join-Path $assetDir "android-icon-foreground.png") 1024 1024 "foreground"
Save-Image (Join-Path $assetDir "android-icon-background.png") 1024 1024 "background"
Save-Image (Join-Path $assetDir "android-icon-monochrome.png") 1024 1024 "mono"
Save-Image (Join-Path $assetDir "splash-icon.png") 512 640 "splash"
$storeDir = Join-Path $PSScriptRoot "..\store"
$null = New-Item -ItemType Directory -Force -Path $storeDir
Save-Image (Join-Path $storeDir "icon-512.png") 512 512 "icon"
Save-Image (Join-Path $assetDir "favicon.png") 192 192 "icon"
Write-Output "Oluşturuldu: Kronikler uygulama simgesi, Android uyarlamalı katmanlar, splash ve mağaza simgesi."
