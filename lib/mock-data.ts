export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  role: string;
  type: "Full-time" | "Contract" | "Intern";
  status: "Active" | "Suspended" | "Resigned";
  avatarInitials?: string;
  location?: string;
  personalEmail?: string;
  mobilePhone?: string;
  mailingAddress?: string;
  joinedDate?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  emergencyContacts?: EmergencyContact[];
  keySkills?: string[];
  availableTimeOffDays?: number;
  performanceRating?: string;
}

export const employees: Employee[] = [
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    email: "sarah.j@hrconnect.ai",
    employeeId: "EMP-2041",
    department: "Engineering",
    role: "Senior Frontend Lead",
    type: "Full-time",
    status: "Active",
  },
  {
    id: "david-chen",
    name: "David Chen",
    email: "d.chen@hrconnect.ai",
    employeeId: "EMP-1192",
    department: "Product",
    role: "Product Manager",
    type: "Contract",
    status: "Suspended",
  },
  {
    id: "elena-rodriguez",
    name: "Elena Rodriguez",
    email: "elena.r@hrconnect.ai",
    employeeId: "EMP-3045",
    department: "Marketing",
    role: "SEO Specialist",
    type: "Full-time",
    status: "Active",
  },
  {
    id: "marcus-thorne",
    name: "Marcus Thorne",
    email: "m.thorne@hrconnect.ai",
    employeeId: "EMP-0941",
    department: "Legal",
    role: "General Counsel",
    type: "Full-time",
    status: "Resigned",
  },
  {
    id: "jameson-doe",
    name: "Jameson Doe",
    email: "j.doe@hrconnect.ai",
    employeeId: "EMP-4482",
    department: "Sales",
    role: "Account Executive",
    type: "Full-time",
    status: "Active",
    avatarInitials: "JD",
  },

  {
    id: "marcus-holloway",
    name: "Marcus Holloway",
    email: "m.holloway@hrconnect.com",
    employeeId: "EMP-5021",
    department: "Engineering",
    role: "Senior Software Engineer",
    type: "Full-time",
    status: "Active",
    location: "Seattle, WA (Remote)",
    personalEmail: "marcus.h@gmail.com",
    mobilePhone: "+1 (206) 555-0192",
    mailingAddress: "1248 Northgate Dr, Seattle, WA 98125",
    joinedDate: "October 2021",
    dateOfBirth: "June 14, 1992",
    gender: "Male",
    emergencyContacts: [
      {
        name: "Elena Holloway",
        relationship: "Spouse",
        phone: "+1 (206) 555-0144",
      },
      {
        name: "Robert Holloway",
        relationship: "Father",
        phone: "+1 (415) 555-0298",
      },
    ],
    keySkills: [
      "Node.js",
      "React",
      "PostgreSQL",
      "AWS",
      "System Design",
      "Mentoring",
    ],
    availableTimeOffDays: 18.5,
    performanceRating: "Exceeds",
  },
];

export interface LeaveRequest {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
}
export const leaveRequests: LeaveRequest[] = [
  {
    id: "lr-1",
    employeeName: "Elena Rodriguez",
    leaveType: "Annual Leave",
    startDate: "2023-10-12",
    endDate: "2023-10-15",
    status: "Pending",
  },
  {
    id: "lr-2",
    employeeName: "Marcus Chen",
    leaveType: "Sick Leave",
    startDate: "2023-10-05",
    endDate: "2023-10-06",
    status: "Approved",
  },
  {
    id: "lr-3",
    employeeName: "Sarah Jenkins",
    leaveType: "Maternity Leave",
    startDate: "2023-11-01",
    endDate: "2024-01-30",
    status: "Cancelled",
  },
  {
    id: "lr-4",
    employeeName: "David Wilson",
    leaveType: "Annual Leave",
    startDate: "2023-09-28",
    endDate: "2023-09-30",
    status: "Rejected",
  },
];
