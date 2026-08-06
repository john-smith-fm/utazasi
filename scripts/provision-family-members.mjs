import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const membersValue = process.env.SUPABASE_FAMILY_MEMBERS;
const tripSlug = process.env.SUPABASE_TRIP_SLUG ?? "sardinia-family-2026";

if (!url || !secretKey || !membersValue) {
  throw new Error(
    "Provisioning requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY), and SUPABASE_FAMILY_MEMBERS.",
  );
}

const members = membersValue.split(",").map((value) => {
  const [email, role] = value.trim().split(":");
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("SUPABASE_FAMILY_MEMBERS contains an invalid e-mail address.");
  }
  if (role !== "owner" && role !== "member") {
    throw new Error("Each SUPABASE_FAMILY_MEMBERS entry must end in :owner or :member.");
  }
  return { email: normalizedEmail, role };
});

if (members.filter(({ role }) => role === "owner").length !== 1) {
  throw new Error("Exactly one owner is required in SUPABASE_FAMILY_MEMBERS.");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: trip, error: tripError } = await supabase
  .from("trips")
  .select("id")
  .eq("slug", tripSlug)
  .single();
if (tripError) throw tripError;

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

for (const member of members) {
  let user = await findUserByEmail(member.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: member.email,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }

  if (!user) throw new Error(`Could not provision ${member.email}.`);

  const { error } = await supabase
    .from("trip_members")
    .upsert(
      {
        trip_id: trip.id,
        email: member.email,
        user_id: user.id,
        role: member.role,
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "trip_id,email_normalized" },
    );
  if (error) throw error;
}

console.log(`Provisioned ${members.length} family member(s) for ${tripSlug}.`);
