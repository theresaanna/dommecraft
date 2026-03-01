import Link from "next/link";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md";
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

export { getInitials };

export default function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "sm",
}: UserAvatarProps) {
  const sizeClasses = size === "sm" ? "h-8 w-8 text-xs" : "h-16 w-16 text-lg";

  return (
    <Link
      href="/settings"
      className={`${sizeClasses} inline-flex items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-zinc-700 hover:ring-2 hover:ring-zinc-400 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:ring-zinc-500`}
      title="Settings"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || "User avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-medium">{getInitials(name, email)}</span>
      )}
    </Link>
  );
}
