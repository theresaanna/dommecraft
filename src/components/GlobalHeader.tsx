"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUnreadChats } from "@/components/providers/notification-provider";
import ChatDrawer from "@/components/ChatDrawer";
import UserAvatar from "@/components/UserAvatar";

const QUICK_ACTIONS = [
  { href: "/subs/new", label: "Add Sub" },
  { href: "/financials/new", label: "New Send" },
  { href: "/tasks/new", label: "New Sub Task" },
  { href: "/calendar/new", label: "New Event" },
];

type HubProject = {
  id: string;
  name: string;
};

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-3.5 w-3.5 transition-transform ${className}`}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function GlobalHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { unreadChatCount, unreadCount } = useUnreadChats();
  const [chatOpen, setChatOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hubProjects, setHubProjects] = useState<HubProject[]>([]);
  const [hubProjectsExpanded, setHubProjectsExpanded] = useState(false);
  const [hubProjectsLoaded, setHubProjectsLoaded] = useState(false);

  const subsRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const newRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    if (!activeDropdown) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        (subsRef.current && subsRef.current.contains(target)) ||
        (hubRef.current && hubRef.current.contains(target)) ||
        (newRef.current && newRef.current.contains(target))
      ) {
        return;
      }
      setActiveDropdown(null);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeDropdown]);

  // Fetch hub projects when hub dropdown opens
  useEffect(() => {
    if (activeDropdown === "hub" && !hubProjectsLoaded) {
      fetch("/api/hub/projects")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setHubProjects(
              data.map((p: { id: string; name: string }) => ({
                id: p.id,
                name: p.name,
              }))
            );
          }
          setHubProjectsLoaded(true);
        })
        .catch(() => {});
    }
  }, [activeDropdown, hubProjectsLoaded]);

  // Reset hub projects expanded when hub dropdown closes
  useEffect(() => {
    if (activeDropdown !== "hub") {
      setHubProjectsExpanded(false);
    }
  }, [activeDropdown]);

  // Don't render on auth pages or if not logged in
  if (!session?.user?.id) return null;

  const isDomme = session.user.role === "DOMME";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function toggleDropdown(name: string) {
    setActiveDropdown((prev) => (prev === name ? null : name));
  }

  function closeDropdown() {
    setActiveDropdown(null);
  }

  function closeMobile() {
    setMobileMenuOpen(false);
  }

  const navLinkClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
    }`;

  const dropdownItemClass =
    "block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800";

  const dropdownMenuClass =
    "absolute left-0 mt-1 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Left: Brand + Nav */}
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-base font-bold text-zinc-900 dark:text-zinc-50"
              >
                DommeCraft
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                {/* Discover (subs) / Gallery (dommes) */}
                <Link
                  href="/discover"
                  className={navLinkClass(isActive("/discover"))}
                >
                  {isDomme ? "Domme Gallery" : "Discover"}
                </Link>

                {/* Divider */}
                <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

                {isDomme ? (
                  <>
                    {/* Subs dropdown */}
                    <div ref={subsRef} className="relative">
                      <button
                        onClick={() => toggleDropdown("subs")}
                        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          isActive("/subs") || isActive("/tasks")
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                        }`}
                      >
                        Subs
                        <ChevronDown />
                      </button>
                      {activeDropdown === "subs" && (
                        <div className={`${dropdownMenuClass} w-44`}>
                          <Link
                            href="/tasks"
                            onClick={closeDropdown}
                            className={dropdownItemClass}
                          >
                            Tasks
                          </Link>
                          <Link
                            href="/subs"
                            onClick={closeDropdown}
                            className={dropdownItemClass}
                          >
                            List Subs
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

                    {/* Financials */}
                    <Link
                      href="/financials"
                      className={navLinkClass(isActive("/financials"))}
                    >
                      Financials
                    </Link>

                    {/* Calendar */}
                    <Link
                      href="/calendar"
                      className={navLinkClass(isActive("/calendar"))}
                    >
                      Calendar
                    </Link>

                    {/* Hub dropdown */}
                    <div ref={hubRef} className="relative">
                      <button
                        onClick={() => toggleDropdown("hub")}
                        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          isActive("/hub")
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                        }`}
                      >
                        Hub
                        <ChevronDown />
                      </button>
                      {activeDropdown === "hub" && (
                        <div className={`${dropdownMenuClass} w-52`}>
                          <Link
                            href="/hub"
                            onClick={closeDropdown}
                            className={dropdownItemClass}
                          >
                            See Projects
                          </Link>
                          <Link
                            href="/hub/projects/new"
                            onClick={closeDropdown}
                            className={dropdownItemClass}
                          >
                            Add Project
                          </Link>
                          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                          <button
                            onClick={() =>
                              setHubProjectsExpanded(!hubProjectsExpanded)
                            }
                            className="flex w-full items-center justify-between px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Projects
                            <ChevronDown
                              className={
                                hubProjectsExpanded ? "rotate-180" : ""
                              }
                            />
                          </button>
                          {hubProjectsExpanded && (
                            <div className="max-h-48 overflow-y-auto">
                              {hubProjects.length === 0 ? (
                                <span className="block px-6 py-2 text-sm text-zinc-400 dark:text-zinc-500">
                                  No projects yet
                                </span>
                              ) : (
                                hubProjects.map((project) => (
                                  <Link
                                    key={project.id}
                                    href={`/hub/projects/${project.id}`}
                                    onClick={closeDropdown}
                                    className="block truncate px-6 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                  >
                                    {project.name}
                                  </Link>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Subs just see Tasks */
                  <Link
                    href="/my-tasks"
                    className={navLinkClass(isActive("/my-tasks"))}
                  >
                    Tasks
                  </Link>
                )}
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* New button with dropdown (Domme only) */}
              {isDomme && (
                <div ref={newRef} className="relative hidden md:block">
                  <button
                    onClick={() => toggleDropdown("new")}
                    className="flex h-9 items-center gap-1 rounded-md bg-zinc-800 px-3 text-sm font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    New
                  </button>
                  {activeDropdown === "new" && (
                    <div className="absolute right-0 mt-1 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                      {QUICK_ACTIONS.map((action) => (
                        <Link
                          key={action.href}
                          href={action.href}
                          onClick={closeDropdown}
                          className={dropdownItemClass}
                        >
                          {action.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notifications */}
              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                title="Notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.573 1.23H3.705a.75.75 0 0 1-.573-1.23A8.973 8.973 0 0 0 5.25 9.75V9ZM8.159 18.753a.75.75 0 0 1 .932.518 2.91 2.91 0 0 0 5.818 0 .75.75 0 1 1 1.45.388 4.41 4.41 0 0 1-8.7 0 .75.75 0 0 1 .5-.906Z"
                    clipRule="evenodd"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Chat toggle */}
              <button
                onClick={() => setChatOpen(true)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-md ${
                  unreadChatCount > 0
                    ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                }`}
                title="Chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                {unreadChatCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </button>

              {/* User avatar */}
              <UserAvatar
                name={session.user.name}
                email={session.user.email}
                avatarUrl={session.user.avatarUrl}
              />

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                title="Menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 pb-3 pt-2 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
            <nav className="flex flex-col gap-1">
              {/* Discover / Gallery */}
              <Link
                href="/discover"
                onClick={closeMobile}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive("/discover")
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {isDomme ? "Domme Gallery" : "Discover"}
              </Link>

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

              {isDomme ? (
                <>
                  {/* Subs section */}
                  <Link
                    href="/tasks"
                    onClick={closeMobile}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      isActive("/tasks")
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    Tasks
                  </Link>
                  <Link
                    href="/subs"
                    onClick={closeMobile}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      isActive("/subs")
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    List Subs
                  </Link>

                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Domme-only links */}
                  <Link
                    href="/financials"
                    onClick={closeMobile}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      isActive("/financials")
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    Financials
                  </Link>
                  <Link
                    href="/calendar"
                    onClick={closeMobile}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      isActive("/calendar")
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    Calendar
                  </Link>
                  <Link
                    href="/hub"
                    onClick={closeMobile}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      isActive("/hub")
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    Hub
                  </Link>

                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Quick actions */}
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={closeMobile}
                      className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    >
                      + {action.label}
                    </Link>
                  ))}
                </>
              ) : (
                <Link
                  href="/my-tasks"
                  onClick={closeMobile}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    isActive("/my-tasks")
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                >
                  Tasks
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
