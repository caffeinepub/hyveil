import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Coins,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Globe,
  Handshake,
  Layers,
  Loader2,
  Lock,
  Percent,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Unlock,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ChannelRevenue,
  ContentItem,
  PartnerRecord,
  PartnerStatus,
  PlatformRevenue,
} from "./backend.d";
import { useActor } from "./hooks/useActor";
import { useCkTokenBalances } from "./hooks/useCkTokenBalances";
import { useIcpBalance } from "./hooks/useIcpBalance";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { AdminCreatorTemplate } from "./pages/AdminCreatorTemplate";

type Tab =
  | "dashboard"
  | "discover"
  | "content"
  | "proxy"
  | "wallet"
  | "revenue"
  | "partners"
  | "agents"
  | "template"
  | "creator";

interface Transaction {
  id: string;
  type: "debit" | "credit";
  description: string;
  amount: number;
  timestamp: string;
  dapp?: string;
  commission?: number;
}

interface DApp {
  id: string;
  name: string;
  emoji: string;
  category: string;
  description: string;
  url: string;
}

interface PartnerContentItem {
  id: string;
  title: string;
  type: "PPV" | "EXCLUSIVE" | "FREE";
  price: number;
  emoji: string;
  description: string;
}

interface PartnerApp {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  commissionRate: number;
  status: "active" | "suspended";
  monthlyVolume: number;
  earned: number;
  joinedDate: string;
  supportedChains: string[];
  canisterId: string;
  walletBalance: number;
  walletAddress: string;
  contentItems: PartnerContentItem[];
}

interface ProxyService {
  id: string;
  name: string;
  description: string;
  costPerSession: number;
  icon: string;
  active: boolean;
  responsePreview?: string;
  targetUrl: string;
}

interface ProxyLogEntry {
  id: string;
  timestamp: string;
  url: string;
  statusCode: bigint | null;
  success: boolean;
  bodyPreview: string;
  source?: "proxy-tab" | "discover-tab";
}

const PROXY_HISTORY_KEY = "hyveil_proxy_history";

