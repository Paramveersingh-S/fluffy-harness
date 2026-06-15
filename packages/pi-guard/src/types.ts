import { AgentToolCall, AgentToolResult } from "@earendil-works/pi-agent-core";

export type RuleAction = "allow" | "deny" | "confirm" | "log";

export interface RuleMatch {
    command?: string;
    commandIncludesNetwork?: boolean;
    domainNotIn?: string[];
    path?: string;
}

export interface GuardRule {
    tool: string;
    match: RuleMatch;
    action: RuleAction;
}

export interface GuardPolicy {
    rules: GuardRule[];
    defaultAction: RuleAction;
}

export interface AuditLogEntry {
    timestamp: number;
    sessionId: string;
    tool: string;
    args: unknown;
    matchedRule: GuardRule | null;
    action: RuleAction;
    outcome: "allowed" | "denied";
}
