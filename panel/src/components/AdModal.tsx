import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAdModal } from "@/hooks/sheets";
import { Gamepad2, Sparkles, ArrowRight } from "lucide-react";

export default function AdModal() {
    const { isModalOpen, setIsModalOpen } = useAdModal();

    const handleSelect = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        setIsModalOpen(false);
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-md bg-card/60 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl p-6 text-center overflow-hidden">
                {/* Visual atmosphere glows */}
                <div className="absolute top-[-30%] left-[-20%] w-[18rem] h-[18rem] rounded-full bg-primary/10 pointer-events-none z-0 filter blur-3xl"></div>
                <div className="absolute bottom-[-30%] right-[-20%] w-[18rem] h-[18rem] rounded-full bg-glow-rose/10 pointer-events-none z-0 filter blur-3xl"></div>

                <DialogHeader className="relative z-10 flex flex-col items-center gap-1">
                    <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse mb-2">
                        <Sparkles className="size-6" />
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight font-sans">
                        Select Your Destination
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                        Choose which of our premium roleplay servers you would like to explore.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 mt-6 relative z-10">
                    <button
                        onClick={() => handleSelect("https://roleplayv.de")}
                        className="group flex items-center justify-between p-4 rounded-xl border border-border/30 bg-foreground/[0.02] hover:bg-[#a80a40]/5 hover:border-[#a80a40]/60 transition-all duration-300 text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-1.5 rounded-lg bg-background/60 border border-border/20 group-hover:scale-105 transition-all duration-300 w-28 h-14 flex items-center justify-center overflow-hidden">
                                <img 
                                    src="https://i.postimg.cc/m29ZsVcn/roleplay-V-logo.png" 
                                    alt="roleplayV"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-sm tracking-wide group-hover:text-[#a80a40] transition-colors">
                                    roleplayV
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                    roleplayv.de
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-[#a80a40] transition-all duration-300" />
                    </button>

                    <button
                        onClick={() => handleSelect("https://paradiserp.net")}
                        className="group flex items-center justify-between p-4 rounded-xl border border-border/30 bg-foreground/[0.02] hover:bg-[#d946ef]/5 hover:border-[#d946ef]/60 transition-all duration-300 text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-1.5 rounded-lg bg-background/60 border border-border/20 group-hover:scale-105 transition-all duration-300 w-28 h-14 flex items-center justify-center overflow-hidden">
                                <img 
                                    src="https://i.postimg.cc/y8RDB7P1/paradise-2000x635.png" 
                                    alt="ParadiseRP"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-sm tracking-wide group-hover:text-[#d946ef] transition-colors">
                                    ParadiseRP
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                    paradiserp.net
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-[#d946ef] transition-all duration-300" />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
