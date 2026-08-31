"use client";

import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/Container";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

/**
 * What a guest sees when a link no longer resolves — most often because the
 * restaurant unpublished the menu, sometimes because the address was mistyped.
 * Either way it is not their fault, so it reads as an explanation rather than
 * an error.
 *
 * A Client Component so it can translate: this boundary renders without the
 * request locale having been set, but the locale layout's provider has already
 * supplied the messages.
 */
export default function PublicMenuNotFound() {
  const t = useTranslations("PublicMenu");

  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <Container size="sm">
        <Empty>
          <EmptyTitle>{t("notAvailableTitle")}</EmptyTitle>
          <EmptyDescription>{t("notAvailableBody")}</EmptyDescription>
        </Empty>
      </Container>
    </main>
  );
}
