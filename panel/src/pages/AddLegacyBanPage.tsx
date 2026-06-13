import InlineCode from "@/components/InlineCode";
import { useAdminPerms } from "@/hooks/auth";
import { useRef, useState } from "react";
import { ApiAddLegacyBanReqSchema, GetBanTemplatesSuccessResp } from "@shared/otherTypes";
import { useBackendApi } from "@/hooks/fetch";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BanForm, { BanFormType } from "@/components/BanForm";
import { txToast } from "@/components/TxToaster";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import useSWR from "swr";
import { useTranslation } from "@/hooks/translator";

export default function AddLegacyBanPage() {
    const { t } = useTranslation();
    const idsTextareaRef = useRef<HTMLTextAreaElement>(null);
    const banFormRef = useRef<BanFormType>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();

    const getBanTemplatesApi = useBackendApi<GetBanTemplatesSuccessResp>({
        method: 'GET',
        path: `/settings/banTemplates`,
        throwGenericErrors: true,
    });

    const legacyBanApi = useBackendApi<GenericApiOkResp, ApiAddLegacyBanReqSchema>({
        method: 'POST',
        path: `/history/addLegacyBan`,
        throwGenericErrors: true,
    });

    const handleSave = () => {
        if (!idsTextareaRef.current || !banFormRef.current) return;
        const { reason, duration } = banFormRef.current.getData();

        if (!reason || reason.length < 3) {
            txToast.warning(t('web.ban.err_reason_length'));
            banFormRef.current.focusReason();
            return;
        }
        const rawIds = idsTextareaRef.current.value;
        if (!rawIds) {
            txToast.warning(t('web.ban.err_no_identifiers'));
            idsTextareaRef.current.focus();
            return;
        }
        const identifiers = rawIds
            .toLowerCase()
            .split(/[,;\s\n]+/g)
            .map(id => id.trim())
            .filter(Boolean);
        if (!identifiers.length) {
            txToast.warning(t('web.ban.err_invalid_identifiers'));
            idsTextareaRef.current.focus();
            return;
        }

        setIsSaving(true);
        legacyBanApi({
            data: { identifiers, reason, duration },
            toastLoadingMessage: t('web.ban.banning_toast'),
            genericHandler: {
                successMsg: t('web.ban.banned_toast'),
            },
            success: () => {
                setIsSaving(false);
                idsTextareaRef.current!.value = '';
                idsTextareaRef.current!.focus();
            },
            error: () => {
                setIsSaving(false);
                idsTextareaRef.current!.focus();
            }
        });
    };

    const swrBanTemplates = useSWR('/settings/banTemplates', async () => {
        const data = await getBanTemplatesApi({});
        if (!data) throw new Error('No data returned');
        return data;
    });

    const canBan = hasPerm('players.ban');
    return (
        <div className="space-y-4 w-full max-w-screen-lg mx-auto px-2 md:px-0">
            <div className="px-2 md:px-0">
                <h1 className="text-3xl mb-2">{t('web.ban.title')}</h1>
                <p className="text-foreground/90">
                    {t('web.ban.desc_main_1')}
                    <InlineCode>license</InlineCode>
                    {t('web.ban.desc_main_2')}
                    <InlineCode>discord</InlineCode>
                    {t('web.ban.desc_main_3')}
                    <br />
                    {t('web.ban.desc_legacy_1')}
                    <InlineCode>license</InlineCode>
                    {t('web.ban.desc_legacy_2')}
                    <em>Legacy Bans</em>
                    {t('web.ban.desc_legacy_3')}
                    <br />
                    {!canBan ? (
                        <span className="text-warning-inline">
                            {t('web.ban.err_permission_1')}
                            <InlineCode className="text-warning-inline">Player: Ban</InlineCode>
                            {t('web.ban.err_permission_2')}
                        </span>
                    ) : null}
                </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-4 border bg-card p-4 rounded-lg">
                <div className="flex flex-col gap-3">
                    <Label htmlFor="banIdentifiers">
                        {t('web.ban.identifiers_label')}
                    </Label>
                    <Textarea
                        id="banIdentifiers"
                        ref={idsTextareaRef}
                        className="h-full"
                        disabled={isSaving || !canBan}
                        placeholder={t('web.ban.identifiers_placeholder')}
                    />
                </div>
                <BanForm
                    ref={banFormRef}
                    banTemplates={swrBanTemplates.data}
                    disabled={isSaving || !canBan}
                />
            </div>
            <div className="flex place-content-center gap-4">
                <Button
                    size="sm"
                    variant='outline'
                    disabled={isSaving || !canBan}
                    onClick={() => {
                        banFormRef.current?.clearData()
                    }}
                >
                    {t('web.ban.clear_btn')}
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving || !canBan}
                    onClick={handleSave}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> {t('web.ban.banning_btn')}
                        </span>
                    ) : t('web.ban.apply_btn')}
                </Button>
            </div>
        </div>
    );
}
