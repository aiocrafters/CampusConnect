
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenCheck,
  LayoutDashboard,
  Users,
  BookUser,
  School as SchoolIcon,
  ClipboardList,
  FileText,
  Menu,
  PlusCircle,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { UserNav } from "./user-nav"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/new-admission", icon: PlusCircle, label: "New Admission" },
  { href: "/dashboard/admissions", icon: BookOpenCheck, label: "Class Admission" },
  { href: "/dashboard/students", icon: Users, label: "Students" },
  { href: "/dashboard/teachers", icon: BookUser, label: "Teachers" },
  { href: "/dashboard/classes", icon: SchoolIcon, label: "Classes" },
  { href: "/dashboard/sections", icon: Users, label: "Sections" },
  { href: "/dashboard/subjects", icon: BookOpenCheck, label: "Subjects" },
  { href: "/dashboard/exams", icon: ClipboardList, label: "Exams" },
  { href: "/dashboard/reports", icon: FileText, label: "Reports" },
];

export function DashboardHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="sr-only">CampusConnect</span>
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 transition-colors hover:text-foreground whitespace-nowrap",
              pathname === item.href ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <BookOpenCheck className="h-6 w-6 text-primary" />
              <span >CampusConnect</span>
            </Link>
            {navItems.map((item) => (
               <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 transition-colors hover:text-foreground",
                   pathname === item.href ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <UserNav />
      </div>
    </header>
  )
}
