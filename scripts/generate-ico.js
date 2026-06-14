/**
 * Generate a multi-size Windows .ico file from existing PNG icons.
 * Uses pure Node.js buffer manipulation — no ImageMagick needed.
 * 
 * ICO format spec: https://en.wikipedia.org/wiki/ICO_(file_format)
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'resources', 'icons');
const OUTPUT_ICO = path.join(__dirname, '..', 'public', 'app-icon.ico');

// Sizes to include in the .ico (Windows needs 256 for high-DPI)
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function buildIco(pngBuffers) {
  const numImages = pngBuffers.length;
  
  // ICO header: 6 bytes
  const headerSize = 6;
  // Each directory entry: 16 bytes  
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  
  // Calculate offsets
  let dataOffset = headerSize + dirSize;
  const entries = [];
  
  for (const { width, buffer } of pngBuffers) {
    entries.push({
      width: width >= 256 ? 0 : width, // 0 means 256 in ICO format
      height: width >= 256 ? 0 : width,
      dataSize: buffer.length,
      dataOffset: dataOffset,
      buffer: buffer,
    });
    dataOffset += buffer.length;
  }
  
  // Build the ICO file
  const totalSize = dataOffset;
  const ico = Buffer.alloc(totalSize);
  let offset = 0;
  
  // Header
  ico.writeUInt16LE(0, offset);      // Reserved
  ico.writeUInt16LE(1, offset + 2);  // Type: 1 = ICO
  ico.writeUInt16LE(numImages, offset + 4); // Number of images
  offset += 6;
  
  // Directory entries
  for (const entry of entries) {
    ico.writeUInt8(entry.width, offset);      // Width
    ico.writeUInt8(entry.height, offset + 1); // Height
    ico.writeUInt8(0, offset + 2);            // Color palette (0 = no palette)
    ico.writeUInt8(0, offset + 3);            // Reserved
    ico.writeUInt16LE(1, offset + 4);         // Color planes
    ico.writeUInt16LE(32, offset + 6);        // Bits per pixel
    ico.writeUInt32LE(entry.dataSize, offset + 8);  // Image data size
    ico.writeUInt32LE(entry.dataOffset, offset + 12); // Offset to image data
    offset += 16;
  }
  
  // Image data (PNG blobs)
  for (const entry of entries) {
    entry.buffer.copy(ico, offset);
    offset += entry.buffer.length;
  }
  
  return ico;
}

// Main
const pngBuffers = [];
for (const size of SIZES) {
  const pngPath = path.join(ICONS_DIR, `${size}x${size}.png`);
  if (fs.existsSync(pngPath)) {
    const buffer = fs.readFileSync(pngPath);
    pngBuffers.push({ width: size, buffer });
    console.log(`  ✓ Loaded ${size}x${size}.png (${buffer.length} bytes)`);
  } else {
    console.warn(`  ⚠ Missing ${size}x${size}.png — skipping`);
  }
}

if (pngBuffers.length === 0) {
  console.error('No PNG files found!');
  process.exit(1);
}

const icoBuffer = buildIco(pngBuffers);
fs.writeFileSync(OUTPUT_ICO, icoBuffer);
console.log(`\n✅ Generated ${OUTPUT_ICO} (${icoBuffer.length} bytes) with ${pngBuffers.length} sizes`);
