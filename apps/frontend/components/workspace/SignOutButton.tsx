import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export interface SignOutButtonProps {
  locale: string;
  action: (formData: FormData) => Promise<void>;
}

/**
 * A plain form post, so signing out does not depend on client JavaScript having
 * loaded — the one action a visitor must always be able to complete.
 */
export function SignOutButton({ locale, action }: SignOutButtonProps) {
  const t = useTranslations("Auth");

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="ghost" size="sm">
        {t("signOut")}
      </Button>
    </form>
  );
}
