
"use client";

import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Teacher, Department, Designation } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, Briefcase, Hash, Shield, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface RoleCardProps {
  title: string;
  icon: React.ReactNode;
  members: Teacher[];
  isLoading: boolean;
  getDepartmentName: (id?: string) => string;
  getDesignationName: (id?: string) => string;
  description?: string;
}

const RoleCard: React.FC<RoleCardProps> = ({ title, icon, members, isLoading, getDepartmentName, getDesignationName, description }) => (
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
         <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                </div>
            ))}
         </div>
      ) : members.length > 0 ? (
        <ul className="space-y-4">
          {members.map((member, index) => (
              <li key={member.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-start gap-4">
                    <Avatar className="mt-1">
                        <AvatarImage />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1.5 text-sm">
                        <p className="font-semibold text-base">{member.name}</p>
                        <p className="text-muted-foreground">{member.email}</p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Hash className="h-3.5 w-3.5" />
                            <span className="font-mono text-xs">{member.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Shield className="h-3.5 w-3.5" />
                            <span>{getDesignationName(member.designationId)}</span>
                        </div>
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{getDepartmentName(member.departmentId)}</span>
                        </div>
                    </div>
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
    
    const designationsQuery = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        return query(collection(firestore, `schools/${schoolId}/designations`));
    }, [firestore, schoolId]);

    const { data: staff, isLoading: staffLoading } = useCollection<Teacher>(staffQuery);
    const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsQuery);
    const { data: designations, isLoading: designationsLoading } = useCollection<Designation>(designationsQuery);
    
    const getDepartmentName = (id?: string) => {
        if (!id || !departments) return 'Not Assigned';
        return departments.find(d => d.id === id)?.name || 'Not Assigned';
    }

    const getDesignationName = (id?: string) => {
        if (!id || !designations) return 'Not Assigned';
        return designations.find(d => d.id === id)?.name || 'Not Assigned';
    }

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

    const isLoading = staffLoading || departmentsLoading || designationsLoading;

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

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
             <RoleCard 
                title="Academic Staff"
                icon={<GraduationCap className="h-8 w-8 text-primary" />}
                members={academicStaff}
                isLoading={isLoading}
                getDepartmentName={getDepartmentName}
                getDesignationName={getDesignationName}
                description="Staff involved in teaching and academic activities."
            />
            <RoleCard 
                title="Non-Academic Staff"
                icon={<Briefcase className="h-8 w-8 text-primary" />}
                members={nonAcademicStaff}
                isLoading={isLoading}
                getDepartmentName={getDepartmentName}
                getDesignationName={getDesignationName}
                description="Staff involved in administrative and operational support."
            />
        </div>
     </main>
  );
}
