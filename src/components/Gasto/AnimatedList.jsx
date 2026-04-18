import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { amount: 0.2, triggerOnce: false });

    return (
        <motion.div
            ref={ref}
            data-index={index}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18, delay }}
            className="mb-2 cursor-pointer"
        >
            {children}
        </motion.div>
    );
};

const AnimatedList = ({
    items = [],
    onItemSelect,
    showGradients = true,
    enableArrowNavigation = true,
    className = "",
    itemClassName = "",
    displayScrollbar = true,
    initialSelectedIndex = -1,
    renderItem,
    getItemKey,
}) => {
    const listRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
    const [keyboardNav, setKeyboardNav] = useState(false);
    const [topGradientOpacity, setTopGradientOpacity] = useState(0);
    const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0);

    const handleItemMouseEnter = useCallback((index) => {
        setSelectedIndex(index);
    }, []);

    const handleItemClick = useCallback((item, index) => {
        setSelectedIndex(index);
        if (onItemSelect) onItemSelect(item, index);
    }, [onItemSelect]);

    const handleScroll = useCallback((event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.target;
        setTopGradientOpacity(Math.min(scrollTop / 40, 1));

        const bottomDistance = scrollHeight - (scrollTop + clientHeight);
        setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 40, 1));
    }, []);

    useEffect(() => {
        const container = listRef.current;
        if (!container) return;

        const updateGradients = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            setTopGradientOpacity(Math.min(scrollTop / 40, 1));
            const bottomDistance = scrollHeight - (scrollTop + clientHeight);
            setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 40, 1));
        };

        updateGradients();
        window.requestAnimationFrame(updateGradients);
    }, [items]);

    useEffect(() => {
        if (!enableArrowNavigation) return;

        const handleKeyDown = (event) => {
            if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
                event.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
            } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
                event.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (event.key === "Enter") {
                if (selectedIndex >= 0 && selectedIndex < items.length && onItemSelect) {
                    event.preventDefault();
                    onItemSelect(items[selectedIndex], selectedIndex);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enableArrowNavigation, items, onItemSelect, selectedIndex]);

    useEffect(() => {
        if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;

        const container = listRef.current;
        const selectedItem = container.querySelector(`[data-index=\"${selectedIndex}\"]`);
        if (selectedItem) {
            const extraMargin = 40;
            const containerScrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const itemTop = selectedItem.offsetTop;
            const itemBottom = itemTop + selectedItem.offsetHeight;

            if (itemTop < containerScrollTop + extraMargin) {
                container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
            } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
                container.scrollTo({
                    top: itemBottom - containerHeight + extraMargin,
                    behavior: "smooth",
                });
            }
        }

        setKeyboardNav(false);
    }, [keyboardNav, selectedIndex]);

    return (
        <div className={`relative w-full ${className}`}>
            <div
                ref={listRef}
                onScroll={handleScroll}
                className={`max-h-[70vh] overflow-y-auto p-1 ${displayScrollbar
                    ? "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded"
                    : "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    }`}
                style={{
                    scrollbarWidth: displayScrollbar ? "thin" : "none",
                    scrollbarColor: "#cbd5e1 #f1f5f9",
                }}
            >
                {items.map((item, index) => {
                    const isSelected = selectedIndex === index;
                    const content = renderItem
                        ? renderItem(item, index, { isSelected })
                        : (
                            <div className={`rounded-xl border border-slate-200 bg-white p-3 ${isSelected ? "bg-blue-50" : ""} ${itemClassName}`}>
                                <p className="m-0 text-sm text-slate-700">{String(item)}</p>
                            </div>
                        );

                    return (
                        <AnimatedItem
                            key={getItemKey ? getItemKey(item, index) : index}
                            delay={0.03 * (index % 8)}
                            index={index}
                            onMouseEnter={() => handleItemMouseEnter(index)}
                            onClick={() => handleItemClick(item, index)}
                        >
                            {content}
                        </AnimatedItem>
                    );
                })}
            </div>

            {showGradients && (
                <>
                    <div
                        className="pointer-events-none absolute left-0 right-0 top-0 h-10 bg-linear-to-b from-white to-transparent transition-opacity duration-200"
                        style={{ opacity: topGradientOpacity }}
                    />
                    <div
                        className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-linear-to-t from-white to-transparent transition-opacity duration-200"
                        style={{ opacity: bottomGradientOpacity }}
                    />
                </>
            )}
        </div>
    );
};

export default AnimatedList;
