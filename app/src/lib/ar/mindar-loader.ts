/**
 * MindAR loader — memuat MindAR library dari CDN via <script> tag.
 *
 * Alasan loader terpisah (tidak pakai `import` webpack):
 * - MindAR v1.2.x memiliki kode legacy `require("fs")` yang memecah Turbopack
 * - MindAR mem-bundle Three.js versi lama (sRGBEncoding) yang bentrok dengan three 0.184+
 * - Dengan CDN <script>, MindAR berjalan terisolasi di `window.MINDAR` tanpa
 *   mempengaruhi bundle aplikasi.
 *
 * Loader ini cache promise per session — hanya download sekali.
 */

const CDN_URL = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";

interface MindARWindow extends Window {
  MINDAR?: {
    IMAGE?: {
      MindARThree: new (config: {
        container: HTMLElement;
        imageTargetSrc: string;
        uiLoading?: string;
        uiScanning?: string;
        uiError?: string;
      }) => MindARThreeInstance;
    };
  };
}

export interface MindARThreeInstance {
  renderer: {
    setAnimationLoop: (fn: ((time?: number) => void) | null) => void;
    render: (scene: unknown, camera: unknown) => void;
  };
  scene: { add: (obj: unknown) => void };
  camera: unknown;
  start: () => Promise<void>;
  stop: () => void;
  addAnchor: (index: number) => { group: { add: (obj: unknown) => void } };
}

type MindARImageNS = NonNullable<NonNullable<MindARWindow["MINDAR"]>["IMAGE"]>;

let loadPromise: Promise<MindARImageNS> | null = null;

export function loadMindAR(): Promise<MindARImageNS> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("MindAR hanya dapat dimuat di browser"));
  }

  const w = window as MindARWindow;
  if (w.MINDAR?.IMAGE) {
    return Promise.resolve(w.MINDAR.IMAGE);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Check if script already injected
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CDN_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        const mindar = (window as MindARWindow).MINDAR?.IMAGE;
        if (mindar) resolve(mindar);
        else reject(new Error("MindAR dimuat tetapi window.MINDAR.IMAGE tidak tersedia"));
      });
      existing.addEventListener("error", () => reject(new Error("Gagal memuat MindAR dari CDN")));
      return;
    }

    const script = document.createElement("script");
    script.src = CDN_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const mindar = (window as MindARWindow).MINDAR?.IMAGE;
      if (mindar) resolve(mindar);
      else reject(new Error("MindAR dimuat tetapi window.MINDAR.IMAGE tidak tersedia"));
    };
    script.onerror = () => reject(new Error("Gagal memuat MindAR dari CDN"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
