import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function BackgroundRippleEffect({
    rows = 8,
    cols = 10,
    className,
}) {
    const [clickedCell, setClickedCell] = useState(null);
    const [rippleKey, setRippleKey] = useState(0);

    return (
        <div
            className={cn(
                "absolute inset-0 overflow-hidden",
                className
            )}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.1),rgba(15,23,42,0.42))]" />
            <div className="absolute inset-0 opacity-90">
                <DivGrid
                    key={`base-${rippleKey}`}
                    rows={rows}
                    cols={cols}
                    borderColor="rgba(191,219,254,0.22)"
                    fillColor="rgba(125,211,252,0.08)"
                    clickedCell={clickedCell}
                    onCellClick={(row, col) => {
                        setClickedCell({ row, col });
                        setRippleKey((currentKey) => currentKey + 1);
                    }}
                />
            </div>
        </div>
    );
}

function DivGrid({
    className,
    rows = 8,
    cols = 10,
    borderColor = "rgba(191,219,254,0.22)",
    fillColor = "rgba(125,211,252,0.08)",
    clickedCell = null,
    onCellClick,
}) {
    const cells = useMemo(
        () => Array.from({ length: rows * cols }, (_, index) => index),
        [rows, cols]
    );

    const gridStyle = {
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        width: "100%",
        height: "100%",
    };

    return (
        <div className={cn("relative h-full w-full", className)}>
            <div className="h-full w-full" style={gridStyle}>
                {cells.map((index) => {
                    const rowIndex = Math.floor(index / cols);
                    const colIndex = index % cols;
                    const distance = clickedCell
                        ? Math.hypot(clickedCell.row - rowIndex, clickedCell.col - colIndex)
                        : 0;
                    const delay = clickedCell ? Math.max(0, distance * 55) : 0;
                    const duration = 200 + distance * 80;

                    return (
                        <button
                            key={index}
                            type="button"
                            className={cn(
                                "h-full w-full animate-none border-[0.5px] opacity-40 transition-opacity duration-150 hover:opacity-80",
                                clickedCell && "animate-cell-ripple"
                            )}
                            style={{
                                backgroundColor: fillColor,
                                borderColor,
                                "--delay": `${delay}ms`,
                                "--duration": `${duration}ms`,
                            }}
                            aria-label={`Activar celda ${rowIndex + 1}-${colIndex + 1}`}
                            onClick={() => onCellClick?.(rowIndex, colIndex)}
                        />
                    );
                })}
            </div>
        </div>
    );
}