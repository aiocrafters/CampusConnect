
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useParams } from "next/navigation";

export default function StudentTimelinePage() {
    const { user, firestore } = useFirebase();
    const params = useParams();
    const studentId = params.id as string;

    const studentRef = useMemoFirebase(() => {
        if (!user || !firestore || !studentId) return null;
        return doc(firestore, `schools/${user.uid}/students/${studentId}`);
    }, [user, firestore, studentId]);

    const { data: student, isLoading } = useDoc(studentRef);

    return (
        <Card>
        <CardHeader>
            <CardTitle>Student Timeline: {isLoading ? '...' : student?.fullName}</CardTitle>
            <CardDescription>
            This section is under construction. Here you will be able to view a student's performance and activity timeline.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Coming soon...</p>
        </CardContent>
        </Card>
    );
}

    