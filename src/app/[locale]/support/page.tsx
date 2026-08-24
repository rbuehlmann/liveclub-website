import type { Metadata } from "next";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Card } from "@/components/ui/Card";
import { SupportForm } from "./SupportForm";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return { title: `${t("title")} – LiveClub` };
}

export default async function SupportPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });

  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
        <div className="text-center">
          <h1 className="font-teko text-4xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
        </div>

        <Card>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">{t("faqTitle")}</h2>
          <div className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t("faq1Question")}</p>
              <p>
                {t.rich("faq1Answer", {
                  link: (chunks) => (
                    <NextLink href="/login" className="text-brand-red hover:underline">
                      {chunks}
                    </NextLink>
                  ),
                })}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t("faq2Question")}</p>
              <p>{t("faq2Answer")}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t("faq3Question")}</p>
              <p>{t("faq3Answer")}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t("faq4Question")}</p>
              <p>{t("faq4Answer")}</p>
            </div>
          </div>
        </Card>

        <SupportForm />
      </main>
      <PublicFooter />
    </div>
  );
}
