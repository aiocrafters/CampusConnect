"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Building, Mail, Phone, User, Hash } from "lucide-react"

export default function ProfilePage() {
  const { user, firestore } = useFirebase()

  const schoolRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `schools/${user.uid}`);
  }, [user, firestore]);

  const { data: school, isLoading } = useDoc(schoolRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Profile</CardTitle>
        <CardDescription>
          View your school's registered information below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
          </div>
        )}
        {school && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-primary">{school.schoolName}</h2>
            <div className="grid gap-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span><strong>UDISE Code:</strong> {school.udiseCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span><strong>Address:</strong> {school.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span><strong>Contact Email:</strong> {school.contactEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span><strong>Contact Phone:</strong> {school.contactPhoneNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span><strong>Administrator:</strong> {school.adminName}</span>
              </div>
            </div>
          </div>
        )}
        {!isLoading && !school && (
          <p>No school information found. Please contact support.</p>
        )}
      </CardContent>
    </Card>
  )
}
