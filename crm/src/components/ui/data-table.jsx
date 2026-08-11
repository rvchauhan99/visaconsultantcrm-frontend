import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown, GripVertical } from "lucide-react";
import { CrmEmptyState } from "@/components/ui/crm-card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * DataTable — reusable sortable table for CRM pages.
 *
 * Optional controlled sort: pass sortKey/sortDir/onSortChange (and serverSort)
 * to opt into server-driven sorting. Existing callers keep client-side sort.
 *
 * Optional row reorder: enableReorder + onReorder (receives reordered rows).
 * When enableReorder is true, client column sorting is disabled.
 */
export function DataTable({
  columns,
  data = [],
  loading = false,
  empty,
  onRowClick,
  rowTestId,
  className,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
  serverSort = false,
  density = "comfortable",
  stickyHeader = false,
  enableReorder = false,
  onReorder,
  getRowId = (row) => row.id,
}) {
  const [internalKey, setInternalKey] = useState(null);
  const [internalDir, setInternalDir] = useState("asc");

  const isControlled = controlledSortKey !== undefined || !!onSortChange;
  const sortKey = enableReorder ? null : (isControlled ? (controlledSortKey ?? null) : internalKey);
  const sortDir = isControlled ? (controlledSortDir || "asc") : internalDir;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleSort = (key) => {
    if (enableReorder || !key) return;
    let nextDir = "asc";
    if (sortKey === key) nextDir = sortDir === "asc" ? "desc" : "asc";
    if (onSortChange) {
      onSortChange(key, nextDir);
      return;
    }
    if (sortKey === key) setInternalDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setInternalKey(key);
      setInternalDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (enableReorder || serverSort || !sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, serverSort, enableReorder]);

  const rowIds = useMemo(() => sorted.map(getRowId), [sorted, getRowId]);

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-navy" />
      : <ChevronDown className="w-3 h-3 text-navy" />;
  };

  const cellPad = density === "compact" ? "py-2 px-3" : "";

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = sorted.findIndex((row) => getRowId(row) === active.id);
    const newIndex = sorted.findIndex((row) => getRowId(row) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(sorted, oldIndex, newIndex));
  };

  const tableHead = (
    <thead className={stickyHeader ? "sticky top-0 z-10 bg-surface-card" : undefined}>
      <tr>
        {enableReorder && (
          <th className={cn("w-8", cellPad)} aria-label="Reorder" />
        )}
        {columns.map((col) => (
          <th
            key={col.key}
            className={cn(
              !enableReorder && col.sortable !== false && "cursor-pointer select-none hover:text-ink",
              cellPad,
              col.headerClassName,
            )}
            onClick={() => !enableReorder && col.sortable !== false && toggleSort(col.key)}
          >
            <div className="flex items-center gap-1">
              {col.label}
              {!enableReorder && col.sortable !== false && <SortIcon colKey={col.key} />}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  const loadingBody = (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {enableReorder && <td className={cellPad} />}
          {columns.map((col) => (
            <td key={col.key} className={cellPad}>
              <div className="h-4 rounded-lg bg-surface-muted animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted bg-[length:200%_100%]" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  const emptyBody = (
    <tbody>
      <tr>
        <td colSpan={columns.length + (enableReorder ? 1 : 0)}>
          {empty ? (
            <CrmEmptyState
              icon={empty.icon}
              title={empty.title}
              description={empty.description}
              action={empty.action}
            />
          ) : (
            <div className="py-10 text-center text-sm text-ink-muted italic">No data</div>
          )}
        </td>
      </tr>
    </tbody>
  );

  const dataBody = enableReorder ? (
    <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
      <tbody>
        {sorted.map((row, i) => (
          <SortableRow
            key={getRowId(row) ?? i}
            id={getRowId(row)}
            row={row}
            columns={columns}
            cellPad={cellPad}
            onRowClick={onRowClick}
            rowTestId={rowTestId}
          />
        ))}
      </tbody>
    </SortableContext>
  ) : (
    <tbody>
      {sorted.map((row, i) => (
        <tr
          key={getRowId(row) ?? i}
          className={onRowClick ? "clickable" : ""}
          onClick={() => onRowClick?.(row)}
          data-testid={rowTestId?.(row)}
        >
          {columns.map((col) => (
            <td key={col.key} className={cn(cellPad, col.className)}>
              {col.render ? col.render(row, row[col.key]) : row[col.key] ?? "—"}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  const table = (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn("data-table w-full border-collapse", density === "compact" && "text-[0.8rem]")}>
        {tableHead}
        {loading ? loadingBody : sorted.length === 0 ? emptyBody : dataBody}
      </table>
    </div>
  );

  if (!enableReorder || loading || sorted.length === 0) {
    return table;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {table}
    </DndContext>
  );
}

function SortableRow({ id, row, columns, cellPad, onRowClick, rowTestId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={onRowClick ? "clickable" : ""}
      onClick={() => onRowClick?.(row)}
      data-testid={rowTestId?.(row)}
    >
      <td className={cn(cellPad, "w-8")} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-ink-muted hover:text-ink rounded"
          aria-label="Drag to reorder"
          data-testid={`reorder-handle-${id}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      {columns.map((col) => (
        <td key={col.key} className={cn(cellPad, col.className)}>
          {col.render ? col.render(row, row[col.key]) : row[col.key] ?? "—"}
        </td>
      ))}
    </tr>
  );
}
