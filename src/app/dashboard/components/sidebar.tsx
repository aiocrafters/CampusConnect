
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  BookOpenCheck,
  LayoutDashboard,
  Users,
  BookUser,
  School as SchoolIcon,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUser } from "@/firebase";


// This can be expanded later based on user roles from Firestore
const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/admissions", icon: BookOpenCheck, label: "Class Admission" },
  { href: "/dashboard/students", icon: Users, label: "Students" },
  { href: "/dashboard/teachers", icon: BookUser, label: "Teachers" },
  { href: "/dashboard/classes", icon: SchoolIcon, label: "Classes" },
  { href: "/dashboard/sections", icon: Users, label: "Sections" },
  { href: "/dashboard/subjects", icon: BookOpen, label: "Subjects" },
  { href: "/dashboard/exams", icon: ClipboardList, label: "Exams" },
  { href: "/dashboard/reports", icon: FileText, label: "Reports" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  // For now, we assume any logged in user is an admin.
  // This can be expanded with role management.
  const navItems = adminNavItems; 
  
  const userName = user?.displayName || user?.email?.split('@')[0] || "User";
  const userEmail = user?.email || "";
  const avatarFallback = userName.charAt(0).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <BookOpenCheck className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold font-headline text-primary-foreground group-data-[collapsible=icon]:hidden">
            CampusConnect
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <Collapsible>
          <CollapsibleTrigger className="w-full">
             <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent w-full">
              <Avatar className="h-9 w-9">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={userName} />}
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="text-left group-data-[collapsible=icon]:hidden">
                <p className="font-semibold text-sm">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <ChevronDown className="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
            <div className="p-2 pt-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/dashboard/settings">
                                <Settings />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/">
                                <LogOut />
                                <span>Logout</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </SidebarFooter>
    </Sidebar>
  );
}
