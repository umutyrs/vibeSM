import InlineCode from '@/components/InlineCode';
import { txToast } from '@/components/TxToaster';
import { Button } from '@/components/ui/button';
import { useOpenPromptDialog } from '@/hooks/dialogs';
import { useCloseAllSheets } from '@/hooks/sheets';
import { useGlobalStatus, vibeConfigStateAtom } from '@/hooks/status';
import { useBackendApi } from '@/hooks/fetch';
import { cn } from '@/lib/utils';
import { msToDuration } from '@/lib/dateTime';
import { PenLineIcon, PlayCircleIcon, PlusCircleIcon, XCircleIcon } from 'lucide-react';
import { useAdminPerms } from '@/hooks/auth';
import { useAtomValue } from 'jotai';
import { TxConfigState } from '@shared/enums';

//Prompt props
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezoneDiffMessage = (
    <p className='text-destructive'>
        Server's timezone: <b>{window.txConsts.serverTimezone}</b> <br />
        Your timezone: <b>{browserTimezone}</b> <br />
        Either use relative times, or make sure the scheduled is based on the server timezone.
    </p>
)
const promptCommonProps = {
    suggestions: ['+5', '+10', '+15', '+30'],
    title: 'When should the server restart?',
    message: (<>
        <p>
            Possible formats: <br />
            <ul className='list-disc ml-4'>
                <li>
                    <InlineCode>+MM</InlineCode> relative time in minutes
                    (example: <InlineCode>+15</InlineCode> for 15 minutes from now.)
                </li>
                <li>
                    <InlineCode>HH:MM</InlineCode> absolute 24-hour time
                    (example: <InlineCode>23:30</InlineCode> for 11:30 PM.)
                </li>
            </ul>
        </p>
        {browserTimezone !== window.txConsts.serverTimezone && timezoneDiffMessage}
    </>),
    placeholder: '+15',
    required: true,
    isWide: true,
};

//Validate schedule time input for 24h format or relative time
const validateSchedule = (input: string) => {
    if (input.startsWith('+')) {
        const minutes = parseInt(input.substring(1));
        if (isNaN(minutes) || minutes < 1 || minutes >= 1440) {
            return false;
        }
    } else {
        const [hours, minutes] = input.split(':', 2).map(x => parseInt(x));
        if (
            typeof hours === 'undefined' || isNaN(hours) || hours < 0 || hours > 23
            || typeof minutes === 'undefined' || isNaN(minutes) || minutes < 0 || minutes > 59
        ) {
            return false;
        }
    }
    return true;
}


