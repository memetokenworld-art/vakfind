import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OrderForm } from "@/components/OrderForm";

export default async function NewOrderPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .not("parent_id", "is", null)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="px-6 py-14">
        <OrderForm categories={categories ?? []} />
      </div>
      <Footer />
    </div>
  );
}
