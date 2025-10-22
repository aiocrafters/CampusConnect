
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>Admin Page</CardTitle>
                <CardDescription>
                This is the Admin page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Welcome to the admin area. You can add admin-specific content here.</p>
            </CardContent>
        </Card>
    </div>
  );
}
