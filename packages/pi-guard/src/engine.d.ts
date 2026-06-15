import { GuardPolicy, GuardRule } from "./types";
export declare function matchRule(tool: string, args: unknown, rule: GuardRule): boolean;
export declare function evaluateCall(tool: string, args: unknown, policy: GuardPolicy): GuardRule | null;
//# sourceMappingURL=engine.d.ts.map