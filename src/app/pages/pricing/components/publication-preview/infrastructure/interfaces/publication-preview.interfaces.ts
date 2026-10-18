export interface PricingPublicationRun {
  id: string;
  created_at: string;
  sends_enabled: boolean;
  sent: number;
  items: {
    offer_id: string;
    name: string;
    status: string;
    price: string | null;
    min_price: string | null;
    old_price: string | null;
    current_price: string | null;
    reason: string;
  }[];
}
