import type { MenuItem, Money } from "./types";

/**
 * Future-facing display models.
 *
 * The product today is menus only: a restaurant publishes a menu and a guest
 * opens it from a link. Nothing orders anything. These types — and the
 * components in `components/ordering/` that consume them — exist so that when
 * ordering does arrive it extends the menu's visual language instead of growing
 * a second one beside it (spec FR-014b, User Story 5).
 *
 * Nothing here is wired to state or a backend, and an ESLint rule forbids
 * `app/**` from importing the components that use these types, so the shipped
 * guest menu cannot accidentally expose an ordering affordance (spec SC-012).
 */

/** How a dish can be varied: size, sides, extras. */
export interface OptionGroupModel {
  id: string;
  name: string;
  /** `single` renders a radio group, `multiple` a checkbox list. */
  selection: "single" | "multiple";
  /** Minimum choices. 0 makes the group optional. */
  min: number;
  /** Maximum choices. Always 1 when `selection` is "single". */
  max: number;
  options: OptionModel[];
}

export interface OptionModel {
  id: string;
  name: string;
  /** Rendered as `+ 20 Kč`. Absent means no change to the price. */
  priceDelta?: Money;
  /** A sold-out extra is shown but not choosable, so the guest knows it exists. */
  available?: boolean;
}

export interface SelectedOption {
  groupName: string;
  optionName: string;
  priceDelta?: Money;
}

export interface LineItemModel {
  id: string;
  item: Pick<MenuItem, "id" | "name" | "image" | "dietary">;
  selectedOptions?: SelectedOption[];
  quantity: number;
  /** Unit price including option deltas. */
  unitPrice: Money;
  /** `unitPrice × quantity`, precomputed by the caller. */
  linePrice: Money;
  note?: string;
}

/** A named amount added to the subtotal — service, delivery, tip. */
export interface OrderAdjustment {
  label: string;
  amount: Money;
}

export interface OrderSummaryModel {
  lines: LineItemModel[];
  subtotal: Money;
  adjustments?: OrderAdjustment[];
  total: Money;
}

export const ORDER_STATUSES = [
  "received",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;

export type OrderStatusModel = (typeof ORDER_STATUSES)[number];
