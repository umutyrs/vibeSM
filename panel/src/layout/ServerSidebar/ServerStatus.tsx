import { useGlobalStatus, vibeConfigStateAtom } from '@/hooks/status';
import { VariantProps, cva } from 'class-variance-authority';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DiscordBotStatus, FxMonitorHealth, TxConfigState } from '@shared/enums';
import { msToShortDuration } from '@/lib/dateTime';
import { cn } from '@/lib/utils';
import { useAtomValue } from 'jotai';


const statusBadgeVariants = cva(
    `rounded-sm text-xs font-semibold px-1 py-[0.125rem] tracking-widest text-center cursor-help`,
    {
        variants: {
            type: {
                default: "bg-secondary text-secondary-foreground",
                destructive: "bg-destructive text-destructive-foreground",
                warning: "bg-warning text-warning-foreground",
                success: "bg-success text-success-foreground",
                info: "bg-info text-info-foreground",
                muted: "bg-muted text-muted-foreground",
            },
        },
        defaultVariants: {
            type: "default",
        },
    }
);
type StatusBadgeTypesVars = VariantProps<typeof statusBadgeVariants>['type'];
type StatusBadgeProps = {
    tooltip?: string | {
        title: string;
        description: string;
    };
    type?: StatusBadgeTypesVars;
    children: React.ReactNode;
};

function StatusBadge({ children, tooltip, type }: StatusBadgeProps) {
    //If no tooltip is provided, just show the text
    if (!tooltip) {
        return <span className={statusBadgeVariants({ type })}>
            {children}
        </span>
    }

    return <Tooltip>
        <TooltipTrigger asChild>
            <span className={statusBadgeVariants({ type })}>
                {children}
            </span>
        </TooltipTrigger>
        <TooltipContent side='right'>
            {typeof tooltip === 'string' ? (
                <p>{tooltip}</p>
            ) : (<>
                <h3>{tooltip.title}</h3>
                <p className={cn(
                    'text-xs tracking-wider text-muted-foreground whitespace-pre-wrap',
                    type === 'warning' && 'text-warning-inline',
                )}>
                    {tooltip.description}
                </p>
            </>)}
        </TooltipContent>
    </Tooltip>
}


const discordStatusMap = {
    [DiscordBotStatus.Disabled]: {
        text: 'DISABLED',
        color: 'default',
        description: 'Discord bot is disabled.',
    },
    [DiscordBotStatus.Starting]: {
        text: 'STARTING',
        color: 'warning',
        description: 'Discord bot is starting.',
    },
    [DiscordBotStatus.Ready]: {
        text: 'READY',
        color: 'default',
        description: 'Discord bot is ready.',
    },
    [DiscordBotStatus.Error]: {
        text: 'ERROR',
        color: 'destructive',
        description: 'Discord bot is in an error state.',
    },
} as const;

