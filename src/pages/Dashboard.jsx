import DashboardHeader from "@/components/dashboard/DashboardHeader";
import WeatherCard from "@/components/dashboard/WeatherCard";
import TodayTasks from "@/components/dashboard/TodayTasks";
import FieldsOverview from "@/components/dashboard/FieldsOverview";
import RainOutlook from "@/components/dashboard/RainOutlook";
import NasaData from "@/components/dashboard/NasaData";
import Recommendations from "@/components/dashboard/Recommendations";
import RecentConversations from "@/components/dashboard/RecentConversations";
import FarmPlan from "@/components/dashboard/FarmPlan";
import RotationSummary from "@/components/dashboard/RotationSummary";
import { recommendations } from "@/lib/advice";
import { useConversations, useFields, useIsDemo, useNasa, useProfile, useTasks, useWeather } from "@/hooks/useKisanData";
import { useT } from "@/i18n";

export default function Dashboard() {
  const { data: profile } = useProfile();
  const { data: weather } = useWeather();
  const { data: tasks } = useTasks();
  const { data: fields } = useFields();
  const { data: conversations } = useConversations();
  const { data: nasa } = useNasa();
  const demo = useIsDemo();
  const { t } = useT();

  const recs = recommendations({ weather, profile, fields });

  return (
    <div className="space-y-6">
      <DashboardHeader profile={profile} />
      {demo && (
        <p className="rounded-2xl border border-harvest/40 bg-harvest/10 px-4 py-3 text-sm" data-testid="demo-note">
          <span className="font-semibold text-harvest">{t("Demo farm.")}</span>{" "}
          {t("The fields, sowing dates and jobs below are sample data for demonstration. Weather, air quality, NASA climate and rotation scores are live for Faisalabad.")}
        </p>
      )}
      <RotationSummary />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <WeatherCard weather={weather} />
          <FieldsOverview fields={fields} demo={demo} />
        </div>
        <div className="space-y-5 lg:col-span-2">
          <RainOutlook weather={weather} />
          <TodayTasks tasks={tasks} demo={demo} />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <FarmPlan profile={profile} />
        <NasaData nasa={nasa} />
      </div>
      <Recommendations items={recs} />
      <RecentConversations conversations={conversations} />
    </div>
  );
}
