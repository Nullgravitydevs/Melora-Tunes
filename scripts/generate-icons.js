/**
 * Generate all app icons from melora-logo.png
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'melora-logo.png');
const PUBLIC = path.join(__dirname, '..', 'public');
const ANDROID_RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

async function generate() {
    const srcBuffer = fs.readFileSync(LOGO_PATH);
    console.log('Generating app icons from melora-logo.png...\n');

    // --- PWA / Web icons ---
    const webSizes = [
        { name: 'app-icon-192x.png', size: 192 },
        { name: 'app-icon-512x.png', size: 512 },
        { name: 'favicon.png', size: 32 },
        { name: 'apple-touch-icon.png', size: 180 },
        { name: 'icon-96.png', size: 96 },
        { name: 'icon-144.png', size: 144 },
        { name: 'icon-384.png', size: 384 },
    ];

    for (const { name, size } of webSizes) {
        await sharp(srcBuffer)
            .resize(size, size)
            .png({ quality: 100 })
            .toFile(path.join(PUBLIC, name));
        console.log(`  ✓ public/${name} (${size}x${size})`);
    }

    // Generate ICO-compatible favicon (actually a 32x32 PNG named .ico — browsers accept this)
    await sharp(srcBuffer)
        .resize(32, 32)
        .png()
        .toFile(path.join(PUBLIC, 'favicon.ico'));
    console.log('  ✓ public/favicon.ico (32x32)');

    // Desktop app icon (Electron)
    fs.copyFileSync(path.join(PUBLIC, 'favicon.ico'), path.join(PUBLIC, 'app-icon.ico'));
    console.log('  ✓ public/app-icon.ico (32x32)');

    // Next.js app router favicon
    const APP_DIR = path.join(__dirname, '..', 'app');
    fs.copyFileSync(path.join(PUBLIC, 'favicon.ico'), path.join(APP_DIR, 'favicon.ico'));
    console.log('  ✓ app/favicon.ico (32x32)');

    // --- Android Adaptive Icons ---
    const androidSizes = [
        { folder: 'mipmap-mdpi', size: 48 },
        { folder: 'mipmap-hdpi', size: 72 },
        { folder: 'mipmap-xhdpi', size: 96 },
        { folder: 'mipmap-xxhdpi', size: 144 },
        { folder: 'mipmap-xxxhdpi', size: 192 },
    ];

    if (fs.existsSync(ANDROID_RES)) {
        for (const { folder, size } of androidSizes) {
            const dir = path.join(ANDROID_RES, folder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            // Standard icon
            await sharp(srcBuffer)
                .resize(size, size)
                .png({ quality: 100 })
                .toFile(path.join(dir, 'ic_launcher.png'));

            // Round icon
            // Create a circular mask by compositing
            const roundedBuffer = await sharp(srcBuffer)
                .resize(size, size)
                .png()
                .toBuffer();

            const circleMask = Buffer.from(
                `<svg width="${size}" height="${size}">
                    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
                </svg>`
            );

            await sharp(roundedBuffer)
                .composite([{ input: await sharp(circleMask).resize(size, size).png().toBuffer(), blend: 'dest-in' }])
                .png()
                .toFile(path.join(dir, 'ic_launcher_round.png'));

            // Foreground (for adaptive icons) - padded to 108dp equivalent
            const fgSize = Math.round(size * 108 / 48); // Scale up for adaptive icon safe zone
            await sharp(srcBuffer)
                .resize(Math.round(size * 0.7), Math.round(size * 0.7)) // Inner content at 70%
                .extend({
                    top: Math.round(size * 0.15),
                    bottom: Math.round(size * 0.15),
                    left: Math.round(size * 0.15),
                    right: Math.round(size * 0.15),
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .resize(size, size)
                .png()
                .toFile(path.join(dir, 'ic_launcher_foreground.png'));

            console.log(`  ✓ android/${folder}/ (${size}x${size})`);
        }
    } else {
        console.log('  ⚠ Android res folder not found, skipping Android icons');
    }

    // --- Desktop / Electron icons ---
    const desktopSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
    const iconsDir = path.join(__dirname, '..', 'resources', 'icons');
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

    for (const size of desktopSizes) {
        await sharp(srcBuffer)
            .resize(size, size)
            .png({ quality: 100 })
            .toFile(path.join(iconsDir, `${size}x${size}.png`));
    }
    console.log(`  ✓ resources/icons/ (${desktopSizes.join(', ')})`);

    console.log('\n✅ All icons generated successfully!');
}

generate().catch(console.error);
