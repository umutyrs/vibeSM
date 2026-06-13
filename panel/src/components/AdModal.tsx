import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAdModal } from "@/hooks/sheets";
import { Sparkles, ArrowRight } from "lucide-react";
import * as React from "react";

export default function AdModal() {
    const { isModalOpen, setIsModalOpen } = useAdModal();

    const handleSelect = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        setIsModalOpen(false);
    };

    // Load dynamic adModal data from txConsts
    const adModalData = window.txConsts.adsData?.adModal;

    // Fallback if not configured
    const title = adModalData?.title ?? "Select Your Destination";
    const description = adModalData?.description ?? "Choose which of our premium roleplay servers you would like to explore.";
    const servers = adModalData?.servers ?? [
        {
            name: "roleplayV",
            url: "https://roleplayv.de",
            subtext: "roleplayv.de",
            img: "https://i.postimg.cc/m29ZsVcn/roleplay-V-logo.png",
            color: "#a80a40"
        },
        {
            name: "ParadiseRP",
            url: "https://paradiserp.net",
            subtext: "paradiserp.net",
            img: "https://i.postimg.cc/y8RDB7P1/paradise-2000x635.png",
            color: "#d946ef"
        }
    ];

    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-md bg-card/60 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl p-6 text-center overflow-hidden">
                {/* Visual atmosphere glows */}
                <div className="absolute top-[-30%] left-[-20%] w-[18rem] h-[18rem] rounded-full bg-primary/10 pointer-events-none z-0 filter blur-3xl"></div>
                <div className="absolute bottom-[-30%] right-[-20%] w-[18rem] h-[18rem] rounded-full bg-glow-rose/10 pointer-events-none z-0 filter blur-3xl"></div>

                <DialogHeader className="relative z-10 flex flex-col items-center gap-1">
                    {/* <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse mb-2">
                        <Sparkles className="size-6" />
                    </div> */}
                    <DialogTitle className="text-xl font-bold tracking-tight font-sans">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm max-w-[280px] mx-auto leading-normal">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 mt-6 relative z-10 max-h-[60vh] overflow-y-auto pr-1">
                    {servers.map((srv) => (
                        <button
                            key={srv.name + srv.url}
                            onClick={() => handleSelect(srv.url)}
                            style={{
                                '--hover-bg': `${srv.color}0d`, // 5% opacity
                                '--hover-border': `${srv.color}99`, // 60% opacity
                                '--hover-color': srv.color,
                            } as React.CSSProperties}
                            className="group flex items-center justify-between p-4 rounded-xl border border-border/30 bg-foreground/[0.02] hover:bg-[var(--hover-bg)] hover:border-[var(--hover-border)] transition-all duration-300 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-1.5 rounded-lg bg-background/60 border border-border/20 group-hover:scale-105 transition-all duration-300 w-28 h-14 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={srv.img}
                                        alt={srv.name}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground text-sm tracking-wide group-hover:text-[var(--hover-color)] transition-colors">
                                        {srv.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                        {srv.subtext}
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-[var(--hover-color)] transition-all duration-300" />
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
