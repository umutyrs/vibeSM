import { GaugeIcon, Loader2Icon, MemoryStickIcon, TimerIcon, TrendingUpIcon } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { dashPerfCursorAtom, dashServerStatsAtom, dashSvRuntimeAtom, useGetDashDataAge } from './dashboardHooks';
import { cn } from '@/lib/utils';
import { dateToLocaleDateString, dateToLocaleTimeString, isDateToday } from '@/lib/dateTime';

//NOTE: null and undefined are semantically equal here
type HostStatsDataProps = {
    uptimePct: number | null | undefined;
    medianPlayerCount: number | null | undefined;
    fxsMemory: number | null | undefined;
    nodeMemory: {
        used: number;
        limit: number;
    } | null | undefined;
};

const HostStatsData = memo(({ uptimePct, medianPlayerCount, fxsMemory, nodeMemory }: HostStatsDataProps) => {
    const uptimePart = uptimePct ? uptimePct.toFixed(2) + '%' : '--';
    const medianPlayerPart = medianPlayerCount ? Math.ceil(medianPlayerCount) : '--';
    const fxsPart = fxsMemory ? fxsMemory.toFixed(2) + 'MB' : '--';

    let nodeCustomClass = null;
    let nodePart: React.ReactNode = '--';
    if (nodeMemory) {
        const nodeMemoryUsage = Math.ceil(nodeMemory.used / nodeMemory.limit * 100);
        nodePart = nodeMemory.used.toFixed(2) + 'MB';
        if (nodeMemoryUsage > 85) {
            nodeCustomClass = 'text-rose-400';
        } else if (nodeMemoryUsage > 70) {
            nodeCustomClass = 'text-amber-400';
        }
    }

    return (
        <div className="grid grid-cols-2 gap-3 h-full pb-1">
            {/* Uptime Box */}
            <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col justify-between hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 group select-none">
                <div className="flex justify-between items-center text-primary group-hover:scale-105 transition-transform">
                    <TimerIcon className="size-4 stroke-[2.5]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Uptime</span>
                </div>
                <span className="text-lg font-extrabold text-white tracking-tight mt-1 truncate">{uptimePart}</span>
            </div>

            {/* Players Box */}
            <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col justify-between hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 group select-none">
                <div className="flex justify-between items-center text-primary group-hover:scale-105 transition-transform">
                    <TrendingUpIcon className="size-4 stroke-[2.5]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Median</span>
                </div>
                <span className="text-lg font-extrabold text-white tracking-tight mt-1 truncate">{medianPlayerPart}</span>
            </div>

            {/* FXServer Memory Box */}
            <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col justify-between hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 group select-none">
                <div className="flex justify-between items-center text-primary group-hover:scale-105 transition-transform">
                    <MemoryStickIcon className="size-4 stroke-[2.5]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">FXServer</span>
                </div>
                <span className="text-lg font-extrabold text-white tracking-tight mt-1 truncate">{fxsPart}</span>
            </div>

            {/* Node.js Memory Box */}
            <div
                className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col justify-between hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 group select-none"
                title={nodeMemory ? `${nodeMemory.used.toFixed(2)}MB / ${nodeMemory.limit}MB` : ''}
            >
                <div className="flex justify-between items-center text-primary group-hover:scale-105 transition-transform">
                    <MemoryStickIcon className="size-4 stroke-[2.5]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Node.js</span>
                </div>
                <span className={`text-lg font-extrabold text-white tracking-tight mt-1 truncate ${nodeCustomClass || ''}`}>{nodePart}</span>
            </div>
        </div>
    );
});


export default function ServerStatsCard() {
    const pastStatsData = useAtomValue(dashServerStatsAtom);
    const svRuntimeData = useAtomValue(dashSvRuntimeAtom);
    const perfCursorData = useAtomValue(dashPerfCursorAtom);
    const getDashDataAge = useGetDashDataAge();

    const displayData = useMemo(() => {
        //Data availability & age check
        const dataAge = getDashDataAge();
        if (!svRuntimeData || dataAge.isExpired) return null;

        if (perfCursorData && perfCursorData.snap) {
            const timeStr = dateToLocaleTimeString(perfCursorData.snap.end, '2-digit', '2-digit');
            const dateStr = dateToLocaleDateString(perfCursorData.snap.end, 'short');
            const titleTimeIndicator = isDateToday(perfCursorData.snap.end) ? timeStr : `${timeStr} - ${dateStr}`;
            return {
                fxsMemory: perfCursorData.snap.fxsMemory,
                nodeMemory: svRuntimeData.nodeMemory && perfCursorData.snap.nodeMemory ? {
                    used: perfCursorData.snap.nodeMemory,
                    limit: svRuntimeData.nodeMemory.limit,
                } : null,
                titleTimeIndicator: (<>
                    (<span className="text-xs text-warning-inline font-mono">{titleTimeIndicator}</span>)
                </>)
            };
        } else {
            return {
                fxsMemory: svRuntimeData.fxsMemory,
                nodeMemory: svRuntimeData.nodeMemory,
                titleTimeIndicator: dataAge.isStale ? '(minutes ago)' : '(live)',
            };
        }
    }, [svRuntimeData, perfCursorData]);

    //Rendering
    let titleNode: React.ReactNode = null;
    let contentNode: React.ReactNode = null;
    if (displayData) {
        titleNode = displayData.titleTimeIndicator;
        contentNode = <HostStatsData
            fxsMemory={displayData.fxsMemory}
            medianPlayerCount={pastStatsData?.medianPlayerCount}
            uptimePct={pastStatsData?.uptimePct}
            nodeMemory={displayData.nodeMemory}
        />;
    } else {
        contentNode = (
            <div className="size-full flex flex-col items-center justify-center">
                <Loader2Icon className="animate-spin size-16 text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="col-span-3 sm:col-span-1 2xl:col-span-2 min-w-52 py-3 px-5 flex flex-col glass-card text-card-foreground">
            <div className="flex flex-row items-center justify-between space-y-0 pb-3 text-muted-foreground border-b border-white/5 mb-3">
                <h3 className="font-display font-semibold tracking-tight text-sm text-white line-clamp-1">
                    Server Stats {titleNode}
                </h3>
                <div className='hidden xs:block text-primary'><GaugeIcon size="18" /></div>
            </div>
            {contentNode}
        </div>
    );
}
