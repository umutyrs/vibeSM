import { cn } from '@/lib/utils';
import { handleExternalLinkClick } from "@/lib/navigation";
import ServerMenu from './ServerMenu';
import ServerControls from './ServerControls';
import ServerStatus from './ServerStatus';
import ServerSchedule from './ServerSchedule';
import AdModal from "@/components/AdModal";
import { useAdModal } from "@/hooks/sheets";


type ServerSidebarProps = {
    isSheet?: boolean;
};
export function ServerSidebar({ isSheet }: ServerSidebarProps) {
    const { setIsModalOpen } = useAdModal();
    return (
        <aside
            className={cn(
                'flex flex-col gap-4 z-10',
                isSheet ? 'px-4 py-6' : 'tx-sidebar hidden lg:flex',
            )}
        >
            <div className={cn(
                !isSheet && 'glass-card p-4',
            )}>
                <ServerMenu />
            </div>
            <hr className={isSheet ? 'block' : 'hidden'} />
            <div className={cn(
                !isSheet && 'glass-card p-4',
                'flex flex-col gap-4'
            )}>
                {/* <h2 className="text-lg font-semibold tracking-tight overflow-hidden text-ellipsis">
                    Controls & Status
                </h2> */}
                <ServerControls />
                <ServerStatus />
                <ServerSchedule />
            </div>
            <hr className={isSheet ? 'block' : 'hidden'} />

            {window.txConsts.adsData.main ? (
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        setIsModalOpen(true);
                    }}
                    className='w-sidebar h-[80px] relative self-center group'
                >
                    <img
                        className='rounded-xl max-w-sidebar max-h-[80px] m-auto border border-border'
                        src={window.txConsts.adsData.main.img}
                    />
                </a>
            ) : null}

            {window.txConsts.isWebInterface ? (
                <div className='flex flex-col items-center justify-center gap-1 text-xs font-semibold opacity-85 hover:opacity-100 select-none'>
                    <span className='text-muted-foreground text-center tracking-wide leading-relaxed'>
                        In Collaboration with <br />
                        <span className="text-primary font-bold">ParadiseRP</span> x <span className="text-primary font-bold">roleplayV</span>
                    </span>
                    <span className='text-muted-foreground/60 text-2xs mt-0.5'>
                        &copy; 2019-{(new Date).getUTCFullYear()} Tabarra & umutyrs
                    </span>
                </div>
            ) : null}
            <AdModal />
        </aside>
    );
}
