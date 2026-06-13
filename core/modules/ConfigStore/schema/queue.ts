import { z } from "zod";
import { discordSnowflakeSchema, typeDefinedConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";
import consts from "@shared/consts";

const enabled = typeDefinedConfig({
    name: 'Queue Enabled',
    default: false,
    validator: z.boolean(),
    fixer: (val: any) => typeof val === 'boolean' ? val : false,
});

export const polishRolesArray = (input: string[]) => {
    const unique = [...new Set(input)];
    unique.sort((a, b) => Number(a) - Number(b));
    return unique;
}

const priorityRoles = typeDefinedConfig({
    name: 'Priority Discord Roles',
    default: [],
    validator: discordSnowflakeSchema.array().transform(polishRolesArray),
    fixer: (input: any) => {
        if (!Array.isArray(input)) return [];
        const valid = input.filter(item => consts.regexDiscordSnowflake.test(item));
        return polishRolesArray(valid);
    },
});

const teamRoles = typeDefinedConfig({
    name: 'Team/Staff Discord Roles',
    default: [],
    validator: discordSnowflakeSchema.array().transform(polishRolesArray),
    fixer: (input: any) => {
        if (!Array.isArray(input)) return [];
        const valid = input.filter(item => consts.regexDiscordSnowflake.test(item));
        return polishRolesArray(valid);
    },
});

const customMaxSlots = typeDefinedConfig({
    name: 'Custom Max Slots',
    default: 0,
    validator: z.number().int().min(0),
    fixer: (val: any) => typeof val === 'number' ? Math.max(0, Math.floor(val)) : 0,
});

const adaptiveCardJson = typeDefinedConfig({
    name: 'Adaptive Card JSON',
    default: JSON.stringify({
        type: "AdaptiveCard",
        body: [
            {
                type: "Container",
                items: [
                    {
                        type: "TextBlock",
                        text: "vibeSM Connection Queue",
                        wrap: true,
                        size: "Medium",
                        weight: "Bolder",
                        color: "Accent",
                        horizontalAlignment: "Center"
                    },
                    {
                        type: "ColumnSet",
                        columns: [
                            {
                                type: "Column",
                                items: [
                                    {
                                        type: "Image",
                                        style: "Person",
                                        url: "{{avatarURL}}",
                                        size: "Medium",
                                        altText: "Avatar"
                                    }
                                ],
                                width: "auto"
                            },
                            {
                                type: "Column",
                                items: [
                                    {
                                        type: "TextBlock",
                                        weight: "Bolder",
                                        text: "{{playerName}}",
                                        wrap: true,
                                        size: "Medium"
                                    },
                                    {
                                        type: "TextBlock",
                                        spacing: "None",
                                        text: "Welcome! Please wait while we process your connection.",
                                        isSubtle: true,
                                        wrap: true,
                                        size: "Small"
                                    }
                                ],
                                width: "stretch"
                            }
                        ]
                    },
                    {
                        type: "ColumnSet",
                        columns: [
                            {
                                type: "Column",
                                items: [
                                    {
                                        type: "TextBlock",
                                        weight: "Bolder",
                                        text: "Queue Position:",
                                        wrap: true,
                                        spacing: "Small"
                                    },
                                    {
                                        type: "TextBlock",
                                        text: "Time Elapsed:",
                                        wrap: true,
                                        spacing: "Small"
                                    }
                                ],
                                width: "auto"
                            },
                            {
                                type: "Column",
                                items: [
                                    {
                                        type: "TextBlock",
                                        text: "{{position}}/{{queueLength}}",
                                        wrap: true,
                                        spacing: "Small"
                                    },
                                    {
                                        type: "TextBlock",
                                        text: "{{elapsedTime}}",
                                        wrap: true,
                                        spacing: "Small"
                                    }
                                ],
                                width: "stretch"
                            }
                        ]
                    }
                ]
            }
        ],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.5"
    }, null, 2),
    validator: z.string().refine((val) => {
        try {
            JSON.parse(val);
            return true;
        } catch {
            return false;
        }
    }, { message: "Must be a valid JSON string" }),
    fixer: SYM_FIXER_DEFAULT,
});

const priorityLabel = typeDefinedConfig({
    name: 'Priority Role Label',
    default: 'Priority',
    validator: z.string().min(1),
    fixer: (val: any) => typeof val === 'string' && val.length > 0 ? val : 'Priority',
});

const standardLabel = typeDefinedConfig({
    name: 'Standard Role Label',
    default: 'Standard',
    validator: z.string().min(1),
    fixer: (val: any) => typeof val === 'string' && val.length > 0 ? val : 'Standard',
});

const queueMessageTemplate = typeDefinedConfig({
    name: 'Queue Message Template',
    default: '\n[vibeSM Queue]\nPosition: {{position}}/{{queueLength}} ({{queueType}})\nActive players: {{activePlayers}}/{{maxSlots}}\n\nPlease wait...',
    validator: z.string().min(1),
    fixer: (val: any) => typeof val === 'string' && val.length > 0 ? val : '\n[vibeSM Queue]\nPosition: {{position}}/{{queueLength}} ({{queueType}})\nActive players: {{activePlayers}}/{{maxSlots}}\n\nPlease wait...',
});

export default {
    enabled,
    priorityRoles,
    teamRoles,
    customMaxSlots,
    adaptiveCardJson,
    priorityLabel,
    standardLabel,
    queueMessageTemplate,
} as const;
