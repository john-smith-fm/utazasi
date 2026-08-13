import { redirect } from "next/navigation";

export default function BeachesPage() {
  redirect("/places?category=beaches");
}
