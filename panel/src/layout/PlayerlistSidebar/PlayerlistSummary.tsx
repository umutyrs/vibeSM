import { playerCountAtom } from "@/hooks/playerlist";
import { maxClientsAtom } from "@/hooks/status";
import { useAtomValue } from "jotai";
import { UsersIcon } from "lucide-react";


export default function PlayerlistSummary() {
    const playerCount = useAtomValue(playerCountAtom);
    const playerCountFormatted = playerCount.toLocaleString("en-US");
    
    // Get the dynamic max slot count from the server config status
    const maxSlots = useAtomValue(maxClientsAtom);
    const fillPercent = Math.min(100, Math.max(1, (playerCount / (maxSlots || 128)) * 100));

    return (
        <div className="w-full flex flex-col">
            <div className="w-full flex justify-between items-center">
                {/* Flat user avatar aligned with the flat styling guidelines */}
                <div className="relative w-10 h-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-primary stroke-[1.5]" />
                </div>
                
                <div className="flex flex-col items-end">
                    <div className="text-2xl font-bold font-display text-foreground tracking-tight leading-none mb-1">
                        {playerCountFormatted}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Active Players
                    </div>
                </div>
            </div>

            {/* Dynamic slot capacity tracker bar */}
            <div className="w-full mt-3 border-t border-border/20 pt-2.5 select-none">
                <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">
                    <span>Server Capacity</span>
                    <span className="text-primary font-mono font-bold">
                        {playerCount} / {maxSlots} Slots
                    </span>
                </div>
                <div className="w-full h-1.5 bg-foreground/5 rounded-full overflow-hidden relative border border-border/20">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${fillPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
