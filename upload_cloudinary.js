const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFolder = async (folderName) => {
  const fullPath = path.join(__dirname, 'public', folderName);
  if (!fs.existsSync(fullPath)) {
    console.log(`Directory ${folderName} does not exist. Skipping...`);
    return;
  }

  const files = fs.readdirSync(fullPath).filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp'));
  console.log(`Found ${files.length} images in ${folderName}. Starting upload...`);

  // Upload in chunks of 10 to avoid overwhelming the network
  const CHUNK_SIZE = 10;
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    
    await Promise.all(chunk.map(async (file) => {
      const filePath = path.join(fullPath, file);
      try {
        await cloudinary.uploader.upload(filePath, {
          folder: folderName, // Use the same folder name in Cloudinary
          use_filename: true, // Keep the original filename
          unique_filename: false, // Don't add random characters
          overwrite: true // Overwrite if it already exists
        });
        console.log(`Uploaded: ${folderName}/${file}`);
      } catch (error) {
        console.error(`Failed to upload ${folderName}/${file}:`, error.message);
      }
    }));
  }
  console.log(`Finished uploading ${folderName}!\n`);
};

const run = async () => {
  const folders = [
    'opening-frames',
    'outro',
    'telkom 1',
    'telkom 2',
    'telkom 3'
  ];

  for (const folder of folders) {
    await uploadFolder(folder);
  }
  
  console.log("All uploads completed successfully!");
};

run();
