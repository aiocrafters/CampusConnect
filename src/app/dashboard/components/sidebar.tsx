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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockUser } from "@/lib/mock-data";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/students", icon: Users, label: "Students" },
  { href: "/dashboard/teachers", icon: BookUser, label: "Teachers" },
  { href: "/dashboard/classes", icon: SchoolIcon, label: "Classes" },
  { href: "/dashboard/exams", icon: ClipboardList, label: "Exams" },
  { href: "/dashboard/reports", icon: FileText, label: "Reports" },
];

const teacherNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/my-classes", icon: SchoolIcon, label: "My Classes" },
  { href: "/dashboard/marks", icon: ClipboardList, label: "Enter Marks" },
];

const studentNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/my-marks", icon: FileText, label: "My Marks" },
    { href: "/dashboard/my-profile", icon: Users, label: "My Profile" },
];

const getNavItems = (role: string) => {
    switch(role) {
        case 'admin': return adminNavItems;
        case 'teacher': return teacherNavItems;
        case 'student': return studentNavItems;
        default: return [];
    }
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const navItems = getNavItems(mockUser.role);

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
                <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} />
                <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-left group-data-[collapsible=icon]:hidden">
                <p className="font-semibold text-sm">{mockUser.name}</p>
                <p className="text-xs text-muted-foreground">{mockUser.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
            <div className="p-2 pt-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="#">
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
