"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Text, Group, Circle, Arrow, Line, Transformer } from "react-konva";
import type { CanvasData, CanvasLayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ImageIcon,
  Type,
  MessageCircle,
  Square,
  Circle as CircleIcon,
  Triangle,
  Layers,
  Trash2,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Save,
  ZoomIn,
  ZoomOut,
  Upload,
} from "lucide-react";

interface CanvasEditorProps {
  canvasData: CanvasData | null;
  onSave: (data: CanvasData) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}

const DEFAULT_CANVAS: CanvasData = {
  width: 800,
  height: 600,
  layers: [],
};

function generateId() {
  return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export function CanvasEditor({ canvasData, onSave, onUploadImage }: CanvasEditorProps) {
  const [data, setData] = useState<CanvasData>(canvasData || DEFAULT_CANVAS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasData[]>([canvasData || DEFAULT_CANVAS]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [scale, setScale] = useState(1);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [shapeBgImages, setShapeBgImages] = useState<Record<string, HTMLImageElement>>({});
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shapeBgInputRef = useRef<HTMLInputElement>(null);
  const transformerRef = useRef<any>(null);
  const shapeRefs = useRef<Record<string, any>>({});

  // Auto-fit scale
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth - 40;
      const fitScale = Math.min(1, containerWidth / data.width);
      setScale(fitScale);
    }
  }, [data.width]);

  // Load images (layer images)
  useEffect(() => {
    data.layers
      .filter((l) => l.type === "image" && l.src && !loadedImages[l.id])
      .forEach((layer) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setLoadedImages((prev) => ({ ...prev, [layer.id]: img }));
        };
        img.src = layer.src!;
      });
  }, [data.layers]);

  // Load shape background images
  useEffect(() => {
    data.layers
      .filter((l) => l.type === "shape" && l.backgroundImage && !shapeBgImages[l.id])
      .forEach((layer) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setShapeBgImages((prev) => ({ ...prev, [layer.id]: img }));
        };
        img.src = layer.backgroundImage!;
      });
  }, [data.layers]);

  // Attach transformer to selected node
  useEffect(() => {
    if (!transformerRef.current) return;
    const node = selectedId ? shapeRefs.current[selectedId] : null;
    if (node) {
      transformerRef.current.nodes([node]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedId, data.layers]);

  function pushHistory(newData: CanvasData) {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(newData);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    setData(newData);
  }

  function undo() {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setData(history[historyIdx - 1]);
    }
  }

  function redo() {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setData(history[historyIdx + 1]);
    }
  }

  function updateLayer(id: string, updates: Partial<CanvasLayer>) {
    const newLayers = data.layers.map((l) => (l.id === id ? { ...l, ...updates } : l));
    pushHistory({ ...data, layers: newLayers });
  }

  function addLayer(layer: CanvasLayer) {
    pushHistory({ ...data, layers: [...data.layers, layer] });
    setSelectedId(layer.id);
  }

  function deleteLayer(id: string) {
    pushHistory({ ...data, layers: data.layers.filter((l) => l.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

  function moveLayerZ(id: string, direction: "up" | "down") {
    const layers = [...data.layers];
    const idx = layers.findIndex((l) => l.id === id);
    if (direction === "up" && idx < layers.length - 1) {
      [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
    } else if (direction === "down" && idx > 0) {
      [layers[idx - 1], layers[idx]] = [layers[idx], layers[idx - 1]];
    }
    layers.forEach((l, i) => (l.zIndex = i));
    pushHistory({ ...data, layers });
  }

  async function handleAddImage() {
    fileInputRef.current?.click();
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await onUploadImage(file);
    if (!url) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const id = generateId();
      const aspectRatio = img.width / img.height;
      const layerWidth = Math.min(300, data.width * 0.5);
      const layerHeight = layerWidth / aspectRatio;
      setLoadedImages((prev) => ({ ...prev, [id]: img }));
      addLayer({
        id,
        type: "image",
        name: file.name.replace(/\.[^.]+$/, ""),
        visible: true,
        locked: false,
        x: (data.width - layerWidth) / 2,
        y: (data.height - layerHeight) / 2,
        width: layerWidth,
        height: layerHeight,
        rotation: 0,
        opacity: 1,
        zIndex: data.layers.length,
        src: url,
      });
    };
    img.src = url;
    e.target.value = "";
  }

  function addText() {
    addLayer({
      id: generateId(),
      type: "text",
      name: "Teks",
      visible: true,
      locked: false,
      x: data.width / 2 - 100,
      y: data.height / 2 - 20,
      width: 200,
      height: 40,
      rotation: 0,
      opacity: 1,
      zIndex: data.layers.length,
      text: "Teks baru",
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#ffffff",
    });
  }

  function addSpeechBubble() {
    addLayer({
      id: generateId(),
      type: "speech-bubble",
      name: "Balon Kata",
      visible: true,
      locked: false,
      x: data.width / 2 - 100,
      y: data.height / 2 - 50,
      width: 200,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: data.layers.length,
      text: "Dialog...",
      fontSize: 16,
      fontFamily: "Arial",
      fill: "#000000",
      bubbleStyle: "oval",
      tailX: 0,
      tailY: 30,
    });
  }

  function addShape(shapeType: "rect" | "circle" | "polygon" = "rect") {
    const names: Record<string, string> = { rect: "Kotak", circle: "Lingkaran", polygon: "Polygon" };
    const base: CanvasLayer = {
      id: generateId(),
      type: "shape",
      name: names[shapeType] || "Bentuk",
      visible: true,
      locked: false,
      x: data.width / 2 - 50,
      y: data.height / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: data.layers.length,
      shapeType,
      fill: "#45f882",
      stroke: "#ffffff",
      strokeWidth: 2,
      borderRadius: 0,
    };
    if (shapeType === "polygon") {
      // Default trapezoid points relative to width/height
      base.points = [20, 0, 80, 0, 100, 100, 0, 100];
    }
    addLayer(base);
  }

  // Compute background image fill pattern offset based on bgSize and bgPosition
  function computeFillPattern(
    img: HTMLImageElement,
    layerW: number,
    layerH: number,
    bgSize: string = "cover",
    bgPosition: string = "center-center"
  ): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {
    const iw = img.width;
    const ih = img.height;
    let sx = 1, sy = 1;

    if (bgSize === "cover") {
      const ratio = Math.max(layerW / iw, layerH / ih);
      sx = ratio; sy = ratio;
    } else if (bgSize === "contain") {
      const ratio = Math.min(layerW / iw, layerH / ih);
      sx = ratio; sy = ratio;
    } else {
      sx = layerW / iw; sy = layerH / ih;
    }

    const scaledW = iw * sx;
    const scaledH = ih * sy;

    // Position offsets (negative means shift the pattern)
    const [vy, vx] = bgPosition.split("-");
    let ox = 0, oy = 0;
    if (vx === "center") ox = -(scaledW - layerW) / 2;
    else if (vx === "right") ox = -(scaledW - layerW);
    if (vy === "center") oy = -(scaledH - layerH) / 2;
    else if (vy === "bottom") oy = -(scaledH - layerH);

    return { scaleX: sx, scaleY: sy, offsetX: -ox / sx, offsetY: -oy / sy };
  }

  // Upload shape background image
  async function handleShapeBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const url = await onUploadImage(file);
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setShapeBgImages((prev) => ({ ...prev, [selectedId]: img }));
    };
    img.src = url;
    updateLayer(selectedId, { backgroundImage: url, bgSize: "cover", bgPosition: "center-center" });
    e.target.value = "";
  }

  const selectedLayer = data.layers.find((l) => l.id === selectedId);
  const sortedLayers = [...data.layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flex flex-col gap-3" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-surface-alt rounded-xl p-2 border border-border">
        <Button variant="outline" size="sm" onClick={handleAddImage}>
          <ImageIcon className="w-4 h-4" />
          Gambar
        </Button>
        <Button variant="outline" size="sm" onClick={addText}>
          <Type className="w-4 h-4" />
          Teks
        </Button>
        <Button variant="outline" size="sm" onClick={addSpeechBubble}>
          <MessageCircle className="w-4 h-4" />
          Balon Kata
        </Button>
        <Button variant="outline" size="sm" onClick={() => addShape("rect")}>
          <Square className="w-4 h-4" />
          Kotak
        </Button>
        <Button variant="outline" size="sm" onClick={() => addShape("circle")}>
          <CircleIcon className="w-4 h-4" />
          Lingkaran
        </Button>
        <Button variant="outline" size="sm" onClick={() => addShape("polygon")}>
          <Triangle className="w-4 h-4" />
          Polygon
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={undo} disabled={historyIdx <= 0}>
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={redo} disabled={historyIdx >= history.length - 1}>
          <Redo2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={() => setScale(Math.min(2, scale + 0.1))}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted w-10 text-center">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={() => setScale(Math.max(0.2, scale - 0.1))}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => onSave(data)}>
          <Save className="w-4 h-4" />
          Simpan
        </Button>
      </div>

      <div className="flex gap-3">
        {/* Canvas */}
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-[#1a1a2e] p-5">
          <Stage
            ref={stageRef}
            width={data.width * scale}
            height={data.height * scale}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) setSelectedId(null);
            }}
            style={{ cursor: "default" }}
          >
            <Layer>
              {/* Background */}
              <Rect x={0} y={0} width={data.width} height={data.height} fill="#f0f0f0" />

              {/* Layers */}
              {sortedLayers.filter((l) => l.visible).map((layer) => {
                const commonHandlers = {
                  onClick: () => setSelectedId(layer.id),
                  onTap: () => setSelectedId(layer.id),
                  onDragEnd: (e: any) => {
                    updateLayer(layer.id, { x: e.target.x(), y: e.target.y() });
                  },
                  onTransformEnd: (e: any) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    // Reset scale back to 1 and apply to width/height
                    node.scaleX(1);
                    node.scaleY(1);
                    updateLayer(layer.id, {
                      x: node.x(),
                      y: node.y(),
                      width: Math.max(5, node.width() * scaleX),
                      height: Math.max(5, node.height() * scaleY),
                      rotation: node.rotation(),
                    });
                  },
                };

                const setRef = (node: any) => {
                  if (node) shapeRefs.current[layer.id] = node;
                };

                if (layer.type === "image" && loadedImages[layer.id]) {
                  return (
                    <KonvaImage
                      key={layer.id}
                      ref={setRef}
                      image={loadedImages[layer.id]}
                      x={layer.x}
                      y={layer.y}
                      width={layer.width}
                      height={layer.height}
                      rotation={layer.rotation}
                      opacity={layer.opacity}
                      draggable={!layer.locked}
                      {...commonHandlers}
                    />
                  );
                }

                if (layer.type === "text") {
                  return (
                    <Text
                      key={layer.id}
                      ref={setRef}
                      x={layer.x}
                      y={layer.y}
                      text={layer.text || ""}
                      fontSize={layer.fontSize || 24}
                      fontFamily={layer.fontFamily || "Arial"}
                      fill={layer.fill || "#000"}
                      width={layer.width}
                      rotation={layer.rotation}
                      opacity={layer.opacity}
                      draggable={!layer.locked}
                      {...commonHandlers}
                    />
                  );
                }

                if (layer.type === "speech-bubble") {
                  return (
                    <Group
                      key={layer.id}
                      ref={setRef}
                      x={layer.x}
                      y={layer.y}
                      draggable={!layer.locked}
                      opacity={layer.opacity}
                      rotation={layer.rotation}
                      {...commonHandlers}
                    >
                      {layer.bubbleStyle === "oval" ? (
                        <>
                          <Rect
                            x={0} y={0}
                            width={layer.width} height={layer.height}
                            fill="white"
                            cornerRadius={layer.height / 2}
                            stroke="#333" strokeWidth={1}
                          />
                          <Arrow
                            points={[layer.width / 2, layer.height, layer.width / 2 + (layer.tailX || 0), layer.height + (layer.tailY || 30)]}
                            fill="white" stroke="#333" strokeWidth={1}
                            pointerLength={0} pointerWidth={0}
                          />
                        </>
                      ) : (
                        <Rect
                          x={0} y={0}
                          width={layer.width} height={layer.height}
                          fill="white" cornerRadius={8}
                          stroke="#333" strokeWidth={1}
                        />
                      )}
                      <Text
                        x={10} y={10}
                        text={layer.text || ""}
                        fontSize={layer.fontSize || 16}
                        fontFamily={layer.fontFamily || "Arial"}
                        fill={layer.fill || "#000"}
                        width={layer.width - 20}
                        height={layer.height - 20}
                        align="center" verticalAlign="middle"
                      />
                    </Group>
                  );
                }

                if (layer.type === "shape") {
                  // Build fill pattern props for shapes with background images
                  const bgImg = shapeBgImages[layer.id];
                  const hasBgImage = !!layer.backgroundImage && !!bgImg;
                  let fillPatternProps: Record<string, any> = {};
                  if (hasBgImage) {
                    const fp = computeFillPattern(bgImg, layer.width, layer.height, layer.bgSize || "cover", layer.bgPosition || "center-center");
                    fillPatternProps = {
                      fillPatternImage: bgImg,
                      fillPatternScaleX: fp.scaleX,
                      fillPatternScaleY: fp.scaleY,
                      fillPatternOffsetX: fp.offsetX,
                      fillPatternOffsetY: fp.offsetY,
                      fillPatternRepeat: "no-repeat",
                    };
                  }

                  if (layer.shapeType === "circle") {
                    return (
                      <Circle
                        key={layer.id}
                        ref={setRef}
                        x={layer.x + layer.width / 2}
                        y={layer.y + layer.height / 2}
                        radiusX={layer.width / 2}
                        radiusY={layer.height / 2}
                        fill={hasBgImage ? undefined : (layer.fill || "#45f882")}
                        stroke={layer.stroke}
                        strokeWidth={layer.strokeWidth || 0}
                        rotation={layer.rotation}
                        opacity={layer.opacity}
                        draggable={!layer.locked}
                        onClick={() => setSelectedId(layer.id)}
                        onTap={() => setSelectedId(layer.id)}
                        onDragEnd={(e) => {
                          updateLayer(layer.id, {
                            x: e.target.x() - layer.width / 2,
                            y: e.target.y() - layer.height / 2,
                          });
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          const sx = node.scaleX();
                          const sy = node.scaleY();
                          node.scaleX(1);
                          node.scaleY(1);
                          const newW = Math.max(5, layer.width * sx);
                          const newH = Math.max(5, layer.height * sy);
                          updateLayer(layer.id, {
                            x: node.x() - newW / 2,
                            y: node.y() - newH / 2,
                            width: newW,
                            height: newH,
                            rotation: node.rotation(),
                          });
                        }}
                        {...(hasBgImage ? fillPatternProps : {})}
                      />
                    );
                  }

                  if (layer.shapeType === "polygon" && layer.points) {
                    // Scale points from 0-100 space to actual layer width/height
                    const scaledPoints = layer.points.map((v, i) =>
                      i % 2 === 0 ? (v / 100) * layer.width : (v / 100) * layer.height
                    );
                    return (
                      <Line
                        key={layer.id}
                        ref={setRef}
                        x={layer.x}
                        y={layer.y}
                        points={scaledPoints}
                        closed
                        fill={hasBgImage ? undefined : (layer.fill || "#45f882")}
                        stroke={layer.stroke}
                        strokeWidth={layer.strokeWidth || 0}
                        rotation={layer.rotation}
                        opacity={layer.opacity}
                        draggable={!layer.locked}
                        skewX={layer.skewX || 0}
                        skewY={layer.skewY || 0}
                        {...commonHandlers}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          const sx = node.scaleX();
                          const sy = node.scaleY();
                          node.scaleX(1);
                          node.scaleY(1);
                          updateLayer(layer.id, {
                            x: node.x(),
                            y: node.y(),
                            width: Math.max(5, layer.width * sx),
                            height: Math.max(5, layer.height * sy),
                            rotation: node.rotation(),
                          });
                        }}
                        {...(hasBgImage ? fillPatternProps : {})}
                      />
                    );
                  }

                  // Default: rect shape
                  return (
                    <Rect
                      key={layer.id}
                      ref={setRef}
                      x={layer.x}
                      y={layer.y}
                      width={layer.width}
                      height={layer.height}
                      fill={hasBgImage ? undefined : (layer.fill || "#45f882")}
                      stroke={layer.stroke}
                      strokeWidth={layer.strokeWidth || 0}
                      cornerRadius={layer.borderRadius || 0}
                      rotation={layer.rotation}
                      opacity={layer.opacity}
                      skewX={layer.skewX || 0}
                      skewY={layer.skewY || 0}
                      draggable={!layer.locked}
                      {...commonHandlers}
                      {...(hasBgImage ? fillPatternProps : {})}
                    />
                  );
                }

                return null;
              })}

              {/* Transformer for selected element */}
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                enabledAnchors={[
                  "top-left", "top-center", "top-right",
                  "middle-left", "middle-right",
                  "bottom-left", "bottom-center", "bottom-right",
                ]}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) return oldBox;
                  return newBox;
                }}
                anchorSize={8}
                anchorCornerRadius={2}
                borderStroke="#45f882"
                anchorStroke="#45f882"
                anchorFill="#1a1a2e"
              />
            </Layer>
          </Stage>
        </div>

        {/* Layers panel + Properties */}
        <div className="w-64 shrink-0 bg-surface-card rounded-xl border border-border overflow-hidden flex flex-col max-h-[700px]">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Layer ({data.layers.length})
            </p>
          </div>

          {/* Layer list */}
          <div className="max-h-[200px] overflow-y-auto divide-y divide-border shrink-0">
            {[...data.layers].reverse().map((layer) => (
              <button
                key={layer.id}
                onClick={() => setSelectedId(layer.id)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                  selectedId === layer.id ? "bg-primary/10 text-primary" : "hover:bg-surface-alt text-foreground"
                }`}
              >
                <span className="truncate flex-1">{layer.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                  className="p-0.5 hover:text-primary"
                >
                  {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-muted" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                  className="p-0.5 hover:text-primary"
                >
                  {layer.locked ? <Lock className="w-3 h-3 text-muted" /> : <Unlock className="w-3 h-3" />}
                </button>
              </button>
            ))}
          </div>

          {/* Selected layer properties */}
          {selectedLayer && (
            <div className="border-t border-border p-3 space-y-2 overflow-y-auto flex-1">
              <p className="text-xs font-semibold text-foreground">Properti</p>
              <Input
                placeholder="Nama"
                value={selectedLayer.name}
                onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                className="!text-xs !py-1 !px-2"
              />
              {(selectedLayer.type === "text" || selectedLayer.type === "speech-bubble") && (
                <textarea
                  value={selectedLayer.text || ""}
                  onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                  className="w-full text-xs px-2 py-1 rounded-lg border border-border bg-surface-alt text-foreground resize-none"
                  rows={2}
                  placeholder="Teks..."
                />
              )}
              {/* Size */}
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="text-[10px] text-muted">W</label>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.width)}
                    onChange={(e) => updateLayer(selectedLayer.id, { width: Number(e.target.value) })}
                    className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted">H</label>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.height)}
                    onChange={(e) => updateLayer(selectedLayer.id, { height: Number(e.target.value) })}
                    className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                  />
                </div>
              </div>
              {/* Opacity + Rotation */}
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="text-[10px] text-muted">Opacity</label>
                  <input
                    type="range" min={0} max={1} step={0.1}
                    value={selectedLayer.opacity}
                    onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted">Rotasi</label>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.rotation)}
                    onChange={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
                    className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                  />
                </div>
              </div>
              {/* Text properties */}
              {(selectedLayer.type === "text" || selectedLayer.type === "speech-bubble") && (
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="text-[10px] text-muted">Font Size</label>
                    <input
                      type="number"
                      value={selectedLayer.fontSize || 16}
                      onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                      className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Warna</label>
                    <input
                      type="color"
                      value={selectedLayer.fill || "#000000"}
                      onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                      className="w-full h-6 rounded border border-border cursor-pointer"
                    />
                  </div>
                </div>
              )}
              {/* Shape-specific properties */}
              {selectedLayer.type === "shape" && (
                <div className="space-y-2">
                  {/* Fill + Stroke */}
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="text-[10px] text-muted">Fill</label>
                      <input
                        type="color"
                        value={selectedLayer.fill || "#45f882"}
                        onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                        className="w-full h-6 rounded border border-border cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">Stroke</label>
                      <input
                        type="color"
                        value={selectedLayer.stroke || "#ffffff"}
                        onChange={(e) => updateLayer(selectedLayer.id, { stroke: e.target.value })}
                        className="w-full h-6 rounded border border-border cursor-pointer"
                      />
                    </div>
                  </div>
                  {/* Stroke Width + Border Radius */}
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="text-[10px] text-muted">Stroke Width</label>
                      <input
                        type="number" min={0} max={50}
                        value={selectedLayer.strokeWidth || 0}
                        onChange={(e) => updateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) })}
                        className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                      />
                    </div>
                    {selectedLayer.shapeType === "rect" && (
                      <div>
                        <label className="text-[10px] text-muted">Border Radius</label>
                        <input
                          type="number" min={0} max={200}
                          value={selectedLayer.borderRadius || 0}
                          onChange={(e) => updateLayer(selectedLayer.id, { borderRadius: Number(e.target.value) })}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                        />
                      </div>
                    )}
                  </div>
                  {/* Skew for rect/polygon */}
                  {(selectedLayer.shapeType === "rect" || selectedLayer.shapeType === "polygon") && (
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-[10px] text-muted">Skew X</label>
                        <input
                          type="number" step={0.01}
                          value={selectedLayer.skewX || 0}
                          onChange={(e) => updateLayer(selectedLayer.id, { skewX: Number(e.target.value) })}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted">Skew Y</label>
                        <input
                          type="number" step={0.01}
                          value={selectedLayer.skewY || 0}
                          onChange={(e) => updateLayer(selectedLayer.id, { skewY: Number(e.target.value) })}
                          className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                        />
                      </div>
                    </div>
                  )}
                  {/* Polygon points editor */}
                  {selectedLayer.shapeType === "polygon" && selectedLayer.points && (
                    <div>
                      <label className="text-[10px] text-muted">Points (x,y pairs 0-100)</label>
                      <textarea
                        value={(selectedLayer.points || []).join(", ")}
                        onChange={(e) => {
                          const pts = e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
                          if (pts.length >= 6 && pts.length % 2 === 0) {
                            updateLayer(selectedLayer.id, { points: pts });
                          }
                        }}
                        className="w-full text-xs px-2 py-1 rounded-lg border border-border bg-surface-alt text-foreground resize-none font-mono"
                        rows={2}
                        placeholder="20, 0, 80, 0, 100, 100, 0, 100"
                      />
                    </div>
                  )}
                  {/* Background Image */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted font-semibold">Background Image</label>
                    {selectedLayer.backgroundImage ? (
                      <div className="flex items-center gap-1">
                        <img src={selectedLayer.backgroundImage} alt="" className="w-8 h-8 rounded object-cover border border-border" />
                        <button
                          onClick={() => {
                            const copy = { ...selectedLayer };
                            delete copy.backgroundImage;
                            updateLayer(selectedLayer.id, { backgroundImage: undefined, bgSize: undefined, bgPosition: undefined });
                            setShapeBgImages((prev) => { const n = { ...prev }; delete n[selectedLayer.id]; return n; });
                          }}
                          className="text-[10px] text-danger hover:underline"
                        >Hapus</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => shapeBgInputRef.current?.click()}
                        className="text-[10px] px-2 py-1 rounded border border-border bg-surface-alt text-foreground hover:bg-surface-alt/80 flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" /> Upload
                      </button>
                    )}
                    {selectedLayer.backgroundImage && (
                      <>
                        <div>
                          <label className="text-[10px] text-muted">Size</label>
                          <select
                            value={selectedLayer.bgSize || "cover"}
                            onChange={(e) => updateLayer(selectedLayer.id, { bgSize: e.target.value as any })}
                            className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                          >
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill (stretch)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted">Position</label>
                          <select
                            value={selectedLayer.bgPosition || "center-center"}
                            onChange={(e) => updateLayer(selectedLayer.id, { bgPosition: e.target.value as any })}
                            className="w-full text-xs px-1.5 py-0.5 rounded border border-border bg-surface-alt text-foreground"
                          >
                            <option value="top-left">Top Left</option>
                            <option value="top-center">Top Center</option>
                            <option value="top-right">Top Right</option>
                            <option value="center-left">Center Left</option>
                            <option value="center-center">Center</option>
                            <option value="center-right">Center Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-center">Bottom Center</option>
                            <option value="bottom-right">Bottom Right</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Z-index + Delete */}
              <div className="flex items-center gap-1 pt-1">
                <Button variant="ghost" size="sm" onClick={() => moveLayerZ(selectedLayer.id, "up")} className="!p-1" title="Naikkan">
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => moveLayerZ(selectedLayer.id, "down")} className="!p-1" title="Turunkan">
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <span className="text-[9px] text-muted">z:{selectedLayer.zIndex}</span>
                <div className="flex-1" />
                <Button variant="danger" size="sm" onClick={() => deleteLayer(selectedLayer.id)} className="!p-1 !px-2">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <input ref={shapeBgInputRef} type="file" accept="image/*" className="hidden" onChange={handleShapeBgFile} />
    </div>
  );
}
