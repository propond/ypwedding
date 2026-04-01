<?php
$source_path = __DIR__ . '/../images/preview.png';
$output_path = __DIR__ . '/../images/preview.jpg';

// Target dimensions for Open Graph
$target_w = 1200;
$target_h = 630;

if (!file_exists($source_path)) {
    die("File not found: " . $source_path);
}

// Ensure error reporting is visible
function cropAndResizeImage($file, $out, $tw, $th) {
    echo "Loading image...\n";
    $orig = @imagecreatefrompng($file);
    if (!$orig) {
        $orig = @imagecreatefromjpeg($file);
    }
    if (!$orig) {
        $orig = @imagecreatefromwebp($file);
    }

    if (!$orig) {
        die("Failed to load image format.");
    }

    $orig_w = imagesx($orig);
    $orig_h = imagesy($orig);
    echo "Original size: {$orig_w}x{$orig_h}\n";

    // Calculate crop/scale ratio
    $ratio_orig = $orig_w / $orig_h;
    $ratio_target = $tw / $th;

    $src_x = 0;
    $src_y = 0;
    $src_w = $orig_w;
    $src_h = $orig_h;

    // Crop to center
    if ($ratio_target > $ratio_orig) {
        // Target is wider than original: crop top and bottom
        $src_h = $orig_w / $ratio_target;
        $src_y = ($orig_h - $src_h) / 2;
    } else {
        // Target is taller than original: crop sides
        $src_w = $orig_h * $ratio_target;
        $src_x = ($orig_w - $src_w) / 2;
    }

    $new = imagecreatetruecolor($tw, $th);
    
    // Fill background with white just in case of transparency
    $bg = imagecolorallocate($new, 255, 255, 255);
    imagefill($new, 0, 0, $bg);

    imagecopyresampled($new, $orig, 0, 0, $src_x, $src_y, $tw, $th, $src_w, $src_h);

    echo "Saving to JPG...\n";
    // 80 quality for aggressive file size reduction while looking good
    imagejpeg($new, $out, 80);

    imagedestroy($orig);
    imagedestroy($new);

    $size = filesize($out);
    echo "Done! New file size: " . round($size / 1024) . " KB\n";
}

cropAndResizeImage($source_path, $output_path, $target_w, $target_h);
?>
