
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy } from "firebase/firestore";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import type { Student, StudentTimelineEvent } from "@/lib/types";
import { ScrollText } from "lucide-react";

export default function StudentTimelinePage() {
    const { user, firestore } = useFirebase();
    const params = useParams();
    const studentId = params.id as string;

    const studentRef = useMemoFirebase(() => {
        if (!user || !firestore || !studentId) return null;
        return doc(firestore, `schools/${user.uid}/students/${studentId}`);
    }, [user, firestore, studentId]);

    const timelineQuery = useMemoFirebase(() => {
        if (!user || !firestore || !studentId) return null;
        return query(collection(firestore, `schools/${user.uid}/students/${studentId}/timeline`), orderBy("timestamp", "desc"));
    }, [user, firestore, studentId]);

    const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);
    const { data: timelineEvents, isLoading: timelineLoading } = useCollection<StudentTimelineEvent>(timelineQuery);

    const isLoading = studentLoading || timelineLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Student Timeline: {studentLoading ? '...' : student?.fullName}</CardTitle>
                <CardDescription>
                    An overview of the student's academic journey and important events.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p>Loading timeline...</p>
                ) : (
                    <div className="relative pl-6">
                        {/* Vertical line */}
                        <div className="absolute left-[34px] h-full w-0.5 bg-border -translate-x-1/2"></div>
                        
                        <div className="space-y-8">
                            {timelineEvents && timelineEvents.length > 0 ? (
                                timelineEvents.map((event) => (
                                <div key={event.id} className="relative flex items-start">
                                    <div className="flex-shrink-0 w-16 text-right pr-6">
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(event.timestamp), 'dd MMM yyyy')}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 z-10">
                                        <div className="w-4 h-4 rounded-full bg-primary mt-1"></div>
                                    </div>
                                    <div className="ml-6 flex-1">
                                        <div className="flex items-center gap-2">
                                            <ScrollText className="w-5 h-5 text-primary" />
                                            <h4 className="font-semibold">{event.type}</h4>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                                    </div>
                                </div>
                                ))
                            ) : (
                                <p>No timeline events found for this student.</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
