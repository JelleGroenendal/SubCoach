import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { HomePage } from "@/features/team/components/HomePage";
import { TeamEditPage } from "@/features/team/components/TeamEditPage";
import { MatchSetupPage } from "@/features/match/components/MatchSetupPage";
import { MatchLivePage } from "@/features/match/components/MatchLivePage";
import { MatchSummaryPage } from "@/features/match/components/MatchSummaryPage";
import { HistoryListPage } from "@/features/history/components/HistoryListPage";
import { HistoryDetailPage } from "@/features/history/components/HistoryDetailPage";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "team/edit", element: <TeamEditPage /> },
        { path: "match/setup", element: <MatchSetupPage /> },
        { path: "match/live", element: <MatchLivePage /> },
        { path: "match/summary", element: <MatchSummaryPage /> },
        { path: "history", element: <HistoryListPage /> },
        { path: "history/:id", element: <HistoryDetailPage /> },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
