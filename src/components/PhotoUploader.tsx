"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; photo_url: string };

// Zdjęcia realizacji (ekran 8 checklist + ekran 2 "Realizacje"). Moderacja
// (Google Cloud Vision SafeSearch, punkt 7f specyfikacji) jeszcze nie
// istnieje — na razie zdjęcia są automatycznie "approved" od razu po
// wgraniu (świadomy skrót na start, do zastąpienia prawdziwą moderacją).
export function PhotoUploader({
  professionalId,
  initialPhotos,
}: {
  professionalId: string;
  initialPhotos: Photo[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);

    const path = `${professionalId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("portfolio-photos")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("portfolio-photos").getPublicUrl(path);

    const { data: row, error: insertError } = await supabase
      .from("professional_portfolio_photos")
      .insert({
        professional_id: professionalId,
        photo_url: publicUrl,
        moderation_status: "approved",
      })
      .select("id, photo_url")
      .single();

    if (insertError || !row) {
      setError(insertError?.message ?? "Opslaan mislukt.");
      setUploading(false);
      return;
    }

    setPhotos((prev) => [...prev, row]);
    setUploading(false);
    router.refresh();
  };

  const handleDelete = async (photoId: string) => {
    await supabase.from("professional_portfolio_photos").delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    router.refresh();
  };

  return (
    <div>
      {photos.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative h-16 w-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photo_url}
                alt=""
                className="h-16 w-16 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
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
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded border border-vak-amber-text px-3 py-1.5 text-xs font-semibold text-vak-amber-text disabled:opacity-60"
      >
        {uploading ? "Bezig…" : "+ Foto toevoegen"}
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