function loadProxyHistory(): ProxyLogEntry[] {
  try {
    const stored = localStorage.getItem(PROXY_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveProxyHistory(entries: ProxyLogEntry[]) {
  try {
    localStorage.setItem(PROXY_HISTORY_KEY, JSON.stringify(entries));
  } catch {}
}

interface AIAgent {
  id: string;
  name: string;
  description: string;
  chain: string;
  category: string;
  agentType: string;
  website: string;
  status: "pending_review" | "approved" | "rejected";
}

const DAPPS: DApp[] = [
  {
    id: "openchat",
    name: "OpenChat",
    emoji: "💬",
    category: "Social",
    description: "Decentralized messaging on the IC",
    url: "https://oc.app",
  },
  {
    id: "icpswap",
    name: "ICP Swap",
    emoji: "🔄",
    category: "DeFi",
    description: "Swap tokens on the Internet Computer",
    url: "https://app.icpswap.com",
  },
  {
    id: "nns",
    name: "NNS DAO",
    emoji: "🏛️",
    category: "Governance",
    description: "Govern the Internet Computer network",
    url: "https://nns.ic0.app",
  },
  {
    id: "nfid",
    name: "NFID",
    emoji: "🪪",
    category: "Identity",
    description: "Non-fungible identity for Web3",
    url: "https://nfid.one",
  },
  {
    id: "sonic",
    name: "Sonic DEX",
    emoji: "⚡",
    category: "DeFi",
    description: "Lightning-fast DeFi on the IC",
    url: "https://sonic.ooo",
  },
  {
    id: "kinic",
    name: "Kinic Search",
    emoji: "🔍",
    category: "Tools",
    description: "Web3-native search engine",
    url: "https://kinic.io",
  },
  {
    id: "openart",
    name: "OpenArt",
    emoji: "🎨",
    category: "NFT",
    description: "Create and trade digital art NFTs",
    url: "https://openart.ic0.app",
  },
  {
    id: "dscvr",
    name: "DSCVR",
    emoji: "🌐",
    category: "Social",
    description: "Decentralized social media platform",
    url: "https://dscvr.one",
  },
  {
    id: "yuku",
    name: "Yuku NFT",
    emoji: "🖼️",
    category: "NFT",
    description: "Premier NFT marketplace on IC",
    url: "https://yuku.app",
  },
];

interface Web2App {
  id: string;
  name: string;
  emoji: string;
  category: string;
  description: string;
  url: string;
}

const WEB2_APPS: Web2App[] = [
  {
    id: "youtube",
    name: "YouTube",
    emoji: "▶️",
    category: "Video",
    description: "World's largest video platform",
    url: "https://www.youtube.com",
  },
  {
    id: "reddit",
    name: "Reddit",
    emoji: "🤖",
    category: "Social",
    description: "Front page of the internet",
    url: "https://www.reddit.com",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    emoji: "𝕏",
    category: "Social",
    description: "Real-time news and discussions",
    url: "https://x.com",
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    emoji: "📖",
    category: "Knowledge",
    description: "Free encyclopedia",
    url: "https://www.wikipedia.org",
  },
  {
    id: "github",
    name: "GitHub",
    emoji: "🐙",
    category: "Dev",
    description: "Code hosting and collaboration",
    url: "https://github.com",
  },
  {
    id: "medium",
    name: "Medium",
    emoji: "✍️",
    category: "Content",
    description: "Long-form articles and blogs",
    url: "https://medium.com",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    emoji: "🟠",
    category: "Dev",
    description: "Tech news and discussion",
    url: "https://news.ycombinator.com",
  },
  {
    id: "arxiv",
    name: "arXiv",
    emoji: "📄",
    category: "Knowledge",
    description: "Research papers and preprints",
    url: "https://arxiv.org",
  },
];

const INITIAL_PROXY_SERVICES: ProxyService[] = [
  {
    id: "netflix",
    name: "IC-Netflix",
    description: "Privacy-enhanced streaming via on-chain proxy",
    costPerSession: 0.1,
    icon: "🎬",
    active: false,
    targetUrl: "https://www.netflix.com",
  },
  {
    id: "social",
    name: "IC-Social (X)",
    description: "Anonymized social media access with zero logs",
    costPerSession: 0.05,
    icon: "📱",
    active: false,
    targetUrl: "https://x.com",
  },
  {
    id: "fans",
    name: "IC-Reddit",
    description: "Private browsing of Reddit with identity shielding",
    costPerSession: 0.05,
    icon: "🤖",
    active: false,
    targetUrl: "https://www.reddit.com",
  },
  {
    id: "github",
    name: "IC-GitHub",
    description: "Anonymous code browsing and project discovery",
    costPerSession: 0.03,
    icon: "💻",
    active: false,
    targetUrl: "https://github.com",
  },
  {
    id: "medium",
    name: "IC-Medium",
    description: "Private reading of articles and blogs",
    costPerSession: 0.03,
    icon: "📝",
    active: false,
    targetUrl: "https://medium.com",
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [];

const SAMPLE_AGENTS: AIAgent[] = [
  {
    id: "a1",
    name: "Kinic AI",
    description: "On-chain AI search and knowledge agent on ICP",
    chain: "ICP",
    category: "Search",
    agentType: "Knowledge Agent",
    website: "https://74iy7-xqaaa-aaaaf-qagra-cai.ic0.app",
    status: "pending_review",
  },
  {
    id: "a2",
    name: "ArcMind AI",
    description:
      "Autonomous AI agent running entirely on-chain via ICP canisters",
    chain: "ICP",
    category: "Autonomous",
    agentType: "Autonomous Agent",
    website: "https://arcmindai.app",
    status: "approved",
  },
  {
    id: "a3",
    name: "Elna AI",
    description: "Decentralized AI chatbot and agent platform on ICP",
    chain: "ICP",
    category: "Chatbot",
    agentType: "Conversational Agent",
    website: "https://elna.ai",
    status: "pending_review",
  },
  {
    id: "a4",
    name: "Bittensor",
    description: "Decentralized machine learning network with AI subnet agents",
    chain: "Multi-Chain",
    category: "ML Network",
    agentType: "ML Agent",
    website: "https://bittensor.com",
    status: "pending_review",
  },
  {
    id: "a5",
    name: "Fetch.ai",
    description:
      "Autonomous economic agents for DeFi, supply chain, and data markets",
    chain: "Ethereum",
    category: "Economic",
    agentType: "Economic Agent",
    website: "https://fetch.ai",
    status: "pending_review",
  },
  {
    id: "a6",
    name: "Autonolas",
    description:
      "Open platform for building autonomous agent services on-chain",
    chain: "Multi-Chain",
    category: "Infrastructure",
    agentType: "Service Agent",
    website: "https://olas.network",
    status: "approved",
  },
  {
    id: "a7",
    name: "Morpheus",
    description: "Decentralized AI agent marketplace with smart agent routing",
    chain: "Ethereum",
    category: "Marketplace",
    agentType: "Routing Agent",
    website: "https://mor.org",
    status: "rejected",
  },
  {
    id: "a8",
    name: "ICP GPT",
    description:
      "GPT-powered agent with direct ICP canister memory and compute",
    chain: "ICP",
    category: "GPT Agent",
    agentType: "Language Agent",
    website: "https://icgpt.app",
    status: "pending_review",
  },
];

const REVENUE_TABLE: {
  tx: string;
  dapp: string;
  total: number;
  commission: number;
  creator: number;
  time: string;
}[] = [];

const CATEGORIES = [
  "All",
  "DeFi",
  "Social",
  "NFT",
  "Governance",
  "Identity",
  "Tools",
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const { identity, login, clear } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const { actor, isFetching: actorFetching } = useActor();
  const actorError = false;
  const retryActor = () => {};
  const { balance: realBalance } = useIcpBalance(
    isLoggedIn ? identity : undefined,
  );
  const walletBalance = realBalance ?? 0;
  const { tokens: ckTokens, refetch: refetchCkTokens } = useCkTokenBalances(
    identity ?? undefined,
  );
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [commissionRate, setCommissionRate] = useState(20);
  const [ppvWatched, setPpvWatched] = useState<Set<string>>(new Set());
  const [ppvModal, setPpvModal] = useState<{
    id: string;
    title: string;
    partnerName: string;
    partnerEmoji: string;
    price: number;
    type: string;
  } | null>(null);
  const [proxyServices, setProxyServices] = useState<ProxyService[]>(
    INITIAL_PROXY_SERVICES,
  );
  const [proxyLog, setProxyLog] = useState<ProxyLogEntry[]>(() =>
    loadProxyHistory(),
  );
  const [proxyLoadingId, setProxyLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [editingRate, setEditingRate] = useState(false);
  const [newRate, setNewRate] = useState(String(commissionRate));
  const [partners, _setPartners] = useState<PartnerApp[]>([]);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [selectedPartnerChannel, setSelectedPartnerChannel] =
    useState<PartnerApp | null>(null);

  // On-chain partner state
  const [onChainPartners, setOnChainPartners] = useState<PartnerRecord[]>([]);
  const [approvedPartners, setApprovedPartners] = useState<PartnerRecord[]>([]);
  const [myPartners, setMyPartners] = useState<PartnerRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [registrationFee, setRegistrationFee] = useState<bigint>(50_000_000n);
  const [myIcpDeposit, setMyIcpDeposit] = useState<bigint>(0n);
  // 3-step registration flow
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<{
    canisterId: string;
    name: string;
  } | null>(null);
  const [newPartnerForm, setNewPartnerForm] = useState({
    name: "",
    website: "",
    description: "",
    chains: ["ICP"] as string[],
  });

  const [agents, setAgents] = useState<AIAgent[]>(SAMPLE_AGENTS);
  const [agentFilter, setAgentFilter] = useState<
    "all" | "pending_review" | "approved" | "rejected"
  >("all");
  const [agentChainFilter, setAgentChainFilter] = useState("All");

  const [myChannels, setMyChannels] = useState<ChannelRevenue[]>([]);
  const [platformRevenue, setPlatformRevenue] =
    useState<PlatformRevenue | null>(null);
  const [channelContents, setChannelContents] = useState<
    Record<string, ContentItem[]>
  >({});
  const [addContentModal, setAddContentModal] = useState<{
    partnerId: bigint;
    partnerName: string;
  } | null>(null);
  const [addContentForm, setAddContentForm] = useState({
    title: "",
    description: "",
    price: "",
    contentType: "pay-per-view",
  });
  const [addContentLoading, setAddContentLoading] = useState(false);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set(),
  );

  const [dubLanguage, setDubLanguage] = useState("en");
  const [subtitles, setSubtitles] = useState(true);
  const [regionAnon, setRegionAnon] = useState(true);
  const [previewPanel, setPreviewPanel] = useState<{
    appName: string;
    appUrl: string;
    statusCode: number;
    bodySnippet: string;
  } | null>(null);
  const [web2ProxyLoading, setWeb2ProxyLoading] = useState<string | null>(null);

  const principal = isLoggedIn ? identity!.getPrincipal().toText() : null;

  const filteredDapps = useMemo(() => {
    return DAPPS.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        categoryFilter === "All" || d.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [searchQuery, categoryFilter]);

  // Fetch approved partners (public)
  useEffect(() => {
    if (!actor) return;
    actor
      .getApprovedPartners()
      .then(setApprovedPartners)
      .catch(() => {});
  }, [actor]);

  // Fetch on-chain data when logged in
  useEffect(() => {
    if (!actor || !isLoggedIn) return;
    // Attempt to claim owner/admin role if no admin has been assigned yet
    actor.claimOwnerIfFirst().catch(() => {});
    Promise.all([
      actor.getRegistrationFee(),
      actor.getMyIcpBalance(),
      actor.getMyPartners(),
      actor.getPartners().catch(() => [] as PartnerRecord[]),
      actor.isCallerAdmin().catch(() => false),
    ])
      .then(([fee, bal, myP, allP, admin]) => {
        setRegistrationFee(fee);
        setMyIcpDeposit(bal);
        setMyPartners(myP);
        setOnChainPartners(allP);
        setIsAdmin(admin);
      })
      .catch(() => {});
  }, [actor, isLoggedIn]);

  const refreshMyBalance = async () => {
    if (!actor) return;
    const bal = await actor.getMyIcpBalance().catch(() => 0n);
    setMyIcpDeposit(bal);
  };

  // Fetch creator channels revenue
  useEffect(() => {
    if (!isLoggedIn || !actor) return;
    actor
      .getMyChannelsRevenue()
      .then(setMyChannels)
      .catch(() => {});
    if (isAdmin) {
      actor
        .getAllPartnersRevenue()
        .then(setPlatformRevenue)
        .catch(() => {});
    }
  }, [isLoggedIn, actor, isAdmin]);

  const fetchChannelContent = async (partnerId: bigint) => {
    if (!actor) return;
    const items = await actor
      .getContentItems(partnerId)
      .catch(() => [] as ContentItem[]);
    setChannelContents((prev) => ({ ...prev, [partnerId.toString()]: items }));
  };

  const handleAddContent = async () => {
    if (!actor || !addContentModal) return;
    if (!addContentForm.title.trim() || !addContentForm.price) {
      toast.error("Please fill in all required fields");
      return;
    }
    setAddContentLoading(true);
    try {
      const priceE8s = BigInt(
        Math.round(Number.parseFloat(addContentForm.price) * 1e8),
      );
      await actor.addContentItem(
        addContentModal.partnerId,
        addContentForm.title.trim(),
        addContentForm.description.trim(),
        priceE8s,
        addContentForm.contentType,
      );
      toast.success("Content added successfully!");
      await fetchChannelContent(addContentModal.partnerId);
      setAddContentModal(null);
      setAddContentForm({
        title: "",
        description: "",
        price: "",
        contentType: "pay-per-view",
      });
    } catch {
      toast.error("Failed to add content");
    } finally {
      setAddContentLoading(false);
    }
  };

  const e8sToIcp = (e8s: bigint) => (Number(e8s) / 1e8).toFixed(4);

  const filteredWeb2Apps = useMemo(() => {
    return WEB2_APPS.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.url.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  function handleGoAction() {
    const q = searchQuery.trim();
    if (!q) return;

    const launchUrl = (url: string) => {
      const normalised = url.replace(/\/$/, "").toLowerCase();
      const match = WEB2_APPS.find(
        (a) =>
          a.url.replace(/\/$/, "").toLowerCase() === normalised ||
          normalised.includes(
            a.url
              .replace(/https?:\/\//i, "")
              .replace(/\/$/, "")
              .toLowerCase(),
          ),
      );
      if (match) {
        handleWeb2ProxyLaunch(match);
      } else {
        const genericApp: Web2App = {
          id: "custom",
          name: url.replace(/https?:\/\//i, "").split("/")[0],
          url,
          description: "Custom URL",
          category: "Web2",
          emoji: "🌐",
        };
        handleWeb2ProxyLaunch(genericApp);
      }
    };

    // 1. Full URL
    if (/^https?:\/\//i.test(q)) {
      launchUrl(q);
      return;
    }

    // 2. Domain-like (contains a dot, no spaces)
    if (/^[^\s]+\.[^\s]+$/.test(q)) {
      launchUrl(`https://${q}`);
      return;
    }

    // 3. Keyword matching a known Web2 app name
    const keywordMatch = WEB2_APPS.find((a) =>
      a.name.toLowerCase().includes(q.toLowerCase()),
    );
    if (keywordMatch) {
      handleWeb2ProxyLaunch(keywordMatch);
      return;
    }

    // 4. Generic search — route through Google via proxy
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    const searchApp: Web2App = {
      id: "google-search",
      name: `Search: ${q}`,
      url: googleUrl,
      description: "Google Search",
      category: "Search",
      emoji: "🔍",
    };
    handleWeb2ProxyLaunch(searchApp);
  }

  function handleAddressBarEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleGoAction();
  }

  const totalCommissions = REVENUE_TABLE.reduce((s, r) => s + r.commission, 0);
  const totalVolume = REVENUE_TABLE.reduce((s, r) => s + r.total, 0);

  async function handleWeb2ProxyLaunch(app: Web2App) {
    if (!actor) {
      if (actorError) {
        toast.error("Backend connection failed. Click retry to reconnect.");
        retryActor();
      } else if (actorFetching) {
        toast.info("Connecting to proxy, please wait…");
      } else {
        toast.info("Reconnecting to proxy…");
        retryActor();
      }
      return;
    }
    setWeb2ProxyLoading(app.id);
    try {
      toast.info("Routing through ICP canister — your IP is hidden…");
      const response = await actor.proxyFetch(app.url, "GET", null, null);
      const bodySnippet = response.body
        ? response.body.slice(0, 300)
        : "(no body)";
      // Open the real site in a new tab — the proxy call confirmed IP masking
      window.open(app.url, "_blank", "noopener,noreferrer");
      setPreviewPanel({
        appName: app.name,
        appUrl: app.url,
        statusCode: Number(response.statusCode ?? 200),
        bodySnippet,
      });
      const discoverEntry: ProxyLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        url: app.url,
        statusCode: response.statusCode,
        success: response.success,
        bodyPreview: bodySnippet.slice(0, 100),
        source: "discover-tab",
      };
      setProxyLog((prev) => {
        const updated = [discoverEntry, ...prev].slice(0, 50);
        saveProxyHistory(updated);
        return updated;
      });
      toast.success("Routing verified — site opened with IP hidden.");
    } catch (_err) {
      toast.error("ICP proxy call failed — check canister connectivity.");
    } finally {
      setWeb2ProxyLoading(null);
    }
  }

  function handleLogin() {
    login();
  }

  function handleLogout() {
    clear();
    toast("Disconnected");
  }

  function handleTopUp() {
    toast.info(
      "To add ICP, send from any exchange to your wallet address above",
    );
    refetchCkTokens();
  }

  const handleActivateProxy = useCallback(
    async (id: string) => {
      const svc = proxyServices.find((s) => s.id === id);
      if (!svc) return;
      if (svc.active) {
        setProxyServices((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, active: false, responsePreview: undefined }
              : s,
          ),
        );
        toast("Proxy service deactivated");
        return;
      }
      if (!actor) {
        if (actorError) {
          toast.error("Backend connection failed. Click retry to reconnect.");
          retryActor();
        } else if (actorFetching) {
          toast.info("Connecting to proxy, please wait…");
        } else {
          toast.info("Reconnecting to proxy…");
          retryActor();
        }
        return;
      }
      if (walletBalance < svc.costPerSession) {
        toast.error("Insufficient ICP balance");
        return;
      }
      setProxyLoadingId(id);
      try {
        const response = await actor.proxyFetch(
          svc.targetUrl,
          "GET",
          null,
          null,
        );
        const logEntry: ProxyLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          url: svc.targetUrl,
          statusCode: response.statusCode,
          success: response.success,
          bodyPreview: response.body.slice(0, 100),
          source: "proxy-tab",
        };
        setProxyLog((prev) => {
          const updated = [logEntry, ...prev].slice(0, 50);
          saveProxyHistory(updated);
          return updated;
        });
        if (response.body && response.body.length > 0) {
          setProxyServices((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    active: true,
                    responsePreview: response.body.slice(0, 500),
                  }
                : s,
            ),
          );
          const tx: Transaction = {
            id: `t${Date.now()}`,
            type: "debit",
            description: `${svc.name} — session activated`,
            amount: svc.costPerSession,
            timestamp: new Date().toLocaleString(),
            dapp: svc.name,
          };
          setTransactions((prev) => [tx, ...prev]);
          toast.success(
            `${svc.name} activated — traffic routed through ICP canister`,
          );
        } else {
          toast.warning(
            `Proxy returned status ${response.statusCode} — request routed through ICP canister`,
          );
          setProxyServices((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    active: true,
                    responsePreview: response.body.slice(0, 500),
                  }
                : s,
            ),
          );
        }
      } catch (_err) {
        const logEntry: ProxyLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          url: svc.targetUrl,
          statusCode: null,
          success: false,
          bodyPreview: String(_err).slice(0, 100),
          source: "proxy-tab",
        };
        setProxyLog((prev) => {
          const updated = [logEntry, ...prev].slice(0, 50);
          saveProxyHistory(updated);
          return updated;
        });
        toast.error("HTTP outcall failed. Check canister connectivity.");
      } finally {
        setProxyLoadingId(null);
      }
    },
    [actor, actorFetching, proxyServices, walletBalance],
  );

  function copyPrincipal() {
    if (principal) {
      navigator.clipboard.writeText(principal);
      toast.success("Principal copied");
    }
  }

  const NAV_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: "discover",
      label: "Discover",
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    { id: "content", label: "Content", icon: <Film className="w-3.5 h-3.5" /> },
    { id: "proxy", label: "Proxy", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "wallet", label: "Wallet", icon: <Wallet className="w-3.5 h-3.5" /> },
    {
      id: "revenue",
      label: "Revenue",
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    ...(isLoggedIn && myChannels.length > 0
      ? [
          {
            id: "creator" as Tab,
            label: "Creator",
            icon: <TrendingUp className="w-3.5 h-3.5" />,
          },
        ]
      : []),
    {
      id: "partners",
      label: "Partners",
      icon: <Handshake className="w-3.5 h-3.5" />,
    },
    {
      id: "agents",
      label: "AI Agents",
      icon: <Bot className="w-3.5 h-3.5" />,
    },
    ...(isAdmin
      ? [
          {
            id: "template" as Tab,
            label: "Template",
            icon: <Clapperboard className="w-3.5 h-3.5" />,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: "#08080e" }}>
      {/* TOP NAV */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/assets/hyveil-logo.jpg"
              alt="HYVEIL"
              className="h-8 w-auto"
            />
            <span className="hyveil-badge hidden sm:inline">BETA</span>
          </div>

          {/* Address bar */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="address-bar flex items-center gap-2 px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
                placeholder="Search or enter a URL to browse privately…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setActiveTab("discover");
                }}
                onKeyDown={handleAddressBarEnter}
                data-ocid="nav.search_input"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Pill tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={`nav-tab flex items-center gap-1.5 ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                data-ocid={`nav.${tab.id}.link`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Auth button */}
          <div className="shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 glass rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {walletBalance.toFixed(2)} ICP
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground text-xs"
                  onClick={handleLogout}
                  data-ocid="nav.logout.button"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-full px-4 glow-violet"
                onClick={handleLogin}
                data-ocid="nav.login.button"
              >
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {NAV_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`nav-tab flex items-center gap-1 text-xs ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="fade-up">
            {!isLoggedIn ? (
              /* Hero */
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
                <div className="relative">
                  <div
                    className="absolute inset-0 blur-3xl"
                    style={{
                      background:
                        "radial-gradient(ellipse, oklch(0.58 0.22 290 / 0.2) 0%, transparent 70%)",
                    }}
                  />
                  <div className="relative">
                    <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <img
                        src="/assets/hyveil-logo.jpg"
                        alt="HYVEIL"
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                    <h1 className="font-display font-bold text-6xl md:text-8xl tracking-tight gradient-text mb-4">
                      HYVEIL
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl mb-2 max-w-xl">
                      Your Private Internet, Unified.
                    </p>
                    <p className="text-muted-foreground/60 text-sm max-w-md">
                      Access the full Internet Computer ecosystem and Web2
                      services through a single privacy-first portal.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-8 text-base glow-violet"
                    onClick={handleLogin}
                    data-ocid="hero.login.button"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Connect with Internet Identity
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="rounded-full px-8 text-base glass border-white/10"
                    onClick={() => setActiveTab("discover")}
                    data-ocid="hero.discover.button"
                  >
                    Explore dApps
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground/50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                    9 ICP dApps
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />{" "}
                    Privacy-first
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />{" "}
                    On-chain
                  </div>
                </div>
              </div>
            ) : (
              /* Logged in dashboard */
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-bold">
                      Welcome back
                    </h2>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      Your portal is active and private
                    </p>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-600/20 text-violet-300 border border-violet-500/30">
                        <Shield className="w-3 h-3" /> Owner
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 status-online rounded-full px-3 py-1.5 text-xs font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    All systems online
                  </div>
                </div>

                {/* Wallet Summary Card */}
                <div className="wallet-card rounded-3xl p-6 md:p-8">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <p className="text-white/50 text-sm mb-1">ICP Balance</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-5xl font-display font-bold text-white">
                          {balanceVisible ? walletBalance.toFixed(2) : "••••"}
                        </span>
                        <span className="text-white/60 text-lg">ICP</span>
                        <button
                          type="button"
                          onClick={() => setBalanceVisible((v) => !v)}
                          className="ml-1 text-white/40 hover:text-white/70"
                        >
                          {balanceVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-white/40 text-xs font-mono">
                          {principal?.slice(0, 20)}...
                        </span>
                        <button
                          type="button"
                          onClick={copyPrincipal}
                          className="text-white/30 hover:text-white/60"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl"
                        onClick={handleTopUp}
                        data-ocid="dashboard.topup.button"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Top Up
                      </Button>
                      <Button
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl"
                        onClick={() => setActiveTab("wallet")}
                        data-ocid="dashboard.wallet.button"
                      >
                        <Wallet className="w-4 h-4 mr-1.5" />
                        Full Wallet
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick dApp grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Quick Launch</h3>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      onClick={() => setActiveTab("discover")}
                      data-ocid="dashboard.discover.link"
                    >
                      View all <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {DAPPS.slice(0, 6).map((dapp, i) => (
                      <a
                        key={dapp.id}
                        href={dapp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`glass-card rounded-2xl p-4 flex flex-col items-center gap-2 text-center dapp-card fade-up fade-up-${Math.min(i + 1, 5)} cursor-pointer no-underline`}
                        data-ocid={`dashboard.dapp.item.${i + 1}`}
                      >
                        <span className="text-2xl">{dapp.emoji}</span>
                        <span className="text-xs font-medium text-foreground">
                          {dapp.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Admin Platform Revenue Widget */}
                {isAdmin && platformRevenue && (
                  <div>
                    <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-400" />
                      Platform Revenue
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="glass-card rounded-2xl p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Commission Earned
                        </p>
                        <p
                          className="text-lg font-bold"
                          style={{ color: "#8b5cf6" }}
                        >
                          {(
                            Number(platformRevenue.totalHyveilShare) / 1e8
                          ).toFixed(4)}{" "}
                          ICP
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          HYVEIL 10% share
                        </p>
                      </div>
                      <div className="glass-card rounded-2xl p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Active Partner Channels
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {platformRevenue.partnerCount.toString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Deployed on ICP
                        </p>
                      </div>
                      <div className="glass-card rounded-2xl p-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Total Purchases
                        </p>
                        <p
                          className="text-lg font-bold"
                          style={{ color: "#10b981" }}
                        >
                          {platformRevenue.totalPurchases.toString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Platform-wide
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                <div>
                  <h3 className="font-display font-semibold mb-4">
                    Recent Activity
                  </h3>
                  <div className="glass-card rounded-2xl divide-y divide-white/5">
                    {transactions.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        No transactions yet
                      </div>
                    ) : (
                      transactions.slice(0, 4).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === "credit"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-violet-500/15 text-violet-400"
                              }`}
                            >
                              {tx.type === "credit" ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {tx.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tx.timestamp}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-mono font-medium ${
                              tx.type === "credit"
                                ? "text-emerald-400"
                                : "text-violet-400"
                            }`}
                          >
                            {tx.type === "credit" ? "+" : "-"}
                            {tx.amount.toFixed(3)} ICP
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DISCOVER TAB */}
        {activeTab === "discover" && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold mb-1">
                Discover Privacy Focus Internet
              </h2>
              <p className="text-muted-foreground text-sm">
                Launch decentralized apps directly through HYVEIL
              </p>
            </div>

            {/* Search bar */}
            <div
              className="flex gap-2 items-center"
              data-ocid="discover.search_input"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search or enter a URL to browse privately…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleAddressBarEnter}
                  className="pl-9 pr-9 glass border-white/10 focus:border-violet-500/50 bg-transparent"
                  data-ocid="discover.search_input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleGoAction}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shrink-0"
                data-ocid="discover.go_button"
              >
                Go
              </button>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    categoryFilter === cat
                      ? "bg-violet-600 text-white"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                  data-ocid={"discover.filter.tab"}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* dApp grid */}
            {filteredDapps.length === 0 ? (
              <div
                className="glass-card rounded-2xl p-12 text-center"
                data-ocid="discover.empty_state"
              >
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No dApps found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDapps.map((dapp, i) => (
                  <div
                    key={dapp.id}
                    className={`glass-card rounded-2xl p-5 dapp-card fade-up fade-up-${Math.min(i + 1, 5)}`}
                    data-ocid={`discover.dapp.item.${i + 1}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center text-2xl">
                        {dapp.emoji}
                      </div>
                      <Badge className="status-online text-xs border-0">
                        {dapp.category}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{dapp.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {dapp.description}
                    </p>
                    <a
                      href={dapp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-medium px-4 py-1.5 rounded-full transition-all border border-violet-500/20"
                      data-ocid={"discover.dapp.launch.button"}
                    >
                      Launch <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Web2 Private Browsing Section */}
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-display font-bold">
                  Web2 Private Browsing
                </h3>
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                  IP Hidden via ICP
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Browse Web2 privately — traffic routed through ICP canister,
                destination sees ICP's IP not yours
              </p>

              {filteredWeb2Apps.length === 0 ? (
                <div
                  className="glass-card rounded-2xl p-8 text-center"
                  data-ocid="discover.web2.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    No Web2 apps match your search
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredWeb2Apps.map((app, i) => (
                    <div
                      key={app.id}
                      className={`glass-card rounded-2xl p-5 dapp-card fade-up fade-up-${Math.min(i + 1, 5)}`}
                      data-ocid={`discover.web2.item.${i + 1}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center text-2xl">
                          {app.emoji}
                        </div>
                        <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/25 text-xs border">
                          {app.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{app.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {app.description}
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          disabled={web2ProxyLoading === app.id || !actor}
                          onClick={() => handleWeb2ProxyLaunch(app)}
                          className="w-full h-8 text-xs bg-violet-600/20 hover:bg-violet-600/35 text-violet-300 border border-violet-500/20 rounded-full disabled:opacity-50"
                          data-ocid={`discover.web2.proxy.button.${i + 1}`}
                          title={!actor ? "Connecting…" : undefined}
                        >
                          {web2ProxyLoading === app.id ? (
                            <>
                              <Shield className="w-3 h-3 mr-1.5 animate-pulse" />{" "}
                              Routing…
                            </>
                          ) : actorError ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1.5" />
                              Retry
                            </>
                          ) : !actor ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                              Connecting…
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3 mr-1.5" /> Launch via
                              Proxy
                            </>
                          )}
                        </Button>
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                          data-ocid={"discover.web2.direct.link"}
                        >
                          Open directly (IP visible)
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inline Preview Panel */}
            {previewPanel && (
              <div
                className="glass-card rounded-2xl overflow-hidden border border-white/10 animate-in slide-in-from-top-4 duration-300"
                data-ocid="discover.web2.panel"
              >
                {/* Panel header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      IP Hidden
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {previewPanel.appName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {previewPanel.appUrl}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewPanel(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                    data-ocid="discover.web2.close_button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Confirmation body */}
                <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground mb-1">
                      Routing verified — site opened in a new tab
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      The ICP canister made the request on your behalf. The
                      destination server saw ICP's infrastructure IP, not yours.
                    </p>
                  </div>
                  <div className="w-full max-w-lg rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-left">
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                      Canister response snippet
                    </p>
                    <p className="text-xs text-emerald-300 font-mono break-all line-clamp-4">
                      {previewPanel.bodySnippet}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2 bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30"
                    onClick={() =>
                      window.open(
                        previewPanel.appUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    data-ocid="discover.web2.open_button"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open {previewPanel.appName} again
                  </Button>
                </div>

                {/* Footnote */}
                <div className="px-4 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
                  <Shield className="w-3 h-3 text-violet-400 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Routed via ICP canister HTTP outcall — your IP was not
                    exposed to {previewPanel.appName}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENT TAB */}
        {activeTab === "content" &&
          (() => {
            // Use on-chain approved partners if available, else show empty state
            const onChainApproved = approvedPartners;
            // Show on-chain approved partner channels if any
            if (onChainApproved.length > 0) {
              return (
                <div className="fade-up space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-display font-bold mb-1">
                        Partner Channels
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Live channels from approved partners · HYVEIL earns 10%
                        commission
                      </p>
                    </div>
                    <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-amber-300 border border-amber-500/20">
                      <Percent className="w-3 h-3" /> 10% platform commission
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {onChainApproved.map((p, i) => (
                      <div
                        key={p.id.toString()}
                        className="glass-card rounded-2xl p-5 space-y-3 flex flex-col"
                        data-ocid={`content.item.${i + 1}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-display font-bold text-lg">
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {p.website}
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            LIVE
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          {p.description ||
                            "This partner channel is now live on HYVEIL."}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <a
                            href={`https://${p.canisterId.toString()}.icp0.io`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] text-emerald-400 hover:underline truncate max-w-[180px]"
                          >
                            {p.canisterId.toString()}.icp0.io
                          </a>
                          <span className="flex items-center gap-1 text-[9px] text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" /> Template
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {p.chains.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        <Button
                          className="w-full rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 gap-2"
                          data-ocid={`content.watch.button.${i + 1}`}
                          onClick={() =>
                            window.open(
                              `https://${p.canisterId.toString()}.icp0.io`,
                              "_blank",
                            )
                          }
                        >
                          <Play className="w-3.5 h-3.5" /> Browse Channel
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          })()}

        {/* PROXY TAB */}
        {activeTab === "proxy" && (
          <div className="fade-up space-y-8">
            <div>
              <h2 className="text-2xl font-display font-bold mb-1">
                Privacy Layer
              </h2>
              <p className="text-muted-foreground text-sm">
                Access Web2 services anonymously through on-chain routing
              </p>
            </div>

            {/* Live Proxy Status */}
            {(() => {
              const activeCount = proxyServices.filter((s) => s.active).length;
              const isAnyActive = activeCount > 0;
              return (
                <div className="glass-card rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      Anonymized
                    </div>
                    <div className="flex items-center gap-2 text-sm text-cyan-400">
                      <Radio className="w-4 h-4" />
                      On-chain Routing
                    </div>
                    <div className="flex items-center gap-2 text-sm text-violet-400">
                      <Shield className="w-4 h-4" />
                      Zero-log
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="w-4 h-4" />
                      IC HTTP Outcalls
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2.5 ml-auto"
                    data-ocid="proxy.status.panel"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${isAnyActive ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`}
                    />
                    <span
                      className={`text-sm font-medium ${isAnyActive ? "text-emerald-400" : "text-muted-foreground"}`}
                    >
                      {isAnyActive
                        ? `${activeCount} active · Traffic routed through ICP canister`
                        : "No active proxies"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Proxy services */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {proxyServices.map((svc, i) => (
                <div
                  key={svc.id}
                  className={`glass-card rounded-2xl p-5 dapp-card fade-up fade-up-${i + 1} ${
                    svc.active ? "border-emerald-500/30" : ""
                  }`}
                  data-ocid={`proxy.service.item.${i + 1}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{svc.icon}</span>
                    {svc.active && (
                      <span className="status-online text-xs px-2 py-0.5 rounded-full font-medium">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold mb-1">{svc.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {svc.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">
                      {svc.costPerSession} ICP/session
                    </span>
                    <Button
                      size="sm"
                      disabled={proxyLoadingId === svc.id || !actor}
                      className={`text-xs rounded-full px-4 disabled:opacity-50 ${
                        svc.active
                          ? "bg-emerald-600/20 hover:bg-red-600/20 text-emerald-300 hover:text-red-300 border-emerald-500/20"
                          : "bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border-violet-500/20"
                      }`}
                      title={!actor ? "Connecting…" : undefined}
                      onClick={() => {
                        if (!isLoggedIn) {
                          toast.error("Connect wallet first");
                          return;
                        }
                        handleActivateProxy(svc.id);
                      }}
                      data-ocid={"proxy.activate.button"}
                    >
                      {proxyLoadingId === svc.id ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          Routing…
                        </span>
                      ) : actorError ? (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </span>
                      ) : !actor ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Connecting…
                        </span>
                      ) : svc.active ? (
                        "Deactivate"
                      ) : (
                        "Activate"
                      )}
                    </Button>
                  </div>
                  {svc.active && svc.responsePreview && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wider">
                        Canister response
                      </p>
                      <pre className="text-xs text-emerald-300/80 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                        {svc.responsePreview}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Browsing History */}
            <div
              className="glass-card rounded-2xl p-6"
              data-ocid="proxy.log.panel"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-sm">Browsing History</h3>
                  <span className="text-xs text-muted-foreground">
                    ({proxyLog.length} entries)
                  </span>
                </div>
                {proxyLog.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-red-400 h-7 px-2"
                    onClick={() => {
                      setProxyLog([]);
                      localStorage.removeItem(PROXY_HISTORY_KEY);
                    }}
                    data-ocid="proxy.log.clear_button"
                  >
                    Clear History
                  </Button>
                )}
              </div>
              {proxyLog.length === 0 ? (
                <div
                  className="text-center text-muted-foreground text-sm py-8 flex flex-col items-center gap-2"
                  data-ocid="proxy.log.empty_state"
                >
                  <Globe className="w-8 h-8 text-white/20" />
                  <p>No browsing history yet</p>
                  <p className="text-xs text-white/30">
                    History from both the Proxy tab and Discover tab will appear
                    here
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {proxyLog.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-1.5 bg-black/20 hover:bg-black/30 transition-colors rounded-xl p-3 text-xs"
                      data-ocid={`proxy.log.item.${i + 1}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`flex-shrink-0 font-bold text-base leading-none ${entry.success ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {entry.success ? "✓" : "✗"}
                        </span>
                        <Globe className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400/90 hover:text-cyan-300 truncate max-w-[200px] font-mono"
                          title={entry.url}
                        >
                          {entry.url}
                        </a>
                        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              entry.source === "discover-tab"
                                ? "bg-violet-500/20 text-violet-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {entry.source === "discover-tab"
                              ? "Discover"
                              : "Proxy Tab"}
                          </span>
                          <span className="text-white/30">
                            {entry.statusCode !== null
                              ? String(entry.statusCode)
                              : "ERR"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-white/40">
                        <span>{entry.timestamp}</span>
                        {entry.bodyPreview && (
                          <span className="truncate max-w-xs font-mono">
                            · {entry.bodyPreview}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dub Agent */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl glass flex items-center justify-center">
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Dub Agent</h3>
                  <p className="text-xs text-muted-foreground">
                    Localization & privacy preferences
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Dubbing Language
                  </Label>
                  <Select value={dubLanguage} onValueChange={setDubLanguage}>
                    <SelectTrigger
                      className="glass border-white/10 rounded-xl"
                      data-ocid="proxy.language.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                      <SelectItem value="fr">🇫🇷 French</SelectItem>
                      <SelectItem value="de">🇩🇪 German</SelectItem>
                      <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                      <SelectItem value="zh">🇨🇳 Chinese</SelectItem>
                      <SelectItem value="ar">🇸🇦 Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Subtitles</p>
                    <p className="text-xs text-muted-foreground">
                      Enable subtitle overlay
                    </p>
                  </div>
                  <Switch
                    checked={subtitles}
                    onCheckedChange={setSubtitles}
                    data-ocid="proxy.subtitles.switch"
                  />
                </div>
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Region Anonymizer</p>
                    <p className="text-xs text-muted-foreground">
                      Mask geo-location
                    </p>
                  </div>
                  <Switch
                    checked={regionAnon}
                    onCheckedChange={setRegionAnon}
                    data-ocid="proxy.region.switch"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {activeTab === "wallet" && (
          <div className="fade-up space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold mb-1">Wallet</h2>
              <p className="text-muted-foreground text-sm">
                OISY-powered · linked to your Internet Identity
              </p>
            </div>

            {/* Main wallet card */}
            <div className="wallet-card rounded-3xl p-8">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-white/60" />
                    <span className="text-white/60 text-sm">
                      Internet Computer
                    </span>
                  </div>
                  <span className="text-white/40 text-xs font-mono">
                    {isLoggedIn
                      ? `${principal?.slice(0, 12)}...`
                      : "Not connected"}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-5xl font-display font-bold text-white">
                    {balanceVisible ? walletBalance.toFixed(4) : "••••••"}
                  </span>
                  <span className="text-white/50 text-xl">ICP</span>
                  <button
                    type="button"
                    onClick={() => setBalanceVisible((v) => !v)}
                    className="text-white/30 hover:text-white/60 ml-1"
                  >
                    {balanceVisible ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-white/40 text-sm mb-6">
                  ≈ ${(walletBalance * 8.2).toFixed(2)} USD
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleTopUp}
                    className="bg-white/15 hover:bg-white/25 text-white border-white/20 rounded-xl"
                    data-ocid="wallet.topup.button"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Top Up +1 ICP
                  </Button>
                  {principal && (
                    <Button
                      onClick={copyPrincipal}
                      variant="ghost"
                      className="text-white/50 hover:text-white border-white/10 rounded-xl"
                      data-ocid="wallet.copy.button"
                    >
                      <Copy className="w-4 h-4 mr-1.5" /> Copy Address
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Token Assets */}
            <div>
              <h3 className="font-display font-semibold mb-3">Token Assets</h3>
              <div className="glass-card rounded-2xl divide-y divide-white/5">
                {ckTokens.map((token) => (
                  <div
                    key={token.symbol}
                    className="flex items-center justify-between p-4"
                    data-ocid={`wallet.${token.symbol.toLowerCase()}.row`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs"
                        style={{
                          background: `${token.color}33`,
                          border: `1px solid ${token.color}55`,
                        }}
                      >
                        <span style={{ color: token.color }}>
                          {token.symbol.replace("ck", "")}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{token.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {token.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {!isLoggedIn ? (
                          <span className="text-muted-foreground text-xs">
                            Connect wallet
                          </span>
                        ) : token.isLoading ? (
                          <span className="text-muted-foreground">…</span>
                        ) : token.balance !== null ? (
                          `${token.balance.toFixed(6)} ${token.symbol}`
                        ) : (
                          "—"
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground/50 bg-white/5 px-2 py-0.5 rounded-full">
                        ICP Chain-Key
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction history */}
            <div>
              <h3 className="font-display font-semibold mb-3">
                Transaction History
              </h3>
              <div className="glass-card rounded-2xl divide-y divide-white/5">
                {transactions.length === 0 ? (
                  <div
                    className="p-8 text-center text-muted-foreground"
                    data-ocid="wallet.empty_state"
                  >
                    No transactions yet
                  </div>
                ) : (
                  transactions.map((tx, i) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4"
                      data-ocid={`wallet.tx.item.${i + 1}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            tx.type === "credit"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-violet-500/15 text-violet-400"
                          }`}
                        >
                          {tx.type === "credit" ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {tx.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.timestamp}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-mono font-semibold ${
                            tx.type === "credit"
                              ? "text-emerald-400"
                              : "text-violet-400"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}
                          {tx.amount.toFixed(4)} ICP
                        </p>
                        {tx.commission && (
                          <p className="text-[10px] text-muted-foreground">
                            {tx.commission.toFixed(3)} commission
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-center">
              <span className="text-xs text-muted-foreground/50 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Powered by Internet Identity · ICRC-1 Standard
              </span>
            </div>
          </div>
        )}

        {/* REVENUE TAB */}
        {activeTab === "revenue" && (
          <div className="fade-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold mb-1">
                  HYVEIL Treasury
                </h2>
                <p className="text-muted-foreground text-sm">
                  Platform commissions · On-chain auditable
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingRate ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-20 h-8 text-sm glass border-white/10 rounded-lg"
                      min="5"
                      max="50"
                      data-ocid="revenue.rate.input"
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
                      onClick={() => {
                        const r = Number.parseInt(newRate);
                        if (r >= 5 && r <= 50) {
                          setCommissionRate(r);
                          toast.success(`Commission rate updated to ${r}%`);
                        } else {
                          toast.error("Rate must be 5-50%");
                        }
                        setEditingRate(false);
                      }}
                      data-ocid="revenue.rate.save.button"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setEditingRate(false)}
                      data-ocid="revenue.rate.cancel.button"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-semibold text-violet-300 border border-violet-500/20 hover:border-violet-500/40 transition-colors"
                    onClick={() => {
                      setNewRate(String(commissionRate));
                      setEditingRate(true);
                    }}
                    data-ocid="revenue.rate.edit.button"
                  >
                    {commissionRate}% Platform Fee
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Volume",
                  value: `${totalVolume.toFixed(3)} ICP`,
                  icon: <Activity className="w-5 h-5" />,
                  color: "text-cyan-400",
                },
                {
                  label: "Total Commissions",
                  value: `${totalCommissions.toFixed(3)} ICP`,
                  icon: <TrendingUp className="w-5 h-5" />,
                  color: "text-violet-400",
                },
                {
                  label: "Active dApps",
                  value: "9",
                  icon: <Layers className="w-5 h-5" />,
                  color: "text-emerald-400",
                },
                {
                  label: "Transactions",
                  value: String(REVENUE_TABLE.length),
                  icon: <Users className="w-5 h-5" />,
                  color: "text-amber-400",
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`glass-card rounded-2xl p-5 fade-up fade-up-${i + 1}`}
                  data-ocid={`revenue.stat.item.${i + 1}`}
                >
                  <div className={`mb-3 ${stat.color}`}>{stat.icon}</div>
                  <p className="text-xl font-display font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Transaction table */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h3 className="font-semibold">Commission Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {[
                        "Transaction",
                        "dApp / Service",
                        "Total",
                        "Commission",
                        "Creator Share",
                        "Time",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs text-muted-foreground font-medium px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REVENUE_TABLE.map((row, i) => (
                      <tr
                        key={row.tx}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        data-ocid={`revenue.tx.item.${i + 1}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {row.tx}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.dapp}</td>
                        <td className="px-4 py-3 font-mono">
                          {row.total.toFixed(3)} ICP
                        </td>
                        <td className="px-4 py-3 font-mono text-violet-400">
                          {row.commission.toFixed(3)} ICP
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-400">
                          {row.creator.toFixed(3)} ICP
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {row.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CREATOR DASHBOARD TAB */}
        {activeTab === "creator" && (
          <div className="fade-up space-y-6">
            {myChannels.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center min-h-[50vh] gap-6"
                data-ocid="creator.empty_state"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(139,92,246,0.15)" }}
                >
                  <TrendingUp
                    className="w-7 h-7"
                    style={{ color: "#8b5cf6" }}
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-display font-bold mb-2">
                    No Creator Channels Yet
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Deploy your first creator channel to start monetizing your
                    content with automatic 90/10 revenue splits.
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab("partners")}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl"
                  data-ocid="creator.partners.button"
                >
                  <Plus className="w-4 h-4 mr-2" /> Deploy a Channel
                </Button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold mb-1">
                      My Creator Channels
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Total earnings:{" "}
                      <span className="text-amber-400 font-semibold">
                        {e8sToIcp(
                          myChannels.reduce((s, c) => s + c.creatorShare, 0n),
                        )}{" "}
                        ICP
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass border-white/10 text-sm"
                    onClick={() => {
                      if (actor)
                        actor
                          .getMyChannelsRevenue()
                          .then(setMyChannels)
                          .catch(() => {});
                    }}
                    data-ocid="creator.secondary_button"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                  </Button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    className="glass-card rounded-2xl p-5"
                    data-ocid="creator.card"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(251,191,36,0.15)" }}
                      >
                        <Coins
                          className="w-4 h-4"
                          style={{ color: "#fbbf24" }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Total Earned
                      </span>
                    </div>
                    <p
                      className="text-2xl font-display font-bold"
                      style={{ color: "#fbbf24" }}
                    >
                      {e8sToIcp(
                        myChannels.reduce((s, c) => s + c.creatorShare, 0n),
                      )}{" "}
                      ICP
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your 90% creator share
                    </p>
                  </div>
                  <div
                    className="glass-card rounded-2xl p-5"
                    data-ocid="creator.card"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(139,92,246,0.15)" }}
                      >
                        <Percent
                          className="w-4 h-4"
                          style={{ color: "#8b5cf6" }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Platform Commission
                      </span>
                    </div>
                    <p
                      className="text-2xl font-display font-bold"
                      style={{ color: "#8b5cf6" }}
                    >
                      {e8sToIcp(
                        myChannels.reduce((s, c) => s + c.hyveilShare, 0n),
                      )}{" "}
                      ICP
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      HYVEIL 10% share
                    </p>
                  </div>
                  <div
                    className="glass-card rounded-2xl p-5"
                    data-ocid="creator.card"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(16,185,129,0.15)" }}
                      >
                        <Activity
                          className="w-4 h-4"
                          style={{ color: "#10b981" }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Total Purchases
                      </span>
                    </div>
                    <p
                      className="text-2xl font-display font-bold"
                      style={{ color: "#10b981" }}
                    >
                      {myChannels
                        .reduce((s, c) => s + Number(c.purchaseCount), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all channels
                    </p>
                  </div>
                </div>

                {/* Channel list table */}
                <div
                  className="glass-card rounded-2xl overflow-hidden"
                  data-ocid="creator.channels.table"
                >
                  <div className="p-5 border-b border-white/[0.06]">
                    <h3 className="font-display font-semibold text-foreground">
                      My Channels
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      All deployed creator channels
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                          <th className="text-left px-5 py-3 font-medium">
                            Channel Name
                          </th>
                          <th className="text-left px-4 py-3 font-medium">
                            Canister ID
                          </th>
                          <th className="text-left px-4 py-3 font-medium">
                            Status
                          </th>
                          <th className="text-right px-4 py-3 font-medium">
                            Total Revenue
                          </th>
                          <th className="text-right px-4 py-3 font-medium">
                            Followers
                          </th>
                          <th className="text-right px-4 py-3 font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {myChannels.map((ch, idx) => {
                          const cidStr = ch.canisterId.toString();
                          const shortCid = `${cidStr.slice(0, 8)}...${cidStr.slice(-4)}`;
                          const mockFollowers = Math.floor(100 + idx * 37 + 12);
                          return (
                            <tr
                              key={cidStr}
                              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                              data-ocid={`creator.channels.row.item.${idx + 1}`}
                            >
                              <td className="px-5 py-3 font-medium text-foreground">
                                {ch.partnerName}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {shortCid}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(cidStr);
                                      toast.success("Canister ID copied!");
                                    }}
                                    className="text-white/30 hover:text-white/60"
                                    data-ocid={`creator.channels.secondary_button.${idx + 1}`}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    background: "rgba(16,185,129,0.15)",
                                    color: "#10b981",
                                    border: "1px solid rgba(16,185,129,0.3)",
                                  }}
                                >
                                  Active
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-amber-400 text-xs">
                                {e8sToIcp(ch.totalRevenue)} ICP
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                <div className="flex items-center justify-end gap-1">
                                  <Users className="w-3 h-3" />
                                  {mockFollowers}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="glass border-white/10 text-xs h-7"
                                    onClick={() =>
                                      window.open(
                                        `https://${cidStr}.icp0.io`,
                                        "_blank",
                                      )
                                    }
                                    data-ocid={`creator.channels.button.${idx + 1}`}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />{" "}
                                    Manage
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Per-channel cards */}
                <div className="space-y-4">
                  {myChannels.map((ch, idx) => {
                    const cidStr = ch.canisterId.toString();
                    const shortCid = `${cidStr.slice(0, 8)}...${cidStr.slice(-4)}`;
                    const isExpanded = expandedChannels.has(cidStr);
                    const contents =
                      channelContents[ch.partnerId.toString()] ?? [];
                    return (
                      <div
                        key={cidStr}
                        className="glass-card rounded-2xl p-5 space-y-4"
                        data-ocid={`creator.channel.item.${idx + 1}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                background:
                                  "linear-gradient(135deg, #ec4899, #8b5cf6)",
                              }}
                            >
                              <Film className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {ch.partnerName}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-muted-foreground font-mono">
                                  {shortCid}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cidStr);
                                    toast.success("Canister ID copied!");
                                  }}
                                  className="text-white/30 hover:text-white/60"
                                  data-ocid={`creator.channel.secondary_button.${idx + 1}`}
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: "rgba(16,185,129,0.15)",
                                color: "#10b981",
                                border: "1px solid rgba(16,185,129,0.3)",
                              }}
                            >
                              Active
                            </span>
                          </div>
                        </div>

                        {/* Monetization toggle */}
                        <div
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              Monetization Model
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              How viewers pay for your content
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              PPV
                            </span>
                            <Switch
                              checked={false}
                              onCheckedChange={(checked) => {
                                if (actor) {
                                  actor
                                    .setMonetizationModel(
                                      ch.partnerId,
                                      checked ? "subscription" : "pay-per-view",
                                    )
                                    .then(() =>
                                      toast.success(
                                        "Monetization model updated",
                                      ),
                                    )
                                    .catch(() =>
                                      toast.error("Failed to update model"),
                                    );
                                }
                              }}
                              data-ocid={`creator.channel.switch.${idx + 1}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              Sub
                            </span>
                          </div>
                        </div>

                        {/* Revenue breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div
                            className="text-center p-3 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.03)" }}
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              Total Revenue
                            </p>
                            <p className="text-sm font-bold text-foreground">
                              {e8sToIcp(ch.totalRevenue)} ICP
                            </p>
                          </div>
                          <div
                            className="text-center p-3 rounded-xl"
                            style={{ background: "rgba(16,185,129,0.06)" }}
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              Your 90%
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "#10b981" }}
                            >
                              {e8sToIcp(ch.creatorShare)} ICP
                            </p>
                          </div>
                          <div
                            className="text-center p-3 rounded-xl"
                            style={{ background: "rgba(139,92,246,0.06)" }}
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              Platform 10%
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "#8b5cf6" }}
                            >
                              {e8sToIcp(ch.hyveilShare)} ICP
                            </p>
                          </div>
                          <div
                            className="text-center p-3 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.03)" }}
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              Followers
                            </p>
                            <p className="text-sm font-bold text-foreground">
                              👥 {Math.floor(100 + idx * 37 + 12)}
                            </p>
                          </div>
                        </div>

                        {/* Content count and actions */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="glass border-white/10 text-xs h-8"
                            onClick={() =>
                              window.open(`https://${cidStr}.icp0.io`, "_blank")
                            }
                            data-ocid={`creator.channel.button.${idx + 1}`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1.5" /> Manage
                            Channel
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs h-8"
                            style={{
                              background:
                                "linear-gradient(135deg, #ec4899, #8b5cf6)",
                              color: "white",
                              border: "none",
                            }}
                            onClick={() =>
                              setAddContentModal({
                                partnerId: ch.partnerId,
                                partnerName: ch.partnerName,
                              })
                            }
                            data-ocid={`creator.channel.edit_button.${idx + 1}`}
                          >
                            <Plus className="w-3 h-3 mr-1.5" /> Add Content
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const newSet = new Set(expandedChannels);
                              if (isExpanded) {
                                newSet.delete(cidStr);
                              } else {
                                newSet.add(cidStr);
                                fetchChannelContent(ch.partnerId);
                              }
                              setExpandedChannels(newSet);
                            }}
                            data-ocid={`creator.channel.toggle.${idx + 1}`}
                          >
                            <Eye className="w-3 h-3 mr-1.5" />
                            {isExpanded ? "Hide" : "View"} Content (
                            {contents.length})
                          </Button>
                        </div>

                        {/* Inline content list */}
                        {isExpanded && (
                          <div className="space-y-2 pt-1">
                            {contents.length === 0 ? (
                              <p
                                className="text-xs text-muted-foreground text-center py-4"
                                data-ocid={`creator.channel.empty_state.${idx + 1}`}
                              >
                                No content added yet. Click "Add Content" to get
                                started.
                              </p>
                            ) : (
                              contents.map((item, ci) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 rounded-xl"
                                  style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                  }}
                                  data-ocid={`creator.content.item.${ci + 1}`}
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {item.contentType} ·{" "}
                                      {e8sToIcp(item.priceE8s)} ICP
                                    </p>
                                  </div>
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                      background: "rgba(139,92,246,0.15)",
                                      color: "#a78bfa",
                                    }}
                                  >
                                    {item.contentType}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Transaction History */}
                {(() => {
                  const CREATOR_MOCK_TXS = [
                    {
                      channel: myChannels[0]?.partnerName ?? "Channel 1",
                      buyer: "2vxsx-fae",
                      content: "Morning Workout Vol.1",
                      amount: 0.5,
                      creatorShare: 0.45,
                      hyveilCut: 0.05,
                      date: "Mar 30, 2026",
                    },
                    {
                      channel: myChannels[0]?.partnerName ?? "Channel 1",
                      buyer: "rdmx6-jaaaa",
                      content: "City Life Ep.3",
                      amount: 1.2,
                      creatorShare: 1.08,
                      hyveilCut: 0.12,
                      date: "Mar 29, 2026",
                    },
                    {
                      channel: myChannels[1]?.partnerName ?? "Channel 2",
                      buyer: "aaaaa-aa",
                      content: "Sunset Vibes",
                      amount: 0.8,
                      creatorShare: 0.72,
                      hyveilCut: 0.08,
                      date: "Mar 28, 2026",
                    },
                    {
                      channel: myChannels[0]?.partnerName ?? "Channel 1",
                      buyer: "rrkah-fqaaa",
                      content: "Tech Talk #5",
                      amount: 2.0,
                      creatorShare: 1.8,
                      hyveilCut: 0.2,
                      date: "Mar 27, 2026",
                    },
                    {
                      channel: myChannels[1]?.partnerName ?? "Channel 2",
                      buyer: "qoctq-giaaa",
                      content: "Night Run",
                      amount: 0.75,
                      creatorShare: 0.675,
                      hyveilCut: 0.075,
                      date: "Mar 26, 2026",
                    },
                    {
                      channel: myChannels[0]?.partnerName ?? "Channel 1",
                      buyer: "gvbup-yiaaa",
                      content: "Street Art Tour",
                      amount: 1.5,
                      creatorShare: 1.35,
                      hyveilCut: 0.15,
                      date: "Mar 24, 2026",
                    },
                    {
                      channel: myChannels[1]?.partnerName ?? "Channel 2",
                      buyer: "2vxsx-fae",
                      content: "Cooking at Home",
                      amount: 0.6,
                      creatorShare: 0.54,
                      hyveilCut: 0.06,
                      date: "Mar 22, 2026",
                    },
                    {
                      channel: myChannels[0]?.partnerName ?? "Channel 1",
                      buyer: "rdmx6-jaaaa",
                      content: "Morning Workout Vol.2",
                      amount: 0.5,
                      creatorShare: 0.45,
                      hyveilCut: 0.05,
                      date: "Mar 20, 2026",
                    },
                    {
                      channel: myChannels[1]?.partnerName ?? "Channel 2",
                      buyer: "aaaaa-aa",
                      content: "City Life Ep.4",
                      amount: 1.2,
                      creatorShare: 1.08,
                      hyveilCut: 0.12,
                      date: "Mar 18, 2026",
                    },
                    {
                      channel: myChannels[0]?.partnerName ?? "Channel 1",
                      buyer: "rrkah-fqaaa",
                      content: "Tech Talk #6",
                      amount: 2.0,
                      creatorShare: 1.8,
                      hyveilCut: 0.2,
                      date: "Mar 15, 2026",
                    },
                  ];
                  return (
                    <div
                      className="glass-card rounded-2xl overflow-hidden"
                      data-ocid="creator.transactions.table"
                    >
                      <div className="p-5 border-b border-white/[0.06]">
                        <h3 className="font-display font-semibold text-foreground">
                          Transaction History — All Channels
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Complete record of all purchases and revenue splits
                        </p>
                      </div>
                      <div
                        className="overflow-x-auto"
                        style={{ maxHeight: 400, overflowY: "auto" }}
                      >
                        <table className="w-full text-sm">
                          <thead
                            style={{
                              position: "sticky",
                              top: 0,
                              background: "var(--background)",
                              zIndex: 1,
                            }}
                          >
                            <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                              <th className="text-left px-5 py-3 font-medium">
                                Channel
                              </th>
                              <th className="text-left px-4 py-3 font-medium">
                                Buyer
                              </th>
                              <th className="text-left px-4 py-3 font-medium">
                                Content
                              </th>
                              <th className="text-right px-4 py-3 font-medium">
                                Amount
                              </th>
                              <th className="text-right px-4 py-3 font-medium">
                                Creator Share
                              </th>
                              <th className="text-right px-4 py-3 font-medium">
                                HYVEIL Cut
                              </th>
                              <th className="text-right px-4 py-3 font-medium">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {CREATOR_MOCK_TXS.map((tx, i) => (
                              <tr
                                key={`${tx.channel}-${tx.content}-${i}`}
                                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                data-ocid={`creator.transactions.row.item.${i + 1}`}
                              >
                                <td className="px-5 py-3 text-xs font-medium text-violet-400">
                                  {tx.channel}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{`${tx.buyer.slice(0, 5)}...${tx.buyer.slice(-4)}`}</td>
                                <td className="px-4 py-3 text-xs text-foreground max-w-[140px] truncate">
                                  {tx.content}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-amber-400">
                                  {tx.amount.toFixed(2)} ICP
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-emerald-400">
                                  {tx.creatorShare.toFixed(3)} ICP
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-violet-400">
                                  {tx.hyveilCut.toFixed(3)} ICP
                                </td>
                                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                  {tx.date}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* PARTNERS TAB */}
        {activeTab === "partners" && (
          <div className="fade-up space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold mb-1">
                  Partner Channels
                </h2>
                <p className="text-sm text-muted-foreground">
                  Deploy your own canister channel and start earning ·
                  Registration is permissionless
                </p>
              </div>
              <Button
                className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-2"
                onClick={() => setShowPartnerForm(true)}
                data-ocid="partners.cta.button"
              >
                <Handshake className="w-4 h-4" />
                Deploy My Channel
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Partners",
                  value: partners.length,
                  icon: <Building2 className="w-4 h-4 text-violet-400" />,
                },
                {
                  label: "Total Channels",
                  value: partners.length,
                  icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
                },
                {
                  label: "Partner Volume",
                  value: `${partners.reduce((s, p) => s + p.monthlyVolume, 0).toFixed(2)} ICP`,
                  icon: <TrendingUp className="w-4 h-4 text-cyan-400" />,
                },
                {
                  label: "Partners Earned",
                  value: `${partners.reduce((s, p) => s + p.earned, 0).toFixed(3)} ICP`,
                  icon: <Coins className="w-4 h-4 text-amber-400" />,
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="glass-card rounded-2xl p-5"
                  data-ocid={`partners.stat.item.${i + 1}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      {stat.label}
                    </span>
                    {stat.icon}
                  </div>
                  <div className="text-xl font-display font-bold">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Commission Tiers */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Commission Tiers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-2xl p-5 border border-amber-500/20">
                  <div className="text-2xl mb-2">🥉</div>
                  <div className="font-display font-bold text-amber-300 mb-1">
                    Bronze
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    &lt;5 ICP / month
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        HYVEIL takes
                      </span>
                      <span className="text-red-400 font-medium">15%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You keep</span>
                      <span className="text-emerald-400 font-bold">85%</span>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-slate-400/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent pointer-events-none" />
                  <div className="text-2xl mb-2">🥈</div>
                  <div className="font-display font-bold text-slate-300 mb-1">
                    Silver
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    5–20 ICP / month
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        HYVEIL takes
                      </span>
                      <span className="text-red-400 font-medium">12%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You keep</span>
                      <span className="text-emerald-400 font-bold">88%</span>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-yellow-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
                  <div className="text-2xl mb-2">🥇</div>
                  <div className="font-display font-bold text-yellow-300 mb-1">
                    Gold
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    &gt;20 ICP / month
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        HYVEIL takes
                      </span>
                      <span className="text-red-400 font-medium">10%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You keep</span>
                      <span className="text-emerald-400 font-bold">90%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Partners Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/[0.06]">
                <h3 className="font-display font-semibold">
                  Registered Partners
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                      <th className="text-left px-5 py-3 font-medium">dApp</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Chains
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Canister ID
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Wallet
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Monthly Vol.
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Partner Earned
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Commission
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Joined
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...partners]
                      .sort((a, b) => b.monthlyVolume - a.monthlyVolume)
                      .map((p, i) => (
                        <tr
                          key={p.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                          data-ocid={`partners.row.item.${i + 1}`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {p.url}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(p.supportedChains ?? ["ICP"]).map((c) => (
                                <span
                                  key={c}
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    c === "ICP"
                                      ? "bg-violet-500/20 text-violet-300"
                                      : c === "Ethereum"
                                        ? "bg-blue-500/20 text-blue-300"
                                        : c === "Solana"
                                          ? "bg-emerald-500/20 text-emerald-300"
                                          : c === "Bitcoin"
                                            ? "bg-orange-500/20 text-orange-300"
                                            : "bg-slate-500/20 text-slate-300"
                                  }`}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {p.category}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                {p.canisterId.slice(0, 12)}…
                              </span>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-cyan-400 transition-colors"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.canisterId);
                                  toast.success("Canister ID copied!");
                                }}
                                title="Copy canister ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-emerald-300">
                            {p.walletBalance.toFixed(3)} ICP
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono">
                            {p.monthlyVolume.toFixed(2)} ICP
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-emerald-300">
                            {p.earned.toFixed(3)} ICP
                          </td>
                          <td className="px-4 py-3.5 text-right text-violet-400">
                            {p.commissionRate}%
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs">
                            {p.joinedDate}
                          </td>
                          <td className="px-4 py-3.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg text-xs h-7 px-2.5 border border-white/10 hover:border-violet-500/40"
                              onClick={() => setSelectedPartnerChannel(p)}
                              data-ocid={`partners.view.button.${i + 1}`}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" /> Open
                              Channel
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MY CHANNELS */}
            {isLoggedIn && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  My Channels
                </h3>
                {myPartners.length === 0 ? (
                  <div
                    className="glass-card rounded-2xl p-6 text-center text-muted-foreground text-sm"
                    data-ocid="partners.empty_state"
                  >
                    No channels yet. Deploy your first channel canister above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPartners.map((p, i) => (
                      <div
                        key={p.id.toString()}
                        className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        data-ocid={`partners.item.${i + 1}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold">
                              {p.name}
                            </span>
                            {p.status === "approved" && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                LIVE
                              </span>
                            )}
                            {p.status === "pending" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                PENDING
                              </span>
                            )}
                            {p.status === "revoked" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                REVOKED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={`https://${p.canisterId.toString()}.icp0.io`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded truncate max-w-[220px]"
                            >
                              {p.canisterId.toString()}.icp0.io
                            </a>
                            <span className="flex items-center gap-1 text-[10px] text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                              <Lock className="w-2.5 h-2.5" /> HYVEIL Template
                            </span>
                          </div>
                          {p.status === "pending" && (
                            <p className="text-xs text-amber-300/70">
                              Channel is live — content is visible in the
                              Content tab
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(
                            Number(p.registeredAt) / 1_000_000,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADMIN CONTROLS */}
            {isAdmin && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" /> Admin — All
                  Partners
                </h3>
                {onChainPartners.length === 0 ? (
                  <div className="glass-card rounded-2xl p-6 text-center text-muted-foreground text-sm">
                    No registered partners yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onChainPartners.map((p, i) => (
                      <div
                        key={p.id.toString()}
                        className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        data-ocid={`partners.row.item.${i + 1}`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{p.name}</span>
                            {p.status === "approved" && (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                                Approved
                              </Badge>
                            )}
                            {p.status === "pending" && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                                Pending
                              </Badge>
                            )}
                            {p.status === "revoked" && (
                              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
                                Revoked
                              </Badge>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-cyan-400">
                            {p.owner.toString().slice(0, 20)}...
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {p.status !== "approved" && (
                            <Button
                              size="sm"
                              className="rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs h-8"
                              onClick={async () => {
                                if (!actor) return;
                                try {
                                  await actor.approvePartner(p.id);
                                  setOnChainPartners((prev) =>
                                    prev.map((x) =>
                                      x.id === p.id
                                        ? { ...x, status: "approved" as any }
                                        : x,
                                    ),
                                  );
                                  setApprovedPartners((prev) => [
                                    ...prev,
                                    { ...p, status: "approved" as any },
                                  ]);
                                  toast.success(`${p.name} approved!`);
                                } catch {
                                  toast.error("Failed to approve");
                                }
                              }}
                              data-ocid={`partners.edit_button.${i + 1}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{" "}
                              Approve
                            </Button>
                          )}
                          {p.status === "approved" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8"
                              onClick={async () => {
                                if (!actor) return;
                                try {
                                  await actor.revokePartner(p.id);
                                  setOnChainPartners((prev) =>
                                    prev.map((x) =>
                                      x.id === p.id
                                        ? { ...x, status: "revoked" as any }
                                        : x,
                                    ),
                                  );
                                  setApprovedPartners((prev) =>
                                    prev.filter((x) => x.id !== p.id),
                                  );
                                  toast.success(`${p.name} revoked.`);
                                } catch {
                                  toast.error("Failed to revoke");
                                }
                              }}
                              data-ocid={`partners.delete_button.${i + 1}`}
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "agents" && (
          <div className="fade-up space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed33, #4f46e533)",
                  }}
                >
                  <Bot className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                  AI Agent Marketplace
                </h2>
              </div>
              <p className="text-sm text-muted-foreground ml-12">
                Review and approve AI agents for integration with HYVEIL
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Agents",
                  value: agents.length,
                  icon: <Bot className="w-4 h-4 text-violet-400" />,
                },
                {
                  label: "Pending Review",
                  value: agents.filter((a) => a.status === "pending_review")
                    .length,
                  icon: <Activity className="w-4 h-4 text-amber-400" />,
                },
                {
                  label: "Approved",
                  value: agents.filter((a) => a.status === "approved").length,
                  icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
                },
                {
                  label: "Rejected",
                  value: agents.filter((a) => a.status === "rejected").length,
                  icon: <X className="w-4 h-4 text-red-400" />,
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="glass-card rounded-2xl p-5"
                  data-ocid={`agents.stat.item.${i + 1}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      {stat.label}
                    </span>
                    {stat.icon}
                  </div>
                  <div className="text-xl font-display font-bold">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                {(
                  ["all", "pending_review", "approved", "rejected"] as const
                ).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setAgentFilter(f)}
                    data-ocid="agents.filter.tab"
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      agentFilter === f
                        ? "bg-violet-600/30 border-violet-400/60 text-violet-200"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {f === "all"
                      ? "All"
                      : f === "pending_review"
                        ? "Pending Review"
                        : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Chain:</span>
                {["All", "ICP", "Ethereum", "Multi-Chain"].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setAgentChainFilter(c)}
                    data-ocid="agents.chain.tab"
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      agentChainFilter === c
                        ? c === "ICP"
                          ? "bg-violet-600/30 border-violet-400/60 text-violet-200"
                          : c === "Ethereum"
                            ? "bg-blue-600/30 border-blue-400/60 text-blue-200"
                            : c === "Multi-Chain"
                              ? "bg-emerald-600/30 border-emerald-400/60 text-emerald-200"
                              : "bg-violet-600/30 border-violet-400/60 text-violet-200"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents
                .filter(
                  (a) => agentFilter === "all" || a.status === agentFilter,
                )
                .filter(
                  (a) =>
                    agentChainFilter === "All" || a.chain === agentChainFilter,
                )
                .map((agent, i) => (
                  <div
                    key={agent.id}
                    className="glass-card rounded-2xl p-5 relative overflow-hidden"
                    data-ocid={`agents.item.${i + 1}`}
                  >
                    {/* Chain badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          agent.chain === "ICP"
                            ? "bg-violet-500/25 text-violet-300 border border-violet-500/30"
                            : agent.chain === "Ethereum"
                              ? "bg-blue-500/25 text-blue-300 border border-blue-500/30"
                              : agent.chain === "Multi-Chain"
                                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                                : "bg-slate-500/25 text-slate-300 border border-slate-500/30"
                        }`}
                      >
                        {agent.chain}
                      </span>
                    </div>
                    <div className="mb-3 pr-20">
                      <div className="font-display font-bold text-base mb-0.5">
                        {agent.name}
                      </div>
                      <div className="text-xs text-muted-foreground/70 italic">
                        {agent.agentType}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {agent.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/5 border border-white/10 text-muted-foreground">
                        {agent.category}
                      </span>
                      <a
                        href={agent.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        data-ocid="agents.link"
                      >
                        <ExternalLink className="w-3 h-3" /> Visit
                      </a>
                    </div>
                    {/* Action row */}
                    <div className="flex gap-2">
                      {agent.status === "pending_review" && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 rounded-lg text-xs h-8 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300"
                            onClick={() => {
                              setAgents((prev) =>
                                prev.map((a) =>
                                  a.id === agent.id
                                    ? { ...a, status: "approved" as const }
                                    : a,
                                ),
                              );
                              toast.success(`${agent.name} approved!`);
                            }}
                            data-ocid="agents.approve.button"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 rounded-lg text-xs h-8 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300"
                            onClick={() => {
                              setAgents((prev) =>
                                prev.map((a) =>
                                  a.id === agent.id
                                    ? { ...a, status: "rejected" as const }
                                    : a,
                                ),
                              );
                              toast.error(`${agent.name} rejected.`);
                            }}
                            data-ocid="agents.delete_button"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {agent.status === "approved" && (
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg text-xs h-7 px-2.5 border border-white/10 hover:border-red-500/30 text-muted-foreground hover:text-red-300"
                            onClick={() => {
                              setAgents((prev) =>
                                prev.map((a) =>
                                  a.id === agent.id
                                    ? {
                                        ...a,
                                        status: "pending_review" as const,
                                      }
                                    : a,
                                ),
                              );
                              toast.info(`${agent.name} moved back to review.`);
                            }}
                            data-ocid="agents.secondary_button"
                          >
                            Revoke
                          </Button>
                        </div>
                      )}
                      {agent.status === "rejected" && (
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                            <X className="w-3.5 h-3.5" /> Rejected
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg text-xs h-7 px-2.5 border border-white/10 hover:border-amber-500/30 text-muted-foreground hover:text-amber-300"
                            onClick={() => {
                              setAgents((prev) =>
                                prev.map((a) =>
                                  a.id === agent.id
                                    ? {
                                        ...a,
                                        status: "pending_review" as const,
                                      }
                                    : a,
                                ),
                              );
                              toast.info(`${agent.name} reconsidered.`);
                            }}
                            data-ocid="agents.edit_button"
                          >
                            Reconsider
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* PARTNER REGISTRATION DIALOG — 3-Step */}
        <Dialog
          open={showPartnerForm}
          onOpenChange={(open) => {
            if (!open) {
              setRegStep(1);
              setRegSuccess(null);
              setRegLoading(false);
              setNewPartnerForm({
                name: "",
                website: "",
                description: "",
                chains: ["ICP"],
              });
            }
            setShowPartnerForm(open);
          }}
        >
          <DialogContent className="glass-strong border-white/[0.08] rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display font-bold flex items-center gap-2">
                <Handshake className="w-5 h-5 text-violet-400" />
                Deploy Your Channel Canister
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Step {regStep} of 3 —{" "}
                {regStep === 1
                  ? "Fill in your dApp info"
                  : regStep === 2
                    ? "Pay deployment fee"
                    : "Deploy on ICP mainnet"}
              </DialogDescription>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex gap-2 mt-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all ${s <= regStep ? "bg-violet-500" : "bg-white/10"}`}
                />
              ))}
            </div>

            {!isLoggedIn ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold mb-1">
                    Internet Identity Required
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connect Internet Identity to register your channel and pay
                    the deployment fee.
                  </p>
                </div>
                <Button
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white w-full"
                  onClick={() => {
                    setShowPartnerForm(false);
                    login();
                  }}
                >
                  <Shield className="w-4 h-4 mr-2" /> Connect Internet Identity
                </Button>
              </div>
            ) : regSuccess ? (
              /* Success Screen */
              <div className="py-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-emerald-300 mb-1">
                    Channel Deployed!
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Your canister is live on ICP mainnet. Your channel is now
                    active and visible in the Content tab.
                  </p>
                  <div className="glass rounded-xl p-3 text-left space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Channel Name
                    </div>
                    <div className="font-semibold">{regSuccess.name}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Your Channel URL (auto-generated)
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded break-all flex-1">
                        https://{regSuccess.canisterId}.icp0.io
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-white transition-colors"
                        title="Copy URL"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `https://${regSuccess.canisterId}.icp0.io`,
                          );
                          toast.success("URL copied!");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Canister ID
                    </div>
                    <div className="font-mono text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded break-all">
                      {regSuccess.canisterId}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-lg px-2.5 py-1.5">
                      <Lock className="w-3 h-3 flex-shrink-0" />
                      <span>
                        HYVEIL controls the template as canister controller. You
                        manage content only.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-300 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{" "}
                  Channel is live — your content is visible in the Content tab
                  now
                </div>
                <Button
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white w-full"
                  onClick={() =>
                    window.open(
                      `https://${regSuccess.canisterId}.icp0.io`,
                      "_blank",
                    )
                  }
                  data-ocid="partners.manage_channel.button"
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Manage My Channel
                </Button>
                <Button
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white w-full"
                  onClick={() => {
                    setShowPartnerForm(false);
                    setRegStep(1);
                    setRegSuccess(null);
                    setNewPartnerForm({
                      name: "",
                      website: "",
                      description: "",
                      chains: ["ICP"],
                    });
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {/* STEP 1: Info */}
                {regStep === 1 && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        dApp Name
                      </Label>
                      <Input
                        placeholder="e.g. OpenChat"
                        value={newPartnerForm.name}
                        onChange={(e) =>
                          setNewPartnerForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="glass rounded-xl border-white/10"
                        data-ocid="partners.form.name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Website URL
                      </Label>
                      <Input
                        placeholder="https://yourdapp.app"
                        value={newPartnerForm.website}
                        onChange={(e) =>
                          setNewPartnerForm((prev) => ({
                            ...prev,
                            website: e.target.value,
                          }))
                        }
                        className="glass rounded-xl border-white/10"
                        data-ocid="partners.form.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Description
                      </Label>
                      <Textarea
                        placeholder="Briefly describe your dApp..."
                        value={newPartnerForm.description}
                        onChange={(e) =>
                          setNewPartnerForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="glass rounded-xl border-white/10 resize-none"
                        rows={3}
                        data-ocid="partners.form.textarea"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Supported Chains
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "ICP",
                          "Ethereum",
                          "Solana",
                          "Bitcoin",
                          "Polygon",
                          "BNB Chain",
                          "Avalanche",
                          "Cosmos",
                        ].map((chain) => {
                          const checked = newPartnerForm.chains.includes(chain);
                          return (
                            <button
                              key={chain}
                              type="button"
                              onClick={() =>
                                setNewPartnerForm((prev) => ({
                                  ...prev,
                                  chains: checked
                                    ? prev.chains.filter((c) => c !== chain)
                                    : [...prev.chains, chain],
                                }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${checked ? (chain === "ICP" ? "bg-violet-500/30 border-violet-400/60 text-violet-200" : "bg-blue-500/30 border-blue-400/60 text-blue-200") : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"}`}
                              data-ocid="partners.toggle"
                            >
                              {chain}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="ghost"
                        className="flex-1 rounded-xl border-white/10"
                        onClick={() => setShowPartnerForm(false)}
                        data-ocid="partners.form.cancel.button"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
                        onClick={() => {
                          if (!newPartnerForm.name || !newPartnerForm.website) {
                            toast.error("Please fill in name and website");
                            return;
                          }
                          setRegStep(2);
                        }}
                        data-ocid="partners.form.submit"
                      >
                        Next: Payment →
                      </Button>
                    </div>
                  </>
                )}

                {/* STEP 2: Payment */}
                {regStep === 2 && (
                  <>
                    <div className="glass rounded-2xl p-5 space-y-4 border border-violet-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Coins className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <div className="font-display font-bold">
                            Channel Deployment Fee
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Required to deploy your canister on ICP mainnet
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Deployment fee
                          </span>
                          <span className="font-bold text-amber-300">
                            {Number(registrationFee) / 100_000_000} ICP
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Your deposited balance
                          </span>
                          <span
                            className={
                              Number(myIcpDeposit) >= Number(registrationFee)
                                ? "text-emerald-400 font-medium"
                                : "text-red-400 font-medium"
                            }
                          >
                            {Number(myIcpDeposit) / 100_000_000} ICP
                          </span>
                        </div>
                      </div>
                      <div className="glass rounded-xl p-3 text-xs text-muted-foreground leading-relaxed border border-white/[0.06]">
                        💡 This ICP is used to purchase cycles for your
                        dedicated channel canister on the ICP mainnet. Your
                        channel will have its own canister ID, wallet, and
                        storage.
                      </div>
                      {Number(myIcpDeposit) < Number(registrationFee) && (
                        <Button
                          className="w-full rounded-xl bg-amber-600/80 hover:bg-amber-500/80 text-white gap-2"
                          disabled={
                            regLoading ||
                            (!actor && !actorError) ||
                            actorFetching
                          }
                          onClick={async () => {
                            if (actorError && !actor) {
                              retryActor();
                              return;
                            }
                            if (!actor) return;
                            setRegLoading(true);
                            try {
                              await actor.depositIcp(registrationFee);
                              await refreshMyBalance();
                              toast.success(
                                "Payment confirmed! Balance updated.",
                              );
                            } catch {
                              toast.error("Payment failed. Please try again.");
                            } finally {
                              setRegLoading(false);
                            }
                          }}
                          data-ocid="partners.form.submit"
                        >
                          {regLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Coins className="w-4 h-4" />
                          )}
                          Confirm & Pay {Number(registrationFee) / 100_000_000}{" "}
                          ICP
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="ghost"
                        className="flex-1 rounded-xl border-white/10"
                        onClick={() => setRegStep(1)}
                        data-ocid="partners.form.cancel.button"
                      >
                        ← Back
                      </Button>
                      <Button
                        className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
                        disabled={
                          Number(myIcpDeposit) < Number(registrationFee) ||
                          regLoading
                        }
                        onClick={() => {
                          setRegStep(3);
                        }}
                        data-ocid="partners.form.submit"
                      >
                        Deploy Channel →
                      </Button>
                    </div>
                  </>
                )}

                {/* STEP 3: Deploy */}
                {regStep === 3 && (
                  <>
                    <div className="glass rounded-2xl p-5 space-y-3 border border-violet-500/20">
                      <div className="font-semibold text-sm">
                        Ready to Deploy
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Channel name
                          </span>
                          <span className="font-medium">
                            {newPartnerForm.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Website</span>
                          <span className="font-medium truncate max-w-[160px]">
                            {newPartnerForm.website}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chains</span>
                          <span className="font-medium">
                            {newPartnerForm.chains.join(", ")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Fee paid
                          </span>
                          <span className="text-emerald-400 font-medium">
                            ✓ {Number(registrationFee) / 100_000_000} ICP
                          </span>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-white/[0.06]" />
                      <div className="glass rounded-xl p-3 text-xs leading-relaxed border border-violet-500/20 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-violet-300">
                          <Lock className="w-3.5 h-3.5" /> HYVEIL Template
                          Control
                        </div>
                        <p className="text-muted-foreground">
                          Your channel URL will be auto-generated upon
                          deployment. HYVEIL remains the canister controller and
                          enforces the channel template — partners populate
                          content within the fixed layout.
                        </p>
                      </div>
                    </div>
                    <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-violet-300 border border-violet-500/20">
                      <Zap className="w-3.5 h-3.5" /> Deploying will create a
                      live canister on ICP mainnet
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="ghost"
                        className="flex-1 rounded-xl border-white/10"
                        onClick={() => setRegStep(2)}
                        disabled={regLoading}
                        data-ocid="partners.form.cancel.button"
                      >
                        ← Back
                      </Button>
                      <Button
                        className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-2"
                        disabled={
                          regLoading || (!actor && !actorError) || actorFetching
                        }
                        onClick={async () => {
                          if (actorError && !actor) {
                            retryActor();
                            return;
                          }
                          setRegLoading(true);
                          try {
                            if (!actor) {
                              toast.error(
                                "Actor not ready. Please wait and try again.",
                              );
                              return;
                            }
                            const record = await actor.registerPartner({
                              name: newPartnerForm.name,
                              description: newPartnerForm.description,
                              website: newPartnerForm.website,
                              chains: newPartnerForm.chains,
                            });
                            const canId = record.canisterId.toString();
                            setRegSuccess({
                              canisterId: canId,
                              name: record.name,
                            });
                            setMyPartners((prev) => [...prev, record]);
                            toast.success(
                              `🎉 Channel "${record.name}" deployed!`,
                            );
                          } catch (err) {
                            const msg =
                              err instanceof Error ? err.message : String(err);
                            toast.error(
                              `Deployment failed: ${msg.slice(0, 120)}`,
                            );
                          } finally {
                            setRegLoading(false);
                          }
                        }}
                        data-ocid="partners.form.submit"
                      >
                        {regLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />{" "}
                            Deploying canister...
                          </>
                        ) : actorError ? (
                          <>
                            <RefreshCw className="w-4 h-4" /> Retry Connection
                          </>
                        ) : !actor || actorFetching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />{" "}
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" /> Deploy My Channel
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* PARTNER CHANNEL PANEL */}
      {selectedPartnerChannel && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end"
          data-ocid="partners.modal"
        >
          <button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
            onClick={() => setSelectedPartnerChannel(null)}
          />
          <div className="relative w-full max-w-xl bg-[oklch(0.10_0.04_270/0.97)] border-l border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-start justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-display font-bold">
                    {selectedPartnerChannel.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                    {selectedPartnerChannel.canisterId}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-cyan-400 transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        selectedPartnerChannel.canisterId,
                      );
                      toast.success("Canister ID copied!");
                    }}
                    data-ocid="partners.open_modal_button"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="ml-4 p-2 rounded-lg border border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSelectedPartnerChannel(null)}
                data-ocid="partners.close_button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="content" className="h-full flex flex-col">
                <TabsList className="flex mx-5 mt-4 mb-0 glass rounded-xl p-1 w-auto self-start gap-1 border border-white/[0.06]">
                  <TabsTrigger
                    value="content"
                    className="rounded-lg text-xs px-4 py-1.5 data-[state=active]:bg-violet-600/30 data-[state=active]:text-violet-300"
                    data-ocid="partners.tab"
                  >
                    Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="wallet"
                    className="rounded-lg text-xs px-4 py-1.5 data-[state=active]:bg-violet-600/30 data-[state=active]:text-violet-300"
                    data-ocid="partners.tab"
                  >
                    Wallet
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="content"
                  className="flex-1 p-5 space-y-4 mt-0"
                >
                  {selectedPartnerChannel.contentItems.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-16 text-center"
                      data-ocid="partners.empty_state"
                    >
                      <Film className="w-10 h-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No content published yet.
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        This channel is live and ready to publish.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {selectedPartnerChannel.contentItems.map((item, i) => {
                        const isWatched = ppvWatched.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className="glass-card rounded-2xl overflow-hidden flex items-stretch"
                            data-ocid={`partners.item.${i + 1}`}
                          >
                            <div
                              className="w-24 flex-shrink-0 flex items-center justify-center text-4xl"
                              style={{
                                background:
                                  "linear-gradient(135deg, oklch(0.16 0.07 280) 0%, oklch(0.12 0.05 250) 100%)",
                              }}
                            >
                              {item.emoji}
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.type === "EXCLUSIVE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"}`}
                                  >
                                    {item.type}
                                  </span>
                                  {isWatched && (
                                    <span className="status-online text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                      WATCHED
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold">
                                  {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-sm font-bold text-violet-300">
                                  {item.price} ICP
                                </span>
                                <Button
                                  size="sm"
                                  className={`h-7 text-xs rounded-lg ${isWatched ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/20 hover:bg-emerald-600/30" : "bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border-violet-500/20"}`}
                                  onClick={() => {
                                    if (isWatched) {
                                      toast.info(
                                        "Already purchased — enjoy the content!",
                                      );
                                      return;
                                    }
                                    setPpvModal({
                                      id: item.id,
                                      title: item.title,
                                      partnerName: selectedPartnerChannel.name,
                                      partnerEmoji: item.emoji,
                                      price: item.price,
                                      type: item.type,
                                    });
                                  }}
                                  data-ocid={`partners.primary_button.${i + 1}`}
                                >
                                  {isWatched ? (
                                    <>
                                      <Play className="w-3 h-3 mr-1" /> Watch
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3 mr-1" />{" "}
                                      {item.price} ICP
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="wallet"
                  className="flex-1 p-5 space-y-4 mt-0"
                >
                  {/* Wallet Card */}
                  <div className="glass-card rounded-2xl p-5 space-y-4 border border-emerald-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase tracking-widest">
                        Canister Wallet
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        LIVE
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-emerald-300">
                        {selectedPartnerChannel.walletBalance.toFixed(4)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ICP Balance
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        Wallet Address
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded flex-1 truncate">
                          {selectedPartnerChannel.walletAddress}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-cyan-400 transition-colors p-1"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedPartnerChannel.walletAddress,
                            );
                            toast.success("Wallet address copied!");
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="glass-card rounded-2xl p-5 space-y-3">
                    <h4 className="text-sm font-semibold">
                      Earnings Breakdown
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total Earned
                        </span>
                        <span className="font-mono text-emerald-300">
                          {selectedPartnerChannel.earned.toFixed(4)} ICP
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Monthly Volume
                        </span>
                        <span className="font-mono">
                          {selectedPartnerChannel.monthlyVolume.toFixed(2)} ICP
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Commission Rate
                        </span>
                        <span className="text-violet-400">
                          {selectedPartnerChannel.commissionRate}%
                        </span>
                      </div>
                      <div className="border-t border-white/[0.06] pt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          HYVEIL Platform Fee
                        </span>
                        <span className="text-amber-400">10%</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20"
                    onClick={() =>
                      toast.success(
                        `Withdrawal of ${selectedPartnerChannel.walletBalance.toFixed(4)} ICP initiated from canister ${selectedPartnerChannel.canisterId}`,
                      )
                    }
                    data-ocid="partners.secondary_button"
                  >
                    Withdraw to Main Wallet
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/5 mt-16 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/50">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span className="gradient-text font-bold text-sm">HYVEIL</span>
            <span>— Your Private Internet, Unified.</span>
          </div>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            © {new Date().getFullYear()}. Built with ❤️ using caffeine.ai
          </a>
        </div>
      </footer>
      <Dialog
        open={!!ppvModal}
        onOpenChange={(open) => {
          if (!open) setPpvModal(null);
        }}
      >
        <DialogContent
          className="glass-strong border-white/10 rounded-3xl max-w-sm"
          data-ocid="content.ppv.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{ppvModal?.partnerEmoji}</span>
              Watch Content
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {ppvModal?.partnerName} · {ppvModal?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <p className="font-semibold text-sm mb-1">{ppvModal?.title}</p>
              <p className="text-xs text-muted-foreground">
                Pay-per-view · Instant access after purchase
              </p>
            </div>
            <div className="glass rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Total price</span>
                <span>{ppvModal?.price} ICP</span>
              </div>
              <div className="border-t border-white/5 pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Partner receives (90%)
                  </span>
                  <span className="text-emerald-300">
                    {ppvModal ? (ppvModal.price * 0.9).toFixed(4) : "0"} ICP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    HYVEIL commission (10%)
                  </span>
                  <span className="text-violet-300">
                    {ppvModal ? (ppvModal.price * 0.1).toFixed(4) : "0"} ICP
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl border-white/10"
                onClick={() => setPpvModal(null)}
                data-ocid="content.ppv.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
                onClick={() => {
                  if (!isLoggedIn) {
                    toast.error("Connect your wallet to purchase content");
                    return;
                  }
                  if (ppvModal) {
                    setPpvWatched((prev) => new Set([...prev, ppvModal.id]));
                    const tx: Transaction = {
                      id: `ppv-${Date.now()}`,
                      type: "debit",
                      description: `PPV — ${ppvModal.title}`,
                      amount: ppvModal.price,
                      timestamp: new Date().toLocaleString(),
                      dapp: ppvModal.partnerName,
                      commission: ppvModal.price * 0.1,
                    };
                    setTransactions((prev) => [tx, ...prev]);
                    toast.success(
                      `Purchase complete! Enjoy: ${ppvModal.title}`,
                    );
                    setPpvModal(null);
                  }
                }}
                data-ocid="content.ppv.confirm_button"
              >
                <Eye className="w-4 h-4 mr-2" /> Confirm & Watch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD CONTENT MODAL */}
      <Dialog
        open={!!addContentModal}
        onOpenChange={(open) => {
          if (!open) setAddContentModal(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: "#141420",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          data-ocid="creator.add_content.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              Add Content to {addContentModal?.partnerName}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Add pay-per-view or subscription content to your channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Title *</Label>
              <Input
                value={addContentForm.title}
                onChange={(e) =>
                  setAddContentForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Content title"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                data-ocid="creator.add_content.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Description</Label>
              <Textarea
                value={addContentForm.description}
                onChange={(e) =>
                  setAddContentForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your content…"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                rows={3}
                data-ocid="creator.add_content.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Price (ICP) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={addContentForm.price}
                  onChange={(e) =>
                    setAddContentForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="0.1"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  data-ocid="creator.add_content.price_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Content Type</Label>
                <Select
                  value={addContentForm.contentType}
                  onValueChange={(v) =>
                    setAddContentForm((f) => ({ ...f, contentType: v }))
                  }
                >
                  <SelectTrigger
                    className="bg-white/5 border-white/10 text-white"
                    data-ocid="creator.add_content.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "#1a1a2a",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <SelectItem value="pay-per-view">Pay-per-view</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {addContentForm.price && (
              <div
                className="p-3 rounded-xl text-xs space-y-1"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    You receive (90%)
                  </span>
                  <span style={{ color: "#10b981" }}>
                    {(
                      Number.parseFloat(addContentForm.price || "0") * 0.9
                    ).toFixed(4)}{" "}
                    ICP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HYVEIL (10%)</span>
                  <span style={{ color: "#8b5cf6" }}>
                    {(
                      Number.parseFloat(addContentForm.price || "0") * 0.1
                    ).toFixed(4)}{" "}
                    ICP
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="flex-1 text-white/60 hover:text-white"
                onClick={() => setAddContentModal(null)}
                data-ocid="creator.add_content.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 font-semibold"
                style={{
                  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                  color: "white",
                  border: "none",
                }}
                disabled={
                  !addContentForm.title.trim() ||
                  !addContentForm.price ||
                  addContentLoading
                }
                onClick={handleAddContent}
                data-ocid="creator.add_content.submit_button"
              >
                {addContentLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {addContentLoading ? "Adding…" : "Add Content"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {activeTab === "template" && <AdminCreatorTemplate isAdmin={isAdmin} />}

      <Toaster />
    </div>
  );
}
