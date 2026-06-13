import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollArea } from '@/components/ui/scroll-area';
import TxAnchor from '@/components/TxAnchor';
import { cn } from '@/lib/utils';
import { convertRowDateTime } from '@/lib/dateTime';
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2Icon, GavelIcon, AlertTriangleIcon, Undo2Icon, TimerOffIcon, TimerIcon, HourglassIcon } from 'lucide-react';
import { useBackendApi } from '@/hooks/fetch';
import { HistoryTableActionType, HistoryTableSearchResp, HistoryTableSearchType, HistoryTableSortingType } from '@shared/historyApiTypes';
import { useOpenActionModal } from '@/hooks/actionModal';
import { SEARCH_ANY_STRING } from './HistorySearchBox';
import { useTranslation } from '@/hooks/translator';


/**
 * Action row
 */
type HistoryRowProps = {
    action: HistoryTableActionType;
    modalOpener: ReturnType<typeof useOpenActionModal>;
}

function HistoryRow({ action, modalOpener }: HistoryRowProps) {
    const { t } = useTranslation();
    const openModal = () => {
        modalOpener(action.id);
    }

    // Type indicator
    let rowPrefix: React.ReactNode;
    let rowId: React.ReactNode;
    if (action.type === 'warn') {
        rowPrefix = <div className='flex items-center px-2 bg-warning/10 text-warning-inline'>
            <AlertTriangleIcon className='size-4' />
        </div>
        rowId = <span className='tracking-wider text-warning-inline font-bold'>{action.id}</span>
    } else if (action.type === 'ban') {
        rowPrefix = <div className='flex items-center px-2 bg-destructive/10 text-destructive-inline'>
            <GavelIcon className='size-4' />
        </div>
        rowId = <span className='tracking-wider text-destructive-inline font-bold'>{action.id}</span>
    } else {
        throw new Error(`Invalid action type: ${action.type}`);
    }

    //Status indicator
    let statusIcon: React.ReactNode;
    if (action.isRevoked) {
        statusIcon = <Undo2Icon className='size-3.5 text-white/40' />;
    } else if (action.banExpiration) {
        if (action.banExpiration === 'permanent') {
            statusIcon = <TimerOffIcon className='size-3.5 text-destructive-inline' />;
        } else if (action.banExpiration === 'active') {
            statusIcon = <TimerIcon className='size-3.5 text-warning-inline animate-pulse' />;
        }
    } else if (action.type === 'warn' && !action.warnAcked) {
        statusIcon = <HourglassIcon className='size-3.5 text-warning-inline' />;
    }

    return (
        <TableRow onClick={openModal} className='cursor-pointer bg-transparent hover:bg-primary/10 odd:bg-card/25 even:bg-background/25 border-b border-white/5 transition-all duration-300 hover:translate-x-0.5 hover:shadow-[inset_3px_0_0_0_hsl(var(--primary))]'>
            <TableCell className={cn(
                'w-[10.4rem] border-r border-white/5 p-0',
                action.isRevoked && 'opacity-40'
            )}>
                <div className='flex justify-start gap-2 h-10'>
                    {rowPrefix}
                    <div className='p-2 font-mono text-xs my-auto'>
                        {rowId}
                    </div>
                    <div className='flex-grow flex justify-end items-center my-auto pr-3 text-muted-foreground'>
                        {statusIcon}
                    </div>
                </div>
            </TableCell>
            <TableCell className='px-4 py-2.5 border-r border-white/5'>
                <span className='text-ellipsis overflow-hidden line-clamp-1 break-all font-sans font-medium text-white/95'>
                    {action.playerName ? action.playerName : (
                        <span className='text-white/30 italic'>{t('web.history.row_unknown')}</span>
                    )}
                </span>
            </TableCell>
            <TableCell className='px-4 py-2.5 border-r border-white/5'>
                <span className='text-ellipsis overflow-hidden line-clamp-1 break-all font-sans text-xs text-white/80'>
                    {action.reason}
                </span>
            </TableCell>
            <TableCell className='px-4 py-2.5 border-r border-white/5'>
                <span className='text-ellipsis overflow-hidden line-clamp-1 break-all font-sans text-xs text-white/80'>
                    {action.author}
                </span>
            </TableCell>
            <TableCell className='min-w-[10rem] px-4 py-2.5 font-mono text-xs text-white/85'>
                <span className='text-ellipsis overflow-hidden line-clamp-1 break-all'>
                    {convertRowDateTime(action.timestamp)}
                </span>
            </TableCell>
        </TableRow>
    )
}


/**
 * Last row
 */
