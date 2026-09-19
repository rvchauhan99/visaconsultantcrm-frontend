/**
 * Basic client-side face and person detection prototype for mobile photo uploads.
 * Combines browser-native FaceDetector API (where supported) with a canvas-based
 * facial color & feature contrast analysis fallback.
 *
 * Note: This is a client-side prototype validation to ensure user uploads a photo
 * containing a person/face. It does not claim official identity authentication.
 */

export async function detectFaceInImage(imageSource) {
  try {
    const img = await loadImage(imageSource);

    // 1. Try browser-native Shape Detection API (Chrome Android / Chromium with FaceDetector)
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await detector.detect(img);
        if (faces && faces.length > 0) {
          return {
            detected: true,
            message: "Photo looks good",
            faceCount: faces.length,
            method: "native-face-detector",
          };
        }
      } catch (err) {
        console.warn("Native FaceDetector failed, falling back to canvas analysis:", err);
      }
    }

    // 2. Canvas-based portrait & facial analysis fallback
    return analyzeImageForFace(img);
  } catch (error) {
    console.error("Face detection error:", error);
    // On unexpected read error, allow graceful retry
    return {
      detected: false,
      message: "We couldn't detect a face in this photo. Please upload a clear photo showing your face.",
      error: error?.message,
    };
  }
}

/**
 * Loads an image from a File, Blob, or URL into an HTMLImageElement
 */
function loadImage(source) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Face detection must run in browser environment"));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (e) => {
      reject(new Error("Failed to load image for validation"));
    };

    if (typeof source === "string") {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else if (source instanceof HTMLImageElement) {
      resolve(source);
    } else {
      reject(new Error("Unsupported image source"));
    }
  });
}

/**
 * Lightweight canvas-based facial feature and skin-cluster analyzer.
 * Checks for human skin pigmentation and facial contrast in the expected portrait region.
 */
function analyzeImageForFace(img) {
  const canvas = document.createElement("canvas");
  const targetWidth = 160;
  const targetHeight = Math.round((img.naturalHeight / (img.naturalWidth || 1)) * targetWidth) || 200;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    // If 2d context unavailable, return acceptable to not block user
    return { detected: true, message: "Photo looks good", method: "fallback-pass" };
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;

  // Define the central face region (top 15% to 75% height, center 65% width)
  const yStart = Math.floor(targetHeight * 0.15);
  const yEnd = Math.floor(targetHeight * 0.75);
  const xStart = Math.floor(targetWidth * 0.18);
  const xEnd = Math.floor(targetWidth * 0.82);

  let totalFaceRegionPixels = 0;
  let skinPixels = 0;
  let luminanceSum = 0;
  let luminanceValues = [];

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const idx = (y * targetWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      totalFaceRegionPixels++;

      // Luminance for contrast check
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      luminanceSum += lum;
      luminanceValues.push(lum);

      // YCbCr skin tone detection model
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Skin tone bounds covering various skin pigmentations under natural lighting
      const isSkinYCbCr = cb >= 75 && cb <= 135 && cr >= 130 && cr <= 178;

      // Normalized RGB skin heuristic check
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const isSkinRGB =
        r > 55 &&
        g > 35 &&
        b > 20 &&
        max - min > 12 &&
        Math.abs(r - g) > 10 &&
        r > g &&
        r > b;

      if (isSkinYCbCr || isSkinRGB) {
        skinPixels++;
      }
    }
  }

  if (totalFaceRegionPixels === 0) {
    return {
      detected: false,
      message: "We couldn't detect a face in this photo. Please upload a clear photo showing your face.",
    };
  }

  const skinRatio = skinPixels / totalFaceRegionPixels;

  // Calculate contrast standard deviation (to distinguish human face from flat plain surfaces)
  const meanLum = luminanceSum / totalFaceRegionPixels;
  let varianceSum = 0;
  for (let i = 0; i < luminanceValues.length; i++) {
    varianceSum += Math.pow(luminanceValues[i] - meanLum, 2);
  }
  const stdDev = Math.sqrt(varianceSum / totalFaceRegionPixels);

  // A genuine portrait photo shows skin cluster in the center area (typically 10% to 85%)
  // and feature contrast (stdDev > 12) from eyes, eyebrows, hair, and shadows.
  const hasSkinCluster = skinRatio >= 0.10 && skinRatio <= 0.88;
  const hasFeatureContrast = stdDev >= 12;

  if (hasSkinCluster && hasFeatureContrast) {
    return {
      detected: true,
      message: "Photo looks good",
      confidence: Math.min(0.98, Number((0.6 + skinRatio * 0.4).toFixed(2))),
      method: "canvas-feature-analysis",
    };
  }

  return {
    detected: false,
    message: "We couldn't detect a face in this photo. Please upload a clear photo showing your face.",
    details: { skinRatio: skinRatio.toFixed(2), stdDev: stdDev.toFixed(2) },
  };
}
