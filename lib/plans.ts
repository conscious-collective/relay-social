export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  credits: number;
  features: string[];
  limits: {
    accounts: number;
    postsPerWeek: number;
    webhooks: number;
  };
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    credits: 0,
    features: [
      "1 Instagram account",
      "10 posts per week",
      "Basic scheduling",
      "Community support",
    ],
    limits: {
      accounts: 1,
      postsPerWeek: 10,
      webhooks: 2,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    interval: "month",
    credits: 1000,
    features: [
      "Unlimited Instagram accounts",
      "1000 post credits",
      "Priority support",
      "Advanced analytics",
      "Webhooks",
      "API access",
    ],
    limits: {
      accounts: -1, // unlimited
      postsPerWeek: -1, // unlimited (uses credits)
      webhooks: -1, // unlimited
    },
  },
];
