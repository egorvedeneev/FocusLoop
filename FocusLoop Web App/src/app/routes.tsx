import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Today } from "./components/screens/Today";
import { Inbox } from "./components/screens/Inbox";
import { Projects } from "./components/screens/Projects";
import { ProjectDetails } from "./components/screens/ProjectDetails";
import { FollowUps } from "./components/screens/FollowUps";
import { Reference } from "./components/screens/Reference";
import { WeeklyReview } from "./components/screens/WeeklyReview";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Today },
      { path: "inbox", Component: Inbox },
      { path: "projects", Component: Projects },
      { path: "projects/:id", Component: ProjectDetails },
      { path: "follow-ups", Component: FollowUps },
      { path: "reference", Component: Reference },
      { path: "review", Component: WeeklyReview },
    ],
  },
]);
