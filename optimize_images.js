const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dirs = ['opening-frames', 'outro', 'telkom 1', 'telkom 2', 'telkom 3'];
const base = path.join(__dirname, 'public');

async function processImages() {
  console.log("Starting image optimization...");
  for (const d of dirs) {
    const dir = path.join(base, d);
    if (!fs.existsSync(dir)) {
      console.log(`Directory not found: ${dir}`);
      continue;
    }
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    console.log(`Found ${files.length} PNGs in ${d}`);
    
    let count = 0;
    for (const f of files) {
      const inputPath = path.join(dir, f);
      const webpPath = path.join(dir, f.replace('.png', '.webp'));
      
      try {
        await sharp(inputPath)
          .resize(1280, null, { withoutEnlargement: true }) // Downscale if larger than 1280px wide
          .webp({ quality: 70, effort: 4 }) // Good compression
          .toFile(webpPath);
          
        // Delete original png
        fs.unlinkSync(inputPath);
        count++;
      } catch (err) {
        console.error(`Error processing ${f}:`, err);
      }
    }
    console.log(`Successfully converted ${count} images in ${d}`);
  }
  console.log("Done optimization!");
}

processImages();
