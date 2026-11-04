"use client";

import { useState } from "react";
import type { Field } from "@/lib/steps";
import { fieldFilled } from "@/lib/state";
import { scoreFromUserMessage } from "@/lib/ranks";

interface Props {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}

export function FieldCard({ field, value, onChange }: Props) {
  const [showHints, setShowHints] = useState(false);
  const required = field.required !== false;
  const done = fieldFilled(field, value);
  const pts = scoreFromUserMessage(value);
  const len = value.trim().length;
  const min = field.minChars ?? 10;
  const id = `field-${field.id}`;

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition ${
        done ? "border-brand-300" : "border-stone-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-stone-800">
          <span className="mr-1.5">{done ? "✅" : required ? "✏️" : "📝"}</span>
          {field.label}
          {!required && (
            <span className="ml-2 text-xs font-normal text-stone-400">(任意)</span>
          )}
        </label>
        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
          +{pts} pt
        </span>
      </div>
      {field.help && <p className="mt-1 text-xs text-stone-500">{field.help}</p>}
      {(field.rows ?? 3) === 1 ? (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      ) : (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          className="mt-2 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
        <span className={done ? "text-brand-700" : "text-stone-400"}>
          {len} 字{required && !done && ` (あと ${min - len} 字で記入済み)`}
        </span>
        {field.hints && field.hints.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHints((v) => !v)}
            className="rounded-md px-2 py-1 text-brand-700 hover:bg-brand-50"
            aria-expanded={showHints}
          >
            {showHints ? "ヒントを閉じる" : "💭 詰まったら: 考える角度"}
          </button>
        )}
      </div>
      {showHints && field.hints && (
        <ul className="mt-2 space-y-1 rounded-lg bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-900">
          {field.hints.map((h) => (
            <li key={h} className="list-disc ml-3">
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