type LastRowProps = {
    playersCount: number;
    hasReachedEnd: boolean;
    loadError: string | null;
    isFetching: boolean;
    retryFetch: (_reset?: boolean) => Promise<void>;
}

function LastRow({ playersCount, hasReachedEnd, isFetching, loadError, retryFetch }: LastRowProps) {
    const { t } = useTranslation();
    let content: React.ReactNode;
    if (isFetching) {
        content = <Loader2Icon className="mx-auto animate-spin" />
    } else if (loadError) {
        content = <>
            <span className='text-destructive-inline'>{t('web.history.last_row_error', { error: loadError })}</span><br />
            <button className='underline' onClick={() => retryFetch()}>{t('web.history.last_row_try_again')}</button>
        </>
    } else if (hasReachedEnd) {
        content = <span className='font-bold text-muted-foreground'>
            {playersCount ? t('web.history.reached_end') : t('web.history.no_actions')}
        </span>
    } else {
        content = <span>
            {t('web.history.bug_report_1')} <br />
            <i>{t('web.history.bug_report_2_prefix')}<TxAnchor href="https://discord.gg/vibeSM" target="_blank" rel="noopener noreferrer">discord.gg/vibeSM</TxAnchor>{t('web.history.bug_report_2_suffix')}</i>
        </span>
    }

    return (
        <TableRow>
            <TableCell colSpan={5} className='px-4 py-2 text-center'>
                {content}
            </TableCell>
        </TableRow>
    )
}


/**
 * Sortable table header
 */
type SortableTableHeaderProps = {
    label: string;
    sortKey: 'timestamp';
    sortingState: HistoryTableSortingType;
    setSorting: (newState: HistoryTableSortingType) => void;
    className?: string;
}

function SortableTableHeader({ label, sortKey, sortingState, setSorting, className }: SortableTableHeaderProps) {
    const isSorted = sortingState.key === sortKey;
    const isDesc = sortingState.desc;
    const sortIcon = isSorted ? (isDesc ? ' ▼' : ' ▲') : <></>;
    const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.preventDefault();
        setSorting({
            key: sortKey,
            desc: isSorted ? (!isDesc) : true
        });
    }
    return (
        <th
            onClick={onClick}
            className={cn(
                'py-2.5 px-4 text-left font-display font-semibold text-[10px] tracking-wider uppercase text-white/50 cursor-pointer hover:bg-white/5 transition-all duration-200 border-r border-white/5',
                isSorted && 'text-primary bg-white/5 font-bold',
                className,
            )}
        >
            {label}
            <span className='ml-1 text-[8px] text-primary/80 inline-block'>{sortIcon}</span>
        </th>
    )
}

function NonSortableTableHeader({ label, className }: { label: string, className?: string }) {
    return (
        <th className={cn(
            'py-2.5 px-4 font-display font-semibold text-[10px] tracking-wider uppercase text-white/50 border-r border-white/5',
            className,
        )} >
            {label}
        </th>
    )
}


/**
 * History table
 */
type HistoryTableProps = {
    search: HistoryTableSearchType;
    filterbyType: string | undefined,
    filterbyAdmin: string | undefined,
}

