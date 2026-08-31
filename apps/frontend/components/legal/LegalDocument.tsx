import { useFormatter, useTranslations } from "next-intl";

import { CookieTable } from "@/components/legal/CookieTable";
import { ConsentReset } from "@/components/legal/ConsentReset";
import { Container } from "@/components/layout/Container";
import { Link } from "@/i18n/navigation";
import {
  isLegalEntityConfigured,
  LEGAL_ENTITY,
  SUPERVISORY_AUTHORITY,
} from "@/lib/legal/entity";
import type { LegalDocument as LegalDocumentModel } from "@/lib/legal/documents";

/**
 * Renders one legal document from its section list.
 *
 * The three documents share a renderer because they share a shape: a title, a
 * date, and numbered sections of prose. Keeping the prose in the catalogues and
 * the order in `lib/legal/documents.ts` means a section can be added, reworded
 * or retired in one place, and the message gate proves all three languages
 * still describe the same document.
 *
 * The placeholders every document interpolates — the operator's identity, the
 * supervisory authority — are facts about a company, not translatable text, so
 * they are supplied here rather than duplicated into each catalogue.
 */
export interface LegalDocumentProps {
  document: LegalDocumentModel;
}

export function LegalDocument({ document }: LegalDocumentProps) {
  const t = useTranslations("Legal");
  const format = useFormatter();
  const configured = isLegalEntityConfigured();

  const values = {
    name: LEGAL_ENTITY.name,
    companyId: LEGAL_ENTITY.companyId,
    address: LEGAL_ENTITY.address,
    email: LEGAL_ENTITY.email,
    authority: SUPERVISORY_AUTHORITY.name,
    authorityUrl: SUPERVISORY_AUTHORITY.url,
  };

  return (
    <main className="py-16 lg:py-24">
      <Container size="sm">
        <p className="mb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground rounded-sm text-sm underline-offset-4 hover:underline"
          >
            ← {t("backHome")}
          </Link>
        </p>

        <h1 className="font-display text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
          {t(`${document.id}.title`)}
        </h1>

        <p className="text-muted-foreground mt-3 text-sm">
          {t("updated", {
            date: format.dateTime(new Date(document.updated), {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          })}
        </p>

        {/*
          An unconfigured deployment says so, loudly and at the top. A legal
          page that names no operator is not binding on anyone, and pretending
          otherwise is the failure mode worth designing against.
        */}
        {configured ? null : (
          <div
            role="note"
            className="border-warning bg-warning/10 mt-8 rounded-lg border-l-4 p-4"
          >
            <p className="font-medium">{t("draftNotice.title")}</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {t("draftNotice.body")}
            </p>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-10">
          {document.sections.map((section, index) => (
            <section key={section} aria-labelledby={`${section}-heading`}>
              <h2
                id={`${section}-heading`}
                className="font-display text-2xl leading-snug"
              >
                <span className="text-muted-foreground mr-2 tabular-nums">
                  {index + 1}.
                </span>
                {t(`${section}.title`)}
              </h2>

              <div className="mt-3 flex flex-col gap-3">
                {(t.raw(`${section}.body`) as string[]).map((paragraph, i) => (
                  <p key={i} className="leading-relaxed text-pretty">
                    {/*
                      `t.raw` returns the string untouched, so the placeholders
                      are substituted here rather than by the ICU formatter.
                    */}
                    {interpolate(paragraph, values)}
                  </p>
                ))}
              </div>

              {document.tableAfter === section ? (
                <div className="mt-6">
                  <CookieTable />
                </div>
              ) : null}
            </section>
          ))}
        </div>

        {document.id === "cookies" ? (
          <div className="mt-12">
            <ConsentReset />
          </div>
        ) : null}
      </Container>
    </main>
  );
}

/** Replaces `{name}`-style placeholders. Unknown ones are left visible. */
function interpolate(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}
