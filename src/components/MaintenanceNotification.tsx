"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { usePathname } from "next/navigation";

export default function MaintenanceNotification() {
  const pathname = usePathname();

  useEffect(() => {
    // Function to check maintenance status
    const checkMaintenanceStatus = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_API_BASE_URL_WARNINGS_FOR_BUSINESS!;
        const response = await axios.get(url);
        const {
          isWarning,
          scheduledMaintenanceTime,
        } = response.data;

        if (isWarning) {

          // Calculate remaining minutes
          const now = new Date();
          const scheduled = new Date(scheduledMaintenanceTime);
          const diffMs = scheduled.getTime() - now.getTime();
          const diffMinutes = Math.floor(diffMs / (1000 * 60));

          // Show toast notification for partner routes
          // Since this component is only included in the partner layout,
          // we don't need to check if it's a partner route anymore
          if (diffMinutes > 0) {
            showMaintenanceToast(diffMinutes);
          }
        }
      } catch (error) {
        console.error("Failed to check maintenance status:", error);
      }
    };

    // Check immediately and then every minute
    checkMaintenanceStatus();
    const intervalId = setInterval(checkMaintenanceStatus, 60000);

    return () => clearInterval(intervalId);
  }, [pathname]);

  // Function to show toast notification
  const showMaintenanceToast = (minutes: number) => {
    if (minutes <= 0) return;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    let timeMessage = "";
    if (hours > 0) {
      timeMessage += `${hours} hour${hours !== 1 ? "s" : ""}`;
      if (mins > 0) timeMessage += " and ";
    }
    if (mins > 0 || hours === 0) {
      timeMessage += `${mins} minute${mins !== 1 ? "s" : ""}`;
    }

    toast(
      (t) => (
        <div className="flex items-start">
          <div className="ml-3">
            <p className="font-medium">Scheduled Maintenance</p>
            <p className="text-sm">
              The system will be down for maintenance in {timeMessage}.
            </p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="ml-4 text-gray-400 hover:text-gray-500"
          >
            ✕
          </button>
        </div>
      ),
      {
        duration: 10000,
        style: {
          borderLeft: "4px solid #f59e0b",
          padding: "16px",
        },
      }
    );
  };

  // This component doesn't render anything visible
  return null;
}
