"use client";

/**
 * PanelCanvasOverlay — renders `panel.canvas_data.layers` as absolute-positioned
 * HTML overlays on top of the panel image in the viewer.
 *
 * This is the read-only mirror of the canvas editor; each layer is rendered
 * according to its type (image, text, shape, speech-bubble, ar-trigger).
 */

import { useMemo } from "react";
import type { CanvasData, CanvasLayer } from "@/lib/types";

interface PanelCanvasOverlayProps {
  canvasData?: CanvasData;
  visibleRefIds?: Set<string>;
  useTimelineFilter?: boolean;
  /** When provided the overlays are scaled so the absolute positions match */
  containerWidth?: number;
  containerHeight?: number;
}

export function PanelCanvasOverlay({
  canvasData,
  visibleRefIds,
  useTimelineFilter = false,
  containerWidth,
  containerHeight,
}: PanelCanvasOverlayProps) {
  const layers = useMemo(() => {
    if (!canvasData?.layers) return [];
    // Sort by zIndex
    return [...canvasData.layers].sort((a, b) => a.zIndex - b.zIndex);
  }, [canvasData]);

  if (!layers.length) return null;

  const cw = containerWidth ?? canvasData?.width ?? 800;
  const ch = containerHeight ?? canvasData?.height ?? 600;

  function getScaleStyle(layer: CanvasLayer): React.CSSProperties {
    return {
      position: "absolute",
      left: `${(layer.x / cw) * 100}%`,
      top: `${(layer.y / ch) * 100}%`,
      width: `${(layer.width / cw) * 100}%`,
      height: `${(layer.height / ch) * 100}%`,
      transform: `rotate(${layer.rotation}deg)`,
      opacity: layer.opacity,
      zIndex: layer.zIndex,
      pointerEvents: layer.type === "ar-trigger" ? "auto" : "none",
      userSelect: "none",
    };
  }

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {layers.map((layer) => {
        // Timeline filter: if useTimelineFilter and refId not in visible set, hide
        if (useTimelineFilter && visibleRefIds && !visibleRefIds.has(layer.id)) {
          return null;
        }
        if (!layer.visible) return null;

        switch (layer.type) {
          case "image":
            return (
              <img
                key={layer.id}
                src={layer.src || ""}
                alt={layer.name}
                className="object-cover"
                style={getScaleStyle(layer)}
                draggable={false}
              />
            );

          case "text":
            return (
              <div
                key={layer.id}
                className="flex items-start justify-start"
                style={{
                  ...getScaleStyle(layer),
                  color: layer.fill || "#000000",
                  fontSize: `${layer.fontSize ?? 16}px`,
                  fontFamily: layer.fontFamily || "Arial",
                  textAlign: (layer.textAlign || "left") as "left" | "center" | "right",
                  lineHeight: 1.3,
                  overflow: "hidden",
                }}
              >
                <span className="block w-full">{layer.text}</span>
              </div>
            );

          case "shape": {
            const isCircle = layer.shapeType === "circle";
            const isPolygon = layer.shapeType === "polygon";
            const borderRadius =
              isCircle
                ? "50%"
                : typeof layer.borderRadius === "number"
                ? `${layer.borderRadius}px`
                : "0px";

            const clipPath = isPolygon && layer.points
              ? `polygon(${layer.points.reduce((acc, p, i, arr) => {
                  const isX = i % 2 === 0;
                  return acc + (i > 0 ? ", " : "") + (isX ? `${p}%` : `${p}%`);
                }, "")})`
              : undefined;

            return (
              <div
                key={layer.id}
                className="overflow-hidden"
                style={{
                  ...getScaleStyle(layer),
                  backgroundColor: layer.fill || "#45f882",
                  borderRadius,
                  border: layer.stroke
                    ? `${layer.strokeWidth ?? 2}px solid ${layer.stroke}`
                    : undefined,
                  clipPath,
                  transform: getScaleStyle(layer).transform +
                    (layer.skewX ? ` skewX(${layer.skewX}deg)` : "") +
                    (layer.skewY ? ` skewY(${layer.skewY}deg)` : ""),
                  backgroundImage: layer.backgroundImage
                    ? `url(${layer.backgroundImage})`
                    : undefined,
                  backgroundSize: layer.bgSize || "cover",
                  backgroundPosition: "center",
                }}
              />
            );
          }

          case "speech-bubble": {
            const style = layer.bubbleStyle || "oval";
            const bubbleClass =
              style === "rectangle"
                ? "rounded-lg"
                : style === "jagged"
                ? ""
                : "rounded-[50%]";
            return (
              <div
                key={layer.id}
                className={`flex items-center justify-center px-2 py-1 ${bubbleClass}`}
                style={{
                  ...getScaleStyle(layer),
                  backgroundColor: layer.fill || "#ffffff",
                  border: layer.stroke
                    ? `${layer.strokeWidth ?? 2}px solid ${layer.stroke}`
                    : "1px solid #ccc",
                  color: layer.fill || "#000000",
                  fontSize: `${layer.fontSize ?? 16}px`,
                  fontFamily: layer.fontFamily || "Arial",
                  textAlign: (layer.textAlign || "center") as "left" | "center" | "right",
                  lineHeight: 1.3,
                  overflow: "hidden",
                }}
              >
                {layer.text}
              </div>
            );
          }

          default:
            // ar-trigger is handled by PanelARTriggerOverlay separately
            return null;
        }
      })}
    </div>
  );
}
