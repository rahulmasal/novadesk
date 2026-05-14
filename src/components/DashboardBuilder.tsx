/**
 * ============================================================================
 * DASHBOARD BUILDER COMPONENT - Drag-and-Drop Widget Layout Customizer
 * ============================================================================
 *
 * This component provides a drag-and-drop interface for customizing the
 * dashboard layout. Users can reorder, add, and remove dashboard widgets.
 *
 * WHAT IT DOES:
 * - Displays current dashboard layout with draggable widgets
 * - Allows reordering widgets via drag-and-drop
 * - Provides ability to add available widgets to layout
 * - Enables removal of widgets from layout
 * - Saves layout configuration to backend
 * - Resets to default layout option
 *
 * KEY FEATURES:
 * - Drag-and-drop reordering using @dnd-kit library
 * - Widget visibility toggle (remove from view)
 * - Available widgets panel for adding new widgets
 * - Save/reset functionality with confirmation
 * - Layout persisted to database via API
 *
 * HOW DRAG-AND-DROP WORKS:
 * - DndContext wraps the sortable area
 * - SortableContext provides the drop zone
 * - useSortable hook on each widget enables dragging
 * - DragOverlay shows preview while dragging
 * - DragEndEvent provides the new order
 *
 * BEGINNER NOTES:
 * - @dnd-kit is a modern drag-and-drop library for React
 * - CSS.Transform.toString converts position to CSS transform
 * - Layout is fetched from /api/dashboard on mount
 * - Layout is saved via PUT /api/dashboard
 *
 * @module /components/DashboardBuilder
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interface for a single widget in the dashboard
 */
interface Widget {
  id: string;
  type: string;
  visible: boolean;
  position: { x: number; y: number; w: number; h: number };
}

/**
 * Interface for the complete dashboard layout configuration
 */
interface DashboardLayout {
  widgets: Widget[];
}

/**
 * Props interface for the DashboardBuilder component
 */
interface DashboardBuilderProps {
  onSave?: (layout: DashboardLayout) => void;
  onClose?: () => void;
}

/**
 * Configuration for available widget types
 */
const WIDGET_CONFIG: Record<string, { name: string; description: string; icon: string }> = {
  scorecards: { name: "Scorecards", description: "Key metrics overview", icon: "📊" },
  charts: { name: "Charts", description: "Visual analytics", icon: "📈" },
  activity: { name: "Activity Feed", description: "Recent activity timeline", icon: "📋" },
  tickets: { name: "Ticket Table", description: "List of all tickets", icon: "🎫" },
  sla: { name: "SLA Status", description: "SLA breach warnings", icon: "⏱️" },
  "quick-actions": { name: "Quick Actions", description: "Common actions", icon: "⚡" },
};

/**
 * Default widget configuration - used for reset functionality
 */
const defaultWidgets = [
  { id: "scorecards", type: "scorecards", visible: true, position: { x: 0, y: 0, w: 12, h: 2 } },
  { id: "charts", type: "charts", visible: true, position: { x: 0, y: 2, w: 6, h: 4 } },
  { id: "activity", type: "activity", visible: true, position: { x: 6, y: 2, w: 6, h: 4 } },
  { id: "tickets", type: "tickets", visible: true, position: { x: 0, y: 6, w: 12, h: 4 } },
  { id: "sla", type: "sla", visible: true, position: { x: 0, y: 10, w: 6, h: 3 } },
  { id: "quick-actions", type: "quick-actions", visible: true, position: { x: 6, y: 10, w: 6, h: 3 } },
];

/**
 * SortableWidget - Individual draggable widget component
 *
 * @param widget - Widget data
 * @param onRemove - Callback to hide/remove this widget
 */
