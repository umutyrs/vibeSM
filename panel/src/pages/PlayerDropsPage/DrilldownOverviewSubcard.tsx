import { useMemo } from "react";
import { numberToLocaleString } from "@/lib/utils";
import { PlayerDropsMessage } from "./PlayerDropsGenericSubcards";
import { playerDropCategories } from "@/lib/playerDropCategories";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/translator";

type DisplayCategoryDatum = {
    label: string;
    tooltip: string;
    color: string;
    count: number;
}

type DrilldownOverviewSubcardProps = {
    dropTypes: [string, number][];
};

export default function DrilldownOverviewSubcard({ dropTypes }: DrilldownOverviewSubcardProps) {
    const { t } = useTranslation();
    let { totalDrops, categories } = useMemo(() => {
        let totalDrops = 0;
        const categories: Record<string, DisplayCategoryDatum> = {};
        for (const [cat, cnt] of dropTypes) {
            totalDrops += cnt;
            if (!(cat in playerDropCategories)) continue;
            categories[cat] = {
                label: t(`web.player_drops.category.${cat}.label`),
                tooltip: t(`web.player_drops.category.${cat}.desc`),
                color: playerDropCategories[cat].color,
                count: cnt,
            };
        }
        return {
            totalDrops,
            categories: Object.entries(categories),
        };
    }, [dropTypes, t]);

    if (!categories.length) {
        return <PlayerDropsMessage message={t('web.player_drops.no_drops_window')} />;
    }

    return (
        <div className="px-4 py-4 flex flex-wrap justify-evenly gap-4 text-muted-foreground">
            {categories.map(([reasonId, reasonData]) => (
                <Tooltip key={reasonId}>
                    <TooltipTrigger asChild>
                        <div
                            className="px-4 flex flex-col gap-1 items-center justify-center"
                        >
                            <span
                                className="text-xl tracking-wider border-b-2 font-semibold"
                                style={{ borderColor: reasonData.color }}
                            >{reasonData.label}</span>
                            <span>
                                {numberToLocaleString(reasonData.count)} <small className="opacity-75">({numberToLocaleString((reasonData.count / totalDrops) * 100, 1)}%)</small>
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-96 text-center">
                        <p>{reasonData.tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}
