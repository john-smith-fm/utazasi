"use client";

type FolderTabItem<T extends string> = { id: T; label: string };

export function FolderTabs<T extends string>({
  items,
  activeId,
  onChange,
  ariaLabel,
  variant = "notebook",
}: {
  items: readonly FolderTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  variant?: "notebook" | "places";
}) {
  return (
    <div className={`folder-tabs folder-tabs--${variant}`} role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`folder-tab ${active ? "folder-tab--active" : ""} ${active && index === 0 ? "folder-tab--first" : ""} ${active && index === items.length - 1 ? "folder-tab--last" : ""}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
