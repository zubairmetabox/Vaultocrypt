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

type ClientSeed = {
  name: string;
  contact: string;
  vertical: string;
  status: ClientStatus;
  notes: string;
  records: Array<{
    title: string;
    type: "credential" | "secure_note";
    service: string;
    username: string;
    lastUpdated: string;
    sensitivity: "Standard" | "Sensitive";
  }>;
};

const clientSeeds: ClientSeed[] = [
  {
    name: "Asterlane Hotels",
    contact: "ops@asterlane.example",
    vertical: "Hospitality",
    status: "Active",
    notes: "Shared internally across delivery and operations.",
    records: [
      {
        title: "Cloudflare Production",
        type: "credential",
        service: "Cloudflare",
        username: "ops@asterlane.example",
        lastUpdated: "2 days ago",
        sensitivity: "Sensitive",
      },
      {
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
    name: "Aurora Dental",
    contact: "admin@auroradental.example",
    vertical: "Healthcare",
    status: "Active",
    notes: "Regular account updates handled by support.",
    records: [
      {
        title: "Google Workspace Super Admin",
        type: "credential",
        service: "Google Workspace",
        username: "admin@auroradental.example",
        lastUpdated: "4 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Bluefin Logistics",
    contact: "it@bluefin.example",
    vertical: "Logistics",
    status: "Needs Review",
    notes: "Pending cleanup of legacy credentials.",
    records: [
      {
        title: "AWS Console",
        type: "credential",
        service: "AWS",
        username: "ops-admin",
        lastUpdated: "8 days ago",
        sensitivity: "Sensitive",
      },
      {
        title: "Routing API Notes",
        type: "secure_note",
        service: "Internal API",
        username: "Service account",
        lastUpdated: "12 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Brightpath Schools",
    contact: "hello@brightpath.example",
    vertical: "Education",
    status: "Active",
    notes: "Mostly shared across content and ads teams.",
    records: [
      {
        title: "Meta Ads Manager",
        type: "credential",
        service: "Meta",
        username: "media@brightpath.example",
        lastUpdated: "Today",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Cinder & Co",
    contact: "digital@cinderco.example",
    vertical: "Fashion",
    status: "Active",
    notes: "Creative team references this client often.",
    records: [
      {
        title: "Shopify Storefront",
        type: "credential",
        service: "Shopify",
        username: "owner@cinderco.example",
        lastUpdated: "Yesterday",
        sensitivity: "Sensitive",
      },
      {
        title: "Influencer Outreach Notes",
        type: "secure_note",
        service: "Notion",
        username: "Campaign workspace",
        lastUpdated: "3 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Clearline Solar",
    contact: "ops@clearline.example",
    vertical: "Energy",
    status: "Needs Review",
    notes: "Needs credential verification before the next campaign cycle.",
    records: [
      {
        title: "LinkedIn Campaign Access",
        type: "credential",
        service: "LinkedIn",
        username: "ops@clearline.example",
        lastUpdated: "7 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Driftstone Properties",
    contact: "admin@driftstone.example",
    vertical: "Real Estate",
    status: "Active",
    notes: "Access is stable and reviewed monthly.",
    records: [
      {
        title: "WordPress Admin",
        type: "credential",
        service: "WordPress",
        username: "admin",
        lastUpdated: "9 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Dune Harbor Travel",
    contact: "media@duneharbor.example",
    vertical: "Travel",
    status: "Restricted",
    notes: "Travel client with elevated confidentiality requirements.",
    records: [
      {
        title: "TikTok Ads",
        type: "credential",
        service: "TikTok",
        username: "ads@duneharbor.example",
        lastUpdated: "6 days ago",
        sensitivity: "Sensitive",
      },
      {
        title: "Booking Portal Notes",
        type: "secure_note",
        service: "Operations",
        username: "Team shared",
        lastUpdated: "2 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Evergreen Clinics",
    contact: "support@evergreen.example",
    vertical: "Healthcare",
    status: "Active",
    notes: "Frequently accessed by support and performance teams.",
    records: [
      {
        title: "GA4 Property",
        type: "credential",
        service: "Google Analytics",
        username: "support@evergreen.example",
        lastUpdated: "Today",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Elmstone Finance",
    contact: "security@elmstone.example",
    vertical: "Finance",
    status: "Restricted",
    notes: "Sensitive client. Reveal and copy events should be closely watched.",
    records: [
      {
        title: "Banking Portal Root",
        type: "credential",
        service: "Banking Portal",
        username: "root-admin",
        lastUpdated: "Today",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Foxtrail Outdoors",
    contact: "hello@foxtrail.example",
    vertical: "Retail",
    status: "Active",
    notes: "Ecommerce and social channels are managed together.",
    records: [
      {
        title: "Instagram Access",
        type: "credential",
        service: "Instagram",
        username: "hello@foxtrail.example",
        lastUpdated: "1 day ago",
        sensitivity: "Sensitive",
      },
      {
        title: "Brand Kit Notes",
        type: "secure_note",
        service: "Drive",
        username: "Shared folder",
        lastUpdated: "10 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Granite Peak Law",
    contact: "ops@granitepeak.example",
    vertical: "Legal",
    status: "Needs Review",
    notes: "Awaiting handoff cleanup from previous vendor.",
    records: [
      {
        title: "Hosting Panel",
        type: "credential",
        service: "cPanel",
        username: "ops@granitepeak.example",
        lastUpdated: "14 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Harborview Estates",
    contact: "admin@harborview.example",
    vertical: "Real Estate",
    status: "Active",
    notes: "Stable stack with occasional ad account work.",
    records: [
      {
        title: "Google Ads MCC Link",
        type: "credential",
        service: "Google Ads",
        username: "admin@harborview.example",
        lastUpdated: "5 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Highland Roasters",
    contact: "marketing@highland.example",
    vertical: "Food & Beverage",
    status: "Active",
    notes: "Campaign-heavy client with frequent creative updates.",
    records: [
      {
        title: "Klaviyo Admin",
        type: "credential",
        service: "Klaviyo",
        username: "marketing@highland.example",
        lastUpdated: "3 days ago",
        sensitivity: "Sensitive",
      },
      {
        title: "Launch Checklist",
        type: "secure_note",
        service: "Operations",
        username: "Team note",
        lastUpdated: "Yesterday",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Ivory Wellness",
    contact: "help@ivorywellness.example",
    vertical: "Wellness",
    status: "Active",
    notes: "Mostly handled by content and design support.",
    records: [
      {
        title: "YouTube Brand Account",
        type: "credential",
        service: "YouTube",
        username: "help@ivorywellness.example",
        lastUpdated: "13 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Juniper Learning",
    contact: "ops@juniperlearning.example",
    vertical: "Education",
    status: "Needs Review",
    notes: "Access list needs consolidation after internal staffing change.",
    records: [
      {
        title: "Webflow Workspace",
        type: "credential",
        service: "Webflow",
        username: "ops@juniperlearning.example",
        lastUpdated: "9 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Kingfisher Auto",
    contact: "digital@kingfisherauto.example",
    vertical: "Automotive",
    status: "Active",
    notes: "Paid media channels are accessed several times a week.",
    records: [
      {
        title: "Dealer Site CMS",
        type: "credential",
        service: "CMS",
        username: "digital@kingfisherauto.example",
        lastUpdated: "6 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Lumen Studios",
    contact: "team@lumenstudios.example",
    vertical: "Creative",
    status: "Active",
    notes: "Internal collaboration client with design-heavy workflows.",
    records: [
      {
        title: "Figma Team Access",
        type: "credential",
        service: "Figma",
        username: "team@lumenstudios.example",
        lastUpdated: "Today",
        sensitivity: "Sensitive",
      },
      {
        title: "Asset Library Notes",
        type: "secure_note",
        service: "Drive",
        username: "Shared",
        lastUpdated: "4 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Mapleridge Care",
    contact: "admin@mapleridge.example",
    vertical: "Healthcare",
    status: "Restricted",
    notes: "Sensitive healthcare client with stricter access expectations.",
    records: [
      {
        title: "Patient Portal Admin",
        type: "credential",
        service: "Portal",
        username: "admin@mapleridge.example",
        lastUpdated: "2 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Nexa Commerce",
    contact: "hello@nexa.example",
    vertical: "Retail",
    status: "Needs Review",
    notes: "Credentials need a freshness sweep before campaign handoff.",
    records: [
      {
        title: "Shopify Admin",
        type: "credential",
        service: "Shopify",
        username: "admin@nexa.example",
        lastUpdated: "11 days ago",
        sensitivity: "Sensitive",
      },
      {
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
    name: "Northstar Legal",
    contact: "security@northstar.example",
    vertical: "Legal",
    status: "Restricted",
    notes: "Restricted client. Reveal and copy events should be closely watched.",
    records: [
      {
        title: "WordPress Hosting Root",
        type: "credential",
        service: "DigitalOcean",
        username: "root",
        lastUpdated: "Today",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Oakline Furnishings",
    contact: "growth@oakline.example",
    vertical: "Retail",
    status: "Active",
    notes: "Often used for ecommerce merchandising updates.",
    records: [
      {
        title: "Pinterest Ads",
        type: "credential",
        service: "Pinterest",
        username: "growth@oakline.example",
        lastUpdated: "5 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Pinecrest Therapy",
    contact: "ops@pinecrest.example",
    vertical: "Healthcare",
    status: "Active",
    notes: "Mostly stable access set with occasional reveal activity.",
    records: [
      {
        title: "Local SEO Notes",
        type: "secure_note",
        service: "Operations",
        username: "Internal",
        lastUpdated: "7 days ago",
        sensitivity: "Standard",
      },
      {
        title: "GBP Ownership Access",
        type: "credential",
        service: "Google Business Profile",
        username: "ops@pinecrest.example",
        lastUpdated: "2 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Quartz Insurance",
    contact: "it@quartz.example",
    vertical: "Insurance",
    status: "Needs Review",
    notes: "Pending migration from older documentation system.",
    records: [
      {
        title: "HubSpot Admin",
        type: "credential",
        service: "HubSpot",
        username: "it@quartz.example",
        lastUpdated: "8 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Riverbank Events",
    contact: "events@riverbank.example",
    vertical: "Events",
    status: "Active",
    notes: "Event season brings heavier short-term usage.",
    records: [
      {
        title: "Eventbrite Organizer",
        type: "credential",
        service: "Eventbrite",
        username: "events@riverbank.example",
        lastUpdated: "Yesterday",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "SummitWorks HR",
    contact: "ops@summitworks.example",
    vertical: "HR",
    status: "Active",
    notes: "Smooth handoff client with low friction.",
    records: [
      {
        title: "LinkedIn Page Access",
        type: "credential",
        service: "LinkedIn",
        username: "ops@summitworks.example",
        lastUpdated: "10 days ago",
        sensitivity: "Sensitive",
      },
      {
        title: "Hiring Campaign Notes",
        type: "secure_note",
        service: "Internal notes",
        username: "Team shared",
        lastUpdated: "6 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Tidal Health Group",
    contact: "admin@tidalhealth.example",
    vertical: "Healthcare",
    status: "Restricted",
    notes: "Restricted marketing client with approval-heavy workflow.",
    records: [
      {
        title: "CRM Super Admin",
        type: "credential",
        service: "CRM",
        username: "admin@tidalhealth.example",
        lastUpdated: "1 day ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Umber Capital",
    contact: "security@umbercapital.example",
    vertical: "Finance",
    status: "Active",
    notes: "Used by leadership and operations with strong audit visibility.",
    records: [
      {
        title: "Investor Portal",
        type: "credential",
        service: "Portal",
        username: "security@umbercapital.example",
        lastUpdated: "Today",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Velora Beauty",
    contact: "hello@velora.example",
    vertical: "Beauty",
    status: "Active",
    notes: "High frequency social and ecommerce access.",
    records: [
      {
        title: "TikTok Shop Admin",
        type: "credential",
        service: "TikTok Shop",
        username: "hello@velora.example",
        lastUpdated: "4 days ago",
        sensitivity: "Sensitive",
      },
      {
        title: "UGC Workflow Notes",
        type: "secure_note",
        service: "Notion",
        username: "Shared board",
        lastUpdated: "3 days ago",
        sensitivity: "Standard",
      },
    ],
  },
  {
    name: "Westbridge Finance",
    contact: "ops@westbridge.example",
    vertical: "Finance",
    status: "Needs Review",
    notes: "Legacy finance client with a few access records to validate.",
    records: [
      {
        title: "GA4 Access",
        type: "credential",
        service: "Google Analytics",
        username: "ops@westbridge.example",
        lastUpdated: "12 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Xylo Fitness",
    contact: "media@xylofitness.example",
    vertical: "Fitness",
    status: "Active",
    notes: "Media team client with frequent login usage.",
    records: [
      {
        title: "YouTube Studio",
        type: "credential",
        service: "YouTube",
        username: "media@xylofitness.example",
        lastUpdated: "5 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Yellowbrick Foods",
    contact: "admin@yellowbrick.example",
    vertical: "Food & Beverage",
    status: "Active",
    notes: "Franchise support credentials are shared with care.",
    records: [
      {
        title: "Franchise Portal",
        type: "credential",
        service: "Portal",
        username: "admin@yellowbrick.example",
        lastUpdated: "9 days ago",
        sensitivity: "Sensitive",
      },
    ],
  },
  {
    name: "Zenith Advisory",
    contact: "support@zenith.example",
    vertical: "Consulting",
    status: "Active",
    notes: "Low-maintenance client with predictable access patterns.",
    records: [
      {
        title: "Newsletter Platform",
        type: "credential",
        service: "Mailchimp",
        username: "support@zenith.example",
        lastUpdated: "2 days ago",
        sensitivity: "Sensitive",
      },
      {
        title: "Quarterly Notes",
        type: "secure_note",
        service: "Internal notes",
        username: "Team shared",
        lastUpdated: "Today",
        sensitivity: "Standard",
      },
    ],
  },
];

export const clients: Client[] = clientSeeds.map((client, clientIndex) => ({
  id: `cst-${String(clientIndex + 1).padStart(3, "0")}`,
  ...client,
  records: client.records.map((record, recordIndex) => ({
    id: `rec-${String(clientIndex * 10 + recordIndex + 1).padStart(3, "0")}`,
    ...record,
  })),
}));

export function getClientById(clientId: string) {
  return clients.find((client) => client.id === clientId);
}
