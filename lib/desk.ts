import { readyDatabase, db } from "@/db/client";
import { loadInvestigation } from "@/lib/intake";
import { seedIfEmpty } from "@/lib/seed/apply.ts";

export async function openBook() {
  await readyDatabase();
  await seedIfEmpty(db);
  return loadInvestigation();
}
