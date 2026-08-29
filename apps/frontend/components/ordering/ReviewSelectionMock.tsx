"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/Container";
import { Stack } from "@/components/layout/Stack";
import type { LineItemModel, OrderSummaryModel } from "@/lib/design-system/ordering-types";
import type { Money } from "@/lib/design-system/types";

import { LineItem } from "./LineItem";
import { OrderSummary } from "./OrderSummary";
import { ProgressStepper } from "./ProgressStepper";
import { SpecialRequestField } from "./SpecialRequestField";
import { StickyActionBar } from "./StickyActionBar";

/**
 * "Review your selection" — the mock screen that proves the ordering vocabulary
 * composes (spec User Story 5).
 *
 * **Not shipped.** It exists only in Storybook. Nothing here talks to a server;
 * the state is local so the components can be exercised, and every value the
 * child components need is computed here — they stay presentational.
 *
 * The value of this screen is that it is the assembly test: if a full ordering
 * flow can be built from the existing tokens and primitives with no new ones,
 * then adding ordering later is a routing-and-state problem, not a design one.
 */
const czk = (amount: number): Money => ({ amount, currency: "CZK" });

const INITIAL_LINES: LineItemModel[] = [
  {
    id: "line-svickova",
    item: { id: "svickova", name: "Svíčková na smetaně" },
    quantity: 2,
    unitPrice: czk(285),
    linePrice: czk(570),
  },
  {
    id: "line-gulas",
    item: { id: "gulas", name: "Hovězí guláš", dietary: [] },
    selectedOptions: [{ groupName: "Porce", optionName: "Velká porce", priceDelta: czk(80) }],
    quantity: 1,
    unitPrice: czk(329),
    linePrice: czk(329),
    note: "Bez cibule, prosím.",
  },
  {
    id: "line-pivo",
    item: { id: "pivo", name: "Tankový ležák" },
    selectedOptions: [{ groupName: "Velikost", optionName: "0,5 l" }],
    quantity: 3,
    unitPrice: czk(59),
    linePrice: czk(177),
  },
];

export function ReviewSelectionMock({ className }: { className?: string }) {
  const t = useTranslations("Ordering");
  const [lines, setLines] = useState(INITIAL_LINES);
  const [note, setNote] = useState("");

  const changeQuantity = (id: string, next: number) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              quantity: next,
              linePrice: { ...line.unitPrice, amount: line.unitPrice.amount * next },
            }
          : line,
      ),
    );
  };

  const remove = (id: string) =>
    setLines((current) => current.filter((line) => line.id !== id));

  const subtotal = lines.reduce((sum, line) => sum + line.linePrice.amount, 0);
  // A service charge is the most common adjustment on a Czech bill; it is here
  // to prove the summary handles adjustments, not because it is a product rule.
  const service = Math.round(subtotal * 0.1);

  const summary: OrderSummaryModel = {
    lines,
    subtotal: czk(subtotal),
    adjustments: [{ label: "Servis 10 %", amount: czk(service) }],
    total: czk(subtotal + service),
  };

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div data-ordering="" className={className}>
      <Container size="sm" className="pb-32">
        <Stack gap={6} className="py-6">
          <ProgressStepper
            steps={[
              { id: "choose", label: "Výběr" },
              { id: "review", label: t("review") },
              { id: "confirm", label: "Potvrzení" },
            ]}
            currentId="review"
          />

          <h1 className="font-display text-2xl leading-tight">{t("review")}</h1>

          <div>
            {lines.map((line) => (
              <LineItem
                key={line.id}
                line={line}
                onQuantityChange={(next) => changeQuantity(line.id, next)}
                onRemove={() => remove(line.id)}
              />
            ))}
          </div>

          <SpecialRequestField value={note} onChange={setNote} />

          <OrderSummary summary={summary} />
        </Stack>
      </Container>

      <StickyActionBar
        label={t("review")}
        count={itemCount}
        total={summary.total}
        onAction={() => {
          // Deliberately inert: there is no ordering backend, and pretending
          // otherwise in a documentation mock would be misleading.
        }}
        disabled={lines.length === 0}
      />
    </div>
  );
}
