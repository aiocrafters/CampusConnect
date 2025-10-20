import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { mockStudents, mockTeachers } from "@/lib/mock-data"
import { Users, BookUser, School, ClipboardCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const stats = [
    { title: "Total Students", value: "1,250", icon: Users, change: "+12 since last month" },
    { title: "Total Teachers", value: "85", icon: BookUser, change: "+3 since last month" },
    { title: "Classes", value: "45", icon: School, change: "2 new sections added" },
    { title: "Pending Queries", value: "8", icon: ClipboardCheck, change: "3 new queries" },
]

export default function Dashboard() {
  const recentStudents = mockStudents.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, Admin!</h1>
        <p className="text-muted-foreground">Here's an overview of your school's activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
            <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Recent Student Admissions</CardTitle>
                <CardDescription>A list of the 5 most recently added students.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentStudents.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>{student.class} - {student.section}</TableCell>
                                <TableCell>{student.parentName}</TableCell>
                                <TableCell>
                                    <Badge variant={student.status === 'Active' ? 'default' : 'destructive'} className="bg-green-500 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800 text-white dark:text-white">
                                        {student.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Teacher Overview</CardTitle>
                <CardDescription>A summary of teachers and their class assignments.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Contact</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockTeachers.slice(0, 5).map((teacher) => (
                            <TableRow key={teacher.id}>
                                <TableCell className="font-medium">{teacher.name}</TableCell>
                                <TableCell>{teacher.contact}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
