/**
 * Deteksi kapabilitas device untuk AR.
 * Dipakai di AR Viewer untuk memutuskan mode rendering (AR vs 3D-only fallback).
 */

export interface ARCapabilities {
  hasCamera: boolean;
  hasWebGL: boolean;
  hasWebXR: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  /** Apakah device mendukung minimal mode image-tracking AR via MindAR */
  canRunMarkerAR: boolean;
  /** Apakah device mendukung markerless AR via WebXR */
  canRunMarkerlessAR: boolean;
}

export async function detectARCapabilities(): Promise<ARCapabilities> {
  if (typeof window === "undefined") {
    return {
      hasCamera: false,
      hasWebGL: false,
      hasWebXR: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      canRunMarkerAR: false,
      canRunMarkerlessAR: false,
    };
  }

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/i.test(ua);

  // WebGL check
  let hasWebGL = false;
  try {
    const canvas = document.createElement("canvas");
    hasWebGL = !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    hasWebGL = false;
  }

  // Camera check (getUserMedia availability — not actual permission)
  const hasCamera = !!(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
  );

  // WebXR check
  let hasWebXR = false;
  const nav = navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } };
  if (nav.xr && typeof nav.xr.isSessionSupported === "function") {
    try {
      hasWebXR = await nav.xr.isSessionSupported("immersive-ar");
    } catch {
      hasWebXR = false;
    }
  }

  return {
    hasCamera,
    hasWebGL,
    hasWebXR,
    isIOS,
    isAndroid,
    isMobile,
    canRunMarkerAR: hasCamera && hasWebGL && isMobile,
    canRunMarkerlessAR: hasWebXR,
  };
}
