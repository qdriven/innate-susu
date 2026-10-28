import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const bundlePath = process.argv[2];
if (!bundlePath) throw new Error("Usage: node tools/session-run-guard/test-session-run-guard.ts <kernel-bundle.mjs>");

const source = fs.readFileSync(bundlePath, "utf8");
const startMarker = "let SessionRunGateService = class SessionRunGateService extends Disposable {";
const endMarker = "SessionRunGateService = __decorate([";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "SessionRunGateService source markers must exist");

class Disposable {
  protected _register<T>(value: T): T {
    return value;
  }
}

class Error2 extends Error {
  readonly code: string;
  readonly options?: { details?: unknown };

  constructor(code: string, message: string, options?: { details?: unknown }) {
    super(message);
    this.code = code;
    this.options = options;
  }
}

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  Disposable,
  Error2,
  SessionErrors: { codes: { SESSION_STALE: "session.stale" } },
  IWireService: Symbol("IWireService"),
  toDisposable: (dispose: () => void) => ({ dispose }),
});
const SessionRunGateService = vm.runInContext(
  `${source.slice(start, end)}\nSessionRunGateService;`,
  context,
) as new (...args: any[]) => { begin(): void };

type Fixture = {
  gate: { begin(): void };
  locks: {
    held(sessionId: string): boolean;
    hold(sessionId: string): void;
    release(sessionId: string): void;
    onDidHold(): { dispose(): void };
  };
};

function fixture(options: { held: boolean; externallyModified: boolean }): Fixture {
  let held = options.held;
  let releases = 0;
  const locks = {
    held: () => held,
    hold: () => {
      held = true;
    },
    release: () => {
      held = false;
      releases += 1;
    },
    onDidHold: () => ({ dispose: () => undefined }),
  };
  const wire = { externallyModified: () => options.externallyModified };
  const agents = {
    list: () => [{ agentId: "main" }],
    handleOf: () => ({ accessor: { get: () => wire } }),
  };
  const activity = {
    onDidChange: () => ({ dispose: () => undefined }),
    state: () => ({ busy: false }),
  };
  const gate = new SessionRunGateService(
    { sessionId: "session-test" },
    locks,
    { flush: async () => undefined },
    agents,
    activity,
  );
  return {
    gate,
    locks: {
      ...locks,
      release: (sessionId: string) => {
        assert.equal(sessionId, "session-test");
        locks.release(sessionId);
      },
    },
  };
}

function run(name: string, test: () => void): void {
  test();
  console.log(`ok - ${name}`);
}

run("fresh entry accepts an unmodified session", () => {
  const { gate } = fixture({ held: false, externallyModified: false });
  gate.begin();
});

run("fresh entry rejects an externally modified session", () => {
  const { gate } = fixture({ held: false, externallyModified: true });
  assert.throws(() => gate.begin(), /was updated by another client/);
});

run("reentrant submission tolerates host journal appends", () => {
  const { gate } = fixture({ held: true, externallyModified: true });
  gate.begin();
});
