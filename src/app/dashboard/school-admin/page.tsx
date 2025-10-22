"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookUser, School as SchoolIcon, Users, BookOpenCheck, Building, ClipboardList, Award, FileText } from "lucide-react";
import Link from "next/link";

const adminLinks = [
    { href: "/dashboard/school-admin/staff-management", icon: BookUser, label: "Staff Management" },
    { href: "/dashboard/school-admin/classes-and-sections", icon: SchoolIcon, label: "Classes & Sections" },
    { href: "/dashboard/school-admin/subjects", icon: BookOpenCheck, label: "Subjects" },
    { href: "/dashboard/school-admin/departments", icon: Building, label: "Departments" },
    { href: "/dashboard/school-admin/exams", icon: ClipboardList, label: "Exams" },
    { href: "/dashboard/school-admin/award-sheet", icon: Award, label: "Award Sheet" },
    { href: "/dashboard/school-admin/reports", icon: FileText, label: "Reports" },
]

export default function SchoolAdminPage() {
  return (
    <div className="flex flex-col gap-8">
        <Card>
            <CardHeader>
                <CardTitle>School Administration</CardTitle>
                <CardDescription>
                Manage your school's core settings and academic structure from here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {adminLinks.map((link) => (
                        <Link href={link.href} key={link.href} className="block">
                            <Card className="hover:bg-muted/50 transition-colors h-full">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <link.icon className="h-8 w-8 text-primary" />
                                    <div>
                                        <CardTitle>{link.label}</CardTitle>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
