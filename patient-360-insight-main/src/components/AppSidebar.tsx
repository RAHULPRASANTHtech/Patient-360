import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ClipboardList,
  Archive,
  Receipt,
  LogOut,
  UserPlus,
  UserRound,
  Server // <-- Added the Server icon for Admin
} from "lucide-react";
import { NavLink } from "./NavLink";
import { useAuth } from "@/context/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Added Admin Panel to the master list
const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "AI Intake", url: "/intake", icon: UserPlus },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Appointments", url: "/appointments", icon: CalendarCheck },
  { title: "Clinical Visits", url: "/visits", icon: ClipboardList },
  { title: "MedVault", url: "/medvault", icon: Archive },
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Admin Panel", url: "/admin", icon: Server }, // <-- Admin Route
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { userName, role, logout } = useAuth();
  const navigate = useNavigate();

  // 1. Dynamically rename the "Patients" tab to "My Profile" for patients
  const dynamicNavItems = navItems.map(item => {
    if (role === "patient" && item.title === "Patients") {
      return { ...item, title: "My Profile", icon: UserRound };
    }
    return item;
  });

  // 2. Enterprise Security Gatekeeper
  const filteredNavItems = dynamicNavItems.filter(item => {
    if (role === "patient") {
      return ["Dashboard", "My Profile", "Appointments", "Billing"].includes(item.title);
    }
    if (role === "receptionist") {
      return ["Dashboard", "AI Intake", "Patients", "Appointments", "Billing"].includes(item.title);
    }
    if (role === "doctor" || role === "nurse") {
      return ["Dashboard", "Patients", "Appointments", "Clinical Visits", "MedVault"].includes(item.title);
    }
    if (role === "lab_technician") {
      return ["Dashboard", "Patients", "MedVault"].includes(item.title);
    }
    // Strict Admin Access: Only sees Dashboard and their Admin Panel
    if (role === "admin") {
      return ["Dashboard", "Admin Panel"].includes(item.title);
    }
    return false; 
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="flex items-center gap-2 text-sidebar-primary-foreground font-display text-base">
                <span className="text-lg">🏥</span> Patient 360°
              </span>
            )}
            {collapsed && <span className="text-lg">🏥</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-foreground/70 truncate">{userName}</p>
            <p className="text-xs text-sidebar-primary capitalize">{role?.replace('_', ' ')}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={() => { logout(); navigate("/")}}
          className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}