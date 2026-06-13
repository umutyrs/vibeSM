import { MenuNavLink } from '@/components/MainPageLink';
import TxAnchor from '@/components/TxAnchor';
import { useAdminPerms } from '@/hooks/auth';
import { serverNameAtom, vibeConfigStateAtom, selectedServerIdAtom } from '@/hooks/status';
import { cn } from '@/lib/utils';
import { TxConfigState } from '@shared/enums';
import { GlobalStatusType } from '@shared/socketioTypes';
import { useAtomValue, useAtom } from 'jotai';
import { BoxIcon, ChevronRightSquareIcon, DnaIcon, EyeIcon, FileEditIcon, HourglassIcon, LayoutDashboardIcon, ServerIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useBackendApi } from '@/hooks/fetch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';



//Separate component to prevent re-render of the entire menu
function ServerName() {
    return useAtomValue(serverNameAtom);
}

type PendingServerConfigureProps = {
    vibeConfigState?: Exclude<TxConfigState, TxConfigState.Ready>;
}

function PendingServerConfigure({ vibeConfigState }: PendingServerConfigureProps) {
    const [currLocation] = useLocation();
    const [linkHref, setLinkHref] = useState('');
    const linkText = useRef('');

    //This effect is done to prevent the link from popping up in the delay between ui change 
    // and the pendingStep state atom being updated from the socket.io event
    useEffect(() => {
        let newHref = '';
        if (vibeConfigState === TxConfigState.Setup && !currLocation.startsWith('/server/setup')) {
            newHref = '/server/setup';
            linkText.current = 'Go to the setup page!';
        } else if (vibeConfigState === TxConfigState.Deployer && !currLocation.startsWith('/server/deployer')) {
            newHref = '/server/deployer';
            linkText.current = 'Go to the deployer page!';
        } else {
            newHref = '';
        }

        if (!newHref) {
            setLinkHref('');
            return;
        } else {
            const timeout = setTimeout(() => {
                setLinkHref(newHref);
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [currLocation, vibeConfigState]);

    return (
        <div className='flex flex-col items-center justify-center gap-1.5 text-center py-1'>
            <HourglassIcon className='h-5 w-5 text-primary' />
            <p className='text-xs font-medium text-muted-foreground/80 leading-normal max-w-[200px]'>
                You need to configure your server to be able to start it.
            </p>
            {linkHref && (
                <TxAnchor href={linkHref} className='animate-toastbar-enter text-xs text-primary hover:underline font-semibold mt-0.5'>
                    {linkText.current}
                </TxAnchor>
            )}
        </div>
    )
}

import { useTranslation } from '@/hooks/translator';

export default function ServerMenu() {
    const vibeConfigState = useAtomValue(vibeConfigStateAtom);
    const { hasPerm } = useAdminPerms();
    const { t } = useTranslation();
    const [servers, setServers] = useState<any[]>([]);
    const listApi = useBackendApi({ method: 'GET', path: '/multi-hosting/servers' });
    const [selectedServerId, setSelectedServerId] = useAtom(selectedServerIdAtom);

    const handleServerChange = (newVal: string) => {
        setSelectedServerId(newVal);
        window.location.reload();
    };

    useEffect(() => {
        listApi({}).then((data) => {
            if (Array.isArray(data)) {
                setServers(data);
            }
        }).catch(() => {});
    }, []);

    const isConfigPending = vibeConfigState !== TxConfigState.Ready;
    
    // Find active server name
    const activeServerName = selectedServerId === 'primary' 
        ? null 
        : servers.find(s => s.id === selectedServerId)?.name;

    return <div className='relative'>
        <div className="mb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-1.5 block px-1">
                {t('web.header.server')}
            </span>
            {servers.length > 0 ? (
                <Select value={selectedServerId} onValueChange={handleServerChange}>
                    <SelectTrigger className="w-full h-10 px-3 bg-muted/30 hover:bg-muted/60 border border-border/50 rounded-lg transition-all flex items-center justify-between focus:ring-1 focus:ring-ring">
                        <div className="flex items-center gap-2 text-sm font-bold text-primary truncate">
                            <ServerIcon className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                            <SelectValue placeholder={activeServerName || <ServerName />} />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="primary">
                            <ServerName />
                        </SelectItem>
                        {servers.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <div className="w-full h-10 px-3 bg-muted/20 border border-border/30 rounded-lg flex items-center gap-2 text-sm font-bold text-primary select-none">
                    <ServerIcon className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                    <span className="truncate"><ServerName /></span>
                </div>
            )}
        </div>

        {isConfigPending ? (
            <PendingServerConfigure vibeConfigState={vibeConfigState} />
        ) : (
            <div className="space-y-1 select-none">
                    <MenuNavLink href="/">
                        <LayoutDashboardIcon className="mr-2 h-4 w-4" />{t('web.sidebar.dashboard')}
                    </MenuNavLink>
                    <MenuNavLink href="/server/console" disabled={!hasPerm('console.view')}>
                        <ChevronRightSquareIcon className="mr-2 h-4 w-4" />{t('web.sidebar.console')}
                    </MenuNavLink>
                    <MenuNavLink href="/server/resources">
                        <BoxIcon className="mr-2 h-4 w-4" />{t('web.sidebar.resources')}
                    </MenuNavLink>
                    <MenuNavLink href="/server/server-log" disabled={!hasPerm('server.log.view')}>
                        <EyeIcon className="mr-2 h-4 w-4" />{t('web.sidebar.server_log')}
                    </MenuNavLink>
                    <MenuNavLink href="/server/cfg-editor" disabled={!hasPerm('server.cfg.editor')}>
                        <FileEditIcon className="mr-2 h-4 w-4" />{t('web.sidebar.cfg_editor')}
                    </MenuNavLink>
                    {window.txConsts.showAdvanced && (
                        <MenuNavLink href="/advanced" className='text-accent' disabled={!hasPerm('all_permisisons')}>
                            <DnaIcon className="mr-2 h-4 w-4" />{t('web.sidebar.advanced')}
                        </MenuNavLink>
                    )}
                    {import.meta.env.DEV && (
                        <MenuNavLink href="/test" className='text-accent'>
                            <DnaIcon className="mr-2 h-4 w-4" />Test
                        </MenuNavLink>
                    )}
                </div>
        )}
    </div>
}
