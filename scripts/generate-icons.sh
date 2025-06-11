#!/bin/bash

# Script to generate PNG icons from SVG files
# Requires ImageMagick or Inkscape

echo "Generating PNG icons from SVG files..."

PUBLIC_DIR="./public"

# Function to convert SVG to PNG using ImageMagick (if available)
convert_with_imagemagick() {
    local input="$1"
    local output="$2"
    local size="$3"

    if command -v magick &> /dev/null; then
        magick "$input" -resize "${size}x${size}" "$output"
        echo "✓ Generated $output using ImageMagick"
    elif command -v convert &> /dev/null; then
        convert "$input" -resize "${size}x${size}" "$output"
        echo "✓ Generated $output using ImageMagick"
    else
        return 1
    fi
}

# Function to convert SVG to PNG using Inkscape (if available)
convert_with_inkscape() {
    local input="$1"
    local output="$2"
    local size="$3"

    if command -v inkscape &> /dev/null; then
        inkscape "$input" --export-type=png --export-filename="$output" --export-width="$size" --export-height="$size"
        echo "✓ Generated $output using Inkscape"
        return 0
    else
        return 1
    fi
}

# Function to convert SVG to PNG
convert_svg_to_png() {
    local input="$1"
    local output="$2"
    local size="$3"

    if convert_with_inkscape "$input" "$output" "$size"; then
        return 0
    elif convert_with_imagemagick "$input" "$output" "$size"; then
        return 0
    else
        echo "❌ Failed to convert $input - please install ImageMagick or Inkscape"
        return 1
    fi
}

# Convert icons
cd "$PUBLIC_DIR" || exit 1

# Standard favicon
convert_svg_to_png "favicon.ico.svg" "favicon.ico" 32

# App icons
convert_svg_to_png "icon-192.png.svg" "icon-192.png" 192
convert_svg_to_png "icon-512.png.svg" "icon-512.png" 512

# Maskable icons
convert_svg_to_png "icon-maskable-192.png.svg" "icon-maskable-192.png" 192
convert_svg_to_png "icon-maskable-512.png.svg" "icon-maskable-512.png" 512

# Apple touch icon
convert_svg_to_png "apple-touch-icon.png.svg" "apple-touch-icon.png" 180

echo ""
echo "Icon generation complete!"
echo ""
echo "Generated files:"
echo "• favicon.ico (32x32)"
echo "• icon-192.png (192x192)"
echo "• icon-512.png (512x512)"
echo "• icon-maskable-192.png (192x192)"
echo "• icon-maskable-512.png (512x512)"
echo "• apple-touch-icon.png (180x180)"
echo ""
echo "Note: You can safely delete the .svg files after conversion if desired."
