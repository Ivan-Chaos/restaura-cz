import { useTranslations } from "next-intl";

import type { Establishment } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

/**
 * Closes out the menu page: how to reach the place, anything worth knowing
 * before ordering, and a way to the full allergen legend.
 *
 * The allergen link always renders, even with no contact and no notes — it is
 * the one piece of the footer that is never optional (EU 1169/2011 requires
 * the information to be reachable, not just present somewhere on the page).
 */
export interface MenuFooterProps {
  establishment: Establishment;
  className?: string;
}

export function MenuFooter({ establishment, className }: MenuFooterProps) {
  const t = useTranslations("Menu");
  const { contact, serviceNotes } = establishment;
  const hasContact = Boolean(
    contact && (contact.address || contact.phone || contact.website),
  );
  const hasNotes = Boolean(serviceNotes && serviceNotes.length > 0);

  return (
    <footer
      data-slot="menu-footer"
      className={cn(
        "flex flex-col gap-6 border-t border-border py-8 text-sm",
        className,
      )}
    >
      {hasContact ? (
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-base">{t("contact")}</h2>
          {contact?.address ? (
            <p className="text-muted-foreground">{contact.address}</p>
          ) : null}
          {contact?.phone ? (
            <a
              href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {contact.phone}
            </a>
          ) : null}
          {contact?.website ? (
            <a
              href={
                contact.website.startsWith("http")
                  ? contact.website
                  : `https://${contact.website}`
              }
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              {contact.website}
            </a>
          ) : null}
        </div>
      ) : null}

      {hasNotes ? (
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-base">{t("serviceNotes")}</h2>
          <ul className="list-inside list-disc text-muted-foreground">
            {serviceNotes?.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      ) : null}

      <a
        href="#allergens"
        className="text-foreground underline-offset-4 hover:underline"
      >
        {t("allergenLegend")}
      </a>
    </footer>
  );
}
