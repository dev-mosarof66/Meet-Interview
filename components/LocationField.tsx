"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiMapPin, FiSearch } from "react-icons/fi";
import { searchLocations } from "@/lib/locations";

/**
 * Searchable location picker. Filters a bundled list of real cities as the user
 * types, shows a dropdown, and supports keyboard navigation. Users can still
 * commit a free-form value (their typed text) if their city isn't listed.
 */
export function LocationField({
  value,
  onChange,
  placeholder = "Search for a city…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const matches = searchLocations(value);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        commit(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <FiSearch
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          className="input pl-9"
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-card"
        >
          {matches.map((loc, i) => (
            <li
              key={loc}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                i === active ? "bg-brand-100 text-brand-700" : "text-ink hover:bg-canvas"
              }`}
              onMouseEnter={() => setActive(i)}
              // onMouseDown (not onClick) so it fires before the input blur.
              onMouseDown={(e) => {
                e.preventDefault();
                commit(loc);
              }}
            >
              <FiMapPin aria-hidden className="shrink-0 text-muted" />
              <span className="truncate">{loc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