export default function ServerSchedule() {
    const vibeConfigState = useAtomValue(vibeConfigStateAtom);
    const closeAllSheets = useCloseAllSheets();
    const openPromptDialog = useOpenPromptDialog();
    const { hasPerm } = useAdminPerms();
    const schedulerApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/schedule'
    });

    const globalStatus = useGlobalStatus();

    if (vibeConfigState !== TxConfigState.Ready) {
        return null;
    }

    if (!globalStatus) {
        return (
            <div className="border-t border-border/40 pt-3 mt-1">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <span className="size-1.5 bg-zinc-500 rounded-full inline-block shrink-0" />
                    Next Restart
                </h3>
                <div className="bg-foreground/5 border border-border/40 rounded-lg p-2 flex items-center justify-between">
                    <span className='text-xs font-semibold tracking-wide truncate text-muted-foreground/60 italic'>loading...</span>
                </div>
            </div>
        )
    }

    //Processing status
    const { scheduler } = globalStatus;
    let nextScheduledText = 'nothing scheduled';
    let nextScheduledClasses = 'text-muted-foreground italic';
    let disableAddEditBtn = false;
    let showCancelBtn = false;
    let showEnableBtn = false;
    const hasScheduledRestart = typeof scheduler.nextRelativeMs === 'number';
    if (hasScheduledRestart) {
        const tempFlag = (scheduler.nextIsTemp) ? '(temp)' : '';
        const relativeTime = msToDuration(scheduler.nextRelativeMs, { units: ['h', 'm'] });
        const isLessThanMinute = scheduler.nextRelativeMs < 60_000;
        if (isLessThanMinute) {
            disableAddEditBtn = true;
            nextScheduledText = `right now ${tempFlag}`;
        } else {
            nextScheduledText = `in ${relativeTime} ${tempFlag}`;
        }

        if (scheduler.nextSkip) {
            nextScheduledClasses = 'text-muted-foreground line-through';
            if (!isLessThanMinute) {
                showEnableBtn = true;
            }
        } else {
            nextScheduledClasses = 'text-warning-inline';
            if (!isLessThanMinute) {
                showCancelBtn = true;
            }
        }
    }


    //Handlers
    const onScheduleSubmit = (input: string) => {
        closeAllSheets();
        if (input.includes(',')) {
            txToast.error({
                title: 'Invalid scheduled restart time.',
                msg: 'It looks like you are trying to schedule multiple restart times, which can only be done in the Settings page.\nThis input is for just the next (not persistent) restart.',
            }, { duration: 10000 });
            return;
        }
        if (!validateSchedule(input)) {
            txToast.error(`Invalid schedule time: ${input}`)
            return;
        }
        schedulerApi({
            data: { action: 'setNextTempSchedule', parameter: input },
            toastLoadingMessage: 'Scheduling server restart...',
        });
    }
    const handleEdit = () => {
        openPromptDialog({
            ...promptCommonProps,
            onSubmit: onScheduleSubmit,
            submitLabel: 'Edit',
        });
    }
    const handleAddSchedule = () => {
        openPromptDialog({
            ...promptCommonProps,
            onSubmit: onScheduleSubmit,
            submitLabel: 'Schedule',
        });
    }
    const handleCancel = () => {
        closeAllSheets();
        schedulerApi({
            data: { action: 'setNextSkip', parameter: true },
            toastLoadingMessage: 'Cancelling next server restart...',
        });
    }
    const handleEnable = () => {
        closeAllSheets();
        schedulerApi({
            data: { action: 'setNextSkip', parameter: false },
            toastLoadingMessage: 'Enabling next server restart...',
        });
    }

    const hasSchedulePerms = hasPerm('control.server');

    return (
        <div className="border-t border-border/40 pt-3.5 mt-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="size-1.5 bg-rose-500 rounded-full inline-block shrink-0" />
                Next Restart
            </h3>
            <div className="bg-foreground/5 border border-border/40 rounded-lg p-2.5 flex items-center justify-between">
                <span className={cn('text-xs font-semibold tracking-wide truncate', nextScheduledClasses)}>{nextScheduledText}</span>
            </div>
            <div className='flex flex-row justify-between gap-2 mt-2.5'>
                {hasScheduledRestart ? (
                    <Button
                        size='xs'
                        variant='ghost'
                        className='flex-grow bg-foreground/5 border border-border/40 hover:bg-foreground/10 hover:border-border text-foreground text-[11px] h-7.5 active:scale-95 transition-all duration-300'
                        disabled={!hasSchedulePerms || disableAddEditBtn}
                        onClick={handleEdit}
                    >
                        <PenLineIcon className='h-3.5 w-3.5 mr-1 text-primary' /> Edit
                    </Button>
                ) : (
                    <Button
                        size='xs'
                        variant='ghost'
                        className='flex-grow bg-foreground/5 border border-border/40 hover:bg-foreground/10 hover:border-border text-foreground text-[11px] h-7.5 active:scale-95 transition-all duration-300'
                        disabled={!hasSchedulePerms || disableAddEditBtn}
                        onClick={handleAddSchedule}
                    >
                        <PlusCircleIcon className='h-3.5 w-3.5 mr-1 text-primary' /> Schedule
                    </Button>
                )}
                {showCancelBtn && (
                    <Button
                        size='xs'
                        variant='ghost'
                        className='flex-grow bg-foreground/5 border border-border/40 hover:bg-foreground/10 hover:border-border text-foreground text-[11px] h-7.5 active:scale-95 transition-all duration-300'
                        onClick={handleCancel}
                        disabled={!hasSchedulePerms}
                    >
                        <XCircleIcon className='h-3.5 w-3.5 mr-1 text-rose-400' /> Cancel
                    </Button>
                )}
                {showEnableBtn && (
                    <Button
                        size='xs'
                        variant='ghost'
                        className='flex-grow bg-foreground/5 border border-border/40 hover:bg-foreground/10 hover:border-border text-foreground text-[11px] h-7.5 active:scale-95 transition-all duration-300'
                        onClick={handleEnable}
                        disabled={!hasSchedulePerms}
                    >
                        <PlayCircleIcon className='h-3.5 w-3.5 mr-1 text-emerald-400' /> Enable
                    </Button>
                )}
            </div>
        </div>
    );
}
