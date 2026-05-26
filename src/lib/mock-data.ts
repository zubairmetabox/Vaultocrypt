export type ClientStatus = "Active" | "Restricted" | "Needs Review";

export type VaultRecord = {
  id: string;
  title: string;
  type: "credential" | "secure_note";
  service: string;
  username: string;
  lastUpdated: string;
  sensitivity: "Standard" | "Sensitive";
};

export type Client = {
  id: string;
  name: string;
  contact: string;
  vertical: string;
  status: ClientStatus;
  notes: string;
  records: VaultRecord[];
};

export const clients: Client[] = [
  {
    id: "cst-001",
    name: "Asterlane Hotels",
    contact: "ops@asterlane.example",
    vertical: "Hospitality",
    status: "Active",
    notes: "Shared internally across delivery and operations.",
    records: [
      {
        id: "rec-001",
        title: "Cloudflare Production",
        type: "credential",
        service: "Cloudflare",
        username: "ops@asterlane.example",
        lastUpdated: "2 days ago",
        sensitivity: "Sensitive",
      },
      {
        id: "rec-002",
        title: "Meta Ads Access Notes",
        type: "secure_note",
        service: "Meta Business",
        username: "Assigned by SSO",
        lastUpdated: "5 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    id: "cst-002",
    name: "Nexa Commerce",
    contact: "hello@nexa.example",
    vertical: "Retail",
    status: "Needs Review",
    notes: "Credentials need a freshness sweep before campaign handoff.",
    records: [
      {
        id: "rec-003",
        title: "Shopify Admin",
        type: "credential",
        service: "Shopify",
        username: "admin@nexa.example",
        lastUpdated: "11 days ago",
        sensitivity: "Sensitive",
      },
      {
        id: "rec-004",
        title: "SendGrid Recovery Notes",
        type: "secure_note",
        service: "SendGrid",
        username: "Recovery contact only",
        lastUpdated: "Yesterday",
        sensitivity: "Standard",
      },
    ],
  },
  {
    id: "cst-003",
    name: "Northstar Legal",
    contact: "security@northstar.example",
    vertical: "Legal",
    status: "Restricted",
    notes: "Restricted client. Reveal and copy events should be closely watched.",
    records: [
      {
        id: "rec-005",
        title: "WordPress Hosting Root",
        type: "credential",
        service: "DigitalOcean",
        username: "root",
        lastUpdated: "Today",
        sensitivity: "Sensitive",
      },
    ],
  },
];
