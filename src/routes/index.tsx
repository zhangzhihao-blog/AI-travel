import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Planner from "../pages/Planner";
import Itinerary from "../pages/Itinerary";
import MyItineraries from "../pages/MyItineraries";
import PrivateRoute from "../components/PrivateRoute";

const routes = [
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: (
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        ),
      },
      {
        path: "/planner",
        element: (
          <PrivateRoute>
            <Planner />
          </PrivateRoute>
        ),
      },
      {
        path: "/itinerary",
        element: (
          <PrivateRoute>
            <Itinerary />
          </PrivateRoute>
        ),
      },
      {
        path: "/my-itineraries",
        element: (
          <PrivateRoute>
            <MyItineraries />
          </PrivateRoute>
        ),
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },
];

export default routes;