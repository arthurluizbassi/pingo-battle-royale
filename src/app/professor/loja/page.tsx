import { Card } from "@/components/ui/Card";
import { ALL_ITEMS, buildFromItems } from "@/content/items";
import { powerScore } from "@/engine";
import type { ClassRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { getCurrentRotation } from "@/server/shop";
import { ShopAdmin } from "./ShopAdmin";
import { Icon } from "@/components/pixel/Icon";

export default async function ShopAdminPage() {
  const session = await requireTeacher();
  const supabase = await createClient();
  const [rotation, { data: klass }] = await Promise.all([
    getCurrentRotation(session.profile.class_id),
    supabase.from("classes").select("*").eq("id", session.profile.class_id).single<ClassRow>(),
  ]);
  const powers = Object.fromEntries(
    ALL_ITEMS.map((item) => {
      const b = buildFromItems([item]);
      return [item.id, powerScore(b.stats, b.effects)];
    }),
  );

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl"><Icon name="cart" /> Loja e catálogo</h1>
      <Card title="Rotação atual">
        <p className="text-sm text-muted mb-2">
          {rotation
            ? `${rotation.mode === "auto" ? "Automática" : "Manual"} · desde ${formatDateTime(rotation.starts_at)}${
                rotation.ends_at ? ` · troca em ${formatDateTime(rotation.ends_at)}` : " · sem data de troca"
              }`
            : "Nenhuma rotação ativa."}
        </p>
        {klass && (
          <ShopAdmin
            settings={{ rotationDays: klass.shop_rotation_days, perCategory: klass.shop_items_per_category, autoRotate: klass.shop_auto_rotate }}
            currentIds={rotation?.item_ids ?? []}
            powers={powers}
          />
        )}
      </Card>
    </div>
  );
}
