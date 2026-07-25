"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PortfolioExtensionButton } from "@/components/PortfolioExtensionButton";

type Video = { id: string; video_url: string };

const MAX_DURATION_SECONDS = 60;

// Filmiki realizacji (plan sekcja 7, freemium): max 1 minuta/filmik, 3
// gratis / 10 met actieve portfolio-uitbreiding (KROK 15/16). Duur wordt
// clientside gecontroleerd via het <video>-element vóór upload — er is
// geen serverside mediaverwerking, dus dit is bewust "vertrouwen op de
// browser", net als de auto-approve moderatie bij foto's.
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Video kon niet worden gelezen."));
    };
    video.src = URL.createObjectURL(file);
  });
}

export function VideoUploader({
  professionalId,
  initialVideos,
  limit,
}: {
  professionalId: string;
  initialVideos: Video[];
  limit: number;
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const limitReached = videos.length >= limit;

  const handleFile = async (file: File) => {
    if (videos.length >= limit) return;
    setUploading(true);
    setError(null);

    let duration: number;
    try {
      duration = await readVideoDuration(file);
    } catch {
      setError("Video kon niet worden gelezen.");
      setUploading(false);
      return;
    }

    if (duration > MAX_DURATION_SECONDS) {
      setError(`Video is te lang (max ${MAX_DURATION_SECONDS} seconden).`);
      setUploading(false);
      return;
    }

    const path = `${professionalId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("portfolio-videos")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("portfolio-videos").getPublicUrl(path);

    const { data: row, error: insertError } = await supabase
      .from("professional_portfolio_videos")
      .insert({
        professional_id: professionalId,
        video_url: publicUrl,
        duration_seconds: Math.round(duration),
        moderation_status: "approved",
      })
      .select("id, video_url")
      .single();

    if (insertError || !row) {
      setError(insertError?.message ?? "Opslaan mislukt.");
      setUploading(false);
      return;
    }

    setVideos((prev) => [...prev, row]);
    setUploading(false);
    router.refresh();
  };

  const handleDelete = async (videoId: string) => {
    await supabase.from("professional_portfolio_videos").delete().eq("id", videoId);
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    router.refresh();
  };

  return (
    <div>
      {videos.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {videos.map((v) => (
            <div key={v.id} className="group relative h-16 w-28">
              <video src={v.video_url} className="h-16 w-28 rounded object-cover" muted />
              <button
                type="button"
                onClick={() => handleDelete(v.id)}
                className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-red-500 shadow group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {limitReached ? (
        <div>
          <p className="text-xs text-gray-500">
            Limiet bereikt ({videos.length}/{limit} video&apos;s).
          </p>
          <div className="mt-1.5">
            <PortfolioExtensionButton />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded border border-vak-amber-text px-3 py-1.5 text-xs font-semibold text-vak-amber-text disabled:opacity-60"
        >
          {uploading
            ? "Bezig…"
            : `+ Video toevoegen (${videos.length}/${limit}, max 1 min)`}
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
