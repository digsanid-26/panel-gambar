"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Text, Group, Circle, Arrow } from "react-konva";
import type { CanvasData, CanvasLayer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ImageIcon,
  Type,
  MessageCircle,
  Square,
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
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fit scale
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth - 40;
      const fitScale = Math.min(1, containerWidth / data.width);
      setScale(fitScale);
    }
  }, [data.width]);

  // Load images
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

  function addShape() {
    addLayer({
      id: generateId(),
      type: "shape",
      name: "Kotak",
      visible: true,
      locked: false,
      x: data.width / 2 - 50,
      y: data.height / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: data.layers.length,
      shapeType: "rect",
      fill: "#45f882",
      stroke: "#ffffff",
      strokeWidth: 2,
    });
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
        <Button variant="outline" size="sm" onClick={addShape}>
          <Square className="w-4 h-4" />
          Bentuk
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
                const isSelected = selectedId === layer.id;

                if (layer.type === "image" && loadedImages[layer.id]) {
                  return (
                    <KonvaImage
                      key={layer.id}
                      image={loadedImages[layer.id]}
                      x={layer.x}
                      y={layer.y}
                      width={layer.width}
                      height={layer.height}
                      rotation={layer.rotation}
                      opacity={layer.opacity}
                      draggable={!layer.locked}
                      onClick={() => setSelectedId(layer.id)}
                      onTap={() => setSelectedId(layer.id)}
                      onDragEnd={(e) => {
                        updateLayer(layer.id, { x: e.target.x(), y: e.target.y() });
                      }}
                      stroke={isSelected ? "#45f882" : undefined}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  );
                }

                if (layer.type === "text") {
                  return (
                    <Text
                      key={layer.id}
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
                      onClick={() => setSelectedId(layer.id)}
                      onTap={() => setSelectedId(layer.id)}
                      onDragEnd={(e) => {
                        updateLayer(layer.id, { x: e.target.x(), y: e.target.y() });
                      }}
                    />
                  );
                }

                if (layer.type === "speech-bubble") {
                  return (
                    <Group
                      key={layer.id}
                      x={layer.x}
                      y={layer.y}
                      draggable={!layer.locked}
                      onClick={() => setSelectedId(layer.id)}
                      onTap={() => setSelectedId(layer.id)}
                      onDragEnd={(e) => {
                        updateLayer(layer.id, { x: e.target.x(), y: e.target.y() });
                      }}
                      opacity={layer.opacity}
                      rotation={layer.rotation}
                    >
                      {/* Bubble shape */}
                      {layer.bubbleStyle === "oval" ? (
                        <>
                          <Rect
                            x={0}
                            y={0}
                            width={layer.width}
                            height={layer.height}
                            fill="white"
                            cornerRadius={layer.height / 2}
                            stroke={isSelected ? "#45f882" : "#333"}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                          {/* Tail */}
                          <Arrow
                            points={[layer.width / 2, layer.height, layer.width / 2 + (layer.tailX || 0), layer.height + (layer.tailY || 30)]}
                            fill="white"
                            stroke={isSelected ? "#45f882" : "#333"}
                            strokeWidth={1}
                            pointerLength={0}
                            pointerWidth={0}
                          />
                        </>
                      ) : (
                        <Rect
                          x={0}
                          y={0}
                          width={layer.width}
                          height={layer.height}
                          fill="white"
                          cornerRadius={8}
                          stroke={isSelected ? "#45f882" : "#333"}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                      )}
                      {/* Text */}
                      <Text
                        x={10}
                        y={10}
                        text={layer.text || ""}
                        fontSize={layer.fontSize || 16}
                        fontFamily={layer.fontFamily || "Arial"}
                        fill={layer.fill || "#000"}
                        width={layer.width - 20}
                        height={layer.height - 20}
                        align="center"
                        verticalAlign="middle"
                      />
                    </Group>
                  );
                }

                if (layer.type === "shape") {
                  if (layer.shapeType === "circle") {
                    return (
                      <Circle
                        key={layer.id}
                        x={layer.x + layer.width / 2}
                        y={layer.y + layer.height / 2}
                        radius={Math.min(layer.width, layer.height) / 2}
                        fill={layer.fill || "#45f882"}
                        stroke={isSelected ? "#45f882" : layer.stroke}
                        strokeWidth={isSelected ? 2 : layer.strokeWidth || 0}
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
                      />
                    );
                  }
                  return (
                    <Rect
                      key={layer.id}
                      x={layer.x}
                      y={layer.y}
                      width={layer.width}
                      height={layer.height}
                      fill={layer.fill || "#45f882"}
                      stroke={isSelected ? "#45f882" : layer.stroke}
                      strokeWidth={isSelected ? 2 : layer.strokeWidth || 0}
                      cornerRadius={4}
                      rotation={layer.rotation}
                      opacity={layer.opacity}
                      draggable={!layer.locked}
                      onClick={() => setSelectedId(layer.id)}
                      onTap={() => setSelectedId(layer.id)}
                      onDragEnd={(e) => {
                        updateLayer(layer.id, { x: e.target.x(), y: e.target.y() });
                      }}
                    />
                  );
                }

                return null;
              })}
            </Layer>
          </Stage>
        </div>

        {/* Layers panel */}
        <div className="w-56 shrink-0 bg-surface-card rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Layer ({data.layers.length})
            </p>
          </div>

          {/* Layer list */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
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
            <div className="border-t border-border p-3 space-y-2">
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
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="text-[10px] text-muted">Opacity</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
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
              {selectedLayer.type === "shape" && (
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
              )}
              <div className="flex items-center gap-1 pt-1">
                <Button variant="ghost" size="sm" onClick={() => moveLayerZ(selectedLayer.id, "up")} className="!p-1">
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => moveLayerZ(selectedLayer.id, "down")} className="!p-1">
                  <ChevronDown className="w-3 h-3" />
                </Button>
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
    </div>
  );
}
