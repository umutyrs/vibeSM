import { useEffect, useRef } from 'react';
import ThreadPerfCard from './ThreadPerfCard';
import PlayerDropCard from './PlayerDropCard';
import FullPerfCard from './FullPerfCard';
import { useSetDashboardData } from './dashboardHooks';
import { getSocket } from '@/lib/utils';
import ServerStatsCard from './ServerStatsCard';
import { useAtomValue } from 'jotai';
import { vibeConfigStateAtom, selectedServerIdAtom } from '@/hooks/status';
import { useLocation } from 'wouter';
import { TxConfigState } from '@shared/enums';
import ModalCentralMessage from '@/components/ModalCentralMessage';
import GenericSpinner from '@/components/GenericSpinner';
import { useTranslation } from '@/hooks/translator';

function DashboardPageInner() {
    const pageSocket = useRef<ReturnType<typeof getSocket> | null>(null);
    const setDashboardData = useSetDashboardData();
    const selectedServerId = useAtomValue(selectedServerIdAtom);

    //Runing on mount and selectedServerId changes
    useEffect(() => {
        pageSocket.current = getSocket([`dashboard#${selectedServerId}`]);
        pageSocket.current.on('connect', () => {
            console.log("Dashboard Socket.IO Connected.");
        });
        pageSocket.current.on('disconnect', (message) => {
            console.log("Dashboard Socket.IO Disonnected:", message);
        });
        pageSocket.current.on('error', (error) => {
            console.log('Dashboard Socket.IO', error);
        });
        pageSocket.current.on('dashboard', function (data) {
            setDashboardData(data);
        });

        return () => {
            pageSocket.current?.removeAllListeners();
            pageSocket.current?.disconnect();
        };
    }, [selectedServerId]);

    return (
        <div className="w-full min-w-96 flex flex-col gap-4 relative">
            {/* Atmospheric breathing cosmic glows inspired by hilux-website */}
            <div className="absolute top-[-20%] left-[15%] w-[40rem] h-[40rem] rounded-full bg-glow-purple pointer-events-none z-0 animate-pulse-glow"></div>
            <div className="absolute bottom-[10%] right-[5%] w-[35rem] h-[35rem] rounded-full bg-glow-rose pointer-events-none z-0 animate-pulse-glow" style={{ animationDelay: '-7s' }}></div>
            <div className="absolute top-[30%] left-[-15%] w-[30rem] h-[30rem] rounded-full bg-glow-orange pointer-events-none z-0 animate-pulse-glow" style={{ animationDelay: '-14s' }}></div>

            <div className="w-full grid grid-cols-3 2xl:grid-cols-8 gap-4 z-10">
                <PlayerDropCard />
                <ServerStatsCard />
                <ThreadPerfCard />
            </div>
            <div className="z-10">
                <FullPerfCard />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { t } = useTranslation();
    const vibeConfigState = useAtomValue(vibeConfigStateAtom);
    const setLocation = useLocation()[1];

    if (vibeConfigState === TxConfigState.Setup) {
        setLocation('/server/setup');
        return null;
    } else if (vibeConfigState === TxConfigState.Deployer) {
        setLocation('/server/deployer');
        return null;
    } else if (vibeConfigState !== TxConfigState.Ready) {
        return (
            <div className='size-full'>
                <ModalCentralMessage>
                    <GenericSpinner msg={t('web.dashboard.err_unknown_state', { state: String(vibeConfigState) })} />
                </ModalCentralMessage>
            </div>
        );
    } else {
        return <DashboardPageInner />;
    }
}
