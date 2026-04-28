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
            // Render shapes as SVG so circle/ellipse and polygon render exactly
            // like the Konva editor. Using a viewBox sized to the layer's
            // natural pixel dimensions keeps strokes/points/borderRadius in
            // the same units the editor stored them in.
            const shapeType = layer.shapeType || "rect";
            const w = Math.max(1, layer.width);
            const h = Math.max(1, layer.height);
            const fill = layer.backgroundImage
              ? `url(#bg-${layer.id})`
              : (layer.fill || "#45f882");
            const stroke = layer.stroke || "none";
            const strokeWidth = layer.stroke ? (layer.strokeWidth ?? 2) : 0;
            const bgPreserve =
              layer.bgSize === "fill" ? "none"
              : layer.bgSize === "contain" ? "xMidYMid meet"
              : "xMidYMid slice"; // default cover

            // Skew applied via inline transform on the SVG wrapper. Konva
            // doesn't render skew live for shapes either, so this matches
            // best-effort.
            const skewTransform =
              (layer.skewX ? ` skewX(${layer.skewX}deg)` : "") +
              (layer.skewY ? ` skewY(${layer.skewY}deg)` : "");

            return (
              <svg
                key={layer.id}
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
                style={{
                  ...getScaleStyle(layer),
                  transform: getScaleStyle(layer).transform + skewTransform,
                  overflow: "visible",
                }}
                aria-hidden="true"
              >
                {layer.backgroundImage && (
                  <defs>
                    <pattern
                      id={`bg-${layer.id}`}
                      patternUnits="userSpaceOnUse"
                      x={0}
                      y={0}
                      width={w}
                      height={h}
                    >
                      <image
                        href={layer.backgroundImage}
                        x={0}
                        y={0}
                        width={w}
                        height={h}
                        preserveAspectRatio={bgPreserve}
                      />
                    </pattern>
                  </defs>
                )}

                {shapeType === "circle" ? (
                  <ellipse
                    cx={w / 2}
                    cy={h / 2}
                    rx={Math.max(0, w / 2 - strokeWidth / 2)}
                    ry={Math.max(0, h / 2 - strokeWidth / 2)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                ) : shapeType === "polygon" && layer.points && layer.points.length >= 6 ? (
                  // points are stored in 0..100 normalised space relative to
                  // the layer's bounding box; convert to viewBox pixel coords
                  <polygon
                    points={layer.points
                      .reduce<string[]>((acc, v, i) => {
                        if (i % 2 === 0) acc.push(`${(v / 100) * w}`);
                        else acc[acc.length - 1] += `,${(v / 100) * h}`;
                        return acc;
                      }, [])
                      .join(" ")}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                  />
                ) : (
                  <rect
                    x={strokeWidth / 2}
                    y={strokeWidth / 2}
                    width={Math.max(0, w - strokeWidth)}
                    height={Math.max(0, h - strokeWidth)}
                    rx={typeof layer.borderRadius === "number" ? layer.borderRadius : 0}
                    ry={typeof layer.borderRadius === "number" ? layer.borderRadius : 0}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                )}
              </svg>
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
