"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Certificate = { id: string; name: string; file_url: string | null };

export function CertificateUploader({
  professionalId,
  initialCertificates,
}: {
  professionalId: string;
  initialCertificates: Certificate[];
}) {
  const [certificates, setCertificates] = useState(initialCertificates);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAdd = async () => {
    if (!name.trim()) {
      setError("Vul een naam in (bijv. VCA).");
      return;
    }

    setUploading(true);
    setError(null);

    let fileUrl: string | null = null;
    if (file) {
      const path = `${professionalId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(path, file);

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("certificates").getPublicUrl(path);
      fileUrl = publicUrl;
    }

    const { data: row, error: insertError } = await supabase
      .from("professional_certificates")
      .insert({ professional_id: professionalId, name: name.trim(), file_url: fileUrl })
      .select("id, name, file_url")
      .single();

    if (insertError || !row) {
      setError(insertError?.message ?? "Opslaan mislukt.");
      setUploading(false);
      return;
    }

    setCertificates((prev) => [...prev, row]);
    setName("");
    setFile(null);
    setUploading(false);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("professional_certificates").delete().eq("id", id);
    setCertificates((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  return (
    <div>
      {certificates.length > 0 && (
        <ul className="mb-2 space-y-1">
          {certificates.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-sm text-vak-navy">
              <span>{c.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-500"
              >
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. VCA"
          className="w-32 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-vak-navy outline-none placeholder:text-gray-400"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={uploading}
          className="rounded border border-vak-amber-text px-3 py-1.5 text-xs font-semibold text-vak-amber-text disabled:opacity-60"
        >
          {uploading ? "Bezig…" : "+ Toevoegen"}
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
