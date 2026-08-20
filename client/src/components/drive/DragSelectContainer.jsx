import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDrive } from "../../context/DriveContext.jsx";

export default function DragSelectContainer({ children }) {
  const { folders, files, setSelectedItems, selectedItems } = useDrive();
  const containerRef = useRef(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, currentX, currentY }
  const startRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    // Only left click triggers drag selection
    if (e.button !== 0) return;

    // If clicked on an interactive element (buttons, inputs, links, context menu, modals), skip
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("a") ||
      e.target.closest("[data-no-drag-select]")
    ) {
      return;
    }

    // If clicked directly on an item card without dragging, let the item's onClick handle it
    const itemCard = e.target.closest("[data-item-id]");
    if (itemCard && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Allow regular click, but if user moves mouse > 5px, convert to drag select
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;

    startRef.current = { clientX: e.clientX, clientY: e.clientY, x, y };
    setIsSelecting(true);
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isSelecting || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // Check threshold (at least 4px to avoid accidental tiny clicks)
      const dist = Math.hypot(
        e.clientX - startRef.current.clientX,
        e.clientY - startRef.current.clientY
      );
      if (dist < 4) return;

      const currentX = e.clientX - rect.left + container.scrollLeft;
      const currentY = e.clientY - rect.top + container.scrollTop;

      setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

      // Calculate selection box coordinates in viewport
      const boxLeft = Math.min(startRef.current.clientX, e.clientX);
      const boxTop = Math.min(startRef.current.clientY, e.clientY);
      const boxRight = Math.max(startRef.current.clientX, e.clientX);
      const boxBottom = Math.max(startRef.current.clientY, e.clientY);

      // Find intersecting elements
      const elements = container.querySelectorAll("[data-item-id]");
      const newlySelected = [];

      elements.forEach((el) => {
        const elRect = el.getBoundingClientRect();
        const intersects =
          boxLeft < elRect.right &&
          boxRight > elRect.left &&
          boxTop < elRect.bottom &&
          boxBottom > elRect.top;

        if (intersects) {
          const id = el.getAttribute("data-item-id");
          const isFolder = el.getAttribute("data-item-folder") === "true";
          const name = el.getAttribute("data-item-name") || "";

          let fullItem = isFolder
            ? folders.find((f) => f.id === id)
            : files.find((f) => f.id === id);

          if (fullItem) {
            newlySelected.push({
              id,
              name: fullItem.name || name,
              isFolder,
              is_starred: fullItem.is_starred || 0,
              is_trash: fullItem.is_trash || 0
            });
          }
        }
      });

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        // Merge with existing
        setSelectedItems((prev) => {
          const existingIds = new Set(newlySelected.map((i) => i.id));
          const kept = prev.filter((i) => !existingIds.has(i.id));
          return [...kept, ...newlySelected];
        });
      } else {
        setSelectedItems(newlySelected);
      }
    },
    [isSelecting, folders, files, setSelectedItems]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setSelectionBox(null);
  }, []);

  useEffect(() => {
    if (isSelecting) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isSelecting, handleMouseMove, handleMouseUp]);

  // Compute visual selection rectangle
  let rectStyle = null;
  if (selectionBox) {
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);

    if (width > 3 || height > 3) {
      rectStyle = {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      };
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="relative flex-1 overflow-y-auto p-4 md:p-6 select-none"
    >
      {children}

      {/* Visual Lasso Blue Selection Box */}
      {rectStyle && (
        <div
          style={rectStyle}
          className="absolute pointer-events-none z-30 border-2 border-blue-500 bg-blue-500/15 rounded-xl transition-none"
        />
      )}
    </div>
  );
}