export default function ServerStatus() {
    const vibeConfigState = useAtomValue(vibeConfigStateAtom);
    const globalStatus = useGlobalStatus();

    if (vibeConfigState !== TxConfigState.Ready) {
        return null;
    }

    //Preparing status
    let serverHealthText = '--';
    let serverHealthDescTitle = '--';
    let serverHealthDescInfo = '--';
    let serverHealthColor: StatusBadgeTypesVars = 'default';
    let serverUptimeText = '--';
    let serverUptimeDesc = '--';
    let whitelistText = '--';
    let whitelistDesc = '--';
    let whitelistColor: StatusBadgeTypesVars = 'default';
    let discordStatusText = '--';
    let discordStatusDesc = '--';
    let discordStatusColor: StatusBadgeTypesVars = 'default';

    if (globalStatus) {
        //Server uptime
        if (globalStatus.server.uptime > 0) {
            serverUptimeText = msToShortDuration(
                globalStatus.server.uptime,
                {
                    units: ['d', 'h', 'm'],
                    delimiter: ' ',
                }
            );
            serverUptimeDesc = 'Time since the server came online.';
        }

        //Server status
        serverHealthText = globalStatus.server.health;
        serverHealthDescInfo = globalStatus.server.healthReason;
        if (globalStatus.server.health === FxMonitorHealth.ONLINE) {
            serverHealthColor = 'success';
            serverHealthDescTitle = 'Resources running, accepting connections.';
        } else if (globalStatus.server.health === FxMonitorHealth.STARTING) {
            serverHealthColor = 'warning';
            serverHealthDescTitle = 'Server is starting up...';
        } else if (globalStatus.server.health === FxMonitorHealth.PARTIAL) {
            serverHealthColor = 'warning';
            serverHealthDescTitle = 'Resources not running or not accepting connections.';
        } else if (globalStatus.server.health === FxMonitorHealth.OFFLINE) {
            serverHealthColor = 'destructive';
            serverHealthDescTitle = 'Server is offline.';
        } else {
            serverHealthColor = 'destructive';
            serverHealthDescTitle = 'Unknown server status.';
        }

        //Whitelist
        if (globalStatus.server.whitelist === 'disabled') {
            whitelistText = 'DISABLED';
            whitelistDesc = 'Anyone can join.';
        } else if (globalStatus.server.whitelist === 'adminOnly') {
            whitelistText = 'ADMIN';
            whitelistColor = 'warning';
            whitelistDesc = 'Only admins can join.';
        } else if (globalStatus.server.whitelist === 'discordMember') {
            whitelistText = 'MEMBER';
            whitelistDesc = 'Only Discord server members can join.';
        } else if (globalStatus.server.whitelist === 'discordRoles') {
            whitelistText = 'ROLES';
            whitelistDesc = 'Only Discord server members with the specified roles can join.';
        } else if (globalStatus.server.whitelist === 'approvedLicense') {
            whitelistText = 'LICENSE';
            whitelistDesc = 'Only players with an approved license can join.';
        } else if (globalStatus.server.whitelist === 'external') {
            whitelistText = 'EXTERNAL';
            whitelistDesc = 'Player joins are handled by an external resource.';
        }

        //Bot status - too long to show all the text, so just show the code
        if (globalStatus.discord in discordStatusMap) {
            discordStatusText = discordStatusMap[globalStatus.discord].text;
            discordStatusColor = discordStatusMap[globalStatus.discord].color;
            discordStatusDesc = discordStatusMap[globalStatus.discord].description;
        } else {
            discordStatusText = `CODE-${globalStatus.discord}`;
            discordStatusColor = 'destructive';
            discordStatusDesc = 'Unknown status code';
        }
    }

    return (
        <div className="flex flex-col gap-2.5">
            {/* Live Server Indicator with breathing status lamp */}
            <div className="flex justify-between items-center bg-foreground/5 border border-border/40 rounded-lg p-2.5 hover:bg-foreground/10 transition-all duration-300">
                <div className="flex items-center gap-2 text-foreground/80 text-xs font-bold uppercase tracking-wider">
                    {/* Pulsating status lamp */}
                    <span className={cn(
                        "size-2 rounded-full inline-block shrink-0",
                        serverHealthColor === 'success' && 'lamp-success bg-green-500',
                        serverHealthColor === 'warning' && 'lamp-warning bg-amber-500',
                        serverHealthColor === 'destructive' && 'lamp-destructive bg-red-500',
                        serverHealthColor === 'default' && 'bg-zinc-500'
                    )} />
                    Server
                </div>
                <StatusBadge
                    tooltip={{
                        title: serverHealthDescTitle,
                        description: serverHealthDescInfo
                    }}
                    type={serverHealthColor}
                >{serverHealthText}</StatusBadge>
            </div>

            {/* Other statuses formatted cleanly in a compact grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-1 bg-foreground/5 border border-border/40 rounded-lg p-2 hover:bg-foreground/10 transition-all duration-300">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime</span>
                    <span className="font-semibold text-foreground tracking-wide truncate">
                        {serverUptimeText}
                    </span>
                </div>
                <div className="flex flex-col gap-1 bg-foreground/5 border border-border/40 rounded-lg p-2 hover:bg-foreground/10 transition-all duration-300">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Whitelist</span>
                    <span className="font-semibold text-foreground tracking-wide truncate">
                        {whitelistText}
                    </span>
                </div>
            </div>

            <div className="flex justify-between items-center bg-foreground/5 border border-border/40 rounded-lg p-2 hover:bg-foreground/10 transition-all duration-300 text-xs">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Discord Bot</span>
                </div>
                <StatusBadge
                    tooltip={discordStatusDesc}
                    type={discordStatusColor}
                >{discordStatusText}</StatusBadge>
            </div>
        </div>
    )
}
