
"use client";

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Teacher, ClassSection } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building, User, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleCardProps {
  title: string;
  icon: React.ReactNode;
  members: Teacher[];
  isLoading: boolean;
  description?: string;
  isSectionIncharge?: boolean;
  sections?: ClassSection[];
}

const RoleCard: React.FC<RoleCardProps> = ({ title, icon, members, isLoading, description, isSectionIncharge = false, sections = [] }) => (
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
          {members.map(member => {
            const assignedSection = isSectionIncharge ? sections.find(s => s.sectionInchargeId === member.id) : null;
            return (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.email}
                    {isSectionIncharge && assignedSection && ` | Class ${assignedSection.className}-${assignedSection.sectionIdentifier}`}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No staff assigned to this role.</p>
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

    const sectionsQuery = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        return query(collection(firestore, `schools/${schoolId}/classSections`), where('sectionInchargeId', '!=', ''));
    }, [firestore, schoolId]);

    const { data: staff, isLoading: staffLoading } = useCollection<Teacher>(staffQuery);
    const { data: sections, isLoading: sectionsLoading } = useCollection<ClassSection>(sectionsQuery);
    
    const principal = useMemo(() => staff?.filter(s => s.role.toLowerCase().includes('principal')) || [], [staff]);
    const accountants = useMemo(() => staff?.filter(s => s.role.toLowerCase().includes('accountant')) || [], [staff]);
    
    const sectionInchargeIds = useMemo(() => sections?.map(s => s.sectionInchargeId) || [], [sections]);
    const sectionIncharges = useMemo(() => staff?.filter(s => s.id && sectionInchargeIds.includes(s.id)) || [], [staff, sectionInchargeIds]);
    
    const isLoading = staffLoading || sectionsLoading;

  return (
     <main className="grid flex-1 items-start gap-8 sm:px-6 sm:py-0">
        <Card>
            <CardHeader>
                <CardTitle>Assign Roles</CardTitle>
                <CardDescription>
                An overview of staff members assigned to key school roles.
                </CardDescription>
            </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <RoleCard 
                title="Principal"
                icon={<User className="h-8 w-8 text-primary" />}
                members={principal}
                isLoading={isLoading}
                description="The head administrator of the school."
            />
            <RoleCard 
                title="Accountants"
                icon={<Building className="h-8 w-8 text-primary" />}
                members={accountants}
                isLoading={isLoading}
                description="Staff responsible for financial management."
            />
            <RoleCard 
                title="Section In-charges"
                icon={<Users className="h-8 w-8 text-primary" />}
                members={sectionIncharges}
                isLoading={isLoading}
                description="Teachers responsible for specific class sections."
                isSectionIncharge={true}
                sections={sections || []}
            />
        </div>
     </main>
  );
}
