import Stripe from "stripe";
import { stripeSecretKey } from "./secrets";

export function getStripeClient(): Stripe {
  return new Stripe(stripeSecretKey.value());
}
