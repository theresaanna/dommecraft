export default function RoleBadge({ role }: { role: "DOMME" | "SUB" }) {
  const isDomme = role === "DOMME";
  return (
    <span
      data-testid="role-badge"
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
        isDomme
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
          : "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
      }`}
    >
      {isDomme ? "Domme" : "sub"}
    </span>
  );
}
