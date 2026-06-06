import { useEffect, useRef } from 'react';
import ThreadPerfCard from './ThreadPerfCard';
import PlayerDropCard from './PlayerDropCard';
import FullPerfCard from './FullPerfCard';
import { useSetDashboardData } from './dashboardHooks';
import { getSocket } from '@/lib/utils';
import ServerStatsCard from './ServerStatsCard';
import { useAtomValue } from 'jotai';
import { vibeConfigStateAtom } from '@/hooks/status';
import { useLocation } from 'wouter';
import { TxConfigState } from '@shared/enums';
import ModalCentralMessage from '@/components/ModalCentralMessage';
import GenericSpinner from '@/components/GenericSpinner';


import { useAtomValue } from 'jotai';
import { selectedServerIdAtom } from '@/hooks/status';

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
        }
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

            {/* TODO: maybe convert in top server warning */}
            {/* <div className="mx-auto max-w-4xl w-full sm:w-auto sm:min-w-[28rem] relative overflow-hidden z-40 p-3 pr-10 flex items-center justify-between space-x-4 rounded-xl border shadow-lg transition-all text-black/75 dark:text-white/90 border-warning/70 bg-warning-hint animate-toastbar-enter opacity-50 hover:opacity-100">
                <div className="flex-shrink-0 flex flex-col gap-2 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-warning stroke-warning animate-toastbar-icon">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                </div>
                <div className="flex-grow">
                    <span className="block whitespace-pre-line">
                        <b>This update changes how the performance chart show its data.</b> <br />
                        Now the histogram (colors) are based on the time spent on each bucket instead of the number of ticks. And the bucket boundaries (ms) may have changed to have a better resolution at lower tick times.
                    </span>
                </div>
            </div> */}
        </div>
    );
}


export default function DashboardPage() {
    const vibeConfigState = useAtomValue(vibeConfigStateAtom);
    const setLocation = useLocation()[1];

    if (vibeConfigState === TxConfigState.Setup) {
        setLocation('/server/setup');
        return null;
    } else if (vibeConfigState === TxConfigState.Deployer) {
        setLocation('/server/deployer');
        return null;
    } else if (vibeConfigState !== TxConfigState.Ready) {
        return <div className='size-full'>
            <ModalCentralMessage>
            <GenericSpinner msg={`Unknown Config State: ${String(vibeConfigState)}`} />
        </ModalCentralMessage>
        </div>;
    } else {
        return <DashboardPageInner />;
    }
}
