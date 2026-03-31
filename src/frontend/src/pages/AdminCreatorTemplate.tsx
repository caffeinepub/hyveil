import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { HttpAgent } from "@icp-sdk/core/agent";
import {
  BarChart3,
  Heart,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Share2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VideoMeta } from "../backend.d";
import { loadConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { StorageClient } from "../utils/StorageClient";

interface Props {
  isAdmin: boolean;
}

interface LocalVideo extends VideoMeta {
  url?: string;
}

type TemplateTab = "reels" | "transactions" | "followers" | "performance";

function timeAgo(ts: bigint): string {
  const diffMs = Date.now() - Number(ts);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function truncatePrincipal(p: string): string {
  if (p.length <= 12) return p;
  return `${p.slice(0, 5)}...${p.slice(-4)}`;
}

function fmtDate(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TRANSACTIONS = [
  {
    buyer: "2vxsx-fae",
    content: "Morning Workout Vol.1",
    amount: 0.5,
    creatorShare: 0.45,
    hyveilCut: 0.05,
    daysAgo: 1,
  },
  {
    buyer: "rdmx6-jaaaa",
    content: "City Life Ep.3",
    amount: 1.2,
    creatorShare: 1.08,
    hyveilCut: 0.12,
    daysAgo: 2,
  },
  {
    buyer: "aaaaa-aa",
    content: "Sunset Vibes",
    amount: 0.8,
    creatorShare: 0.72,
    hyveilCut: 0.08,
    daysAgo: 3,
  },
  {
    buyer: "rrkah-fqaaa",
    content: "Tech Talk #5",
    amount: 2.0,
    creatorShare: 1.8,
    hyveilCut: 0.2,
    daysAgo: 4,
  },
  {
    buyer: "qoctq-giaaa",
    content: "Morning Workout Vol.2",
    amount: 0.5,
    creatorShare: 0.45,
    hyveilCut: 0.05,
    daysAgo: 5,
  },
  {
    buyer: "gvbup-yiaaa",
    content: "Street Art Tour",
    amount: 1.5,
    creatorShare: 1.35,
    hyveilCut: 0.15,
    daysAgo: 7,
  },
  {
    buyer: "2vxsx-fae",
    content: "Night Run",
    amount: 0.75,
    creatorShare: 0.675,
    hyveilCut: 0.075,
    daysAgo: 9,
  },
  {
    buyer: "rdmx6-jaaaa",
    content: "City Life Ep.4",
    amount: 1.2,
    creatorShare: 1.08,
    hyveilCut: 0.12,
    daysAgo: 12,
  },
  {
    buyer: "aaaaa-aa",
    content: "Cooking at Home",
    amount: 0.6,
    creatorShare: 0.54,
    hyveilCut: 0.06,
    daysAgo: 15,
  },
  {
    buyer: "rrkah-fqaaa",
    content: "Tech Talk #6",
    amount: 2.0,
    creatorShare: 1.8,
    hyveilCut: 0.2,
    daysAgo: 18,
  },
  {
    buyer: "qoctq-giaaa",
    content: "Sunset Vibes",
    amount: 0.8,
    creatorShare: 0.72,
    hyveilCut: 0.08,
    daysAgo: 22,
  },
  {
    buyer: "gvbup-yiaaa",
    content: "Morning Workout Vol.3",
    amount: 0.5,
    creatorShare: 0.45,
    hyveilCut: 0.05,
    daysAgo: 28,
  },
];

const MOCK_FOLLOWERS = [
  { principal: "2vxsx-fae", initials: "AK", followDate: 2, subscribed: true },
  {
    principal: "rdmx6-jaaaa",
    initials: "BL",
    followDate: 5,
    subscribed: false,
  },
  { principal: "aaaaa-aa", initials: "CM", followDate: 7, subscribed: true },
  {
    principal: "rrkah-fqaaa",
    initials: "DN",
    followDate: 10,
    subscribed: false,
  },
  {
    principal: "qoctq-giaaa",
    initials: "EO",
    followDate: 12,
    subscribed: true,
  },
  {
    principal: "gvbup-yiaaa",
    initials: "FP",
    followDate: 14,
    subscribed: false,
  },
  {
    principal: "uc7f6-gqaaa",
    initials: "GQ",
    followDate: 16,
    subscribed: true,
  },
  {
    principal: "5o66p-52aaa",
    initials: "HR",
    followDate: 19,
    subscribed: false,
  },
  {
    principal: "b77ix-aaaaa",
    initials: "IS",
    followDate: 21,
    subscribed: true,
  },
  {
    principal: "4m3sz-75aaa",
    initials: "JT",
    followDate: 24,
    subscribed: false,
  },
  {
    principal: "mf7ya-ziaaa",
    initials: "KU",
    followDate: 26,
    subscribed: true,
  },
  {
    principal: "g4xu5-kaaa",
    initials: "LV",
    followDate: 29,
    subscribed: false,
  },
  { principal: "nns01-yaaa", initials: "MW", followDate: 32, subscribed: true },
  {
    principal: "oeee4-qaaaa",
    initials: "NX",
    followDate: 35,
    subscribed: false,
  },
  {
    principal: "3e3x2-8aaaa",
    initials: "OY",
    followDate: 38,
    subscribed: true,
  },
];

const WEEKLY_VIEWS = [
  { day: "Mon", views: 1240 },
  { day: "Tue", views: 980 },
  { day: "Wed", views: 1580 },
  { day: "Thu", views: 2100 },
  { day: "Fri", views: 1870 },
  { day: "Sat", views: 3200 },
  { day: "Sun", views: 2750 },
];

const TOP_CONTENT = [
  {
    title: "Morning Workout Vol.1",
    views: 8240,
    revenue: 4.12,
    engagement: 78,
  },
  { title: "City Life Ep.3", views: 6510, revenue: 7.8, engagement: 65 },
  { title: "Sunset Vibes", views: 5830, revenue: 4.66, engagement: 72 },
  { title: "Tech Talk #5", views: 4920, revenue: 9.84, engagement: 81 },
  { title: "Night Run", views: 3740, revenue: 2.81, engagement: 69 },
  { title: "Street Art Tour", views: 3120, revenue: 4.68, engagement: 74 },
  { title: "Cooking at Home", views: 2880, revenue: 1.73, engagement: 58 },
];

const maxWeeklyViews = Math.max(...WEEKLY_VIEWS.map((w) => w.views));

export function AdminCreatorTemplate({ isAdmin }: Props) {
  const { actor } = useActor();

  const [activeTemplateTab, setActiveTemplateTab] =
    useState<TemplateTab>("reels");

  const [videos, setVideos] = useState<LocalVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [globalMuted, setGlobalMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [monetizationType, setMonetizationType] = useState<
    "pay-per-view" | "subscription"
  >("pay-per-view");
  const [contentPrice, setContentPrice] = useState("0.5");

  const resolveUrl = useCallback(async (blobId: string): Promise<string> => {
    const config = await loadConfig();
    return `${config.storage_gateway_url}/v1/blob/?blob_hash=${encodeURIComponent(blobId)}&owner_id=${encodeURIComponent(config.backend_canister_id)}&project_id=${encodeURIComponent(config.project_id)}`;
  }, []);

  useEffect(() => {
    if (!actor) return;
    setLoadingVideos(true);
    actor
      .getVideos()
      .then(async (raw) => {
        const withUrls = await Promise.all(
          raw.map(async (v) => {
            let url: string | undefined;
            try {
              url = await resolveUrl(v.blobId);
            } catch {
              url = undefined;
            }
            return { ...v, url };
          }),
        );
        setVideos(withUrls.reverse());
      })
      .catch(() => toast.error("Failed to load videos"))
      .finally(() => setLoadingVideos(false));
  }, [actor, resolveUrl]);

  // IntersectionObserver for autoplay
  useEffect(() => {
    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.6 },
    );
    observerRef.current = observer;
    for (const v of videoRefs.current) {
      if (v) observer.observe(v);
    }
    return () => observer.disconnect();
  });

  useEffect(() => {
    for (const v of videoRefs.current) {
      if (v) v.muted = globalMuted;
    }
  }, [globalMuted]);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.match(/video\/(mp4|webm)/)) {
      toast.error("Only .mp4 and .webm files are supported");
      return;
    }
    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile || !actor || !title.trim()) {
      toast.error("Please select a video and enter a title");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const config = await loadConfig();
      const agent = new HttpAgent({
        host: config.backend_host || "https://ic0.app",
      });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(() => {});
      }
      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
      const bytes = new Uint8Array(await uploadFile.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes, (pct) =>
        setUploadProgress(pct),
      );
      const id = `vid-${Date.now()}`;
      const meta: VideoMeta = {
        id,
        title: title.trim(),
        caption: caption.trim(),
        blobId: hash,
        uploadedAt: BigInt(Date.now()),
        likes: 0n,
        comments: [],
      };
      await actor.saveVideoMeta(meta);
      const url = await resolveUrl(hash);
      setVideos((prev) => [{ ...meta, url }, ...prev]);
      setTitle("");
      setCaption("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Video uploaded and published!");
    } catch (err) {
      toast.error(
        `Upload failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleLike = async (videoId: string) => {
    if (!actor) return;
    setLikedIds((prev) => new Set([...prev, videoId]));
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, likes: v.likes + 1n } : v)),
    );
    try {
      await actor.likeVideo(videoId);
    } catch {
      setLikedIds((prev) => {
        const n = new Set(prev);
        n.delete(videoId);
        return n;
      });
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, likes: v.likes - 1n } : v)),
      );
    }
  };

  const handleComment = async () => {
    if (!actor || !activeVideoId || !commentText.trim()) return;
    setSubmittingComment(true);
    const text = commentText.trim();
    try {
      await actor.addComment(activeVideoId, text);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === activeVideoId
            ? {
                ...v,
                comments: [
                  ...v.comments,
                  {
                    text,
                    author: { toString: () => "You" } as any,
                    createdAt: BigInt(Date.now()),
                  },
                ],
              }
            : v,
        ),
      );
      setCommentText("");
      toast.success("Comment added!");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const activeVideo = videos.find((v) => v.id === activeVideoId);

  // Computed transaction stats
  const totalRevenue = MOCK_TRANSACTIONS.reduce((s, t) => s + t.amount, 0);
  const totalCreatorShare = MOCK_TRANSACTIONS.reduce(
    (s, t) => s + t.creatorShare,
    0,
  );
  const totalHyveilCut = MOCK_TRANSACTIONS.reduce((s, t) => s + t.hyveilCut, 0);

  const tabStyles = (tab: TemplateTab) => ({
    padding: "6px 16px",
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s",
    background:
      activeTemplateTab === tab
        ? "linear-gradient(135deg, #ec4899, #8b5cf6)"
        : "rgba(255,255,255,0.06)",
    color: activeTemplateTab === tab ? "white" : "rgba(255,255,255,0.5)",
  });

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0a0a0a" }}
      data-ocid="creator_template.page"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              }}
            >
              <Mic className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-wide">
              HYVEIL Creator
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "rgba(139,92,246,0.2)",
                color: "#a78bfa",
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              Template Preview
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white gap-1.5"
            onClick={() => setGlobalMuted((m) => !m)}
            data-ocid="creator_template.toggle"
          >
            {globalMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span className="text-xs">
              {globalMuted ? "Unmute All" : "Mute All"}
            </span>
          </Button>
        </div>

        {/* Sub-tab navigation */}
        <div
          className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {(
            [
              {
                id: "reels" as TemplateTab,
                label: "Reels",
                icon: <Mic className="w-3.5 h-3.5" />,
              },
              {
                id: "transactions" as TemplateTab,
                label: "Transactions",
                icon: <TrendingUp className="w-3.5 h-3.5" />,
              },
              {
                id: "followers" as TemplateTab,
                label: "Followers",
                icon: <Users className="w-3.5 h-3.5" />,
              },
              {
                id: "performance" as TemplateTab,
                label: "Performance",
                icon: <BarChart3 className="w-3.5 h-3.5" />,
              },
            ] as { id: TemplateTab; label: string; icon: React.ReactNode }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={tabStyles(tab.id)}
              onClick={() => setActiveTemplateTab(tab.id)}
              data-ocid={`creator_template.${tab.id}.tab`}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* ── REELS TAB ─────────────────────────────────────────────────── */}
        {activeTemplateTab === "reels" && (
          <>
            {/* Upload — Admin Only */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-6"
                data-ocid="creator_template.panel"
              >
                <div
                  className="rounded-2xl p-5 space-y-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Upload className="w-4 h-4" style={{ color: "#ec4899" }} />
                    <h2 className="text-sm font-semibold text-white">
                      Upload Short Video
                    </h2>
                  </div>

                  {/* Drop Zone */}
                  <label
                    className="relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-10"
                    style={{
                      borderColor: isDragOver
                        ? "#ec4899"
                        : "rgba(255,255,255,0.1)",
                      background: isDragOver
                        ? "rgba(236,72,153,0.06)"
                        : "rgba(255,255,255,0.02)",
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      handleFileSelect(e.dataTransfer.files[0] ?? null);
                    }}
                    data-ocid="creator_template.dropzone"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(e.target.files?.[0] ?? null)
                      }
                    />
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(236,72,153,0.15)" }}
                    >
                      <Upload
                        className="w-5 h-5"
                        style={{ color: "#ec4899" }}
                      />
                    </div>
                    {uploadFile ? (
                      <div className="text-center">
                        <p className="text-white text-sm font-medium">
                          {uploadFile.name}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-white/60 text-sm">
                          Drop your video here
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">
                          .mp4 or .webm · short clips only
                        </p>
                      </div>
                    )}
                    {uploadFile && (
                      <button
                        type="button"
                        className="absolute top-3 right-3 text-white/40 hover:text-white/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </label>

                  {/* Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-white/60 text-xs">Title *</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter video title"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                        data-ocid="creator_template.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white/60 text-xs">Caption</Label>
                      <Input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption…"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                        data-ocid="creator_template.textarea"
                      />
                    </div>
                  </div>

                  {/* Progress */}
                  <AnimatePresence>
                    {uploading && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5"
                        data-ocid="creator_template.loading_state"
                      >
                        <div className="flex justify-between text-xs text-white/50">
                          <span>Uploading to ICP Storage…</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress
                          value={uploadProgress}
                          className="h-1.5"
                          style={{ background: "rgba(255,255,255,0.07)" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    disabled={!uploadFile || !title.trim() || uploading}
                    onClick={handleUpload}
                    className="w-full font-semibold"
                    style={{
                      background: uploading
                        ? "rgba(236,72,153,0.3)"
                        : "linear-gradient(135deg, #ec4899, #8b5cf6)",
                      color: "white",
                      border: "none",
                    }}
                    data-ocid="creator_template.upload_button"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" /> Publish Video
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Reel Feed */}
            <div
              style={{
                scrollSnapType: "y mandatory",
                overflowY: "auto",
                height: isAdmin ? "calc(100vh - 100px)" : "calc(100vh - 56px)",
              }}
            >
              {loadingVideos ? (
                <div
                  className="flex flex-col items-center justify-center gap-3"
                  style={{ height: "60vh" }}
                  data-ocid="creator_template.loading_state"
                >
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: "#ec4899" }}
                  />
                  <p className="text-white/40 text-sm">Loading reels…</p>
                </div>
              ) : videos.length === 0 ? (
                // Mock reel cards for demo — disappear once real videos are uploaded
                <>
                  {[
                    {
                      seed: "workout",
                      title: "Morning Workout 🔥",
                      likes: "1.2K",
                      comments: "89",
                    },
                    {
                      seed: "city",
                      title: "City Life After Dark 🌆",
                      likes: "3.4K",
                      comments: "214",
                    },
                    {
                      seed: "sunset",
                      title: "Sunset Vibes ✨",
                      likes: "2.1K",
                      comments: "156",
                    },
                    {
                      seed: "art",
                      title: "Street Art Tour 🎨",
                      likes: "987",
                      comments: "73",
                    },
                    {
                      seed: "tech",
                      title: "Tech Talk with ICP 💻",
                      likes: "4.7K",
                      comments: "331",
                    },
                  ].map((mock, idx) => (
                    <div
                      key={mock.seed}
                      style={{
                        scrollSnapAlign: "start",
                        height: "100vh",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#0a0a0a",
                      }}
                      data-ocid={`creator_template.item.${idx + 1}`}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 420,
                          height: "100%",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Poster image */}
                        <img
                          src={`https://picsum.photos/seed/${mock.seed}/400/700`}
                          alt={mock.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        {/* Gradient overlay */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)",
                            pointerEvents: "none",
                          }}
                        />
                        {/* Demo badge */}
                        <div
                          style={{
                            position: "absolute",
                            top: 16,
                            left: 16,
                            background: "rgba(236,72,153,0.25)",
                            border: "1px solid rgba(236,72,153,0.5)",
                            borderRadius: 8,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#f9a8d4",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          Demo Content
                        </div>
                        {/* Title */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: 80,
                            left: 16,
                            right: 80,
                          }}
                        >
                          <p
                            style={{
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 16,
                              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                            }}
                          >
                            {mock.title}
                          </p>
                        </div>
                        {/* Action buttons */}
                        <div
                          style={{
                            position: "absolute",
                            right: 12,
                            bottom: 80,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 20,
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Heart
                              style={{
                                color: "#fff",
                                width: 28,
                                height: 28,
                                filter:
                                  "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
                              }}
                            />
                            <span
                              style={{
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {mock.likes}
                            </span>
                          </button>
                          <button
                            type="button"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <MessageCircle
                              style={{
                                color: "#fff",
                                width: 28,
                                height: 28,
                                filter:
                                  "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
                              }}
                            />
                            <span
                              style={{
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {mock.comments}
                            </span>
                          </button>
                          <button
                            type="button"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Share2
                              style={{
                                color: "#fff",
                                width: 28,
                                height: 28,
                                filter:
                                  "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
                              }}
                            />
                            <span
                              style={{
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              Share
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                videos.map((video, idx) => (
                  <ReelCard
                    key={video.id}
                    video={video}
                    index={idx}
                    globalMuted={globalMuted}
                    liked={likedIds.has(video.id)}
                    onLike={() => handleLike(video.id)}
                    onComment={() => {
                      setActiveVideoId(video.id);
                      setCommentSheetOpen(true);
                    }}
                    onShare={() => {
                      navigator.clipboard
                        .writeText(window.location.href)
                        .then(() => toast.success("Link copied!"));
                    }}
                    onToggleMute={() => setGlobalMuted((m) => !m)}
                    videoRef={(el) => {
                      videoRefs.current[idx] = el;
                    }}
                  />
                ))
              )}
            </div>

            {/* Monetization Settings — Admin Only */}
            {isAdmin && (
              <div
                className="px-4 py-6"
                data-ocid="creator_template.monetization.panel"
              >
                <div
                  className="rounded-2xl p-5 space-y-5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(139,92,246,0.2)" }}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{ color: "#8b5cf6" }}
                      >
                        %
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-white">
                      Monetization Settings
                    </h2>
                    <Badge
                      className="ml-auto text-xs"
                      style={{
                        background: "rgba(139,92,246,0.2)",
                        color: "#a78bfa",
                        border: "1px solid rgba(139,92,246,0.3)",
                      }}
                    >
                      Pre-configured in all deployed channels
                    </Badge>
                  </div>

                  {/* Revenue split visualization */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                      Revenue Split
                    </p>
                    <div className="flex rounded-xl overflow-hidden h-8">
                      <div
                        className="flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          width: "90%",
                          background:
                            "linear-gradient(90deg, #10b981, #059669)",
                        }}
                      >
                        Creator 90%
                      </div>
                      <div
                        className="flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          width: "10%",
                          background:
                            "linear-gradient(90deg, #8b5cf6, #7c3aed)",
                        }}
                      >
                        10%
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">
                        Your earnings per sale
                      </span>
                      <span style={{ color: "#8b5cf6" }}>HYVEIL earns 10%</span>
                    </div>
                  </div>

                  {/* Price and type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-white/60 text-xs">
                        Default Content Price (ICP)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={contentPrice}
                        onChange={(e) => setContentPrice(e.target.value)}
                        placeholder="0.5"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                        data-ocid="creator_template.price_input"
                      />
                      {contentPrice && (
                        <p className="text-xs text-white/30">
                          You'd earn:{" "}
                          <span style={{ color: "#10b981" }}>
                            {(
                              Number.parseFloat(contentPrice || "0") * 0.9
                            ).toFixed(4)}{" "}
                            ICP
                          </span>{" "}
                          per purchase
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white/60 text-xs">
                        Default Monetization Model
                      </Label>
                      <div
                        className="flex items-center gap-3 h-9 px-3 rounded-md"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <span
                          className={`text-xs font-medium ${monetizationType === "pay-per-view" ? "text-white" : "text-white/40"}`}
                        >
                          Pay-per-view
                        </span>
                        <Switch
                          checked={monetizationType === "subscription"}
                          onCheckedChange={(c) =>
                            setMonetizationType(
                              c ? "subscription" : "pay-per-view",
                            )
                          }
                          data-ocid="creator_template.monetization.switch"
                        />
                        <span
                          className={`text-xs font-medium ${monetizationType === "subscription" ? "text-white" : "text-white/40"}`}
                        >
                          Subscription
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-white/30 leading-relaxed">
                    This monetization model and pricing structure will be
                    pre-configured in every creator channel deployed via HYVEIL.
                    All revenue splits are enforced on-chain automatically — no
                    manual configuration needed per deployment.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TRANSACTIONS TAB ──────────────────────────────────────────── */}
        {activeTemplateTab === "transactions" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-6 space-y-6"
            data-ocid="creator_template.transactions.panel"
          >
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Revenue",
                  value: `${totalRevenue.toFixed(3)} ICP`,
                  color: "#f9a825",
                  bg: "rgba(249,168,37,0.1)",
                },
                {
                  label: "Your 90% Share",
                  value: `${totalCreatorShare.toFixed(3)} ICP`,
                  color: "#10b981",
                  bg: "rgba(16,185,129,0.1)",
                },
                {
                  label: "Platform 10%",
                  value: `${totalHyveilCut.toFixed(3)} ICP`,
                  color: "#8b5cf6",
                  bg: "rgba(139,92,246,0.1)",
                },
                {
                  label: "Total Purchases",
                  value: MOCK_TRANSACTIONS.length.toString(),
                  color: "#ec4899",
                  bg: "rgba(236,72,153,0.1)",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-4"
                  style={{
                    background: stat.bg,
                    border: `1px solid ${stat.color}30`,
                  }}
                >
                  <p className="text-xs text-white/50 mb-1">{stat.label}</p>
                  <p
                    className="text-base font-bold"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Transactions table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <h3 className="text-sm font-semibold text-white">
                  Transaction History
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  All purchases from this channel
                </p>
              </div>
              <div className="overflow-x-auto">
                <div style={{ overflowY: "auto", maxHeight: 420 }}>
                  <table className="w-full text-sm">
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "rgba(10,10,10,0.95)",
                        zIndex: 1,
                      }}
                    >
                      <tr
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {[
                          "Buyer",
                          "Content",
                          "Amount",
                          "Creator Share",
                          "HYVEIL Cut",
                          "Time",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-medium"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_TRANSACTIONS.map((tx, i) => (
                        <tr
                          key={`${tx.buyer}-${i}`}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                          data-ocid={`creator_template.transactions.row.item.${i + 1}`}
                        >
                          <td className="px-4 py-3">
                            <span
                              className="font-mono text-xs"
                              style={{ color: "#a78bfa" }}
                            >
                              {truncatePrincipal(tx.buyer)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white text-xs max-w-[140px] truncate">
                            {tx.content}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="font-mono text-xs"
                              style={{ color: "#f9a825" }}
                            >
                              {tx.amount.toFixed(2)} ICP
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="font-mono text-xs"
                              style={{ color: "#10b981" }}
                            >
                              {tx.creatorShare.toFixed(3)} ICP
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="font-mono text-xs"
                              style={{ color: "#8b5cf6" }}
                            >
                              {tx.hyveilCut.toFixed(3)} ICP
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 text-xs"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {fmtDate(tx.daysAgo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── FOLLOWERS TAB ─────────────────────────────────────────────── */}
        {activeTemplateTab === "followers" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-6 space-y-6"
            data-ocid="creator_template.followers.panel"
          >
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <Users
                  className="w-5 h-5 mx-auto mb-2"
                  style={{ color: "#8b5cf6" }}
                />
                <p className="text-2xl font-bold text-white">
                  {MOCK_FOLLOWERS.length}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Total Followers
                </p>
              </div>
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <TrendingUp
                  className="w-5 h-5 mx-auto mb-2"
                  style={{ color: "#10b981" }}
                />
                <p className="text-2xl font-bold" style={{ color: "#10b981" }}>
                  +4
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  New This Week
                </p>
              </div>
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.2)",
                }}
              >
                <UserCheck
                  className="w-5 h-5 mx-auto mb-2"
                  style={{ color: "#f9a825" }}
                />
                <p className="text-2xl font-bold" style={{ color: "#f9a825" }}>
                  {Math.round(
                    (MOCK_FOLLOWERS.filter((f) => f.subscribed).length /
                      MOCK_FOLLOWERS.length) *
                      100,
                  )}
                  %
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Subscription Rate
                </p>
              </div>
            </div>

            {/* Follower list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <h3 className="text-sm font-semibold text-white">
                  Follower List
                </h3>
              </div>
              <div style={{ overflowY: "auto", maxHeight: 480 }}>
                {MOCK_FOLLOWERS.map((f, i) => (
                  <div
                    key={f.principal}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    data-ocid={`creator_template.followers.row.item.${i + 1}`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{
                        background: `linear-gradient(135deg, hsl(${(i * 47) % 360}deg 60% 50%), hsl(${(i * 47 + 120) % 360}deg 60% 40%))`,
                      }}
                    >
                      {f.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-white/70 truncate">
                        {truncatePrincipal(f.principal)}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        Followed {fmtDate(f.followDate)}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0"
                      style={{
                        background: f.subscribed
                          ? "rgba(251,191,36,0.15)"
                          : "rgba(255,255,255,0.06)",
                        color: f.subscribed
                          ? "#f9a825"
                          : "rgba(255,255,255,0.35)",
                        border: `1px solid ${f.subscribed ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {f.subscribed ? "Subscriber" : "Free"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PERFORMANCE TAB ───────────────────────────────────────────── */}
        {activeTemplateTab === "performance" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-6 space-y-6"
            data-ocid="creator_template.performance.panel"
          >
            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Total Views",
                  value: "31,240",
                  sub: "All content combined",
                  color: "#8b5cf6",
                  bg: "rgba(139,92,246,0.1)",
                },
                {
                  label: "Avg Watch Time",
                  value: "1m 42s",
                  sub: "Per video",
                  color: "#10b981",
                  bg: "rgba(16,185,129,0.1)",
                },
                {
                  label: "Engagement Rate",
                  value: "71.8%",
                  sub: "Likes + comments / views",
                  color: "#ec4899",
                  bg: "rgba(236,72,153,0.1)",
                },
                {
                  label: "Revenue This Month",
                  value: "7.55 ICP",
                  sub: "Your 90% share",
                  color: "#f9a825",
                  bg: "rgba(249,168,37,0.1)",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl p-4"
                  style={{ background: m.bg, border: `1px solid ${m.color}30` }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {m.label}
                  </p>
                  <p className="text-xl font-bold" style={{ color: m.color }}>
                    {m.value}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    {m.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Weekly views bar chart */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                <h3 className="text-sm font-semibold text-white">
                  Views — Last 7 Days
                </h3>
              </div>
              <div className="flex items-end gap-2 h-36">
                {WEEKLY_VIEWS.map((w) => (
                  <div
                    key={w.day}
                    className="flex-1 flex flex-col items-center gap-1.5"
                  >
                    <span
                      className="text-xs font-mono"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {w.views >= 1000
                        ? `${(w.views / 1000).toFixed(1)}k`
                        : w.views}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${(w.views / maxWeeklyViews) * 100}px`,
                        background:
                          w.day === "Sat" || w.day === "Sun"
                            ? "linear-gradient(180deg, #ec4899, #8b5cf6)"
                            : "rgba(139,92,246,0.5)",
                        minHeight: 6,
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {w.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top content table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <h3 className="text-sm font-semibold text-white">
                  Top Performing Content
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {["#", "Title", "Views", "Revenue", "Engagement"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-medium"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_CONTENT.map((c, i) => (
                      <tr
                        key={c.title}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                        data-ocid={`creator_template.performance.row.item.${i + 1}`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              background:
                                i === 0
                                  ? "rgba(249,168,37,0.2)"
                                  : "rgba(255,255,255,0.06)",
                              color:
                                i === 0 ? "#f9a825" : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white text-xs max-w-[160px] truncate">
                          {c.title}
                        </td>
                        <td
                          className="px-4 py-3 text-xs font-mono"
                          style={{ color: "#8b5cf6" }}
                        >
                          {c.views.toLocaleString()}
                        </td>
                        <td
                          className="px-4 py-3 text-xs font-mono"
                          style={{ color: "#10b981" }}
                        >
                          {c.revenue.toFixed(2)} ICP
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: 48,
                                background: "rgba(255,255,255,0.08)",
                              }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${c.engagement}%`,
                                  background:
                                    "linear-gradient(90deg, #ec4899, #8b5cf6)",
                                }}
                              />
                            </div>
                            <span
                              className="text-xs"
                              style={{ color: "#ec4899" }}
                            >
                              {c.engagement}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Comments Sheet */}
      <Sheet open={commentSheetOpen} onOpenChange={setCommentSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t-0 p-0"
          style={{ background: "#141414", maxHeight: "70vh" }}
          data-ocid="creator_template.sheet"
        >
          <SheetHeader
            className="px-5 pt-5 pb-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <SheetTitle className="text-white text-base">
              Comments ({activeVideo?.comments.length ?? 0})
            </SheetTitle>
          </SheetHeader>
          <div
            className="overflow-y-auto px-5 py-3 space-y-4"
            style={{ maxHeight: "calc(70vh - 140px)" }}
          >
            {activeVideo?.comments.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-6">
                No comments yet. Be first!
              </p>
            ) : (
              (activeVideo?.comments ?? []).map((c, i) => (
                <div
                  key={`${c.createdAt}-${i}`}
                  className="flex gap-3 items-start"
                  data-ocid={`creator_template.row.item.${i + 1}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                    }}
                  >
                    {truncatePrincipal(c.author.toString())
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white/70 text-xs font-medium">
                        {truncatePrincipal(c.author.toString())}
                      </span>
                      <span className="text-white/30 text-xs">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-white/90 text-sm mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div
            className="px-5 py-4 flex gap-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
              data-ocid="creator_template.input"
            />
            <Button
              size="sm"
              disabled={!commentText.trim() || submittingComment}
              onClick={handleComment}
              style={{
                background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                color: "white",
                border: "none",
              }}
              data-ocid="creator_template.submit_button"
            >
              {submittingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── ReelCard ─────────────────────────────────────────────────────────────────

interface ReelCardProps {
  video: LocalVideo;
  index: number;
  globalMuted: boolean;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleMute: () => void;
  videoRef: (el: HTMLVideoElement | null) => void;
}

function ReelCard({
  video,
  index,
  globalMuted,
  liked,
  onLike,
  onComment,
  onShare,
  onToggleMute,
  videoRef,
}: ReelCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const internalRef = useRef<HTMLVideoElement | null>(null);

  const setRef = (el: HTMLVideoElement | null) => {
    internalRef.current = el;
    videoRef(el);
  };

  const togglePlay = () => {
    const v = internalRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  return (
    <div
      style={{
        scrollSnapAlign: "start",
        height: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
      data-ocid={`creator_template.item.${index + 1}`}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {video.url ? (
          // biome-ignore lint/a11y/useMediaCaption: user-uploaded reels
          // biome-ignore lint/a11y/useKeyWithClickEvents: video tap to play
          <video
            ref={setRef}
            src={video.url}
            loop
            playsInline
            muted={globalMuted}
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              cursor: "pointer",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #1a0a1e, #0a0a1a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="text-center text-white/20">
              <div className="text-4xl mb-2">🎬</div>
              <p className="text-xs">Video unavailable</p>
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 120,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Play indicator */}
        <AnimatePresence>
          {!isPlaying && video.url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="white"
                  aria-hidden="true"
                >
                  <title>Play</title>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom-left info */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 16,
            right: 80,
            zIndex: 10,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: "bold",
                color: "white",
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            >
              H
            </div>
            <span
              style={{
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}
            >
              HYVEIL Template
            </span>
          </div>
          <h3
            style={{
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 4,
              textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              lineHeight: 1.3,
            }}
          >
            {video.title}
          </h3>
          {video.caption && (
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                lineHeight: 1.4,
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {video.caption}
            </p>
          )}
        </div>

        {/* Right action bar */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            right: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            zIndex: 10,
          }}
        >
          <ActionButton
            icon={
              <Heart
                className="w-6 h-6"
                fill={liked ? "#ec4899" : "none"}
                style={{ color: liked ? "#ec4899" : "white" }}
              />
            }
            label={video.likes.toString()}
            onClick={onLike}
            ocid={`creator_template.toggle.${index + 1}`}
          />
          <ActionButton
            icon={<MessageCircle className="w-6 h-6 text-white" />}
            label={video.comments.length.toString()}
            onClick={onComment}
            ocid={`creator_template.button.${index + 1}`}
          />
          <ActionButton
            icon={<Share2 className="w-6 h-6 text-white" />}
            label="Share"
            onClick={onShare}
            ocid={`creator_template.secondary_button.${index + 1}`}
          />
          <ActionButton
            icon={
              globalMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )
            }
            label={globalMuted ? "Muted" : "Sound"}
            onClick={onToggleMute}
            ocid="creator_template.toggle"
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  ocid,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  ocid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={ocid}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <span
        style={{
          color: "rgba(255,255,255,0.8)",
          fontSize: 11,
          fontWeight: 600,
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
