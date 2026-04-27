"use client";

/**
 * DebouncedInput / DebouncedTextarea
 *
 * Controlled-locally wrappers around <Input>/<Textarea> that prevent network
 * latency from interfering with typing. The component keeps its own local
 * `draft` state and only calls `onCommit(value)` after the user stops typing
 * (debounce), on blur, or on Enter (for input).
 *
 * Usage:
 *   <DebouncedInput value={story.title} onCommit={(v) => updateStoryField("title", v)} />
 *
 * Do NOT pass `value`+`onChange` from the parent; use `value`+`onCommit`.
 */

import { useEffect, useRef, useState, forwardRef } from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";

interface BaseDebouncedProps {
  value: string;
  onCommit: (value: string) => void;
  /** Debounce delay in ms. Default 500. */
  delay?: number;
}

type DebouncedInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "defaultValue"
> & {
  label?: string;
  error?: string;
} & BaseDebouncedProps;

export const DebouncedInput = forwardRef<HTMLInputElement, DebouncedInputProps>(
  function DebouncedInput({ value, onCommit, delay = 500, onBlur, onKeyDown, ...rest }, ref) {
    const [draft, setDraft] = useState(value ?? "");
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const dirtyRef = useRef(false);
    const lastCommittedRef = useRef(value ?? "");

    // Sync external value → local draft only when user is NOT mid-edit
    useEffect(() => {
      if (!dirtyRef.current && (value ?? "") !== draft) {
        setDraft(value ?? "");
        lastCommittedRef.current = value ?? "";
      }
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    function commit(next: string) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      dirtyRef.current = false;
      if (next !== lastCommittedRef.current) {
        lastCommittedRef.current = next;
        onCommit(next);
      }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const next = e.target.value;
      setDraft(next);
      dirtyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => commit(next), delay);
    }

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          // flush pending change on unmount
          if (dirtyRef.current && draft !== lastCommittedRef.current) {
            onCommit(draft);
          }
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Input
        ref={ref}
        value={draft}
        onChange={handleChange}
        onBlur={(e) => {
          commit(draft);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && rest.type !== undefined) {
            commit(draft);
          }
          onKeyDown?.(e);
        }}
        {...rest}
      />
    );
  }
);

type DebouncedTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "defaultValue"
> & {
  label?: string;
  error?: string;
} & BaseDebouncedProps;

export const DebouncedTextarea = forwardRef<HTMLTextAreaElement, DebouncedTextareaProps>(
  function DebouncedTextarea({ value, onCommit, delay = 500, onBlur, ...rest }, ref) {
    const [draft, setDraft] = useState(value ?? "");
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const dirtyRef = useRef(false);
    const lastCommittedRef = useRef(value ?? "");

    useEffect(() => {
      if (!dirtyRef.current && (value ?? "") !== draft) {
        setDraft(value ?? "");
        lastCommittedRef.current = value ?? "";
      }
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    function commit(next: string) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      dirtyRef.current = false;
      if (next !== lastCommittedRef.current) {
        lastCommittedRef.current = next;
        onCommit(next);
      }
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const next = e.target.value;
      setDraft(next);
      dirtyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => commit(next), delay);
    }

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          if (dirtyRef.current && draft !== lastCommittedRef.current) {
            onCommit(draft);
          }
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Textarea
        ref={ref}
        value={draft}
        onChange={handleChange}
        onBlur={(e) => {
          commit(draft);
          onBlur?.(e);
        }}
        {...rest}
      />
    );
  }
);
