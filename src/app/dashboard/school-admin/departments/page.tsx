"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DepartmentsPage() {
  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
            <CardTitle>Departments & Offices</CardTitle>
            <CardDescription>
              Manage academic and non-academic departments and their sub-departments.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p>This page is ready for new functionality.</p>
        </CardContent>
      </Card>
    </main>
  );
}
