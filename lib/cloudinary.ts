/**
 * Optimizes a Cloudinary URL by injecting transformation parameters.
 * Defaults to q_auto (auto quality) and f_auto (auto format like WebP/AVIF).
 * 
 * @param url Original URL (e.g., from database)
 * @param options Transformation options like width or video codec
 * @returns Optimized URL
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    isVideo?: boolean;
    quality?: "auto" | "eco" | "good" | "best";
  } = {}
): string {
  if (!url || !url.includes("res.cloudinary.com")) {
    return url;
  }

  const quality = options.quality || "auto";
  const widthStr = options.width ? `,w_${options.width}` : ",c_limit,w_1080";
  const videoParams = options.isVideo ? ",vc_auto" : ""; // vc_auto optimizes video codec
  
  const transformations = `q_${quality},f_auto${widthStr}${videoParams}`;

  // Cloudinary URLs typically look like:
  // https://res.cloudinary.com/cloud_name/image/upload/v1234567/public_id.jpg
  // We want to insert transformations after /upload/
  // Result: https://res.cloudinary.com/cloud_name/image/upload/q_auto,f_auto,w_1080/v1234567/public_id.jpg

  const uploadSegment = "/upload/";
  const uploadIndex = url.indexOf(uploadSegment);

  if (uploadIndex === -1) {
    // If it's a fetch URL or doesn't have /upload/, try to just return it,
    // though most standard API uploads include /upload/
    return url;
  }

  // Check if transformations already exist (to prevent double appending)
  const afterUpload = url.slice(uploadIndex + uploadSegment.length);
  if (afterUpload.startsWith("q_") || afterUpload.startsWith("f_") || afterUpload.startsWith("w_")) {
    return url; // Already has some transformations
  }

  const beforeUpload = url.slice(0, uploadIndex + uploadSegment.length);
  return `${beforeUpload}${transformations}/${afterUpload}`;
}
