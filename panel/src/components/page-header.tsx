import { CalendarIcon, ChevronRightIcon, SaveIcon, UserIcon } from "lucide-react";
import { ConfigChangelogEntry } from "@shared/otherTypes";
import { useMemo, useState } from "react";
import { dateToLocaleDateString, dateToLocaleTimeString, isDateToday, tsToLocaleDateTimeString } from "@/lib/dateTime";
import TxAnchor from "@/components/TxAnchor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";


//MARK: PageHeaderChangelog
type PageHeaderChangelogProps = {
    changelogData?: ConfigChangelogEntry[];
}
export function PageHeaderChangelog({ changelogData }: PageHeaderChangelogProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const mostRecent = useMemo(() => {
        if (!changelogData?.length) return null;
        const last = changelogData[changelogData.length - 1];
        const lastDate = new Date(last.ts);
        const timeStr = dateToLocaleTimeString(lastDate, '2-digit', '2-digit');
        const dateStr = dateToLocaleDateString(lastDate, 'long');
        const titleTimeIndicator = isDateToday(lastDate) ? timeStr : dateStr;
        return {
            author: last.author,
            dateTime: titleTimeIndicator,
        }
    }, [changelogData]);

    const reversedChangelog = useMemo(() => {
        if (!changelogData) return null;
        return [...changelogData].reverse();
    }, [changelogData]);

    const handleOpenChangelog = () => {
        setIsModalOpen(true);
    }

    const placeholder = Array.isArray(changelogData) ? 'No changes yet' : 'loading...';

    return (<>
        <div className='flex xs:flex-col max-xs:items-center max-xs:gap-2 max-xs:w-full px-2 py-1 rounded-lg text-muted-foreground group relative'>
            {reversedChangelog?.length ? (
                <div
                    className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-card opacity-0 border group-hover:opacity-100 transition-opacity text-primary group-active:bg-primary group-active:text-primary-foreground group-active:border-none select-none cursor-pointer"
                    onClick={handleOpenChangelog}
                >
                    View Changelog
                </div>
            ) : null}
            <div className='tracking-wider leading-3 font-semibold'>
                <SaveIcon className='max-xs:hidden size-4 inline-block align-text-bottom' /> Last Updated
                <span className="xs:hidden">:</span>
            </div>
            <div className='text-xs'>
                <CalendarIcon className='size-4 inline-block align-text-bottom' /> {mostRecent?.dateTime ?? placeholder}
            </div>
            {/* <div className='text-xs'>
                <UserIcon className='size-4 inline-block align-text-bottom' /> {mostRecent?.author ?? placeholder}
            </div> */}
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className='max-sm:p-4 max-w-xl'>
                <DialogHeader>
                    <DialogTitle>Recent Changes</DialogTitle>
                </DialogHeader>
                <div
                    className="pr-3 max-h-[80vh] overflow-auto space-y-3"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {reversedChangelog?.map((entry, i) => <ChangelogEntry key={i} entry={entry} />)}
                </div>
            </DialogContent>
        </Dialog>
    </>)
}


function ChangelogEntry({ entry }: { entry: ConfigChangelogEntry }) {
    return (
        <div className='flex flex-col gap-2 px-3 py-2 rounded-md border odd:bg-card/75'>
            <div className="flex justify-between items-center">
                <div className='font-semibold text-accent'>
                    <UserIcon className='size-5 mr-2 inline-block align-text-bottom opacity-65' />
                    {entry.author}
                </div>
                <div className='text-sm text-muted-foreground'>
                    {tsToLocaleDateTimeString(entry.ts, 'short', 'short')}
                </div>
            </div>
            <div className='flex gap-1 flex-wrap text-sm'>
                {entry.keys.length ? entry.keys.map((cfg, index) => (
                    <span>
                        <div key={cfg} className='inline px-1 py-0.5 font-mono tracking-wide rounded bg-secondary/50'>{cfg}</div>
                        {index < entry.keys.length - 1 && ','}
                    </span>
                )) : (
                    <div className='italic'>No changes</div>
                )}
            </div>
        </div>
    )
}


//MARK: PageHeaderLinks
type PageHeaderLinksProps = {
    topLabel: string;
    topLink: string;
    bottomLabel: string;
    bottomLink: string;
}
export function PageHeaderLinks(props: PageHeaderLinksProps) {
    return (
        <div className='flex max-xs:gap-2 xs:flex-col px-2 py-1'>
            <TxAnchor href={props.topLink} className='text-sm'>{props.topLabel}</TxAnchor>
            <TxAnchor href={props.bottomLink} className='text-sm'>{props.bottomLabel}</TxAnchor>
        </div>
    )
}


//MARK: PageHeader
type PageHeaderProps = {
    title: string;
    icon: React.ReactNode;
    parentName?: string;
    parentLink?: string;
    children?: React.ReactNode;
}
export function PageHeader(props: PageHeaderProps) {
    const categoryEyebrow = props.parentName ? props.parentName.toUpperCase() : "vibeSM Management";
    return (
        <header className='border-b border-border mb-4 pb-2'>
            <div className='flex max-xs:flex-col gap-2 xs:gap-4 max-xs:items-start justify-between items-center px-4 py-2'>
                <div className="flex flex-col gap-1">
                    <div className="tx-eyebrow">
                        {categoryEyebrow}
                    </div>
                    <div className="flex items-center gap-2 text-headline font-semibold text-foreground">
                        <span className="opacity-75">{props.icon}</span>
                        <span>{props.title}</span>
                    </div>
                </div>
                {props.children}
            </div>
        </header>
    );
}