function SortableWidget({ widget, onRemove }: { widget: Widget; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const config = WIDGET_CONFIG[widget.type] || { name: widget.type, description: "", icon: "📦" };

  return (
    <div ref={setNodeRef} style={style} className={cn("bg-white/[0.03] border border-white/10 rounded-xl p-4 relative group", isDragging && "z-50 shadow-2xl")}>
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded transition-colors">
          <GripVertical className="w-4 h-4 text-neutral-500" />
        </button>
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          <h3 className="text-white font-medium text-sm">{config.name}</h3>
          <p className="text-xs text-neutral-500">{config.description}</p>
        </div>
        <button onClick={onRemove} className="p-1 hover:bg-red-500/20 rounded transition-colors text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * DashboardBuilder - Drag-and-drop dashboard layout builder with sortable widget grid
 *
 * @param onSave - Callback with the saved layout configuration
 * @param onClose - Callback to close the builder
 */
export function DashboardBuilder({ onSave, onClose }: DashboardBuilderProps) {
  const [layout, setLayout] = useState<DashboardLayout>({ widgets: defaultWidgets });
  const [activeId, setActiveId] = useState<string | null>(null);

  const widgetCounter = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setLayout(data.layout);
        }
      } catch (error) {
        console.error("Error fetching dashboard layout:", error);
      }
    })();
  }, []);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setLayout((prev) => {
        const oldIndex = prev.widgets.findIndex((w) => w.id === active.id);
        const newIndex = prev.widgets.findIndex((w) => w.id === over.id);
        const newWidgets = [...prev.widgets];
        const [removed] = newWidgets.splice(oldIndex, 1);
        newWidgets.splice(newIndex, 0, removed);
        return { widgets: newWidgets };
      });
    }
  };

  const handleRemoveWidget = (id: string) => {
    setLayout((prev) => ({ widgets: prev.widgets.map((w) => w.id === id ? { ...w, visible: false } : w) }));
  };

  const handleAddWidget = (type: string) => {
    widgetCounter.current += 1;
    const id = `${type}-${widgetCounter.current}`;
    const newWidget: Widget = { id, type, visible: true, position: { x: 0, y: 0, w: 6, h: 3 } };
    setLayout((prev) => ({ widgets: [...prev.widgets, newWidget] }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/dashboard", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout }) });
      if (res.ok) { onSave?.(layout); onClose?.(); }
    } catch (error) {
      console.error("Error saving layout:", error);
    }
  };

  const handleReset = () => setLayout({ widgets: defaultWidgets });

  const visibleWidgets = layout.widgets.filter((w) => w.visible);
  const activeWidget = activeId ? layout.widgets.find((w) => w.id === activeId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-xl font-semibold text-white">Customize Dashboard</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">×</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-neutral-400 mb-3">Active Widgets</h3>
            <p className="text-xs text-neutral-500 mb-4">Drag widgets to reorder them. Click the X to hide a widget.</p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
                <div className="space-y-3">
                  {visibleWidgets.map((widget) => <SortableWidget key={widget.id} widget={widget} onRemove={() => handleRemoveWidget(widget.id)} />)}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeWidget && (
                  <div className="bg-neutral-800 border border-blue-500/50 rounded-xl p-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{WIDGET_CONFIG[activeWidget.type]?.icon || "📦"}</span>
                      <div><h3 className="text-white font-medium text-sm">{WIDGET_CONFIG[activeWidget.type]?.name || activeWidget.type}</h3></div>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {visibleWidgets.length === 0 && <div className="text-center text-neutral-500 py-8">No active widgets. Add some from the right panel.</div>}
          </div>

          <div className="w-64 border-l border-white/10 p-4 overflow-y-auto bg-black/20">
            <h3 className="text-sm font-medium text-neutral-400 mb-3">Available Widgets</h3>
            <div className="space-y-2">
              {Object.entries(WIDGET_CONFIG).map(([type, config]) => {
                const isAdded = visibleWidgets.some((w) => w.type === type);
                return (
                  <div key={type} className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className="text-white font-medium text-sm">{config.name}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mb-2">{config.description}</p>
                    <button onClick={() => handleAddWidget(type)} disabled={isAdded} className={cn("w-full text-xs py-1.5 rounded-lg transition-colors", isAdded ? "bg-neutral-700 text-neutral-500 cursor-not-allowed" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30")}>
                      {isAdded ? "Already Added" : "Add Widget"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-white/[0.02]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Save Layout
          </button>
        </div>
      </div>
    </div>
  );
}