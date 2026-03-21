import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ScheduleSetup } from "@/components/ScheduleSetup";
import { ReminderSettings } from "@/components/ReminderSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadScheduleState, saveScheduleState } from "@/lib/schedule-storage";
import { cancelAllReminders } from "@/lib/notification-scheduler";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ScheduleManager() {
  const navigate = useNavigate();
  const [scheduleState, setScheduleState] = useState(loadScheduleState());

  const handleResetSchedule = async () => {
    await cancelAllReminders();
    saveScheduleState({
      schedule: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
      },
      reminderSettings: scheduleState.reminderSettings,
      setupCompleted: false,
      setupSkipped: false,
    });
    toast.success("Schedule reset successfully");
    setScheduleState(loadScheduleState());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">School Schedule & Book Reminder</h1>
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="schedule" className="text-base">
              Weekly Schedule
            </TabsTrigger>
            <TabsTrigger value="reminders" className="text-base">
              Reminder Times
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <ScheduleSetup
              onComplete={() => {
                toast.success("Schedule updated!");
                setScheduleState(loadScheduleState());
              }}
              onSkip={() => navigate(-1)}
              initialSchedule={scheduleState.schedule}
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12 text-base">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Reset Entire Schedule
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    This will delete all your subjects and turn off all reminders. You'll need to set everything up again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-base">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetSchedule} className="text-base">
                    Reset Schedule
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="reminders">
            <ReminderSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
