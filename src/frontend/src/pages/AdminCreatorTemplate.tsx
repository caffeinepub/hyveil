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
  Heart,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Share2,
  Upload,
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

export function AdminCreatorTemplate({ isAdmin }: Props) {
  const { actor } = useActor();

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
      </div>

      <div className="max-w-2xl mx-auto">
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
                  borderColor: isDragOver ? "#ec4899" : "rgba(255,255,255,0.1)",
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
                  <Upload className="w-5 h-5" style={{ color: "#ec4899" }} />
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
                      if (fileInputRef.current) fileInputRef.current.value = "";
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
            <div
              className="flex flex-col items-center justify-center gap-4"
              style={{ height: "60vh" }}
              data-ocid="creator_template.empty_state"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(236,72,153,0.1)" }}
              >
                <MicOff className="w-7 h-7" style={{ color: "#ec4899" }} />
              </div>
              <div className="text-center">
                <p className="text-white/70 font-medium">No reels yet</p>
                <p className="text-white/30 text-sm mt-1">
                  {isAdmin
                    ? "Upload your first video above"
                    : "Check back soon"}
                </p>
              </div>
            </div>
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
                    background: "linear-gradient(90deg, #10b981, #059669)",
                  }}
                >
                  Creator 90%
                </div>
                <div
                  className="flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    width: "10%",
                    background: "linear-gradient(90deg, #8b5cf6, #7c3aed)",
                  }}
                >
                  10%
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Your earnings per sale</span>
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
                      {(Number.parseFloat(contentPrice || "0") * 0.9).toFixed(
                        4,
                      )}{" "}
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
                      setMonetizationType(c ? "subscription" : "pay-per-view")
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
              pre-configured in every creator channel deployed via HYVEIL. All
              revenue splits are enforced on-chain automatically — no manual
              configuration needed per deployment.
            </p>
          </div>
        </div>
      )}

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
