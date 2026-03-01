import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InviteCodeButton from "./InviteCodeButton";

export default async function SubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const sub = await prisma.subProfile.findUnique({
    where: { id, userId: session.user.id },
    include: {
      linkedUser: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          badges: true,
          mediaItems: true,
          ratings: true,
          behaviorScores: true,
          contracts: true,
          tasks: true,
        },
      },
    },
  });

  if (!sub) {
    redirect("/subs");
  }

  return (
    <div className="space-y-8">
      {/* Account Linking */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Account Link
        </h2>
        {sub.linkedUser ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Linked to{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {sub.linkedUser.name || sub.linkedUser.email || "Sub account"}
            </span>
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Not linked to a sub account yet. Generate an invite code for your
              sub to link their account.
            </p>
            <InviteCodeButton subId={sub.id} existingCode={sub.inviteCode} />
          </div>
        )}
      </section>

      {/* Main Fields */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Details
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact Info" value={sub.contactInfo} />
          <Field label="Timezone" value={sub.timezone} />
          <Field
            label="Arrangement Type"
            value={sub.arrangementType.join(", ")}
          />
          <Field label="Sub Type" value={sub.subType.join(", ")} />
        </dl>
      </section>

      {/* Limits */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Limits
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TagField label="Soft Limits" values={sub.softLimits} />
          <TagField label="Hard Limits" values={sub.hardLimits} />
        </dl>
      </section>

      {/* Advanced */}
      <details className="group">
        <summary className="cursor-pointer text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Advanced
        </summary>
        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Birthday"
            value={sub.birthday?.toLocaleDateString()}
          />
          <Field label="Country" value={sub.country} />
          <Field label="Occupation" value={sub.occupation} />
          <Field label="Work Schedule" value={sub.workSchedule} />
          <Field label="Financial Limits" value={sub.financialLimits} />
          <Field label="Expendable Income" value={sub.expendableIncome} />
          <TagField label="Preferences" values={sub.preferences} />
        </dl>
        <dl className="mt-4 space-y-4">
          <TextField label="Best Experiences" value={sub.bestExperiences} />
          <TextField label="Worst Experiences" value={sub.worstExperiences} />
          <TextField label="Personality Notes" value={sub.personalityNotes} />
          <TextField label="Health Notes" value={sub.healthNotes} />
          <TextField
            label="Obedience History"
            value={sub.obedienceHistory}
          />
        </dl>
      </details>

      {/* Tags & Notes */}
      {(sub.tags.length > 0 || sub.privateNotes) && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Notes & Tags
          </h2>
          {sub.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {sub.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {sub.privateNotes && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
              {sub.privateNotes}
            </p>
          )}
        </section>
      )}

      {/* Linked Sections Summary */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Linked Data
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <CountCard label="Badges" count={sub._count.badges} />
          <CountCard label="Media" count={sub._count.mediaItems} />
          <CountCard label="Ratings" count={sub._count.ratings} />
          <CountCard label="Behavior Scores" count={sub._count.behaviorScores} />
          <CountCard label="Contracts" count={sub._count.contracts} />
          <CountCard label="Tasks" count={sub._count.tasks} />
        </dl>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
        {value || "—"}
      </dd>
    </div>
  );
}

function TagField({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 flex flex-wrap gap-1">
        {values.length > 0 ? (
          values.map((v) => (
            <span
              key={v}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {v}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-400">—</span>
        )}
      </dd>
    </div>
  );
}

function TextField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
        {value || "—"}
      </dd>
    </div>
  );
}

function CountCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {count}
      </dd>
    </div>
  );
}
