// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePoll, shouldRefetch } from "./use-poll";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// A small deferred so a test can hold a fetch "in flight" and release it later.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// ==================== Pure helper: shouldRefetch ====================

describe("shouldRefetch", () => {
  it("is true at the exact boundary (now - lastAt === intervalMs)", () => {
    expect(shouldRefetch(1000, 1000 + 5000, 5000)).toBe(true);
  });

  it("is false just before the boundary (now - lastAt < intervalMs)", () => {
    expect(shouldRefetch(1000, 1000 + 4999, 5000)).toBe(false);
  });

  it("is true past the boundary (now - lastAt > intervalMs)", () => {
    expect(shouldRefetch(1000, 1000 + 5001, 5000)).toBe(true);
  });

  it("is false when no time has elapsed", () => {
    expect(shouldRefetch(1000, 1000, 5000)).toBe(false);
  });

  it("treats a fresh mount (lastAt=0) as due", () => {
    expect(shouldRefetch(0, 1, 5000)).toBe(false);
    expect(shouldRefetch(0, 5000, 5000)).toBe(true);
  });
});

// ==================== Hook behavior ====================

describe("usePoll", () => {
  it("fetches once on mount and exposes the resolved data", async () => {
    const fetcher = vi.fn(async () => "hello");
    const { result } = renderHook(() => usePoll(fetcher, 10_000));

    await waitFor(() => expect(result.current.data).toBe("hello"));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("starts with data=null before the first fetch resolves", async () => {
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const { result } = renderHook(() => usePoll(fetcher, 10_000));

    expect(result.current.data).toBeNull();
    await act(async () => {
      d.resolve("later");
    });
    expect(result.current.data).toBe("later");
  });

  it("refetches when the window receives focus", async () => {
    let n = 0;
    const fetcher = vi.fn(async () => ++n);
    const { result } = renderHook(() => usePoll(fetcher, 10_000));
    await waitFor(() => expect(result.current.data).toBe(1));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("refetches on visibilitychange when the document becomes visible", async () => {
    let n = 0;
    const fetcher = vi.fn(async () => ++n);
    const { result } = renderHook(() => usePoll(fetcher, 10_000));
    await waitFor(() => expect(result.current.data).toBe(1));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it("does NOT refetch on visibilitychange when the document is hidden", async () => {
    const fetcher = vi.fn(async () => "x");
    renderHook(() => usePoll(fetcher, 10_000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Give any erroneous async fetch a chance to run.
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("skips overlapping fetches: triggers while one is in flight do not start a second", async () => {
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    renderHook(() => usePoll(fetcher, 10_000));

    // The mount fetch is now in flight (unresolved). Fire several focus events.
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Release the in-flight fetch; still only the single call happened.
    await act(async () => {
      d.resolve("done");
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches on the interval after intervalMs elapses", async () => {
    vi.useFakeTimers();
    let n = 0;
    const fetcher = vi.fn(async () => ++n);
    renderHook(() => usePoll(fetcher, 5_000));

    // Flush the mount fetch.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops polling and detaches listeners on unmount", async () => {
    const fetcher = vi.fn(async () => "x");
    const { unmount } = renderHook(() => usePoll(fetcher, 10_000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    unmount();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      await Promise.resolve();
    });
    // No new fetch after unmount.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not update state (no throw) if a fetch resolves after unmount", async () => {
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const { unmount } = renderHook(() => usePoll(fetcher, 10_000));

    unmount();
    // Resolve the in-flight mount fetch after unmount — must be a no-op.
    await act(async () => {
      d.resolve("late");
    });
    // Reaching here without a React "state update on unmounted" error is the assertion.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
