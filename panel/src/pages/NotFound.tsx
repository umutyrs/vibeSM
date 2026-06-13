import InlineCode from "@/components/InlineCode";
import { useSetPageTitle } from "@/hooks/pages";
import { Link } from "wouter";
import { useTranslation } from "@/hooks/translator";

type Props = {
    params: {
        '*': string;
    };
};
export default function NotFound({ params }: Props) {
    const { t } = useTranslation();
    const setPageTitle = useSetPageTitle();
    setPageTitle(t('web.notfound.title'));
    return (
        <div className="w-full flex items-center justify-center">
            <div className="text-center">
                <h1 className="bg-fuchsia-600 text-4xl w-fit mx-auto">{t('web.notfound.header')}</h1>
                <p className="mt-2 text-foreground">
                    {t('web.notfound.desc', { path: `/${params['*']}` })}
                </p>
                <Link href="/" className="text-accent hover:underline">{t('web.notfound.return')}</Link>
            </div>
        </div>
    );
}