export default function HistoryTable({ search, filterbyType, filterbyAdmin }: HistoryTableProps) {
    const { t } = useTranslation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [history, setHistory] = useState<HistoryTableActionType[]>([]);
    const [hasReachedEnd, setHasReachedEnd] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<HistoryTableSortingType>({ key: 'timestamp', desc: true });
    const [isResetting, setIsResetting] = useState(false);
    const openActionModal = useOpenActionModal();

    const historyListingApi = useBackendApi<HistoryTableSearchResp>({
        method: 'GET',
        path: '/history/search',
        abortOnUnmount: true,
    });

    const fetchNextPage = async (resetOffset?: boolean) => {
        setIsFetching(true);
        setLoadError(null);
        if (resetOffset) {
            setIsResetting(true);
        }
        const handleError = (error: string) => {
            setLoadError(error);
            if (resetOffset) {
                setHistory([]);
            }
        }
        try {
            const queryParams: { [key: string]: string | number | boolean } = {
                sortingKey: sorting.key,
                sortingDesc: sorting.desc,
            };
            if (search.value) {
                queryParams.searchValue = search.value;
                queryParams.searchType = search.type;
            }
            if (filterbyType && filterbyType !== SEARCH_ANY_STRING) {
                queryParams.filterbyType = filterbyType;
            }
            if (filterbyAdmin && filterbyAdmin !== SEARCH_ANY_STRING) {
                queryParams.filterbyAdmin = filterbyAdmin;
            }
            if (!resetOffset && history.length) {
                queryParams.offsetParam = history[history.length - 1][sorting.key];
                queryParams.offsetActionId = history[history.length - 1].id;
            }
            const resp = await historyListingApi({ queryParams });

            //Dealing with errors
            if (resp === undefined) {
                return handleError(t('web.history.err_req_failed'));
            } else if ('error' in resp) {
                return handleError(t('web.history.err_req_failed_with', { error: resp.error }));
            }

            //Setting the states
            setLoadError(null);
            setHasReachedEnd(resp.hasReachedEnd);
            setIsResetting(false);
            if (resp.history.length) {
                setHistory((prev) => resetOffset ? resp.history : [...prev, ...resp.history]);
            } else {
                setHistory([]);
            }
        } catch (error) {
            handleError(t('web.history.err_fetch_failed', { error: (error as Error).message }));
        } finally {
            setIsFetching(false);
            setIsResetting(false);
        }
    };

    // The virtualizer
    const rowVirtualizer = useVirtualizer({
        isScrollingResetDelay: 0,
        count: history.length + 1,
        getScrollElement: () => (scrollRef.current as HTMLDivElement)?.getElementsByTagName('div')[0],
        estimateSize: () => 38, // border-b
        overscan: 25,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();
    const virtualizerTotalSize = rowVirtualizer.getTotalSize();

    //NOTE: This is required due to how css works on tables
    //ref: https://github.com/TanStack/virtual/issues/585
    let TopRowPad: React.ReactNode = null;
    let BottomRowPad: React.ReactNode = null;
    if (virtualItems.length > 0) {
        const padStart = virtualItems[0].start - rowVirtualizer.options.scrollMargin;
        if (padStart > 0) {
            TopRowPad = <tr><td colSpan={3} style={{ height: padStart }} /></tr>;
        }
        const padEnd = virtualizerTotalSize - virtualItems[virtualItems.length - 1].end;
        if (padEnd > 0) {
            BottomRowPad = <tr><td colSpan={3} style={{ height: padEnd }} /></tr>;
        }
    }

    // Automagically fetch next page when reaching the end
    useEffect(() => {
        if (!history.length || !virtualItems.length) return;
        const lastVirtualItemIndex = virtualItems[virtualItems.length - 1].index;
        if (history.length <= lastVirtualItemIndex && !hasReachedEnd && !isFetching) {
            fetchNextPage()
        }
    }, [history, virtualItems, hasReachedEnd, isFetching]);

    //on state change, reset the list
    useEffect(() => {
        rowVirtualizer.scrollToIndex(0);
        fetchNextPage(true);
    }, [search, filterbyType, filterbyAdmin, sorting]);


    return (
        <div
            className="w-full max-h-full min-h-96 overflow-auto border border-white/10 bg-card/25 backdrop-blur-md md:rounded-xl shadow-2xl"
            style={{ overflowAnchor: "none" }}
        >
            <ScrollArea className="h-full" ref={scrollRef}>
                <table className='w-full caption-bottom text-sm select-none'>
                    <TableHeader>
                        <tr className='sticky top-0 z-10 bg-card/85 backdrop-blur-md text-foreground text-[10px] border-b border-white/10 transition-colors uppercase tracking-wider'>
                            <NonSortableTableHeader label={t('web.history.header_action')} />
                            <NonSortableTableHeader label={t('web.history.header_player')} />
                            <NonSortableTableHeader label={t('web.history.header_reason')} />
                            <NonSortableTableHeader label={t('web.history.header_author')} />
                            <SortableTableHeader
                                label={t('web.history.header_date_time')}
                                sortKey='timestamp'
                                sortingState={sorting}
                                setSorting={setSorting}
                            />
                        </tr>
                    </TableHeader>
                    <TableBody className={cn(isResetting && 'opacity-25')}>
                        {TopRowPad}
                        {virtualItems.map((virtualItem) => {
                            const isLastRow = virtualItem.index > history.length - 1;
                            return isLastRow ? (
                                <LastRow
                                    key={virtualItem.key}
                                    playersCount={history.length}
                                    hasReachedEnd={hasReachedEnd}
                                    loadError={loadError}
                                    isFetching={isFetching}
                                    retryFetch={fetchNextPage}
                                />
                            ) : (
                                <HistoryRow
                                    key={virtualItem.key}
                                    action={history[virtualItem.index]}
                                    modalOpener={openActionModal}
                                />
                            )
                        })}
                        {BottomRowPad}
                    </TableBody>
                </table>
            </ScrollArea>
        </div>
    );
}
