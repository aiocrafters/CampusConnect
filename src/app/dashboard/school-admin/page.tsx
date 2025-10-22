
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SchoolAdminPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>School Admin</CardTitle>
                <CardDescription>
                This is the School Admin page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Welcome to the school admin area. You can add school admin-specific content here.</p>
            </CardContent>
        </Card>
    </div>
  );
}
