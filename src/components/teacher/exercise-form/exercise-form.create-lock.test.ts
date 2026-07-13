// @vitest-environment jsdom
//
// Unit tests for joinOrStartCreate, the pure de-dup lock persist() uses to stop a duplicate
// exercise row from being created when Save draft/Publish is clicked while the first (creating)
// autosave POST is still in flight. Extracted as a standalone, React-free function specifically
// so this race can be verified without rendering the full ExerciseForm component.
import { describe, it, expect } from "vitest";
import { joinOrStartCreate } from "./exercise-form";

describe("joinOrStartCreate (persist()'s create-race lock)", () => {
  it("only starts the create once when two calls race while it is in flight", async () => {
    const lockRef: { current: Promise<{ id: string } | null> | null } = { current: null };
    let resolveCreate!: (value: { id: string }) => void;
    let calls = 0;
    const create = () => {
      calls += 1;
      return new Promise<{ id: string }>((resolve) => {
        resolveCreate = resolve;
      });
    };

    const first = joinOrStartCreate(lockRef, create);
    const second = joinOrStartCreate(lockRef, create);

    expect(calls).toBe(1); // the second call never invoked `create` — it piggybacked instead
    expect(first.started).toBe(true);
    expect(second.started).toBe(false);

    resolveCreate({ id: "ex_1" });

    const [a, b] = await Promise.all([first.request, second.request]);
    expect(a).toEqual({ id: "ex_1" });
    expect(b).toEqual({ id: "ex_1" }); // the piggybacking call sees the SAME created row
    expect(lockRef.current).toBeNull(); // cleared once the create settles
  });

  it("lets the initiator's own error propagate while a piggybacking call sees null instead of throwing", async () => {
    const lockRef: { current: Promise<{ id: string } | null> | null } = { current: null };
    let rejectCreate!: (err: unknown) => void;
    const create = () =>
      new Promise<{ id: string }>((_resolve, reject) => {
        rejectCreate = reject;
      });

    const first = joinOrStartCreate(lockRef, create);
    const second = joinOrStartCreate(lockRef, create);

    rejectCreate(new Error("network down"));

    await expect(first.request).rejects.toThrow("network down");
    await expect(second.request).resolves.toBeNull();
    expect(lockRef.current).toBeNull(); // cleared even on failure, so a later call can retry
  });

  it("starts a brand-new create for a later, non-concurrent call once the lock has cleared", async () => {
    const lockRef: { current: Promise<{ id: string } | null> | null } = { current: null };
    let calls = 0;
    const create = async () => {
      calls += 1;
      return { id: `ex_${calls}` };
    };

    const first = joinOrStartCreate(lockRef, create);
    await first.request;
    expect(lockRef.current).toBeNull();

    const second = joinOrStartCreate(lockRef, create);
    expect(calls).toBe(2); // this call is NOT concurrent with the first — it gets its own POST
    expect(second.started).toBe(true);
    await expect(second.request).resolves.toEqual({ id: "ex_2" });
  });
});
