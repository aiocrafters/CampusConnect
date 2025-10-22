
"use client";

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Teacher, Department } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleCardProps {
  title: string;
  icon: React.ReactNode;
  members: Teacher[];
  isLoading: boolean;
  description?: string;
}

const RoleCard: React.FC<RoleCardProps> = ({ title, icon, members, isLoading, description }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <div className="space-y-3">
           <div className="flex items-center space-x-4">
             <Skeleton className="h-12 w-12 rounded-full" />
             <div className="space-y-2">
               <Skeleton className="h-4 w-[150px]" />
               <Skeleton className="h-4 w-[100px]" />
             </div>
           </div>
         </div>
      ) : members.length > 0 ? (
        <ul className="space-y-3">
          {members.map(member => (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No staff assigned to this category.</p>
      )}
    </CardContent>
  </Card>
);


export default function AssignRolesPage() {
    const { user, firestore } = useFirebase();
    const schoolId = user?.uid;

    const staffQuery = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        return query(collection(firestore, `schools/${schoolId}/staff`));
    }, [firestore, schoolId]);

    const departmentsQuery = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        return query(collection(firestore, `schools/${schoolId}/departments`));
    }, [firestore, schoolId]);

    const { data: staff, isLoading: staffLoading } = useCollection<Teacher>(staffQuery);
    const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsQuery);

    const academicDepartmentIds = useMemo(() => 
        departments?.filter(d => d.type === 'Academic').map(d => d.id) || []
    , [departments]);
    
    const nonAcademicDepartmentIds = useMemo(() =>
        departments?.filter(d => d.type === 'Non-Academic').map(d => d.id) || []
    , [departments]);

    const academicStaff = useMemo(() => 
        staff?.filter(s => s.departmentId && academicDepartmentIds.includes(s.departmentId)) || []
    , [staff, academicDepartmentIds]);

    const nonAcademicStaff = useMemo(() =>
        staff?.filter(s => s.departmentId && nonAcademicDepartmentIds.includes(s.departmentId)) || []
    , [staff, nonAcademicDepartmentIds]);

    const isLoading = staffLoading || departmentsLoading;

  return (
     <main className="grid flex-1 items-start gap-8 sm:px-6 sm:py-0">
        <Card>
            <CardHeader>
                <CardTitle>Staff Roles Overview</CardTitle>
                <CardDescription>
                An overview of staff members based on their department type.
                </CardDescription>
            </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
             <RoleCard 
                title="Academic Staff"
                icon={<GraduationCap className="h-8 w-8 text-primary" />}
                members={academicStaff}
                isLoading={isLoading}
                description="Staff involved in teaching and academic activities."
            />
            <RoleCard 
                title="Non-Academic Staff"
                icon={<Briefcase className="h-8 w-8 text-primary" />}
                members={nonAcademicStaff}
                isLoading={isLoading}
                description="Staff involved in administrative and operational support."
            />
        </div>
     </main>
  );
}
